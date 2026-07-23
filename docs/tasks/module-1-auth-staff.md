# Task Checklist - Module 1: Auth, Staff & Roles API (`apps/api`)

Mục tiêu: Chuyển đổi và chuẩn hóa 100% các API liên quan đến Xác thực (Auth), Quản lý Nhân sự (Staff) và Phân quyền (Roles) sang Fastify 5 với Fastify Route Schema Validation, JWT Guards và TypeBox/Shared DTOs.

---

## 📋 List API Endpoints Cần Thực Thi & Kiểm Thử

### 1. Auth Module (`/api/auth`)

- [x] `POST /api/auth/login`: Đăng nhập username/password, trả về JWT Token và thông tin User (Đã thêm Fastify JSON Schema & Swagger tag).
- [x] `POST /api/auth/google`: Đăng nhập qua Google Credential / Dev Mode (Đã thêm Fastify JSON Schema & Swagger tag).
- [x] `GET /api/auth/me`: Lấy thông tin tài khoản hiện tại từ JWT bearer header (Đã thêm Fastify JSON Schema & Bearer Security).
- [x] `POST /api/auth/impersonate`: Admin chuyển quyền impersonate tài khoản nhân viên khác (Đã thêm Fastify JSON Schema).

### 2. Staff Module (`/api/staff`)

- [x] `GET /api/staff`: Lấy danh sách toàn bộ nhân viên có phân trang & filter theo role/active status (Đã kiểm tra RBAC & DTO).
- [x] `POST /api/staff`: Tạo tài khoản nhân viên mới (Phân quyền Admin only).
- [x] `PUT /api/staff/:id`: Cập nhật thông tin cá nhân, vai trò, hotline extension của nhân viên.
- [x] `PATCH /api/staff/:id/status`: Đổi trạng thái `isActive` (Hoạt động / Ngừng hoạt động).

### 3. Roles Module (`/api/roles`)

- [x] `GET /api/roles`: Lấy danh sách các vai trò hệ thống (`admin`, `manager`, `oc`, `cc`, `ls`, `telesales`, `technician`) (Đã thêm JSON Schema).
- [x] `POST /api/roles`: Tạo vai trò mới (Admin only & Slug pattern validation).
- [x] `PUT /api/roles/:key`: Cập nhật quyền hạn vai trò (`viewKPI`, `viewTeamKPI`, `manageStaff`).
- [x] `DELETE /api/roles/:key`: Xóa vai trò tùy chỉnh (Bảo vệ vai trò hệ thống và nhân viên đang gán).

---

## 🧪 Kịch Bản Kiểm Thử Xác Minh (Verification)

1. Build thành công `@mos-lab/api` & toàn bộ monorepo (`pnpm build`).
2. Swagger UI hoạt động tại `http://localhost:4001/documentation`.
