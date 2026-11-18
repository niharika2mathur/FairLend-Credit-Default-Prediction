"""Extra evidence figures rendered from the real results (MLflow store export + results.json)."""
import json, numpy as np, pandas as pd
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
r = json.load(open("results/results.json")); runs = pd.read_csv("results/mlflow_runs.csv")
NAVY, TEAL, ORANGE, GREY = "#12355B", "#0F8B8D", "#E07A1F", "#8A97A6"
plt.rcParams.update({"font.family": "DejaVu Sans"})
# confusion matrix for the selected model (logistic regression)
m = r["test"]["logreg"]; cm = np.array([[m["tn"], m["fp"]], [m["fn"], m["tp"]]])
fig, ax = plt.subplots(figsize=(4.2, 3.7)); ax.imshow(cm, cmap="Blues")
for i in range(2):
    for j in range(2): ax.text(j, i, f"{cm[i,j]:,}", ha="center", va="center", fontsize=17, color="white" if cm[i,j] > cm.max()/2 else NAVY, weight="bold")
ax.set_xticks([0, 1], ["Pred: repay", "Pred: default"]); ax.set_yticks([0, 1], ["Actual: repay", "Actual: default"]); ax.spines[:].set_visible(False)
fig.savefig("results/confusion_lr.png", dpi=200, bbox_inches="tight"); plt.close()
# MLflow-style experiment dashboard (from mlflow.db export)
d = runs.copy(); d["run"] = d["tags.mlflow.runName"]; d = d.sort_values("start_time")
fig = plt.figure(figsize=(11, 4.6)); gs = fig.add_gridspec(1, 2, width_ratios=[1.3, 1], wspace=.22)
ax = fig.add_subplot(gs[0]); ax.axis("off")
show = d[~d.run.str.startswith("optuna_trial_") | d.run.isin(["optuna_trial_04", "optuna_trial_00", "optuna_trial_07"])]
show = show[~show.run.str.startswith("final_")].sort_values("metrics.val_auc", ascending=False)
rows = [[x.run.replace("fairness_logreg_reweigh_plus_threshold","fairness_logreg_rw_thr"), x["tags.model"].replace("LogisticRegression","LogReg").replace("LogReg+Reweigh+GroupThr","LogReg+Fair"), f"{x['metrics.val_auc']:.4f}", f"{x['metrics.val_f1']:.3f}", f"{x['metrics.train_seconds']:.2f}"] for _, x in show.iterrows()]
tb = ax.table(cellText=rows, colLabels=["Run name", "Model", "val AUC", "val F1", "Train s"], loc="upper left", cellLoc="left", bbox=[0,.45,1,.5], colWidths=[.40, .19, .14, .13, .14])
tb.auto_set_font_size(False); tb.set_fontsize(8.5); 
for (i, j), c in tb.get_celld().items():
    c.set_edgecolor("#DDE3EA")
    if i == 0: c.set_facecolor(NAVY); c.get_text().set_color("white"); c.get_text().set_weight("bold")
    elif i == 1: c.set_facecolor("#E3F3F3")
ax.set_title("Runs (sorted by validation AUC)", loc="left", color=NAVY, weight="bold", fontsize=11)
ax2 = fig.add_subplot(gs[1]); v = d["metrics.val_auc"].values; names = d.run.values
col = [ORANGE if n == "baseline_logreg" else (TEAL if n.startswith("optuna") else GREY) for n in names]
ax2.bar(range(len(v)), v, color=col, width=.8); ax2.set_ylim(.74, .80); ax2.set_xlabel("Run order (47 runs)"); ax2.set_ylabel("Validation AUC")
ax2.spines[["top", "right"]].set_visible(False); ax2.set_title("Validation AUC across runs", loc="left", color=NAVY, weight="bold", fontsize=11)
fig.text(.01, .01, "Rendered from the local MLflow tracking store (mlflow.db). Orange = baseline, teal = Optuna trials, grey = other.", fontsize=8, color=GREY)
fig.savefig("results/mlflow_dashboard.png", dpi=200, bbox_inches="tight"); plt.close()
print(len(show), "rows shown")
