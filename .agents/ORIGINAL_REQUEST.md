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
