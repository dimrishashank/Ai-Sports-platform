import os
import sys
import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, ConfusionMatrixDisplay
from sklearn.model_selection import cross_val_predict
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from pymongo import MongoClient
from dotenv import load_dotenv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))
from ai_training.classifier import _extract_feature_vector

env_path = os.path.join(os.path.dirname(__file__), 'server', '.env')
load_dotenv(env_path)
mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/ai_sports")
client = MongoClient(mongo_uri, tls=True, tlsAllowInvalidCertificates=True)
db = client.get_default_database()

# Fetch all samples
all_samples = list(db.exercise_patterns.find({"label": {"$in": ["correct", "foul"]}}))

if not all_samples:
    print("No samples found.")
    sys.exit(0)

# Group by test_type, plus "All"
test_types = ["All"] + list(set(s.get("test_type", "Unknown") for s in all_samples))

results = []

for tt in test_types:
    if tt == "All":
        samples = all_samples
    else:
        samples = [s for s in all_samples if s.get("test_type") == tt]
    
    num_correct = sum(1 for s in samples if s["label"] == "correct")
    num_foul = sum(1 for s in samples if s["label"] == "foul")
    
    # We need at least 1 sample of each class to compute meaningful metrics / cv
    if num_correct == 0 or num_foul == 0:
        continue

    X = []
    y = []
    for s in samples:
        X.append(_extract_feature_vector(s))
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

    min_samples = min(num_correct, num_foul)
    cv_folds = min(5, min_samples)

    if cv_folds >= 2:
        y_pred = cross_val_predict(model, X_scaled, y, cv=cv_folds)
    else:
        model.fit(X_scaled, y)
        y_pred = model.predict(X_scaled)

    acc = accuracy_score(y, y_pred)
    prec = precision_score(y, y_pred, zero_division=0)
    rec = recall_score(y, y_pred, zero_division=0)
    f1 = f1_score(y, y_pred, zero_division=0)
    cm = confusion_matrix(y, y_pred, labels=[0, 1])

    # Plot Confusion Matrix
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=['Foul', 'Correct'])
    fig, ax = plt.subplots(figsize=(6, 5))
    disp.plot(ax=ax, cmap='Blues')
    plt.title(f'Confusion Matrix: {tt} Model')
    
    safe_tt = tt.lower().replace(" ", "_").replace("-", "_")
    graph_filename = f'cm_{safe_tt}.png'
    graph_path = os.path.join(os.path.dirname(__file__), graph_filename)
    plt.tight_layout()
    plt.savefig(graph_path)
    plt.close(fig)

    results.append({
        "test_type": tt,
        "total": len(samples),
        "correct_samples": num_correct,
        "foul_samples": num_foul,
        "accuracy": acc,
        "precision": prec,
        "recall": rec,
        "f1": f1,
        "graph": graph_path,
        "graph_filename": graph_filename
    })

# Print results for parsing
import json
print("JSON_START")
print(json.dumps(results))
print("JSON_END")

client.close()
