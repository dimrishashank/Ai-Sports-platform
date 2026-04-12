"""
Migration: Replace 'Vertical Jump' with 'Pull-ups' in the database.
Run with: python migrate_vertical_to_pullups.py
"""
from db import get_db

def migrate():
    db = get_db()
    if db is None:
        print("❌ Could not connect to database.")
        return

    # 1. Remove old Vertical Jump test type
    result = db.test_types.delete_one({"name": "Vertical Jump"})
    if result.deleted_count:
        print("✅ Deleted 'Vertical Jump' test type")
    else:
        print("ℹ️  'Vertical Jump' not found in test_types")

    # 2. Create Pull-ups test type if not already present
    if not db.test_types.find_one({"name": "Pull-ups"}):
        db.test_types.insert_one({
            "name": "Pull-ups",
            "description": "Upper body & back strength — AI counts your reps",
            "duration": "60s",
            "unit": "reps",
            "icon": "🏋️",
            "status": "active",
            "pose_config": {
                "key_joints": ["LEFT_SHOULDER", "LEFT_ELBOW", "LEFT_WRIST"],
                "up_angle_threshold": 150,
                "down_angle_threshold": 80,
            },
        })
        print("✅ Created 'Pull-ups' test type")
    else:
        print("ℹ️  'Pull-ups' already exists in test_types")

    # 3. Rename vertical_jump → pull_ups in benchmarks
    updated = 0
    for doc in db.benchmarks.find({"vertical_jump": {"$exists": True}}):
        db.benchmarks.update_one(
            {"_id": doc["_id"]},
            {"$rename": {"vertical_jump": "pull_ups"}}
        )
        updated += 1
    print(f"✅ Updated {updated} benchmark document(s): vertical_jump → pull_ups")

    print("\n🎉 Migration complete!")

if __name__ == "__main__":
    migrate()
