import json
import subprocess

CONFIG = {
    10236: {
        'name': 'Diễm Hương',
        'user_id': 37790,
        'combo_sold': 1049127,
        'wheel_bonus': 1573691,
        'all_servicing': 3733390,
        'holding': 2159699,
        'total_bonus': 2622818,
        'total_amount': 13565351,
        'adj_day': ('2026-09-29', 553451)
    },
    10324: {
        'name': 'Yến Vy',
        'user_id': 48026,
        'combo_sold': 455434,
        'wheel_bonus': 683151,
        'all_servicing': 1742237.5,
        'holding': 1059086.5,
        'total_bonus': 1138585,
        'total_amount': 9568290,
        'adj_day': ('2026-09-26', 43974)
    },
    10323: {
        'name': 'Thục Nghi',
        'user_id': 34295,
        'combo_sold': 425425,
        'wheel_bonus': 638138,
        'all_servicing': 1303035.5,
        'holding': 664897.5,
        'total_bonus': 1063563,
        'total_amount': 11229363.384615,
        'adj_day': ('2026-09-29', 38811)
    },
    10248: {
        'name': 'Quang Khải',
        'user_id': 46092,
        'combo_sold': 527988,
        'wheel_bonus': 791982,
        'all_servicing': 2414265.5,
        'holding': 1622283.5,
        'total_bonus': 1319970,
        'total_amount': -6849325,
        'adj_day': ('2026-09-30', 25380)
    }
}

for pid, c in CONFIG.items():
    print(f"Processing {c['name']} (id={pid})...")
    res = subprocess.check_output([
        "mysql", "-uroot", "-pWingsLive2026Base", "management", "-sN", "-e",
        f"SELECT tracking_key FROM staff_payroll WHERE id = {pid}"
    ]).decode("utf-8")
    
    tk = json.loads(res.strip())
    
    # 1. Update root
    tk['total_bonus_amount'] = c['combo_sold']
    
    # 2. Update level[0]
    lvl = tk['level'][0]
    combo = lvl.get('BonusSalesDayCombo', {})
    combo['total_reward_amount'] = c['combo_sold']
    
    adj_day, adj_val = c['adj_day']
    if 'reward' in combo and adj_day in combo['reward']:
        combo['reward'][adj_day]['total_reward_amount'] = adj_val
    
    holding = lvl.get('HoldingBonusRelease', {})
    holding['current_servicing_bonus_amount'] = c['wheel_bonus']
    holding['all_servicing_bonus_amount'] = c['all_servicing']
    holding['holding_servicing_bonus_amount'] = c['holding']
    holding['reward_amount'] = 0
    
    new_tk_json = json.dumps(tk, ensure_ascii=False)
    
    with open(f"/tmp/update_{pid}.sql", "w", encoding="utf-8") as f:
        escaped_tk = new_tk_json.replace("'", "\\'")
        f.write(f"UPDATE staff_payroll SET total_bonus_amount = {c['total_bonus']}, total_amount = {c['total_amount']}, tracking_key = '{escaped_tk}' WHERE id = {pid};\n")
    
    subprocess.check_call(f"mysql -uroot -pWingsLive2026Base management < /tmp/update_{pid}.sql", shell=True)
    print(f"Updated {c['name']} successfully!")

print("All 4 CC payroll records successfully updated on Production VPS MySQL!")
