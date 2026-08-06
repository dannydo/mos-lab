# 🎧 QUY TRÌNH CHĂM SÓC KHÁCH HÀNG & BẢO HÀNH 3 NGÀY (MOS-LAB CRM)

Tài liệu Hướng dẫn Quy trình Đào tạo Tập trung dành cho toàn bộ nhân sự: **CSKH / Telesales**, **Trưởng CV Store**, **CC (Check-in/Out)**, **Booker** và **Quản Lý (Management)**.

---

## 📊 1. SƠ ĐỒ LUỒNG CÔNG VIỆC TỔNG QUAN (MASTER FLOWCHART)

```mermaid
flowchart TD
    %% Node Definitions
    Start([1. Khách Hàng Checkout Hoàn Thành Service]) --> TaskGen[2. Hệ Thống Tự Tạo Happy Call Task\nPhân Phân Bổ CSKH Round-Robin]

    TaskGen --> CallQueue[3. CSKH Tiến Hành Gọi Điện Happy Call\nTrạng thái: PENDING -> CALLING]

    CallQueue --> CallResult{Kết Quả\nCuộc Gọi?}

    CallResult -->|Max 3 lần không nghe| MsgFallback[Chuyển Sang MESSAGED / Nhắn Zalo/SMS]
    CallResult -->|Sai số| Unreachable[Đánh dấu UNREACHABLE]
    CallResult -->|Đã liên lạc được| Survey[4. CSKH Thực Hiện Khảo Sát 8 Hạng Mục]

    Survey --> RatingCheck{Đánh Giá\nSao?}

    RatingCheck -->|Hài lòng 4 - 5 sao| TaskComplete[Hoàn Tất Happy Call Task]

    RatingCheck -->|Không hài lòng <= 3 sao| IssueCheck[5. Bóc Tách Vấn Đề Lỗi]

    IssueCheck --> SubtaskGen[6. Tự Động Tạo Master Ticket & Các Sub-task]

    SubtaskGen --> DeptCheck{Phân Loại\nBộ Phận?}

    %% Path for non-CV departments (CC, BK, Facility, Management)
    DeptCheck -->|CC / BK / CSKH / Quản Lý| NonCVFlow[Trưởng Bộ Phận Nộp Hành Động Cải Thiện]
    NonCVFlow --> SubtaskDone1[Sub-task RESOLVED]

    %% Path for CV (Technical) department (2-Stage Australian Warranty Workflow)
    DeptCheck -->|Bộ phận CV Kỹ thuật Mi| CheckWarranty{Kiểm Tra Hạn\nBảo Hành 3 Ngày\n(<= 72h Checkout)?}

    CheckWarranty -->|Có <= 72h| TagWarranty[Đánh dấu 🛡️ Bảo Hành 3 Ngày Kiểu Úc 0đ]
    CheckWarranty -->|Không > 72h| TagNoWarranty[Đánh dấu ⚠️ Quá Hạn Bảo Hành 3 Ngày]

    TagWarranty --> Stage1[GIAI ĐOẠN 1: CSKH Đặt Lịch Hẹn Đón Khách Đến Shop\nStatus: APPOINTMENT_SCHEDULED]
    TagNoWarranty --> Stage1

    Stage1 --> CustomerArrives[Khách Hàng Đến Tiệm Theo Lịch Hẹn]

    CustomerArrives --> Stage2[GIAI ĐOẠN 2: Trưởng CV Soi Mi Tại Shop\n- Nhập Kết Quả Soi Mi Trực Tiếp\n- Phân Công CV Tay Nghề Cao Làm Lại]

    POSService --> SubtaskDone2[Sub-task CV RESOLVED]

    SubtaskDone1 --> CheckAllSubtasks{Tất Cả Sub-tasks\nĐã RESOLVED?}
    SubtaskDone2 --> CheckAllSubtasks

    CheckAllSubtasks -->|Chưa| WaitSubtasks[Chờ Bộ Phận Khác]
    CheckAllSubtasks -->|Đã hoàn tất| MasterResolve[7. CSKH Gọi Lại Chốt Với Khách\nĐóng Master Ticket]

    MasterResolve --> MidnightCron[8. CRONJOB NỬA ĐÊM (02:00 AM ICT)\nOrderRegenerationService.php Quét Đơn POS]

    MidnightCron --> FALCalc{Tự Động Tính\nFAL Rules?}

    FALCalc -->|Dịch vụ FIX <=25p| PunishCV[Trừ Thưởng CV Cũ + Cộng Banana CV Mới]
    FALCalc -->|Dịch vụ ADJUST| PunishCC[Trừ Thưởng CC Cũ + Không Trừ CV]
    FALCalc -->|Dịch vụ LOG| AwardLog[Cộng Banana CV Tháo Mi + Không Trừ Cũ]
    FALCalc -->|Dịch vụ REPLACE| PunishCVReplace[Trừ Thưởng CV Cũ]

    PunishCV --> AuditDone[Lưu Sổ Sách Kế Toán & Leaderboard Thưởng]
    PunishCC --> AuditDone
    AwardLog --> AuditDone
    PunishCVReplace --> AuditDone
```

---

## 📋 2. CHI TIẾT 8 BƯỚC VẬN HÀNH CHUẨN

### **Bước 1: Khách Hàng Checkout Hoàn Thành Dịch Vụ**

- Khách hàng thực hiện xong dịch vụ tại tiệm và thanh toán hoàn tất (`order_state = 'Completed'`).

### **Bước 2: Tự Động Tạo Nhiệm Vụ Happy Call**

- Mỗi sáng lúc **08:30 AM**, hệ thống tự động quét các đơn hoàn thành ngày hôm trước.
- Phân bổ nhiệm vụ gọi điện (Happy Call Task) xoay vòng (Round-Robin) cho các nhân viên CSKH đang hoạt động trong `ACTIVE_CS_STAFF_CONFIG`.

### **Bước 3: Thực Hiện Cuộc Gọi CSKH**

- CSKH gọi điện theo danh sách công việc (`/dashboard/cs` $\rightarrow$ Tab **Happy Call**).
- Đánh dấu trạng thái:
  - `COMPLETED`: Đã gặp khách & hoàn tất khảo sát.
  - `NO_ANSWER`: Khách không nghe máy (Gọi tối đa 3 lần, tự động chuyển `MESSAGED` gửi tin Zalo/SMS).
  - `UNREACHABLE`: Sai số / Không liên lạc được.

### **Bước 4: Nhập Khảo Sát 8 Hạng Mục & Checklist Lỗi Kỹ Thuật**

- Khảo sát các tiêu chí từ 1 đến 5 sao:
  1. Tổng thể dịch vụ
  2. Kỹ thuật Chuyên Viên (Bộ phận `CV`)
  3. Thái độ phục vụ (Bộ phận `CC`)
  4. Cơ sở vật chất (Bộ phận `FACILITY`)
  5. Giá cả & Ưu đãi (`MANAGEMENT`)
  6. Trải nghiệm Check-in (`CC`)
  7. Trải nghiệm Check-out (`CC`)
  8. Trải nghiệm Đặt lịch (`BK`)
- **Đặc biệt với Kỹ Thuật (`CV`) $\le 3$ sao**: CSKH tích chọn 1 hoặc nhiều lỗi kỹ thuật cụ thể:
  - 👁️ `EYE_STINGING`: Cay mắt / Đỏ mắt
  - ⚡ `FAST_SHEDDING`: Rụng mi nhanh (sau 1-2 ngày)
  - 📌 `EYELID_POKING`: Cộm mí / Đâm mắt
  - 💧 `GLUE_CLUMPING`: Bết keo / Vón cục
  - 📐 `WRONG_STYLE`: Sai dáng mi / Khác hình mẫu
  - ⌛ `SERVICE_PAINFUL_TOO_LONG`: Thô bạo / Làm quá lâu

### **Bước 5 & 6: Tự Động Leo Thang Master Ticket & Tạo Sub-tasks**

- Nếu có bất kỳ tiêu chí nào $\le 3$ sao, hệ thống **tự động khởi tạo Master Ticket** (Mã `TK-YYYYMMDD-XXX`):
  - **URGENT (Khẩn cấp - SLA 4h)**: Khi điểm khảo sát $\le 2$ sao.
  - **HIGH (Cao - SLA 24h)**: Khi điểm khảo sát = 3 sao.
- Tự động tách thành các **Sub-task theo từng Bộ Phận** cần chịu trách nhiệm.

### **Bước 7: Quy Trình Xử Lý Sub-Task Theo Bộ Phận**

- **Đối với các Bộ phận `CC`, `BK`, `FACILITY`, `MANAGEMENT`**:
  - Trưởng bộ phận vào Sub-task nộp **Hành động cải thiện** & **Ghi chú giải trình** $\rightarrow$ Sub-task chuyển `RESOLVED`.
- **Đối với Bộ phận Kỹ Thuật Mi (`CV`) — QUY TRÌNH 2 GIAI ĐOẠN**:
  - **Giai đoạn 1 (CSKH Hẹn Shop)**: CSKH bấm nút `📅 GĐ1: Đặt Lịch Hẹn Đến Shop 0đ` (Chọn Store Đề Thám/PXL/Nguyễn Trãi/Thảo Điền & Ngày/Giờ hẹn đón khách) $\rightarrow$ Sub-task chuyển `APPOINTMENT_SCHEDULED`.
  - **Giai đoạn 2 (Trưởng CV Soi Mi Tại Shop)**: Khách đến tiệm, Trưởng CV bấm `🔍 GĐ2: Soi Mi Tại Shop & Chốt Bảo Hành` $\rightarrow$ Nhập Kết quả soi mi thực tế, gán CV tay nghề cao làm lại tại chỗ $\rightarrow$ Sub-task chuyển `RESOLVED`.

### **Bước 8: Tự Động Tính Thưởng/Phạt FAL Nửa Đêm (02:00 AM ICT)**

- Khi đơn hàng dịch vụ bảo hành được tạo trên ứng dụng POS tại Tiệm, Cronjob nửa đêm (`regenerate-order-batch.php`) quét đơn hàng và áp dụng tự động Quy tắc FAL:
  - 🛠️ **FIX (Sửa mi $\le 25$p 0đ)**: Trừ thưởng (`_punishBonus`) CV cũ. CV mới được cộng Banana nếu sửa $\le 25$ phút.
  - 📐 **ADJUST (Chỉnh dáng 0đ)**: Trừ thưởng (`_punishBonus`) CC tư vấn cũ. **KHÔNG phạt CV**.
  - 📋 **LOG (Tháo mi / Kiểm tra mi 0đ)**: Cộng Banana CV tháo mi. **Không phạt bất kỳ ai**.
  - 🔄 **REPLACE (Nối lại bộ mới 100% 0đ)**: Trừ thưởng (`_punishBonus`) CV cũ.

---

## ⏱️ 3. MA TRẬN SLA & TRẢM TRÁCH NHIỆM

| Mức Ưu Tiên                | SLA Xử Lý  | Thời Gian Phản Hồi Ban Đầu | Người Chịu Trách Nhiệm Phụ Trách    |
| :------------------------- | :--------- | :------------------------- | :---------------------------------- |
| 🔴 **URGENT (Khẩn cấp)**   | **4 Giờ**  | Trong vòng **30 phút**     | CS Lead / Quản Lý Trực Tiếp         |
| 🟠 **HIGH (Cao)**          | **24 Giờ** | Trong vòng **2 giờ**       | Trưởng Bộ Phận (`CV` / `CC` / `BK`) |
| 🔵 **MEDIUM (Trung bình)** | **48 Giờ** | Trong vòng **4 giờ**       | Nhân sự được gán phụ trách          |
| ⚪ **LOW (Thấp)**          | **72 Giờ** | Trong vòng **8 giờ**       | Nhân sự được gán phụ trách          |

---

## 🛡️ 4. CHÍNH SÁCH BẢO HÀNH 3 NGÀY KIỂU ÚC (WARRANTY POLICY)

> **MKT Slogan**: _"Bảo hành kiểu Úc, Thú cưng không ưng, Wings xin hoàn tiền / Chỉnh sửa hoặc Nối mới bộ khác 0đ!"_

1. **Điều kiện áp dụng 0đ**: Khách hàng phản hồi không hài lòng trong vòng **72 Giờ (3 Ngày)** tính từ lúc checkout.
2. **Quyền lợi khách hàng**:
   - Được chỉnh dáng mi, sửa mi, hoặc tháo nối bộ mi mới hoàn toàn **MIỄN PHÍ 100%**.
   - Được ưu tiên xếp lịch với CV Senior / Master tay nghề cao.
3. **Cơ chế ghi nhận**: Hệ thống CRM tự động tính toán mốc thời gian checkout và bật nhãn `🛡️ Bảo Hành 3 Ngày (Kiểu Úc 0đ)` trên thẻ xử lý của CV.
