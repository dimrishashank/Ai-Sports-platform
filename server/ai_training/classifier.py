"""
AI Exercise Classifier — Real ML model trained on HeadAdmin's labeled videos.

This module bridges the rich feature dataset (from trainer.py) with actual
machine learning classification and form scoring.

Two models are trained:
  1. FORM CLASSIFIER: Correct vs Foul (Random Forest on extracted features)
  2. REP CALIBRATOR: Learns the AI's rep counting bias and corrects it

The models are trained when:
  - HeadAdmin uploads a new training video (auto-retrain if ≥3 samples per class)
  - Manual trigger from the admin dashboard

Features used (30+ engineered features per sample):
  - Angle stats: min, max, mean, std, range, median, IQR (primary + secondary)
  - Body alignment: body_line mean/std, hip_sag mean/std
  - Bilateral symmetry: left-right diff mean/max
  - Dynamics: angular velocity mean/max, acceleration mean
  - Quality: smoothness, stability, bilateral_score, cadence_regularity
  - Visibility: mean, min
  - Rep timing: duration mean/std/min/max
"""
import os
import pickle
import numpy as np
from datetime import datetime

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
FORM_MODEL_PATH = os.path.join(MODEL_DIR, 'form_classifier.pkl')
REP_MODEL_PATH = os.path.join(MODEL_DIR, 'rep_calibrator.pkl')

# Minimum samples per class before training
MIN_SAMPLES_PER_CLASS = 2

# Feature names for the form classifier (must match extract order)
FEATURE_NAMES = [
    # Primary angle (7)
    'primary_angle_min', 'primary_angle_max', 'primary_angle_mean',
    'primary_angle_std', 'primary_angle_range', 'primary_angle_median', 'primary_angle_iqr',
    # Secondary angle (2)
    'secondary_angle_mean', 'secondary_angle_std',
    # Body alignment (4)
    'body_line_mean', 'body_line_std', 'hip_sag_mean', 'hip_sag_std',
    # Bilateral symmetry (2)
    'bilateral_diff_mean', 'bilateral_diff_max',
    # Dynamics (3)
    'angular_velocity_mean', 'angular_velocity_max', 'angular_accel_mean',
    # Quality scores (4)
    'smoothness', 'shoulder_stability', 'cadence_regularity', 'bilateral_score',
    # Visibility (2)
    'visibility_mean', 'visibility_min',
    # Rep timing (4)
    'rep_duration_mean', 'rep_duration_std', 'rep_duration_min', 'rep_duration_max',
]


def _extract_feature_vector(pattern: dict) -> np.ndarray:
    """Extract a fixed-length feature vector from a pattern document."""
    pat = pattern.get("pattern", pattern)  # handle both raw and nested
    primary = pat.get("angle_stats", {}).get("primary", {})
    secondary = pat.get("angle_stats", {}).get("secondary", {})
    body_line = pat.get("angle_stats", {}).get("body_line", {})
    hip_sag = pat.get("angle_stats", {}).get("hip_sag", {})
    bilateral = pat.get("bilateral_symmetry", {})
    ang_vel = pat.get("angular_velocity", {})
    ang_accel = pat.get("angular_acceleration", {})
    quality = pat.get("quality_scores", {})
    vis = pat.get("visibility", {})
    rep_dur = pat.get("rep_duration_stats", {})

    features = [
        primary.get("min", 0), primary.get("max", 0), primary.get("mean", 0),
        primary.get("std", 0), primary.get("range", 0), primary.get("median", 0), primary.get("iqr", 0),
        secondary.get("mean", 0), secondary.get("std", 0),
        body_line.get("mean", 0), body_line.get("std", 0),
        hip_sag.get("mean", 0), hip_sag.get("std", 0),
        bilateral.get("mean_diff", 0), bilateral.get("max_diff", 0),
        ang_vel.get("mean", 0), ang_vel.get("max", 0), ang_accel.get("mean", 0),
        quality.get("smoothness", 0), quality.get("shoulder_stability", 0),
        quality.get("cadence_regularity", 0), quality.get("bilateral_score", 0),
        vis.get("mean", 0), vis.get("min", 0),
        rep_dur.get("mean", 0), rep_dur.get("std", 0),
        rep_dur.get("min", 0), rep_dur.get("max", 0),
    ]

    return np.array(features, dtype=float)


def train_form_classifier(db, test_type: str = None) -> dict:
    """
    Train a Random Forest classifier to distinguish correct vs foul form.
    
    If test_type is provided, trains a model for that specific exercise.
    Otherwise trains on all exercises (with test_type as a feature).
    
    Returns training result dict.
    """
    os.makedirs(MODEL_DIR, exist_ok=True)

    # Fetch training samples
    query = {"label": {"$in": ["correct", "foul"]}}
    if test_type:
        query["test_type"] = {"$regex": test_type, "$options": "i"}

    samples = list(db.exercise_patterns.find(query))

    correct_count = sum(1 for s in samples if s["label"] == "correct")
    foul_count = sum(1 for s in samples if s["label"] == "foul")

    result = {
        "total_samples": len(samples),
        "correct_samples": correct_count,
        "foul_samples": foul_count,
        "model_trained": False,
        "test_type": test_type or "all",
    }

    if correct_count < MIN_SAMPLES_PER_CLASS or foul_count < MIN_SAMPLES_PER_CLASS:
        result["message"] = f"Need at least {MIN_SAMPLES_PER_CLASS} correct AND {MIN_SAMPLES_PER_CLASS} foul samples. Currently: {correct_count} correct, {foul_count} foul."
        return result

    # Build feature matrix
    X = []
    y = []
    for s in samples:
        features = _extract_feature_vector(s)
        X.append(features)
        y.append(1 if s["label"] == "correct" else 0)

    X = np.array(X)
    y = np.array(y)

    # Handle any NaN/inf
    X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)

    try:
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.preprocessing import StandardScaler
        from sklearn.model_selection import cross_val_score

        # Standardize features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        # Train Random Forest
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=6,
            min_samples_leaf=1,
            random_state=42,
            class_weight='balanced',
        )

        # Cross-validate if enough samples
        accuracy = 0
        if len(samples) >= 6:
            cv_folds = min(5, min(correct_count, foul_count))
            if cv_folds >= 2:
                scores = cross_val_score(model, X_scaled, y, cv=cv_folds, scoring='accuracy')
                accuracy = float(scores.mean())
                result["cv_accuracy"] = round(accuracy, 4)

        # Train on full data
        model.fit(X_scaled, y)

        # Feature importances
        importances = dict(zip(FEATURE_NAMES, model.feature_importances_.tolist()))
        top_features = sorted(importances.items(), key=lambda x: x[1], reverse=True)[:10]

        # Save model + scaler
        model_key = (test_type or "all").lower().replace(" ", "_").replace("-", "_")
        model_path = os.path.join(MODEL_DIR, f"form_{model_key}.pkl")

        with open(model_path, 'wb') as f:
            pickle.dump({
                'model': model,
                'scaler': scaler,
                'test_type': test_type or "all",
                'trained_at': datetime.utcnow().isoformat(),
                'num_samples': len(samples),
                'accuracy': accuracy,
                'feature_names': FEATURE_NAMES,
                'top_features': top_features,
            }, f)

        result["model_trained"] = True
        result["accuracy"] = round(accuracy, 4)
        result["model_path"] = model_path
        result["top_features"] = [{"name": n, "importance": round(v, 4)} for n, v in top_features]
        result["message"] = f"Model trained successfully with {len(samples)} samples."

        print(f"Form classifier trained: {test_type or 'all'} | Accuracy: {accuracy:.1%} | Samples: {len(samples)}")
        for name, imp in top_features[:5]:
            print(f"   {name}: {imp:.3f}")

    except ImportError:
        result["message"] = "scikit-learn not installed. Run: pip install scikit-learn"
    except Exception as e:
        result["message"] = f"Training failed: {str(e)}"
        print(f"Form classifier training error: {e}")

    return result


def train_rep_calibrator(db, test_type: str = None) -> dict:
    """
    Train a model to correct AI rep counting bias.
    
    Uses samples where expected_reps was provided to learn the 
    mapping: AI_reps -> actual_reps.
    """
    os.makedirs(MODEL_DIR, exist_ok=True)

    query = {"expected_reps": {"$ne": None, "$exists": True}}
    if test_type:
        query["test_type"] = {"$regex": test_type, "$options": "i"}

    samples = list(db.exercise_patterns.find(query))
    # Filter out null expected_reps
    samples = [s for s in samples if s.get("expected_reps") is not None]

    result = {
        "total_samples": len(samples),
        "model_trained": False,
        "test_type": test_type or "all",
    }

    if len(samples) < 3:
        result["message"] = f"Need at least 3 samples with expected_reps to calibrate. Currently: {len(samples)}."
        return result

    try:
        from sklearn.linear_model import LinearRegression

        X = np.array([[s.get("ai_rep_count", 0)] for s in samples])
        y = np.array([s["expected_reps"] for s in samples])

        model = LinearRegression()
        model.fit(X, y)

        # Calculate bias
        predictions = model.predict(X)
        mean_error = float(np.mean(np.abs(predictions - y)))

        model_key = (test_type or "all").lower().replace(" ", "_").replace("-", "_")
        model_path = os.path.join(MODEL_DIR, f"rep_cal_{model_key}.pkl")

        with open(model_path, 'wb') as f:
            pickle.dump({
                'model': model,
                'test_type': test_type or "all",
                'trained_at': datetime.utcnow().isoformat(),
                'num_samples': len(samples),
                'mean_error': mean_error,
                'coef': float(model.coef_[0]),
                'intercept': float(model.intercept_),
            }, f)

        result["model_trained"] = True
        result["mean_error"] = round(mean_error, 2)
        result["correction_formula"] = f"corrected = {model.coef_[0]:.3f} * ai_reps + {model.intercept_:.3f}"
        result["message"] = f"Rep calibrator trained. Mean error: {mean_error:.2f} reps."

        print(f"Rep calibrator: corrected = {model.coef_[0]:.3f} * ai_reps + {model.intercept_:.3f} (error: {mean_error:.2f})")

    except ImportError:
        result["message"] = "scikit-learn not installed."
    except Exception as e:
        result["message"] = f"Training failed: {str(e)}"

    return result


def predict_form(pattern_or_features: dict, test_type: str) -> dict:
    """
    Predict whether a submission has correct or foul form.
    
    Returns:
        {
            'prediction': 'correct' or 'foul',
            'confidence': float (0-1),
            'model_available': bool,
            'form_probability': float (probability of correct form),
        }
    """
    model_key = test_type.lower().replace(" ", "_").replace("-", "_")
    model_path = os.path.join(MODEL_DIR, f"form_{model_key}.pkl")

    # Try exercise-specific model first, fall back to general
    if not os.path.exists(model_path):
        model_path = os.path.join(MODEL_DIR, "form_all.pkl")

    if not os.path.exists(model_path):
        return {
            'prediction': 'unknown',
            'confidence': 0,
            'model_available': False,
            'form_probability': 0.5,
        }

    try:
        with open(model_path, 'rb') as f:
            data = pickle.load(f)

        model = data['model']
        scaler = data['scaler']
        features = _extract_feature_vector(pattern_or_features).reshape(1, -1)
        features = np.nan_to_num(features, nan=0.0, posinf=0.0, neginf=0.0)
        features_scaled = scaler.transform(features)

        prediction = model.predict(features_scaled)[0]
        probabilities = model.predict_proba(features_scaled)[0]

        correct_prob = float(probabilities[1]) if len(probabilities) > 1 else float(probabilities[0])
        confidence = float(max(probabilities))

        return {
            'prediction': 'correct' if prediction == 1 else 'foul',
            'confidence': round(confidence, 3),
            'model_available': True,
            'form_probability': round(correct_prob, 3),
        }

    except Exception as e:
        print(f"Form prediction error: {e}")
        return {
            'prediction': 'unknown',
            'confidence': 0,
            'model_available': False,
            'form_probability': 0.5,
        }


def calibrate_reps(ai_reps: int, test_type: str) -> int:
    """Apply rep calibration model to correct AI count."""
    model_key = test_type.lower().replace(" ", "_").replace("-", "_")
    model_path = os.path.join(MODEL_DIR, f"rep_cal_{model_key}.pkl")

    if not os.path.exists(model_path):
        model_path = os.path.join(MODEL_DIR, "rep_cal_all.pkl")

    if not os.path.exists(model_path):
        return ai_reps

    try:
        with open(model_path, 'rb') as f:
            data = pickle.load(f)

        model = data['model']
        corrected = model.predict([[ai_reps]])[0]
        return max(0, round(corrected))

    except Exception:
        return ai_reps


def get_classifier_stats(db) -> dict:
    """Get stats about all trained classifiers."""
    os.makedirs(MODEL_DIR, exist_ok=True)

    models = {}
    for f in os.listdir(MODEL_DIR):
        if f.endswith('.pkl'):
            try:
                with open(os.path.join(MODEL_DIR, f), 'rb') as fp:
                    data = pickle.load(fp)
                models[f] = {
                    'test_type': data.get('test_type', 'unknown'),
                    'trained_at': data.get('trained_at', ''),
                    'num_samples': data.get('num_samples', 0),
                    'accuracy': data.get('accuracy', 0),
                    'top_features': data.get('top_features', [])[:5],
                }
            except Exception:
                pass

    # Training data stats
    total = db.exercise_patterns.count_documents({})
    correct = db.exercise_patterns.count_documents({"label": "correct"})
    foul = db.exercise_patterns.count_documents({"label": "foul"})
    with_reps = db.exercise_patterns.count_documents({"expected_reps": {"$ne": None, "$exists": True}})

    # Compute actual avg rep correction from real data
    avg_rep_correction = 0.0
    rep_samples = list(db.exercise_patterns.find(
        {"expected_reps": {"$ne": None, "$exists": True}, "ai_rep_count": {"$exists": True}},
        {"expected_reps": 1, "ai_rep_count": 1}
    ))
    if rep_samples:
        diffs = [abs(s.get("expected_reps", 0) - s.get("ai_rep_count", 0)) for s in rep_samples]
        avg_rep_correction = round(sum(diffs) / len(diffs), 1)

    # Per-test breakdown
    per_test = {}
    for test_type_doc in db.exercise_patterns.distinct("test_type"):
        t_correct = db.exercise_patterns.count_documents({"test_type": test_type_doc, "label": "correct"})
        t_foul = db.exercise_patterns.count_documents({"test_type": test_type_doc, "label": "foul"})
        t_reps = db.exercise_patterns.count_documents({"test_type": test_type_doc, "expected_reps": {"$ne": None, "$exists": True}})
        # Per-test avg correction
        t_rep_samples = list(db.exercise_patterns.find(
            {"test_type": test_type_doc, "expected_reps": {"$ne": None, "$exists": True}, "ai_rep_count": {"$exists": True}},
            {"expected_reps": 1, "ai_rep_count": 1}
        ))
        t_avg_corr = 0.0
        if t_rep_samples:
            t_diffs = [abs(s.get("expected_reps", 0) - s.get("ai_rep_count", 0)) for s in t_rep_samples]
            t_avg_corr = round(sum(t_diffs) / len(t_diffs), 1)
        per_test[test_type_doc] = {
            "correct": t_correct,
            "foul": t_foul,
            "total": t_correct + t_foul,
            "with_reps": t_reps,
            "avg_rep_correction": t_avg_corr,
        }

    return {
        'total_training_samples': total,
        'correct_samples': correct,
        'foul_samples': foul,
        'samples_with_expected_reps': with_reps,
        'avg_rep_correction': avg_rep_correction,
        'min_samples_per_class': MIN_SAMPLES_PER_CLASS,
        'trained_models': models,
        'per_test': per_test,
        'can_train_form': correct >= MIN_SAMPLES_PER_CLASS and foul >= MIN_SAMPLES_PER_CLASS,
        'can_train_reps': with_reps >= 3,
    }
