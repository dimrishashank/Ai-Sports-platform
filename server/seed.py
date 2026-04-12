"""
Safe Initialization Script — ensures database has required config without deleting existing data.
Run with: python seed.py
"""
from datetime import datetime
import bcrypt
from db import get_db, init_db


def hash_pw(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def seed():
    db = get_db()
    if db is None:
        print("❌ Could not connect to database. Aborting.")
        return

    # Ensure indexes are created
    init_db()

    print("🛡️  Starting safe initialization...")

    # ── 1. Initialize Head Admin ────────────────────────
    head_email = "admin@sai.gov.in"
    if not db.users.find_one({"email": head_email}):
        head_admin = {
            "name": "Ms. Swati Rastogi",
            "email": head_email,
            "password_hash": hash_pw("admin123"),
            "role": "headadmin",
            "admin_id": "ADM-HEAD",
            "status": "active",
            "created_at": datetime.utcnow(),
        }
        db.users.insert_one(head_admin)
        print(f"✅ Created HeadAdmin: {head_email}")
    else:
        # Update existing admin to headadmin if not already
        existing = db.users.find_one({"email": head_email})
        if existing.get("role") != "headadmin":
            db.users.update_one(
                {"email": head_email},
                {"$set": {"role": "headadmin", "admin_id": "ADM-HEAD"}}
            )
            print(f"✅ Updated to HeadAdmin: {head_email}")
        else:
            print(f"ℹ️  HeadAdmin already exists: {head_email}")

    # ── 2. Initialize Sample Sub-Admin ──────────────────
    sub_admin_email = "subadmin@sai.gov.in"
    if not db.users.find_one({"email": sub_admin_email}):
        sub_admin = {
            "name": "Mr. Rajesh Verma",
            "email": sub_admin_email,
            "password_hash": hash_pw("subadmin123"),
            "role": "admin",
            "admin_id": "ADM-R4JV",
            "status": "active",
            "created_at": datetime.utcnow(),
        }
        db.users.insert_one(sub_admin)
        print(f"✅ Created Sub-Admin: {sub_admin_email} (ID: ADM-R4JV)")
    else:
        print(f"ℹ️  Sub-Admin already exists: {sub_admin_email}")

    # ── 3. Initialize Core Athletes (Rahul) ─────────────
    rahul_email = "rahul@example.com"
    if not db.users.find_one({"email": rahul_email}):
        rahul = {
            "name": "Rahul Kumar",
            "email": rahul_email,
            "password_hash": hash_pw("athlete123"),
            "age": 17,
            "gender": "Male",
            "location": "Tehri, Uttarakhand",
            "role": "athlete",
            "status": "active",
            "created_at": datetime.utcnow(),
        }
        db.users.insert_one(rahul)
        print(f"✅ Created Athlete: {rahul_email}")
    else:
        print(f"ℹ️  Athlete already exists: {rahul_email}")

    # ── 4. Initialize Test Types ────────────────────────
    # Only 3 active tests, 2 coming soon
    test_types = [
        {
            "name": "Pushups", "description": "Upper body strength — AI counts your reps",
            "duration": "60s", "unit": "reps", "icon": "💪",
            "status": "active",
            "pose_config": {
                "key_joints": ["LEFT_SHOULDER", "LEFT_ELBOW", "LEFT_WRIST"],
                "up_angle_threshold": 150, "down_angle_threshold": 100,
            },
        },
        {
            "name": "Sit-ups", "description": "Core strength — AI counts your reps",
            "duration": "60s", "unit": "reps", "icon": "🔥",
            "status": "active",
            "pose_config": {
                "key_joints": ["LEFT_HIP", "LEFT_SHOULDER", "LEFT_KNEE"],
                "up_angle_threshold": 120, "down_angle_threshold": 60,
            },
        },
        {
            "name": "Pull-ups", "description": "Upper body & back strength — AI counts your reps",
            "duration": "60s", "unit": "reps", "icon": "🏋️",
            "status": "active",
            "pose_config": {
                "key_joints": ["LEFT_SHOULDER", "LEFT_ELBOW", "LEFT_WRIST"],
                "up_angle_threshold": 150, "down_angle_threshold": 80,
            },
        },
        {
            "name": "Shuttle Run", "description": "Speed & agility test",
            "duration": "4×10m", "unit": "sec", "icon": "⚡",
            "status": "coming_soon",
            "pose_config": {},
        },
        {
            "name": "Endurance Run", "description": "Cardiovascular fitness test",
            "duration": "800m", "unit": "min", "icon": "🏃",
            "status": "coming_soon",
            "pose_config": {},
        },
    ]

    for tt in test_types:
        existing = db.test_types.find_one({"name": tt["name"]})
        if not existing:
            db.test_types.insert_one(tt)
            print(f"✅ Initialized Test Type: {tt['name']} ({tt['status']})")
        else:
            # Update status field if missing
            if "status" not in existing:
                db.test_types.update_one(
                    {"name": tt["name"]},
                    {"$set": {"status": tt["status"], "description": tt["description"]}}
                )
                print(f"✅ Updated Test Type status: {tt['name']} → {tt['status']}")

    # ── 5. Initialize SAI Benchmarks ────────────────────
    benchmarks = [
        {"label": "U-15 Male", "pushups": 25, "situps": 32, "pull_ups": 8},
        {"label": "U-15 Female", "pushups": 18, "situps": 28, "pull_ups": 4},
        {"label": "U-17 Male", "pushups": 35, "situps": 40, "pull_ups": 12},
        {"label": "U-17 Female", "pushups": 25, "situps": 35, "pull_ups": 6},
        {"label": "U-19 Male", "pushups": 40, "situps": 45, "pull_ups": 15},
        {"label": "U-19 Female", "pushups": 28, "situps": 38, "pull_ups": 8},
    ]

    for b in benchmarks:
        if not db.benchmarks.find_one({"label": b["label"]}):
            db.benchmarks.insert_one(b)
            print(f"✅ Initialized Benchmark: {b['label']}")

    print("\n✨ Safe Initialization Complete!")
    print("   Existing athletes, test results, and videos were NOT affected.\n")
    print("── Default Accounts ──")
    print("   HeadAdmin: admin@sai.gov.in / admin123")
    print("   Sub-Admin: subadmin@sai.gov.in / subadmin123")
    print("   Athlete:   rahul@example.com / athlete123\n")


if __name__ == "__main__":
    seed()
