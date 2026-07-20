"""
lib/supabase_client.py
-----------------------
Shared Supabase REST API helpers used by all sync scripts.
"""

import json
import urllib.request
import urllib.error
from datetime import datetime, timezone

from lib.env import SUPABASE_URL, SUPABASE_SERVICE_KEY
from lib.phone import normalize_phone


def supabase_request(method: str, path: str, body=None, prefer: str = "") -> tuple:
    """Make a request to Supabase REST API. Returns (status_code, parsed_json)."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise EnvironmentError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")

    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer

    req_body = None
    if body is not None:
        req_body = json.dumps(body, ensure_ascii=False).encode("utf-8")

    req = urllib.request.Request(url, data=req_body, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        raw = resp.read().decode("utf-8")
        return resp.status, json.loads(raw) if raw else []


def get_existing_leads_keys() -> tuple:
    """Fetch all existing pancake_ids, facebook_psids, and phone numbers from Supabase.
    Returns (pancake_ids_set, psid_to_lead_map, phone_to_lead_map).
    """
    all_data = []
    limit = 1000
    offset = 0

    while True:
        try:
            _, data = supabase_request(
                "GET",
                f"leads?select=id,pancake_id,facebook_psid,phone,status,avatar_url&limit={limit}&offset={offset}",
            )
            if not data:
                break
            all_data.extend(data)
            if len(data) < limit:
                break
            offset += limit
        except Exception:
            break

    pancake_map = {row["pancake_id"]: row for row in all_data if row.get("pancake_id")}
    leads_map = {row["facebook_psid"]: row for row in all_data if row.get("facebook_psid")}

    phone_map = {}
    for row in all_data:
        p = row.get("phone")
        if p:
            norm = normalize_phone(p)
            if norm:
                phone_map[norm] = row

    return pancake_map, leads_map, phone_map


def update_lead(lead_id: str, fields: dict) -> bool:
    """Update an existing lead's fields by ID."""
    try:
        body = {**fields, "updated_at": datetime.now(timezone.utc).isoformat()}
        status, _ = supabase_request(
            "PATCH",
            f"leads?id=eq.{lead_id}",
            body=body,
            prefer="return=minimal",
        )
        return status in (200, 204)
    except Exception:
        return False


def insert_leads_batch(leads: list) -> int:
    """Insert a batch of leads into Supabase. Returns the count of successfully inserted leads."""
    if not leads:
        return 0
    try:
        status, _ = supabase_request(
            "POST",
            "leads",
            body=leads,
            prefer="return=minimal",
        )
        if status in (200, 201, 204):
            return len(leads)
    except Exception:
        # Fallback to row-by-row insertion if the batch fails (e.g. unique constraint violation)
        pass

    inserted = 0
    for lead in leads:
        try:
            status, _ = supabase_request(
                "POST",
                "leads",
                body=[lead],
                prefer="return=minimal",
            )
            if status in (200, 201, 204):
                inserted += 1
        except Exception:
            # Skip rows that fail (e.g. duplicates)
            pass
    return inserted


def check_avatar_url_column_exists() -> bool:
    """Check if the avatar_url column exists in the leads table by making a lightweight select query."""
    try:
        status, _ = supabase_request("GET", "leads?select=avatar_url&limit=1")
        return status == 200
    except Exception:
        return False
