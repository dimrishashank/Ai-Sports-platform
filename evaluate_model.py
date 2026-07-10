import os
import sys
import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import accuracy_score, precision_score, f1_score
from sklearn.model_selection import cross_val_predict
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from pymongo import MongoClient
from dotenv import load_dotenv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))
from ai_training.classifier import _extract_feature_vector

# Connect to DB
env_path = os.path.join(os.path.dirname(__file__), 'server', '.env')
load_dotenv(env_path)
mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/ai_sports")
client = MongoClient(mongo_uri, tls=True, tlsAllowInvalidCertificates=True)
db = client.get_default_database()

# Fetch samples
samples = list(db.exercise_patterns.find({"label": {"$in": ["correct", "foul"]}}))

if not samples:
    print("No samples found.")
    sys.exit(0)

# Build features and labels
X = []
y = []
for s in samples:
    features = _extract_feature_vector(s)
    X.append(features)
    y.append(1 if s["label"] == "correct" else 0)

X = np.array(X)
y = np.array(y)
X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)

# Scale features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Define Model
model = RandomForestClassifier(
    n_estimators=100,
    max_depth=6,
    min_samples_leaf=1,
    random_state=42,
    class_weight='balanced',
)

# Use cross validation to get out-of-fold predictions
# If not enough samples for 5-fold CV, reduce folds or just fit and predict
num_correct = sum(y == 1)
num_foul = sum(y == 0)

min_samples = min(num_correct, num_foul)
cv_folds = min(5, min_samples)

if cv_folds >= 2:
    y_pred = cross_val_predict(model, X_scaled, y, cv=cv_folds)
else:
    model.fit(X_scaled, y)
    y_pred = model.predict(X_scaled)

# Calculate metrics
accuracy = accuracy_score(y, y_pred)
precision = precision_score(y, y_pred, zero_division=0)
f1 = f1_score(y, y_pred, zero_division=0)

print(f"Total samples: {len(samples)}")
print(f"Correct: {num_correct}, Foul: {num_foul}")
print(f"Accuracy: {accuracy:.4f}")
print(f"Precision: {precision:.4f}")
print(f"F1 Score: {f1:.4f}")

# Plot a bar chart
fig, ax = plt.subplots(figsize=(8, 6))
metrics = ['Accuracy', 'Precision', 'F1 Score']
values = [accuracy, precision, f1]

bars = ax.bar(metrics, values, color=['#4CAF50', '#2196F3', '#FFC107'])
ax.set_ylim(0, 1.1)
ax.set_ylabel('Score')
ax.set_title('AI Model Evaluation Metrics (Form Classifier)')

for bar in bars:
    yval = bar.get_height()
    ax.text(bar.get_x() + bar.get_width()/2.0, yval + 0.02, f'{yval:.4f}', ha='center', va='bottom', fontweight='bold')

plt.tight_layout()
graph_path = os.path.join(os.path.dirname(__file__), 'metrics_graph.png')
plt.savefig(graph_path)
print(f"Graph saved as: {graph_path}")

client.close()
