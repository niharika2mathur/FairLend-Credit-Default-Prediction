# FairLend – Responsible AI for Financial Inclusion

### Credit Default Prediction under Fairness Constraints for Microfinance Lending

FairLend is a Machine Learning-based credit risk assessment system designed to predict loan defaults while addressing algorithmic bias in microfinance lending.

The project explores how alternative financial indicators can help assess borrowers with limited or no traditional credit history, while ensuring that predictions do not unfairly disadvantage individuals based on gender or geographical location.

**Our goal:** Build an accurate, transparent and fairness-aware credit default prediction system.

---

## 1. Problem Statement

Traditional credit scoring systems often struggle to assess individuals who have limited or no credit history, particularly in underserved and rural communities.

Microfinance institutions may rely on alternative data such as:

- Mobile recharge regularity
- Mobile money transactions
- Utility bill payment history
- Self-help group repayment history
- Previous unpaid loans
- Income-related indicators

However, these alternative indicators may introduce indirect discrimination through proxy variables associated with gender and geographical location.

FairLend addresses this challenge by combining credit default prediction with fairness evaluation and mitigation techniques.

## 2. Project Objectives

- Predict borrowers likely to default on loans (90+ days past due).
- Compare different Machine Learning algorithms.
- Improve model performance through hyperparameter optimisation.
- Evaluate fairness across gender and geographical groups.
- Reduce bias using reweighing and group-specific threshold calibration.
- Maintain transparency and reproducibility through experiment tracking.

## 3. Dataset Overview

The project uses a **synthetic microfinance dataset** generated through the Python pipeline.

| Attribute | Details |
|---|---|
| Total records | 50,000 borrowers |
| Model features | 9 |
| Protected attributes | Gender and Region |
| Target variable | Loan default |
| Default rate | 27.3% |
| Random seed | 42 |

**Important:** The dataset is synthetic and contains deliberately introduced gender and regional bias for experimentation. Real partner financial data has not yet been integrated.

## 4. Machine Learning Methodology

The project follows an end-to-end Machine Learning pipeline.

### Models Evaluated

| Model | Purpose |
|---|---|
| Logistic Regression | Interpretable baseline model |
| XGBoost | Non-linear classification |
| LightGBM | Alternative gradient boosting model |
| Tuned XGBoost | Optimised model using Optuna |

### Hyperparameter Optimisation

Optuna was used to optimise XGBoost parameters through 40 trials.

The optimisation process focused on maximising validation AUC while avoiding overfitting.

### Data Processing

- Synthetic data generation
- Log transformation of mobile money transaction counts
- Stratified train-validation-test split
- Feature standardisation
- Reweighing for fairness mitigation

The dataset was divided into:
- Training: 60% (30,000 records)
- Validation: 20% (10,000 records)
- Testing: 20% (10,000 records)

Protected attributes were excluded from the model's feature inputs and retained for fairness auditing.

## 5. Fairness Approach

Fairness is a central component of FairLend.

The project evaluates whether lending outcomes differ unfairly across demographic groups.

Two techniques were explored:

**1. Reweighing**

Adjusts the importance of training samples to reduce the influence of historical group imbalance.

**2. Group-specific Threshold Calibration**

Adjusts decision thresholds across groups to improve fairness in approval outcomes.

The final recommended configuration combines reweighing with 60% threshold calibration.

## 6. Experimental Results

### Model Performance

| Model | Test AUC |
|---|---:|
| Logistic Regression | 0.808 |
| XGBoost Default | 0.790 |
| LightGBM Default | 0.793 |
| Tuned XGBoost | 0.806 |

Logistic Regression achieved the highest test AUC of 0.808 and was selected as the best predictive model.

### Fairness Results

| Configuration | DIR | Result |
|---|---:|---|
| No fairness controls | 0.65 | Blocked |
| Reweighing only | 0.72 | Blocked |
| Reweighing + 60% calibration | 0.89 | Passed |

The final recommended fairness configuration achieved:

- Disparate Impact Ratio (DIR): 0.89
- Parity gap: 0.086
- Equalised Odds gap: 0.016
- AUC: 0.801

### Calibration

The Logistic Regression model achieved a Brier Score of 0.148, indicating better probability calibration than the compared models.

## 7. Technologies Used

- **Programming Language:** Python
- **Machine Learning:** Scikit-learn, XGBoost, LightGBM
- **Hyperparameter Optimisation:** Optuna
- **Experiment Tracking:** MLflow
- **Data Processing:** Pandas, NumPy
- **Visualisation:** Matplotlib
- **Model Storage:** Joblib
- **Frontend Demo:** HTML, CSS and JavaScript

## 8. Project Structure

```text
FairLend_Final_Project/
│
├── fairlend_demo_app.html
├── pipeline.py
├── extra_plots.py
├── build_deck.js
├── requirements.txt
├── README.md
├── mlflow.db
├── run_log.txt
│
└── results/
    ├── dataset and evaluation outputs
    ├── model comparison results
    ├── fairness analysis
    ├── ROC curves
    ├── confusion matrix
    ├── calibration plots
    └── optimisation results
```

## 9. Installation and Execution

### Step 1: Clone the repository

```bash
git clone https://github.com/niharika2mathur/FairLend-Credit-Default-Prediction.git
```

### Step 2: Navigate to the project

```bash
cd FairLend-Credit-Default-Prediction
```

### Step 3: Install dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Run the Machine Learning pipeline

```bash
python pipeline.py
```

This executes data generation, preprocessing, model training, Optuna optimisation, MLflow tracking, calibration and fairness evaluation.

### Step 5: Generate additional plots

```bash
python extra_plots.py
```

### Step 6: Launch the MLflow dashboard

```bash
mlflow ui --backend-store-uri sqlite:///mlflow.db
```

Open the local MLflow address displayed in your terminal.

### Step 7: View the demonstration

Open `fairlend_demo_app.html` in a web browser to explore the existing FairLend demonstration.

## 10. Limitations

Despite promising experimental results, the project has certain limitations:

- The dataset is synthetic rather than real-world financial data.
- Real telecom and utility partner integrations are pending.
- Fairness improvements involve a trade-off with predictive performance.
- Group-specific threshold calibration requires legal and ethical review.
- The target F1 score of 0.65 was not achieved.

These limitations are documented to ensure transparency and responsible use.

## 11. Future Scope

- Integrate real microfinance and alternative financial datasets.
- Conduct legal and regulatory reviews of fairness interventions.
- Develop a containerised FastAPI scoring service.
- Introduce continuous model drift and fairness monitoring.
- Conduct pilot testing with human review of borderline decisions.
- Explore additional in-processing fairness techniques and cross-validation.

## 12. Project Outcome

FairLend demonstrates how Machine Learning can be applied to credit risk assessment while considering fairness, explainability and responsible AI principles.

The project highlights that predictive accuracy alone is not sufficient for responsible financial decision-making. Models must also be evaluated for their impact on different demographic groups.

---

**Project:** FairLend – Credit Default Prediction under Fairness Constraints

**Domain:** Artificial Intelligence | Machine Learning | FinTech | Responsible AI

**Course:** BTECH CAP 501 – Project Life Cycle Management

**Academic Year:** 2026–27

**Institution:** uGDX School of Technology, ATLAS SkillTech University

**Developed by:** Niharika Mathur, Manyata Kothari, Aayushi Purhoit and Ruchita Wagh

**Faculty Mentor:** Prof. Amrita Banerjee
