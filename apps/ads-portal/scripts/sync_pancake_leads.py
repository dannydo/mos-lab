#!/usr/bin/env python3
"""
sync_pancake_leads.py
---------------------
Đồng bộ khách hàng từ Pancake POS và các cuộc hội thoại từ Pancake Inbox (pages.fm)
sang bảng leads trong Supabase.

Cách dùng:
    python sync_pancake_leads.py --jwt <PANCAKE_JWT_TOKEN>
    
Lấy JWT token: Đăng nhập https://pancake.vn, mở DevTools > Application > Cookies > jwt

Môi trường cần thiết (trong .env):
    SUPABASE_URL=...
    SUPABASE_SERVICE_KEY=...
"""

import sys
import argparse

from lib.phone import normalize_phone
from lib.pancake_client import (
    SHOPS, ACTIVE_PAGES,
    fetch_all_customers, fetch_inbox_conversations,
    map_customer_to_lead, map_conversation_to_lead,
    get_avatar_url,
    resolve_avatars_concurrently,
)
from lib.supabase_client import (
    get_existing_leads_keys, update_lead, insert_leads_batch,
    check_avatar_url_column_exists,
)



# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Sync Pancake POS and Inbox customers to Supabase CRM")
    parser.add_argument("--jwt", required=True, help="Pancake JWT token (from jwt or pos_jwt cookie)")
    parser.add_argument("--dry-run", action="store_true", help="Don't write to Supabase, just print stats")
    args = parser.parse_args()
    
    jwt = args.jwt.strip()
    dry_run = args.dry_run
    
    cookie_str = f"jwt={jwt}; pos_jwt={jwt}; pos_locale=vi; pos_country=VN"
    
    print("=" * 60)
    print("🥞 WINGS PORTAL - Pancake Lead Sync (POS & Inbox)")
    print("=" * 60)
    
    if dry_run:
        print("🔍 DRY RUN mode - no data will be written\n")
    
    # Step 1: Get existing keys to avoid duplicates
    existing_pancake_map = {}
    existing_leads_map = {}
    existing_phone_map = {}
    
    db_supports_avatar = False
    if not dry_run:
        print("🔎 Checking existing leads in Supabase...")
        try:
            existing_pancake_map, existing_leads_map, existing_phone_map = get_existing_leads_keys()
            print(f"  Found {len(existing_pancake_map)} existing leads with pancake_id")
            print(f"  Found {len(existing_leads_map)} existing leads with facebook_psid")
            print(f"  Found {len(existing_phone_map)} existing leads with phone number\n")
            db_supports_avatar = check_avatar_url_column_exists()
            if not db_supports_avatar:
                print("⚠️ Warning: Column 'avatar_url' does not exist in 'leads' table. Avatars will not be synced to DB.")
        except Exception as e:
            print(f"  ❌ Cannot connect to Supabase: {e}")
            sys.exit(1)
    
    all_leads = []
    
    # Step 2: Fetch & map POS customers
    for shop in SHOPS:
        print(f"🏪 [POS] Fetching from {shop['name']} (ID: {shop['id']})...")
        try:
            customers = fetch_all_customers(shop["id"], jwt, cookie_str)
            shop_leads = [map_customer_to_lead(c, shop["source"]) for c in customers]
            all_leads.extend(shop_leads)
            print(f"  ✅ Mapped {len(shop_leads)} customers as leads")
        except Exception as e:
            print(f"  ❌ Failed: {e}")
            
    # Step 3: Fetch & map Inbox conversations
    for page in ACTIVE_PAGES:
        print(f"📥 [Inbox] Fetching from {page['name']} (ID: {page['id']})...")
        try:
            convs = fetch_inbox_conversations(page["id"], jwt, cookie_str)
            page_leads = []
            for c in convs:
                lead = map_conversation_to_lead(c, page["source"])
                page_leads.append(lead)
            all_leads.extend(page_leads)
            print(f"  ✅ Mapped {len(page_leads)} leads from chat conversations")
        except Exception as e:
            print(f"  ❌ Failed: {e}")
            
    # Step 4: De-duplicate and identify merges
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
        print(f"⚡ Concurrently resolving {len(avatar_tasks)} avatars...")
        resolved_avatars = resolve_avatars_concurrently(avatar_tasks, jwt)
        print(f"✅ Resolved {len(resolved_avatars)} avatar URLs.")
        
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
            
    skip_count = len(all_leads) - len(new_leads) - len(leads_to_update)
    
    print(f"\n📊 Summary:")
    print(f"  Total mapped:      {len(all_leads)}")
    print(f"  Already in CRM:    {skip_count}")
    print(f"  Merged/Updated:    {len(leads_to_update)}")
    print(f"  New to insert:     {len(new_leads)}")
    
    if not new_leads and not leads_to_update:
        print("\n✅ Nothing to sync – all leads already in CRM and fully updated!")
        return
        
    if dry_run:
        print("\n[Dry Run] Would update/merge:")
        for lid, fields, name in leads_to_update[:10]:
            print(f"  - Lead ID {lid} ({name}) -> {fields}")
        if len(leads_to_update) > 10:
            print(f"  ... and {len(leads_to_update) - 10} more updates")
            
        print("\n[Dry Run] Would insert:")
        for l in new_leads[:10]:
            print(f"  - {l['name']} | {l['phone']} | {l['source']}")
        if len(new_leads) > 10:
            print(f"  ... and {len(new_leads) - 10} more inserts")
        return

    # Real execution
    BATCH_SIZE = 50
    
    # 1. Update/Merge existing leads
    if leads_to_update:
        print(f"\nMerging pancake details into {len(leads_to_update)} existing leads...")
        for lid, fields, name in leads_to_update:
            ok = update_lead(lid, fields)
            if ok:
                print(f"  ✅ Merged: {name}")
            else:
                print(f"  ❌ Failed to merge: {name}")
                
    # 2. Insert new leads
    inserted = 0
    if new_leads:
        print(f"\nInserting {len(new_leads)} new leads...")
        for i in range(0, len(new_leads), BATCH_SIZE):
            batch = new_leads[i:i + BATCH_SIZE]
            inserted_in_batch = insert_leads_batch(batch)
            inserted += inserted_in_batch
            if inserted_in_batch == len(batch):
                print(f"  ✅ Batch {i // BATCH_SIZE + 1}: inserted {len(batch)} leads")
            elif inserted_in_batch > 0:
                print(f"  ⚠️ Batch {i // BATCH_SIZE + 1}: partially inserted ({inserted_in_batch}/{len(batch)})")
            else:
                print(f"  ❌ Batch {i // BATCH_SIZE + 1}: failed")
                
    print(f"\n🎉 Done! {inserted}/{len(new_leads)} new leads synced to CRM.")
    print(f"   View at: http://localhost:8000/")


if __name__ == "__main__":
    main()
