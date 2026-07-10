import os
import sys
import matplotlib.pyplot as plt
import numpy as np
from pymongo import MongoClient
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), 'server', '.env')
load_dotenv(env_path)
mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/ai_sports")
client = MongoClient(mongo_uri, tls=True, tlsAllowInvalidCertificates=True)
db = client.get_default_database()

patterns = list(db.exercise_patterns.find())

if not patterns:
    print("No data found in dataset.")
    sys.exit(0)

# Extract basic stats
total_samples = len(patterns)
test_types = {}
labels = {"correct": 0, "foul": 0}
reps = []
durations = []
visibilities = []
smoothness = []
stabilities = []

for p in patterns:
    tt = p.get("test_type", "Unknown")
    test_types[tt] = test_types.get(tt, 0) + 1
    
    lbl = p.get("label", "unknown")
    if lbl in labels:
        labels[lbl] += 1
    
    pat = p.get("pattern", {})
    if isinstance(pat, dict):
        # reps
        r = pat.get("rep_count")
        if r is not None: reps.append(r)
        
        # duration
        d = pat.get("duration_sec")
        if d is not None: durations.append(d)
        
        # visibility
        vis = pat.get("visibility", {}).get("mean")
        if vis is not None: visibilities.append(vis)
        
        # quality
        q = pat.get("quality_scores", {})
        sm = q.get("smoothness")
        if sm is not None: smoothness.append(sm)
        st = q.get("shoulder_stability")
        if st is not None: stabilities.append(st)

print("DATASET_SUMMARY_START")
print(f"Total Samples: {total_samples}")

print("\n--- By Exercise Type ---")
for k, v in test_types.items():
    print(f"  {k}: {v} samples ({(v/total_samples)*100:.1f}%)")

print("\n--- By Form Label ---")
for k, v in labels.items():
    print(f"  {k.capitalize()}: {v} samples ({(v/total_samples)*100:.1f}%)")

print("\n--- Averages & Metrics ---")
print(f"  Avg Reps per Video: {np.mean(reps):.1f} (min: {min(reps)}, max: {max(reps)})" if reps else "  Avg Reps: N/A")
print(f"  Avg Video Duration: {np.mean(durations):.1f}s (min: {min(durations):.1f}s, max: {max(durations):.1f}s)" if durations else "  Avg Duration: N/A")
print(f"  Avg Body Visibility: {np.mean(visibilities)*100:.1f}%" if visibilities else "  Avg Visibility: N/A")
print(f"  Avg Smoothness Score: {np.mean(smoothness):.2f}" if smoothness else "  Avg Smoothness: N/A")

print("DATASET_SUMMARY_END")

# --- Plotting ---
plt.style.use('ggplot')

# 1. Class Distribution Pie Chart
fig1, ax1 = plt.subplots(figsize=(6,6))
ax1.pie([labels["correct"], labels["foul"]], labels=["Correct Form", "Foul / Incorrect Form"], 
        autopct='%1.1f%%', startangle=90, colors=['#4CAF50', '#F44336'])
ax1.axis('equal')
plt.title("Form Label Distribution")
plt.savefig('dataset_labels_pie.png')
plt.close(fig1)

# 2. Exercise Types Bar Chart
fig2, ax2 = plt.subplots(figsize=(8,5))
keys = list(test_types.keys())
vals = list(test_types.values())
bars = ax2.bar(keys, vals, color='#2196F3')
plt.title("Samples per Exercise Type")
plt.ylabel("Number of Samples")
for bar in bars:
    yval = bar.get_height()
    ax2.text(bar.get_x() + bar.get_width()/2.0, yval + 0.5, int(yval), ha='center', va='bottom', fontweight='bold')
plt.tight_layout()
plt.savefig('dataset_exercises_bar.png')
plt.close(fig2)

# 3. Reps Distribution Histogram
if reps:
    fig3, ax3 = plt.subplots(figsize=(8,5))
    ax3.hist(reps, bins=range(0, max(reps)+2), color='#FF9800', edgecolor='black', alpha=0.7)
    plt.title("Distribution of Rep Counts")
    plt.xlabel("Number of Reps")
    plt.ylabel("Frequency")
    plt.tight_layout()
    plt.savefig('dataset_reps_hist.png')
    plt.close(fig3)

client.close()
