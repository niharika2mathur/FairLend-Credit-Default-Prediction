"""FairLend: Credit default prediction under fairness constraints (synthetic MFI data).
Runs end-to-end: data -> split -> baseline -> XGB/LGBM -> Optuna -> MLflow -> calibration -> fairness.
All numbers in the presentation come from this script's output (results/*.json, results/*.png)."""
import json, time, os, warnings
import numpy as np, pandas as pd
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
import optuna, mlflow
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.isotonic import IsotonicRegression
from sklearn.calibration import calibration_curve
from sklearn.metrics import (roc_auc_score, f1_score, precision_score, recall_score, accuracy_score,
                             confusion_matrix, brier_score_loss, roc_curve)
import xgboost as xgb, lightgbm as lgb
warnings.filterwarnings("ignore"); optuna.logging.set_verbosity(optuna.logging.WARNING)

OUT = "results"; os.makedirs(OUT, exist_ok=True)
SEED, N, N_TRIALS = 42, 50000, 40
rng = np.random.default_rng(SEED)
res = {}

# ---------- 1. Synthetic MFI dataset (same generative story as the FairLend web app, with built-in bias) ----------
f = (rng.random(N) < .45).astype(int)          # 1 = female
r = (rng.random(N) < .55).astype(int)          # 1 = rural
inc = np.exp(rng.normal(0, .4, N) + 2.6 - .25*r - .2*f)
rc = np.clip(.65 - .12*r - .05*f + .18*rng.normal(size=N), 0, 1)
mm = np.maximum(0, np.round(np.exp(rng.normal(0, .5, N) + 2.2 - .3*r - .15*f)))
ut = np.clip(.75 - .08*r + .15*rng.normal(size=N), 0, 1)
shg = np.clip(.7 + .1*f + .15*rng.normal(size=N), 0, 1)
prev = (rng.random(N) < .12 + .05*r).astype(int)
loan = np.clip(np.exp(rng.normal(0, .5, N) + 2.7), 3, 60)
inf = (rng.random(N) < .45 + .2*r + .15*f).astype(int)
dev = (rng.random(N) < .35 + .3*r + .1*f).astype(int)
z = -2.3 + 1.5*(-2.4*(rc-.6) - 2*(ut-.7) - 1.6*(shg-.7) + prev + .035*loan - .05*inc + .35*inf + .3*r + .2*f) + .3*rng.normal(size=N)
y = (rng.random(N) < 1/(1+np.exp(-z))).astype(int)
df = pd.DataFrame(dict(recharge_regularity=rc, mobile_money_txn_log=np.log1p(mm), utility_on_time=ut,
                       shg_repayment=shg, earlier_unpaid_loan=prev, loan_amount_k=loan, monthly_income_k=inc,
                       informal_income=inf, basic_phone=dev, default=y))
prot = pd.DataFrame(dict(female=f, rural=r))      # protected attributes: audit only, never model inputs
FEATS = [c for c in df.columns if c != "default"]
df.assign(**prot).to_csv(f"{OUT}/dataset.csv", index=False)
res["data"] = dict(n=N, n_features=len(FEATS), features=FEATS, default_rate=float(y.mean()),
                   default_rate_by=dict(male=float(y[f==0].mean()), female=float(y[f==1].mean()),
                                        urban=float(y[r==0].mean()), rural=float(y[r==1].mean())),
                   protected_share=dict(female=float(f.mean()), rural=float(r.mean())))

# ---------- 2. Split 60/20/20 stratified on target x group (test untouched until final) ----------
strat = df["default"]*4 + prot.female*2 + prot.rural
idx = np.arange(N)
i_tr, i_tmp = train_test_split(idx, test_size=.4, stratify=strat, random_state=SEED)
i_va, i_te = train_test_split(i_tmp, test_size=.5, stratify=strat.iloc[i_tmp], random_state=SEED)
X, Y = df[FEATS].values, df["default"].values
sc = StandardScaler().fit(X[i_tr])                 # scaler fitted on TRAIN only (no leakage)
Xs = sc.transform(X)
res["split"] = dict(train=len(i_tr), val=len(i_va), test=len(i_te),
                    default_rate=[float(Y[i].mean()) for i in (i_tr, i_va, i_te)])

# ---------- helpers ----------
def ks_stat(y_, p_):
    o = np.argsort(p_); yy = y_[o]; P, Nn = yy.sum(), len(yy)-yy.sum()
    return float(np.max(np.abs(np.cumsum(yy)/P - np.cumsum(1-yy)/Nn))*100)

def metrics(y_, p_, thr):
    pred = (p_ >= thr).astype(int); tn, fp, fn, tp = confusion_matrix(y_, pred).ravel()
    return dict(auc=float(roc_auc_score(y_, p_)), ks=ks_stat(y_, p_), accuracy=float(accuracy_score(y_, pred)),
                precision=float(precision_score(y_, pred)), recall=float(recall_score(y_, pred)),
                f1=float(f1_score(y_, pred)), brier=float(brier_score_loss(y_, p_)),
                tn=int(tn), fp=int(fp), fn=int(fn), tp=int(tp), thr=float(thr))

def best_f1_thr(y_, p_):
    ts = np.linspace(.05, .8, 76); return float(ts[np.argmax([f1_score(y_, p_ >= t) for t in ts])])

def reweigh(idx_):
    g = (prot.female.values*2 + prot.rural.values)[idx_]; yy = Y[idx_]; n = len(idx_)
    pg = np.bincount(g, minlength=4)/n; py = np.bincount(yy, minlength=2)/n
    pgy = np.zeros((4, 2))
    for a in range(4):
        for b in range(2): pgy[a, b] = ((g == a) & (yy == b)).sum()/n
    return np.array([pg[a]*py[b]/pgy[a, b] for a, b in zip(g, yy)])

def fairness(p_, idx_, thr_by_group=None, thr=None):
    """approve = p < threshold. DIR=min/max approval-rate ratio, DPD=max gap, EOD=max gap in approval of non-defaulters."""
    g = (prot.female.values*2 + prot.rural.values)[idx_]; yy = Y[idx_]
    t = np.array([thr_by_group[a] for a in g]) if thr_by_group is not None else np.full(len(idx_), thr)
    ap = p_ < t; out = dict(dir=1.0, dpd=0.0, eod=0.0)
    for name, grp in (("gender", prot.female.values[idx_]), ("region", prot.rural.values[idx_])):
        a, b = grp == 1, grp == 0; ra, rb = ap[a].mean(), ap[b].mean()
        out["dir"] = min(out["dir"], min(ra, rb)/max(ra, rb)); out["dpd"] = max(out["dpd"], abs(ra-rb))
        tpr = lambda m: ap[m & (yy == 0)].mean(); out["eod"] = max(out["eod"], abs(tpr(a)-tpr(b)))
        out[f"rate_{name}"] = dict(group1=float(ra), group0=float(rb))
    out["approval_overall"] = float(ap.mean())
    out["group_rates"] = [float(ap[g == k].mean()) for k in range(4)]
    return {k: (float(v) if not isinstance(v, (dict, list)) else v) for k, v in out.items()}

# ---------- 3. MLflow setup ----------
mlflow.set_tracking_uri(f"sqlite:///{os.path.abspath('mlflow.db')}")
mlflow.set_experiment("FairLend-credit-default")
def log_run(name, model_type, params, val_m, extra_tags=None, test_m=None, dur=None):
    with mlflow.start_run(run_name=name):
        mlflow.log_params({k: (round(v, 6) if isinstance(v, float) else v) for k, v in params.items()})
        mlflow.set_tags({"model": model_type, "dataset": "synthetic_mfi_v1_n50000", "split": "60/20/20", "seed": SEED, **(extra_tags or {})})
        for k in ("auc", "ks", "f1", "precision", "recall", "accuracy", "brier"): mlflow.log_metric(f"val_{k}", val_m[k])
        if test_m:
            for k in ("auc", "ks", "f1", "precision", "recall", "accuracy", "brier"): mlflow.log_metric(f"test_{k}", test_m[k])
        if dur is not None: mlflow.log_metric("train_seconds", dur)

# ---------- 4. Baseline + default models (validation only) ----------
t0 = time.time()
lr = LogisticRegression(max_iter=1000, C=1.0, random_state=SEED).fit(Xs[i_tr], Y[i_tr]); t_lr = time.time()-t0
p_lr_va = lr.predict_proba(Xs[i_va])[:, 1]; thr_lr = best_f1_thr(Y[i_va], p_lr_va)
m_lr_va = metrics(Y[i_va], p_lr_va, thr_lr)
log_run("baseline_logreg", "LogisticRegression", dict(C=1.0, max_iter=1000, features=len(FEATS)), m_lr_va, dur=t_lr)

t0 = time.time()
xg0 = xgb.XGBClassifier(n_estimators=300, max_depth=6, learning_rate=.1, random_state=SEED, n_jobs=4, verbosity=0).fit(X[i_tr], Y[i_tr]); t_x0 = time.time()-t0
p_x0_va = xg0.predict_proba(X[i_va])[:, 1]; m_x0_va = metrics(Y[i_va], p_x0_va, best_f1_thr(Y[i_va], p_x0_va))
log_run("xgb_default", "XGBoost", dict(n_estimators=300, max_depth=6, learning_rate=.1), m_x0_va, dur=t_x0)

t0 = time.time()
lg0 = lgb.LGBMClassifier(n_estimators=300, num_leaves=31, learning_rate=.1, random_state=SEED, n_jobs=4, verbose=-1).fit(X[i_tr], Y[i_tr]); t_l0 = time.time()-t0
p_l0_va = lg0.predict_proba(X[i_va])[:, 1]; m_l0_va = metrics(Y[i_va], p_l0_va, best_f1_thr(Y[i_va], p_l0_va))
log_run("lgbm_default", "LightGBM", dict(n_estimators=300, num_leaves=31, learning_rate=.1), m_l0_va, dur=t_l0)
res["val_defaults"] = dict(logreg=m_lr_va, xgb=m_x0_va, lgbm=m_l0_va, train_seconds=dict(logreg=t_lr, xgb=t_x0, lgbm=t_l0))

# ---------- 5. Optuna (objective = validation AUC; test set never touched) ----------
SPACE = dict(n_estimators=(100, 600), max_depth=(2, 8), learning_rate=(.01, .3), subsample=(.5, 1.0),
             colsample_bytree=(.5, 1.0), reg_lambda=(1e-3, 10.0), min_child_weight=(1, 20))
def objective(trial):
    p = dict(n_estimators=trial.suggest_int("n_estimators", *SPACE["n_estimators"]),
             max_depth=trial.suggest_int("max_depth", *SPACE["max_depth"]),
             learning_rate=trial.suggest_float("learning_rate", *SPACE["learning_rate"], log=True),
             subsample=trial.suggest_float("subsample", *SPACE["subsample"]),
             colsample_bytree=trial.suggest_float("colsample_bytree", *SPACE["colsample_bytree"]),
             reg_lambda=trial.suggest_float("reg_lambda", *SPACE["reg_lambda"], log=True),
             min_child_weight=trial.suggest_int("min_child_weight", *SPACE["min_child_weight"]))
    t0 = time.time(); m = xgb.XGBClassifier(**p, random_state=SEED, n_jobs=4, verbosity=0).fit(X[i_tr], Y[i_tr]); d = time.time()-t0
    pv = m.predict_proba(X[i_va])[:, 1]; vm = metrics(Y[i_va], pv, best_f1_thr(Y[i_va], pv))
    log_run(f"optuna_trial_{trial.number:02d}", "XGBoost", p, vm, {"stage": "optuna"}, dur=d)
    return vm["auc"]
t0 = time.time()
study = optuna.create_study(direction="maximize", sampler=optuna.samplers.TPESampler(seed=SEED))
study.optimize(objective, n_trials=N_TRIALS); t_opt = time.time()-t0
bp = study.best_params
res["optuna"] = dict(n_trials=N_TRIALS, best_value=study.best_value, best_trial=study.best_trial.number, best_params=bp,
                     total_seconds=t_opt, space={k: list(v) for k, v in SPACE.items()},
                     values=[t.value for t in study.trials])
trials_df = study.trials_dataframe(); trials_df.to_csv(f"{OUT}/optuna_trials.csv", index=False)
imp = optuna.importance.get_param_importances(study); res["optuna"]["importance"] = imp

t0 = time.time()
xgb_best = xgb.XGBClassifier(**bp, random_state=SEED, n_jobs=4, verbosity=0).fit(X[i_tr], Y[i_tr]); t_xb = time.time()-t0
p_xb_va = xgb_best.predict_proba(X[i_va])[:, 1]; thr_xb = best_f1_thr(Y[i_va], p_xb_va)
m_xb_va = metrics(Y[i_va], p_xb_va, thr_xb)

# ---------- 6. Calibration (isotonic fitted on VALIDATION) ----------
iso = IsotonicRegression(out_of_bounds="clip").fit(p_xb_va, Y[i_va])
# ---------- 7. FINAL TEST evaluation (single pass) ----------
P = {}
P["logreg"] = lr.predict_proba(Xs[i_te])[:, 1]
P["xgb_default"] = xg0.predict_proba(X[i_te])[:, 1]
P["lgbm_default"] = lg0.predict_proba(X[i_te])[:, 1]
P["xgb_tuned"] = xgb_best.predict_proba(X[i_te])[:, 1]
P["xgb_tuned_cal"] = iso.predict(P["xgb_tuned"])
thr_val = dict(logreg=thr_lr, xgb_default=best_f1_thr(Y[i_va], p_x0_va), lgbm_default=best_f1_thr(Y[i_va], p_l0_va),
               xgb_tuned=thr_xb, xgb_tuned_cal=best_f1_thr(Y[i_va], iso.predict(p_xb_va)))
res["test"] = {k: metrics(Y[i_te], P[k], thr_val[k]) for k in P}
res["test_train_seconds"] = dict(logreg=t_lr, xgb_default=t_x0, lgbm_default=t_l0, xgb_tuned=t_xb, optuna_total=t_opt)
res["val_tuned"] = m_xb_va
# train-vs-val AUC gap (overfitting check)
res["overfit"] = dict(logreg=[float(roc_auc_score(Y[i_tr], lr.predict_proba(Xs[i_tr])[:, 1])), m_lr_va["auc"]],
                      xgb_default=[float(roc_auc_score(Y[i_tr], xg0.predict_proba(X[i_tr])[:, 1])), m_x0_va["auc"]],
                      xgb_tuned=[float(roc_auc_score(Y[i_tr], xgb_best.predict_proba(X[i_tr])[:, 1])), m_xb_va["auc"]])
log_run("final_logreg_TEST", "LogisticRegression", dict(C=1.0), m_lr_va, {"stage": "final"}, test_m=res["test"]["logreg"], dur=t_lr)
log_run("final_xgb_tuned_TEST", "XGBoost", bp, m_xb_va, {"stage": "final"}, test_m=res["test"]["xgb_tuned"], dur=t_xb)
log_run("final_xgb_tuned_isotonic_TEST", "XGBoost+Isotonic", bp, m_xb_va, {"stage": "final"}, test_m=res["test"]["xgb_tuned_cal"], dur=t_xb)

# ---------- 8. Fairness: reweighing + group-specific thresholds ----------
# Model chosen on VALIDATION AUC (not test). Fairness is applied to that model; tuned XGB shown as secondary.
t0 = time.time()
SEL = "logreg" if m_lr_va["auc"] >= m_xb_va["auc"] else "xgb_tuned"
res["selected_model"] = SEL
w_tr = reweigh(i_tr)
lr_rw = LogisticRegression(max_iter=1000, C=1.0, random_state=SEED).fit(Xs[i_tr], Y[i_tr], sample_weight=w_tr)
xgb_rw = xgb.XGBClassifier(**bp, random_state=SEED, n_jobs=4, verbosity=0).fit(X[i_tr], Y[i_tr], sample_weight=w_tr)
P["logreg_rw"] = lr_rw.predict_proba(Xs[i_te])[:, 1]; pv_lr_rw = lr_rw.predict_proba(Xs[i_va])[:, 1]
P["xgb_tuned_rw"] = xgb_rw.predict_proba(X[i_te])[:, 1]; pv_rw = xgb_rw.predict_proba(X[i_va])[:, 1]
APPROVE = .70
G_te = (prot.female.values*2 + prot.rural.values)[i_te]; G_va = (prot.female.values*2 + prot.rural.values)[i_va]
def group_thr(p_va, lam):
    t0_ = np.quantile(p_va, APPROVE); out = []
    for g in range(4):
        pg = p_va[G_va == g]; nat = (pg < t0_).mean()
        out.append(np.quantile(pg, min(.999, (1-lam)*nat + lam*APPROVE)))
    return out
def run_grid(pv_no, pt_no, pv_rw_, pt_rw_):
    grid = []
    for rw, (pv_, pt_) in enumerate([(pv_no, pt_no), (pv_rw_, pt_rw_)]):
        for lam in np.linspace(0, 1, 11):
            th = group_thr(pv_, lam); fr = fairness(pt_, i_te, thr_by_group=th)
            yp = Y[i_te]; ap = pt_ < np.array([th[g] for g in G_te]); pred = (~ap).astype(int)
            tn, fp, fn, tp = confusion_matrix(yp, pred).ravel(); ba = (tn/(tn+fp) + tp/(tp+fn))/2
            prec = tp/(tp+fp); rec = tp/(tp+fn)
            grid.append(dict(reweigh=rw, lam=float(lam), ba=float(ba), f1=float(2*prec*rec/(prec+rec)), auc=float(roc_auc_score(yp, pt_)), ks=ks_stat(yp, pt_),
                             **{k: v for k, v in fr.items() if not isinstance(v, (dict, list))}, group_rates=fr["group_rates"]))
    return grid
def pick(grid, rw, lam): return next(g for g in grid if g["reweigh"] == rw and abs(g["lam"]-lam) < 1e-9)
grid = run_grid(p_lr_va, P["logreg"], pv_lr_rw, P["logreg_rw"]); grid_x = run_grid(p_xb_va, P["xgb_tuned"], pv_rw, P["xgb_tuned_rw"])
res["fairness_grid"] = grid
res["fairness_summary"] = {k: pick(grid, rw, lam) for k, (rw, lam) in dict(none=(0, 0.0), half=(0, .5), calibrated=(0, 1.0), reweighed=(1, 0.0), both=(1, 1.0)).items()}
res["fairness_summary_xgb"] = {k: pick(grid_x, rw, lam) for k, (rw, lam) in dict(none=(0, 0.0), calibrated=(0, 1.0), reweighed=(1, 0.0), both=(1, 1.0)).items()}
res["fairness_seconds"] = time.time()-t0
log_run("fairness_logreg_reweigh_plus_threshold", "LogReg+Reweigh+GroupThr", dict(C=1.0, reweigh=True, calibration=1.0), m_lr_va, {"stage": "fairness"},
        test_m=metrics(Y[i_te], P["logreg_rw"], .3), dur=res["fairness_seconds"])

# ---------- 9. SHAP-style importance (XGB gain) ----------
res["importance"] = dict(zip(FEATS, map(float, xgb_best.feature_importances_)))

# ---------- 10. Plots ----------
NAVY, TEAL, ORANGE, GREY = "#12355B", "#0F8B8D", "#E07A1F", "#8A97A6"
plt.rcParams.update({"font.size": 11, "axes.spines.top": False, "axes.spines.right": False, "font.family": "DejaVu Sans"})
# (a) Optuna history
vals = np.array([t.value for t in study.trials]); best = np.maximum.accumulate(vals)
fig, ax = plt.subplots(figsize=(7, 3.8)); ax.scatter(range(len(vals)), vals, c=GREY, s=28, label="Trial AUC")
ax.plot(best, c=TEAL, lw=2.5, label="Best so far"); ax.set_xlabel("Trial"); ax.set_ylabel("Validation AUC"); ax.legend(frameon=False)
ax.set_ylim(min(vals)-.002, max(vals)+.002); ax.set_title("Optuna optimisation history (40 trials)", loc="left", color=NAVY, weight="bold")
fig.tight_layout(); fig.savefig(f"{OUT}/optuna_history.png", dpi=200); plt.close()
# (b) Optuna param importance
fig, ax = plt.subplots(figsize=(6, 3.8)); ks_ = list(imp)[::-1]; ax.barh(ks_, [imp[k] for k in ks_], color=TEAL)
ax.set_xlabel("Importance"); ax.set_title("Hyperparameter importance", loc="left", color=NAVY, weight="bold"); fig.tight_layout(); fig.savefig(f"{OUT}/optuna_importance.png", dpi=200); plt.close()
# (c) Reliability diagram
fig, axs = plt.subplots(1, 2, figsize=(9, 4), sharey=True)
for ax, k, ttl in zip(axs, ["xgb_tuned", "xgb_tuned_cal"], ["Tuned XGBoost (raw)", "After isotonic calibration"]):
    fr_, mp_ = calibration_curve(Y[i_te], P[k], n_bins=10, strategy="quantile")
    ax.plot([0, 1], [0, 1], "--", c=GREY, label="Perfect"); ax.plot(mp_, fr_, "o-", c=TEAL if "cal" in k else ORANGE, lw=2.2, label="Model")
    ax.set_title(f"{ttl}\nBrier = {res['test'][k]['brier']:.4f}", color=NAVY, weight="bold", fontsize=11, loc="left"); ax.set_xlabel("Mean predicted default probability"); ax.legend(frameon=False)
axs[0].set_ylabel("Observed default rate"); fig.tight_layout(); fig.savefig(f"{OUT}/reliability.png", dpi=200); plt.close()
res["calibration_curve"] = {k: [list(map(float, a)) for a in calibration_curve(Y[i_te], P[k], n_bins=10, strategy="quantile")] for k in ["xgb_tuned", "xgb_tuned_cal"]}
# (d) ROC comparison
fig, ax = plt.subplots(figsize=(5.4, 4.4))
for k, c, lb in [("logreg", GREY, "Logistic regression (baseline)"), ("xgb_tuned", TEAL, "Tuned XGBoost")]:
    fpr, tpr, _ = roc_curve(Y[i_te], P[k]); ax.plot(fpr, tpr, c=c, lw=2.3, label=f"{lb}  AUC {res['test'][k]['auc']:.3f}")
ax.plot([0, 1], [0, 1], "--", c="#c4ccd6"); ax.set_xlabel("False positive rate"); ax.set_ylabel("True positive rate"); ax.legend(frameon=False, loc="lower right", fontsize=9)
ax.set_title("ROC on held-out test set", loc="left", color=NAVY, weight="bold"); fig.tight_layout(); fig.savefig(f"{OUT}/roc.png", dpi=200); plt.close()
# (e) Pareto frontier
fig, ax = plt.subplots(figsize=(6.4, 4))
for rw, c, lb in [(0, GREY, "No reweighing"), (1, TEAL, "Reweighed")]:
    gg = [g for g in grid if g["reweigh"] == rw]; ax.plot([g["dir"] for g in gg], [g["ba"] for g in gg], "o-", c=c, label=lb, lw=2)
ax.axvline(.8, ls="--", c=NAVY); ax.text(.805, ax.get_ylim()[0]+.002, "DIR = 0.80", color=NAVY, fontsize=9)
ax.set_xlabel("Disparate impact ratio (fairer →)"); ax.set_ylabel("Balanced accuracy"); ax.legend(frameon=False)
ax.set_title("Accuracy-fairness Pareto frontier (test)", loc="left", color=NAVY, weight="bold"); fig.tight_layout(); fig.savefig(f"{OUT}/pareto.png", dpi=200); plt.close()
# (f) Confusion matrix (tuned XGB)
m = res["test"]["xgb_tuned"]; cm = np.array([[m["tn"], m["fp"]], [m["fn"], m["tp"]]])
fig, ax = plt.subplots(figsize=(4.2, 3.8)); ax.imshow(cm, cmap="Blues")
for i in range(2):
    for j in range(2): ax.text(j, i, f"{cm[i,j]:,}", ha="center", va="center", fontsize=16, color="white" if cm[i, j] > cm.max()/2 else NAVY, weight="bold")
ax.set_xticks([0, 1], ["Pred: repay", "Pred: default"]); ax.set_yticks([0, 1], ["Actual: repay", "Actual: default"]); ax.spines[:].set_visible(False)
ax.set_title("Confusion matrix – tuned XGBoost (test)", color=NAVY, weight="bold", fontsize=10); fig.tight_layout(); fig.savefig(f"{OUT}/confusion.png", dpi=200); plt.close()
# (g) MLflow-style dashboard (runs table + metric comparison) rendered from the real MLflow store
runs = mlflow.search_runs(order_by=["metrics.val_auc DESC"]); runs.to_csv(f"{OUT}/mlflow_runs.csv", index=False)
res["mlflow"] = dict(n_runs=int(len(runs)), best_run=str(runs.iloc[0]["tags.mlflow.runName"]), best_val_auc=float(runs.iloc[0]["metrics.val_auc"]))

json.dump(res, open(f"{OUT}/results.json", "w"), indent=1, default=float)
print(json.dumps({k: res[k] for k in ("data", "split", "optuna", "test", "fairness_summary", "overfit", "mlflow", "test_train_seconds")}, indent=1, default=float)[:9000])
