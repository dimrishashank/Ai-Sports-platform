import os
import sys
import matplotlib.pyplot as plt
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from pymongo import MongoClient
from dotenv import load_dotenv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))
from ai_training.classifier import _extract_feature_vector, FEATURE_NAMES

env_path = os.path.join(os.path.dirname(__file__), 'server', '.env')
load_dotenv(env_path)
mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/ai_sports")
client = MongoClient(mongo_uri, tls=True, tlsAllowInvalidCertificates=True)
db = client.get_default_database()

# ---------------------------------------------------------
# 1. FORM CLASSIFIER - Feature Importances
# ---------------------------------------------------------
samples = list(db.exercise_patterns.find({"label": {"$in": ["correct", "foul"]}}))
if samples:
    X = []
    y = []
    for s in samples:
        features = _extract_feature_vector(s)
        X.append(features)
        y.append(1 if s["label"] == "correct" else 0)

    X = np.array(X)
    y = np.array(y)
    X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = RandomForestClassifier(
        n_estimators=100, max_depth=6, min_samples_leaf=1,
        random_state=42, class_weight='balanced'
    )
    model.fit(X_scaled, y)

    importances = model.feature_importances_
    indices = np.argsort(importances)[::-1]
    
    top_n = 10
    top_indices = indices[:top_n]
    top_features = [FEATURE_NAMES[i] for i in top_indices]
    top_importances = importances[top_indices]

    plt.figure(figsize=(10, 6))
    plt.barh(top_features[::-1], top_importances[::-1], color='#9C27B0')
    plt.xlabel('Relative Importance')
    plt.title('Top 10 Feature Importances (Form Classifier)')
    plt.tight_layout()
    plt.savefig('feature_importances_graph.png')
    print("Saved feature_importances_graph.png")

# ---------------------------------------------------------
# 2. REP CALIBRATOR - Linear Regression
# ---------------------------------------------------------
rep_samples = list(db.exercise_patterns.find({"expected_reps": {"$ne": None, "$exists": True}}))
rep_samples = [s for s in rep_samples if s.get("expected_reps") is not None and s.get("ai_rep_count") is not None]

if len(rep_samples) >= 3:
    X_reps = np.array([[s["ai_rep_count"]] for s in rep_samples])
    y_reps = np.array([s["expected_reps"] for s in rep_samples])

    reg = LinearRegression()
    reg.fit(X_reps, y_reps)

    predictions = reg.predict(X_reps)
    mean_error = float(np.mean(np.abs(predictions - y_reps)))
    
    print(f"Rep Calibrator Samples: {len(rep_samples)}")
    print(f"Rep Calibrator Mean Absolute Error: {mean_error:.4f}")
    print(f"Correction Formula: expected_reps = {reg.coef_[0]:.3f} * ai_reps + {reg.intercept_:.3f}")

    plt.figure(figsize=(8, 6))
    plt.scatter(X_reps, y_reps, color='#F44336', label='Actual Data', alpha=0.6)
    
    # Line of best fit
    x_range = np.linspace(0, max(X_reps.max(), 1), 100).reshape(-1, 1)
    y_range = reg.predict(x_range)
    plt.plot(x_range, y_range, color='#2196F3', linewidth=2, label='Line of Best Fit')
    
    plt.xlabel('AI Detected Reps')
    plt.ylabel('Admin Expected Reps')
    plt.title('Rep Calibrator: AI vs Expected Reps')
    plt.legend()
    plt.tight_layout()
    plt.savefig('rep_calibrator_graph.png')
    print("Saved rep_calibrator_graph.png")

client.close()
