#!/usr/bin/env python3
"""
Google Apps Script Sync Tool
Syncs Apps Script files between Google and local filesystem
"""

import json
import os
import sys
from typing import Dict, List, Any
import requests
from googleapiclient.discovery import build
from google_auth_helper import get_credentials

# Load project ID from config file
try:
    with open('config.json', 'r', encoding='utf-8') as f:
        config = json.load(f)
        PROJECT_ID = config['apps_script_project_id']
except FileNotFoundError:
    print("Error: config.json not found. Please create a config.json file with your Apps Script project ID.")
    print("Example config.json:")
    print(json.dumps({"apps_script_project_id": "your-project-id-here"}, indent=2))
    sys.exit(1)
except KeyError:
    print("Error: 'apps_script_project_id' not found in config.json")
    sys.exit(1)


def download_project(creds, project_id: str) -> Dict[str, Any]:
    """Download Apps Script project files"""
    print(f"Downloading project {project_id}...")
    
    # Build the Apps Script service
    service = build('script', 'v1', credentials=creds)
    
    try:
        # Get the project content
        content = service.projects().getContent(scriptId=project_id).execute()
        return content
    except Exception as e:
        print(f"Error downloading project: {e}")
        sys.exit(1)


def save_files_locally(project_data: Dict[str, Any], output_dir: str = "apps_script_files"):
    """Save Apps Script files to local directory"""
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Save project metadata
    with open(os.path.join(output_dir, 'project_metadata.json'), 'w', encoding='utf-8') as f:
        # Handle both possible formats - with or without 'id' field
        files_metadata = []
        for file in project_data.get('files', []):
            file_meta = {'name': file['name'], 'type': file['type']}
            if 'id' in file:
                file_meta['id'] = file['id']
            files_metadata.append(file_meta)
        
        json.dump({
            'files': files_metadata
        }, f, indent=2)
    
    # Save each file
    for file_data in project_data.get('files', []):
        file_name = file_data['name']
        file_type = file_data['type']
        file_source = file_data['source']
        
        # Determine file extension
        if file_type.upper() == 'SERVER_JS':
            extension = '.gs'
        elif file_type.upper() == 'HTML':
            extension = '.html'
        elif file_type.upper() == 'JSON':
            extension = '.json'
        else:
            extension = ''
        
        # Save the file
        file_path = os.path.join(output_dir, f"{file_name}{extension}")
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(file_source)
        
        print(f"Saved: {file_path}")


def load_files_from_local(input_dir: str = "apps_script_files") -> Dict[str, Any]:
    """Load Apps Script files from local directory"""
    # Load project metadata
    with open(os.path.join(input_dir, 'project_metadata.json'), 'r', encoding='utf-8') as f:
        metadata = json.load(f)
    
    files = []
    
    for file_info in metadata['files']:
        file_name = file_info['name']
        file_type = file_info['type']
        
        # Determine file extension
        if file_type.upper() == 'SERVER_JS':
            extension = '.gs'
        elif file_type.upper() == 'HTML':
            extension = '.html'
        elif file_type.upper() == 'JSON':
            extension = '.json'
        else:
            extension = ''
        
        # Read the file
        file_path = os.path.join(input_dir, f"{file_name}{extension}")
        with open(file_path, 'r', encoding='utf-8') as f:
            source = f.read()
        
        file_data = {
            'name': file_name,
            'type': file_type,
            'source': source
        }
        
        # Include id only if it exists
        if 'id' in file_info:
            file_data['id'] = file_info['id']
        
        files.append(file_data)
    
    return {'files': files}


def upload_project(creds, project_id: str, project_data: Dict[str, Any]):
    """Upload Apps Script project files"""
    print(f"Uploading project {project_id}...")
    
    # Build the Apps Script service
    service = build('script', 'v1', credentials=creds)
    
    try:
        # Create request body
        request = {
            'files': project_data['files']
        }
        
        # Update the project content
        content = service.projects().updateContent(
            scriptId=project_id,
            body=request
        ).execute()
        
        print("Project uploaded successfully!")
        return content
    except Exception as e:
        print(f"Error uploading project: {e}")
        sys.exit(1)


def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python apps_script_sync.py download    # Download from Google")
        print("  python apps_script_sync.py upload      # Upload to Google")
        sys.exit(1)
    
    command = sys.argv[1]
    
    # Authenticate using shared helper
    creds = get_credentials()
    
    if command == 'download':
        # Download project
        project_data = download_project(creds, PROJECT_ID)
        
        # Save files locally
        save_files_locally(project_data)
        
        print("\nFiles downloaded successfully!")
        print("You can now edit the files in the 'apps_script_files' directory")
        
    elif command == 'upload':
        # Load files from local directory
        project_data = load_files_from_local()
        
        # Upload project
        upload_project(creds, PROJECT_ID, project_data)
        
        print("\nFiles uploaded successfully!")
        print("Your Apps Script project has been updated")
        
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == '__main__':
    main()