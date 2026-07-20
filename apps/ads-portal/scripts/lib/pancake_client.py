"""
lib/pancake_client.py
---------------------
Shared Pancake POS & Inbox API helpers used by sync scripts.
"""

import json
import time
import urllib.request
from datetime import datetime, timezone

from lib.phone import PHONE_REGEX

# ─── Pancake POS Shop Configuration ────────────────────────────────────────────
PANCAKE_API_BASE = "https://pos.pancake.vn/api/v1"
SHOPS = [
    {"id": 100128514,  "name": "Wings Academy", "source": "Pancake Academy"},
    {"id": 1635179379, "name": "Wings Lashes",  "source": "Pancake Lashes"},
]
PAGE_SIZE = 50

# ─── Pancake Inbox Configurations ──────────────────────────────────────────────
ACTIVE_PAGES = [
    {"id": "227058864869557", "name": "Wings Academy (FB)", "source": "Pancake Academy"},
    {"id": "ttm_-000tBw2dz-GuAAp-4598GQtIuDwdUzuwoMf", "name": "Wings Academy (TikTok)", "source": "Pancake Academy"},
    {"id": "36576552371990743", "name": "Wings Lashes (FB)", "source": "Pancake Lashes"},
    {"id": "zl_1866214625562398870", "name": "Wings Lashes (Zalo)", "source": "Pancake Lashes"},
    {"id": "igo_17841436773790726", "name": "Wings Lashes (IG)", "source": "Pancake Lashes"},
    {"id": "pzl_776542542344553901", "name": "Wings Lashes (P.Zalo)", "source": "Pancake Lashes"},
    {"id": "waba_230418473492042", "name": "Wings Lashes (WhatsApp)", "source": "Pancake Lashes"}
]


def pancake_get(url: str, jwt: str, cookie_str: str = "") -> dict:
    """Make a GET request to Pancake API."""
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {jwt}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    req.add_header("Origin", "https://pancake.vn")
    req.add_header("Referer", "https://pancake.vn/")
    req.add_header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    if cookie_str:
        req.add_header("Cookie", cookie_str)

    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_all_customers(shop_id: int, jwt: str, cookie_str: str = "") -> list:
    """Fetch all customers from a Pancake POS shop with pagination."""
    all_customers = []
    page = 1
    total_pages = None

    while True:
        url = f"{PANCAKE_API_BASE}/shops/{shop_id}/customers?page={page}&limit={PAGE_SIZE}"
        try:
            data = pancake_get(url, jwt, cookie_str)
        except Exception:
            break

        if total_pages is None:
            total_pages = data.get("total_pages", 1)

        customers = data.get("data", [])
        if not customers:
            break

        all_customers.extend(customers)
        if page >= total_pages:
            break

        page += 1
        time.sleep(0.1)

    return all_customers


def fetch_inbox_conversations(page_id: str, jwt: str, cookie_str: str = "") -> list:
    """Fetch all 2026 conversations from a Pancake Inbox page with offset pagination."""
    all_conversations = []
    offset = 0
    seen_ids = set()

    while True:
        url = f"https://pancake.vn/api/v1/pages/{page_id}/conversations?access_token={jwt}&current_count={offset}"
        try:
            data = pancake_get(url, jwt, cookie_str)
        except Exception:
            break

        convs = data.get("conversations", [])
        if not convs:
            break

        new_convs = []
        for c in convs:
            cid = c.get("id")
            if cid not in seen_ids:
                seen_ids.add(cid)
                new_convs.append(c)

        if not new_convs:
            break

        has_2026 = False
        for c in new_convs:
            updated_at = c.get("updated_at") or ""
            if updated_at.startswith("2026-"):
                has_2026 = True
                all_conversations.append(c)

        if not has_2026:
            break

        offset += len(convs)
        time.sleep(0.1)

    return all_conversations


def map_customer_to_lead(customer: dict, source: str) -> dict:
    """Map a Pancake POS customer record to a Supabase leads row."""
    shop_customer = customer.get("shop_customer") or {}
    phone_numbers = customer.get("phone_numbers") or []
    phone = phone_numbers[0] if phone_numbers else None

    psid = customer.get("psid") or customer.get("fb_id")
    # Filter out UUIDs which are POS customer IDs, not conversation thread IDs
    if psid and isinstance(psid, str) and "-" in psid and len(psid) > 30:
        psid = None

    fb_chat_link = None
    if psid:
        if "_" in str(psid):
            page_id = str(psid).split("_")[0]
            fb_chat_link = f"https://pancake.vn/{page_id}?c_id={psid}"
        else:
            page_id = "227058864869557" if "Academy" in source else "681819875210688"
            fb_chat_link = f"https://pancake.vn/{page_id}?c_id={page_id}_{psid}"

    ad_clicks = customer.get("ad_click") or []
    notes = ""
    if ad_clicks:
        ad_ids = [ac.get("ad_id", "") for ac in ad_clicks if ac.get("ad_id")]
        if ad_ids:
            notes = f"Ad click: {', '.join(ad_ids)}"

    inserted_at = shop_customer.get("inserted_at")
    created_at = None
    if inserted_at:
        try:
            dt = datetime.fromisoformat(inserted_at.replace("Z", "+00:00"))
            created_at = dt.isoformat()
        except ValueError:
            created_at = datetime.now(timezone.utc).isoformat()
    else:
        created_at = datetime.now(timezone.utc).isoformat()

    cust_page_id = customer.get("page_id") or shop_customer.get("page_id")
    if not cust_page_id and psid and "_" in str(psid):
        cust_page_id = str(psid).split("_")[0]

    return {
        "pancake_id": customer.get("id"),
        "name": customer.get("name") or "Không rõ tên",
        "phone": phone,
        "email": None,
        "status": "New",
        "source": source,
        "notes": notes or "Khách hàng từ Pancake POS",
        "facebook_chat_link": fb_chat_link,
        "facebook_psid": psid,
        "assigned_staff": None,
        "created_at": created_at,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "page_id": cust_page_id,
    }


def map_conversation_to_lead(conv: dict, source: str) -> dict:
    """Map a Pancake Inbox conversation to a Supabase leads row."""
    phones = []
    recent = conv.get("recent_phone_numbers") or []
    for r in recent:
        if isinstance(r, dict) and r.get("phone_number"):
            phones.append(r.get("phone_number"))
        elif isinstance(r, str):
            phones.append(r)

    snippet = conv.get("snippet") or ""
    matches = PHONE_REGEX.findall(snippet)
    for m in matches:
        phones.append(m)

    phone = phones[0] if phones else None

    customer_name = "Không rõ tên"
    custs = conv.get("customers") or []
    if custs and isinstance(custs, list):
        customer_name = custs[0].get("name") or customer_name
    elif conv.get("from") and isinstance(conv.get("from"), dict):
        customer_name = conv.get("from").get("name") or customer_name

    psid = conv.get("from_psid") or conv.get("psid") or conv.get("fb_id")
    if not psid and "_" in conv.get("id", ""):
        psid = conv.get("id").split("_")[-1]

    # Filter out UUIDs which are POS customer IDs, not conversation thread IDs
    if psid and isinstance(psid, str) and "-" in psid and len(psid) > 30:
        psid = None

    c_id = conv.get("id") or psid
    if c_id and isinstance(c_id, str) and "-" in c_id and len(c_id) > 30:
        c_id = psid

    fb_chat_link = None
    if c_id:
        if "_" in str(c_id):
            page_id = str(c_id).split("_")[0]
            fb_chat_link = f"https://pancake.vn/{page_id}?c_id={c_id}"
        else:
            page_id = "227058864869557" if "Academy" in source else "681819875210688"
            fb_chat_link = f"https://pancake.vn/{page_id}?c_id={page_id}_{c_id}"

    updated_at = conv.get("updated_at")
    created_at = None
    if updated_at:
        try:
            dt = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
            created_at = dt.isoformat()
        except ValueError:
            created_at = datetime.now(timezone.utc).isoformat()
    else:
        created_at = datetime.now(timezone.utc).isoformat()

    conv_page_id = conv.get("page_id")
    if not conv_page_id and c_id and "_" in str(c_id):
        conv_page_id = str(c_id).split("_")[0]

    return {
        "pancake_id": conv.get("id"),
        "name": customer_name,
        "phone": phone,
        "email": None,
        "status": "New",
        "source": source,
        "notes": snippet[:200] if snippet else "Khách nhắn tin quan tâm qua Fanpage",
        "facebook_chat_link": fb_chat_link,
        "facebook_psid": psid,
        "assigned_staff": None,
        "created_at": created_at,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "page_id": conv_page_id,
    }


def get_avatar_url(page_id: str, psid: str, jwt: str) -> str:
    """Resolve the customer's permanent avatar URL from Pancake's API/CDN.
    Sends a HEAD request and follows redirects to get the static content.pancake.vn URL.
    """
    if not page_id or not psid or not jwt:
        return None

    clean_psid = str(psid)
    if "_" in clean_psid:
        clean_psid = clean_psid.split("_")[-1]

    clean_page_id = str(page_id)
    if "_" in clean_page_id:
        clean_page_id = clean_page_id.split("_")[-1]

    url = f"https://pancake.vn/api/v1/pages/{clean_page_id}/avatar/{clean_psid}?access_token={jwt}"
    
    req = urllib.request.Request(url, method="HEAD")
    req.add_header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            final_url = resp.url
            if "content.pancake.vn" in final_url or "fbcdn" in final_url or "zalo" in final_url:
                return final_url
            if resp.status == 200 and "pancake.vn" not in final_url:
                return final_url
    except Exception:
        pass
    return None


def resolve_avatars_concurrently(tasks, jwt, max_workers=25):
    """Concurrently resolve avatar URLs for multiple leads."""
    from concurrent.futures import ThreadPoolExecutor, as_completed
    results = {}
    if not tasks:
        return results

    # Deduplicate tasks by (page_id, psid)
    unique_tasks = []
    seen = set()
    for t in tasks:
        key = (t["page_id"], t["psid"])
        if key not in seen:
            seen.add(key)
            unique_tasks.append(t)

    def fetch_one(page_id, psid):
        return (page_id, psid), get_avatar_url(page_id, psid, jwt)

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(fetch_one, t["page_id"], t["psid"]): (t["page_id"], t["psid"])
            for t in unique_tasks
        }
        for future in as_completed(futures):
            try:
                key, url = future.result()
                if url:
                    results[key] = url
            except Exception:
                pass
    return results

