with open('/Users/dannydo/projects/mos-lab/scripts/today_sheet_dump.csv', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if '45103' in line:
            print(f"Line {i+1}: {line}")
