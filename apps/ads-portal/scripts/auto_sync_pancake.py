#!/usr/bin/env python3
"""
auto_sync_pancake.py
---------------------
Tự động lấy JWT token từ trình duyệt Chrome của người dùng qua CDP,
sau đó đồng bộ khách hàng từ Pancake POS và các cuộc hội thoại từ Pancake Inbox (pages.fm)
sang bảng leads trong Supabase.

Đầu ra của script là một chuỗi JSON chứa trạng thái kết quả.
"""

import sys
import os
import json
import time
from playwright.sync_api import sync_playwright

from lib.phone import normalize_phone
from lib.pancake_client import (
    SHOPS, ACTIVE_PAGES,
    fetch_all_customers, fetch_inbox_conversations,
    map_customer_to_lead, map_conversation_to_lead,
    pancake_get, get_avatar_url,
    resolve_avatars_concurrently,
)
from lib.supabase_client import (
    get_existing_leads_keys, update_lead, insert_leads_batch,
    check_avatar_url_column_exists,
)

# ─── Cookie Retrieval via CDP ──────────────────────────────────────────────────
def get_pancake_jwt_via_cdp():
    """Connect to Chrome on 9222, retrieve jwt cookie. If not present, open login page."""
    try:
        with sync_playwright() as p:
            browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222")

            pancake_jwt = None

            # 1. First search through all existing pages in all contexts for the cookie via document.cookie
            for context in browser.contexts:
                for page in context.pages:
                    try:
                        url = page.url
                        if "pancake.vn" in url:
                            cookies_str = page.evaluate("document.cookie")
                            for part in cookies_str.split(";"):
                                part = part.strip()
                                if part.startswith("jwt="):
                                    pancake_jwt = part.split("=", 1)[1]
                                    break
                                elif part.startswith("pos_jwt=") and not pancake_jwt:
                                    pancake_jwt = part.split("=", 1)[1]
                    except Exception:
                        continue
                    if pancake_jwt:
                        break
                if pancake_jwt:
                    break

            if pancake_jwt:
                return pancake_jwt

            # 2. Token not found, open pancake.vn in the first context to trigger login
            if browser.contexts:
                context = browser.contexts[0]
                login_page = context.new_page()
                login_page.goto("https://pancake.vn/")

                # Wait up to 10 seconds for user login/auto-login
                for _ in range(10):
                    time.sleep(1)
                    try:
                        cookies_str = login_page.evaluate("document.cookie")
                        for part in cookies_str.split(";"):
                            part = part.strip()
                            if part.startswith("jwt="):
                                pancake_jwt = part.split("=", 1)[1]
                                break
                            elif part.startswith("pos_jwt=") and not pancake_jwt:
                                pancake_jwt = part.split("=", 1)[1]
                    except Exception:
                        pass
                    if pancake_jwt:
                        break

                login_page.close()
            return pancake_jwt

    except Exception:
        return None


def validate_pancake_jwt(pos_jwt):
    try:
        cookie_str = f"jwt={pos_jwt}; pos_jwt={pos_jwt}; pos_locale=vi; pos_country=VN"
        # Call a lightweight Pancake API to test token validity
        url = "https://pos.pancake.vn/api/v1/shops"
        res = pancake_get(url, pos_jwt, cookie_str)
        if isinstance(res, dict) and res.get("success") is True:
            return True
    except Exception:
        pass
    return False



# ─── Main Execution Flow ───────────────────────────────────────────────────────
def main():
    # Attempt to read token from cache
    project_dir = os.path.dirname(os.path.abspath(__file__))
    cache_path = os.path.join(project_dir, "configs/pancake_jwt.json")
    pos_jwt = None
    
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                cache_data = json.load(f)
                cached_jwt = cache_data.get("jwt")
                if cached_jwt and validate_pancake_jwt(cached_jwt):
                    pos_jwt = cached_jwt
        except Exception:
            pass

    if not pos_jwt:
        # Fallback to browser CDP retrieval
        pos_jwt = get_pancake_jwt_via_cdp()
        
        # Save token to cache if retrieved successfully
        if pos_jwt:
            try:
                os.makedirs(os.path.dirname(cache_path), exist_ok=True)
                with open(cache_path, "w", encoding="utf-8") as f:
                    json.dump({"jwt": pos_jwt}, f)
            except Exception:
                pass

    if not pos_jwt:
        print(json.dumps({
            "status": "needs_login",
            "message": "Không tìm thấy token. Vui lòng đăng nhập Pancake trên tab trình duyệt vừa mở."
        }, ensure_ascii=False))
        sys.exit(0)

    cookie_str = f"jwt={pos_jwt}; pos_jwt={pos_jwt}; pos_locale=vi; pos_country=VN"

    # Step 2. Get existing keys
    try:
        existing_pancake_map, existing_leads_map, existing_phone_map = get_existing_leads_keys()
    except Exception as e:
        print(json.dumps({
            "status": "error",
            "message": f"Không thể kết nối Supabase: {str(e)}"
        }, ensure_ascii=False))
        sys.exit(1)

    db_supports_avatar = check_avatar_url_column_exists()
    all_leads = []

    # Step 3. Fetch from POS shops
    for shop in SHOPS:
        try:
            customers = fetch_all_customers(shop["id"], pos_jwt, cookie_str)
            shop_leads = [map_customer_to_lead(c, shop["source"]) for c in customers]
            all_leads.extend(shop_leads)
        except Exception:
            continue

    # Step 3b. Fetch from Pancake Inbox (pages.fm) conversations
    for page in ACTIVE_PAGES:
        try:
            convs = fetch_inbox_conversations(page["id"], pos_jwt, cookie_str)
            for c in convs:
                lead = map_conversation_to_lead(c, page["source"])
                # We sync all chat threads (those without phone numbers default to 'Chatting' status)
                all_leads.append(lead)
        except Exception:
            continue

    # Step 4. Deduplicate and merge
    new_leads = []
    leads_to_update = []

    avatar_tasks = []
    leads_to_process = []

    for l in all_leads:
        p_id = l["pancake_id"]
        psid = l["facebook_psid"]
        phone = l["phone"]
        norm_phone = normalize_phone(phone) if phone else None

        db_lead = None
        if p_id in existing_pancake_map:
            db_lead = existing_pancake_map[p_id]
        elif psid in existing_leads_map:
            db_lead = existing_leads_map[psid]
        elif norm_phone in existing_phone_map:
            db_lead = existing_phone_map[norm_phone]

        leads_to_process.append((l, db_lead, p_id, psid, phone, norm_phone))

        if db_supports_avatar and psid:
            page_id = l.get("page_id")
            if page_id:
                if not db_lead:
                    avatar_tasks.append({"page_id": page_id, "psid": psid})

    # Limit avatar tasks to avoid hitting rate limits and long hangs
    avatar_tasks = avatar_tasks[:100]

    # Concurrently resolve avatar URLs
    resolved_avatars = {}
    if db_supports_avatar and avatar_tasks:
        resolved_avatars = resolve_avatars_concurrently(avatar_tasks, pos_jwt)

    # Construct updates and inserts
    seen_new_pancake_ids = set()
    seen_new_psids = set()
    seen_new_phones = set()
    for l, db_lead, p_id, psid, phone, norm_phone in leads_to_process:
        page_id = l.get("page_id")
        avatar_url = resolved_avatars.get((page_id, psid)) if psid and page_id else None

        if db_lead:
            updated_fields = {}
            if not db_lead.get("pancake_id") and p_id:
                updated_fields["pancake_id"] = p_id
            if not db_lead.get("phone") and phone:
                updated_fields["phone"] = phone
            if avatar_url:
                updated_fields["avatar_url"] = avatar_url

            l.pop("page_id", None)
            if updated_fields:
                leads_to_update.append((db_lead["id"], updated_fields, l["name"]))
        else:
            if avatar_url:
                l["avatar_url"] = avatar_url
            l.pop("page_id", None)
            
            # Deduplicate by pancake_id, facebook_psid, and phone to avoid unique constraint violations
            is_dup = False
            if p_id:
                if p_id in seen_new_pancake_ids:
                    is_dup = True
                else:
                    seen_new_pancake_ids.add(p_id)
            if psid:
                if psid in seen_new_psids:
                    is_dup = True
                else:
                    seen_new_psids.add(psid)
            if norm_phone:
                if norm_phone in seen_new_phones:
                    is_dup = True
                else:
                    seen_new_phones.add(norm_phone)
            
            if is_dup:
                continue
                
            new_leads.append(l)

    # Step 5. Perform Database updates
    updated_count = 0
    inserted_count = 0

    if leads_to_update:
        for lid, fields, name in leads_to_update:
            if update_lead(lid, fields):
                updated_count += 1

    BATCH_SIZE = 50
    if new_leads:
        for i in range(0, len(new_leads), BATCH_SIZE):
            batch = new_leads[i:i + BATCH_SIZE]
            inserted_count += insert_leads_batch(batch)

    skipped_count = len(all_leads) - len(new_leads) - len(leads_to_update)

    print(json.dumps({
        "status": "success",
        "fetched": len(all_leads),
        "inserted": inserted_count,
        "updated": updated_count,
        "skipped": skipped_count
    }, ensure_ascii=False))

if __name__ == "__main__":
    main()
