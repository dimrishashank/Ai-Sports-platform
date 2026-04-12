import os
from minio import Minio
from dotenv import load_dotenv

# Load .env from the server directory
load_dotenv(dotenv_path='server/.env')

def test_minio():
    endpoint = os.getenv("MINIO_ENDPOINT")
    access_key = os.getenv("MINIO_ACCESS_KEY")
    secret_key = os.getenv("MINIO_SECRET_KEY")
    secure = os.getenv("MINIO_SECURE", "false").lower() == "true"
    bucket = os.getenv("MINIO_BUCKET")

    print(f"Connecting to {endpoint} (secure={secure})...")
    
    try:
        client = Minio(
            endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=secure
        )
        
        # Check if bucket exists
        if not client.bucket_exists(bucket):
            print(f"Bucket {bucket} does NOT exist. Creating it...")
            client.make_bucket(bucket)
            print("Bucket created successfully!")
        else:
            print(f"Bucket {bucket} exists and is accessible!")
            
        print("✅ MinIO connection test PASSED")
    except Exception as e:
        print(f"❌ MinIO connection test FAILED: {e}")

if __name__ == "__main__":
    test_minio()
