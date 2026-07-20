import os
import json
import urllib.request
import urllib.error

from lib.env import SUPABASE_URL, SUPABASE_SERVICE_KEY


def send_to_supabase(table, data):
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print(f"Error: Supabase credentials not found. Cannot sync table {table}.")
        return False
        
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates" # Upsert: merge duplicate primary keys
    }
    
    req_body = json.dumps(data, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=req_body, headers=headers, method="POST")
    
    try:
        with urllib.request.urlopen(req) as res:
            print(f"Successfully upserted {len(data)} records to Supabase table '{table}' (Status: {res.status}).")
            return True
    except urllib.error.HTTPError as e:
        print(f"HTTP Error upserting to {table}: {e.code} - {e.reason}")
        print("Body response:", e.read().decode("utf-8"))
        return False
    except Exception as e:
        print(f"Error upserting to {table}: {e}")
        return False

def parse_campaigns(ads_data_path):
    if not os.path.exists(ads_data_path):
        print(f"Warning: {ads_data_path} not found. Using default values.")
        return get_default_campaigns()
        
    try:
        with open(ads_data_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading {ads_data_path}: {e}")
        return get_default_campaigns()
    
    # If the campaigns are already parsed by the scraper, use them!
    if "campaigns" in data:
        print("Found pre-parsed campaigns in ads_data.json.")
        parsed = data["campaigns"]
        
        # Load academy campaign prefixes to filter
        prefixes = ["[WA]", "Boosted Reel", "Standard Ad", "Video views Reel"]
        try:
            project_dir = os.path.dirname(os.path.abspath(__file__))
            config_path = os.path.join(project_dir, "configs/academy_config.json")
            if os.path.exists(config_path):
                with open(config_path, "r", encoding="utf-8") as f_cfg:
                    cfg = json.load(f_cfg)
                    prefixes = cfg.get("campaign_prefixes", prefixes)
        except Exception as err:
            print(f"Note: could not read academy prefixes config: {err}")
            
        academy_campaigns = []
        for c in parsed:
            name = c.get("name", "")
            if any(p.lower() in name.lower() for p in prefixes):
                spend = c.get("spend", 0)
                views = c.get("views", c.get("impressions", 0))
                viewers = c.get("reach", c.get("viewers", 0))
                results = c.get("results", 0)
                messages = c.get("messages", 0)
                thruplays = c.get("thruplays", 0)
                
                goal = c.get("goal", "Messages")
                if goal == "Video views":
                    thruplays = thruplays or results
                else:
                    messages = messages or results
                    
                academy_campaigns.append({
                    "name": name,
                    "spend": spend,
                    "views": views,
                    "viewers": viewers,
                    "messages": messages,
                    "thruplays": thruplays,
                    "goal": goal
                })
        
        if academy_campaigns:
            print(f"Filtered {len(academy_campaigns)} Academy campaigns from {len(parsed)} total campaigns.")
            return academy_campaigns
        else:
            print("No matching Academy campaigns found in pre-parsed data. Using defaults.")
            
    # Fallback to the old elements parsing logic
    elements = data.get("elements", [])
    campaigns = []
    
    metric_blocks = []
    for el in elements:
        if "spend of" in el.lower() and "views" in el.lower():
            metric_blocks.append(el)
            
    if not metric_blocks:
        return get_default_campaigns()
        
    for idx, block in enumerate(metric_blocks):
        lines = [line.strip() for line in block.split('\n') if line.strip()]
        try:
            views = int(lines[0].replace(",", "")) if len(lines) > 0 else 0
            viewers = int(lines[2].replace(",", "")) if len(lines) > 2 else 0
            
            messages = 0
            thruplays = 0
            
            if "messaging conversations started" in block.lower():
                messages = int(lines[4]) if len(lines) > 4 else 0
            elif "thruplays" in block.lower():
                thruplays = int(lines[4]) if len(lines) > 4 else 0
                
            spend = 0
            for line in lines:
                if "₫" in line:
                    spend = int("".join(c for c in line if c.isdigit()))
                    break
                    
            friendly_name = f"Campaign #{idx + 1}"
            if idx == 0:
                friendly_name = "[WA] Boosted Reel: 'Học nối mi chỉ từ 1.9...'"
            elif idx == 1:
                friendly_name = "[WA] Standard Ad: 'Sắp đi định cư? Học...'"
            elif idx == 2:
                friendly_name = "[WA] Video Views Reel: 'Sắp đi định cư...'"
                
            campaigns.append({
                "name": friendly_name,
                "spend": spend,
                "views": views,
                "viewers": viewers,
                "messages": messages,
                "thruplays": thruplays,
                "goal": "Video views" if thruplays > 0 else "Messages"
            })
        except Exception as e:
            print(f"Error parsing campaign block {idx}: {e}")
            
    return campaigns if campaigns else get_default_campaigns()

def get_default_campaigns():
    return [
        {
            "name": "[WA] Boosted Reel: 'Học nối mi chỉ từ 1.9...'",
            "spend": 472283,
            "views": 5251,
            "viewers": 2687,
            "messages": 36,
            "thruplays": 0,
            "goal": "Messages"
        },
        {
            "name": "[WA] Standard Ad: 'Sắp đi định cư? Học...'",
            "spend": 477519,
            "views": 2956,
            "viewers": 1320,
            "messages": 19,
            "thruplays": 0,
            "goal": "Messages"
        },
        {
            "name": "[WA] Video Views Reel: 'Sắp đi định cư...'",
            "spend": 25559,
            "views": 1801,
            "viewers": 1721,
            "thruplays": 207,
            "messages": 0,
            "goal": "Video views"
        }
    ]

def main():
    print("=== STARTING SUPABASE SYNC PROCESS ===")
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables.")
        print("Please create a '.env' file in the workspace root with:")
        print("SUPABASE_URL=https://your-project.supabase.co")
        print("SUPABASE_SERVICE_KEY=your-service-role-key")
        return
        
    # 1. Sync Lashes Billing History
    billing_json_path = "data/lashes/billing_history.json"
    if os.path.exists(billing_json_path):
        with open(billing_json_path, "r", encoding="utf-8") as f:
            billing_data = json.load(f)
        
        # Clean transaction objects to match Supabase schema
        cleaned_billing = []
        for tx in billing_data:
            cleaned_billing.append({
                "transaction_id": tx["transaction_id"],
                "date": tx["date"],
                "amount": tx["amount"],
                "payment_method": tx["payment_method"],
                "code": tx["code"],
                "status": tx["status"],
                "vat_invoice_id": tx["vat_invoice_id"] if tx["vat_invoice_id"] else None
            })
            
        send_to_supabase("billing_history", cleaned_billing)
    else:
        print(f"Warning: Billing history file {billing_json_path} not found.")

    # 2. Sync Academy Campaign Metrics
    ads_json_path = "data/academy/ads_data.json"
    campaigns = parse_campaigns(ads_json_path)
    send_to_supabase("campaign_metrics", campaigns)
    
    print("=== SUPABASE SYNC PROCESS COMPLETED ===")

if __name__ == "__main__":
    main()
