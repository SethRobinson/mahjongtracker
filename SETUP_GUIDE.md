# Mahjong Tracker Setup Guide

This guide helps you set up a workflow for local development of Google Apps Script projects with automatic syncing and web publishing.

## Prerequisites

- Python 3.6 or higher
- Google account with a Google Sheets spreadsheet
- Google Cloud Project

## Key Features

- **Local Development**: Edit Apps Script files locally with version control
- **Automatic Sync**: Upload/download between local files and Google Apps Script
- **Data Export**: Download spreadsheet data in multiple formats (CSV, JSON, Excel)
- **HTML Generation**: Automatically generate rankings webpage
- **GitHub Publishing**: One-click publish to GitHub Pages

## Setup Instructions

### 1. Enable Required APIs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Apps Script API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Apps Script API" and enable it
4. Enable the **Google Sheets API**:
   - Search for "Google Sheets API" and enable it

### 2. Create OAuth 2.0 Credentials

1. In Google Cloud Console, go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Configure OAuth consent screen if prompted
4. Choose "Desktop app" as application type
5. Name it (e.g., "Apps Script Sync")
6. Download the JSON file
7. Rename to `credentials.json` and place in project directory

### 3. Create config.json (Required)

Create a `config.json` file in the project root with your IDs:

```json
{
  "apps_script_project_id": "your-apps-script-project-id",
  "spreadsheet_id": "your-google-spreadsheet-id"
}
```

To find these IDs:
- **Apps Script ID**: Open script editor in Google Sheets → Project Settings → Copy Script ID
- **Spreadsheet ID**: From your Google Sheets URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`

### 4. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 5. Workflow Usage

#### Download Apps Script files:
```bash
python apps_script_sync.py download
```
- Downloads all Apps Script files to `apps_script_files/` directory
- Edit files locally with your preferred editor

#### Upload changes to Google:
```bash
python apps_script_sync.py upload
```
- Uploads all local changes back to Google Apps Script
- Changes take effect immediately in Google Sheets

#### Download spreadsheet data:
```bash
python sheets_download.py
```
- Downloads all sheet data to `sheet_data/` directory
- Saves as CSV, JSON, and Excel formats

#### Reset authentication:
```bash
python reset_auth.py
```
- Use if you encounter authentication issues
- Deletes `token.pickle` and re-authenticates

## In Google Sheets

The Apps Script adds a "C2 Options" menu with features:

- **Add Game & Calculate Rankings**: Enter game results
- **Export Rankings to HTML**: Generate webpage
- **Publish to Website (GitHub)**: Upload to GitHub Pages
- **Setup GitHub Publishing**: Configure GitHub integration

## Typical Development Workflow

1. Download current code: `python apps_script_sync.py download`
2. Edit files in `apps_script_files/` directory
3. Upload changes: `python apps_script_sync.py upload`
4. Test in Google Sheets
5. Use menu options to publish rankings to web

## Troubleshooting

- **Authentication fails**: Delete `token.pickle` and try again
- **"Insufficient scopes" error**: Run `python reset_auth.py`
- **config.json missing**: Create it with your project IDs
- **APIs not enabled**: Enable both Apps Script and Sheets APIs in Google Cloud Console

## Notes

- First run opens browser for Google authentication
- Token saved in `token.pickle` for future use
- Always backup your Apps Script code before uploading
- The HTML export updates automatically when rankings change