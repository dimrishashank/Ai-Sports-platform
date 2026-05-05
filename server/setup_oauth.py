"""
One-time OAuth2 setup script for Google Drive access.

Run this once to authorize the app to use your Google Drive:
    python setup_oauth.py

It will open a browser window where you sign in with your Google account.
After authorization, it saves a 'token.json' file that the server uses automatically.
"""
import os
import json
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

# Only request access to files created by this app + general Drive access for the folder
SCOPES = ['https://www.googleapis.com/auth/drive']

TOKEN_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'token.json')
CREDENTIALS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'oauth_credentials.json')


def main():
    print("\n🔐 Google Drive OAuth2 Setup")
    print("=" * 40)

    # Check if token already exists
    if os.path.exists(TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
        if creds and creds.valid:
            print("✅ Token already exists and is valid!")
            print("   You're all set. The server will use this token automatically.")
            return
        elif creds and creds.expired and creds.refresh_token:
            print("🔄 Token expired, refreshing...")
            try:
                creds.refresh(Request())
                with open(TOKEN_PATH, 'w') as f:
                    f.write(creds.to_json())
                print("✅ Token refreshed successfully!")
                return
            except Exception as e:
                print(f"⚠️  Refresh failed: {e}")
                print("   Deleting stale token and starting fresh login...\n")
                os.remove(TOKEN_PATH)

    # Check for OAuth credentials file
    if not os.path.exists(CREDENTIALS_PATH):
        print(f"\n❌ Missing: {CREDENTIALS_PATH}")
        print("\nTo create this file:")
        print("  1. Go to https://console.cloud.google.com/apis/credentials")
        print("  2. Select your project (ai-sports-storage)")
        print("  3. Click '+ CREATE CREDENTIALS' → 'OAuth client ID'")
        print("  4. Application type: 'Desktop app'")
        print("  5. Name it anything (e.g. 'AI Sports Platform')")
        print("  6. Click 'Create', then 'Download JSON'")
        print(f"  7. Rename the downloaded file to 'oauth_credentials.json'")
        print(f"     and place it in: {os.path.dirname(CREDENTIALS_PATH)}")
        print("\nThen run this script again.")
        return

    # Run the OAuth flow
    print("\n📋 Opening browser for Google sign-in...")
    print("   Sign in with the Google account that owns the Drive folder.\n")

    flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, SCOPES)
    creds = flow.run_local_server(port=8090, prompt='consent')

    # Save the token
    with open(TOKEN_PATH, 'w') as f:
        f.write(creds.to_json())

    print(f"\n✅ Authorization successful!")
    print(f"   Token saved to: {TOKEN_PATH}")
    print(f"   The server will now upload videos as YOUR Google account.")
    print(f"\n⚠️  Keep 'token.json' private — don't share it or push to GitHub!")


if __name__ == '__main__':
    main()
