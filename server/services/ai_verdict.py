"""
AI Verdict Learner — Learns from admin approve/flag decisions.

How it works:
  1. When a video is analyzed, we extract features (form_score, confidence,
     rep_count, flags, visibility etc.)
  2. When admin approves/flags a submission, we save those features + the
     admin's label into a 'training_data' collection in MongoDB.
  3. After enough labeled examples (MIN_SAMPLES), we train a simple
     scikit-learn model that predicts approve/flag.
  4. New uploads get an AI prediction. If the model is confident enough,
     submissions are auto-approved; otherwise flagged for admin review.

The model improves over time as admins review more submissions.
"""
import os
import pickle
import numpy as np
from datetime import datetime
from db import get_db

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'verdict_model.pkl')
MIN_SAMPLES = 10  # Minimum labeled samples before we train
AUTO_APPROVE_THRESHOLD = 0.80  # Model must be ≥80% confident to auto-approve


def extract_features(ai_result: dict, test_type: str, score: float) -> list:
    """
    Extract a fixed-size feature vector from AI analysis results.
    
    Features:
      [0] confidence           - pose detection confidence (0-1)
      [1] verified_reps        - number of AI-counted reps
      [2] form_score           - average landmark visibility (0-1)
      [3] num_flags            - number of quality flags
      [4] has_poor_visibility  - 1 if poor_pose_visibility flag
      [5] has_few_frames       - 1 if too_few_frames_detected flag
      [6] has_short_video      - 1 if video_too_short flag
      [7] score                - athlete's claimed or AI-detected score
      [8] test_type_pushups    - 1 if pushups
      [9] test_type_situps     - 1 if sit-ups
      [10] test_type_pullups - 1 if pull-ups
      [11] score_vs_reps_diff  - difference between score and verified_reps
    """
    flags = ai_result.get('flags', [])
    confidence = ai_result.get('confidence', 0)
    verified_reps = ai_result.get('verified_reps', 0)
    
    # Compute form score from confidence (since we don't store raw form separately)
    form_score = confidence
    
    test_lower = test_type.lower()
    
    features = [
        confidence,
        verified_reps,
        form_score,
        len(flags),
        1 if 'poor_pose_visibility' in flags else 0,
        1 if 'too_few_frames_detected' in flags else 0,
        1 if 'video_too_short' in flags else 0,
        score,
        1 if 'push' in test_lower else 0,
        1 if 'sit' in test_lower else 0,
        1 if 'pull' in test_lower else 0,
        abs(score - verified_reps) if verified_reps > 0 else 0,
    ]
    
    return features


def save_training_sample(submission_id: str, ai_result: dict, test_type: str,
                         score: float, admin_verdict: str):
    """
    Save a labeled training sample when admin approves/flags a submission.
    admin_verdict: 'approved' or 'flagged'
    """
    db = get_db()
    
    features = extract_features(ai_result, test_type, score)
    label = 1 if admin_verdict == 'approved' else 0
    
    db.ai_training_data.update_one(
        {'submission_id': submission_id},
        {'$set': {
            'submission_id': submission_id,
            'features': features,
            'label': label,
            'test_type': test_type,
            'admin_verdict': admin_verdict,
            'created_at': datetime.utcnow(),
        }},
        upsert=True
    )
    
    # Check if we should retrain
    count = db.ai_training_data.count_documents({})
    if count >= MIN_SAMPLES and count % 5 == 0:  # Retrain every 5 new samples
        print(f"🧠 Retraining AI model with {count} samples...")
        train_model()


def train_model():
    """
    Train the verdict prediction model using all labeled data.
    Uses a simple Random Forest for robustness with small datasets.
    """
    db = get_db()
    
    samples = list(db.ai_training_data.find({}, {'features': 1, 'label': 1}))
    
    if len(samples) < MIN_SAMPLES:
        print(f"⏳ Need at least {MIN_SAMPLES} samples to train. Currently: {len(samples)}")
        return False
    
    X = np.array([s['features'] for s in samples])
    y = np.array([s['label'] for s in samples])
    
    # Check if we have both classes
    if len(set(y)) < 2:
        print("⚠️  Need both approved and flagged samples to train.")
        return False
    
    try:
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.model_selection import cross_val_score
        
        model = RandomForestClassifier(
            n_estimators=50,
            max_depth=5,
            random_state=42,
            class_weight='balanced'  # Handle imbalanced approve/flag ratio
        )
        
        # Cross-validate if we have enough samples
        if len(samples) >= 20:
            scores = cross_val_score(model, X, y, cv=min(5, len(samples) // 4), scoring='accuracy')
            accuracy = scores.mean()
            print(f"📊 Cross-validation accuracy: {accuracy:.1%}")
        
        # Train on all data
        model.fit(X, y)
        
        # Save model
        with open(MODEL_PATH, 'wb') as f:
            pickle.dump({
                'model': model,
                'trained_at': datetime.utcnow().isoformat(),
                'num_samples': len(samples),
                'feature_names': [
                    'confidence', 'verified_reps', 'form_score', 'num_flags',
                    'has_poor_visibility', 'has_few_frames', 'has_short_video',
                    'score', 'is_pushups', 'is_situps', 'is_pullups', 'score_vs_reps_diff'
                ]
            }, f)
        
        print(f"✅ AI model trained and saved! ({len(samples)} samples)")
        return True
        
    except ImportError:
        print("⚠️  scikit-learn not installed. Run: pip install scikit-learn")
        return False


def predict_verdict(ai_result: dict, test_type: str, score: float) -> dict:
    """
    Predict whether a submission should be approved or flagged.
    
    Returns:
        {
            'prediction': 'approved' or 'flagged',
            'confidence': float (0-1),
            'auto_decision': bool (True if model is confident enough),
            'model_available': bool,
        }
    """
    # Check if model exists
    if not os.path.exists(MODEL_PATH):
        return {
            'prediction': 'flagged',
            'confidence': 0,
            'auto_decision': False,
            'model_available': False,
        }
    
    try:
        with open(MODEL_PATH, 'rb') as f:
            data = pickle.load(f)
        
        model = data['model']
        features = np.array([extract_features(ai_result, test_type, score)])
        
        # Get prediction and probability
        prediction = model.predict(features)[0]
        probabilities = model.predict_proba(features)[0]
        confidence = max(probabilities)
        
        verdict = 'approved' if prediction == 1 else 'flagged'
        auto_decide = confidence >= AUTO_APPROVE_THRESHOLD
        
        return {
            'prediction': verdict,
            'confidence': round(float(confidence), 3),
            'auto_decision': auto_decide,
            'model_available': True,
        }
        
    except Exception as e:
        print(f"⚠️  AI prediction failed: {e}")
        return {
            'prediction': 'flagged',
            'confidence': 0,
            'auto_decision': False,
            'model_available': False,
        }


def get_model_stats() -> dict:
    """Get current AI model statistics."""
    db = get_db()
    total = db.ai_training_data.count_documents({})
    approved = db.ai_training_data.count_documents({'label': 1})
    flagged = db.ai_training_data.count_documents({'label': 0})
    
    model_info = {'exists': False}
    if os.path.exists(MODEL_PATH):
        try:
            with open(MODEL_PATH, 'rb') as f:
                data = pickle.load(f)
            model_info = {
                'exists': True,
                'trained_at': data.get('trained_at'),
                'num_samples': data.get('num_samples'),
            }
        except Exception:
            pass
    
    return {
        'total_samples': total,
        'approved_samples': approved,
        'flagged_samples': flagged,
        'min_samples_needed': MIN_SAMPLES,
        'model': model_info,
        'auto_approve_threshold': AUTO_APPROVE_THRESHOLD,
    }
