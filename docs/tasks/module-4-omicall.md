# Task Checklist - Module 4: OmiCall & Call Logs API (`apps/api`)

Mục tiêu: Chuẩn hóa 100% các API tổng đài OmiCall WebRTC SIP, Phân tích âm thanh tiếng cười AI (AI Laugh Detection), Nhật ký cuộc gọi & Chế độ gọi mô phỏng (Simulation Fallback).

---

## 📋 List API Endpoints Cần Thực Thi & Kiểm Thử

### 1. OmiCall Extension & WebRTC Configuration API (`/api/omicall`)

- [x] `GET /api/omicall/extension-info`: Lấy thông tin hotline/máy lẻ Extension SIP WebRTC cho nhân viên.
- [x] `GET /api/omicall/sip-status`: Kiểm tra trạng thái kết nối SIP Gateway OmiCall (`wss://sig.omicrm.com`).
- [x] `POST /api/omicall/config`: Lưu/cập nhật cấu hình máy lẻ Extension cho staff (Admin only).

### 2. OmiCall Webhook & Call Analysis API (`/api/omicall`)

- [x] `POST /api/omicall/webhook`: Webhook nhận sự kiện kết thúc cuộc gọi (Hangup event) từ OmiCall Portal.
- [x] `GET /api/omicall/call-logs`: Truy vấn nhật ký cuộc gọi OmiCall & liên kết khách hàng.
- [x] `POST /api/omicall/analyze-recording`: Kích hoạt phân tích âm thanh tiếng cười AI (AI Laugh Detection).
- [x] `GET /api/omicall/call-analysis`: Lấy kết quả phân tích AI tiếng cười & sắc thái cuộc gọi.

### 3. Call Logs & Wrapup API (`/api/calls`)

- [x] `POST /api/calls`: Tạo log cuộc gọi thủ công / WebRTC, tự động tính `durationSec`, liên kết `planId` và cập nhật KPI.

---

## 🧪 Kịch Bản Kiểm Thử Xác Minh (Verification)

1. Build thành công backend `@mos-lab/api` với **0 error**.
2. Thử nghiệm Webhook và SIP test script.
3. Kiểm tra Swagger UI tại `http://localhost:4001/documentation` dưới Tag `Calls` và `OmiCall`.
