# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Google Apps Script project for managing Mahjong team games and rankings. The system tracks games, calculates player rankings, and provides UI interfaces for data entry and reporting within Google Sheets.

## Development Workflow

### Setup Requirements
1. Python 3.6+ with dependencies: `pip install -r requirements.txt`
2. OAuth credentials file `credentials.json` (see SETUP_GUIDE.md for details)
3. Google Cloud Project with Apps Script API enabled

### Common Commands

**First-time setup or reset authentication:**
```bash
python reset_auth.py
```

**Download Apps Script files from Google:**
```bash
python apps_script_sync.py download
```

**Upload local changes back to Google:**
```bash
python apps_script_sync.py upload
```

**Download Google Sheets data:**
```bash
python sheets_download.py
```
Downloads all sheet data to `sheet_data/` directory as CSV, JSON, and Excel files.

### File Structure

Apps Script files are stored in `apps_script_files/`:
- `menu.gs` - Menu creation and initialization
- `gameManagement.gs` - Game recording and management functions
- `rankings.gs` - Individual player ranking calculations
- `teams.gs` - Team management and team ranking calculations
- `utilities.gs` - Helper functions and utilities
- `htmlExport.gs` - HTML export functionality for rankings
- `github.gs` - GitHub publishing integration
- `debug.gs` - Debug information generation
- `index.html` - Game entry UI
- `ranking.html` - Custom ranking generation UI
- `appsscript.json` - Project configuration (timezone: Asia/Tokyo)

## Architecture

The project integrates with Google Sheets as an add-on:
1. **Server-side (*.gs files)**: Modular Google Apps Script files handling different aspects:
   - Menu creation and UI dialogs
   - Game recording and management
   - Individual and team ranking calculations
   - HTML export and GitHub publishing
   - Utility functions
2. **Client-side (HTML files)**: Provides UI for game entry and ranking queries
3. **Sync Tool (apps_script_sync.py)**: Enables local development by syncing files between Google and local filesystem

## Key Technical Details

- Uses Google Apps Script V8 runtime
- Timezone configured for Asia/Tokyo
- Data storage in Google Sheets
- OAuth authentication for sync operations


## Quick Reminders

**After making code changes:**
```bash
python apps_script_sync.py upload
```

## Coding Guidelines
- Never make unrequested changes in code, it just pisses everyone off