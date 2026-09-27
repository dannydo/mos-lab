# 🚀 Kế Hoạch Tối Ưu Hóa Slow Queries Hệ Thống (mos-lab & Legacy DB)

Tài liệu này xác định mục tiêu, phân tích nguyên nhân gốc rễ, cung cấp bằng chứng benchmark thực tế và lộ trình chi tiết để xử lý triệt để các câu truy vấn chậm (slow queries) vừa được ghi nhận trong `mariadb-slow.log` trên máy chủ Production VPS.

---

## 🎯 1. Mục Tiêu & Tiêu Chuẩn Hiệu Năng (Performance Budget)

| Chỉ số / Tiêu chuẩn                    | Ngưỡng bắt buộc                                   | Mục tiêu sau tối ưu |
| -------------------------------------- | ------------------------------------------------- | ------------------- |
| **Query tương tác người dùng**         | p95 dưới **0.5 giây** (500ms)                     | p95 dưới **50ms**   |
| **Báo cáo / Thống kê Dashboard**       | Dưới **1.5 giây**                                 | Dưới **200ms**      |
| **Độ chính xác dữ liệu (Data Parity)** | **100% khớp tuyệt đối** từng dòng và từng số liệu | Zero mismatch       |
| **Tính an toàn triển khai**            | Không gây downtime, không lock bảng sản xuất      | Triển khai an toàn  |

---

## 📋 2. Bảng Phân Loại & Mức Độ Ưu Tiên

| Mức ưu tiên | Hạng mục tối ưu                                        | Vị trí / Nguồn                              |        Thời gian hiện tại        |     Tiềm năng tối ưu      |               Trạng thái                |
| :---------: | ------------------------------------------------------ | ------------------------------------------- | :------------------------------: | :-----------------------: | :-------------------------------------: |
|   **P0**    | **`ComboRecognitionService.getNewLoCaCustomerIds`**    | `apps/api/.../combo-recognition.service.ts` |    **2.60s** (quét 758k rows)    | **13ms (nhanh hơn 168×)** |    🧪 Đã benchmark thực tế trên VPS     |
|   **P1**    | **LoCa Stats (`count_NEW_LOCA` & `has_product`)**      | `apps/api/.../customer-stats.routes.ts`     |    **6.59s** (quét 245k rows)    |     **~50ms – 100ms**     |   🔍 Đã xác định nguyên nhân `EXISTS`   |
|   **P2**    | **Customer Order Phone Lookup (`user_contact`)**       | Wings Control / Legacy Report Queries       | **1.75s – 2.01s** (14 lượt/ngày) |        **< 100ms**        |     🔍 Correlated subquery per-row      |
|   **P3**    | **Nightly Lead Cron (`sales_lead_user_service_type`)** | Cron 00:01 AM (Wings backend)               |    **56.5s** (quét 3.5M rows)    |       **~2s – 3s**        | 🔍 Chuyển subquery sang Batch Hash Join |

---

## 🔬 3. Chi Tiết Từng Hạng Mục & Phương Án Kỹ Thuật

### 🟢 Hạng mục P0: Tối ưu `ComboRecognitionService.getNewLoCaCustomerIds`

#### Vấn đề & Nguyên nhân gốc rễ:

- **Tần suất & Thời gian:** Chạy khi nhân viên lọc khách hàng hoặc xem chỉ số LoCa, mất **2.60s** và quét **758.682 bản ghi**.
- **Nguyên nhân:**
  1. Câu truy vấn dùng điều kiện lọc ngày bằng `OR` giữa `ro_nl.actual_booking_date_start` và `o_nl.booking_date_start`:
     ```sql
     ((ro_nl.actual_booking_date_start >= ? AND ro_nl.actual_booking_date_start <= ?)
      OR (ro_nl.actual_booking_date_start IS NULL AND o_nl.booking_date_start >= ? AND o_nl.booking_date_start <= ?))
     ```
     Điều này khiến MariaDB không thể dùng range index trên cột ngày, buộc phải scan **167.187 dòng** `order_state = 'Completed'`.
  2. Mệnh đề `WHERE EXISTS (SELECT 1 FROM user_service_balance usb WHERE usb.user_id = recognized_combo.user_id)` bị MariaDB optimizer đảo ngược thành `MATERIALIZED` subquery quét toàn bộ **58.724 dòng** `user_service_balance` vào bảng tạm.

#### Giải pháp kỹ thuật (Eligible Orders Split & Join Direct):

Tách tập đơn hàng thỏa mãn ngày thành 2 nhánh loại trừ nhau (Indexed Branches) qua CTE `eligible_orders`, sau đó join trực tiếp:

```sql
WITH eligible_orders AS (
  SELECT ro.order_id, o.user_id
  FROM report_order ro
  JOIN `order` o ON o.id = ro.order_id
  WHERE ro.actual_booking_date_start >= ? AND ro.actual_booking_date_start <= ?
    AND o.order_state = 'Completed'
  UNION ALL
  SELECT o.id AS order_id, o.user_id
  FROM `order` o
  LEFT JOIN report_order ro ON ro.order_id = o.id
  WHERE o.booking_date_start >= ? AND o.booking_date_start <= ?
    AND ro.actual_booking_date_start IS NULL
    AND o.order_state = 'Completed'
)
SELECT DISTINCT eo.user_id
FROM eligible_orders eo
JOIN user_service_balance usb ON usb.user_id = eo.user_id
WHERE (
  EXISTS (
    SELECT 1 FROM order_service_combo osc
    LEFT JOIN service_price sp ON osc.service_price_id = sp.id
    LEFT JOIN service_language sl ON osc.service_id = sl.service_id AND sl.language_id = 1
    WHERE osc.order_id = eo.order_id
      AND osc.total_price > 0
      AND (sp.service_price_package_key IS NULL OR (
        LOWER(sp.service_price_package_key) NOT LIKE '%single%'
        AND LOWER(sp.service_price_package_key) NOT LIKE '%refill%'
        AND LOWER(sp.service_price_package_key) NOT LIKE '%balance%'
      ))
      AND (sl.service_name IS NULL OR (
        LOWER(sl.service_name) NOT LIKE '%single%'
        AND LOWER(sl.service_name) NOT LIKE '%refill%'
        AND LOWER(sl.service_name) NOT LIKE '%balance%'
      ))
  )
  OR EXISTS (
    SELECT 1 FROM order_service os
    LEFT JOIN service_price sp ON os.service_price_id = sp.id
    LEFT JOIN service_language sl ON os.service_id = sl.service_id AND sl.language_id = 1
    WHERE os.order_id = eo.order_id
      AND os.total_price > 0
      AND (os.user_service_type = 'combo' OR os.service_group = 'combo')
      AND (sp.service_price_package_key IS NULL OR (
        LOWER(sp.service_price_package_key) NOT LIKE '%single%'
        AND LOWER(sp.service_price_package_key) NOT LIKE '%refill%'
        AND LOWER(sp.service_price_package_key) NOT LIKE '%balance%'
      ))
      AND (sl.service_name IS NULL OR (
        LOWER(sl.service_name) NOT LIKE '%single%'
        AND LOWER(sl.service_name) NOT LIKE '%refill%'
        AND LOWER(sl.service_name) NOT LIKE '%balance%'
      ))
  )
);
```

#### Kết quả đo đạc thực tế trên Production VPS:

- **Thời gian câu cũ:** `2.190 giây`
- **Thời gian câu mới:** `0.013 giây (13 miligiây)`
- **Tốc độ:** Nhanh hơn **168 LẦN** (giảm **99.4%** độ trễ).
- **Parity:** Khớp chính xác 100% từng ID (`41680`, `52451`).

---

### 🟡 Hạng mục P1: Tối ưu LoCa Stats `count_NEW_LOCA` & `has_product`

#### Vấn đề:

- Tại `apps/api/src/modules/customers/routes/customer-stats.routes.ts:968`, câu truy vấn kiểm tra khách hàng có mua sản phẩm hay không:
  ```sql
  EXISTS (
    SELECT 1 FROM order_service os_p
    WHERE os_p.user_id = u.id AND (
      LOWER(COALESCE(os_p.service_group, '')) LIKE '%product%' OR
      LOWER(COALESCE(os_p.service_type, '')) LIKE '%product%' OR
      LOWER(COALESCE(os_p.user_service_type, '')) LIKE '%product%'
    )
  ) as has_product
  ```
- Subquery này chạy theo từng khách hàng trong tập `usb_agg` dẫn đến full-scan bảng `order_service` (926.000 dòng), mất từ **1.6s đến 6.59s**.

#### Giải pháp:

1. **Pre-fetch Product User Set**: Chạy 1 câu truy vấn nhanh để lấy danh sách `userId` có sản phẩm trong tập khách đang xét:
   ```sql
   SELECT DISTINCT os.user_id
   FROM order_service os
   WHERE os.user_id IN (...)
     AND (os.service_group = 'product' OR os.user_service_type = 'product')
   ```
2. **In-Memory Flag Mapping**: Đưa vào `Set<number>` trong Node.js để kiểm tra tức thì $O(1)$, loại bỏ hoàn toàn correlated subquery trong SQL batch.

---

### 🟡 Hạng mục P2: Tối ưu Phone Lookup `user_contact` trong Export & Order Queries

#### Vấn đề:

- Xuất hiện 14 lượt trong ngày (tổng 24.4s).
- Subquery:
  ```sql
  (SELECT lc.phone_number FROM user_contact lc
   WHERE lc.user_id = o.user_id AND lc.is_disabled = 0
   ORDER BY lc.id DESC LIMIT 1) AS client_phone
  ```
- Dù đã có index `(user_id, is_disabled, id)`, nhưng khi `o.date_created` mở rộng cả tháng (hàng chục nghìn đơn), subquery chạy lặp lại hàng chục nghìn lần gây nghẽn CPU.

#### Giải pháp:

- Thay vì subquery per-row, sử dụng derived table lấy SĐT mới nhất theo batch hoặc JOIN với `latest_contact`:
  ```sql
  LEFT JOIN (
    SELECT user_id, phone_number
    FROM user_contact
    WHERE id IN (
      SELECT MAX(id) FROM user_contact WHERE is_disabled = 0 GROUP BY user_id
    )
  ) lc ON lc.user_id = o.user_id
  ```

---

### ⚪ Hạng mục P3: Tối ưu Cron Đêm `sales_lead_user_service_type`

#### Vấn đề:

- Chạy vào `00:01` sáng, mất **56.5s**, quét **3.5 triệu dòng**.
- Câu lệnh `UPDATE ... SET user_call_count = (SELECT COUNT(*) FROM sales_lead_split_item ...)` thực hiện subquery quét lại toàn bộ bảng cho từng dòng cần update.

#### Giải pháp:

- Chuyển đổi từ Correlated Subquery Update sang Join Aggregated Table:
  ```sql
  UPDATE sales_lead_user_service_type t
  JOIN (
    SELECT slsi.sales_lead_user_service_type_id, COUNT(*) AS cnt
    FROM sales_lead_split_item slsi
    JOIN user_call uc ON uc.sales_lead_split_item_id = slsi.id
    WHERE slsi.date_created >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY slsi.sales_lead_user_service_type_id
  ) agg ON agg.sales_lead_user_service_type_id = t.id
  SET t.user_call_count = agg.cnt;
  ```
  Giảm thời gian chạy từ ~40s xuống dưới 2s.

---

## 🗓️ 4. Lộ Trình Triển Khai (Action Plan)

1. **Giai đoạn 1 (Ngay hôm nay - Ưu tiên P0)**:
   - Triển khai rewrite cho `ComboRecognitionService.getNewLoCaCustomerIds` trong `mos-lab`.
   - Chạy test xác minh tính đúng đắn dữ liệu (data parity) và verify không ảnh hưởng các luồng tính thưởng CC/LoCa.
   - Deploy lên Production VPS và đối soát trực tiếp log.

2. **Giai đoạn 2 (Tiếp theo - Ưu tiên P1)**:
   - Tối ưu `has_product` trong `customer-stats.routes.ts`.
   - Giảm tải thời gian nạp danh sách khách hàng và thống kê Touchpoint.

3. **Giai đoạn 3 (Theo dõi & Bổ trợ P2, P3)**:
   - Tinh chỉnh các câu xuất báo cáo Legacy có subquery `user_contact`.
   - Tối ưu câu lệnh cron đêm của Telesales/Leads.
