import os
import io
import sys
import traceback
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

# Add current dir to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from config import Config
except ImportError:
    class Config:
        GOOGLE_DRIVE_FOLDER_ID = os.environ.get("GOOGLE_DRIVE_FOLDER_ID")
        GOOGLE_DRIVE_CREDENTIALS_PATH = os.environ.get("GOOGLE_DRIVE_CREDENTIALS_PATH", "service_account.json")

def diagnose():
    results = []
    def log(msg):
        print(msg)
        results.append(msg)

    log("🔍 Starting Drive Diagnostics...")

    # 1. Check Credentials File
    creds_path = Config.GOOGLE_DRIVE_CREDENTIALS_PATH
    if not os.path.exists(creds_path):
        log(f"❌ Credentials file not found: {creds_path}")
        return results

    try:
        creds = service_account.Credentials.from_service_account_file(
            creds_path, 
            scopes=['https://www.googleapis.com/auth/drive']
        )
        service = build('drive', 'v3', credentials=creds)
        log(f"✅ Service account authenticated: {creds.service_account_email}")
    except Exception as e:
        log(f"❌ Authentication failed: {e}")
        return results

    # 2. Check Folder Access
    folder_id = Config.GOOGLE_DRIVE_FOLDER_ID
    if not folder_id:
        log("❌ GOOGLE_DRIVE_FOLDER_ID is missing from config/env")
        return results

    try:
        folder = service.files().get(fileId=folder_id).execute()
        log(f"✅ Successfully matched folder: {folder.get('name')} (ID: {folder_id})")
    except Exception as e:
        log(f"❌ Folder access failed: {e}")
        log("   IMPORTANT: Go to Google Drive, right-click the folder, Share, and add the Service Account email as an Editor.")
        return results

    # 3. Test File Upload
    try:
        test_content = b"AI Sports Platform Connection Test"
        media = MediaIoBaseUpload(io.BytesIO(test_content), mimetype='text/plain', resumable=True)
        file_metadata = {'name': 'diag_test.txt', 'parents': [folder_id]}
        
        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id'
        ).execute()
        
        file_id = file.get('id')
        log(f"✅ Test file uploaded: {file_id}")
        
        # 4. Set Permissions
        try:
            service.permissions().create(
                fileId=file_id,
                body={'role': 'reader', 'type': 'anyone', 'allowFileDiscovery': False}
            ).execute()
            log("✅ Permissions update test successful")
        except Exception as pe:
            log(f"⚠️  Permissions update failed (Check if Admin has allowed role setting): {pe}")

        # 5. Cleanup
        service.files().delete(fileId=file_id).execute()
        log("✅ Cleanup test passed")

        log("\n🎉 ALL TESTS PASSED: You are ready to upload videos!")

    except Exception as e:
        log(f"❌ Upload/Write test failed: {e}")
        traceback.print_exc()

    return results

if __name__ == "__main__":
    output = diagnose()
    with open("diag_results.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(output))
    print(f"\nResults saved to {os.path.abspath('diag_results.txt')}")
