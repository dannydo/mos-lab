import gspread
from google.oauth2.service_account import Credentials
import json
import os
import re

scopes = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
]

creds = Credentials.from_service_account_file(
    '/Users/dannydo/projects/mos-lab/service-account.json', 
    scopes=scopes
)
client = gspread.authorize(creds)

def clean_id(val):
    if not val:
        return None
    val = str(val).strip()
    # Find numbers
    match = re.search(r'^\d+$', val)
    if match:
        return int(match.group(0))
    return None

def fetch_campaign_ids():
    data = {
        "combo_t7": [],
        "nlc_promo_2": []
    }
    
    # 1. Fetch [V2]COMBO T7
    try:
        print("Fetching [V2]COMBO T7...")
        spreadsheet = client.open_by_key('1Cmo5jAboKYa_59CIRxFynIoMyBilspajhwDWjwaXdqM')
        worksheet = spreadsheet.worksheet('[V2]COMBO T7')
        rows = worksheet.get_all_values()
        
        # Header is at row 10 (index 9)
        # Col 11 (index 10) is CLIENT ID
        for row in rows[10:]: # Data starts at row 11 (index 10)
            if len(row) > 10:
                cid = clean_id(row[10])
                if cid:
                    data["combo_t7"].append(cid)
        print(f"Loaded {len(data['combo_t7'])} client IDs from [V2]COMBO T7")
    except Exception as e:
        print(f"Error reading [V2]COMBO T7: {e}")
        
    # 2. Fetch NLC.PROMO 2
    try:
        print("Fetching NLC.PROMO 2...")
        spreadsheet = client.open_by_key('1wQP7ISs2lLahZIshCfdDjnPypIo68DDO1AJuB_vhkfU')
        worksheet = spreadsheet.worksheet('NLC.PROMO 2')
        rows = worksheet.get_all_values()
        
        # Header is at row 10 (index 9)
        # Col 10 (index 9) is CLIENT ID
        for row in rows[10:]: # Data starts at row 11 (index 10)
            if len(row) > 9:
                cid = clean_id(row[9])
                if cid:
                    data["nlc_promo_2"].append(cid)
        print(f"Loaded {len(data['nlc_promo_2'])} client IDs from NLC.PROMO 2")
    except Exception as e:
        print(f"Error reading NLC.PROMO 2: {e}")
        
    # Ensure output directory exists
    out_dir = '/Users/dannydo/projects/mos-lab/apps/api/src/data'
    os.makedirs(out_dir, exist_ok=True)
    
    out_path = os.path.join(out_dir, 'campaign-clients.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Saved campaign data to {out_path}")

if __name__ == "__main__":
    fetch_campaign_ids()
