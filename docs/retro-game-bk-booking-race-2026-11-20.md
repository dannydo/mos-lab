# Ghi nhận Lỗ hổng Mechanic & Post-Game Review — WINGS BOOKING RACE (Game #5)

- **Ngày ghi nhận:** 2026-11-20
- **Người chỉ đạo:** Danny Do
- **Người thiết kế mechanic:** Tâm Nguyễn
- **Game liên quan:** Game #5 — `WINGS BOOKING RACE` (Thưởng Done khách lẻ theo mốc Booking Team)

---

## 1. Lỗ hổng mechanic đã xảy ra ngoài thực tế

1. **Book hôm nay – Cancel ngày mai / Book trùng ảo trong cùng ngày:**
   - Do mechanic tính mốc **Booking Team** theo số lượng booking được tạo trong khung giờ `00:00 - 17:00`, nhân viên có thể tạo đơn đặt lịch trong ngày hôm nay (kể cả trùng khách hoặc chưa chắc chắn) để đẩy tổng team vượt mốc `30 / 40 / 50`, sau đó đến hôm sau mới chuyển sang `Cancelled`.
   - **Bằng chứng thực tế trong DB (`19/11` & `20/11`):**
     - **Ngày `19/11`:** Lúc `16:58:21` tổng team trong khung `00:00 - 17:00` vừa chạm đúng `30 Booking` (đạt mốc `30–39 · 5.000đ/Done`). Tuy nhiên đơn thứ 30 (`#339881` · `booking_uk3190p1sm` của Quốc Khánh tạo lúc `19/11 16:03:46`) bị chuyển `Cancelled` vào lúc `20/11 13:47:17`, làm lịch sử ngày `19/11` tụt từ `30` xuống `29`.
     - **Ngày `20/11`:** Ghi nhận các đơn tạo sát nhau rồi chuyển `Cancelled` ngay sau đó (ví dụ các đơn trùng lặp `#339936`, `#339937`, `#339939` tạo cách nhau vài giây), khiến số liệu thô (`37` đơn) cao hơn số đơn còn hiệu lực (`32` đơn) đến `5` đơn.

2. **Tác động vận hành:**
   - Khi hệ thống loại trừ `Cancelled`, điểm của ngày hôm qua có thể bị tụt lùi hồi tố vào ngày hôm sau nếu hôm sau đơn bị huỷ — gây tranh cãi số liệu trên UI so với ảnh chụp ngày hôm trước.
   - Ngược lại, khi không loại trừ `Cancelled` (chấp nhận book ảo cho game này), team có thể "bơm" booking ảo để đạt mốc thưởng Done lẻ mà không phản ánh đúng nhu cầu thật.

---

## 2. Quyết định xử lý cho Game hiện tại (`2026-11-20`)

- **Chấp nhận book ảo cho Game #5 hiện tại:** Cập nhật `BK-007 v1.1.0` tính `Booking Team` theo tổng đơn tạo ra trong khung giờ cấu hình (không loại trừ `Cancelled`, đồng bộ với `totalCreatedBookings` của Tab Booking).
- **Trách nhiệm thiết kế mechanic:** Thuộc về **Tâm Nguyễn** — cần buổi review trực tiếp sau game để rút kinh nghiệm cho các mùa/game tiếp theo.

---

## 3. Gợi ý cải tiến cho vòng Review với Tâm Nguyễn

- **Chốt thưởng theo khách thực sự giữ lịch / Check-in (không phải chỉ đếm `date_created` thô):** Hoặc tính _Net Bookings = Tổng Booking tạo mới − Tổng Booking huỷ trong kỳ_, hoặc áp điều kiện khấu trừ các đơn huỷ cùng số điện thoại / trùng lịch trong X phút.
- **Khoá snapshot theo ngày (Daily Freeze / Settlement Cut-off):** Nếu vẫn tính theo Booking tạo mới, cần định nghĩa rõ đơn huỷ ngày hôm sau có hồi tố hay không ngay từ lúc thiết kế luật game.
- **Giới hạn trùng khách hàng/SĐT trong ngày:** Chỉ tính tối đa `1` Booking/khách hàng/ngày vào mốc Team để triệt tiêu thao tác tạo trùng rồi cancel.
