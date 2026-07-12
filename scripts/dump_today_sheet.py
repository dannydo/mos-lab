import gspread
from google.oauth2.service_account import Credentials
import csv

CREDS_FILE = '/Users/dannydo/projects/WingsLashes/service-account.json'
SPREADSHEET_ID = '1RuJ-uCEK_2ktMzlYT-sHj-UOXg5MTfzLD-p16NAXTj0'
OUTPUT_FILE = '/Users/dannydo/projects/mos-lab/scripts/today_sheet_dump.csv'

def main():
    scope = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
    creds = Credentials.from_service_account_file(CREDS_FILE, scopes=scope)
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SPREADSHEET_ID)
    ws = sh.worksheet('🟢 ⚫️ TODAY')
    
    values = ws.get_all_values()
    print(f"Total rows fetched: {len(values)}")
    
    with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerows(values)
        
    print(f"Saved to {OUTPUT_FILE}")

if __name__ == '__main__':
    main()
