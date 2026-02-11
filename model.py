import numpy as np
import pandas as pd
import joblib
import os
import json
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error


MODEL_PATH = os.path.join(os.path.dirname(__file__), 'saved_model', 'expense_model.joblib')
METRICS_PATH = os.path.join(os.path.dirname(__file__), 'saved_model', 'metrics.json')

FEATURE_NAMES = ['meals_out', 'travel_distance', 'shopping_score', 'activities', 'sleep_hours']
TARGET_NAME = 'daily_expense'


def train_model(data: list[dict]) -> dict:
    df = pd.DataFrame(data)
    
    X = df[FEATURE_NAMES].values
    y = df[TARGET_NAME].values

    if len(df) >= 10:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
    else:
        X_train, X_test = X, X
        y_train, y_test = y, y

    model = LinearRegression()
    model.fit(X_train, y_train)

    y_pred_train = model.predict(X_train)
    y_pred_test = model.predict(X_test)
    
    metrics = {
        'r2_train': round(r2_score(y_train, y_pred_train), 4),
        'r2_test': round(r2_score(y_test, y_pred_test), 4),
        'mae_test': round(mean_absolute_error(y_test, y_pred_test), 2),
        'mse_test': round(mean_squared_error(y_test, y_pred_test), 2),
        'rmse_test': round(np.sqrt(mean_squared_error(y_test, y_pred_test)), 2),
        'coefficients': {
            name: round(coef, 4) for name, coef in zip(FEATURE_NAMES, model.coef_)
        },
        'intercept': round(model.intercept_, 4),
        'n_train': len(X_train),
        'n_test': len(X_test),
        'n_total': len(df),
    }

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(model, MODEL_PATH)

    with open(METRICS_PATH, 'w', encoding='utf-8') as f:
        json.dump(metrics, f, ensure_ascii=False, indent=2)
    
    return metrics


def predict(features: dict) -> float:
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError("Model has not been trained yet.")
    
    model = joblib.load(MODEL_PATH)
    X = np.array([[features[name] for name in FEATURE_NAMES]])
    prediction = model.predict(X)[0]
    return round(max(0, prediction), 2)


def get_model_status() -> dict:
    exists = os.path.exists(MODEL_PATH)
    metrics = None
    if exists and os.path.exists(METRICS_PATH):
        with open(METRICS_PATH, 'r', encoding='utf-8') as f:
            metrics = json.load(f)
    return {'model_exists': exists, 'metrics': metrics}
