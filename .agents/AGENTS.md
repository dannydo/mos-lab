# Frontend Theme Customization Rules

Để đảm bảo hệ thống hỗ trợ cả giao diện sáng (Light Theme) và tối (Dark Theme) chính xác, tất cả các tác vụ cập nhật giao diện trong tương lai cần tuân thủ nghiêm ngặt các quy tắc sau:

## 1. Cơ chế hoạt động của Theme
* Hệ thống sử dụng một biến trạng thái toàn cục `themeMode` ('light' | 'dark') được cấp phát qua `useTheme()` trong `ThemeContext.tsx`.
* Khi `themeMode` thay đổi, class `.light-theme` hoặc `.dark-theme` tương ứng sẽ được áp dụng trực tiếp lên thẻ `<html>` gốc (`document.documentElement`).

## 2. Quy tắc ghi đè CSS (CSS Overrides Rules)
* **Tuyệt đối KHÔNG** hardcode trực tiếp các thuộc tính màu nền tối (như `background: #141414 !important` hoặc `color: #fff`) trong các selector CSS toàn cục.
* Toàn bộ các quy tắc ghi đè màu sắc của thư viện (như `ant-table`, `ant-drawer`, `ant-tabs`) phải được phân vùng rõ ràng theo cấu trúc phân cấp dưới class theme của thẻ gốc:
  
  ```css
  /* Ghi đè màu sắc chỉ áp dụng cho Dark Theme */
  .dark-theme .antd-custom-table .ant-table {
    background: #141414 !important;
    color: #ccc !important;
  }
  
  /* Ghi đè màu sắc chỉ áp dụng cho Light Theme */
  .light-theme .antd-custom-table .ant-table {
    background: #ffffff !important;
    color: #333333 !important;
  }
  ```

## 3. Sử dụng inline style trong React
* Đối với các thuộc tính màu sắc viết trực tiếp bằng React `style={{ ... }}`, **luôn luôn** sử dụng toán tử điều kiện dựa trên trạng thái `themeMode` thay vì hardcode một giá trị màu cố định:
  
  * **Sai:** `style={{ background: '#141414', border: '1px solid #2a2a2a' }}`
  * **Đúng:** `style={{ background: themeMode === 'dark' ? '#141414' : '#ffffff', border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#e8e8e8'}` }}`

* Hoặc tối ưu hơn, hãy sử dụng các Design Token chính thức của Ant Design bằng hook `theme.useToken()`:
  ```typescript
  const { token } = theme.useToken();
  // Sử dụng token.colorBgContainer, token.colorBorderSecondary, v.v.
  ```

## 4. Kiểm thử trước khi đẩy code
* Trước khi hoàn thành chỉnh sửa UI, lập trình viên/Agent phải thực hiện kiểm thử giao diện bằng cách nhấp vào biểu tượng theme (mặt trời/mặt trăng) trên header để verify các bảng biểu, modal, drawer và văn bản hiển thị rõ ràng trên cả hai nền sáng và tối.

## 5. Quy tắc định dạng số & Ngăn chặn giật giao diện (Number Jitter Prevention Rules)
* Đối với tất cả các thành phần hiển thị thời gian chạy, thời gian thực tế, thời lượng cuộc gọi, số đếm ngược, hoặc bất kỳ chỉ số dạng số nào thay đổi liên tục:
  * **Luôn sử dụng** định dạng hiển thị **Tabular Numbers** (các chữ số có chiều rộng bằng nhau) để ngăn chặn hiện tượng số thay đổi làm xê dịch chiều ngang của dòng chữ ("giật giật").
  * **Cách thực hiện trong CSS/Tailwind:** Sử dụng class Tailwind `tabular-nums` hoặc style `font-variant-numeric: tabular-nums` (kèm theo `font-feature-settings: "tnum"` để tối ưu hiển thị trên các trình duyệt cũ/hệ điều hành cũ).
  * **Ví dụ trong React inline style:**
    ```typescript
    style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }}
    ```
  * **Ví dụ trong Tailwind class:**
    ```html
    <span className="tabular-nums">...</span>
    ```

---

# Booker Salary API Configuration & Usage Rules

Để đảm bảo an toàn thông tin và tính riêng tư của dữ liệu doanh nghiệp mos-lab, các tác vụ liên quan đến API xuất dữ liệu tính lương Booker phải tuân thủ nghiêm ngặt quy tắc sau:

## 1. Tính độc lập của API (No Shared API)
* **Tuyệt đối KHÔNG** sử dụng chung hoặc gọi trực tiếp đến API ngoài của Wingslashes (`api.wingslashes.com`).
* Toàn bộ việc xuất dữ liệu và tính lương cho Booker phải được xử lý độc lập và khép kín qua endpoint nội bộ của Fastify tại:
  `GET /api/kpi/export-booker-salary`
* Mọi ứng dụng liên kết (như Google Sheets, App Scripts) hoặc các Module tính toán Leaderboard bắt buộc phải chuyển hướng cấu hình gọi qua domain nội bộ của hệ thống mos-lab với API key đi kèm:
  `?key=FDC0D0A177694777A&booker=...&date_from=...&date_to=...`

---

# Workspace Isolation and External Code Modification Rules

Để tránh việc Agent vô tình chỉnh sửa mã nguồn của các dự án/workspace khác khi đang làm việc trong workspace này:

## 1. Hạn chế phạm vi hoạt động (Workspace Isolation)
* Agent **được phép ĐỌC** thông tin từ các tệp tin nằm ngoài thư mục workspace hiện tại (`/Users/dannydo/projects/mos-lab`) để tham khảo, đối chiếu hoặc tìm hiểu ngữ cảnh phục vụ công việc.
* Tuy nhiên, **tuyệt đối KHÔNG tự ý chỉnh sửa (ghi, tạo mới hoặc thay đổi)** bất kỳ tệp tin nào nằm ngoài thư mục workspace hiện tại.
* Nếu người dùng yêu cầu chỉnh sửa hoặc ghi tệp tin nằm ngoài workspace hiện tại, Agent **bắt buộc phải cảnh báo người dùng** trước khi thực hiện:
  * Nêu rõ đường dẫn tuyệt đối của tệp tin/dự án ngoài workspace sẽ bị tác động.
  * Yêu cầu xác nhận rõ ràng từ người dùng (ví dụ: "Bạn có chắc chắn muốn chỉnh sửa tệp tin ngoài workspace này không?") trước khi gọi bất kỳ công cụ ghi/sửa tệp tin nào (`write_to_file`, `replace_file_content`, v.v.).

## 2. Xác thực trước khi sửa đổi
* Chỉ tiến hành thay đổi mã nguồn ở workspace khác khi và chỉ khi nhận được sự đồng ý bằng văn bản rõ ràng từ người dùng trong phiên chat hiện tại.

---

# Hybrid Styling Workflow: Ant Design 5 & Tailwind CSS v4

Để xây dựng giao diện ứng dụng quản lý `mos-lab` vừa vững chắc về tính năng, vừa có tính thẩm mỹ cao (Premium UI) và đồng bộ, Agent cần tuân thủ workflow phối hợp sau:

## 1. Phân chia vai trò công nghệ
* **Ant Design 5 (Trụ cột chức năng):** Sử dụng các component sẵn có của Antd cho các thành phần có trạng thái (state) phức tạp, tương tác dữ liệu cao hoặc cần tuân thủ form/bảng biểu:
  * `<Table>`, `<Form>`, `<Form.Item>`, `<Select>`, `<DatePicker>`, `<Modal>`, `<Drawer>`, `<Tabs>`, `<Steps>`, `<Upload>`.
* **Tailwind CSS v4 (Thẩm mỹ & Bố cục):** Sử dụng các utility classes của Tailwind để dựng bố cục, căn lề, khoảng cách, và trang trí nâng cao:
  * Layout: `grid`, `flex`, `gap-*`, `w-*`, `h-*`.
  * Visual: Gradient nền (`bg-gradient-to-r`), hiệu ứng bóng mờ (`shadow-*`), bo góc (`rounded-*`), và backdrop-filter (glassmorphism).
  * Animations: Hiệu ứng hover, chuyển cảnh mượt mà (`transition-all duration-300 ease-in-out hover:scale-[1.02]`).

## 2. Quy tắc tích hợp & Tránh xung đột
* **Không lạm dụng custom CSS:** Ưu tiên dùng Tailwind class trực tiếp trên thẻ hoặc cấu hình `className` của Antd. Hạn chế tối đa việc viết thêm file `.css` mới trừ khi ghi đè (override) component của Antd.
* **Ghi đè phong cách Antd (Antd Customization):**
  * Sử dụng thuộc tính `className` kết hợp với Tailwind (ví dụ: `<Card className="shadow-lg border border-slate-100 dark:border-slate-800">`).
  * Khi cần ghi đè CSS sâu của Antd (ví dụ `.ant-table`), hãy đặt trong các block CSS phân vùng rõ ràng theo theme `.dark-theme` / `.light-theme` trong file CSS toàn cục như quy định ở phần "Frontend Theme Customization Rules".
* **Đồng bộ màu sắc với Design Tokens:**
  * Khi dùng Tailwind class hoặc inline style liên quan đến màu sắc, hãy đảm bảo chúng khớp với trạng thái `themeMode` hiện tại.
  * Ưu tiên dùng CSS Variables hoặc Antd Design Tokens (`theme.useToken()`) để các màu sắc (background, border, text) tự động thay đổi khi chuyển đổi qua lại giữa Light/Dark theme.

## 3. Tiêu chuẩn giao diện cao cấp (Premium UI)
* **Tránh giao diện mặc định đơn điệu:** Tuyệt đối không để nguyên giao diện mặc định thô cứng của Antd. Hãy bo tròn các góc mềm mại hơn, thêm shadow nhẹ, và dùng màu nền tinh tế (thay vì màu xám/trắng mặc định).
* **Micro-animations:** Thêm hiệu ứng transition nhẹ nhàng khi hover vào các thẻ card, nút bấm hoặc dòng trong bảng để giao diện có cảm giác "sống động" và phản hồi tốt.
* **Không dùng hình ảnh giữ chỗ (placeholders):** Sử dụng biểu tượng SVG chất lượng cao hoặc sinh ảnh thực tế bằng công cụ AI nếu cần minh họa.

---

# External Server Details (Image Storage Server)
*Đây là thông tin cấu hình máy chủ dùng để lưu trữ ảnh cho dự án Wings Lashes (tác vụ phân tích tiếng cười đã chuyển qua sử dụng trực tiếp Gemini API).*

*   **IP:** `75.119.148.205`
*   **Port:** `22`
*   **User:** `root`
*   **Password:** `qyRUPgRjsV26FYD6qcUe`
*   **Ghi chú:** Máy chủ chạy Ubuntu 20.04 LTS, có 31GB RAM trống và 8 vCPUs (AMD EPYC). Không được hỏi lại người dùng thông tin này.

---

# 🏆 Client Consultant (CC) Gamification & Bonus Calculation Rules

Tất cả các tác vụ tính toán thưởng, báo cáo và Leaderboard cho Client Consultant (CC) bắt buộc phải tuân thủ nghiêm ngặt các quy tắc công thức sau:

## 1. Công thức Level CC
- **Quy tắc Level**: $100\text{ pts} = 1\text{ Level}$.
  - $0 \text{ đến } 99\text{ pts} = \text{Level 1}$
  - $100 \text{ đến } 199\text{ pts} = \text{Level 2}$
  - $9.900 \text{ đến } 9.999\text{ pts} = \text{Level 100}$
- **Công thức lập trình**:
  $$\text{consultantLevel} = \lfloor \text{prevPoints} / 100 \rfloor + 1$$
- **Reset**: Mỗi đầu tháng, Level reset về `1` và Điểm Tích Luỹ reset về `0`.

## 2. Công thức Tiền Thưởng CC Bonus (đ)
- **Công thức ca làm chuẩn**:
  $$\text{CC Bonus (đ)} = \text{Level CC} \times 65\text{đ}$$
- **Quy tắc phân chia CC In != CC Out**:
  - Khi nhân viên CC In khác CC Out, cả **Điểm CC (+pts)** và **Tiền thưởng CC Bonus (đ)** đều được **chia 50/50** cho mỗi CC:
  $$\text{CC Bonus (đ)} = \frac{\text{Level CC} \times 65\text{đ}}{2}$$
  $$\text{Điểm CC (+pts)} = \frac{\text{Tổng điểm ca}}{2}$$

## 3. Thứ tự sắp xếp & Tích luỹ (Ordering & Accumulation)
- Kết quả báo cáo xếp theo thứ tự check-in mới nhất nằm trên (`ORDER BY ro.actual_booking_date_start DESC, os.id DESC`).
- Điểm tích luỹ `Points Accu` được tính dồn ngược từ ca cũ nhất (dưới cùng) lên ca mới nhất (trên cùng) theo từng nhân viên CC.
- **Leaderboard Sum**: Tiền thưởng `Thưởng CC Bonus` trên Bảng Xếp Hạng phải là tổng tiền thưởng thực tế của từng ca làm dịch vụ trong tháng của CC đó, đảm bảo khớp 100% từng đồng khi lọc chi tiết.

## 4. Công thức CC Tip Bonus & Quy tắc chia 50/50
- **Tỷ lệ Thưởng CC Tip**: CC nhận 20% trên tổng số tiền tip mà khách hàng cho (`staff_tip` lưu `tip_percentage = 20`).
- **Quy tắc CC In != CC Out**: Khi nhân viên CC In khác CC Out, cả hai CC đều được **chia 50/50** khoản Thưởng CC Tip (20%) (mỗi CC nhận 10% tip share, tức `tip_percentage = 10` trong cơ sở dữ liệu `staff_tip`).
- **Lọc theo đơn Completed**: Chỉ tính tiền tip từ các đơn hàng có trạng thái `order.order_state = 'Completed'` trong khoảng thời gian được lọc.
- **Tránh SQL Duplication**: Tuyệt đối không `JOIN order_service` hoặc `JOIN staff_bonus` trực tiếp khi tính `SUM(st.tip_amount)`, tránh hiện tượng đơn hàng có nhiều dịch vụ làm nhân bản tổng tiền tip. Hãy query trực tiếp từ `staff_tip` JOIN `order` theo `st.user_id` hoặc `st.id`.

## 5. Cấu hình danh sách CC (`ACTIVE_CC_STAFF_CONFIG`) & Paystub Live
- **Lọc theo Active CC Config**: Tất cả các tab báo cáo CC (Leaderboard, CC Xoay, CC Thưởng, CC Tip, CC Live Paystub) bắt buộc phải lọc theo danh sách ID tư vấn viên đang hoạt động trong `crmConfig` với key `ACTIVE_CC_STAFF_CONFIG`.
- **Công thức Paystub Live**: `Tổng Thu Nhập Tạm Tính` = `Lương Giờ` + `Thưởng CC Xoay` + `Thưởng Combo & SP` + `Thưởng Minigame` + `Thưởng CC Tip (20%)`.

## 6. External API References & `wingslashes` Source Code Inspection
- Mỗi khi người dùng cung cấp đường dẫn API (ví dụ: `https://api.wingslashes.com/...` hoặc `https://api.orb/...`), **không gọi trực tiếp endpoint ngoài**.
- **Chủ động tra cứu source code `wingslashes` nội bộ**: Truy cập và kiểm tra mã nguồn/repository `wingslashes` trên hệ thống local để đối chiếu câu lệnh SQL, công thức tính toán và logic dữ liệu chính xác của API đó.

## 7. Booker "Booked / Tạo Lịch" Metric & Productivity Definition Rule
- **Định nghĩa Booked/Tạo lịch**: Tất cả các báo cáo, widget, modal KPI và Leaderboard của Booker/Telesales khi đếm số lượng **"Booked / Đặt lịch / Tạo lịch"** bắt buộc phải tính theo **ngày tạo đơn thực tế trong kỳ (`date_created` trong khoảng thời gian được lọc)**.
- **Mục đích đo lường**: Đơn đếm `Booked` đại diện cho **hiệu suất lao động (năng suất công việc)** của Booker tạo ra trong ca/ngày/tuần/tháng đó.
- **Không dùng OR với booking_date_start**: Tuyệt đối không dùng câu lệnh `OR` hợp nhất với `booking_date_start` (ngày khách hẹn đến) khi đếm số lượng đặt lịch của Booker.

## 8. Unified Business Logic & Fastify Backend Model Rule (Single Source of Truth)
- **Khi có từ 2 vị trí trở lên cần xử lý/tính toán cùng một loại thông tin/chỉ số (Business Logic)**:
  - **Không duplicate logic**: Tuyệt đối không tính toán hay tự `reduce` rải rác ở Frontend hay viết nhiều câu SQL inline lệch nhau.
  - **Tập trung tại Fastify Backend Model / Service**: Bắt buộc xây dựng Model/Service tập trung tại Fastify Backend (`apps/api`), định nghĩa kiểu dữ liệu chuẩn tại `@mos-lab/shared`.
  - **Mục đích**: Đảm bảo tất cả các trang, tab báo cáo, Leaderboard và API xuất file nhận kết quả tính toán đồng bộ 100% từng đồng từ một Nguồn dữ liệu chuẩn duy nhất (Single Source of Truth).

## 9. CC Bonus DB Synchronization & Order Regeneration Rules
1. **Nguồn Dữ liệu Thưởng CC Chuẩn**:
   - Khi hiển thị thưởng CC Bonus trên tất cả các tab báo cáo (CC Leaderboard, CC Xoay, CC Thu nhập), query trực tiếp từ `staff_bonus` với `bonus_type = 'Cash'` và `staff_bonus_rule_id = 248`.
   - Dữ liệu này phản ánh chính xác số tiền kế toán đã chi trả, giữ nguyên mức Level chốt tại thời điểm hoàn thành ca (Post-shift Level) và các khoản thưởng lẻ $0,5\text{đ}$ từ các ca chia 50/50 sau khi chạy script `regenerate order batch` (`OrderRegenerationService.php`).

2. **Quy tắc Reset Điểm Đầu Tháng**:
   - Điểm lũy kế tính Level CC được tính dồn theo tháng bắt đầu từ `YYYY-MM-01 00:00:00`.
   - Level CC = $\lfloor \text{monthly\_pts} / 100 \rfloor + 1$.

3. **Cơ chế Dự phòng Khi DB Thiếu Dữ liệu**:
   - Trường hợp DB legacy chưa kịp chạy regenerate hoặc bị thiếu log `Cash`, `CcKpiService` tự động dùng công thức $\text{Level} \times 65\text{đ}$ (chia 50/50 nếu CC In != CC Out) để dự phòng.

## 10. FAL (Fix, Adjust, Log) & Midnight Regeneration Rules
1. **Quy tắc Nghiệp vụ FAL (Fix, Adjust, Log)**:
   - **Fix**: Sửa mi hỏng $\le 25$ phút $\rightarrow$ KTV sửa mi được điểm Banana, CC được thưởng thêm; KTV cũ làm hỏng mi bị trừ thưởng (`_punishBonus`).
   - **Adjust**: Chỉnh dáng mi $\rightarrow$ KTV cũ bị trừ điểm/thưởng đền bù.
   - **Log**: Ghi nhận log mi $\rightarrow$ Luôn được cộng điểm Banana.
   - **Bóc tách SQL**: Truy vấn SQL của KTV Xoay & CC Xoay bắt buộc bóc tách cột `falRule` từ `next_fix_order_service_id`, `next_adjust_order_service_id`, `s.service_type IN ('Fix', 'Adjust', 'Log')` và `tracking_key`.

2. **Quy tắc Cronjob Regenerate Nửa Đêm (02:00 AM ICT)**:
   - Cronjob batch regenerate trên Prod đặt vào **02:00 AM, 02:10 AM, 02:20 AM giờ Việt Nam (`Asia/Ho_Chi_Minh`)** quét 3 ngày lùi (`1 day ago`, `2 days ago`, `3 days ago`) để làm sạch 100% rủi ro race condition cuối ngày.




---

# 📞 OmiCall Switchboard Diagnostic & Testing Rules

Mọi tác vụ kiểm thử và khắc phục sự cố tổng đài OmiCall WebRTC phải tuân thủ:

1. **Chẩn đoán Trực tiếp Gateway (Direct Gateway Inspection)**:
   - Trước khi giả định lỗi ở phía Frontend, luôn thực hiện test kết nối SIP WebSocket đến `wss://sig.omicrm.com`.
   - Kiểm tra mã phản hồi SIP: `200 OK` (Thành công), `401/407` (Yêu cầu Digest Auth), `480 Temporarily Unavailable / Cause 16` (Hết tiền cước thoại OmiCall Portal / Khóa Trunk Viettel).

2. **Cung cấp Chế độ Gọi Mô phỏng (Simulation Mode)**:
   - Tất cả các widget cuộc gọi OmiCall trên CRM phải cung cấp tùy chọn chuyển đổi linh hoạt giữa `SIP Thực tế` và `Mô phỏng (Test)`.
   - Khi SIP thực tế bị ngắt do lỗi cước OmiCall, tự động chuyển sang Chế độ Mô phỏng để bảo đảm trải nghiệm test mượt mà cho Booker và Khách hàng.

---

# 📈 End-of-Month (EOM) Run-rate Forecast & Shift Tracking Rules

1. **Khung giờ hoạt động (09:00 - 21:00 + 2h Buffer)**:
   - Ca phục vụ đón khách thực tế từ **09:00 AM – 21:00 PM** (12 tiếng).
   - Do khách checkout/thanh toán trễ khoảng **2 tiếng**, khung giờ tính toán tiến độ dòng tiền thực tế được delay thành **11:00 AM – 23:00 PM**.

2. **Công thức Tiến độ Ngày (Real-time Fraction Today)**:
   $$\text{fractionToday} = \begin{cases} 
   0 & \text{khi giờ } < 11 \\ 
   1 & \text{khi giờ } > 22 \\ 
   \frac{\text{HOUR(NOW())} - 11 + 1}{12} & \text{khi } 11 \le \text{giờ } \le 22 
   \end{cases}$$

3. **Công thức Tỷ lệ Trôi qua Tháng (Elapsed Ratio)**:
   $$E = \min\left(1.0, \max\left(0.001, \frac{\text{Số ngày đã qua trước hôm nay} + \text{fractionToday}}{\text{Tổng số ngày trong kỳ}}\right)\right)$$

4. **Công thức Số liệu Dự báo Cuối tháng (Projected EOM Metric)**:
   $$\text{Projected Metric} = \frac{\text{Actual Metric}}{E}$$

5. **Quy tắc Hiển thị Giao diện (Active Month vs. Past Month)**:
   - **Tháng hiện tại đang chạy ($E < 1.0$)**:
     - Nhãn: `Dự kiến cuối tháng:`
     - Màu sắc: Xanh lá nổi bật (`text-emerald-400`), số tiền tiền tố `~` (ví dụ `~581.117.263 đ`).
     - Tooltip: `Đã trôi qua X% thời gian tháng (Ca 09:00 - 21:00 + 2h buffer checkout)`
   - **Tháng quá khứ đã chốt ($E \ge 1.0$)**:
     - Nhãn: `Thực tế chốt tháng:`
     - Màu sắc: Xám mờ (`text-slate-400`, `opacity-70`), không có dấu `~`.
     - Tooltip: `Dữ liệu tháng đã chốt (100% thời gian)`

6. **Quy tắc Ghi nhận Doanh thu & Combo (`actual_booking_date_start` + `order_state = 'Completed'`)**:
   - **Thời điểm Check-in Thực tế (`actual_booking_date_start`)**: Khi truy vấn ngày/giờ khách hàng thực tế đến làm dịch vụ tại tiệm, **bắt buộc phải lấy từ cột `report_order.actual_booking_date_start`** (thông qua `LEFT JOIN report_order ro ON o.id = ro.order_id`). Chuỗi ưu tiên thời gian: `COALESCE(ro.actual_booking_date_start, o.booking_date_start)` (2 cấp, đồng bộ WingsLashes `StaffBonusLevelState.php`).
   - Tất cả các báo cáo tài chính, doanh số bán Combo (`$ Combo`), bán lẻ (`$ Single`), sản phẩm (`$ Product`), điểm thưởng CC và thu nhập CC **bắt buộc phải tính theo thời điểm check-in/hoàn thành thực tế và trạng thái đơn hàng đã hoàn tất (`order_state = 'Completed'`)**.
   - **Tuyệt đối không dùng date_created cho Doanh thu/Combo**: Tuyệt đối không sử dụng ngày tạo đơn (`order.date_created`) để công nhận hay ghi nhận doanh số / combo đã bán cho các báo cáo doanh thu và KPI của CC.
   - **Phân biệt với chỉ số Booker (Rule #7/Rule #10)**: Chỉ số đếm "Tạo lịch" của Booker dùng `date_created` (đo năng suất telesales tạo hẹn), còn chỉ số "Doanh thu & Combo" dùng `actual_booking_date_start` + `order_state = 'Completed'` (đo thực thu & nghiệm thu dịch vụ tại cửa hàng).
   - **Đồng bộ cặp Query Listing & Stats (Dual-Query Alignment)**: Khi chỉnh sửa điều kiện lọc bucket/đơn hàng trong `apps/api/src/modules/customers/routes.ts`, **bắt buộc phải cập nhật đồng thời cả Listing Query (`bStr`) và Stats Query (`bStrStats`)** để đảm bảo số liệu trên bảng và số đếm trên thẻ tab khớp 100%, tránh lỗi syntax hoặc lệch data.

---

# 👁️ Lash Touch-up Expiration Window Business Rules (Quy tắc Thời hạn Dặm mi)

1. **Khách không mua gói (Khách lẻ / Single)**:
   - Hạn dặm mi tối đa: **21 ngày** kể từ ngày làm mi gần nhất (`COALESCE(ro.actual_booking_date_start, o.booking_date_start)`).
   - Quá 21 ngày: Tính là dặm trễ, không áp dụng dặm mi mà bắt buộc tư vấn nối mới.

2. **Khách có mua gói Combo (Combo Package)**:
   - Hạn dặm mi tối đa: **25 ngày** kể từ ngày làm mi gần nhất (`COALESCE(ro.actual_booking_date_start, o.booking_date_start)`).
   - Quá 25 ngày: Tính là dặm trễ, không được trừ lượt dặm trong gói mà bắt buộc tư vấn làm mới.

---

# 🏆 Telesales Leaderboard Productivity & Default Top Booker Selection Invariant

1. **Telesales Ranking Metric**: Mọi câu truy vấn API backend (`/api/kpi/leaderboard`) và logic sắp xếp mảng Leaderboard cho Telesales bắt buộc phải xếp theo **năng suất làm việc thực tế (`totalBooked` / `booked` count, hoặc `totalCheckin` / `done` count)**. Tuyệt đối không sắp xếp theo `totalEarnings` (tổng lương cứng và phụ cấp) vì những nhân sự 0 đơn không bị trừ phạt missed call sẽ bị đẩy lên Top #1 (như Đẫm Ti).
2. **Default Top Booker Fallback**: Khi mở Popup/Modal Telesales Dashboard mà không có nhân sự được chọn (hoặc nhân sự được chọn không có trong mảng kỳ được lọc), Frontend bắt buộc phải tự động chọn **Top 1 Booker có lượng đơn Booked cao nhất (như Ngọc Điệp)** thay vì chọn phần tử đầu tiên mặc định hay hardcode initials (`'TN'`) dễ gây trùng lặp username.

---

# 🌙 Night Shift Autonomous Optimization Protocol & Safety Rules

1. **Trigger Phrase**: Khi nhận yêu cầu *"Bắt đầu Night Shift"*, *"night shift"*, *"tối ưu xuyên đêm"*, hoặc kích hoạt skill `/night-shift`.
2. **Git Branch Isolation**: Luôn tự động checkout sang nhánh `night-shift/YYYY-MM-DD`. Tuyệt đối không làm việc trực tiếp trên `main`.
3. **Strict Verification Loop**: Mỗi thay đổi phải vượt qua script `bash scripts/night-shift-runner.sh` (`pnpm lint`, `pnpm --filter @mos-lab/shared build`, `pnpm build`). Nếu lỗi, tự động rollback bằng `git checkout -- .`.
4. **Walkthrough Artifact Report**: Xuất file Báo cáo tổng hợp `walkthrough.md` trong Artifacts kèm danh sách commit và lệnh merge cho người dùng khi hoàn tất.

---

# 🛑 Strict CC IN / CC OUT / CV Staff Recognition & Fallback Prohibition Rules

1. **Định nghĩa chuẩn**:
   - `CC IN`: Tư vấn viên thực hiện Check-in cho khách tại cửa hàng.
   - `CC OUT`: Tư vấn viên thực hiện Checkout / Thanh toán cho khách.
   - `BK`: Nhân sự Booker / Telesales tạo đơn hẹn.
   - `CV`: Chuyên viên / Kỹ thuật viên làm dịch vụ mi.
2. **Quy tắc hiển thị & API**:
   - Đơn hàng chưa Check-in hoặc bị lỡ (`New`, `Pending`, `Missed`, `Cancelled`): `ccInName` và `ccOutName` bắt buộc phải trả về `null` (hiển thị `-` trên UI).
   - Khách hàng không chọn trước KTV chỉ định (`assigned_staff_id = null`): `technicianName` bắt buộc phải trả về `null` (hiển thị `-` trên UI), **tuyệt đối KHÔNG** fallback hiển thị chuỗi mặc định `"Kỹ thuật viên"`.
   - **Cấm giả lập fallback**: Tuyệt đối KHÔNG viết logic fallback gán tên Booker hay KTV làm CC IN/OUT (`rawCheckIn || rawBooker || firstCvStaffId`).

---

# 🔄 Staff Dropdown Deduplication & Infinite Scroll Fetch Safety Rules

1. **De-duplicate Nhân Sự**: Tất cả các API trả về danh sách nhân viên (`/api/customers/staff`) bắt buộc phải lọc de-duplicate theo `displayName` (trimmed & case-insensitive) trước khi trả về cho Frontend, đảm bảo các ô chọn Select không bao giờ xuất hiện tên trùng lặp.
2. **An Toàn Cuộn Trang Infinite Scroll**: Tất cả các hook/component dùng `IntersectionObserver` để cuộn tải thêm dữ liệu bắt buộc phải duy trì cờ `hasMore` (đặt thành `false` khi số item < `pageSize` hoặc đã tải hết `total`) và ref `isFetchingRef` ngăn chặn vòng lặp gọi API vô hạn gây giật lắc giao diện.

---

# 🛍️ Unified Combo Recognition & Date Range Parsing Invariants (Single Source of Truth)

1. **Định nghĩa Đơn Bán Combo Chuẩn (Unified Combo Recognition)**: Một giao dịch được ghi nhận là Bán Combo thành công khi thỏa 3 điều kiện: (1) `order.order_state = 'Completed'`, (2) Tồn tại chi tiết gói combo trong `order_service_combo` (`total_price > 0`, package key không chứa từ khóa loại trừ `%single%`, `%refill%`, `%balance%`) HOẶC trong `order_service` có `user_service_type = 'combo'` hoặc `service_group = 'combo'`, (3) Khách hàng được cập nhật số dư trong `user_service_balance`.
2. **Quy tắc Chuẩn hóa Ngày Giờ Truy vấn (Date Range Parsing & Padding Rule)**: Khi nhận chuỗi ngày `dateFrom` và `dateTo` (dạng `YYYY-MM-DD` 10 ký tự), Fastify Backend bắt buộc dùng `parseComboDateBounds` chuẩn hóa `dateFrom` thành `YYYY-MM-DD 00:00:00` và `dateTo` thành `YYYY-MM-DD 23:59:59`. Tuyệt đối **CẤM** dùng `.slice(0, 19)` cắt thô làm rụng đuôi `23:59:59` gây lỗi SQL `<='YYYY-MM-DD 00:00:00'` làm bỏ sót 100% các đơn bán combo trong ngày.
3. **Nguồn Dữ Liệu Tập Trung (Single Source of Truth Service)**: Báo cáo CC, New LoCa, Báo cáo Booker và Filter Khách hàng bắt buộc dùng chung `ComboRecognitionService` (`apps/api/src/modules/customers/services/combo-recognition.service.ts`) để đồng bộ 100% số lượng đơn combo và doanh số combo trên toàn hệ thống.



