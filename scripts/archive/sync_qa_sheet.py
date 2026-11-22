import json
import gspread
from google.oauth2.service_account import Credentials

CREDS_FILE = '/Users/dannydo/projects/WingsLashes/service-account.json'
SPREADSHEET_ID = '1EmWBTH_NQwm8VEqmFkQoNRaQIIczHrOJwft5oFRcK5c'
OUTPUT_FILE = '/Users/dannydo/projects/mos-lab/apps/api/src/modules/qa-shop/qa-sheet-data.json'

def sync_qa_sheet():
    scope = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
    creds = Credentials.from_service_account_file(CREDS_FILE, scopes=scope)
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SPREADSHEET_ID)

    sheets_mapping = [
        {'sheet_name': 'DT.Reception.DAILY.check', 'branch_code': 'DT', 'branch_name': 'Chi Nhánh Đô Thành (Điệp Từ)'},
        {'sheet_name': 'PXL.Reception.DAILY.check', 'branch_code': 'PXL', 'branch_name': 'Chi Nhánh Phan Xích Long (PXL)'},
        {'sheet_name': 'EP.Reception.DAILY.check', 'branch_code': 'EP', 'branch_name': 'Chi Nhánh EmPire (EP)'},
    ]

    result_data = {}

    for mapping in sheets_mapping:
        sname = mapping['sheet_name']
        bcode = mapping['branch_code']
        bname = mapping['branch_name']

        try:
            ws = sh.worksheet(sname)
            rows = ws.get_all_values()
            
            categories = []
            current_cat = None
            sec_idx = 1
            item_idx = 1

            for r in rows[11:]:
                item_name = r[0].strip() if len(r) > 0 else ''
                if not item_name:
                    continue
                severity = r[2].strip() if len(r) > 2 else ''

                if severity in ['LOW', 'MID', 'HIGH', 'CRITICAL'] or (len(r) > 5 and r[5]):
                    # Item line
                    if not current_cat:
                        current_cat = {
                            'id': f'sec-{bcode.toLowerCase()}-{sec_idx}',
                            'title': 'Tiêu chuẩn chung',
                            'order': sec_idx,
                            'items': []
                        }
                        categories.append(current_cat)
                        sec_idx += 1
                    
                    item_obj = {
                        'id': f'{bcode.lower()}-sheet-{item_idx}',
                        'code': f'{bcode}.{item_idx:03d}',
                        'title': item_name.replace('\n', ' - '),
                        'standardRequirement': f'Đơn vị: {r[1] if len(r)>1 else "1"} | Khu vực: {r[5] if len(r)>5 else ""} | Bộ phận: {r[8] if len(r)>8 else ""}',
                        'severity': severity if severity in ['LOW', 'MID', 'HIGH', 'CRITICAL'] else 'MID',
                        'priority': r[3] if len(r)>3 else 'HIGH',
                        'area': r[5] if len(r)>5 else '',
                        'dept': r[8] if len(r)>8 else '',
                        'weight': 5 if severity == 'CRITICAL' else 4 if severity == 'HIGH' else 3 if severity == 'MID' else 2,
                        'requirePhotoOnFail': True if severity in ['HIGH', 'CRITICAL'] else False,
                        'isCritical': True if severity == 'CRITICAL' else False
                    }
                    current_cat['items'].append(item_obj)
                    item_idx += 1
                else:
                    # Category header line
                    cat_title = item_name.replace('\n', ' ')
                    if not cat_title.startswith('HẠNG MỤC') and not cat_title.isdigit():
                        current_cat = {
                            'id': f'sec-{bcode.lower()}-{sec_idx}',
                            'title': f'{sec_idx}. {cat_title}',
                            'order': sec_idx,
                            'items': []
                        }
                        categories.append(current_cat)
                        sec_idx += 1

            # Filter out empty categories
            categories = [c for c in categories if len(c['items']) > 0]

            result_data[bcode] = {
                'id': f'tpl-{bcode.lower()}-sheet-sync',
                'code': f'{bcode}.Reception.DAILY.check',
                'branchCode': bcode,
                'branchName': bname,
                'title': f'{bcode} - Daily Shop Inspection Standard (Google Sheet Synced)',
                'description': f'Mẫu tiêu chí kiểm tra cửa hàng đồng bộ từ Google Sheet tab {sname}',
                'updatedAt': '2026-08-11T11:46:00.000Z',
                'sections': categories
            }
            print(f'Successfully parsed {bcode}: {len(categories)} sections, {item_idx-1} items')

        except Exception as e:
            print(f'Error parsing sheet {sname}:', e)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(result_data, f, ensure_ascii=False, indent=2)

    print('Saved json output to', OUTPUT_FILE)

if __name__ == '__main__':
    sync_qa_sheet()
