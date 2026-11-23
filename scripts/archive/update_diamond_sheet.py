"""
update_diamond_sheet.py
─────────────────────────────────────────────────────────────────
Gọi API /sheet/diamond/{key}/{year}/{month} để lấy số lượng
referral thực tế của từng CC trong tháng, sau đó ghi vào
tab '💎 DIAMOND' tại D21 trở xuống.

Đồng thời cập nhật công thức cột H (Số KH 💎 đã đạt) của bảng
chính thành VLOOKUP → tự động lấy số liệu thực từ API data.

Cách chạy:
  python update_diamond_sheet.py            # tháng hiện tại
  python update_diamond_sheet.py 2026 06    # tháng chỉ định
─────────────────────────────────────────────────────────────────
"""

import sys
import csv
import io
import requests
import gspread
from datetime import datetime
from google.oauth2.service_account import Credentials

# ── CẤU HÌNH ────────────────────────────────────────────────────
SPREADSHEET_ID  = '1RuJ-uCEK_2ktMzlYT-sHj-UOXg5MTfzLD-p16NAXTj0'
DIAMOND_SHEET   = '💎 DIAMOND'
CREDS_FILE      = 'service-account.json'

API_BASE        = 'http://localhost:4001/api/kpi'
API_KEY         = 'FDC0D0A177694777A'

# Hàng bắt đầu ghi dữ liệu (D21 = row 21, col D)
DATA_START_ROW  = 21
# Hàng dữ liệu chính (header của bảng main ở row 5, data ở 6-10)
MAIN_DATA_ROWS  = list(range(6, 11))   # rows 6..10
# ────────────────────────────────────────────────────────────────


def get_year_month():
    if len(sys.argv) == 3:
        return sys.argv[1], sys.argv[2].zfill(2)
    now = datetime.now()
    return str(now.year), now.strftime('%m')


def fetch_diamond_data(year, month):
    url = f'{API_BASE}/export-diamond?key={API_KEY}&month={year}-{month}&format=csv'
    print(f'🌐 Gọi API: {url}')
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()

    reader = csv.DictReader(io.StringIO(resp.text))
    rows = list(reader)
    print(f'✅ Nhận được {len(rows)} CC từ API')
    return rows


def connect_sheet():
    scope = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
    creds = Credentials.from_service_account_file(CREDS_FILE, scopes=scope)
    gc    = gspread.authorize(creds)
    sh    = gc.open_by_key(SPREADSHEET_ID)
    ws    = sh.worksheet(DIAMOND_SHEET)
    return ws


def write_api_data(ws, rows, year, month):
    """Ghi dữ liệu API vào D21 trở xuống."""
    # Header
    header = [[f'API: {year}-{month}', 'So KH Kim Cuong']]
    # Data rows: [[cc_name, count], ...]
    data_rows = [
        [r['TEN_CC'], int(r['SO_KH_DIAMOND'])]
        for r in rows
    ]
    all_rows = header + data_rows

    # Xóa vùng cũ trước
    end_row = DATA_START_ROW + 30
    ws.batch_clear([f'D{DATA_START_ROW}:E{end_row}'])

    # Ghi dữ liệu mới
    ws.update(
        f'D{DATA_START_ROW}',
        all_rows,
        value_input_option='USER_ENTERED'
    )
    print(f'📝 Đã ghi {len(data_rows)} CC vào D{DATA_START_ROW}:'
          f'E{DATA_START_ROW + len(all_rows) - 1}')
    return DATA_START_ROW + 1  # row đầu tiên có data (bỏ qua header)


def update_h_formulas(ws, first_data_row, total_rows):
    """
    Cập nhật cột H (Số KH 💎 đã đạt) của bảng chính thành VLOOKUP
    trỏ vào vùng API data tại D:E.
    Chỉ chạy lần đầu để thiết lập công thức — sau đó VLOOKUP
    sẽ tự cập nhật khi D21+ thay đổi.
    """
    lookup_range = f'$D${first_data_row}:$E${first_data_row + total_rows}'
    updates = []
    for row in MAIN_DATA_ROWS:
        # D{row} = tên CC → VLOOKUP trong vùng API data → lấy cột 2 (count)
        formula = f'=IFERROR(VLOOKUP(D{row},{lookup_range},2,FALSE),0)'
        updates.append({
            'range': f'H{row}',
            'values': [[formula]]
        })

    ws.batch_update(updates, value_input_option='USER_ENTERED')
    print(f'🔗 Đã cập nhật công thức VLOOKUP cho H6:H10')


def main():
    year, month = get_year_month()
    print(f'\n🏃 Cập nhật 💎 DIAMOND sheet — Tháng {month}/{year}')
    print('=' * 50)

    # 1. Lấy dữ liệu từ API
    rows = fetch_diamond_data(year, month)

    # 2. Kết nối Sheet
    ws = connect_sheet()
    print(f'✅ Kết nối thành công: [{ws.spreadsheet.title}] > {DIAMOND_SHEET}')

    # 3. Ghi dữ liệu vào D21+
    first_data_row = write_api_data(ws, rows, year, month)

    # 4. Cập nhật công thức VLOOKUP ở H6:H10
    update_h_formulas(ws, first_data_row, len(rows))

    print('\n✅ Hoàn thành!')
    print(f'   → Dữ liệu API tại  : D{DATA_START_ROW}:E{first_data_row + len(rows) - 1}')
    print(f'   → Công thức VLOOKUP: H6:H10 (tự cập nhật khi chạy lại script)')


if __name__ == '__main__':
    main()
