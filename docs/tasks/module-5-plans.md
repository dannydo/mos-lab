# Task Checklist - Module 5: Kế hoạch Ca & Cấu hình Hệ thống API (`apps/api`)

Mục tiêu: Chuẩn hóa các API liên quan đến Lập Kế hoạch ca gọi ngày (Daily Plan) và Cấu hình Cột hiển thị Bảng biểu cá nhân hóa (Table Config) sang Fastify 5 Backend.

---

## 📋 List API Endpoints Cần Thực Thi & Kiểm Thử

### 1. Daily Plan API (`/api/plans`)

- [x] `GET /api/plans`: Lấy danh sách kế hoạch chăm sóc/gọi điện theo ngày của Telesales/Booker.
- [x] `POST /api/plans`: Thêm khách hàng vào kế hoạch gọi ngày (Kiểm tra trùng lặp & tự động cập nhật `totalPlanned` trong KPI).
- [x] `PUT /api/plans/:id`: Cập nhật trạng thái plan (`PLANNED`, `CALLED`, `CONFIRM`, `SKIPPED`).
- [x] `DELETE /api/plans/:id`: Xóa mục kế hoạch ca.

### 2. Dynamic Table Column Configuration API (`/api/table-config`)

- [x] `GET /api/table-config/:tableId`: Lấy cấu hình hiển thị cột cá nhân hóa của nhân viên & template mặc định.
- [x] `POST /api/table-config/:tableId`: Lưu cấu hình ẩn/hiện cột bảng biểu của nhân viên (Cho phép Admin danhdo@gmail.com lưu làm template mặc định cho toàn hệ thống).

---

## 🧪 Kịch Bản Kiểm Thử Xác Minh (Verification)

1. Build toàn bộ monorepo (`pnpm build`) đạt 4/4 packages thành công **0 error**.
2. Đã xác nhận trang Swagger UI tại `http://localhost:4001/documentation` dưới Tag `Plans` và `TableConfig`.
