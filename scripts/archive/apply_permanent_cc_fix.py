import json
import subprocess
import sys

CONFIG = {
    # Diễm Hương
    37790: {
        'name': 'Diễm Hương',
        'cc_id': 780,
        'payroll_id': 10236,
        'combo_sold': 1049127,
        'wheel_bonus': 1573691,
        'all_servicing': 3733390,
        'holding': 2159699,
        'total_bonus': 2622818,
        'total_amount': 13565351,
        'adj_day': ('2026-09-29', 553451)
    },
    # Yến Vy
    48026: {
        'name': 'Yến Vy',
        'cc_id': 782,
        'payroll_id': 10324,
        'combo_sold': 455434,
        'wheel_bonus': 683151,
        'all_servicing': 1742237.5,
        'holding': 1059086.5,
        'total_bonus': 1138585,
        'total_amount': 9568290,
        'adj_day': ('2026-09-26', 43974)
    },
    # Thục Nghi
    34295: {
        'name': 'Thục Nghi',
        'cc_id': 779,
        'payroll_id': 10323,
        'combo_sold': 425425,
        'wheel_bonus': 638138,
        'all_servicing': 1303035.5,
        'holding': 664897.5,
        'total_bonus': 1063563,
        'total_amount': 11229363.384615,
        'adj_day': ('2026-09-29', 38811)
    },
    # Quang Khải
    46092: {
        'name': 'Quang Khải',
        'cc_id': 781,
        'payroll_id': 10248,
        'combo_sold': 527988,
        'wheel_bonus': 791982,
        'all_servicing': 2414265.5,
        'holding': 1622283.5,
        'total_bonus': 1319970,
        'total_amount': -6849325,
        'adj_day': ('2026-09-30', 25380)
    }
}

print("=== 1. UPDATING staff_payroll_client_consultant AND staff_payroll IN MYSQL ===")

for uid, c in CONFIG.items():
    print(f"Updating records for {c['name']} (User ID: {uid})...")
    
    # 1.1 Update staff_payroll_client_consultant
    cc_id = c['cc_id']
    res = subprocess.check_output([
        "mysql", "-uroot", "-pWingsLive2026Base", "management", "-sN", "-e",
        f"SELECT final_staff_sales, final_staff_servicing FROM staff_payroll_client_consultant WHERE id = {cc_id}"
    ]).decode("utf-8")
    
    sales_str, serv_str = res.strip().split("\t")
    sales = json.loads(sales_str)
    serv = json.loads(serv_str)
    
    sales['total_reward_amount'] = c['combo_sold']
    adj_day, adj_val = c['adj_day']
    if 'reward' in sales and adj_day in sales['reward']:
        sales['reward'][adj_day]['total_reward_amount'] = adj_val
        
    serv['current_servicing_bonus_amount'] = c['wheel_bonus']
    serv['all_servicing_bonus_amount'] = c['all_servicing']
    serv['holding_servicing_bonus_amount'] = c['holding']
    serv['reward_amount'] = 0
    
    new_sales_json = json.dumps(sales, ensure_ascii=False).replace("'", "\\'")
    new_serv_json = json.dumps(serv, ensure_ascii=False).replace("'", "\\'")
    
    sql_cc = f"""
    UPDATE staff_payroll_client_consultant
    SET final_staff_sales = '{new_sales_json}',
        staff_sales = '{new_sales_json}',
        final_staff_servicing = '{new_serv_json}',
        staff_servicing = '{new_serv_json}'
    WHERE id = {cc_id};
    """
    
    with open(f"/tmp/sql_cc_{cc_id}.sql", "w", encoding="utf-8") as f:
        f.write(sql_cc)
    subprocess.check_call(f"mysql -uroot -pWingsLive2026Base management < /tmp/sql_cc_{cc_id}.sql", shell=True)
    
    # 1.2 Update staff_payroll
    pid = c['payroll_id']
    res_sp = subprocess.check_output([
        "mysql", "-uroot", "-pWingsLive2026Base", "management", "-sN", "-e",
        f"SELECT tracking_key FROM staff_payroll WHERE id = {pid}"
    ]).decode("utf-8")
    
    tk = json.loads(res_sp.strip())
    tk['total_bonus_amount'] = c['combo_sold']
    
    lvl = tk['level'][0]
    combo = lvl.get('BonusSalesDayCombo', {})
    combo['total_reward_amount'] = c['combo_sold']
    if 'reward' in combo and adj_day in combo['reward']:
        combo['reward'][adj_day]['total_reward_amount'] = adj_val
        
    holding = lvl.get('HoldingBonusRelease', {})
    holding['current_servicing_bonus_amount'] = c['wheel_bonus']
    holding['all_servicing_bonus_amount'] = c['all_servicing']
    holding['holding_servicing_bonus_amount'] = c['holding']
    holding['reward_amount'] = 0
    
    new_tk_json = json.dumps(tk, ensure_ascii=False).replace("'", "\\'")
    sql_sp = f"""
    UPDATE staff_payroll
    SET total_bonus_amount = {c['total_bonus']},
        total_amount = {c['total_amount']},
        tracking_key = '{new_tk_json}'
    WHERE id = {pid};
    """
    with open(f"/tmp/sql_sp_{pid}.sql", "w", encoding="utf-8") as f:
        f.write(sql_sp)
    subprocess.check_call(f"mysql -uroot -pWingsLive2026Base management < /tmp/sql_sp_{pid}.sql", shell=True)
    print(f"Updated {c['name']} in both tables successfully!")

print("\n=== 2. PATCHING generate-staff-payroll.php ON VPS ===")
GEN_PATH = "/home/web/WingsLashes/Server/src/api/1/tool/generate-staff-payroll.php"
with open(GEN_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# First clean up any previous patch
CLEAN_TARGET = """                // Kinh Thánh mOS: Client Consultant (CC - userGroupId 5) - Cap 150% Vòng xoay theo Combo"""
if CLEAN_TARGET in content:
    # replace out the old patch block
    start_idx = content.find(CLEAN_TARGET)
    end_marker = "                    $payroll['tracking_key'] = $trackingKey;\n                }"
    end_idx = content.find(end_marker, start_idx) + len(end_marker)
    content = content[:start_idx].rstrip() + "\n" + content[end_idx:].lstrip("\n")

TARGET_GEN = """                if ($payroll['total_bonus_amount'] < 0) $payroll['total_bonus_amount'] = 0;"""

REPLACE_GEN = """                if ($payroll['total_bonus_amount'] < 0) $payroll['total_bonus_amount'] = 0;

                // Kinh Thánh mOS: Client Consultant (CC - userGroupId 5) - Cap 150% Vòng xoay theo Combo
                if ($userGroupId == 5) {
                    $comboBonus = isset($trackingKey['total_bonus_amount']) ? (float)$trackingKey['total_bonus_amount'] : 0;
                    $allServicing = 0;
                    if (isset($trackingKey['level'][0]['HoldingBonusRelease']['all_servicing_bonus_amount'])) {
                        $allServicing = (float)$trackingKey['level'][0]['HoldingBonusRelease']['all_servicing_bonus_amount'];
                    } elseif (isset($trackingKey['level'][0]['HoldingBonusRelease']['current_servicing_bonus_amount'])) {
                        $allServicing = (float)$trackingKey['level'][0]['HoldingBonusRelease']['current_servicing_bonus_amount'];
                    }
                    $maxWheelBonus = round($comboBonus * 1.5);
                    $cappedWheelBonus = min($allServicing, $maxWheelBonus);
                    $payroll['total_bonus_amount'] = $comboBonus + $cappedWheelBonus;

                    if (isset($trackingKey['level']) && is_array($trackingKey['level'])) {
                        foreach ($trackingKey['level'] as &$lvl) {
                            if (isset($lvl['HoldingBonusRelease'])) {
                                $lvl['HoldingBonusRelease']['current_servicing_bonus_amount'] = $cappedWheelBonus;
                                $lvl['HoldingBonusRelease']['holding_servicing_bonus_amount'] = max(0, $allServicing - $cappedWheelBonus);
                                $lvl['HoldingBonusRelease']['reward_amount'] = 0;
                            }
                        }
                        unset($lvl);
                    }
                    $payroll['tracking_key'] = $trackingKey;
                }"""

content = content.replace(TARGET_GEN, REPLACE_GEN, 1)
with open(GEN_PATH, "w", encoding="utf-8") as f:
    f.write(content)
print("generate-staff-payroll.php successfully patched with robust Cap 150% rule!")

print("\n=== ALL PERMANENT FIXES APPLIED SUCCESSFULLY ===")
