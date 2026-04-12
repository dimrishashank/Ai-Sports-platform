"""
MongoDB connection manager.
Uses pymongo with a singleton pattern for the database connection.
"""
import certifi
from pymongo import MongoClient, ASCENDING, DESCENDING
from config import Config

_client = None
_db = None


def get_db():
    """Get the MongoDB database instance (singleton)."""
    global _client, _db
    if _db is None:
        try:
            print(f"Connecting to MongoDB...")
            _client = MongoClient(
                Config.MONGO_URI,
                tlsCAFile=certifi.where(),
                tlsAllowInvalidCertificates=True,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=10000,
            )
            # Access a dummy thing to trigger a connection test
            _client.admin.command('ping')
            _db = _client.get_default_database()
            print("✅ MongoDB connection successful")
        except Exception as e:
            print("\n❌ MongoDB CONNECTION FAILED")
            print(f"   Error: {e}")
            print("\n💡 Tip: If you are using a mobile hotspot, try a home WiFi.")
            print("   Also, ensure your current IP is in the Atlas 'Network Access' tab.\n")
            # Fallback for better error visibility in Flask
            if _db is None: _db = _client.get_default_database() if _client else None
            
    return _db


def init_db():
    """Initialize database indexes."""
    db = get_db()

    # Users indexes
    db.users.create_index([("email", ASCENDING)], unique=True)

    # Test results indexes
    db.test_results.create_index([("user_id", ASCENDING)])
    db.test_results.create_index([("date", DESCENDING)])

    # Submissions indexes
    db.submissions.create_index([("user_id", ASCENDING)])
    db.submissions.create_index([("status", ASCENDING)])
    db.submissions.create_index([("date", DESCENDING)])

    # Leaderboard-style compound index
    db.test_results.create_index([
        ("test_type", ASCENDING),
        ("percentile", DESCENDING),
    ])

    print("✅ MongoDB indexes created")


def close_db():
    """Close the MongoDB connection."""
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
