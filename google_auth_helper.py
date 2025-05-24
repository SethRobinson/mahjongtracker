#!/usr/bin/env python3
"""
Unified Google Authentication Helper
Handles authentication with all necessary scopes for the project
"""

import os
import pickle
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request

# Combined scopes for all project needs
SCOPES = [
    'https://www.googleapis.com/auth/script.projects',           # For Apps Script sync
    'https://www.googleapis.com/auth/script.projects.readonly',  # For Apps Script read
    'https://www.googleapis.com/auth/spreadsheets.readonly',     # For Sheets download
    'https://www.googleapis.com/auth/drive.metadata.readonly'    # For Drive metadata
]

def get_credentials():
    """Get valid user credentials with all necessary scopes"""
    creds = None
    
    # The file token.pickle stores the user's access and refresh tokens
    if os.path.exists('token.pickle'):
        with open('token.pickle', 'rb') as token:
            creds = pickle.load(token)
    
    # If there are no (valid) credentials available, let the user log in
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except:
                # If refresh fails, re-authenticate
                creds = None
        
        if not creds:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        
        # Save the credentials for the next run
        with open('token.pickle', 'wb') as token:
            pickle.dump(creds, token)
    
    return creds

def check_scopes(creds):
    """Check if current credentials have all required scopes"""
    if hasattr(creds, 'scopes'):
        current_scopes = set(creds.scopes or [])
        required_scopes = set(SCOPES)
        missing_scopes = required_scopes - current_scopes
        
        if missing_scopes:
            print(f"Missing scopes: {missing_scopes}")
            return False
    return True

if __name__ == '__main__':
    print("Checking Google authentication...")
    creds = get_credentials()
    
    if check_scopes(creds):
        print("Authentication successful with all required scopes!")
    else:
        print("Authentication is missing some scopes. Delete token.pickle and run again.")