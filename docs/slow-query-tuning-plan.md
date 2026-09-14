# Slow Query Tuning Plan

Mục tiêu: giảm thời gian xử lý mà không thay đổi dữ liệu trả về hoặc flow nghiệp vụ.

## Performance budget

| Lớp                        | Mục tiêu bắt buộc                                                     |
| -------------------------- | --------------------------------------------------------------------- |
| Query tương tác            | p95 dưới **0,5 giây**                                                 |
| Trang người dùng nhìn thấy | 1–2 giây tối đa, gồm API + render + frontend                          |
| Quick win thông thường     | Có thể chấp nhận nếu nhanh hơn 20–30%, miễn không làm xấu kết quả     |
| Query đang gây chờ đợi     | Không dùng phần trăm làm gate; phải đạt ngân sách thời gian tuyệt đối |

## Trạng thái thực hiện — đọc nhanh

| Hạng mục                                 | Giải pháp                                                                                                   | Tốc độ đo được                                                                                                                                        | Trạng thái hiện tại                                                       |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| CC KPI Daily Sales                       | Daily projection trong CRM, plus index-friendly eligible-order fallback; coverage, parity và stale fallback | Local canonical p95 **1.703 s → 65.78 ms** (**25.9×**); Production canonical fallback **151 ms**                                                      | **🟢 Live**                                                               |
| Happy Call / Order-service report        | Tách điều kiện ngày `COALESCE` thành hai nhánh loại trừ nhau, dùng được index; giữ nguyên staff lookup      | Production p95 **2.105 s → 23.86 ms** (**88.2×**, -98.9%); 603 dòng exact hash parity                                                                 | **🟢 Live**                                                               |
| Customer Last Visit / Campaign customers | Per-customer projection, queue delta và reconciliation                                                      | Active campaign lớn nhất: local p95 **395.8 ms → 53.35 ms** (**7,4×**, -86,5%)                                                                        | **🟢 Đang đọc snapshot**; 1.814/1.814 fresh parity, 0 mismatch            |
| CRM segment snapshot rebuild             | Gộp hai aggregate completed-order trùng nhau thành một `visit_stats` aggregate                              | Local Orb p95 **2.271 s → 1.441 s** (**-36,5%**), 31.280 rows parity                                                                                  | **Local candidate**; chỉ giảm background rebuild, chưa deploy             |
| Daily Combo Status export                | Daily projection; freshness/coverage guard và canonical fallback                                            | p95 **1.190 s → 1 ms** (**~1.190×**, -99,9%), 30 ngày parity                                                                                          | **🟢 Đang đọc snapshot trên Production**                                  |
| Not Live Combo export — full CSV         | Per-order combo-state projection; coverage/freshness guard; Promotion Name deterministic                    | Production full CSV **3.872 s → 230 ms** (**~17×**, -94,0%), 429 dòng exact parity                                                                    | **🟢 Đang đọc snapshot trên Production**                                  |
| Technician performance summary           | Composite index theo technician + ngày                                                                      | Orb: 188.292 rows → 70 rows; **-98,9%**                                                                                                               | **Đã deploy**                                                             |
| Customer profile / service summary       | Scope aggregate theo batch khách đang hiển thị                                                              | Orb **2,033 ms → 1,311 ms** (**1,6×**, -35,5%)                                                                                                        | **Đã deploy**                                                             |
| Staff day-off (payslip lookup)           | Đổi predicate ngày sang range sargable, dùng index `from_date` hiện có                                      | Lookup Orb p95 **27,43 ms → 2,92 ms** (**9,4×**); full payslip endpoint p95 **236 ms → 202 ms** (**1,17×**, -14,4%); CSV 1.206 dòng exact hash parity | **🟡 Local candidate**; endpoint gate xanh, chưa deploy                   |
| Customer search (Wings Control)          | Read model theo từng trường tìm kiếm + thứ tự `full_name, user_id` ổn định                                  | Orb p95 **~0,50–0,65 s → ~0,21–0,26 s** (**~2–3×**); parity đủ name/phone/social                                                                      | **🟡 Local candidate**; chưa thay Production                              |
| Order export / combo state               | Per-order Combo State projection, coverage/freshness guard và fallback canonical                            | Production full CSV **3.872 s → 230 ms** (**~17×**)                                                                                                   | **🟢 Live**                                                               |
| Technician performance report (Legacy)   | Trace Production đã xác định mẫu nặng nhất là full-table maintenance/export nội bộ                          | Không phải request người dùng                                                                                                                         | **⚪ Không ưu tiên UX**; không xây snapshot cho mục này                   |
| Staff working-shift report               | Default active roster + indexed generated-date join cho Give-Away; `include_history=1` giữ báo cáo cũ       | Full CSV local p95 **144 ms** mặc định; historical p95 **151 ms**; file ổn định byte-for-byte                                                         | **🟢 Xác minh local xanh**; core query đã live, chờ quan sát traffic thật |

## Việc kế tiếp được khuyến nghị

1. **P0 — Truy và loại delta scan `order` còn sót:** 669 lượt, trung bình 1,16 giây và hơn 224 triệu dòng đã đọc cộng dồn. Full-rebuild 30 ngày cũ đã tắt; scan vẫn xảy ra ngay sau cohort cron mỗi phút khởi động và không phải request user. Scheduler snapshot hiện hành là incremental có lock, nhưng cùng phút còn có nhiều job nền; thêm origin tag CLI để khóa đúng caller trước khi tắt/sửa bất kỳ job nào.
2. **P1 — Truy nguồn export Combo canonical còn lặp:** các fingerprint canonical xuất hiện hơn 800 lần, trung bình khoảng 5 giây. Dùng performance trace để phân biệt fallback thiếu/stale snapshot, parity/reconciliation hay request người dùng; chỉ sửa sau khi biết owner.
3. **P1 — Staff Task generator: local batch candidate:** nguồn đã khóa là cron tạo task lúc 01:00/04:00, không phải request người dùng. Nó lặp user × rule và gọi `getLastStaffTask` từng lần. Benchmark local hướng batch-load task gần nhất trước; chỉ cân nhắc composite index nếu EXPLAIN chứng minh cần.
4. **🟡 Local candidates:** Staff day-off payslip range rewrite đã qua benchmark endpoint đầy đủ nhưng lợi ích UX toàn endpoint chỉ 14,4%; Wings Customer Search per-field read model vẫn cần gate phân trang. Chỉ đóng gói rollout hẹp khi lợi ích tương xứng ưu tiên hiện tại.
5. **Theo dõi:** Staff Working Shift, Campaign/Last Visit, Daily/Technician reports chỉ mở lại khi traffic Production vượt ngân sách.

## Quick summary — Production slow log (cập nhật 12/09/2026)

> Đây là snapshot của rolling slow log hiện tại, được đọc trực tiếp từ Production. Tổng thời gian là tổng tất cả lần xuất hiện của fingerprint trong cửa sổ log đang giữ; không cộng mẫu lịch sử đã rotate.

**Trạng thái mới nhất:** log mới đã có nhóm cần xử lý. Bảng dưới tách rõ tải nền khỏi request người dùng; không coi mọi dòng slow log là UX issue.

| Slow log / fingerprint                                          | Nguồn / phạm vi                                                                | Số lần | Tổng thời gian | Trung bình |   Rows examined | Trạng thái                                                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------ | -----: | -------------: | ---------: | --------------: | ----------------------------------------------------------------------------------------------------- |
| Customer search — kết quả (`LIKE` nhiều bảng)                   | Wings Control / Legacy API                                                     |     98 |       57,820 s |    0,590 s |      16.252.580 | Theo dõi; ngoài phạm vi thay đổi                                                                      |
| CC KPI Daily Sales (`order` + `order_service`, ngày `COALESCE`) | mOS / Legacy reporting                                                         |     23 |       46,230 s |    2,010 s |      14.335.506 | 🟢 **Live**; projection ~65 ms, canonical fallback 151 ms sau rewrite                                 |
| Staff working-shift report                                      | Legacy reporting API / user CSV                                                |    230 |      304,133 s |    1,322 s |     120.334.804 | 🟢 Historical baseline; current local full CSV p95 144 ms, historical branch 151 ms; chờ traffic thật |
| Customer search — `COUNT`                                       | Wings Control / Legacy API                                                     |     55 |       35,200 s |    0,640 s |       9.130.565 | Theo dõi; ngoài phạm vi thay đổi                                                                      |
| Order export / combo state report                               | Legacy reporting API                                                           |      4 |       31,720 s |    7,930 s |      10.502.314 | 🟢 Historical baseline; Not Live Combo snapshot đã live 3.872 s → 230 ms                              |
| Technician performance report                                   | Legacy reporting API                                                           |     12 |       27,960 s |    2,330 s |      14.991.923 | ⚪ Historical maintenance/export nội bộ; không ưu tiên UX                                             |
| Order delta scanner mỗi phút                                    | Caller chưa khóa; không phải hai worker snapshot incremental hiện hành         |    669 |      776,674 s |    1,161 s |     224.594.504 | 🔴 **P0**; trace owner, rồi loại hoặc đổi sang watermark/queue                                        |
| Combo export canonical (3 fingerprint tương đương)              | Legacy export / cần trace owner                                                |    817 |        4.259 s |     ~5,2 s | Hàng trăm triệu | 🟠 **P1**; xác định fallback/parity/user path trước                                                   |
| Staff Task                                                      | Cron `generate-working-shift` / `generate-staff-task`, không phải request user |     15 |      305,351 s |   20,357 s |      36.701.497 | 🟡 **Background P1**; N+1 lookup task gần nhất, benchmark batch-load tại local                        |

**Cách dùng bảng:** ưu tiên UX theo route/caller đã trace, tần suất và p95. Worker nền có ngân sách riêng: 1–2 giây mỗi batch, khóa chống chạy chồng và nhường request người dùng. Mọi rollout vẫn cần output parity, health và fallback an toàn.

### Xác minh Production sau rollout snapshot

| Fingerprint / nguồn                    | Quan sát mới nhất                                                                   | Kết luận                                                                                         |
| -------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Not Live Combo — user export           | Full CSV 429 dòng: canonical **3.872 s**, snapshot **230 ms**, byte-for-byte parity | 🟢 Live; nhanh hơn **~17×**. Missing/stale snapshot tự fallback canonical.                       |
| Not Live Combo — Combo State component | Orb: **4.111 s → 4 ms**, 1.503 order-state parity                                   | 🟢 Đã được đưa ra khỏi request path; đây là phần nặng nhất của export.                           |
| Daily Combo Status                     | p95 **1.190 s → 1 ms**, 30 ngày parity                                              | 🟢 Live; daily snapshot chỉ được đọc khi coverage/freshness xanh.                                |
| Happy Call / Order-service             | 603 dòng Production exact parity; canonical p95 **2.105 s**, rewrite **23.86 ms**   | 🟢 Live; nhanh hơn **88.2×**, không đổi quy tắc chọn staff.                                      |
| Recent slow-log entries                | Tải nền cần tách owner bằng performance trace; không mặc định quy về snapshot       | 🟡 Chỉ ưu tiên nếu trace cho thấy làm nghẽn request người dùng. Delta scan mỗi phút là P0 riêng. |

Không có Not Live Combo user request nào vượt ngưỡng 0,5 giây trong mẫu xác minh sau khi read flag bật.

## Ứng viên snapshot / projection thuộc phạm vi mOS

| Nhóm slow log                            | Khả năng                 | Hình dạng projection đề xuất                                  | Khi nào rebuild                                                | Điều kiện trước khi làm                                                                  |
| ---------------------------------------- | ------------------------ | ------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Customer Last Visit / Campaign customers | 🟢 **Đang đọc snapshot** | Theo từng customer                                            | Order / actual check-in thay đổi; đối soát định kỳ             | Active campaign lớn nhất 1.814/1.814 fresh, 0 mismatch; p95 53.35 ms                     |
| CC KPI Daily Sales                       | 🟢 **Đang đọc snapshot** | KPI theo business, store, CC và ngày                          | Queue incremental theo thay đổi; đối soát diện rộng chạy thưa  | Hash/parity Production đã đạt; stale current-day tự fallback                             |
| CRM segment snapshot rebuild             | Cao (đã là snapshot)     | Gộp last-visit + LTV/cycle thành một aggregate                | Job rebuild hiện hữu                                           | Local parity đã đạt; xem như giảm chi phí rebuild, không thay snapshot read              |
| Daily Combo Status export                | 🟢 **Đang đọc snapshot** | Daily completed/live/not-live counts                          | Balance, transaction, order, report-order hoặc expiry thay đổi | Production coverage/freshness + shadow parity đã đạt; stale/missing tự fallback          |
| Technician performance report            | Thấp hiện tại            | Không tạo projection mới                                      | —                                                              | Mẫu nặng nhất đã được xác định là maintenance/export nội bộ, không phải luồng người dùng |
| Order export / combo state               | 🟢 **Đang đọc snapshot** | Projection **theo order**, không cache nguyên trang export    | Order, service, revenue, combo/balance đổi                     | Production full CSV parity đã đạt; 3.872s → 230ms, stale/missing tự fallback             |
| Staff working-shift report               | Cao — không cần snapshot | Read trực tiếp qua active roster + indexed Give-Away day join | Không cần rebuild; lịch sử chỉ khi `include_history=1`         | Full CSV local đạt p95 144 ms; historical branch 151 ms; chờ traffic thật                |

**Cần thiết kế riêng:** Customer Search của Wings Control. B-tree không phù hợp với `LIKE '%term%'`, nhưng read model per-field đã giữ đủ semantics ở local. Chỉ triển khai khi capture thay đổi theo user đáng tin, pagination/output parity đầy đủ và patch Wings được review hẹp.

## Historical inventory — để không mất các mẫu đã thấy

> Bảng này giữ toàn bộ nhóm từ các cửa sổ slow log trước, gồm cả logrotate và mẫu trước tối ưu. **Không dùng số liệu này làm trạng thái live**, mà dùng để biết các ứng viên cần kiểm tra lại khi chúng tái xuất hiện.

| Slow log / nhóm                                | Nguồn / phạm vi                                                          | Owner / file                                                                                                              | Số lần đã thấy | Tổng thời gian | Trạng thái                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | -------------: | -------------: | ------------------------------------------------------------------------- |
| Customer search (các biến thể results + count) | Wings Control / Legacy API                                               | Wings Control team                                                                                                        |             55 |       34,304 s | Theo dõi, không thay đổi                                                  |
| Order + report-order aggregate                 | mOS API — Campaign customers enrichment (`GET /campaigns/:id/customers`) | Danny Do — [campaign.service.ts](/Users/dannydo/projects/mos-lab/apps/api/src/modules/campaigns/campaign.service.ts:1256) |             32 |       78,784 s | Đã trace; benchmark Orb tiếp theo                                         |
| Staff day-off lookup                           | Legacy reporting API                                                     | Legacy reporting team                                                                                                     |             13 |       14,213 s | Composite index cũ đã loại; range rewrite mới qua local 9,4×, chưa deploy |
| Schema metadata (`SHOW FULL COLUMNS`)          | Legacy framework / metadata                                              | Legacy platform team                                                                                                      |             13 |       13,733 s | Tìm caller, cache nếu còn tái diễn                                        |
| Customer profile / service summary             | mOS API — Calls                                                          | mOS API team                                                                                                              |             12 |       12,970 s | Đã deploy rewrite, theo dõi                                               |
| Service-duration report                        | mOS API                                                                  | mOS API team                                                                                                              |              9 |       17,360 s | Backlog sau các query p95 > 0,5 s                                         |
| Technician performance summary                 | mOS API                                                                  | mOS API team                                                                                                              |              2 |              — | Đã deploy index, theo dõi                                                 |
| Happy-call order report                        | mOS API                                                                  | mOS API team                                                                                                              |              2 |        4,831 s | **🟢 Live**; Production 2.105 s → 23.86 ms, 603 dòng exact parity         |

Nguyên tắc: historical inventory giúp không bỏ sót; quick summary Production là số liệu để quyết định thứ tự tối ưu hôm nay.

Quy tắc hoàn thành một mục:

- Benchmark trên Orb với cùng fingerprint và dữ liệu tương đương.
- So sánh output trước/sau bằng dữ liệu đầy đủ, không chỉ số dòng.
- Chỉ đưa lên Production khi nhanh hơn tối thiểu 20%.
- Sau deploy: xác minh execution plan, health và theo dõi slow log mới.

## 🟢 Đã hoàn tất trên Production

- [x] **CC KPI Daily Sales projection / snapshot**
  - Thay đổi: CRM daily read model cho all-store Daily Sales; giữ nguyên Completed-order, actual check-in, CC IN/OUT 50/50 và daily-tier trong canonical source.
  - Production benchmark: p95 canonical **2.874 s** → guarded snapshot **17 ms**; nhanh hơn khoảng **169×** (giảm **99,4%**), hash output khớp tuyệt đối.
  - Safety: coverage 30 ngày, active-CC change và missing coverage đều fallback canonical; current-day fact quá 90 giây cũng fallback. Worker rebuild rolling 3 ngày mỗi phút.
  - Scope: chỉ mOS API và CRM; Wings Control không bị thay đổi.

- [x] **CC KPI Daily Sales canonical fallback rewrite**
  - Thay đổi: tách hai nhánh ngày tương đương (actual check-in hoặc booking khi chưa có actual) vào tập `eligible_orders` dùng được index, rồi các aggregate KPI join vào tập đó.
  - Local: 30 ngày, 97 dòng, hash response khớp tuyệt đối; p95 **1.703 s → 65.78 ms** (**25.9×**).
  - Production: API-only release; canonical fallback đo p95 **151 ms**, dưới ngân sách 0,5 giây. Projection vẫn giữ freshness gate và fallback an toàn.
  - Scope: chỉ mOS API; không sửa Wings Control.

- [x] **Happy Call / Order-service date-scope rewrite**
  - Thay đổi: thay predicate `COALESCE(actual, booking)` bằng hai nhánh loại trừ nhau: actual-date trong cửa sổ, hoặc không có actual-date và booking-date trong cửa sổ. Các lookup `LIMIT 1` cho CC/technician giữ nguyên.
  - Local Orb: 568 dòng exact hash parity; p95 **1.267 s → 17.09 ms** (**74.1×**).
  - Production: 603 dòng exact hash parity; p95 **2.105 s → 23.86 ms** (**88.2×**, giảm 98.9%).
  - Scope: chỉ mOS API; API và hai database healthy, Wings Control không đổi.

- [x] **Customer Last Visit projection / snapshot framework**
  - Thay đổi: read model CRM, durable queue, shadow worker, canonical fallback và reconciliation; Legacy chỉ đọc.
  - Orb: campaign 1.855 khách, p95 canonical 323 ms → snapshot 53 ms (giảm 84%), hash output khớp.
  - Production: 4.200 projection Fresh; parity canonical 4.200/4.200, 0 mismatch; snapshot read đã bật. Worker tiếp tục xử lý delta và reconciliation.

- [x] **Technician performance summary**
  - Thay đổi: thêm index `(user_id, date)` trên `report_staff_technician`.
  - Orb: full scan 188.292 rows → range scan 70 rows; nhanh hơn 98,9%.
  - Production: index được dùng, report xuống dưới ngưỡng slow log.
  - Kết quả: không thay đổi.

- [x] **Customer profile / service summary**
  - Thay đổi: scope aggregate `order` và `user_service_balance` theo đúng các user của batch đang hiển thị.
  - Orb: 2,033 ms → 1,311 ms, nhanh hơn 35,5%.
  - Output: hash khớp với query gốc.
  - Production: đã deploy, API health và hai database đều healthy.

- [x] **Daily Combo Status export snapshot**
  - Thay đổi: daily projection, scheduler rebuild, coverage/freshness gate và canonical fallback.
  - Benchmark: p95 **1.190 s → 1 ms** (~**1.190×**); output 30 ngày khớp hoàn toàn.
  - Production: snapshot read đã bật; thiếu hoặc stale ngày nào sẽ tự trả canonical query.

- [x] **Not Live Combo export snapshot**
  - Thay đổi: per-order Combo State projection, guarded lookup và Promotion Name deterministic cho order nhiều service.
  - Production benchmark: full CSV **3.872 s → 230 ms** (~**17×**); 429 dòng byte-for-byte parity.
  - Safety: coverage + freshness + parity phải xanh mới đọc snapshot; mọi thiếu/stale/mismatch đều fallback canonical.
  - Wings Control: checksum và 74 routes được xác minh không thay đổi trong guarded rollout.

## ⚫ Đã test và loại

- [x] **Staff day-off composite index cũ**
  - Thử index `(request_state, from_date, to_date, from_user_id)`; không thắng benchmark và đã gỡ khỏi Orb.

- [x] **Staff day-off payslip range rewrite mới — local endpoint gate xanh**
  - Chỉ thay `DATE(from_date)` bằng range ngày trên `from_date`, tận dụng index sẵn có; không thay dữ liệu hay nghiệp vụ.
  - Lookup Orb, cửa sổ nặng nhất: 834 dòng exact hash parity; p95 **27,43 ms → 2,92 ms** (**9,4×**).
  - Full endpoint trên source khớp revision Production, cửa sổ 31 ngày: CSV 1.206 dòng exact hash parity; p95 **236 ms → 202 ms** (**1,17×**, -14,4%).
  - Trạng thái: 🟡 local candidate; endpoint gate xanh nhưng không còn là nút thắt UX lớn, chưa deploy.

- [x] **Customer search COUNT: bỏ ORDER BY**
  - Kết quả đếm khớp nhưng chậm hơn benchmark gốc; không áp dụng.

- [x] **Customer search composite B-tree index**
  - Không được planner dùng do nhiều `LIKE '%term%'` kết hợp `OR`; chậm hơn 3%.

- [x] **Order + report-order aggregate / Service-duration / Order-based**
  - Các join và filter chính đã có index đúng và đang được dùng.
  - Nút thắt còn lại là temporary table, filesort hoặc tập `IN (...)` lớn; không thêm index suy đoán.

## Backlog ưu tiên — chưa triển khai

### 🟢 Rollout hoàn tất — Combo snapshots

| Hạng mục                  | Production evidence                                                                                          | Trạng thái |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------- |
| Daily Combo Status export | 30 ngày exact parity; p95 1.190 s → 1 ms; coverage/freshness gate và canonical fallback                      | **Live**   |
| Not Live Combo export     | Full CSV 429 dòng exact parity; 3.872 s → 230 ms; per-order state projection và deterministic Promotion Name | **Live**   |

Release dùng guarded stage → Wings checksum/74-route guard → atomic switch → endpoint parity/health. Không sửa, restart hoặc ghi đè Wings Control.

### 🟢 Campaign Customers / Last Visit: trace complete, monitor only

**Trace đã khóa:** mOS API `GET /campaigns/:id/customers`, phần Last Visit trong `CampaignService`.

**Kết quả active campaign lớn nhất:** 1.814/1.814 customer có projection fresh, timestamp khớp canonical 100%. Canonical local p95 **395,8 ms**, projection p95 **53,35 ms**.

- [x] Coverage và parity của campaign active được xác minh.
- [x] Không dùng fast-path `user_profile.last_order_booking` vì từng lệch business rule.
- [ ] Chỉ mở lại khi slow log mới chứng minh request user-facing vượt **0,5 giây** hoặc thiếu coverage projection.

Lý do: mục này hiện đã dưới ngân sách và không còn fallback ở campaign active; thêm rewrite bây giờ chỉ tăng rủi ro mà không tạo lợi ích UX.

### 🟢 P1 — Staff Working Shift CSV: local verification complete

- [x] Local endpoint đúng source live, default active-roster: full CSV p95 **144 ms** trên 10 lượt; nội dung ổn định byte-for-byte.
- [x] Nhánh `include_history=1`: full CSV p95 **151 ms** trên 5 lượt; dữ liệu lịch sử vẫn truy cập được và ổn định.
- [ ] Theo dõi traffic Production sau cutover scheduler incremental; chỉ trace/write thêm nếu p95 full export tái hiện vượt **0,5 giây**.

Lý do: core query đã live nhanh; historical p95 CSV bị nhiễu bởi worker full-rebuild cũ, hiện đã bị thay bằng scheduler incremental.

### 🟡 P2 — Customer search (Wings Control): local candidate

- [x] Loại cách gộp chuỗi: rất nhanh nhưng sai phone/social, không sử dụng.
- [x] Read model theo từng field đã qua full-set parity cho name, phone và social; thêm `user_id` làm tie-break để thứ tự ổn định.
- [x] Orb benchmark: canonical khoảng **0,50–0,65 giây**, candidate khoảng **0,21–0,26 giây** (**~2–3×**).
- [ ] Thiết kế capture incremental theo thay đổi User/Profile/Contact/Social và kiểm tra full pagination.
- [ ] Benchmark endpoint Wings thật, review patch hẹp, rồi mới đề xuất rollout guarded.

Lý do: nhiều `LIKE '%term%'` và `OR` trên profile/contact/social; B-tree không giải quyết được, còn read model chỉ hợp lệ khi giữ 100% semantics và freshness.

### 🔵 P3 — Schema metadata

- [ ] Tìm caller đang phát sinh `SHOW FULL COLUMNS` lặp lại.
- [ ] Cache metadata theo process hoặc loại khỏi request path.
- [ ] So sánh cold-cache và warm-cache trước khi thay đổi.

Lý do: xuất hiện nhiều nhưng không phải query nghiệp vụ; thêm index không có tác dụng.

### 🔵 P4 — Service-duration report

- [ ] Chỉ xem xét rewrite `UNION ALL` / aggregate sau khi P1 hoàn tất.
- [ ] Giữ nguyên logic duration và benchmark từng branch.

Lý do: các index join/date chính đã được dùng; còn temporary/filesort ở kết quả derived.

## Theo dõi

- [ ] Mỗi giờ: nhóm fingerprint mới, tách query thực sự vượt `long_query_time` khỏi query log vì thiếu index.
- [x] Full-window Combo rebuild mỗi phút đã được thay bằng scheduler incremental có lock.
- [ ] Không tái đưa full-window rebuild hoặc `order` delta scan mỗi phút vào cron. Nếu cần đối soát rộng, chạy ngoài giờ và có lock.
- [ ] Sau mỗi deploy: theo dõi ít nhất một cửa sổ traffic trước khi đóng task.
