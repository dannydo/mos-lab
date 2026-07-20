"""
get_locations.py
----------------
MỤC ĐÍCH:
    Cào dữ liệu địa lý (thành phố, quận) của chiến dịch quảng cáo
    từ Meta Ads Manager bằng Playwright CDP.

CHẠY VỚI:
    .venv/bin/python get_locations.py [--config configs/academy_config.json]
    make sync-locations

THAM SỐ:
    --config  Path đến file JSON cấu hình (default: configs/academy_config.json)

ĐẦU VÀO:
    configs/academy_config.json | configs/lashes_config.json
    Chrome đang chạy ở debug port 9222 với Ads Manager đang mở

ĐẦU RA:
    data/academy/locations_data.json | data/lashes/locations_data.json
    Format: [{ city, district, impressions, reach, clicks }]

PHỤ THUỘC:
    playwright, Chrome remote debugging port 9222
"""
import argparse
from playwright.sync_api import sync_playwright
import json
import time
import os
import sys


def main():
    parser = argparse.ArgumentParser(description="Scrape Facebook Ads Locations based on config.")
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
    data_dir = config.get("data_dir", "data")
    
    os.makedirs(data_dir, exist_ok=True)
    
    print(f"Running Location Analysis for: {name} (Config: {args.config})...")
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
                    if "business.facebook.com/latest/ad_center/ads_summary" in url:
                        page = p_obj
                        break
                if page:
                    break
                    
            if not page:
                asset_id = config.get("asset_id", "227058864869557")
                business_id = config.get("business_id", "478795852605472")
                target_url = f"https://business.facebook.com/latest/ad_center/ads_summary/?asset_id={asset_id}&business_id={business_id}"
                print(f"Facebook Ads Summary page not found in active contexts. Opening a new tab with the target URL: {target_url}")
                context = browser.contexts[0] if browser.contexts else browser.new_context()
                page = context.new_page()
                page.goto(target_url)
                print("Waiting 15 seconds for the page contents to render...")
                time.sleep(15)
            else:
                asset_id = config.get("asset_id", "227058864869557")
                business_id = config.get("business_id", "478795852605472")
                target_url = f"https://business.facebook.com/latest/ad_center/ads_summary/?asset_id={asset_id}&business_id={business_id}"
                if f"asset_id={asset_id}" not in page.url:
                    print(f"Navigating existing Ads Summary tab to target URL: {target_url}")
                    page.goto(target_url)
                    print("Waiting 15 seconds for the page contents to render...")
                    time.sleep(15)
                else:
                    print("Facebook Ads Summary page already open in context. Waiting 2 seconds...")
                    time.sleep(2)

            page.bring_to_front()
            
            # Locate and click the "Locations" tab
            print("Locating 'Locations' button...")
            clicked = False
            
            # Method 1: Get by text
            try:
                locations_btn = page.get_by_text("Locations", exact=True)
                if locations_btn.count() > 0:
                    locations_btn.first.click()
                    print("Clicked 'Locations' using text match.")
                    clicked = True
            except Exception as e:
                print(f"Method 1 failed: {e}")
                
            # Method 2: Click via JS if text click didn't work
            if not clicked:
                try:
                    page.evaluate("""() => {
                        const elements = Array.from(document.querySelectorAll('div, span, button'));
                        const btn = elements.find(el => el.innerText && el.innerText.trim() === 'Locations');
                        if (btn) {
                            btn.click();
                            return true;
                        }
                        return false;
                    }""")
                    print("Clicked 'Locations' using JS evaluation.")
                    clicked = True
                except Exception as e:
                    print(f"Method 2 failed: {e}")

            if not clicked:
                print("Failed to click the Locations button automatically. Please click it manually in your Chrome window.")
                time.sleep(5)
            else:
                print("Waiting 5 seconds for the location data to load...")
                time.sleep(5)

            # Take screenshot of the locations tab
            screenshot_path = os.path.join(data_dir, "locations_screenshot.png")
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"Screenshot saved to {screenshot_path}")
            
            # Save copy to artifact directory
            artifact_dir = "/Users/dannydo/.gemini/antigravity/brain/1f167522-f0cf-4087-978c-6de0197d914a"
            if os.path.exists(artifact_dir):
                artifact_screenshot = os.path.join(artifact_dir, f"{short_name}_locations_screenshot.png")
                page.screenshot(path=artifact_screenshot, full_page=True)
                print(f"Artifact screenshot saved to {artifact_screenshot}")

            # Extract the text content of the page now
            body_text = page.locator("body").inner_text()
            
            body_text_path = os.path.join(data_dir, "locations_body_text.txt")
            with open(body_text_path, "w", encoding="utf-8") as f:
                f.write(body_text)
            print(f"Saved body text to {body_text_path}")
            
            # Evaluate script to get specific list elements
            locations_data = page.evaluate("""() => {
                const results = [];
                document.querySelectorAll('span, div').forEach(el => {
                    const text = el.innerText ? el.innerText.trim() : '';
                    if (text && text.length > 1 && text.length < 150) {
                        results.push(text);
                    }
                });
                return Array.from(new Set(results));
            }""")
            
            data = {
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "elements": locations_data[:200]
            }
            
            data_json_path = os.path.join(data_dir, "locations_data.json")
            with open(data_json_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"Locations data saved to {data_json_path}")
            
            browser.close()
            print("Finished!")
            
    except Exception as e:
        print(f"Error during locations scraping: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
