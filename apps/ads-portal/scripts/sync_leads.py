"""
sync_leads.py
-------------
MỤC ĐÍCH:
    Script legacy cào leads từ Pancake bằng cách điều hướng browser UI
    qua Playwright CDP (không dùng API). Thích hợp khi JWT không available.

CHẠY VỚI:
    .venv/bin/python sync_leads.py

ĐẦU VÀO:
    Chrome đang chạy ở debug port 9222 và đã đăng nhập Pancake inbox

ĐẦU RA:
    Chèn / cập nhật leads vào Supabase bảng 'leads' (qua SUPABASE_URL/SERVICE_KEY)

PHỤ THUỘC:
    playwright, lib/env.py (SUPABASE_URL, SUPABASE_SERVICE_KEY)
    Chrome remote debugging port 9222

SO SÁNH VỚI CÁC SCRIPT KHÁC:
    - sync_pancake_leads.py: dùng API + JWT (nhanh hơn, cần token)
    - auto_sync_pancake.py: dùng CDP để lấy JWT → sau đó dùng API (khuyên dùng)
    - sync_leads.py (file này): dùng browser UI scraping (chậm, legacy fallback)
"""
import os
import re
import json
import time
import urllib.request
import urllib.error
from playwright.sync_api import sync_playwright


from lib.env import SUPABASE_URL, SUPABASE_SERVICE_KEY

# Regex to detect Vietnamese phone numbers
PHONE_REGEX = re.compile(r'(?:0|\+84)(?:3[2-9]|5[25689]|7[0|6-9]|8[1-9]|9[0-9])\d{7}\b')
EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')

# UI text words to ignore when scanning for client names
IGNORE_KEYWORDS = {
    "inbox", "respond", "messages", "set up", "automations", "create", "messaging", "insights",
    "availability", "status", "available", "settings", "all messages", "messenger", "instagram",
    "whatsapp", "new", "facebook comments", "instagram comments", "search", "manage", "unread",
    "priority", "ad replies", "follow up", "close", "create ad", "connect", "not now",
    "assign this conversation", "move to spam", "delete conversation", "mark as follow up",
    "mark as unread", "move to done", "you:", "today", "yesterday", "sunday", "monday",
    "tuesday", "wednesday", "thursday", "friday", "saturday", "sun", "mon", "tue", "wed", "thu", "fri", "sat"
}

def clean_text(text):
    if not text:
        return ""
    return re.sub(r'\s+', ' ', text).strip()

def extract_leads_from_page(page):
    print("Scanning Inbox elements for conversations...")
    
    # Run evaluation in page context to get list of visible text blocks
    all_texts = page.evaluate("""() => {
        const results = [];
        // Extract all visible spans/divs text
        const elements = document.querySelectorAll('span, div[role="gridcell"], div[role="row"]');
        elements.forEach(el => {
            const txt = el.innerText ? el.innerText.trim() : '';
            if (txt && txt.length > 2 && txt.length < 100) {
                results.push(txt);
            }
        });
        return results;
    }""")
    
    # Heuristically detect names from the thread list
    detected_names = []
    for txt in all_texts:
        cleaned = clean_text(txt)
        lower_txt = cleaned.lower()
        
        # Skip UI keywords, dates, times, message indicators
        if any(kw in lower_txt for kw in IGNORE_KEYWORDS):
            continue
        if re.search(r'^\d{1,2}:\d{2}$', cleaned): # Time e.g. 11:49
            continue
        if re.search(r'^\d{2}/\d{2}/\d{4}$', cleaned): # Date
            continue
        if len(cleaned) < 3 or len(cleaned) > 25: # Standard name length
            continue
        if not re.search(r'^[a-zA-ZÀ-ỹ\s]+$', cleaned): # Only letters and spaces (Vietnamese unicode)
            continue
            
        if cleaned not in detected_names:
            detected_names.append(cleaned)
            
    print(f"Heuristically detected potential contacts: {detected_names}")
    
    leads = []
    
    for name in detected_names:
        print(f"\n--- Processing conversation for client: {name} ---")
        clicked = False
        try:
            # Locate the thread row and click it
            thread_elem = page.locator(f"text={name}").first
            if thread_elem.count() > 0:
                thread_elem.click()
                clicked = True
                print("Clicked thread row via locator.")
        except Exception as e:
            print(f"Locator click failed for {name}: {e}")
            
        if not clicked:
            try:
                # Fallback to JS click
                clicked = page.evaluate("""(targetName) => {
                    const elements = Array.from(document.querySelectorAll('span, div'));
                    const item = elements.find(el => el.innerText && el.innerText.trim() === targetName);
                    if (item) {
                        item.click();
                        return true;
                    }
                    return false;
                }""", name)
                if clicked:
                    print("Clicked thread row via JS.")
            except Exception as e:
                print(f"JS click failed for {name}: {e}")
                
        if clicked:
            # Wait for conversation window to load
            time.sleep(3)
            
            # Get current chat page URL
            chat_url = page.url
            print(f"Conversation Link: {chat_url}")
            
            # Extract messages in current chat
            chat_messages = page.evaluate("""() => {
                const results = [];
                // Target elements that typically contain message bubbles
                const msgElems = document.querySelectorAll('span, div[role="presentation"], div[dir="auto"]');
                msgElems.forEach(el => {
                    const text = el.innerText ? el.innerText.trim() : '';
                    if (text && text.length > 2 && text.length < 500) {
                        results.push(text);
                    }
                });
                return Array.from(new Set(results));
            }""")
            
            # Combine messages text for scanning phone/email
            full_chat_text = "\n".join(chat_messages)
            
            # Extract phone and email
            phones = PHONE_REGEX.findall(full_chat_text)
            emails = EMAIL_REGEX.findall(full_chat_text)
            
            phone = phones[0] if phones else None
            email = emails[0].lower() if emails else None
            
            # Clean notes: collect messages containing questions or phone mentions
            relevant_messages = []
            for msg in chat_messages:
                lower_msg = msg.lower()
                if "tư vấn" in lower_msg or "học" in lower_msg or "nối mi" in lower_msg or "giá" in lower_msg or "bao nhiêu" in lower_msg or (phone and phone in msg):
                    relevant_messages.append(msg)
                    
            notes = " | ".join(relevant_messages[-3:]) if relevant_messages else (chat_messages[-1] if chat_messages else "No message preview")
            
            # Determine lead source (default to Academy or Lashes depending on keyword)
            source = "Facebook Academy"
            if "mi" in full_chat_text.lower() and "học" not in full_chat_text.lower():
                source = "Facebook Lashes"
                
            leads.append({
                "name": name,
                "phone": phone,
                "email": email,
                "notes": notes,
                "source": source,
                "facebook_chat_link": chat_url,
                "status": "New"
            })
            print(f"Extracted Lead details -> Phone: {phone}, Email: {email}, Source: {source}")
            
    return leads

def push_leads_to_supabase(leads):
    if not leads:
        print("No leads extracted to sync.")
        return
        
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("Error: Supabase credentials not found in env.")
        return
        
    url = f"{SUPABASE_URL}/rest/v1/leads"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    
    payload = []
    for lead in leads:
        payload.append({
            "name": lead["name"],
            "phone": lead["phone"],
            "email": lead["email"],
            "notes": lead["notes"],
            "source": lead["source"],
            "facebook_chat_link": lead["facebook_chat_link"],
            "status": lead["status"]
        })
        
    req_body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=req_body, headers=headers, method="POST")
    
    try:
        with urllib.request.urlopen(req) as res:
            print(f"\nSuccessfully synced {len(payload)} leads to Supabase! (Status: {res.status})")
            
            # Save local backup in data/leads
            os.makedirs("data/leads", exist_ok=True)
            backup_path = "data/leads/scraped_leads.json"
            with open(backup_path, "w", encoding="utf-8") as f:
                json.dump(leads, f, indent=2, ensure_ascii=False)
            print(f"Backup saved locally to {backup_path}")
            
    except urllib.error.HTTPError as e:
        print(f"HTTP Error syncing leads: {e.code} - {e.reason}")
        print("Response body:", e.read().decode("utf-8"))
    except Exception as e:
        print(f"Error syncing leads: {e}")

def main():
    print("=== STARTING FACEBOOK LEADS SYNC ===")
    
    try:
        with sync_playwright() as p:
            print("Connecting to Chrome on remote-debugging port 9222...")
            browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222")
            
            # Find Facebook Inbox page
            inbox_page = None
            for context in browser.contexts:
                for page in context.pages:
                    if "business.facebook.com/latest/inbox" in page.url:
                        inbox_page = page
                        break
                if inbox_page:
                    break
                    
            if not inbox_page:
                print("Error: Facebook Inbox page not found in Chrome tabs!")
                print("Please open 'https://business.facebook.com/latest/inbox' in your browser and run again.")
                browser.close()
                return
                
            inbox_page.bring_to_front()
            print("Facebook Inbox tab found and active.")
            time.sleep(2)
            
            # Extract leads
            leads = extract_leads_from_page(inbox_page)
            print(f"\nExtracted total: {len(leads)} leads.")
            
            # Sync to Supabase
            push_leads_to_supabase(leads)
            
            browser.close()
            print("\n=== FACEBOOK LEADS SYNC COMPLETED ===")
            
    except Exception as e:
        print(f"CDP connection failed or error occurred: {e}")
        print("Please check that Chrome is running with remote-debugging-port=9222.")

if __name__ == "__main__":
    main()
