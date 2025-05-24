#!/usr/bin/env python3
"""
Reset Google authentication by removing token.pickle
and re-authenticating with all necessary scopes
"""

import os
from google_auth_helper import get_credentials

def main():
    # Remove existing token
    if os.path.exists('token.pickle'):
        os.remove('token.pickle')
        print("Removed existing token.pickle")
    
    # Re-authenticate with all scopes
    print("Re-authenticating with all necessary scopes...")
    print("This will open a browser window for authentication.")
    
    creds = get_credentials()
    
    print("\nAuthentication successful!")
    print("You can now use both apps_script_sync.py and sheets_download.py")

if __name__ == '__main__':
    main()