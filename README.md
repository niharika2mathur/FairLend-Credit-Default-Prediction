# FairLend: Credit Default Prediction under Fairness Constraints

Run order (all seeded, about 1 minute on a CPU):
1. `pip install -r requirements.txt`
2. `python pipeline.py`      -> data, split, baseline, XGBoost, LightGBM, Optuna (40 trials), MLflow, calibration, fairness; writes `results/`
3. `python extra_plots.py`   -> confusion matrix and dashboard figure from the MLflow export
4. `mlflow ui --backend-store-uri sqlite:///mlflow.db`   -> live experiment dashboard (take your real screenshot here)
5. `node build_deck.js`      -> rebuilds the presentation from `results/results.json`

Notes
- The dataset is SYNTHETIC with deliberately built-in gender/region bias. Say this in the viva.
- Test set is scored once, after all choices are frozen. Protected attributes are never model inputs.
- `fairlend_demo_app.html` is your existing web demo (open in a browser).
