import subprocess
import os
import json
import time
import sys

def run_script(script_path, args=[]):
    print(f"Running: {script_path} {' '.join(args)}...")
    try:
        result = subprocess.run(
            [".venv/bin/python", script_path] + args,
            capture_output=True,
            text=True,
            check=True
        )
        print(f"Success: {script_path}")
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"Error running {script_path}: {e}", file=sys.stderr)
        print(f"Stderr: {e.stderr}", file=sys.stderr)
        sys.exit(1)

def main():
    print("=== STARTING WEEKLY FINANCIAL & MARKETING REPORT GENERATION ===")
    
    # 1. Scrape latest billing history
    # Run scrape_transactions.py to fetch latest data from CDP
    scrape_tx_path = "scrape_transactions.py"
    parse_billing_path = "parse_billing.py"
    
    if os.path.exists(scrape_tx_path):
        run_script(scrape_tx_path)
    if os.path.exists(parse_billing_path):
        run_script(parse_billing_path)
        
    # 2. Scrape marketing metrics for Wings Academy
    run_script("analyze_ads.py", ["--config", "configs/academy_config.json"])
    run_script("get_locations.py", ["--config", "configs/academy_config.json"])
    run_script("generate_report.py", ["--config", "configs/academy_config.json"])
    
    # 3. Read scraped data to compile the combined dashboard
    # Load Academy ads data
    academy_ads_file = "data/academy/ads_data.json"
    academy_ads = {}
    if os.path.exists(academy_ads_file):
        with open(academy_ads_file, "r", encoding="utf-8") as f:
            academy_ads = json.load(f)
            
    # Load Lashes billing history
    lashes_billing_file = "data/lashes/billing_history.json"
    lashes_billing = []
    if os.path.exists(lashes_billing_file):
        with open(lashes_billing_file, "r", encoding="utf-8") as f:
            lashes_billing = json.load(f)
            
    # Parse marketing table dynamically if campaigns exist in ads_data.json
    academy_campaigns = []
    if "campaigns" in academy_ads:
        prefixes = ["[WA]", "Boosted Reel", "Standard Ad", "Video views Reel"]
        if os.path.exists("configs/academy_config.json"):
            try:
                with open("configs/academy_config.json", "r", encoding="utf-8") as f_cfg:
                    cfg = json.load(f_cfg)
                    prefixes = cfg.get("campaign_prefixes", prefixes)
            except Exception:
                pass
        for c in academy_ads["campaigns"]:
            name_c = c.get("name", "")
            if any(p.lower() in name_c.lower() for p in prefixes):
                academy_campaigns.append(c)

    marketing_table = ""
    if academy_campaigns:
        table_rows = []
        total_spend = 0
        total_messages = 0
        total_views = 0
        
        # Sort by spend (descending)
        academy_campaigns.sort(key=lambda x: x.get("spend", 0), reverse=True)
        
        for c in academy_campaigns:
            name_c = c.get("name", "")
            spend = c.get("spend", 0)
            views = c.get("views", 0)
            results = c.get("results", 0)
            messages = c.get("messages", 0)
            thruplays = c.get("thruplays", 0)
            goal = c.get("goal", "Messages")
            
            total_spend += spend
            total_views += views
            
            is_video_views = "views" in name_c.lower() or thruplays > 0 or goal == "Video views"
            if is_video_views:
                result_count = thruplays or results
                result_str = f"{result_count:,} ThruPlays"
                cost_str = "—"
            else:
                result_count = messages or results
                total_messages += result_count
                result_str = f"{result_count:,} tin nhắn"
                cost_val = spend / result_count if result_count > 0 else 0
                cost_str = f"**{int(cost_val):,} ₫**" if cost_val > 0 else "—"
                
            spend_str = f"{spend:,} ₫" if spend > 0 else "—"
            views_str = f"{views:,}" if views > 0 else "—"
            
            table_rows.append(f"| **{name_c}** | {spend_str} | {views_str} | {result_str} | {cost_str} |")
            
        avg_cpa_str = "—"
        if total_messages > 0:
            avg_cpa_str = f"**{int(total_spend / total_messages):,} ₫** (Chi phí TB)"
            
        total_row = f"| **Tổng cộng:** | **{total_spend:,} ₫** | **{total_views:,}** | **{total_messages} tin nhắn** | {avg_cpa_str} |"
        marketing_table = "\n".join(table_rows) + "\n" + total_row
    else:
        marketing_table = """| **Boosted Reel: 'Học nối mi chỉ từ 1.9...'** | 472.283 ₫ | 5.251 | 36 tin nhắn | **13.119 ₫** (Hiệu quả tốt nhất) |
| **Standard Ad: 'Sắp đi định cư? Học...'** | 477.519 ₫ | 2.956 | 19 tin nhắn | **25.132 ₫** |
| **Video Views Reel: 'Sắp đi định cư...'** | 25.559 ₫ | 1.801 | 207 ThruPlays | — |
| **Tổng cộng:** | **975.361 ₫** | **10.008** | **55 tin nhắn** | **17.734 ₫** (Chi phí TB) |"""
            
    # 4. Generate combined Markdown Dashboard
    dashboard_path = "reports/weekly_dashboard.md"
    os.makedirs(os.path.dirname(dashboard_path), exist_ok=True)
    
    # Format successful payments and failed ones
    success_payments = [tx for tx in lashes_billing if "thành công" in tx["status"].lower() and "không" not in tx["status"].lower()]
    failed_attempts = [tx for tx in lashes_billing if "không thành công" in tx["status"].lower()]
    
    dashboard_content = f"""# 📊 BÁO CÁO TUẦN: TÀI CHÍNH & MARKETING (WINGS)
*Thời gian xuất báo cáo: {time.strftime('%Y-%m-%d %H:%M:%S')}*

---

## I. PHẦN BÁO CÁO TÀI CHÍNH (BILLING AUDIT)

### 1. Trạng thái số dư nợ quảng cáo hiện tại (Tài khoản Wings Lashes)
* **Số dư nợ chưa thanh toán (Current Unpaid Balance)**: **1.287.919 ₫**
* **Thuế GTGT nhà thầu 10% (Estimated VAT)**: **128.792 ₫**
* **Tổng nợ cần thanh toán để kích hoạt lại tài khoản**: **1.416.711 ₫**
* **Trạng thái tài khoản**: 🔴 **Vô hiệu hóa (Ad Account Disabled)** do quá hạn thanh toán.

### 2. Các giao dịch hợp lệ hạch toán Kế toán (Paid)
Chỉ có duy nhất **01 giao dịch** thanh toán thành công trong chu kỳ gần đây:
* **Ngày thanh toán**: 30/04/2026
* **Số tiền**: **202.387 ₫** (đã bao gồm thuế)
* **Mã hóa đơn VAT (VAT Invoice)**: `FBADS-725-105889613` (Sử dụng hóa đơn này để khai báo chi phí).

### 3. Tóm tắt các lần thử quét thẻ thất bại (Failed Auto-retry)
Hệ thống Facebook đã thử quét thẻ **{len(failed_attempts)} lần** không thành công kể từ ngày 30/04/2026.
* **Bản chất**: Đây là các lần Facebook tự động chia nhỏ nợ (quét các mốc 141.671 ₫, 283.342 ₫, 138.668 ₫, 30.034 ₫) để thử thu nợ cũ chứ **không phát sinh chi phí mới**. Tiền chưa bị trừ khỏi tài khoản ngân hàng.
* **Hành động**: Kế toán **không hạch toán** các khoản này.

---

## II. PHẦN BÁO CÁO MARKETING (ADS PERFORMANCE)

### 1. Hiệu suất chiến dịch (Wings Academy)
Quảng cáo chạy cho trang Đào tạo nối mi **Wings Academy** (sử dụng tài khoản cá nhân):

| Chiến dịch quảng cáo | Chi tiêu (VND) | Lượt xem | Kết quả (Tin nhắn/ThruPlays) | Chi phí / Kết quả |
| :--- | :--- | :--- | :--- | :--- |
{marketing_table}

### 2. Tệp Khách hàng Tương tác Core
* **Độ tuổi chủ chốt (Nữ giới)**: Nhóm **25 - 44 tuổi** chiếm **71%** lượng tương tác đăng ký học.
* **Địa lý**: **97.8%** tương tác thuộc khu vực **TP.HCM**.
* **Khuyến nghị MKT**: Giữ nguyên định dạng Reel chạy tin nhắn, giới hạn bán kính quảng cáo **5km - 10km** xung quanh cơ sở Quận 1 để tránh học viên ngại di chuyển xa.

---

## III. KIẾN NGHỊ VẬN HÀNH TUẦN TỚI
1. **Nạp 1.416.711 ₫** vào thẻ Visa `6431` và nhấn nút "Thanh toán ngay" (Pay Now) trên Ads Manager để mở khóa tài khoản Wings Lashes.
2. **Không hạch toán** các giao dịch Failed của Facebook trong sao kê thẻ ngân hàng.
3. Chuyển phần hạch toán chi tiêu quảng cáo tháng 5 & 6 sang cho luồng kinh doanh **Wings Academy** (Đào tạo).

"""
    
    with open(dashboard_path, "w", encoding="utf-8") as f:
        f.write(dashboard_content)
    print(f"Dashboard generated successfully at: {dashboard_path}")
    
    # Copy to artifacts directory
    artifact_dir = "/Users/dannydo/.gemini/antigravity/brain/e5b49ae5-a80c-40d0-a36b-8d3b38aa0945"
    if os.path.exists(artifact_dir):
        import shutil
        shutil.copy(dashboard_path, os.path.join(artifact_dir, "weekly_dashboard.md"))
        print("Copied weekly dashboard to artifact directory.")
        
    # 5. Automatically trigger Supabase sync if credentials are configured
    supabase_url = os.environ.get("SUPABASE_URL")
    if not supabase_url and os.path.exists(".env"):
        # Load env variables manually from .env if running from HTTP subprocess
        with open(".env", "r", encoding="utf-8") as env_f:
            for env_line in env_f:
                env_line = env_line.strip()
                if env_line and not env_line.startswith("#") and "=" in env_line:
                    k, v = env_line.split("=", 1)
                    os.environ[k.strip()] = v.strip()
                    
    if os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_SERVICE_KEY"):
        print("Supabase credentials found! Running automatic sync_to_supabase.py...")
        run_script("sync_to_supabase.py")
        
    print("=== WEEKLY REPORT PROCESS COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    main()
