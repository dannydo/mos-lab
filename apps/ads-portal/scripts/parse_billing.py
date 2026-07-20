"""
parse_billing.py
----------------
MỤC ĐÍCH:
    Parse raw billing text được copy thủ công từ trang
    Billing/Transactions của Meta Ad Account.
    Trích xuất các giao dịch (ngày, số tiền, trạng thái, VAT invoice ID)
    và lưu vào billing_history.json.

CHẠY VỚI:
    .venv/bin/python parse_billing.py [--input data/lashes/billing_raw.txt]

THAM SỐ:
    --input   Path đến file text billing thô (mặc định: data/lashes/billing_raw.txt)

ĐẦU VÀO:
    Text file chứa nội dung copy từ trang Billing > Transactions của Meta
    (Ctrl+A → Ctrl+C → paste vào file)

ĐẦU RA:
    data/lashes/billing_history.json
    Format: [{ transaction_id, date, amount, payment_method, status, vat_invoice_id }]

PHÂN BIỆT GIAO DỊCH:
    - 'Paid' / 'Thành công': Giao dịch thực, có FBADS-xxx VAT invoice
    - 'Failed' / 'Không thành công': Auto-retry, không trừ tiền, KHÔNG hạch toán
    (Xem thêm trong AGENTS.md → Billing & Accounting Rules)

PHỤ THUỘC:
    Không cần browser. Không cần lib/*. Script độc lập hoàn toàn.
"""
import re
import json
import os


def parse_transactions(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract current balance
    current_balance = "0 ₫"
    balance_match = re.search(r'Current balance\s*\n\s*([^\n]+)', content, re.IGNORECASE)
    if balance_match:
        current_balance = balance_match.group(1).strip()

    # Split content by the separator or lines
    lines = [line.strip() for line in content.split('\n') if line.strip()]
    
    transactions = []
    
    # We look for lines containing transaction patterns (e.g. 17-digit-17-digit)
    tx_pattern = re.compile(r'^\d+-\d+$')
    
    i = 0
    while i < len(lines):
        line = lines[i]
        if tx_pattern.match(line):
            tx_id = line
            date = lines[i+1] if i+1 < len(lines) else ""
            amount = lines[i+2] if i+2 < len(lines) else ""
            card = lines[i+3] if i+3 < len(lines) else ""
            code = lines[i+4] if i+4 < len(lines) else ""
            status = lines[i+5] if i+5 < len(lines) else ""
            
            # Check if there is a VAT invoice ID (Paid status usually has it)
            vat_invoice = ""
            next_idx = i + 6
            if next_idx < len(lines):
                next_line = lines[next_idx]
                if next_line.startswith("FBADS-"):
                    vat_invoice = next_line
                    i = next_idx + 1 # Skip past VAT invoice
                elif next_line in ["Paid", "Failed", "Funded"]:
                    # Status is repeated sometimes, e.g. "Failed", "Failed"
                    if next_idx + 1 < len(lines) and lines[next_idx + 1].startswith("FBADS-"):
                        vat_invoice = lines[next_idx + 1]
                        i = next_idx + 2
                    else:
                        i = next_idx
                else:
                    i = next_idx
            else:
                i = next_idx
                
            transactions.append({
                "transaction_id": tx_id,
                "date": date,
                "amount": amount,
                "payment_method": card,
                "code": code,
                "status": "Thành công (Paid)" if status.lower() in ["paid", "funded"] else "Không thành công (Failed)",
                "vat_invoice_id": vat_invoice
            })
        else:
            i += 1
            
    return transactions, current_balance

def main():
    project_dir = os.path.dirname(os.path.abspath(__file__))
    raw_path = os.path.join(project_dir, "data/lashes/transactions_text.txt")
    if not os.path.exists(raw_path):
        print(f"File not found: {raw_path}")
        return
        
    transactions, current_balance = parse_transactions(raw_path)
    print(f"Parsed {len(transactions)} transactions. Current Balance: {current_balance}")
    
    # Save to data/lashes/
    data_dir = os.path.join(project_dir, "data/lashes")
    os.makedirs(data_dir, exist_ok=True)
    json_path = os.path.join(data_dir, "billing_history.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(transactions, f, ensure_ascii=False, indent=2)
    print(f"Saved JSON data to {json_path}")
    
    # Identify paid transactions and details
    paid_txs = [t for t in transactions if "Thành công" in t["status"]]
    
    # Create the report
    report_content = f"""# BÁO CÁO CHI TIẾT GIAO DỊCH QUẢNG CÁO (WINGS LASHES)
*Dành cho bộ phận Kế toán*

## 1. Thông tin chung tài khoản quảng cáo
* **Tên tài khoản quảng cáo**: Wings Lashes (ID: `646164975411124`)
* **Tên công ty đăng ký**: CÔNG TY TNHH WINGS' LIFE
* **Địa chỉ**: 159A Đường Đề Thám, Phường Phạm Ngũ Lão, Quận 1, TP. Hồ Chí Minh
* **Mã số thuế (Tax ID)**: `03-1700632-1`
* **Loại tiền tệ**: VND (₫)
* **Phương thức thanh toán chính**: Thẻ Visa kết thúc bằng số `4426` (Thẻ mới thanh toán thành công)
* **Trạng thái tài khoản hiện tại**: **Hoạt động bình thường (Active)**, đã hoàn tất thanh toán dư nợ cũ.

---

## 2. Tóm tắt số dư và nợ hiện tại
* **Số dư nợ chưa thanh toán (Current Balance)**: **{current_balance}**
* **Tình trạng nợ**: Đã tất toán toàn bộ dư nợ quảng cáo trước đó.

> [!NOTE]
> Tài khoản hiện đã được mở khóa và đang chạy quảng cáo bình thường sau khi thanh toán thành công khoản nợ 1.416.711 ₫ vào ngày 23/06/2026.

---

## 3. Bản chất của các giao dịch "Không thành công" liên tục
Kế toán lưu ý các điểm sau đối với danh sách giao dịch gần đây:
1. **Các giao dịch thanh toán thành công**:
   - Giao dịch ngày **23/06/2026** với số tiền **1.416.711 ₫** thanh toán dư nợ thành công bằng thẻ Visa `4426` (Có hóa đơn VAT đi kèm: **`FBADS-725-106151496`**).
   - Giao dịch ngày **23/06/2026** với số tiền **480.000 ₫** nạp tiền thành công (Funded) bằng thẻ Visa `4426`.
2. **Các giao dịch "Không thành công" liên tiếp**: Đây là hệ thống Meta tự động thực hiện các lượt quét thử (Auto-retry) để thu hồi nợ trên thẻ cũ Visa `6431` không thành công, hoặc các lượt quét thử thất bại khác trước khi đổi sang thẻ Visa `4426`.
3. **Quy tắc đối soát**: các giao dịch báo **"Không thành công" (Failed)** này **không phát sinh trừ tiền thực tế** trong tài khoản ngân hàng. Do đó, kế toán **không hạch toán** các khoản này.

---

## 4. Chi tiết lịch sử giao dịch (Tháng 05/2026 - Tháng 06/2026)

| Ngày giao dịch | Mã giao dịch (Transaction ID) | Số tiền (VND) | Phương thức | Mã tham chiếu | Trạng thái | Mã hóa đơn VAT (VAT Invoice) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
"""
    
    for tx in transactions:
        report_content += f"| {tx['date']} | {tx['transaction_id']} | {tx['amount']} | {tx['payment_method']} | {tx['code']} | {tx['status']} | {tx['vat_invoice_id'] if tx['vat_invoice_id'] else ''} |\n"
        
    report_content += """
---

## 5. Kiến nghị xử lý cho Kế toán & Vận hành
1. **Hạch toán chi phí hợp lệ**:
   - Hạch toán hóa đơn **FBADS-725-106151496** trị giá **1.416.711 ₫** (Thanh toán dư nợ quảng cáo thành công ngày 23/06/2026).
   - Ghi nhận khoản nạp quỹ quảng cáo **480.000 ₫** ngày 23/06/2026.
2. **Theo dõi tài khoản**:
   - Tài khoản quảng cáo hiện đã được kích hoạt lại và hoạt động bình thường qua thẻ Visa đuôi `4426`. Kế toán cần đảm bảo duy trì hạn mức và số dư trên thẻ này để tránh tài khoản bị vô hiệu hóa lại trong tương lai.
"""
    
    report_path = os.path.join(project_dir, "reports/wings_lashes_billing_report.md")
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report_content)
    print(f"Saved Markdown report to {report_path}")

if __name__ == "__main__":
    main()


