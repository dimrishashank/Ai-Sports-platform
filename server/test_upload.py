"""Quick test: upload a small dummy file to Google Drive to verify everything works."""
import io
from storage import get_drive_service, init_storage, upload_video
from config import Config

print("\n🧪 Testing Google Drive Upload")
print("=" * 40)

# Step 1: Init storage (verifies/creates folder)
init_storage()

print(f"\n📁 Using folder ID: {Config.GOOGLE_DRIVE_FOLDER_ID}")

# Step 2: Try uploading a tiny test file
print("\n📤 Uploading test file...")
test_data = io.BytesIO(b"Hello, this is a test file from AI Sports Platform!")
file_id = upload_video(test_data, "test_upload_delete_me.txt", "text/plain")

if file_id:
    print(f"\n✅ SUCCESS! File uploaded with ID: {file_id}")
    print(f"   View it: https://drive.google.com/file/d/{file_id}/view")
    
    # Clean up - delete the test file
    service = get_drive_service()
    service.files().delete(fileId=file_id).execute()
    print("   🗑️ Test file deleted (cleanup)")
else:
    print("\n❌ FAILED! Upload returned empty. Check errors above.")
