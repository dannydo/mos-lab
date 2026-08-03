# Frontend Theme Customization Rules

Để đảm bảo hệ thống hỗ trợ cả giao diện sáng (Light Theme) và tối (Dark Theme) chính xác, tất cả các tác vụ cập nhật giao diện trong tương lai cần tuân thủ nghiêm ngặt các quy tắc sau:

## 1. Cơ chế hoạt động của Theme
* Hệ thống sử dụng một biến trạng thái toàn cục `themeMode` ('light' | 'dark') được cấp phát qua `useTheme()` trong `ThemeContext.tsx`.
* Khi `themeMode` thay đổi, class `.light-theme` hoặc `.dark-theme` tương ứng sẽ được áp dụng trực tiếp lên thẻ `<html>` gốc (`document.documentElement`).

## 2. Quy tắc ghi đè CSS (CSS Overrides Rules)
* **Tuyệt đối KHÔNG** hardcode trực tiếp các thuộc tính màu nền tối (như `background: #141414 !important` hoặc `color: #fff`) trong các selector CSS toàn cục.
* Toàn bộ các quy tắc ghi đè màu sắc của thư viện (như `ant-table`, `ant-drawer`, `ant-tabs`) phải được phân vùng rõ ràng theo cấu trúc phân cấp dưới class theme của thẻ gốc:
  
  ```css
  /* Ghi đè màu sắc chỉ áp dụng for Dark Theme */
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

## 6. Single Source of Truth Design Tokens & Responsive / Density Standardization Rules
* **Lưu trữ Design Tokens tập trung**: Toàn bộ quy chuẩn màu sắc, bo góc, typography, responsive breakpoints (`phone: 375`, `ipad: 768`, `laptop: 1024`, `desktop: 1440`, `fourK: 2560`) và mật độ hiển thị (`compact`, `comfort`, `spacious`) bắt buộc phải lấy từ `themeTokens` trong `@mos-lab/shared` (`packages/shared/src/theme/tokens.ts`).
* **Tái sử dụng UI Primitives**: Ưu tiên sử dụng các UI components dùng chung tại `apps/web/components/ui` (`StatCard`, `SectionCard`, `PageHeader`, `StatusTag`, `IconText`, `DensityContainer`) thay vì viết lại các khối giao diện tương tự rải rác.

## 7. Strict Vertical Alignment (v-align) & Flex Centering Rules
* **Tuyệt đối KHÔNG sử dụng class `align-center`**: Class `align-center` không tồn tại trong Tailwind CSS. Khi cần căn giữa theo chiều dọc trong flex container, luôn luôn sử dụng class `items-center` (`align-items: center`).
* **Căn giữa chuẩn cho Badges, Tags & Pills**: Tất cả các thành phần dạng nhãn (Thẻ Tag, Badges, Pills, Status Badge) bắt buộc phải dùng `inline-flex items-center justify-center leading-none` kèm padding cân đối (`py-1 px-2.5`) để văn bản và biểu tượng vector luôn nằm chính giữa tuyệt đối theo chiều dọc, không bị lệch lề trên hay lề dưới.

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

---

# 🏷️ Catalog Product Stock & VND Price Integer Rounding Rules

1. **Đơn vị tiền tệ chuẩn (VND)**: Bảng `product_price` và `service_price` lưu trữ giá theo `currency_id = 2` (VND). Khi truy vấn giá sản phẩm/dịch vụ, luôn lọc theo `currency_id = 2`.
2. **Làm tròn số nguyên (`Math.round`)**: Do CSDL legacy lưu trữ giá dạng `float` chưa VAT (ví dụ `681818.181818`), tất cả các DTO và ô nhập liệu giá tiền **bắt buộc phải bọc trong `Math.round(price)`** để không bị xuất hiện chuỗi số thập phân rườm rà (như `.18181818`).
3. **Tra cứu Tồn kho Sản phẩm (`inventory_warehouse_item`)**: Số lượng tồn kho sẵn bán của sản phẩm được liên kết từ `product.inventory_item_id` đến `inventory_warehouse_item.inventory_item_id`. Số lượng `inStockCount` được đếm từ các dòng có `item_state = 'New'`.

---

# 📊 Controlled & Persistent Table Pagination Rules

1. **Cấu hình Table Pagination**: Tất cả các bảng dữ liệu Ant Design `<Table>` khi sử dụng phân trang phải dùng dạng kiểm soát (Controlled State) gồm: `current`, `pageSize`, `onChange`, `showSizeChanger`, `pageSizeOptions: ['10', '20', '50', '100']`, và `showTotal`.
2. **Lưu trạng thái (Persistence)**: Lưu `activeTab`, số trang (`page`) và kích thước trang (`pageSize`) vào `localStorage`. Khi người dùng tải lại trang hoặc chuyển đổi giữa các tab, giao diện phải giữ nguyên trang và tab làm việc hiện tại. Khi đổi bộ lọc/tìm kiếm, số trang tự động quay về 1.

---

# 👁️ Exclusive Hidden Items Filter Rules

1. **Nghiệp vụ công tắc "Chỉ hiện mục đã ẩn"**:
   - **Trạng thái OFF (Mặc định)**: Bảng chỉ hiển thị danh sách các mục đang hoạt động (`!record.isDisabled`).
   - **Trạng thái ON**: Bảng chuyển sang chế độ lọc độc quyền **chỉ hiển thị các mục đã bị vô hiệu hóa/ẩn** (`record.isDisabled`), giúp Admin dễ dàng kiểm tra và bật lại trạng thái hoạt động khi cần.

---

# 💰 Auto-Suggested Combo Price Calculation Rules

1. **Công thức Giá Gợi Ý**: Giá trọn gói combo mặc định được tính theo số lượt mua và giá bán lẻ dịch vụ niêm yết:
   $$\text{Suggested Combo Price} = (\text{Retail Price} \times \text{Purchased Count})$$
2. **Lượt Tặng 0đ**: Tất cả các lượt tặng (`bonusNormalCount`, `bonusRetainCount`) có giá bằng **0đ** và không được cộng vào giá trọn gói.
3. **Tính năng Auto-fill & Override**: Khi Admin chọn Dịch vụ hoặc đổi Số lượt mua trong Form Combo, CRM tự động điền Giá gợi ý vào ô *Giá trọn gói (VNĐ)*. Admin có thể nhập đè nếu gói có ưu đãi đặc biệt.

---

# 🔒 Catalog Write Authorization & Language Entry Fallback Rules

1. **Phân quyền Backend Middleware (`requireCatalogAdmin`)**: Cho phép `user.role === 'admin'`, `user.username === 'admin'`, hoặc `user.username === 'danhdo@gmail.com'` / `user.email === 'danhdo@gmail.com'` thực hiện các thao tác thêm, sửa, xóa Catalog (`/catalog/*`) trên cả môi trường Local và Production.
2. **Truy vấn Ngôn ngữ Dịch vụ (`service_language`)**: Khi cập nhật dịch vụ (`PUT /catalog/services/:id`), tìm kiếm `service_language` theo `service_id` linh hoạt (không gán cứng `language_id = 1`) và tự động tạo `tx.service_language.create` fallback nếu dịch vụ chưa có dòng tên trong CSDL.

---

# 🕒 Chạm 24h Yesterday-Only Definition Invariant

1. **Quy tắc tính số ngày**: `Chạm 24h` (`key: 'now'`) trong chiến dịch LoCa được định nghĩa nghiêm ngặt là **chỉ lọc khách hàng ghé tiệm làm mi vào HÔM QUA** (`daysMin: 1, daysMax: 1`, `DATEDIFF(NOW(), last_visit) = 1`).
2. **Loại trừ hôm nay**: Tuyệt đối **loại trừ** khách hàng ghé tiệm trong ngày hôm nay (`0 ngày`).

---

# 👤 Booker Selector Option Label & Value Invariant

1. **Chuẩn nhãn hiển thị**: Tất cả các ô chọn Select Booker / Telesales trên các trang chiến dịch (LoCa, NYC) bắt buộc phải sử dụng option value `'ALL'` và nhãn hiển thị **`All Bookers`** (thay vì `'all'`, raw `'ALL'`, hoặc `'Tất cả nhân sự'`).

---

# 🔲 Synchronized Minimalist Square Button Toolbar Styling Rules

1. **Kiểu dáng nút Icon**: Các icon bộ lọc dạng nút bấm đơn lẻ đặt cạnh ô tìm kiếm trên thanh toolbar (ví dụ: Bộ lọc trạng thái đặt lịch `Tất cả`, `Đã book`, `Chưa book`) bắt buộc phải được thiết kế dạng khối vuông `32x32px` (`w-8 h-8 rounded-lg`) đồng bộ hoàn toàn với kích thước, chiều cao (`h-8`), bo góc (`rounded-lg`) và viền của nút Cấu hình (Gear button).

---

# 📅 Staff Fixed Weekly Off Single Source of Truth Rules (`staff_day_off_schedule`)

1. **Nguồn Dữ Liệu Chuẩn (Source of Truth)**: Ngày OFF tuần cố định của tất cả các nhân sự trong hệ thống (KTV/CV, Tư vấn viên/CC, Booker/BK/Telesales) **bắt buộc phải truy vấn từ bảng master `staff_day_off_schedule`** trong CSDL legacy `management` (với điều kiện `is_disabled = 0 AND user_id IS NOT NULL`).
2. **Giá trị đại diện**: Cột `weekday` (`1` = Thứ 2, `2` = Thứ 3, ..., `7` = Chủ Nhật).
3. **Thứ tự ưu tiên (Precedence Order)**:
   - **Ưu tiên hàng đầu**: Lấy từ `staff_day_off_schedule` (`is_disabled = 0`).
   - **Dự phòng (Fallback)**: Chỉ khi nhân sự không có dòng cấu hình trong `staff_day_off_schedule` mới dùng số liệu đếm từ `staff_day_off` (lọc 90 ngày gần nhất) hoặc lịch ca làm `staff_working_shift_schedule`.
4. **Phân biệt với Ngày Nghỉ Phép**: Bảng `staff_day_off` đại diện cho các phiếu/ticket xin nghỉ phép ngày cụ thể (`approvedOffDates`), không được dùng làm căn cứ chính để xác định lịch off tuần cố định.

---

# 🔍 System-wide Tone-Insensitive Vietnamese Search Rules (Quy tắc Tìm kiếm Tiếng Việt Không Dấu)

1. **Bắt buộc Tìm kiếm Tiếng Việt Không Dấu**: Tất cả các thành phần tìm kiếm trên toàn bộ hệ thống (bao gồm `<Select showSearch>`, bộ lọc `<Table>`, ô tìm kiếm Khách hàng, Nhân sự HR, Booker, Catalog, Dịch vụ) **bắt buộc phải hỗ trợ Tìm kiếm tiếng Việt không dấu** (Tone-insensitive & Case-insensitive matching).
2. **Hàm Chuẩn hóa (Normalize Helper)**: Luôn loại bỏ dấu tiếng Việt khi so sánh chuỗi:
   ```typescript
   export const removeVietnameseTones = (str: string): string => {
     return (str || '')
       .normalize('NFD')
       .replace(/[\u0300-\u036f]/g, '')
       .replace(/đ/g, 'd')
       .replace(/Đ/g, 'D')
       .toLowerCase()
       .trim();
   };
   ```
3. **Cấu hình Antd Select**: Đối với thành phần `<Select showSearch>`, truyền hàm `filterOption` chuẩn hóa không dấu:
   ```typescript
   filterOption={(input, option) =>
     removeVietnameseTones(String(option?.label || '')).includes(removeVietnameseTones(input))
   }
   ```

---

# 🎯 LoCa Campaign Customer Care Touchpoint Schedule Rules (Quy tắc Mốc Chạm CSKH LoCa)

1. **Mục tiêu chiến dịch LoCa**: Chăm sóc đặc biệt dành cho khách hàng đã mua Combo Live để hỗ trợ họ sử dụng hết các lượt nối/dặm trong gói và tiếp tục tái sử dụng dịch vụ tại salon.
2. **Quy tắc 8 Mốc Chạm CSKH chuẩn**:
   - `Chạm 24h`: Đảm bảo khách hàng hài lòng 100% với bộ mi sau lần làm dịch vụ gần nhất.
   - `Chạm 17n`: Nhắc lịch dặm mi cho khách hàng (thời hạn dặm mi tối ưu là trong 21 ngày).
   - `Chạm 19n`: Nếu đến ngày 17 khách vẫn chưa đặt lịch dặm, chạm lần 2 để hỗ trợ đặt lịch trong chu kỳ 21 ngày.
   - `Chạm 21n`: Ngày cuối cùng để đặt lịch dặm 21 ngày (đối với khách lẻ, đây là ngày cuối cùng nhận giá dặm ưu đãi).
   - `Chạm 23n`: Khách hàng mua combo có tới 25 ngày để dặm mi và được trừ lượt dặm mi trong gói.
   - `Chạm 25n`: Ngày cuối cùng cho khách combo sử dụng lượt dặm mi đã mua trong gói.
   - `Chạm 30n`: Đã trễ 5 ngày so với hạn dặm 25 ngày, bắt buộc sử dụng lượt nối mi mới trong gói combo.
   - `Chạm 30n+`: Hỗ trợ khách hàng dùng hết các lượt nối mới còn lại trong gói trước khi HSD gói hết hạn.
3. **Tương tác 1-Click & Popover Ghi Chú (`LocaTouchpointCell.tsx`)**: Bấm vào ô Chạm tự động đánh dấu cờ và mở ngay `<Popover>` điền phản hồi của khách, thiết kế dạng nút High-Contrast (Vàng Gold `#D4A84B`, Emerald `#059669`, Red dashed `#EF4444`).

---

# 📐 Table Explicit Width & Responsive Tablet Layout Rules (Quy tắc Độ rộng Cột Bảng & Hiển thị trên iPad/Tablet)

1. **Bắt buộc khai báo numeric `width` cho 100% các cột**: Tất cả các định nghĩa cột trong `<Table>` Ant Design (đặc biệt khi sử dụng `scroll={{ x: 'max-content' }}`) bắt buộc phải có thuộc tính `width` số cụ thể (ví dụ: `width: 95` đến `width: 170`). Tuyệt đối không để `width: undefined`.
2. **Ngăn ngừa co chữ theo chiều dọc (`white-space: nowrap`)**: Tất cả các cell hiển thị văn bản, số tiền VND, số điện thoại, ngày giờ hoặc nhãn trạng thái bắt buộc sử dụng `white-space: nowrap` để tránh hiện tượng rớt dòng từng ký tự theo chiều dọc (`3 \n . \n 6 \n 6...`) trên các thiết bị iPad/Tablet (màn hình 1024px – 1366px).
3. **Cơ chế Dự phòng trong `useTableConfig.ts`**: Hook quản lý cấu hình bảng phải bọc `effectiveWidth` (`width >= 40 ? config.width : staticCol.width || 120`) để tự động khắc phục các dữ liệu cấu hình lưu trong CSDL bị thiếu `width`.

---

# ⚡ Allocation Batch Query Intersecting Rules (Quy tắc Giao Tập Khách Hàng Đợt Phân Bổ)

1. **Đồng bộ Listing & Stats Query (`bStr` & `bStrStats`)**: Khi nhận `allocationBatchId`, Fastify Backend API (`GET /api/customers` và `/stats`) bắt buộc truy vấn danh sách `customerId` từ `crmAllocationBatchItem` (`where: { batchId }`) và thực hiện giao tập (Intersect) với `allowedUserIds` bằng `Set` (`bSet.has(id)`). Tuyệt đối không thay thế hay ghi đè hoàn toàn danh sách phân quyền `allowedUserIds` của Booker.

---

# ➕ Creation & Addition Action Button Standard (Quy tắc Nút Thao Tác Thêm Mới Bắt Buộc Có Dấu `+`)

1. **Required Plus Icon (`+`) for Creation Actions**: Tất cả các nút bấm, icon button hoặc menu action đại diện cho thao tác **Thêm mới / Tạo mới / Đặt lịch mới** (ví dụ: *Đặt lịch mới*, *Tạo chiến dịch*, *Thêm mốc chạm*, *Tạo phân bổ*) **bắt buộc phải có biểu tượng dấu cộng (`+` / `<PlusOutlined />`)** đi kèm để người dùng dễ dàng nhận biết tính năng khởi tạo tại mọi vị trí giao diện.
2. **Compact Icon Button Visual Standard**: Đối với các nút icon bấm nhanh compact (ví dụ: nút Vàng kim *Đặt lịch mới* trên Toolbar LoCa/NYC/Tất cả KH), sử dụng icon `<PlusOutlined />` (hoặc kết hợp icon + nhãn Tooltip rõ ràng) để không bị nhầm lẫn với icon Lịch `[ 📅 ]` thông thường.
3. **Combined Icon Pattern for Text Buttons**: Đối với nút bấm có nhãn chữ (ví dụ `<Button icon={<PlusOutlined />}>Đặt lịch mới</Button>`), luôn đặt `<PlusOutlined />` làm icon mặc định.

---

# 🚀 Centralized System Constants & AI Agent Lookup Protocol (Quy tắc Hằng Số Hệ Thống Tập Trung)

1. **Single Source of Truth**: Tất cả các con số số học, tỷ lệ %, mốc thời gian, ID CSDL trong toàn bộ dự án `mos-lab` bắt buộc phải được khai báo tập trung tại `@mos-lab/shared/src/constants/system-constants.ts` (export qua `@mos-lab/shared`).
2. **AI Agent Protocol**: Mọi AI Agent làm việc trên `mos-lab` bắt buộc tra cứu và sử dụng các đối tượng hằng số sau:
   - `CC_GAMIFICATION_SYSTEM_CONFIG`: Points per level (`100`), bonus rate (`65`), tip percentage (`20%`/`10%`), staff bonus rule ID (`248`), daily sales tiers.
   - `LASH_TOUCHUP_SYSTEM_CONFIG`: Touch-up max days Single (`21`) and Combo (`25`).
   - `OPERATIONAL_SHIFT_SYSTEM_CONFIG`: Operational hours (`09:00 - 21:00`), cashflow tracking hours (`11:00 - 23:00`), duration (`12h`).
   - `CATALOG_CURRENCY_SYSTEM_CONFIG`: Currency ID VND (`2`), Banana Points (`3`), Referral Template ID (`7`), Vietnamese Language ID (`1`).
   - `UI_PAGINATION_SYSTEM_CONFIG`: Default page size options (`['10', '20', '50', '100']`), default page size (`20`).
3. **KTV Hourly Wage Invariant**: Tuyệt đối **KHÔNG** hardcode mức lương giờ KTV (CV) `21500` trên UI. Lương giờ KTV bắt buộc truy vấn 100% động từ CSDL `staff_payroll.working_hour_rate`.

---

# 🔄 Dynamic `user_service_type` Recognition Rules

1. **Cơ chế tính toán**: Khi tạo mới lịch hẹn (`POST /customers/booking`) hoặc dời lịch hẹn (`PUT /customers/booking/:id/reschedule`), Fastify backend bắt buộc phải dùng `UserServiceTypeService.determineUserServiceType(fastify, customerId, bookingDateStart)` để tự động xác định trạng thái làm dịch vụ của khách hàng (`new`, `combo`, `combo_last`, `combo_expired`, `combo_over`, `lapser`, `long_time`).
2. **Nghiêm cấm hardcode**: Tuyệt đối **KHÔNG** hardcode chuỗi `'new'` hoặc bỏ qua việc tính toán lại `user_service_type` khi dời lịch, để ứng dụng iOS hiển thị đúng icon biểu tượng trước tên khách hàng.

---

# 🔗 Legacy Customer Profile URL Parameter Rules

1. **Đường dẫn chuẩn**: Trang danh sách khách hàng trên hệ thống Legacy Angular có đường dẫn `/admin/online-consultant/user/customer`.
2. **Query Parameters được hỗ trợ**: Hệ thống Legacy tiếp nhận các tham số tìm kiếm bao gồm `phone`, `phone_number`, `keyword`, hoặc `search` (Ví dụ: `http://localhost/admin/online-consultant/user/customer?phone=0983960852`).
3. **Lưu ý**: Không sử dụng `search_keyword` làm query parameter vì hệ thống Legacy Angular không đọc tham số này.

---

# 🎨 Unified Icon & Emoji Picker Invariant (Single Source of Truth Component)

1. **Single Source of Truth Component**: Tất cả các ô chọn biểu tượng (icon picker / emoji picker) trên toàn hệ thống bắt buộc phải sử dụng component dùng chung `IconPickerModal` (`apps/web/components/IconPickerModal.tsx`) và `TouchpointIconPicker` (`apps/web/components/campaign/TouchpointIconPicker.tsx`).
2. **Kho Biểu Tượng Tập Trung**: Hỗ trợ đồng bộ 4 nhóm: Ant Design (447 icons), Lucide (1995 icons), Emoji (200+ emojis), và Custom SVG icons (4 icons).
3. **Hàm Render Chuẩn (`getIconComponent` / `renderIconHelper`)**: Sử dụng `renderIconHelper` / `getIconComponent` từ `IconSystem.tsx` để render sắc nét tất cả các định dạng icon (`Antd`, `lucide:*`, `custom:*`, `emoji`). Tuyệt đối không viết lại component chọn icon rời rạc hoặc hardcode danh sách icon nhỏ lẻ.













