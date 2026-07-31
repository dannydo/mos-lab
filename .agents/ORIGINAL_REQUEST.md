# Original User Request

## 2026-07-26T08:26:34Z

Thực hiện một cuộc review kỹ lưỡng bản Implementation Plan cho tính năng "Catalog Management (Services, Combos & Products CRUD for Admin)" trong dự án mos-lab. Sản phẩm đầu ra là báo cáo phân tích chi tiết với risk rating (Critical / High / Medium / Low) và đề xuất sửa đổi cụ thể.

Working directory: /Users/dannydo/projects/mos-lab
Integrity mode: development

## Requirements

### R1. Schema Correctness Audit (Legacy DB vs. Implementation Plan)

Xác minh rằng các Prisma model mới được đề xuất thêm vào `apps/api/prisma/legacy.prisma` (service_price, product, product_language, product_price) khớp 100% với schema thực tế từ codebase WingsLashes. Cụ thể:

- So sánh từng cột (tên, kiểu, nullable, default) giữa WingsLashes PHP DbTable models tại `/Users/dannydo/projects/WingsLashes/Server/src/admin/apps/models/DbTable/ServicePriceDbTable.php`, `ProductDbTable.php`, `ProductLanguageDbTable.php`, `ProductPriceDbTable.php`, `ServiceDbTable.php`, `ServiceLanguageDbTable.php` với schema Prisma đã có và schema được đề xuất.
- Kiểm tra model `service` hiện tại trong `legacy.prisma` (line 119-151) có thiếu cột nào so với `ServiceDbTable.php` hay không (ví dụ: `reminding_interval_day` vs `remind_interval_day`, `duration_minute_standard`, `last_day_required`, các attribute_set_id...).
- Xác minh model `service_language` hiện tại (line 153-161) đã đầy đủ chưa.
- Phát hiện thiếu sót hoặc sai lệch kiểu dữ liệu, tên cột.

### R2. API Design & Completeness Review

Đánh giá thiết kế 11 endpoints `/api/catalog/*` được đề xuất:

- Xem xét convention naming và RESTful design so với các module hiện có (xem `apps/api/src/server.ts` để hiểu cách route được đăng ký với prefix `/api`, ví dụ `customerRoutes` → `/api/customers`).
- Kiểm tra thiếu pagination cho listing endpoints (GET /services, GET /products) — các module khác dùng `page` + `pageSize`.
- Đánh giá error handling, input validation, response typing.
- Xác minh cách sử dụng `requireRole` — middleware này nhận `UserRole[]` array (file `apps/api/src/middlewares/auth.ts`), plan nói `requireRole('admin')` nhưng signature thực tế là `requireRole(['admin'])`.
- Kiểm tra liệu có cần thêm endpoints nào chưa được liệt kê: soft delete, bulk operations, reorder (position), search/filter by service_group hoặc service_type.

### R3. Business Logic Gaps & Edge Cases

Phát hiện các edge cases và business logic chưa được đề cập:

- **Multi-currency**: Bảng `service_price` có `currency_id` — plan cần xử lý thế nào khi tạo service price mới (hardcode currency_id hay cho chọn)?
- **Multi-store/client**: Bảng `service` và `product` có `client_id`, `client_business_id` — plan cần chỉ rõ giá trị cố định nào sẽ dùng (vì mos-lab là single-tenant).
- **Parent-child service hierarchy**: Model `service` có `parent_service_id` — plan hoàn toàn chưa đề cập đến cách hiển thị hoặc quản lý cấu trúc phân cấp này.
- **service_type / service_group values**: Cần xác minh danh sách các giá trị hợp lệ (Normal, Fix, Adjust, Log, combo, single, product...) để frontend hiển thị dropdown đúng.
- **Cascading effects**: Khi disable một service, các service_price con có tự động bị disable không? Khi disable product, order_product có bị ảnh hưởng không?
- **service_price_package_key** format convention — cần tuân thủ format hiện tại để ComboRecognitionService không bị lỗi.

### R4. Security & Data Integrity Risk Assessment

- Xác minh plan đảm bảo admin-only access ở cả 3 lớp: Backend middleware, Frontend route guard, Sidebar visibility.
- Đánh giá rủi ro khi CRM ghi trực tiếp vào Legacy DB `management` (READ-ONLY rule hiện tại trong AGENTS.md nói `fastify.prisma.legacy` là **READ-ONLY** — cần clarify liệu plan có vi phạm quy tắc này).
- Race conditions khi WingsLashes app đang đọc/ghi song song với CRM mới.
- Cần transaction support (Prisma `$transaction`) cho các thao tác tạo service + service_language + service_price cùng lúc.

### R5. Frontend UX & AGENTS.md Compliance

- Kiểm tra plan UI tuân thủ Theme rules (Light/Dark theme, `tabular-nums`, Ant Design Token).
- Xác minh plan đề cập đủ: `apiClient` SDK usage (không raw axios), shared types from `@mos-lab/shared`.
- Kiểm tra file imports convention: backend `.js` extension, Tailwind v4 + Antd hybrid styling.
- Đánh giá 3-tab layout (Dịch vụ lẻ, Gói Combo, Sản phẩm) có phù hợp với data model hay cần restructure.

## Acceptance Criteria

### Schema Analysis

- [ ] Bảng so sánh (table format) giữa WingsLashes PHP model fields và Prisma proposed fields cho tất cả 6 bảng (service, service_language, service_price, product, product_language, product_price)
- [ ] Danh sách cụ thể các cột thiếu/sai trong implementation plan so với legacy schema thực tế

### API Design

- [ ] Phát hiện ít nhất bất kỳ vấn đề thiết kế nào (nếu có) với justification rõ ràng
- [ ] Xác minh requireRole signature match (array vs single string)
- [ ] Đề xuất cụ thể endpoints bổ sung nếu cần

### Business Logic

- [ ] Mỗi edge case (multi-currency, multi-store, parent-child, cascading effects) được đánh giá risk level và có đề xuất xử lý
- [ ] Danh sách giá trị hợp lệ cho service_type, service_group, service_price_type dựa trên codebase

### Security

- [ ] Xác minh/phản biện READ-ONLY constraint của legacy DB theo AGENTS.md
- [ ] Đánh giá transaction safety cho multi-table writes

### Report Format

- [ ] Mỗi finding có risk rating: Critical / High / Medium / Low
- [ ] Mỗi finding có "Proposed Fix" mô tả thay đổi cụ thể cần áp dụng vào implementation plan
- [ ] Executive summary ở đầu báo cáo tổng hợp số lượng findings theo mức độ

## Follow-up — 2026-07-26T16:51:23Z

Deep audit and verification of combo package key (service_price_package_key) renaming across both WingsLashes (legacy PHP/Angular) and mos-lab (Next.js/Fastify) codebases.

Working directory: /Users/dannydo/projects/mos-lab

## Requirements

### R1. WingsLashes Legacy Codebase Impact Audit

Audit all references to service_price_package_key across WingsLashes/Server/src/api/1 models, controllers, and Angular frontend components to identify any hardcoded key checks or potential side effects of adding price suffixes.

### R2. mos-lab CRM Compatibility Audit

Verify all references to service_price_package_key in apps/api/src/modules/customers/services/combo-recognition.service.ts, catalog/routes.ts, and frontend components to ensure 100% compatibility with Rule #21.

## Acceptance Criteria

### Audit & Verification Criteria

- [ ] Complete list of all service_price_package_key references in WingsLashes documented with safety ratings.
- [ ] Verification that ComboRecognitionService and all CRM reports operate cleanly with suffix-normalized package keys.

## Follow-up — 2026-07-27T16:34:40Z

Kiểm tra và tự động sửa tất cả các lỗi độ tương phản (contrast), màu sắc và khả năng truy cập (accessibility) cho tất cả các trang (Pages), Modal Popup, và Thanh trượt bên (Side Drawers / Side Slides) trong ứng dụng web mos-lab, đảm bảo đúng theo tiêu chuẩn /modern-web-guidance và hoạt động hoàn hảo trên cả 2 nền Light Theme & Dark Theme.

Working directory: /Users/dannydo/projects/mos-lab
Integrity mode: development

## Requirements

### R1. Comprehensive Accessibility & Contrast Audit across All Views

Review and identify low-contrast text, missing focus indicators, and improperly scoped dark/light colors across all pages (/dashboard, /login), Modal Popups (KPI, Order detail, Edit Customer, etc.), and Side Drawers (Side Slides) in both Light (.light-theme) and Dark (.dark-theme) modes.

### R2. CSS Token & Modern Color Scheme Standards Alignment

Refactor styles to strictly adhere to Ant Design 5 token system and globals.css theme variables. Ensure text meets WCAG AA standards (contrast ratio ≥ 4.5:1 for normal body text, ≥ 3:1 for large text/interactive components). Eliminate conflicting hardcoded styles (e.g., hardcoding #141414 !important without .dark-theme scoping).

### R3. Interactive States & Tabular Numbers Optimization

Ensure all dynamic counters, time clocks, durations, and financial figures use tabular-nums (font-variant-numeric: tabular-nums). Add clean :focus-visible styling for visual accessibility and ensure buttons/interactive icons have readable labels.

## Acceptance Criteria

### Contrast & Legibility

- [ ] 100% of text elements across all pages, popups, and side drawers meet WCAG AA contrast standards in both Light and Dark themes.
- [ ] No dark text on dark backgrounds or faint text on light backgrounds in any popup or side drawer.

### Theme & Styling Integrity

- [ ] Modal popups and Side Drawers render seamlessly when toggling between .light-theme and .dark-theme.
- [ ] All table/modal/drawer overrides in globals.css follow proper theme scoping (e.g. .dark-theme .ant-modal-content).

### Accessibility & Animation

- [ ] Dynamic counter/time elements use tabular-nums to eliminate layout jitter.
- [ ] Keyboard navigation visual focus (:focus-visible) works cleanly across interactive elements.

## Follow-up — 2026-07-28T09:07:27Z

Refactor standard search filtering across all CRM dashboard modules in mos-lab (apps/web & apps/api) to support tone-insensitive & case-insensitive Vietnamese search (removeVietnameseTones).

Working directory: /Users/dannydo/projects/mos-lab
Integrity mode: development

## Requirements

### R1. System-Wide Tone-Insensitive Vietnamese Search Helper

- Export a standardized removeVietnameseTones(str: string): string utility in shared package/lib (apps/web/lib/utils/search.ts or @mos-lab/shared).
- Implement tone-insensitive and case-insensitive matching logic for all <Select showSearch> components, table filters, and search inputs across all CRM modules.

### R2. Refactor Existing Search Controls Across All Dashboard Modules

- Refactor all Ant Design <Select showSearch> controls and table filters across all modules (/dashboard/today, /dashboard/customers, /dashboard/bk, /dashboard/cc, /dashboard/cv, /dashboard/catalog, /dashboard/appointments, /dashboard/loca, /dashboard/nyc, /dashboard/omicall, /dashboard/staff) to use filterOption={(input, option) => removeVietnameseTones(String(option?.label || '')).includes(removeVietnameseTones(input))}.

### R3. Automated Build Verification

- Execute pnpm --filter @mos-lab/web build to verify clean TypeScript compilation and static page generation without any errors.

## Acceptance Criteria

### Comprehensive Search Support

- [ ] Searching "diep" matches "Ngọc Điệp" in staff/booker/customer search inputs across all modules.
- [ ] Searching "hang" matches "Hằng Ni" and "thuy" matches "Thuỳ Trang 🌸".
- [ ] All <Select showSearch> components in /dashboard/* use removeVietnameseTones.
- [ ] pnpm --filter @mos-lab/web build passes with zero type errors.

## Follow-up — 2026-07-29T07:39:58Z

Thêm action gửi tin nhắn cho Chạm 17 (ngày) trong hệ thống CRM / Chăm sóc khách hàng.

- Nút action Gửi SMS được hiển thị ngay tại cột thao tác của tab **Chạm 17 (ngày)** trong màn hình quản lý khách hàng (LoCa/NYC).
- Hình 1: Cho phép Admin tùy chỉnh tin nhắn mẫu linh hoạt (tương tự modal copy tin nhắn mẫu Combo: hỗ trợ chèn thẻ biến `{ten_khach}`, `{han_dung}`, ..., xem trước live preview). Mẫu chuẩn hệ thống do Admin lưu vào Backend DB để dùng chung toàn công ty.
- Hình 2: Sử dụng hệ thống cũ để lưu lịch sử tin nhắn SMS và tạo tin nhắn mẫu (Backwards Compatible 100% với bảng `user_sms` và hệ thống legacy).

Working directory: /Users/dannydo/projects/mos-lab
Integrity mode: development

## Requirements

### R1. Vị trí Nút Action Gửi SMS tại Tab Chạm 17 (ngày)

Hiển thị nút/icon gửi SMS ngay tại cột Thao tác của từng dòng khách hàng trong tab Chạm 17 (ngày). Khi nhấp vào sẽ mở Modal Gửi SMS / Chỉnh Template.

### R2. Cấu hình & Quản lý Template Tin nhắn Mẫu (Hình 1)

- Admin có quyền lưu/cập nhật Template chuẩn hệ thống vào Backend DB (`crm_config` hoặc bảng template).
- Booker/Staff khi gửi SMS có thể chọn template chuẩn, chèn các thẻ biến (`{ten_khach}`, `{han_dung}`, `{so_ngay_dam}`, `{ten_combo}`, `{sdt_cua_hang}`, ...), tùy chỉnh thêm nội dung và xem trước (live preview) nội dung thực tế trước khi gửi.

### R3. Tích hợp Backend Fastify & Hệ thống SMS Cũ (Hình 2)

- Xây dựng/Cập nhật API backend Fastify `/api/sms/send` và `/api/sms/templates`.
- Khi bấm Gửi SMS, hệ thống ghi bản ghi mới vào CSDL legacy bảng `user_sms` (`to_phone_number`, `body`, `template_id`, `created_staff_id`, `date_created`, ...), đồng thời tự động cập nhật nhật ký liên hệ của khách hàng (`crm_call_logs` với `call_type = 'SMS'`).
- Hiển thị danh sách Lịch sử SMS đã gửi của khách hàng và danh sách các Template SMS legacy (như `Reminder 17 - Single`) theo giao diện hệ thống cũ (Hình 2).

## Acceptance Criteria

### Chức năng Gửi SMS & Template

- [ ] Tại tab Chạm 17 (ngày), cột Thao tác hiển thị nút Gửi SMS.
- [ ] Mở Modal SMS gồm 2 phần: Bên trái hiển thị Lịch sử SMS đã gửi (từ `user_sms`), Bên phải là trình soạn thảo Template (kiểu Combo Copy Modal) + Danh sách Mẫu SMS hệ thống.
- [ ] Admin có nút "Lưu Template Mẫu" ghi vào Backend DB cho toàn hệ thống.
- [ ] Booker có thể chèn thẻ biến, chỉnh sửa nội dung tin nhắn và xem trước (Live Preview) chuẩn xác tên khách, ngày dặm, hạn dùng trước khi gửi.
- [ ] Khi bấm Gửi SMS, hệ thống gọi API `/api/sms/send`, lưu bản ghi vào `user_sms` legacy DB, tự động ghi log `crm_call_logs` và hiển thị thông báo thành công.

## Follow-up — 2026-07-29T09:13:07Z

Nâng cấp hệ thống phân bổ khách hàng cho Booker trong mos-lab: Chuyển đổi sang quy trình Kiểm chứng & Chấp nhận theo Batch (`PENDING_ACCEPT`), đảm bảo tăng chính xác $N+10$ không trùng lặp, lưu vết lịch sử 30 ngày có đếm ngược countdown, và cung cấp Bảng Điều khiển Phân bổ (Allocation Audit Dashboard) cho Admin/Manager kiểm tra chéo công bằng.

Working directory: /Users/dannydo/projects/mos-lab
Integrity mode: development

## Requirements

### R1. Quy trình Kiểm chứng & Chấp nhận Phân bổ theo Batch (Batch Pending Accept Flow)

- Khi Admin/Manager phân bổ $N$ khách hàng cho Booker, hệ thống tạo đợt phân bổ ở trạng thái `PENDING_ACCEPT` kèm thời hạn đếm ngược 24 giờ.
- Trong thời gian 24h chờ duyệt, khách hàng chưa xuất hiện trong danh sách hoạt động chính thức của Booker.
- Booker nhận thông báo/modal kiểm chứng danh sách khách hàng trong Batch (tên, thông tin tóm tắt, nguồn khách, lịch sử chăm sóc).
- Booker bấm **"Chấp nhận toàn bộ"**: Batch chuyển sang `ACCEPTED`, toàn bộ $N$ khách hàng được gán chính thức cho Booker.
- Booker bấm **"Từ chối toàn bộ"**: Batch chuyển sang `DECLINED`, bắt buộc nhập lý do từ chối. Toàn bộ batch lập tức hoàn trả về pool phân bổ của Admin/Manager.
- Nếu quá 24h Booker không thao tác: Batch tự động chuyển sang `EXPIRED`, khách hàng tự động hoàn trả về Admin.

### R2. Đảm bảo Độc quyền, Không trùng lặp & Tăng chính xác $N + 10$ (Strict Deduplication & DB Transaction)

- Lọc trùng ở Backend & Database: Hệ thống tự động loại bỏ các khách hàng đã thuộc quyền sở hữu của Booker hiện tại hoặc đang ở batch `PENDING_ACCEPT` khác trước khi tạo batch.
- Sử dụng Prisma `$transaction` và Unique Constraint trên DB: Đảm bảo khi Booker nhấn "Chấp nhận" batch $N$ khách hàng, tổng số khách hàng của Booker tăng chính xác đúng $+N$ (ví dụ ban đầu có $n$, sau khi nhận 10 khách sẽ là đúng $n+10$), không bị trùng lặp ID hay sai lệch số lượng.

### R3. Lịch sử Phân bổ 30 ngày & Đồng hồ Đếm ngược Countdown (30-Day History & Timer)

- Xây dựng tab/màn hình Lịch sử Phân bổ (Allocation History) hiển thị danh sách các đợt phân bổ trong 30 ngày gần nhất cho cả Booker và Admin/Manager.
- Mỗi bản ghi lịch sử lưu giữ thông tin: Đợt phân bổ, Người phân bổ, Booker nhận, Số lượng khách, Trạng thái (`PENDING_ACCEPT`, `ACCEPTED`, `DECLINED`, `EXPIRED`), Lý do từ chối (nếu có).
- Mỗi bản ghi hiển thị đồng hồ đếm ngược (countdown badge 30 ngày) cho biết thời gian còn lại trước khi bản ghi lịch sử hết hạn/tự động ẩn.

### R4. Bảng Điều khiển Phân bổ & Kiểm tra Chéo cho Admin/Manager (Allocation Audit Dashboard)

- Cung cấp màn hình Bảng Điều khiển Phân bổ Toàn bộ cho Admin và Manager để theo dõi bức tranh phân bổ minh bạch.
- Thống kê tỷ lệ chấp nhận/từ chối/quá hạn của từng Booker, hiển thị lý do từ chối để Admin/Manager đánh giá và phân bổ công bằng.
- Cung cấp nút **"Thu hồi Batch" (Recall Batch)** cho Admin/Manager để chủ động thu hồi các đợt phân bổ ở trạng thái `PENDING_ACCEPT` nếu phát hiện lỡ gán nhầm trước khi Booker bấm chấp nhận.

## Acceptance Criteria

### Verification & Confirmation

- [ ] Khi Admin phân bổ 10 khách hàng cho Booker, batch được tạo ở trạng thái `PENDING_ACCEPT` với timer 24h.
- [ ] Booker nhận thông báo và xem được danh sách khách hàng trong batch để kiểm chứng.
- [ ] Khi Booker bấm "Chấp nhận", batch chuyển `ACCEPTED`, danh sách khách hàng chính thức của Booker tăng đúng +10, không trùng lặp ID.
- [ ] Khi Booker bấm "Từ chối" kèm lý do, batch chuyển `DECLINED` và 10 khách hàng quay lại pool phân bổ của Admin.
- [ ] Nếu quá 24h không duyệt, batch tự chuyển `EXPIRED` và hoàn trả khách về Admin.

### Deduplication & Database Integrity

- [ ] Thao tác gán khách hàng đảm bảo tính nguyên tố ($transaction): nếu giao 10 khách thì total count của Booker tăng đúng $n+10$.
- [ ] Không thể tạo batch phân bổ trùng khách hàng đang `PENDING_ACCEPT` hoặc đã active.

### 30-Day History & Countdown Timer

- [ ] Booker và Manager xem được lịch sử phân bổ trong 30 ngày.
- [ ] Mỗi dòng lịch sử có badge đếm ngược countdown (ví dụ: `29 ngày 18 giờ`) và tự động lưu trữ sau 30 ngày.

### Admin/Manager Audit & Recall

- [ ] Admin/Manager xem được Bảng Điều khiển Phân bổ toàn bộ Booker kèm chỉ số tỷ lệ nhận/từ chối và lý do từ chối.
- [ ] Admin/Manager bấm "Thu hồi Batch" đối với batch `PENDING_ACCEPT` thành công, batch chuyển sang `RECALLED` và khách hàng trả lại pool.

## Follow-up — 2026-07-30T13:08:31Z

Chạy Proof-of-Concept (PoC) thử nghiệm cài đặt và đánh giá Graphify (hoặc giải pháp kiến trúc knowledge graph tương đương) trên monorepo `mos-lab` (Next.js 15 web + Fastify 5 api + shared package), đồng thời tạo script tự động sinh báo cáo sơ đồ đồ thị phụ thuộc (`graph.html`, `GRAPH_REPORT.md`).

Working directory: /Users/dannydo/projects/mos-lab
Integrity mode: development

## Requirements

### R1. Phân tích & So sánh Kiến trúc (Graphify vs Alternatives)

Đánh giá chi tiết ưu/nhược điểm của `graphify` so với tính năng có sẵn `pnpm turbo graph` và các thư viện phân tích mã nguồn (`dependency-cruiser`, `madge`) trên codebase `mos-lab`. Focus vào khả năng trích xuất AST cho TypeScript, Prisma Schema, Fastify routes và hiệu quả hỗ trợ AI Agent context.

### R2. Thử nghiệm PoC & Tạo Script Sinh Sơ Đồ Knowledge Graph

Tạo script hoặc lệnh tích hợp trong monorepo (ví dụ: `pnpm graph` hoặc `scripts/generate_graph.sh`) để quét các workspace (`apps/api`, `apps/web`, `packages/shared`), tự động sinh ra các artifact đồ thị (`graph.html`, `GRAPH_REPORT.md` hoặc `graph.json`).

### R3. An toàn Workspace & Không ảnh hưởng luồng Dev

Đảm bảo các file đầu ra sinh ra được ghi vào thư mục tạm/báo cáo (hoặc `.gitignore`) và tuyệt đối không gây phá vỡ luồng `pnpm dev` hay `pnpm build` hiện tại của monorepo.

## Acceptance Criteria

### Tính năng & Báo cáo

- [ ] Báo cáo đánh giá so sánh Graphify và giải pháp thay thế được tạo đầy đủ.
- [ ] Script sinh kiến trúc đồ thị chạy thành công và tạo ra file trực quan hóa `graph.html` hoặc báo cáo chi tiết.
- [ ] Tích hợp lệnh chạy thuận tiện (script npm/pnpm) trong dự án `mos-lab`.
- [ ] Toàn bộ luồng build (`pnpm build`) và dev (`pnpm dev`) của dự án giữ nguyên 100% không bị ảnh hưởng.

## Follow-up — 2026-07-31T03:53:06Z

Build a Custom Campaign System under the existing NYC (Người Yêu Cũ / Not Combo Live) campaign in the mos-lab CRM monorepo. Admin can create named sub-campaigns (e.g. "Kiều Nữ"), add NYC customers exclusively into them, assign customers to Bookers via batch allocation, configure custom touchpoint pipelines, attach flexible promotions, and let CC/Booker staff operate on those customers with the same workflow tools (call, SMS, booking, detail view).

Working directory: /Users/dannydo/projects/mos-lab
Integrity mode: development

## Requirements

### R1. Custom Campaign CRUD (Admin-only)

Admin can Create, Read, Update, Delete custom campaigns. Each campaign has: a unique name, description, start date, end date, and status (active/ended/archived). Campaigns are always children of the NYC parent campaign. Only users with role === 'admin' (or username admin / danhdo@gmail.com) can manage campaigns. When a campaign ends (passes its end date), the system should return unbooked customers back to the NYC main pool and mark the campaign as ended — while preserving participation history logs.

Database: Create new CRM Prisma tables:

- crm_custom_campaigns — stores campaign metadata (id, name, slug, description, startDate, endDate, status, createdBy, createdAt, updatedAt)
- crm_campaign_customers — many-to-many linking customers to campaigns (id, campaignId, legacyUserId, addedAt, removedAt, removedReason)
- crm_campaign_touchpoints — custom touchpoint config per campaign (id, campaignId, key, label, daysMin, daysMax, color, sortOrder)
- crm_campaign_promotions — promotions attached to a campaign (id, campaignId, name, type: 'PERCENT_DISCOUNT' | 'FIXED_DISCOUNT' | 'FREE_SERVICE' | 'FREE_PRODUCT', value, description, isActive, createdAt)
- crm_campaign_touchpoint_logs — checkbox tracking per customer per touchpoint (id, campaignCustomerId, touchpointId, completedAt, completedByStaffId)

### R2. Customer Selection & Exclusive Assignment

Admin can filter and select customers from the NYC pool only (bucket NOT_COMBO_LIVE) and add them to a custom campaign. Once added, the customer is exclusively removed from the NYC main listing (the existing /api/customers?bucket=NOT_COMBO_LIVE query must exclude customers who are currently in any active custom campaign). A customer can only belong to one active custom campaign at a time. Admin can also remove individual customers from a campaign, returning them to NYC main.

Backend changes needed:

- Modify the existing NYC customer listing query in apps/api/src/modules/customers/routes.ts to add a LEFT JOIN crm_campaign_customers exclusion filter: AND cc.id IS NULL (where cc has no removedAt and campaign is active).
- Modify the existing NYC stats query similarly to keep counts consistent (Dual-Query Alignment rule).
- New API endpoints under /api/campaigns/:campaignId/customers for adding/removing customers.

### R3. Custom Touchpoint Pipeline with Tracking

Each custom campaign has its own touchpoint pipeline defined by Admin. Touchpoints are based on daysSinceAdded (days since the customer was added to the campaign). The system:

1. Automatically classifies customers into touchpoint buckets based on DATEDIFF(NOW(), crm_campaign_customers.addedAt).
2. Provides checkbox tracking — staff can mark a customer as "touched" at each touchpoint milestone (stored in crm_campaign_touchpoint_logs).
3. Default state: just "Tất cả chạm" (All). Admin adds custom touchpoints as needed.

The touchpoint capsule filter UI should match the existing NYC touchpoint pipeline design (colored capsule badges with counts).

### R4. Campaign Page UI & Navigation

- Sidebar: Convert the existing "Chiến dịch NYC" menu item into a collapsible submenu with children: "NYC Chính" (links to existing /dashboard/nyc) + one link per active custom campaign (/dashboard/nyc/campaigns/:slug).
- Campaign page (apps/web/app/dashboard/nyc/campaigns/[slug]/page.tsx): A new page that reuses the NYC page design pattern but simplified:
  - No NYC 30/60/90 tabs — just a single flat customer list.
  - Header metrics cards: Total customers, Booked Rate, Touchpoint Progress, Calls Today, Campaign Revenue.
  - Touchpoint pipeline capsules (custom per campaign).
  - Booker filter (Admin-only): Dropdown to filter by assigned Booker or view all. Booker users automatically see only their assigned customers.
  - Customer table with actions: Call (OmiCall), SMS, View Detail, Book Appointment. Table shows assigned Booker column.
  - Batch assignment action (Admin-only): Select multiple customers → "Assign to Booker" button opens batch allocation modal (reuse existing allocation UI pattern).
  - Campaign info banner showing name, date range, active promotions, and a manage button for Admin.
- Campaign Management page (apps/web/app/dashboard/nyc/campaigns/page.tsx): Lists all custom campaigns with their status, customer count, and quick actions (edit, view, end campaign).

### R5. Flexible Promotion System

Admin can attach multiple promotions to a campaign. Promotion types:

- Percentage discount (e.g., 20% off)
- Fixed amount discount (e.g., 100,000đ off)
- Free service (e.g., free eyelash cleaning)
- Free product (e.g., free mascara)

Promotions are exclusive to campaign customers — only customers currently in the campaign can have these promotions applied. When staff creates a booking via BookingWizardDrawer for a campaign customer, the available campaign promotions appear as selectable options (dropdown/checkbox). The promotion selection is stored with the booking for reporting.

### R6. Shared Types & API Client

- Define all new TypeScript types in packages/shared/src/types/campaign.ts (Campaign, CampaignCustomer, CampaignTouchpoint, CampaignPromotion, etc.)
- Add all new API endpoints to the apiClient SDK in apps/web/lib/api-client.ts under apiClient.campaigns.*
- Backend routes must use .js file extensions for imports (NodeNext rule)

### R7. Booker Assignment via Batch Allocation

Admin can assign campaign customers to Bookers using the existing batch allocation system (crm_allocation_batches + crm_allocation_batch_items), extended with a campaignId field to track campaign context.

Workflow (2-step process):

1. Step 1 — Add customers: Admin adds customers from NYC pool into the campaign (they are now in campaign but unassigned).
2. Step 2 — Assign to Booker: Admin selects unassigned campaign customers → creates a batch allocation → Booker has 24h to Accept/Decline → on Accept, 30-day retention begins.

Key rules:

- Retention expiry: retentionExpiresAt = min(now + 30 days, campaign.endDate) — assignment never outlasts the campaign.
- Visibility: Booker can only see customers assigned to them within the campaign. Admin sees all customers and can filter by Booker.
- Existing allocation infrastructure: Reuse AllocationService (apps/api/src/modules/allocation/allocation.service.ts), allocation routes, and allocation-cron.service.ts. Add optional campaignId field to crm_allocation_batches and filter logic.
- Campaign expiry cascade: When a campaign ends, all active assignments for that campaign are also expired (deleted from crm_customer_assignments with history log).

Database changes:

- Add campaignId Int? @map("campaign_id") to CrmAllocationBatch model with relation to CrmCustomCampaign.
- Add campaignId filter to allocation queries so campaign-specific batches are scoped correctly.

## Acceptance Criteria

### Campaign CRUD

- [ ] Admin can create a campaign with name, description, start/end dates from a form
- [ ] Campaign appears as a submenu item under "Chiến dịch NYC" in sidebar
- [ ] Admin can edit campaign details and end/archive a campaign
- [ ] When campaign ends, unbooked customers return to NYC main pool
- [ ] Non-admin users cannot access campaign management (create/edit/delete) APIs

### Customer Management

- [ ] Admin can search/filter NYC customers and add them to a campaign (batch or individual)
- [ ] Added customers no longer appear in the NYC main customer listing
- [ ] NYC main stats (tab counts) are updated to exclude campaign customers
- [ ] Admin can remove customers from campaign, returning them to NYC
- [ ] A customer cannot be added to two active campaigns simultaneously

### Booker Assignment

- [ ] Admin can select unassigned campaign customers and create a batch allocation to a Booker
- [ ] Booker receives pending batch notification with 24h accept/decline window
- [ ] On accept, retention expiry is set to min(now + 30d, campaign.endDate)
- [ ] Booker can only see customers assigned to them on the campaign page
- [ ] Admin sees all customers with a Booker filter dropdown
- [ ] When campaign ends, all active campaign assignments are auto-expired with history log
- [ ] crm_allocation_batches has new optional campaignId field correctly linked

### Touchpoint Pipeline

- [ ] Admin can configure custom touchpoints per campaign
- [ ] Customers are automatically classified by daysSinceAdded
- [ ] Staff can mark touchpoint completion (checkbox) per customer
- [ ] Touchpoint capsule UI shows correct counts and highlights

### Campaign Page

- [ ] Page loads showing campaign info, metrics cards, touchpoint pipeline, and customer table
- [ ] Customer table supports: Call, SMS, View Detail, Book Appointment actions
- [ ] Metrics are accurate: total customers, booked rate, touchpoint progress, calls today, revenue
- [ ] Page follows existing dark/light theme correctly

### Promotions

- [ ] Admin can create/edit/delete promotions attached to a campaign
- [ ] Only campaign customers see available promotions when booking
- [ ] Promotion type supports: % discount, fixed discount, free service, free product
- [ ] Promotion selection is recorded with the booking

### Technical Quality

- [ ] All new backend imports use .js extensions
- [ ] Shared types defined in @mos-lab/shared
- [ ] API client SDK updated with all new endpoints
- [ ] Prisma migration runs without errors
- [ ] pnpm build passes without errors
- [ ] Theme support works correctly (light + dark)
- [ ] Follows Monday-first week rule, VND rounding rules, and other AGENTS.md coding guidelines

## Follow-up — 2026-07-31T15:48:52Z

Implement complete unification of batch allocation (crm_allocation_batches, crm_allocation_batch_items) and allocation history tracking (crm_assignment_histories) for Custom Campaign customers in mos-lab.

Working directory: /Users/dannydo/projects/mos-lab
Integrity mode: development

## Requirements

### R1. Unified Customer ID Identification (legacyUserId)

Ensure all campaign customer allocation operations use the true legacyUserId (e.g. 982962666) instead of internal join table record IDs (crm_campaign_customers.id). Table rowKey and selection keys in custom campaign pages must evaluate to record.legacyUserId || record.customerId || record.id.

### R2. Complete Batch Allocation & 24h Booker Acceptance Workflow

When Admin selects campaign customers and clicks "Phân bổ Booker", the system must call AllocationService.createBatch with:

- bookerId: Target Booker ID
- customerIds: Array of true legacyUserIds
- campaignId: Custom Campaign ID
- sourceType: 'MANUAL'
- sourceFilterSummary: Chiến dịch [Tên] ([X] KH)

This generates:

1. crm_allocation_batches with campaignId set
2. crm_allocation_batch_items for each customer
3. crm_assignment_histories entries linked by legacyUserId with actionType = 'ASSIGN'
4. Pending 24-hour notification for the target Booker to Accept/Decline.

### R3. Full Traceability in Allocation History & Customer Detail Drawer

- On Booker accept, update crm_customer_assignments and log actionType = 'ACCEPT' in crm_assignment_histories.
- All campaign allocation actions, transfers, accepts, declines, and expirations must be 100% visible in:
  - Customer Detail Drawer -> Lịch sử Phân bổ (Allocation History tab)
  - Global Allocation History log tables (/dashboard/customers/history or drawer logs)
  - Campaign Customer Table ("Đã phân bổ" status column)

### R4. Campaign Expiration & Assignment Clean-up

When a campaign is ended or archived, active campaign assignments should log an EXPIRED action in crm_assignment_histories and return unbooked customers back to the main NYC pool.

## Acceptance Criteria

### Batch Allocation & Traceability

- [x] Selecting customers in Custom Campaign page uses legacyUserId
- [x] Creating a batch allocation creates records in crm_allocation_batches, crm_allocation_batch_items, and crm_assignment_histories
- [x] Booker receives 24h pending allocation notification
- [x] Allocation history tab in Customer Detail Drawer displays all campaign allocation logs with timestamp, assigner, target booker, and campaign name summary
- [x] pnpm build compiles with 0 errors across all monorepo packages
