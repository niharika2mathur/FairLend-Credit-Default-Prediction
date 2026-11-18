const pptxgen = require("pptxgenjs");
const fs = require("fs");
const R = JSON.parse(fs.readFileSync("results/results.json"));
const T = R.test, FS = R.fairness_summary, BP = R.optuna.best_params;
const NAVY="12355B", TEAL="0F8B8D", ORANGE="E07A1F", BG="F4F7FA", INK="1D2B3A", MUTE="5B6B7C", WHITE="FFFFFF", LINE="D5DEE8", GREEN="2E8B57", RED="C0392B";
const pres = new pptxgen(); pres.layout = "LAYOUT_16x9"; pres.title = "FairLend: Credit Default Prediction under Fairness Constraints";
pres.author = "Group: Niharika Mathur, Manyata Kothari, Aayushi Purhoit, Ruchita Wagh";
const F = "Calibri"; let n = 0;
const f3 = v => v.toFixed(3), f2 = v => v.toFixed(2), pc = v => (v*100).toFixed(1)+"%";

function base(title, tag, status){ // status: "COMPLETED" | "PROPOSED" | "COMPLETED + PROPOSED"
  const s = pres.addSlide(); n++; s.background = { color: BG };
  s.addShape(pres.ShapeType.rect, { x:0, y:0, w:10, h:0.82, fill:{ color: NAVY } });
  s.addText(title, { x:0.4, y:0.08, w:7.9, h:0.66, fontFace:F, fontSize:20, bold:true, color:WHITE, valign:"middle", margin:0, isTextBox:true });
  if (status) s.addText(status, { x:8.0, y:0.26, w:1.65, h:0.3, fontFace:F, fontSize:9, bold:true, align:"center", valign:"middle",
     color: WHITE, fill:{ color: status==="PROPOSED"?ORANGE:TEAL }, margin:0, isTextBox:true });
  s.addText(`FairLend  |  Slide ${n}`, { x:0.4, y:5.3, w:5, h:0.25, fontFace:F, fontSize:9, color:MUTE, margin:0, isTextBox:true });
  return s;
}
const card = (s,x,y,w,h,fill=WHITE) => s.addShape(pres.ShapeType.rect, { x,y,w,h, fill:{color:fill}, line:{color:LINE, width:0.75} });
const hdr = (txt,o={}) => ({ text:txt, options:{ bold:true, color:WHITE, fill:{color:NAVY}, fontFace:F, fontSize:o.fs||10, align:o.align||"left", valign:"middle" } });
const cell = (txt,o={}) => ({ text:String(txt), options:{ fontFace:F, fontSize:o.fs||10, color:o.color||INK, bold:!!o.bold, align:o.align||"left", valign:"middle", fill:{ color:o.fill||WHITE } } });
const bullets = (arr, fs=11) => arr.map((t,i)=>({ text:t, options:{ bullet:true, breakLine:i<arr.length-1, fontFace:F, fontSize:fs, color:INK, paraSpaceAfter:4 } }));
const tb = (s, rows, o) => s.addTable(rows, Object.assign({ border:{ type:"solid", color:LINE, pt:0.75 }, margin:[0.03,0.07,0.03,0.07] }, o));
const img = (s, p, x, y, w, h) => s.addImage({ path:p, x, y, w, h });

// 1 ---------------------------------------------------------------- Title
{ const s = pres.addSlide(); n++; s.background = { color: NAVY };
  s.addShape(pres.ShapeType.ellipse, { x:7.4, y:-0.9, w:4.2, h:4.2, fill:{ color:TEAL, transparency:70 }, line:{ color:TEAL, transparency:100 } });
  s.addText("PROJECT LIFE CYCLE MANAGEMENT  |  BTECH CAP 501", { x:0.6, y:0.5, w:8, h:0.3, fontFace:F, fontSize:11, color:"9FC6E8", bold:true, margin:0, isTextBox:true });
  s.addText("Credit Default Prediction under Fairness Constraints for Micro-finance Lending", { x:0.6, y:1.0, w:7.6, h:1.6, fontFace:F, fontSize:32, bold:true, color:WHITE, margin:0, isTextBox:true, valign:"top" });
  s.addText("FairLend: responsible AI for financial inclusion", { x:0.6, y:2.7, w:8, h:0.4, fontFace:F, fontSize:16, color:"9FC6E8", margin:0, isTextBox:true });
  s.addText([
    { text:"Group members: ", options:{ bold:true } }, { text:"Niharika Mathur (2405503), Manyata Kothari (2408495), Aayushi Purhoit (2409900), Ruchita Wagh (2410891)", options:{ breakLine:true } },
    { text:"Faculty mentor: ", options:{ bold:true } }, { text:"Prof. Amrita Banerjee", options:{ breakLine:true } },
    { text:"Course: ", options:{ bold:true } }, { text:"BTECH CAP 501 Project Life Cycle Management  |  B.Tech CS AI & ML, Section Hadoop", options:{ breakLine:true } },
    { text:"Academic year: ", options:{ bold:true } }, { text:"2026-27  |  uGDX School of Technology, ATLAS SkillTech University" } ],
    { x:0.6, y:3.45, w:8.8, h:1.5, fontFace:F, fontSize:12, color:WHITE, margin:0, isTextBox:true, valign:"top", paraSpaceAfter:5 });
  s.addNotes("Introduce the team and the project. Last time we presented the design and life cycle; today we show the implementation and its evidence."); }

// 2 ---------------------------------------------------------------- Overview
{ const s = base("Project overview: accurate AND fair default prediction", "", "COMPLETED");
  card(s,0.4,1.0,4.5,2.1); s.addText("Problem statement", { x:0.55,y:1.05,w:4.2,h:0.3,fontFace:F,fontSize:13,bold:true,color:TEAL,margin:0,isTextBox:true });
  s.addText("Thin-file borrowers have no bureau history, so MFIs use alternative data (recharges, mobile money, utility bills). That data carries historical bias against women and rural regions, and proxies such as device type and informal income let a model rediscover gender or region even when they are removed.", { x:0.55,y:1.38,w:4.2,h:1.65,fontFace:F,fontSize:11,color:INK,margin:0,isTextBox:true,valign:"top" });
  card(s,5.1,1.0,4.5,2.1); s.addText("Objectives", { x:5.25,y:1.05,w:4.2,h:0.3,fontFace:F,fontSize:13,bold:true,color:TEAL,margin:0,isTextBox:true });
  s.addText(bullets(["Predict 90+ days-past-due default: AUC >= 0.78, KS >= 40","Meet fairness gates: DIR >= 0.80, parity and equalised-odds gaps <= 0.10","Quantify the accuracy cost of fairness (Pareto view)","Keep every decision explainable and human-reviewable"],10.5), { x:5.25,y:1.38,w:4.2,h:1.65,margin:0,isTextBox:true,valign:"top" });
  const kp = [["Type of ML problem","Supervised binary classification (default = 1)"],["Proposed solution","Logistic regression baseline vs XGBoost / LightGBM, then reweighing + group-specific threshold calibration"],["Expected outcome","A model that clears the performance gates and the 0.80 fairness rule, with a documented trade-off"]];
  kp.forEach((k,i)=>{ const x=0.4+i*3.1; card(s,x,3.3,2.95,1.8,WHITE); s.addShape(pres.ShapeType.rect,{x,y:3.3,w:0.07,h:1.8,fill:{color:ORANGE},line:{color:ORANGE}});
    s.addText(k[0],{x:x+0.2,y:3.36,w:2.65,h:0.3,fontFace:F,fontSize:11.5,bold:true,color:NAVY,margin:0,isTextBox:true});
    s.addText(k[1],{x:x+0.2,y:3.7,w:2.65,h:1.3,fontFace:F,fontSize:10.5,color:INK,margin:0,isTextBox:true,valign:"top"}); });
  s.addNotes("Frame the tension between predictive power and fairness. ML problem type: binary classification. Success criteria were defined in Chapter I of the report."); }

// 3 ---------------------------------------------------------------- Dataset
{ const s = base("Dataset and feature summary", "", "COMPLETED");
  const d = R.data;
  tb(s, [[hdr("Item"),hdr("Summary")],
    [cell("Source",{bold:true}),cell("Synthetic MFI dataset generated by pipeline.py (seed 42) with deliberately built-in gender and region bias; real partner data is not yet available")],
    [cell("Size",{bold:true}),cell(`${d.n.toLocaleString()} borrowers, ${d.n_features} model features + 2 protected attributes (audit only)`)],
    [cell("Target",{bold:true}),cell(`default (1 = 90+ days past due). Default rate ${pc(d.default_rate)}`)],
    [cell("Default rate by group",{bold:true}),cell(`Male ${pc(d.default_rate_by.male)}  |  Female ${pc(d.default_rate_by.female)}  |  Urban ${pc(d.default_rate_by.urban)}  |  Rural ${pc(d.default_rate_by.rural)}`)],
    [cell("Key features",{bold:true}),cell("recharge regularity, mobile-money transactions (log), utility bills on time, SHG repayment, earlier unpaid loan, loan amount, monthly income, informal income, basic phone")],
    [cell("Proxy-risk features",{bold:true}),cell("informal income, basic phone, income (flagged in the proxy audit)")],
  ], { x:0.4, y:1.0, w:5.9, colW:[1.35,4.55], fontSize:10 });
  card(s,6.5,1.0,3.1,4.1); s.addText("Preprocessing workflow",{x:6.62,y:1.05,w:2.9,h:0.3,fontFace:F,fontSize:12.5,bold:true,color:TEAL,margin:0,isTextBox:true});
  const steps=["Generate data (50,000 rows)","Log-transform mobile-money counts","Stratified 60/20/20 split on target x group","StandardScaler fitted on TRAIN only (used by LR)","Protected attributes held out of the feature set","Reweighing weights computed on train only"];
  steps.forEach((t,i)=>{ const y=1.45+i*0.6; s.addShape(pres.ShapeType.ellipse,{x:6.65,y:y+0.03,w:0.34,h:0.34,fill:{color:NAVY},line:{color:NAVY}});
    s.addText(String(i+1),{x:6.65,y:y+0.03,w:0.34,h:0.34,fontFace:F,fontSize:10,bold:true,color:WHITE,align:"center",valign:"middle",margin:0,isTextBox:true});
    s.addText(t,{x:7.1,y:y-0.02,w:2.42,h:0.5,fontFace:F,fontSize:10,color:INK,margin:0,isTextBox:true,valign:"middle"}); });
  s.addText(`Split: train ${R.split.train.toLocaleString()} | validation ${R.split.val.toLocaleString()} | test ${R.split.test.toLocaleString()}. Default rate is ${pc(R.split.default_rate[0])} in all three.`,{x:0.4,y:4.55,w:5.9,h:0.5,fontFace:F,fontSize:10.5,italic:true,color:MUTE,margin:0,isTextBox:true,valign:"top"});
  s.addNotes("Be upfront that the data is synthetic. The generator mirrors the live FairLend web demo and bakes in bias so that fairness methods have something real to correct. Real data from telecom/utility partners remains a pending activity."); }

// 4 ---------------------------------------------------------------- Model selection
{ const s = base("Model selection and justification", "", "COMPLETED");
  const g=(t,c)=>cell(t,{fill:c,align:"center"});
  tb(s, [[hdr("Criterion"),hdr("Logistic regression (BASELINE)",{align:"center"}),hdr("XGBoost",{align:"center"}),hdr("LightGBM",{align:"center"})],
    [cell("Interpretability",{bold:true}),g("High: coefficients, exact Shapley values","E4F4EA"),g("Medium: needs SHAP","FFF3DC"),g("Medium: needs SHAP","FFF3DC")],
    [cell("Predictive power (non-linear data)",{bold:true}),g("Moderate","FFF3DC"),g("High","E4F4EA"),g("High","E4F4EA")],
    [cell("Computational cost",{bold:true}),g(`Lowest: ${R.test_train_seconds.logreg.toFixed(2)} s`,"E4F4EA"),g(`Low: ${R.test_train_seconds.xgb_default.toFixed(2)} s`,"E4F4EA"),g(`Low: ${R.test_train_seconds.lgbm_default.toFixed(2)} s`,"E4F4EA")],
    [cell("Stakeholder / regulator fit",{bold:true}),g("Best: auditable reason codes","E4F4EA"),g("Good with SHAP","FFF3DC"),g("Good with SHAP","FFF3DC")],
    [cell("Handles weights (reweighing)",{bold:true}),g("Yes","E4F4EA"),g("Yes","E4F4EA"),g("Yes","E4F4EA")],
    [cell("Overfit risk (observed, train vs val AUC)",{bold:true}),g(`${f3(R.overfit.logreg[0])} vs ${f3(R.overfit.logreg[1])}`,"E4F4EA"),g(`${f3(R.overfit.xgb_default[0])} vs ${f3(R.overfit.xgb_default[1])} (default)`,"FADBD8"),g("Not measured","FFFFFF")],
  ], { x:0.4, y:1.0, w:9.2, colW:[2.5,2.5,2.2,2.0], fontSize:10 });
  card(s,0.4,3.55,9.2,1.15); s.addText([{text:"Decision. ",options:{bold:true,color:TEAL}},{text:"Baseline = logistic regression: it is the interpretable benchmark regulators expect. XGBoost and LightGBM are the challengers because alternative behavioural data is non-linear and tabular. XGBoost was carried into hyperparameter tuning; LightGBM was evaluated at default settings and trailed XGBoost on validation AUC."}],{x:0.55,y:3.6,w:8.9,h:1.05,fontFace:F,fontSize:11,color:INK,margin:0,isTextBox:true,valign:"middle"});
  s.addNotes("Model comparison matrix required by the format. Qualitative cells come from the project requirements (Chapter V); numeric cells come from our runs."); }

// 5 ---------------------------------------------------------------- Baseline
{ const s = base("Baseline model implementation: logistic regression", "", "COMPLETED");
  const b=T.logreg, v=R.val_defaults.logreg;
  card(s,0.4,1.0,4.4,2.05); s.addText("Training procedure",{x:0.55,y:1.05,w:4.1,h:0.3,fontFace:F,fontSize:12.5,bold:true,color:TEAL,margin:0,isTextBox:true});
  s.addText(bullets(["scikit-learn LogisticRegression, C = 1.0, L2 penalty, max_iter = 1000","Standardised 9 features (scaler fitted on train)","Fitted on 30,000 training rows in "+R.test_train_seconds.logreg.toFixed(2)+" s","Decision threshold 0.26 chosen on VALIDATION to maximise F1 (27% defaults, so 0.5 is a poor cut-off)"],10),{x:0.55,y:1.38,w:4.15,h:1.65,margin:0,isTextBox:true,valign:"top"});
  tb(s,[[hdr("Metric"),hdr("Validation",{align:"center"}),hdr("Test",{align:"center"})],
   [cell("AUC-ROC"),cell(f3(v.auc),{align:"center"}),cell(f3(b.auc),{align:"center",bold:true})],
   [cell("KS statistic"),cell(v.ks.toFixed(1),{align:"center"}),cell(b.ks.toFixed(1),{align:"center",bold:true})],
   [cell("Accuracy"),cell(f3(v.accuracy),{align:"center"}),cell(f3(b.accuracy),{align:"center",bold:true})],
   [cell("Precision"),cell(f3(v.precision),{align:"center"}),cell(f3(b.precision),{align:"center",bold:true})],
   [cell("Recall"),cell(f3(v.recall),{align:"center"}),cell(f3(b.recall),{align:"center",bold:true})],
   [cell("F1-score"),cell(f3(v.f1),{align:"center"}),cell(f3(b.f1),{align:"center",bold:true})],
   [cell("Brier score"),cell(f3(v.brier),{align:"center"}),cell(f3(b.brier),{align:"center",bold:true})]],
   { x:0.4, y:3.2, w:4.4, colW:[1.6,1.4,1.4], fontSize:9.5, rowH:0.235 });
  card(s,5.0,1.0,4.6,2.05,"0E1E33"); 
  s.addText("Code execution output (pipeline.py)",{x:5.12,y:1.04,w:4.4,h:0.26,fontFace:F,fontSize:10,bold:true,color:"9FC6E8",margin:0,isTextBox:true});
  s.addText(`lr = LogisticRegression(C=1.0).fit(Xs[train], y[train])\n> train AUC     = ${f3(R.overfit.logreg[0])}\n> val   AUC     = ${f3(R.overfit.logreg[1])}\n> val   thr(F1)  = 0.26\n> TEST  AUC      = ${f3(b.auc)}   KS = ${b.ks.toFixed(1)}\n> TEST  F1       = ${f3(b.f1)}   Brier = ${f3(b.brier)}`,{x:5.12,y:1.32,w:4.4,h:1.65,fontFace:"Consolas",fontSize:9.5,color:"CFE8CF",margin:0,isTextBox:true,valign:"top"});
  card(s,5.0,3.2,4.6,1.9); s.addText([{text:"Reading the result. ",options:{bold:true,color:TEAL}},{text:`The baseline already clears the AUC >= 0.78 and KS >= 40 gates. Train and validation AUC are close (${f3(R.overfit.logreg[0])} vs ${f3(R.overfit.logreg[1])}), so it is not overfitting. It catches ${pc(b.recall)} of true defaulters at ${pc(b.precision)} precision, which is the cost of a low threshold on an imbalanced target.`}],{x:5.12,y:3.25,w:4.35,h:1.8,fontFace:F,fontSize:10.5,color:INK,margin:0,isTextBox:true,valign:"top"});
  s.addNotes("Test numbers are reported here for completeness but the test set was only scored once, after all choices were frozen (see slide 9)."); }

// 6 ---------------------------------------------------------------- Hyperparameters
{ const s = base("Model parameters and hyperparameters", "", "COMPLETED");
  card(s,0.4,1.0,3.0,4.15); s.addText("Learned during training",{x:0.52,y:1.05,w:2.8,h:0.3,fontFace:F,fontSize:12.5,bold:true,color:TEAL,margin:0,isTextBox:true});
  s.addText([{text:"Logistic regression",options:{bold:true,breakLine:true}},{text:"9 coefficients + 1 intercept, found by minimising regularised log-loss",options:{breakLine:true}},{text:" ",options:{breakLine:true}},{text:"XGBoost",options:{bold:true,breakLine:true}},{text:"Tree split features and thresholds, plus leaf weights of the boosted trees (up to 600 trees x 2-8 levels)",options:{breakLine:true}},{text:" ",options:{breakLine:true}},{text:"Fixed before training (hyperparameters): everything in the table, plus C = 1.0 and max_iter = 1000 for the baseline."}],{x:0.52,y:1.4,w:2.8,h:3.7,fontFace:F,fontSize:10,color:INK,margin:0,isTextBox:true,valign:"top"});
  const P=(a,b,c,d)=>[cell(a,{bold:true}),cell(b,{align:"center"}),cell(c,{align:"center",bold:true,color:TEAL}),cell(d)];
  tb(s,[[hdr("Hyperparameter"),hdr("Search range",{align:"center"}),hdr("Best",{align:"center"}),hdr("Purpose")],
    P("n_estimators","100 – 600",BP.n_estimators,"Number of boosting rounds; more = more capacity"),
    P("max_depth","2 – 8",BP.max_depth,"Tree depth; controls interaction complexity and overfit"),
    P("learning_rate","0.01 – 0.3 (log)",BP.learning_rate.toFixed(3),"Shrinks each tree's contribution"),
    P("subsample","0.5 – 1.0",BP.subsample.toFixed(2),"Row fraction per tree; adds randomness"),
    P("colsample_bytree","0.5 – 1.0",BP.colsample_bytree.toFixed(2),"Feature fraction per tree; decorrelates trees"),
    P("reg_lambda","0.001 – 10 (log)",BP.reg_lambda.toFixed(2),"L2 penalty on leaf weights"),
    P("min_child_weight","1 – 20",BP.min_child_weight,"Minimum evidence in a leaf; blocks tiny noisy splits")],
    { x:3.55, y:1.0, w:6.05, colW:[1.35,1.15,0.7,2.85], fontSize:9.5, rowH:0.46 });
  s.addText("Best values come from Optuna trial #"+R.optuna.best_trial+" (slide 7).",{x:3.55,y:4.75,w:6,h:0.3,fontFace:F,fontSize:10,italic:true,color:MUTE,margin:0,isTextBox:true});
  s.addNotes("The winning configuration is shallow (depth 2) with heavy regularisation: the signal in this data is close to additive, which is why a regularised linear model is hard to beat."); }

// 7 ---------------------------------------------------------------- Optuna
{ const s = base("Hyperparameter optimisation with Optuna", "", "COMPLETED");
  img(s,"results/optuna_history.png",0.4,1.0,5.2,2.85);
  card(s,5.75,1.0,3.85,2.85); s.addText("Study set-up",{x:5.87,y:1.05,w:3.6,h:0.3,fontFace:F,fontSize:12.5,bold:true,color:TEAL,margin:0,isTextBox:true});
  s.addText(bullets(["Objective: train XGBoost on the train split, return AUC on the validation split","Metric: validation AUC (maximise)","Sampler: TPE, seed 42","Trials: "+R.optuna.n_trials+"  |  total time "+R.optuna.total_seconds.toFixed(0)+" s","Test set never used in any trial"],10),{x:5.87,y:1.38,w:3.65,h:2.4,margin:0,isTextBox:true,valign:"top"});
  tb(s,[[hdr("Best trial"),hdr("Value",{align:"center"}),hdr("Reference",{}),hdr("Val AUC",{align:"center"})],
    [cell("Trial #"+R.optuna.best_trial,{bold:true}),cell("AUC "+f3(R.optuna.best_value),{align:"center",bold:true,color:TEAL}),cell("XGBoost default"),cell(f3(R.val_defaults.xgb.auc),{align:"center"})],
    [cell("depth "+BP.max_depth+", lr "+BP.learning_rate.toFixed(3)),cell(BP.n_estimators+" trees",{align:"center"}),cell("Logistic baseline"),cell(f3(R.val_defaults.logreg.auc),{align:"center"})]],
    { x:0.4, y:4.0, w:5.2, colW:[1.7,1.0,1.5,1.0], fontSize:9.5, rowH:0.3 });
  s.addText(`Gain from tuning: +${(R.optuna.best_value-R.val_defaults.xgb.auc).toFixed(3)} AUC over default XGBoost (${f3(R.val_defaults.xgb.auc)} to ${f3(R.optuna.best_value)}). Most influential hyperparameter: min_child_weight (importance ${R.optuna.importance.min_child_weight.toFixed(2)}).`,{x:5.75,y:4.0,w:3.85,h:1.1,fontFace:F,fontSize:10.5,color:INK,margin:0,isTextBox:true,valign:"top"});
  s.addNotes("Optimisation history plot is generated from the real study. Note the curve plateaus around 0.794-0.795 after about five trials: the model has reached the ceiling of this dataset."); }

// 8 ---------------------------------------------------------------- MLflow
{ const s = base("Experiment tracking with MLflow", "", "COMPLETED");
  img(s,"results/mlflow_dashboard.png",0.4,1.0,6.0,2.55);
  card(s,6.55,1.0,3.05,2.55); s.addText("What is tracked",{x:6.67,y:1.05,w:2.8,h:0.3,fontFace:F,fontSize:12.5,bold:true,color:TEAL,margin:0,isTextBox:true});
  s.addText(bullets(["Params: all hyperparameters","Metrics: val and test AUC, KS, F1, precision, recall, Brier, train seconds","Tags: model, dataset version, split, seed","Store: SQLite (mlflow.db), "+R.mlflow.n_runs+" runs"],10),{x:6.67,y:1.38,w:2.85,h:2.15,margin:0,isTextBox:true,valign:"top"});
  card(s,0.4,3.7,9.2,1.45); s.addText([{text:"Best-performing run. ",options:{bold:true,color:TEAL}},{text:`baseline_logreg and Optuna trial #${R.optuna.best_trial} are statistically tied on validation AUC (${f3(R.val_defaults.logreg.auc)} vs ${f3(R.optuna.best_value)}). `},{text:"Versioning. ",options:{bold:true,color:TEAL}},{text:"Every run carries the dataset tag synthetic_mfi_v1_n50000, the seed and the split; the code, results/ folder and mlflow.db are packaged together so any run can be reproduced (push the folder to GitHub before the viva). To see the live dashboard: mlflow ui --backend-store-uri sqlite:///mlflow.db"}],{x:0.55,y:3.75,w:8.9,h:1.35,fontFace:F,fontSize:10.5,color:INK,margin:0,isTextBox:true,valign:"middle"});
  s.addNotes("The image is rendered from the real MLflow store. For the viva, run `mlflow ui` against mlflow.db and show the live dashboard; you can also replace this image with a screenshot of it."); }

// 9 ---------------------------------------------------------------- Split strategy
{ const s = base("Training, validation and test strategy", "", "COMPLETED");
  const box=(x,y,w,h,t,sub,c)=>{ s.addShape(pres.ShapeType.roundRect,{x,y,w,h,fill:{color:c},line:{color:c},rectRadius:0.08}); s.addText([{text:t,options:{bold:true,fontSize:12,breakLine:true}},{text:sub,options:{fontSize:9.5}}],{x,y,w,h,fontFace:F,color:WHITE,align:"center",valign:"middle",margin:4,isTextBox:true}); };
  box(0.4,1.05,2.0,0.95,"50,000 rows","stratified on target x gender x region",NAVY);
  box(3.1,1.05,1.9,0.95,"Train 60%  (30,000)","fit models, scaler, reweighing",TEAL);
  box(5.4,1.05,1.9,0.95,"Validation 20%  (10,000)","tuning, thresholds, calibration",ORANGE);
  box(7.7,1.05,1.9,0.95,"Test 20%  (10,000)","scored ONCE at the end","6B7B8C");
  [[2.4,3.1],[2.4,5.4],[2.4,7.7]].forEach(()=>{});
  s.addShape(pres.ShapeType.line,{x:2.4,y:1.52,w:0.7,h:0,line:{color:NAVY,width:1.5,endArrowType:"triangle"}});
  s.addShape(pres.ShapeType.line,{x:5.0,y:1.52,w:0.4,h:0,line:{color:NAVY,width:1.5,endArrowType:"triangle"}});
  s.addShape(pres.ShapeType.line,{x:7.3,y:1.52,w:0.4,h:0,line:{color:NAVY,width:1.5,endArrowType:"triangle"}});
  card(s,0.4,2.25,4.5,2.85); s.addText("How leakage was prevented",{x:0.52,y:2.3,w:4.3,h:0.3,fontFace:F,fontSize:12.5,bold:true,color:TEAL,margin:0,isTextBox:true});
  s.addText(bullets(["StandardScaler and reweighing weights computed on TRAIN only","Protected attributes (gender, region) never enter the feature matrix","F1 thresholds, calibration (isotonic) and group cut-offs learned on VALIDATION only","Group balance and 27% default rate preserved by stratification","Single random seed (42) for every split and model"],10),{x:0.52,y:2.62,w:4.3,h:2.45,margin:0,isTextBox:true,valign:"top"});
  card(s,5.1,2.25,4.5,2.85); s.addText("Test set exclusion: confirmed",{x:5.22,y:2.3,w:4.3,h:0.3,fontFace:F,fontSize:12.5,bold:true,color:TEAL,margin:0,isTextBox:true});
  s.addText(bullets(["All 40 Optuna trials were scored on validation AUC","Model selection (logistic regression vs XGBoost) used validation AUC","Test predictions were produced in one pass after every choice was frozen","Caveat: k-fold cross-validation is not used; a single split was chosen for speed and is listed as a next step"],10),{x:5.22,y:2.62,w:4.3,h:2.45,margin:0,isTextBox:true,valign:"top"});
  s.addNotes("This is the workflow diagram required by the format. Be ready to answer: why no cross-validation? Answer: 50k rows and a single stratified holdout give stable estimates; CV is a planned improvement."); }

// 10 --------------------------------------------------------------- Metrics
{ const s = base("Evaluation metrics: logistic regression on the test set", "", "COMPLETED");
  img(s,"results/confusion_lr.png",0.4,1.0,3.1,2.72);
  const b=T.logreg, tp=b.tp, fp=b.fp, fn=b.fn;
  tb(s,[[hdr("Metric"),hdr("Value",{align:"center"}),hdr("Calculation with our data")],
    [cell("Accuracy"),cell(pc(b.accuracy),{align:"center"}),cell(`(${b.tn}+${tp}) / 10,000`)],
    [cell("Precision"),cell(f3(b.precision),{align:"center"}),cell(`${tp} / (${tp}+${fp})`)],
    [cell("Recall"),cell(f3(b.recall),{align:"center"}),cell(`${tp} / (${tp}+${fn})`)],
    [cell("F1-score"),cell(f3(b.f1),{align:"center"}),cell(`2 x ${f3(b.precision)} x ${f3(b.recall)} / (sum)`)],
    [cell("AUC-ROC (primary)",{bold:true}),cell(f3(b.auc),{align:"center",bold:true,color:TEAL}),cell("Rank-based, threshold-free")]],
    { x:3.65, y:1.0, w:5.95, colW:[1.5,0.9,3.55], fontSize:9.5, rowH:0.3 });
  card(s,3.65,2.95,5.95,2.2); s.addText("Primary metric: AUC-ROC",{x:3.77,y:3.0,w:5.7,h:0.3,fontFace:F,fontSize:12.5,bold:true,color:TEAL,margin:0,isTextBox:true});
  s.addText([{text:"AUC = P( score of a random defaulter > score of a random non-defaulter ) = integral of TPR d(FPR)",options:{bold:true,fontFace:"Consolas",fontSize:9.5,breakLine:true}},
   {text:`Interpretation: our AUC of ${f3(b.auc)} means that in ${pc(b.auc)} of (defaulter, repaying borrower) pairs the model gives the defaulter the higher risk. Why this metric: defaults are only 27% of rows, so accuracy is misleading (always predicting "repay" would score 72.7%), and AUC does not depend on the threshold, which we then set separately per group for fairness. KS = ${b.ks.toFixed(1)} is the largest gap between the cumulative score distributions of defaulters and non-defaulters.`,options:{fontFace:F,fontSize:10}}],
   {x:3.77,y:3.32,w:5.7,h:1.8,color:INK,margin:0,isTextBox:true,valign:"top",paraSpaceAfter:4});
  s.addText("Confusion matrix, threshold 0.26",{x:0.4,y:3.75,w:3.1,h:0.25,fontFace:F,fontSize:9.5,italic:true,color:MUTE,align:"center",margin:0,isTextBox:true});
  s.addText(`Missed defaulters (FN): ${fn}\nWrongly flagged (FP): ${fp}`,{x:0.4,y:4.1,w:3.1,h:0.8,fontFace:F,fontSize:10.5,color:INK,margin:0,isTextBox:true,align:"center",valign:"top"});
  s.addNotes("Primary metric justification: class imbalance plus threshold-independence. Walk through one metric with real numbers (e.g., recall = 2023/2727)."); }

// 11 --------------------------------------------------------------- Comparison
{ const s = base("Baseline vs optimised models, and the fairness trade-off", "", "COMPLETED");
  const row=(nm,k,sec,hl)=>[cell(nm,{bold:true,fill:hl?"E3F3F3":WHITE}),cell(f3(T[k].auc),{align:"center",fill:hl?"E3F3F3":WHITE}),cell(T[k].ks.toFixed(1),{align:"center",fill:hl?"E3F3F3":WHITE}),cell(f3(T[k].f1),{align:"center",fill:hl?"E3F3F3":WHITE}),cell(f3(T[k].brier),{align:"center",fill:hl?"E3F3F3":WHITE}),cell(sec,{align:"center",fill:hl?"E3F3F3":WHITE})];
  tb(s,[[hdr("Model (test set)"),hdr("AUC",{align:"center"}),hdr("KS",{align:"center"}),hdr("F1",{align:"center"}),hdr("Brier",{align:"center"}),hdr("Train s",{align:"center"})],
    row("Logistic regression (baseline)","logreg",R.test_train_seconds.logreg.toFixed(2),true),
    row("XGBoost default","xgb_default",R.test_train_seconds.xgb_default.toFixed(2)),
    row("LightGBM default","lgbm_default",R.test_train_seconds.lgbm_default.toFixed(2)),
    row("XGBoost tuned (Optuna)","xgb_tuned",R.test_train_seconds.xgb_tuned.toFixed(2)+" (+"+R.test_train_seconds.optuna_total.toFixed(0)+" s search)")],
    { x:0.4, y:1.0, w:5.2, colW:[1.75,0.55,0.5,0.55,0.6,1.25], fontSize:9, rowH:0.3 });
  card(s,0.4,2.7,5.2,2.45); s.addText("Did optimisation help?",{x:0.52,y:2.75,w:5,h:0.3,fontFace:F,fontSize:12.5,bold:true,color:TEAL,margin:0,isTextBox:true});
  s.addText(bullets([`Yes for XGBoost: test AUC ${f3(T.xgb_default.auc)} to ${f3(T.xgb_tuned.auc)}, and the train-validation gap shrank from ${f3(R.overfit.xgb_default[0]-R.overfit.xgb_default[1])} to ${f3(R.overfit.xgb_tuned[0]-R.overfit.xgb_tuned[1])}`,`No against the baseline: tuned XGBoost (${f3(T.xgb_tuned.auc)}) does not beat logistic regression (${f3(T.logreg.auc)})`,`Cost: ${R.test_train_seconds.optuna_total.toFixed(0)} s of search for no gain over a model that trains in well under a second`,"Best model: logistic regression (wins on validation AUC; simplest and most explainable)"],10),{x:0.52,y:3.08,w:5.0,h:2.05,margin:0,isTextBox:true,valign:"top"});
  img(s,"results/pareto.png",5.75,1.0,3.85,2.4);
  tb(s,[[hdr("Setting"),hdr("DIR",{align:"center"}),hdr("Bal. acc.",{align:"center"}),hdr("Gate",{align:"center"})],
    [cell("No controls"),cell(f2(FS.none.dir),{align:"center"}),cell(f3(FS.none.ba),{align:"center"}),cell("Blocked",{align:"center",color:RED,bold:true})],
    [cell("Reweigh only"),cell(f2(FS.reweighed.dir),{align:"center"}),cell(f3(FS.reweighed.ba),{align:"center"}),cell("Blocked",{align:"center",color:RED,bold:true})],
    [cell("Reweigh + 60% calib."),cell(f2(R.fairness_grid.find(g=>g.reweigh==1&&Math.abs(g.lam-0.6)<1e-9).dir),{align:"center"}),cell(f3(R.fairness_grid.find(g=>g.reweigh==1&&Math.abs(g.lam-0.6)<1e-9).ba),{align:"center"}),cell("Passed",{align:"center",color:GREEN,bold:true})]],
    { x:5.75, y:3.5, w:3.85, colW:[1.55,0.7,0.85,0.75], fontSize:9, rowH:0.28 });
  s.addText("Calibration = group-threshold blend (0 = one global cut-off, 1 = equal approval rates). Gate = DIR >= 0.80, parity and EO gaps <= 0.10, AUC >= 0.78, KS >= 40.",{x:5.75,y:4.65,w:3.85,h:0.5,fontFace:F,fontSize:8.5,italic:true,color:MUTE,margin:0,isTextBox:true,valign:"top"});
  s.addNotes("Key honest finding: on this synthetic data the relationship is close to additive, so a tuned boosted tree cannot beat logistic regression. We still ran the comparison because the project requires evidence, not assumption. Fairness: reweighing alone is not enough; group-specific thresholds do most of the work."); }

// 12 --------------------------------------------------------------- Calibration
{ const s = base("Calibration and reliability", "", "COMPLETED");
  img(s,"results/reliability.png",0.4,1.0,6.0,2.67);
  card(s,6.55,1.0,3.05,2.67); s.addText("Brier score",{x:6.67,y:1.05,w:2.8,h:0.3,fontFace:F,fontSize:12.5,bold:true,color:TEAL,margin:0,isTextBox:true});
  s.addText([{text:"Brier = mean of (p - y)^2",options:{fontFace:"Consolas",bold:true,fontSize:9.5,breakLine:true}},{text:`Logistic regression: ${f3(T.logreg.brier)}`,options:{breakLine:true}},{text:`Tuned XGBoost raw: ${f3(T.xgb_tuned.brier)}`,options:{breakLine:true}},{text:`XGBoost + isotonic: ${f3(T.xgb_tuned_cal.brier)}`,options:{breakLine:true}},{text:"Reference: always predicting the 27.3% base rate gives 0.198, so all models are clearly better."}],{x:6.67,y:1.4,w:2.85,h:2.2,fontFace:F,fontSize:10,color:INK,margin:0,isTextBox:true,valign:"top",paraSpaceAfter:3});
  card(s,0.4,3.8,9.2,1.35); s.addText([{text:"Interpretation. ",options:{bold:true,color:TEAL}},{text:"Calibration asks whether a predicted 30% default risk really defaults about 30% of the time. The reliability curves follow the diagonal closely, so the probabilities can be read as risk, which matters because the fairness step compares and thresholds them. Isotonic calibration (fitted on validation) changed the Brier score by only "+Math.abs(T.xgb_tuned_cal.brier-T.xgb_tuned.brier).toFixed(4)+": boosted trees with depth 2 and strong regularisation were already well calibrated. Logistic regression has the lowest Brier score of the three ("+f3(T.logreg.brier)+")."}],{x:0.55,y:3.85,w:8.9,h:1.25,fontFace:F,fontSize:10.5,color:INK,margin:0,isTextBox:true,valign:"middle"});
  s.addNotes("Brier baseline: p(1-p) with p=0.2727 is 0.198. Do not confuse probability calibration (this slide) with group-threshold calibration (fairness)."); }

// 13 --------------------------------------------------------------- Challenges
{ const s = base("Challenges and limitations", "", "COMPLETED");
  const rows=[["Data limitation","Data is synthetic. Real telecom and utility feeds are not yet available, so absolute numbers will change on real data.","Documented clearly; generator mirrors the report's feature design; real-data pilot is a next step."],
   ["Overfitting","Default XGBoost: train AUC "+f3(R.overfit.xgb_default[0])+" vs validation "+f3(R.overfit.xgb_default[1])+".","Optuna selected depth 2 with strong regularisation; gap fell to "+f3(R.overfit.xgb_tuned[0]-R.overfit.xgb_tuned[1])+"."],
   ["Model performance ceiling","Tuned boosted trees did not beat logistic regression (AUC "+f3(T.xgb_tuned.auc)+" vs "+f3(T.logreg.auc)+").","Selected the simpler model on validation evidence."],
   ["Class imbalance","27% defaults; the report planned SMOTE.","Not needed: threshold chosen on validation F1; SMOTE listed as optional."],
   ["Fairness cost","Reaching the 0.80 gate lowers balanced accuracy from "+f3(FS.none.ba)+" to "+f3(R.fairness_grid.find(g=>g.reweigh==1&&Math.abs(g.lam-0.6)<1e-9).ba)+"; reweighing alone failed the gate.","Combined reweighing with group thresholds; Pareto view lets risk officers choose."],
   ["Legal / ethical","Group-specific thresholds use gender and region at decision time, which needs legal review.","Flagged for compliance sign-off; human review of borderline cases."],
   ["Compute","Minimal (40 trials in "+R.optuna.total_seconds.toFixed(0)+" s on CPU).","No constraint encountered."]];
  tb(s,[[hdr("Area"),hdr("What we found"),hdr("Corrective action")],...rows.map(r=>[cell(r[0],{bold:true}),cell(r[1]),cell(r[2])])],{ x:0.4, y:1.0, w:9.2, colW:[1.6,4.1,3.5], fontSize:10.5, rowH:0.5 });
  s.addNotes("Being honest about limitations is part of the marking criteria. The group-threshold legality point is the most important ethical caveat."); }

// 14 --------------------------------------------------------------- Conclusion
{ const s = base("Conclusion and next steps", "", "COMPLETED + PROPOSED");
  const ok=(t)=>({ text:t, options:{ bullet:true, breakLine:true, fontFace:F, fontSize:10.5, color:INK, paraSpaceAfter:3 } });
  const rw6 = R.fairness_grid.find(g=>g.reweigh==1&&Math.abs(g.lam-0.6)<1e-9);
  card(s,0.4,1.0,4.5,2.35); s.addText("Completed",{x:0.52,y:1.04,w:4.2,h:0.3,fontFace:F,fontSize:12.5,bold:true,color:TEAL,margin:0,isTextBox:true});
  s.addText([ok("End-to-end pipeline: data, split, baseline, XGBoost, LightGBM, Optuna, MLflow, calibration, fairness"),ok(`Best model: logistic regression (test AUC ${f3(T.logreg.auc)}, KS ${T.logreg.ks.toFixed(1)})`),ok(`Recommended release setting: reweighing + 60% threshold calibration. DIR ${f2(rw6.dir)}, parity gap ${f3(rw6.dpd)}, EO gap ${f3(rw6.eod)}, AUC ${f3(rw6.auc)}`),ok("Live demo app: scoring, SHAP-style reason codes, fairness lab, audit log")],{x:0.52,y:1.36,w:4.3,h:1.95,margin:0,isTextBox:true,valign:"top"});
  card(s,5.1,1.0,4.5,2.35); s.addText("Success criteria check",{x:5.22,y:1.04,w:4.2,h:0.3,fontFace:F,fontSize:12.5,bold:true,color:TEAL,margin:0,isTextBox:true});
  const sc=(a,b,p)=>[cell(a),cell(b,{align:"center"}),cell(p?"Met":"Not met",{align:"center",bold:true,color:p?GREEN:RED})];
  tb(s,[[hdr("Criterion"),hdr("Result",{align:"center"}),hdr("Status",{align:"center"})],sc("AUC >= 0.78",f3(rw6.auc),rw6.auc>=.78),sc("KS >= 40",rw6.ks.toFixed(1),rw6.ks>=40),sc("DIR >= 0.80",f2(rw6.dir),rw6.dir>=.8),sc("Parity gap <= 0.10",f3(rw6.dpd),rw6.dpd<=.1),sc("Equalised-odds gap <= 0.10",f3(rw6.eod),rw6.eod<=.1),[cell("F1 >= 0.65"),cell(f3(rw6.f1),{align:"center"}),cell("Not met",{align:"center",bold:true,color:RED})]],{ x:5.22, y:1.38, w:4.26, colW:[2.2,1.0,1.06], fontSize:9, rowH:0.26 });
  card(s,0.4,3.5,9.2,1.65); s.addText("Proposed (not yet done)",{x:0.52,y:3.54,w:4.2,h:0.3,fontFace:F,fontSize:12.5,bold:true,color:ORANGE,margin:0,isTextBox:true});
  s.addText(bullets(["Sign data-sharing MoUs and re-run the pipeline on real partner data (DPDP Act 2023)","Legal review of group-specific thresholds; revisit F1 target (0.65 was not reached on this data)","Containerised FastAPI scoring service, SHAP dashboard, drift and fairness monitoring (PSI, DIR alerts), 1-2 branch pilot with human review of borderline cases","Add k-fold cross-validation and compare in-processing fairness methods"],10),{x:0.52,y:3.86,w:8.95,h:1.28,margin:0,isTextBox:true,valign:"top"});
  s.addNotes("Be clear which success criteria are met and which are not: F1 >= 0.65 was not reached because the F1 here is capped by the 27% base rate and the noise built into the synthetic data."); }

// 15 --------------------------------------------------------------- Q&A
{ const s = pres.addSlide(); n++; s.background = { color: NAVY };
  s.addText("Questions?", { x:0.6, y:1.5, w:8.8, h:1.2, fontFace:F, fontSize:48, bold:true, color:WHITE, margin:0, isTextBox:true });
  s.addText("Source code, MLflow store, Optuna trials and all figures are available for the viva.", { x:0.6, y:2.8, w:8.8, h:0.5, fontFace:F, fontSize:16, color:"9FC6E8", margin:0, isTextBox:true });
  s.addText("Niharika Mathur  |  Manyata Kothari  |  Aayushi Purhoit  |  Ruchita Wagh", { x:0.6, y:4.2, w:8.8, h:0.4, fontFace:F, fontSize:13, color:WHITE, margin:0, isTextBox:true }); }

pres.writeFile({ fileName: "FairLend_Final_Presentation.pptx" }).then(()=>console.log("ok", n, "slides"));
