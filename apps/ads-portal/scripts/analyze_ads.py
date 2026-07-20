"""
analyze_ads.py
--------------
MỤC ĐÍCH:
    Cào dữ liệu chiến dịch quảng cáo từ Meta Ads Manager bằng Playwright CDP.
    Kết nối vào Chrome đang chạy (port 9222), điều hướng đến Ads Manager,
    đọc bảng kết quả chiến dịch và lưu vào JSON.

CHẠY VỚI:
    .venv/bin/python analyze_ads.py [--config configs/academy_config.json]
    make sync-ads   (mặc định dùng academy_config.json)

THAM SỐ:
    --config  Path đến file JSON cấu hình tài khoản (default: configs/academy_config.json)

ĐẦU VÀO:
    configs/academy_config.json | configs/lashes_config.json
    Chrome đang chạy ở debug port 9222 và đã đăng nhập Meta Ads Manager

ĐẦU RA:
    data/academy/ads_data.json | data/lashes/ads_data.json
    screenshot PNG trong data/<branch>/

PHỤ THUỘC:
    playwright (Playwright CDP), Chrome remote debugging port 9222
    Không cần lib/* — script độc lập hoàn toàn

LƯU Ý QUAN TRỌNG:
    - Phải tắt Chrome bình thường, khởi động lại với --remote-debugging-port=9222
    - Script nhận diện Ads Manager qua URL pattern admanager.facebook.com
    - Dữ liệu parse từ text content của bảng (không dùng API Meta chính thức)
"""
import argparse
from playwright.sync_api import sync_playwright
import json
import time
import os
import sys


def parse_metrics(row_lines):
    # Clean up values
    cleaned_metrics = []
    for val in row_lines:
        val_clean = val.replace(",", "").strip()
        cleaned_metrics.append(val_clean)
        
    # Find all currency elements
    currency_indices = []
    for idx, val in enumerate(cleaned_metrics):
        if "₫" in val:
            currency_indices.append(idx)
            
    spend = 0
    spend_idx = -1
    cost_per_result = 0
    
    # Filter out budget currency values (followed by Daily/Lifetime)
    metric_currencies = []
    for idx in currency_indices:
        if idx + 1 < len(cleaned_metrics) and cleaned_metrics[idx + 1].lower() in ["daily", "lifetime"]:
            continue
        digits = "".join(c for c in cleaned_metrics[idx] if c.isdigit())
        if digits:
            metric_currencies.append((idx, int(digits)))
            
    if len(metric_currencies) >= 2:
        # The last one is spend, the one before is cost per result
        spend_idx, spend = metric_currencies[-1]
        _, cost_per_result = metric_currencies[-2]
    elif len(metric_currencies) == 1:
        spend_idx, spend = metric_currencies[0]

    # Parse numeric values before spend (Results)
    results = 0
    if spend_idx != -1:
        # Search backwards for Results
        for idx in range(spend_idx - 1, -1, -1):
            val = cleaned_metrics[idx]
            if "₫" in val:
                continue
            # Skip footnotes e.g. [2] or strings containing brackets
            if "[" in val or "]" in val:
                continue
            val_lower = val.lower()
            if any(w in val_lower for w in ["click", "view", "day", "ongoing", "active", "off", "review", "learning", "pending", "completed"]):
                continue
            digits = "".join(c for c in val if c.isdigit())
            if digits:
                results = int(digits)
                break

    # Parse numeric values after spend (Impressions, Reach)
    impressions = 0
    reach = 0
    after_spend_nums = []
    if spend_idx != -1:
        for idx in range(spend_idx + 1, len(cleaned_metrics)):
            val = cleaned_metrics[idx]
            if "₫" in val:
                continue
            if "[" in val or "]" in val:
                continue
            val_lower = val.lower()
            if any(w in val_lower for w in ["click", "view", "day", "ongoing", "active", "off", "review", "learning", "pending", "completed"]):
                continue
            digits = "".join(c for c in val if c.isdigit())
            if digits:
                after_spend_nums.append(int(digits))
                
    if len(after_spend_nums) >= 2:
        impressions = after_spend_nums[0]
        reach = after_spend_nums[1]
    elif len(after_spend_nums) == 1:
        impressions = after_spend_nums[0]
        
    return {
        "spend": spend,
        "results": results,
        "reach": reach,
        "impressions": impressions,
        "cost_per_result": cost_per_result
    }

def find_campaign_delivery(lines, start_idx, delivery_states):
    for offset in range(1, 8):
        idx = start_idx + offset
        if idx >= len(lines):
            break
        val = lines[idx].lower().strip()
        if val in delivery_states:
            return lines[idx], idx
        # Stop scanning if we hit another campaign prefix to prevent runaway matching
        line_upper = lines[idx].upper()
        if any(line_upper.startswith(p.upper()) for p in ["[WA]", "[WL]", "[ENG]", "[LEADS]", "[SALES]"]):
            break
    return None, -1

def parse_campaigns_from_text(content):
    lines = [line.strip() for line in content.split('\n') if line.strip()]
    
    delivery_states = {
        "off", "active", "in review", "pending", "learning", "learning limited",
        "error", "disabled", "completed", "not delivering", "no ads", "rejected", "archived",
        "payment error", "payment required"
    }
    
    campaign_prefixes = ["[WA]", "[WL]", "[ENG]", "[LEADS]", "[SALES]", "tet 2026", "tet "]
    campaigns = []
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Check if this line is a campaign name candidate
        if any(p.lower() in line.lower() for p in campaign_prefixes):
            # Check if there is a delivery state within next few lines
            delivery, delivery_idx = find_campaign_delivery(lines, i, delivery_states)
            
            if delivery and delivery_idx != -1:
                campaign_name = line.split('\n')[0].strip()
                
                # Gather subsequent columns
                idx = delivery_idx + 1
                row_lines = []
                while idx < len(lines):
                    # Check if next block is a new campaign
                    if any(p.lower() in lines[idx].lower() for p in campaign_prefixes):
                        next_del, _ = find_campaign_delivery(lines, idx, delivery_states)
                        if next_del:
                            break
                    row_lines.append(lines[idx])
                    idx += 1
                    
                # Parse metrics using our unified parser
                metrics = parse_metrics(row_lines)
                
                campaigns.append({
                    "name": campaign_name,
                    "delivery": delivery,
                    "spend": metrics["spend"],
                    "results": metrics["results"],
                    "reach": metrics["reach"],
                    "impressions": metrics["impressions"],
                    "cost_per_result": metrics["cost_per_result"],
                    "goal": "Video views" if "views" in campaign_name.lower() or metrics["results"] == 0 and metrics["spend"] > 0 and "WL" not in campaign_name else "Messages"
                })
                
                i = idx
                continue
        i += 1
        
    return campaigns

def main():
    parser = argparse.ArgumentParser(description="Scrape Facebook Ads Summary based on config.")
    parser.add_argument("--config", type=str, default="configs/academy_config.json", help="Path to config JSON file")
    args = parser.parse_args()
    
    if not os.path.exists(args.config):
        print(f"Error: Config file {args.config} not found.", file=sys.stderr)
        sys.exit(1)
        
    try:
        with open(args.config, "r", encoding="utf-8") as f:
            config = json.load(f)
    except Exception as e:
        print(f"Error reading config file: {e}", file=sys.stderr)
        sys.exit(1)
        
    name = config.get("name", "Wings Business")
    short_name = config.get("short_name", "business")
    ad_account_id = config.get("ad_account_id", "646164975411124")
    business_id = config.get("business_id", "478795852605472")
    data_dir = config.get("data_dir", "data")
    
    os.makedirs(data_dir, exist_ok=True)
    
    print(f"Running Ads Analysis for: {name} (Config: {args.config})...")
    print("Connecting to local Chrome via CDP...")
    try:
        with sync_playwright() as p:
            try:
                browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222")
            except Exception as e:
                print(f"Error connecting to Chrome: {e}", file=sys.stderr)
                print("Please make sure Chrome is running with remote debugging port 9222.", file=sys.stderr)
                sys.exit(1)

            print("Connected! Fetching pages/contexts...")
            
            page = None
            for context in browser.contexts:
                for p_obj in context.pages:
                    url = p_obj.url
                    print(f"Found open tab: {url}")
                    # Match adsmanager campaigns tab
                    if "adsmanager.facebook.com/adsmanager/manage/campaigns" in url and f"act={ad_account_id}" in url:
                        print("Found matching Facebook Ads Manager page!")
                        page = p_obj
                        break
                if page:
                    break
                    
            if not page:
                target_url = f"https://adsmanager.facebook.com/adsmanager/manage/campaigns?act={ad_account_id}&business_id={business_id}"
                print(f"Target tab not found in active contexts. Opening a new tab with the target URL: {target_url}")
                context = browser.contexts[0] if browser.contexts else browser.new_context()
                page = context.new_page()
                page.goto(target_url)

             # Set a wide viewport so that all columns (Spend, Impressions, Reach) are rendered in the DOM
            print("Setting viewport size to 2500x1080 to prevent virtual columns from being hidden...")
            page.set_viewport_size({"width": 2500, "height": 1080})

            # Bring page to front and wait
            page.bring_to_front()
            print("Waiting 15 seconds for the page contents and table grid to render...")
            time.sleep(15)
            
            # Save screenshot to data directory
            screenshot_path = os.path.join(data_dir, "ads_page_screenshot.png")
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"Screenshot saved to {screenshot_path}")
            
            # Save copy to artifact directory
            artifact_dir = "/Users/dannydo/.gemini/antigravity/brain/571c4275-e181-4a09-b07b-30bc5fe31b09"
            if os.path.exists(artifact_dir):
                artifact_screenshot = os.path.join(artifact_dir, f"{short_name}_ads_page_screenshot.png")
                page.screenshot(path=artifact_screenshot, full_page=True)
                print(f"Artifact screenshot saved to {artifact_screenshot}")
            
            print("Extracting page content...")
            title = page.title()
            current_url = page.url
            
            # Extract via DOM evaluations first (Layer 1)
            parsed_campaigns = []
            try:
                dom_result = page.evaluate("""() => {
                    const headerElements = Array.from(document.querySelectorAll('[role="columnheader"]'));
                    const headers = headerElements.map(el => el.innerText ? el.innerText.trim() : '');
                    
                    const rowElements = Array.from(document.querySelectorAll('[role="row"]'));
                    const campaigns = [];
                    
                    rowElements.forEach(row => {
                        const cellElements = Array.from(row.querySelectorAll('[role="gridcell"]'));
                        if (cellElements.length === 0) return;
                        
                        const rowData = {};
                        cellElements.forEach((cell, idx) => {
                            const header = headers[idx] || `col_${idx}`;
                            rowData[header] = cell.innerText ? cell.innerText.trim() : '';
                        });
                        
                        let campaignName = rowData['Campaign'] || rowData['Campaign name'];
                        if (!campaignName) {
                            const nameCell = cellElements.find(c => {
                                const txt = c.innerText || '';
                                return txt.includes('[WA]') || txt.includes('[WL]') || txt.includes('Tet ') || txt.includes('[ENG]') || txt.includes('[LEADS]') || txt.includes('[SALES]');
                            });
                            if (nameCell) campaignName = nameCell.innerText.trim();
                        }
                        
                        if (campaignName) {
                            const cleanName = campaignName.split('\\n')[0].trim();
                            if (cleanName.includes('[WA]') || cleanName.includes('[WL]') || cleanName.includes('Tet ') || cleanName.includes('[ENG]') || cleanName.includes('[LEADS]') || cleanName.includes('[SALES]')) {
                                let delivery = rowData['Delivery'] || '';
                                if (!delivery) {
                                    const delCell = cellElements.find(c => {
                                        const txt = (c.innerText || '').toLowerCase().trim();
                                        return ['active', 'off', 'in review', 'learning', 'pending', 'learning limited', 'not delivering', 'no ads', 'rejected', 'completed', 'payment error', 'payment required'].includes(txt);
                                    });
                                    if (delCell) delivery = delCell.innerText.trim();
                                }
                                
                                const cellTexts = cellElements.map(c => c.innerText ? c.innerText.trim() : '');
                                campaigns.push({
                                    name: cleanName,
                                    delivery: delivery,
                                    cellTexts: cellTexts
                                });
                            }
                        }
                    });
                    
                    return campaigns;
                }""")
                
                if dom_result:
                    print(f"DOM scraper found {len(dom_result)} campaigns. Parsing metrics...")
                    for c in dom_result:
                        metrics = parse_metrics(c["cellTexts"])
                        parsed_campaigns.append({
                            "name": c["name"],
                            "delivery": c["delivery"],
                            "spend": metrics["spend"],
                            "results": metrics["results"],
                            "reach": metrics["reach"],
                            "impressions": metrics["impressions"],
                            "cost_per_result": metrics["cost_per_result"],
                            "goal": "Video views" if "views" in c["name"].lower() or metrics["results"] == 0 and metrics["spend"] > 0 and "WL" not in c["name"] else "Messages"
                        })
            except Exception as dom_err:
                print(f"DOM scraper error: {dom_err}. Falling back to Text parser.")
                
            # Extract via Text fallback if DOM returned empty (Layer 2)
            body_text = page.locator("body").inner_text()
            
            # Save raw body text to a file for backup
            body_text_path = os.path.join(data_dir, "ads_body_text.txt")
            with open(body_text_path, "w", encoding="utf-8") as f:
                f.write(body_text)
            print(f"Body text saved to {body_text_path}")
            
            if not parsed_campaigns:
                print("Running Text-based fallback parser...")
                parsed_campaigns = parse_campaigns_from_text(body_text)
                
            print(f"Parsed {len(parsed_campaigns)} campaigns successfully.")
            for c in parsed_campaigns:
                print(f" - {c['name']}: Spend={c['spend']}, Results={c['results']}, Reach={c['reach']}, Delivery={c['delivery']}")
                
            # Extract elements for backward compatibility
            elements_data = page.evaluate("""() => {
                const results = [];
                document.querySelectorAll('span, div, h1, h2, h3').forEach(el => {
                    const text = el.innerText ? el.innerText.trim() : '';
                    if (text && text.length > 2 && text.length < 200) {
                        results.push(text);
                    }
                });
                return Array.from(new Set(results));
            }""")
            
            data = {
                "title": title,
                "url": current_url,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "campaigns": parsed_campaigns,
                "elements": elements_data[:200]
            }
            
            data_json_path = os.path.join(data_dir, "ads_data.json")
            with open(data_json_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"Data saved to {data_json_path}")
            
            browser.close()
            print("Done! Connection closed successfully.")
            
    except Exception as e:
        print(f"An unexpected error occurred: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
