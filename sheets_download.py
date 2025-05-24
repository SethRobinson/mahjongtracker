#!/usr/bin/env python3
"""
Download Google Sheets data to various formats (CSV, Excel, JSON).
Uses existing OAuth credentials from credentials.json and token.pickle.
"""

import os
import json
from pathlib import Path
from typing import List, Dict, Any

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google_auth_helper import get_credentials

def extract_spreadsheet_id(url: str) -> str:
    """Extract the spreadsheet ID from a Google Sheets URL."""
    # URL format: https://docs.google.com/spreadsheets/d/{spreadsheetId}/...
    parts = url.split('/')
    for i, part in enumerate(parts):
        if part == 'd' and i + 1 < len(parts):
            return parts[i + 1]
    raise ValueError(f"Could not extract spreadsheet ID from URL: {url}")

def get_sheet_metadata(service, spreadsheet_id: str) -> Dict[str, Any]:
    """Get spreadsheet metadata including sheet names."""
    try:
        spreadsheet = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        return spreadsheet
    except HttpError as error:
        print(f'An error occurred: {error}')
        raise

def download_sheet_data(service, spreadsheet_id: str, sheet_name: str) -> List[List[Any]]:
    """Download data from a specific sheet."""
    try:
        result = service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id,
            range=f"'{sheet_name}'"
        ).execute()
        values = result.get('values', [])
        return values
    except HttpError as error:
        print(f'An error occurred downloading sheet {sheet_name}: {error}')
        raise

def save_as_csv(data: List[List[Any]], filename: str):
    """Save sheet data as CSV file."""
    import csv
    
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        for row in data:
            writer.writerow(row)
    print(f"Saved CSV: {filename}")

def save_as_json(data: List[List[Any]], filename: str):
    """Save sheet data as JSON file."""
    # Convert to list of dictionaries if headers exist
    if data and len(data) > 1:
        headers = data[0]
        records = []
        for row in data[1:]:
            # Pad row with empty strings if it's shorter than headers
            padded_row = row + [''] * (len(headers) - len(row))
            record = dict(zip(headers, padded_row))
            records.append(record)
        
        with open(filename, 'w', encoding='utf-8') as jsonfile:
            json.dump(records, jsonfile, indent=2, ensure_ascii=False)
    else:
        # Save as is if no headers or single row
        with open(filename, 'w', encoding='utf-8') as jsonfile:
            json.dump(data, jsonfile, indent=2, ensure_ascii=False)
    
    print(f"Saved JSON: {filename}")

def save_all_as_excel(sheets_data: Dict[str, List[List[Any]]], filename: str):
    """Save all sheets as an Excel file with multiple tabs."""
    try:
        import pandas as pd
        
        with pd.ExcelWriter(filename, engine='openpyxl') as writer:
            for sheet_name, data in sheets_data.items():
                if data:
                    # Convert to DataFrame
                    if len(data) > 1:
                        df = pd.DataFrame(data[1:], columns=data[0])
                    else:
                        df = pd.DataFrame(data)
                    
                    # Clean sheet name for Excel (max 31 chars, no special chars)
                    clean_name = sheet_name[:31].replace('/', '-').replace('\\', '-')
                    df.to_excel(writer, sheet_name=clean_name, index=False)
        
        print(f"Saved Excel: {filename}")
    except ImportError:
        print("pandas and openpyxl are required for Excel export. Install with:")
        print("pip install pandas openpyxl")
        return False
    return True

def main():
    """Main function to download Google Sheets data."""
    # Load configuration
    try:
        with open('config.json', 'r') as f:
            config = json.load(f)
            SPREADSHEET_ID = config['spreadsheet_id']
    except FileNotFoundError:
        print("Error: config.json not found. Please create a config.json file with your spreadsheet ID.")
        print("Example config.json:")
        print(json.dumps({"spreadsheet_id": "your-spreadsheet-id-here"}, indent=2))
        return
    except KeyError:
        print("Error: 'spreadsheet_id' not found in config.json")
        return
    
    # Build the spreadsheet URL from the ID
    SPREADSHEET_URL = f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}"
    OUTPUT_DIR = "sheet_data"
    
    # Create output directory
    Path(OUTPUT_DIR).mkdir(exist_ok=True)
    
    # Get credentials and build service
    print("Authenticating...")
    creds = get_credentials()
    service = build('sheets', 'v4', credentials=creds)
    
    # Extract spreadsheet ID
    spreadsheet_id = extract_spreadsheet_id(SPREADSHEET_URL)
    print(f"Spreadsheet ID: {spreadsheet_id}")
    
    # Get spreadsheet metadata
    print("Fetching spreadsheet metadata...")
    metadata = get_sheet_metadata(service, spreadsheet_id)
    spreadsheet_title = metadata.get('properties', {}).get('title', 'Untitled')
    sheets = metadata.get('sheets', [])
    
    print(f"\nSpreadsheet: {spreadsheet_title}")
    print(f"Found {len(sheets)} sheet(s):")
    
    # Download data from all sheets
    all_sheets_data = {}
    
    for sheet in sheets:
        sheet_props = sheet.get('properties', {})
        sheet_name = sheet_props.get('title', 'Untitled')
        print(f"\nDownloading sheet: {sheet_name}")
        
        try:
            data = download_sheet_data(service, spreadsheet_id, sheet_name)
            
            if not data:
                print(f"  - No data found in sheet: {sheet_name}")
                continue
            
            all_sheets_data[sheet_name] = data
            print(f"  - Downloaded {len(data)} rows")
            
            # Save individual sheet as CSV
            csv_filename = os.path.join(OUTPUT_DIR, f"{sheet_name}.csv")
            save_as_csv(data, csv_filename)
            
            # Save individual sheet as JSON
            json_filename = os.path.join(OUTPUT_DIR, f"{sheet_name}.json")
            save_as_json(data, json_filename)
            
        except Exception as e:
            print(f"  - Error downloading sheet {sheet_name}: {e}")
    
    # Save all sheets as a single Excel file
    if all_sheets_data:
        excel_filename = os.path.join(OUTPUT_DIR, f"{spreadsheet_title}.xlsx")
        save_all_as_excel(all_sheets_data, excel_filename)
        
        # Save metadata
        metadata_filename = os.path.join(OUTPUT_DIR, "metadata.json")
        with open(metadata_filename, 'w', encoding='utf-8') as f:
            json.dump({
                'spreadsheet_id': spreadsheet_id,
                'title': spreadsheet_title,
                'url': SPREADSHEET_URL,
                'sheets': [sheet['properties']['title'] for sheet in sheets],
                'download_date': str(Path().resolve())
            }, f, indent=2)
        print(f"\nSaved metadata: {metadata_filename}")
    
    print(f"\nAll data saved to: {OUTPUT_DIR}/")

if __name__ == '__main__':
    main()