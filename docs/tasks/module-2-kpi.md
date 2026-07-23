# Task Checklist - Module 2: KPI & Gamification API (`apps/api`)

Mục tiêu: Chuyển đổi và tập trung 100% Business Logic tính toán KPI, Gamification, Thưởng Level CC, Booker Productivity, KTV FAL Rules và Paystub về Fastify Backend.

---

## 📋 List API Endpoints Cần Thực Thi & Kiểm Thử

### 1. Booker KPI API (`/api/kpi/bk`)

- [x] `GET /api/kpi/bk/leaderboard/booking`: Bảng xếp hạng Booker Đặt Lịch (đếm theo `date_created` trong khoảng lọc).
- [x] `GET /api/kpi/bk/leaderboard/done`: Bảng xếp hạng Booker Hoàn Thành.
- [x] `GET /api/kpi/bk/leaderboard/tip`: Bảng xếp hạng Booker Tip Share.
- [x] `GET /api/kpi/bk/leaderboard/revenue`: Bảng xếp hạng Doanh thu Booker.
- [x] `GET /api/kpi/bk/paystub`: Bảng kê lương Live Paystub Booker.

### 2. CC KPI & Gamification API (`/api/kpi/cc`)

- [x] `GET /api/kpi/cc/leaderboard`: Bảng xếp hạng CC (Level CC, CC Bonus chia 50/50, Points Accu lũy kế trong tháng).
- [x] `GET /api/kpi/cc/xoay`: Báo cáo ca làm CC Xoay chi tiết từng ca.
- [x] `GET /api/kpi/cc/tip`: Báo cáo Thưởng CC Tip 20% (chia 50/50 khi CC In != CC Out, chỉ đơn Completed).
- [x] `GET /api/kpi/cc/diamond`: Báo cáo chỉ số Diamond CC.
- [x] `GET /api/kpi/cc/paystub`: Live Paystub CC.

### 3. KTV / CV KPI API (`/api/kpi/cv`)

- [x] `GET /api/kpi/cv/xoay`: Báo cáo ca làm KTV Xoay & bóc tách FAL Rules (`Fix`, `Adjust`, `Log`).
- [x] `GET /api/kpi/cv/tip`: Báo cáo KTV Tip share.
- [x] `GET /api/kpi/cv/paystub`: Live Paystub KTV.

### 4. Booker Salary Export API (`/api/kpi/export-booker-salary`)

- [x] `GET /api/kpi/export-booker-salary?key=FDC0D0A177694777A`: API nội bộ xuất dữ liệu tính lương Booker cho Google Sheets / App Script.

---

## 🧪 Kịch Bản Kiểm Thử Xác Minh (Verification)

1. Kiểm tra tính đồng bộ từng đồng giữa số liệu `staff_bonus` trong DB legacy với API CC Leaderboard (**Xác minh thành công**).
2. Build toàn bộ backend `@mos-lab/api` thành công với TypeScript **0 error**.
