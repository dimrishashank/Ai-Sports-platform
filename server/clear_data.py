from dotenv import load_dotenv
from db import get_db

def clear_db():
    load_dotenv()
    db = get_db()
    if db is None:
        print("❌ Could not connect to database. Aborting.")
        return
        
    print("🧹 Wiping all dynamic performance data and communication history...")
    
    # Clear all operational data
    db.test_results.delete_many({})
    db.submissions.delete_many({})
    db.leaderboard.delete_many({})
    db.notifications.delete_many({})
    db.support_messages.delete_many({})
    
    # Check for optional collections and wipe them too
    if "test_sessions" in db.list_collection_names():
        db.test_sessions.delete_many({})
    if "videos" in db.list_collection_names():
        db.videos.delete_many({})

    print("✅ Successfully flushed all chats, notifications, and tests.")
    print("🛡️  Your Registered User Accounts (HeadAdmin, SubAdmins, Athletes) have been kept 100% intact!")

if __name__ == "__main__":
    clear_db()
