"""
Google Drive storage wrapper for video uploads.
Uses OAuth2 user credentials so uploads count against YOUR Drive quota.
"""
import os
import io
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from config import Config

_service = None

TOKEN_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'token.json')

SCOPES = ['https://www.googleapis.com/auth/drive']


def get_drive_service():
    """Get the Google Drive API service using OAuth2 user credentials (singleton)."""
    global _service
    if _service is None:
        try:
            if not os.path.exists(TOKEN_PATH):
                print("❌ token.json not found. Run 'python setup_oauth.py' first!")
                return None

            creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)

            # Auto-refresh expired tokens
            if creds and creds.expired and creds.refresh_token:
                print("🔄 Refreshing expired OAuth2 token...")
                creds.refresh(Request())
                # Save the refreshed token
                with open(TOKEN_PATH, 'w') as f:
                    f.write(creds.to_json())
                print("✅ Token refreshed and saved")

            if not creds or not creds.valid:
                print("❌ OAuth2 token is invalid. Run 'python setup_oauth.py' again!")
                return None

            _service = build('drive', 'v3', credentials=creds)
            print("✅ Google Drive API service initialized (OAuth2 — your account)")
        except Exception as e:
            print(f"❌ Google Drive initialization failed: {e}")
    return _service


def _create_upload_folder(service):
    """Create 'Athlete Videos' folder in Drive and return its ID."""
    folder_metadata = {
        'name': 'Athlete Videos',
        'mimeType': 'application/vnd.google-apps.folder'
    }
    folder = service.files().create(
        body=folder_metadata,
        fields='id, name'
    ).execute()
    folder_id = folder.get('id')
    print(f"📁 Created new folder: {folder.get('name')} (ID: {folder_id})")

    # Update .env with the new folder ID
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            lines = f.readlines()
        with open(env_path, 'w') as f:
            found = False
            for line in lines:
                if line.startswith('GOOGLE_DRIVE_FOLDER_ID='):
                    f.write(f'GOOGLE_DRIVE_FOLDER_ID={folder_id}\n')
                    found = True
                else:
                    f.write(line)
            if not found:
                f.write(f'GOOGLE_DRIVE_FOLDER_ID={folder_id}\n')
        # Update the runtime config too
        Config.GOOGLE_DRIVE_FOLDER_ID = folder_id
        print(f"✅ Updated .env with new folder ID")

    return folder_id


def init_storage():
    """Verify Google Drive access on startup. Creates upload folder if needed."""
    service = get_drive_service()
    if not service:
        print("⚠️  Storage service not available. Run 'python setup_oauth.py' to set up.")
        return

    folder_id = Config.GOOGLE_DRIVE_FOLDER_ID

    # Try to access the configured folder
    if folder_id:
        try:
            folder = service.files().get(fileId=folder_id).execute()
            print(f"✅ Google Drive folder verified: {folder.get('name')}")
            return
        except Exception:
            print("⚠️  Configured folder not accessible, creating a new one...")

    # Create a new folder for uploads
    try:
        new_id = _create_upload_folder(service)
        print(f"✅ Google Drive ready — uploads go to folder ID: {new_id}")
    except Exception as e:
        print(f"❌ Could not create upload folder: {e}")


def upload_video(file_data, object_name: str, content_type: str = "video/webm") -> str:
    """
    Upload a video file to Google Drive.
    Returns the Google Drive File ID.
    """
    service = get_drive_service()
    if not service:
        return ""

    folder_id = Config.GOOGLE_DRIVE_FOLDER_ID
    
    # Ensure stream is at the beginning
    if hasattr(file_data, 'seek'):
        try:
            file_data.seek(0)
        except Exception as e:
            print(f"⚠️  Could not seek stream: {e}")

    file_metadata = {
        'name': object_name.split('/')[-1],  # Just the filename
        'parents': [folder_id]
    }
    
    # If file_data is already a stream, we use it directly
    # Flask search file.stream is a SpooledTemporaryFile
    media = MediaIoBaseUpload(file_data, mimetype=content_type, resumable=True)
    
    try:
        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id'
        ).execute()
        
        file_id = file.get('id')
        
        # IMPORTANT: Make the file readable by anyone with the link so it can be played in <video> tag
        service.permissions().create(
            fileId=file_id,
            body={'role': 'reader', 'type': 'anyone', 'allowFileDiscovery': False}
        ).execute()
        
        print(f"✅ Video uploaded to Google Drive. ID: {file_id}")
        return file_id
    except Exception as e:
        print(f"❌ Google Drive upload failed: {e}")
        return ""


def get_video_url(file_id: str, expires: int = 3600) -> str:
    """
    Return a server-side proxy URL that streams the video.
    This avoids Google Drive download prompts and CORS issues.
    """
    if not file_id:
        return ""
    
    # Point to our own streaming proxy endpoint
    return f"/api/videos/stream/{file_id}"


def stream_video(file_id: str):
    """
    Download video bytes from Google Drive and return them for streaming.
    Returns (bytes_io, mimetype) or (None, None) on failure.
    """
    import io
    service = get_drive_service()
    if not service or not file_id:
        return None, None

    try:
        # Get file metadata for mime type
        meta = service.files().get(fileId=file_id, fields='mimeType,size').execute()
        mime_type = meta.get('mimeType', 'video/mp4')

        # Download file content
        from googleapiclient.http import MediaIoBaseDownload
        request = service.files().get_media(fileId=file_id)
        buffer = io.BytesIO()
        downloader = MediaIoBaseDownload(buffer, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()
        buffer.seek(0)
        return buffer, mime_type
    except Exception as e:
        print(f"❌ Video stream failed: {e}")
        return None, None


def find_file_by_name(name_query: str):
    """
    Search for a file in the Drive folder by name (prefix match).
    Returns the file ID if found, or None.
    """
    service = get_drive_service()
    if not service:
        return None

    folder_id = Config.GOOGLE_DRIVE_FOLDER_ID
    try:
        q = f"name contains '{name_query}'"
        if folder_id:
            q += f" and '{folder_id}' in parents"
        q += " and trashed = false"

        results = service.files().list(
            q=q,
            spaces='drive',
            fields='files(id, name, mimeType)',
            pageSize=5,
            orderBy='name'
        ).execute()

        files = results.get('files', [])
        if files:
            print(f"✅ Found demo video: {files[0]['name']} (ID: {files[0]['id']})")
            return files[0]
        return None
    except Exception as e:
        print(f"❌ Drive file search failed: {e}")
        return None


def delete_video(file_id: str):
    """Delete a video from Google Drive."""
    service = get_drive_service()
    if not service or not file_id:
        return

    try:
        service.files().delete(fileId=file_id).execute()
        print(f"✅ Video deleted from Google Drive. ID: {file_id}")
    except Exception as e:
        print(f"❌ Google Drive delete failed: {e}")
