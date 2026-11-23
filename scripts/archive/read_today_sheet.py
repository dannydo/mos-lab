import gspread
from google.oauth2.service_account import Credentials

CREDS_FILE = '/Users/dannydo/projects/WingsLashes/service-account.json'
SPREADSHEET_ID = '1RuJ-uCEK_2ktMzlYT-sHj-UOXg5MTfzLD-p16NAXTj0'

def main():
    scope = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
    creds = Credentials.from_service_account_file(CREDS_FILE, scopes=scope)
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SPREADSHEET_ID)
    
    print("Worksheets in the spreadsheet:")
    for ws in sh.worksheets():
        print(f" - '{ws.title}'")

if __name__ == '__main__':
    main()
