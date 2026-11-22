import gzip
import re
import sys
from collections import defaultdict

def parse_entries(text):
    entries = []
    chunks = text.split('# Time: ')
    for c in chunks[1:]:
        lines = c.strip().split('\n')
        time_str = lines[0].strip()
        m_time = re.search(r'Query_time:\s*([\d\.]+)\s*Lock_time:\s*([\d\.]+)\s*Rows_sent:\s*(\d+)\s*Rows_examined:\s*(\d+)', c)
        if not m_time:
            continue
        q_time = float(m_time.group(1))
        lock_time = float(m_time.group(2))
        rows_sent = int(m_time.group(3))
        rows_ex = int(m_time.group(4))
        
        m_schema = re.search(r'Schema:\s*(\w+)', c)
        schema = m_schema.group(1) if m_schema else 'unknown'
        
        sql_lines = [l.strip() for l in lines[1:] if l.strip() and not l.strip().startswith('#') and not l.strip().startswith('use ') and not l.strip().startswith('SET timestamp')]
        sql = ' '.join(sql_lines)
        if sql:
            entries.append({
                'time': time_str,
                'q_time': q_time,
                'lock_time': lock_time,
                'rows_sent': rows_sent,
                'rows_ex': rows_ex,
                'schema': schema,
                'sql': sql
            })
    return entries

def normalize(sql):
    s = re.sub(r'/\*!?[^\*]*\*/', '', sql)
    s = re.sub(r"'[^']*'", "'?'", s)
    s = re.sub(r'\b\d+\b', '?', s)
    s = re.sub(r'\s+', ' ', s).strip()
    s = re.sub(r'(\?,\s*){3,}\?', '?...', s)
    return s

def identify_table(sql):
    m = re.search(r'FROM\s+[`]?(\w+)[`]?\.?[`]?(\w+)?[`]?', sql, re.IGNORECASE)
    if m:
        t1, t2 = m.group(1), m.group(2)
        return t2 if t2 else t1
    m2 = re.search(r'UPDATE\s+[`]?(\w+)[`]?\.?[`]?(\w+)?[`]?', sql, re.IGNORECASE)
    if m2:
        t1, t2 = m2.group(1), m2.group(2)
        return t2 if t2 else t1
    m3 = re.search(r'ALTER\s+TABLE\s+[`]?(\w+)[`]?\.?[`]?(\w+)?[`]?', sql, re.IGNORECASE)
    if m3:
        t1, t2 = m3.group(1), m3.group(2)
        return t2 if t2 else t1
    return 'unknown'

def analyze():
    with gzip.open('/var/log/mysql/mariadb-slow.log.1.gz', 'rt', encoding='utf-8', errors='ignore') as f:
        e21 = parse_entries(f.read())

    with open('/var/log/mysql/mariadb-slow.log', 'r', encoding='utf-8', errors='ignore') as f:
        e22 = parse_entries(f.read())

    def analyze_group(entries, name):
        print(f"=== {name} (Tổng slow queries: {len(entries)}) ===")
        if not entries:
            print("  Không có slow query nào!")
            return
        total_time_all = sum(e['q_time'] for e in entries)
        print(f"  Tổng thời gian chờ CPU: {total_time_all:,.1f} giây")
        patterns = defaultdict(lambda: {'count': 0, 'total_time': 0.0, 'max_time': 0.0, 'max_rows': 0, 'sample': '', 'table': ''})
        for e in entries:
            norm = normalize(e['sql'])
            key = norm[:160]
            p = patterns[key]
            p['count'] += 1
            p['total_time'] += e['q_time']
            if e['q_time'] > p['max_time']:
                p['max_time'] = e['q_time']
            if e['rows_ex'] > p['max_rows']:
                p['max_rows'] = e['rows_ex']
            if not p['sample']:
                p['sample'] = e['sql'][:140]
                p['table'] = identify_table(e['sql'])
                
        sorted_p = sorted(patterns.items(), key=lambda x: x[1]['total_time'], reverse=True)
        for k, v in sorted_p[:12]:
            avg_t = v['total_time'] / v['count']
            print(f"[{v['table']:<22}] {v['count']:5d}x | Tổng: {v['total_time']:7.1f}s | TB: {avg_t:5.2f}s | Max: {v['max_time']:5.2f}s | MaxDòng: {v['max_rows']:9,d} | {v['sample']}")
        print()

    analyze_group(e21, '1. NGÀY HÔM QUA (2026-09-21 - Cả ngày)')
    
    # Analyze Sep 22: breakdown by phases
    # Morning: before 11:20 (before phase 1/2 optimizations)
    # Afternoon: 11:20 to 19:48 (before phase 3 optimizations)
    # Evening: after 19:48 (after phase 3 optimizations)
    e22_morning = []
    e22_afternoon = []
    e22_post_phase3 = []
    
    for e in e22:
        t_str = e['time'] # YYMMDD HH:MM:SS
        # extract HHMM
        m = re.search(r'\d{6}\s+(\d{2}):(\d{2})', t_str)
        if m:
            hh, mm = int(m.group(1)), int(m.group(2))
            minute_of_day = hh * 60 + mm
            if minute_of_day < 11 * 60 + 20: # < 11:20
                e22_morning.append(e)
            elif minute_of_day < 19 * 60 + 48: # < 19:48
                e22_afternoon.append(e)
            else:
                e22_post_phase3.append(e)
        else:
            e22_afternoon.append(e)

    analyze_group(e22, '2. NGÀY HÔM NAY (2026-09-22 - Toàn bộ ngày)')
    analyze_group(e22_morning, '   2.1 Sáng 22/09 (00:00 - 11:20: Trước khi tối ưu Phase 1 & 2)')
    analyze_group(e22_afternoon, '   2.2 Trưa & Chiều 22/09 (11:20 - 19:48: Trước khi tối ưu Phase 3)')
    analyze_group(e22_post_phase3, '   2.3 Tối 22/09 (Từ 19:48 đến nay: SAU KHI TỐI ƯU HOÀN TẤT PHASE 3)')

if __name__ == '__main__':
    analyze()
