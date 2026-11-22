import csv

with open('/Users/dannydo/projects/mos-lab/scripts/today_sheet_dump.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    for i, row in enumerate(reader):
        if any('Nguyễn Quang Khải' in col or '45103' in col for col in row):
            print(f"Row {i+1}: {row}")
