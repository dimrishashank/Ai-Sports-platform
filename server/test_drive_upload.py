import os
import io
from storage import get_drive_service
from config import Config

def test_upload():
    print("Starting Drive Upload Test...")
    service = get_drive_service()
    if not service:
        print("❌ Could not initialize Drive service. Check credentials path.")
        return

    folder_id = Config.GOOGLE_DRIVE_FOLDER_ID
    print(f"Target Folder ID: {folder_id}")

    try:
        # 1. Verify folder access
        folder = service.files().get(fileId=folder_id).execute()
        print(f"✅ Folder found: {folder.get('name')}")
    except Exception as e:
        print(f"❌ Folder access failed: {e}")
        print("Check if the folder ID is correct and if the Service Account is shared with this folder.")
        return

    # 2. Try dummy upload
    try:
        file_metadata = {
            'name': 'connection_test.txt',
            'parents': [folder_id]
        }
        test_content = b"AI Sports Platform Connection Test"
        fh = io.BytesIO(test_content)
        from googleapiclient.http import MediaIoBaseUpload
        media = MediaIoBaseUpload(fh, mimetype='text/plain', resumable=True)
        
        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id'
        ).execute()
        
        file_id = file.get('id')
        print(f"✅ Dummy upload successful. File ID: {file_id}")
        
        # 3. Try permission set
        service.permissions().create(
            fileId=file_id,
            body={'role': 'reader', 'type': 'anyone', 'allowFileDiscovery': False}
        ).execute()
        print("✅ Permissions updated successfully.")
        
        # 4. Cleanup
        service.files().delete(fileId=file_id).execute()
        print("✅ Test file deleted.")
        
        print("\n🎉 ALL SYSTEMS GO - Drive integration is working correctly.")
        
    except Exception as e:
        print(f"❌ Upload failed: {e}")

if __name__ == "__main__":
    test_upload()
