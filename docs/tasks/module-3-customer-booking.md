# Task Checklist - Module 3: Customers & Booking API (`apps/api`)

Mục tiêu: Chuyển đổi và chuẩn hóa 100% các API liên quan đến Quản lý Khách hàng, Bộ lọc Bucket, Phân bổ Telesales/Booker, Lịch sử phân bổ & Đặt lịch hẹn sang Fastify Backend.

---

## 📋 List API Endpoints Cần Thực Thi & Kiểm Thử

### 1. Customer Base & Stats API (`/api/customers`)

- [x] `GET /api/customers`: Truy vấn danh sách khách hàng phân trang, tìm kiếm, sắp xếp & lọc theo bucket/daysSinceLastVisit/totalSpent.
- [x] `GET /api/customers/stats`: Thống kê số lượng khách hàng theo từng phân khúc Bucket.
- [x] `GET /api/customers/:id`: Lấy chi tiết thông tin 1 khách hàng.
- [x] `GET /api/customers/:id/detailed`: Lấy chi tiết mở rộng (Lịch sử làm mi, Lịch hẹn, Lịch sử gọi, Giao dịch).
- [x] `PUT /api/customers/:id`: Cập nhật thông tin khách hàng.
- [x] `DELETE /api/customers/:id`: Xóa tạm thời khách hàng.
- [x] `POST /api/customers/:id/restore`: Khôi phục khách hàng từ thùng rác.
- [x] `POST /api/customers/bulk-delete`: Xóa hàng loạt khách hàng.

### 2. Assignment & Telesales Allocation API (`/api/customers/assign`)

- [x] `POST /api/customers/assign`: Phân bổ danh sách khách hàng cho nhân viên Telesales (Admin only, có mã batch ID).
- [x] `POST /api/customers/unassign`: Gỡ phân bổ khách hàng.
- [x] `GET /api/customers/assignment-history`: Lấy danh sách các đợt phân bổ Telesales.
- [x] `POST /api/customers/assignment-history/undo`: Hoàn tác (Undo) đợt phân bổ theo batch ID.

### 3. Booking & Appointments API (`/api/customers/booking`, `/api/customers/appointments`)

- [x] `GET /api/customers/appointments`: Danh sách lịch hẹn đặt khách hàng theo trạng thái & khung giờ.
- [x] `POST /api/customers/booking`: Tạo đơn đặt lịch mới cho khách hàng.
- [x] `GET /api/customers/booking-slots`: Lấy danh sách khung giờ còn trống tại chi nhánh.
- [x] `DELETE /api/customers/booking/:orderId`: Hủy đơn đặt lịch hẹn.

---

## 🧪 Kịch Bản Kiểm Thử Xác Minh (Verification)

1. Build thành công backend `@mos-lab/api` với **0 error**.
2. Kiểm tra Swagger UI tại `http://localhost:4001/documentation` dưới Tag `Customers`.
