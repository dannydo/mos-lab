# 🚀 AI Agent Development Guide for mos-lab

This guide outlines common commands, monorepo architecture, coding standards, and best practices to help you develop faster and correctly in `mos-lab`.

---

## 🛠️ Common Commands

### Workspace Commands
- **Start local dev servers**: `pnpm dev` (Runs Web on http://localhost:4000 and API on http://localhost:4001)
- **Build all packages**: `pnpm build`
- **Run lint checks**: `pnpm lint`
- **Clean workspace build cache**: `pnpm clean`

### Backend DB Commands (`apps/api`)
- **Generate Prisma Clients**: `pnpm --filter @mos-lab/api prisma:generate` (Generates clients for both `crm` and `legacy`)
- **Apply CRM migrations**: `pnpm --filter @mos-lab/api prisma:migrate:crm`
- **Pull legacy DB schema**: `pnpm --filter @mos-lab/api prisma:db:pull:legacy`

---

## 📦 Monorepo Architecture

```
mos-lab/
├── apps/
│   ├── web/                          # Next.js 15 + Ant Design 5 (Port: 4000)
│   └── api/                          # Fastify 5 + TypeScript (Port: 4001)
├── packages/
│   └── shared/                       # Shared Types & Constants (@mos-lab/shared)
└── scripts/                          # Deployment scripts
```

---

## 🎯 Coding Guidelines & Best Practices

### 1. Strongly-Typed Shared Packages
- **Always use shared types**: Do not redefine model interfaces on the frontend. Use types from `@mos-lab/shared` (e.g. `Customer`, `DailyPlan`, `Staff`, etc.).
- When adding API endpoints, define request/response parameters in `packages/shared/src/types/` and run `pnpm --filter @mos-lab/shared build` before using them.

### 2. Frontend API Calls
- **Never use raw Axios strings**: Do not call `api.get('/some-route')` directly.
- **Use the SDK**: Always use `apiClient` located in `apps/web/lib/api-client.ts`. It provides autocomplete, parameter types, and return-type safety.
  - *Example*: `const res = await apiClient.customers.list({ bucket: 'COMBO_LIVE' });`

### 3. Backend Imports & Modules
- **File Extensions**: Relative imports in `apps/api` **MUST** end with `.js` (e.g. `import prismaPlugin from './plugins/prisma.js'`). This is required by `NodeNext` TypeScript configuration.
- **Prisma Clients**:
  - `fastify.prisma.crm`: Database `mos_lab` for CRM data (CRUD allowed).
  - `fastify.prisma.legacy`: Database `management` for Legacy CRM data (**READ-ONLY** đối với bảng giao dịch: `order`, `order_service`, `user`, `user_profile`, `staff_bonus`, `user_service_balance`).
    - **Ngoại lệ Catalog (Catalog Exception)**: Ghi lên các bảng master metadata (`service`, `service_language`, `service_price`, `product`, `product_language`, `product_price`) được **PHÉP** duy nhất tại các endpoint Catalog Management (`/api/catalog/*`), bảo vệ bởi `requireRole(['admin'])` và bọc trong `$transaction`.

### 4. Theme & Styling (Refer to `.agents/AGENTS.md`)
- **Theme support**: Giao diện hỗ trợ cả Sáng (Light Theme) và Tối (Dark Theme).
- **CSS Overrides**: Tuyệt đối không hardcode màu nền tối (`background: #141414 !important`). Phân vùng ghi đè rõ ràng:
  ```css
  .dark-theme .ant-table { background: #141414 !important; }
  .light-theme .ant-table { background: #ffffff !important; }
  ```
- **Inline Styles**: Luôn sử dụng `themeMode === 'dark' ? ... : ...` hoặc `theme.useToken()` của Ant Design.
- **Tabular Numbers**: Tất cả các số đếm ngược, thời gian chạy, đồng hồ, thời lượng, v.v. bắt buộc phải dùng `font-variant-numeric: tabular-nums` (hoặc class Tailwind `tabular-nums`) để không bị giật giao diện khi số thay đổi.

### 5. Booker Salary API Configuration & Privacy (Refer to `.agents/AGENTS.md`)
- **No Shared API**: Tuyệt đối không gọi đến endpoint Wingslashes ngoài.
- Dùng API xuất dữ liệu nội bộ: `GET /api/kpi/export-booker-salary` đi kèm key tích hợp: `?key=FDC0D0A177694777A`.

### 6. CC Gamification & Bonus Calculation Rules (Refer to `.agents/AGENTS.md`)
- **Level CC**: $100\text{ pts} = 1\text{ Level}$ ($\text{Level} = \lfloor \text{prevPoints} / 100 \rfloor + 1$). Reset về 1 mỗi đầu tháng.
- **CC Bonus (đ)**: $\text{CC Bonus} = \text{Level CC} \times 65\text{đ}$.
- **CC In != CC Out**: Tự động chia **50/50** cho cả Điểm CC (+pts) và Tiền thưởng CC Bonus (đ).
- **Leaderboard**: Tổng tiền thưởng `Thưởng CC Bonus` trên Leaderboard khớp 100% từng đồng với tổng từng ca làm trong Bảng Chi Tiết.

### 7. CC Tip Bonus & Active CC Filter Rules (Refer to `.agents/AGENTS.md`)
- **Công thức CC Tip (20%)**: CC nhận 20% tổng tiền tip khách cho (lưu trong `staff_tip` với `tip_percentage = 20`).
- **CC In != CC Out**: Khi nhân viên CC In khác CC Out, khoản Thưởng CC Tip (20%) bắt buộc chia **50/50** cho cả 2 CC (mỗi CC nhận 10% tip share, `tip_percentage = 10`).
- **Chỉ đơn Completed**: Chỉ tính tiền tip từ các đơn hàng có trạng thái `order_state = 'Completed'`.
- **Tránh SQL Duplication**: Tuyệt đối không `JOIN order_service` hoặc `JOIN staff_bonus` khi tính `SUM(st.tip_amount)`, hãy query trực tiếp từ `staff_tip` JOIN `order`.
- **Active CC Config**: Tất cả các tab báo cáo CC bắt buộc phải lọc theo danh sách ID tư vấn viên đang hoạt động trong `crmConfig` với key `ACTIVE_CC_STAFF_CONFIG`.
- **Tổng Thu Nhập Live Paystub**: `Tổng Thu Nhập Tạm Tính` = `Lương Giờ` + `Thưởng CC Xoay` + `Thưởng Combo & SP` + `Thưởng Minigame` + `Thưởng CC Tip (20%)`.

### 8. External API References & `wingslashes` Source Code Inspection
- Mỗi khi người dùng cung cấp đường dẫn API (ví dụ: `https://api.wingslashes.com/...` hoặc `https://api.orb/...`), **không gọi trực tiếp endpoint ngoài**.
- **Chủ động tra cứu source code `wingslashes` nội bộ**: Truy cập và kiểm tra mã nguồn/repository `wingslashes` trên hệ thống local để đối chiếu câu lệnh SQL, công thức tính toán và logic dữ liệu chính xác của API đó.

### 9. Proactive OmiCall SIP & Gateway Diagnostics
- **Tự động Kiểm thử Trực tiếp OmiCall PBX**: Mỗi khi người dùng báo lỗi cuộc gọi không thành công, ngắt cuộc gọi ngay (`00:00 KHÔNG BẮT MÁY`) hoặc gặp sự cố tổng đài OmiCall, **không chỉ sửa code UI đơn thuần**.
- **Chủ động chạy kịch bản SIP WebSocket Test**: Sử dụng Node.js gửi gói tin `REGISTER` và `INVITE` trực tiếp lên gateway OmiCall (`wss://sig.omicrm.com`) với thông tin máy lẻ CRM (ví dụ Ext `106` / `Hotline106` / realm `quangnguyen2`) để xác minh:
  1. Trạng thái kết nối SIP Register (`200 OK`).
  2. Trạng thái định tuyến gọi ra và cước thoại OmiCall Portal (`480 Temporarily Unavailable` / `Q.850 cause 16`).
- **Thông báo & Tự động Dự phòng (Simulation Fallback)**: Nếu OmiCall PBX phản hồi lỗi 480 hoặc hết cước thoại thực tế, chủ động thông báo cho người dùng và tự động kích hoạt Chế độ Mô phỏng (Simulation Mode) để việc kiểm thử UI/Call Wrapup/AI Analysis không bị gián đoạn.

### 10. Booker "Booked / Tạo Lịch" Metric & Productivity Definition Rule
- **Định nghĩa Booked/Tạo lịch**: Tất cả các báo cáo, widget, modal KPI và Leaderboard của Booker/Telesales khi đếm số lượng **"Booked / Đặt lịch / Tạo lịch"** bắt buộc phải tính theo **ngày tạo đơn thực tế trong kỳ (`date_created` trong khoảng thời gian được lọc)**.
- **Mục đích đo lường**: Đơn đếm `Booked` đại diện cho **hiệu suất lao động (năng suất công việc)** của Booker tạo ra trong ca/ngày/tuần/tháng đó.
- **Không dùng OR với booking_date_start**: Tuyệt đối không dùng câu lệnh `OR` hợp nhất với `booking_date_start` (ngày khách hẹn đến) khi đếm số lượng đặt lịch của Booker.

### 11. Unified Business Logic & Fastify Backend Model Rule (Single Source of Truth)
- **Khi có từ 2 vị trí trở lên cần xử lý/tính toán cùng một loại thông tin/chỉ số (Business Logic)**:
  - **Không duplicate logic**: Tuyệt đối không tính toán hay tự `reduce` rải rác ở Frontend hay viết nhiều câu SQL inline lệch nhau.
  - **Tập trung tại Fastify Backend Model / Service**: Bắt buộc xây dựng Model/Service tập trung tại Fastify Backend (`apps/api`), định nghĩa kiểu dữ liệu chuẩn tại `@mos-lab/shared`.
  - **Mục đích**: Đảm bảo tất cả các trang, tab báo cáo, Leaderboard và API xuất file nhận kết quả tính toán đồng bộ 100% từng đồng từ một Nguồn dữ liệu chuẩn duy nhất (Single Source of Truth).

### 12. CC Bonus DB Synchronization & Order Regeneration Alignment Rule
- **Primary Data Source**: Khi báo cáo thưởng CC (CC Leaderboard, CC Xoay, CC Thu nhập), luôn query số tiền thưởng thực tế `SUM(CASE WHEN sb.bonus_type = 'Cash' THEN sb.bonus_amount ELSE 0 END)` trực tiếp từ bảng `staff_bonus` trong legacy DB. Đây là dữ liệu đã được làm sạch và chốt kế toán bởi script `OrderRegenerationService.php` (`regenerate-order-batch.php`).
- **Quy tắc Reset Level Đầu Tháng**: Điểm tích lũy để tính Level CC reset về 0 vào ngày 1 hàng tháng (`date_created >= YYYY-MM-01 00:00:00`). Level CC được đếm lũy tiến trong tháng: $\text{Level} = \lfloor \text{monthly\_pts} / 100 \rfloor + 1$.
- **Cơ chế Tự động Dự phòng (Formula Fallback)**: Giữ hàm tính toán `calculateCcBonus(level, isSplit)` tại `CcKpiService` để tự động kích hoạt tính thưởng bù nếu cơ sở dữ liệu bị thiếu dòng thưởng `Cash` cho ca làm việc hợp lệ.

### 13. FAL (Fix, Adjust, Log) Rules & Midnight Order Regeneration Invariant
- **FAL (Fix / Adjust / Log) Definition & SQL Extraction**:
  - Dịch vụ **Fix** / **Adjust** $\le 25$ phút được thưởng điểm Banana. KTV làm sai bộ mi trước đó bị phạt trừ thưởng (`_punishBonus`). Dịch vụ **Log** luôn được tính điểm Banana.
  - Tất cả các API báo cáo ca làm (KTV Xoay và CC Xoay) bắt buộc phải bóc tách cột `falRule` (`Fix`, `Adjust`, `Log`) thông qua các trường `next_fix_order_service_id`, `next_adjust_order_service_id`, `service_type` và `tracking_key`.
- **Lịch Cronjob Nửa đêm (02:00 AM ICT)**:
  - Do 81,4% lỗi lạm phát Level phát sinh trong khung giờ chốt đơn tối (21h-23h), script `regenerate-order-batch.php` trên Prod bắt buộc chạy vào **02:00 AM, 02:10 AM, 02:20 AM (Giờ Việt Nam - Asia/Ho_Chi_Minh)** cho 3 ngày gần nhất (`1 day ago`, `2 days ago`, `3 days ago`) để chốt sổ sạch sẽ.

### 14. End-of-Month (EOM) Run-rate Forecast & Shift Tracking Rules
- **Operational Shift Window (09:00 - 21:00 + 2h Buffer)**:
  - Khung giờ hoạt động đón khách thực tế là **09:00 AM – 21:00 PM** (12 tiếng).
  - Do khách checkout và thanh toán trễ khoảng **2 tiếng**, khung giờ theo dõi dòng tiền thực tế được delay thành **11:00 AM – 23:00 PM**.
- **Công thức Tiến độ Ngày (Real-time Fraction Today)**:
  $$\text{fractionToday} = \begin{cases} 
  0 & \text{khi giờ } < 11 \\ 
  1 & \text{khi giờ } > 22 \\ 
  \frac{\text{HOUR(NOW())} - 11 + 1}{12} & \text{khi } 11 \le \text{giờ } \le 22 
  \end{cases}$$
- **Công thức Tỷ lệ Trôi qua Tháng (Elapsed Ratio)**:
  $$E = \min\left(1.0, \max\left(0.001, \frac{\text{Số ngày đã qua trước hôm nay} + \text{fractionToday}}{\text{Tổng số ngày trong kỳ}}\right)\right)$$
- **Công thức Số liệu Dự báo Cuối tháng (Projected EOM Metric)**:
  $$\text{Projected Metric} = \frac{\text{Actual Metric}}{E}$$
- **Quy tắc Hiển thị Giao diện (Active Month vs. Past Month)**:
  - **Tháng hiện tại đang chạy ($E < 1.0$)**:
    - Nhãn: `Dự kiến cuối tháng:`
    - Màu sắc: Xanh lá nổi bật (`text-emerald-400`), số tiền tiền tố `~` (ví dụ `~581.117.263 đ`).
    - Tooltip: `Đã trôi qua X% thời gian tháng (Ca 09:00 - 21:00 + 2h buffer checkout)`
  - **Tháng quá khứ đã chốt ($E \ge 1.0$)**:
    - Nhãn: `Thực tế chốt tháng:`
    - Màu sắc: Xám mờ (`text-slate-400`, `opacity-70`), không có dấu `~`.
    - Tooltip: `Dữ liệu tháng đã chốt (100% thời gian)`

### 15. Order Completion & Actual Check-in Recognition Rule (`actual_booking_date_start`)
- **Thời điểm Check-in Thực tế (`actual_booking_date_start`)**: Khi truy vấn ngày/giờ khách hàng thực tế đến làm dịch vụ tại tiệm, **bắt buộc phải lấy từ cột `report_order.actual_booking_date_start`** (thông qua `LEFT JOIN report_order ro ON o.id = ro.order_id`). Chuỗi ưu tiên thời gian: `COALESCE(ro.actual_booking_date_start, o.booking_date_start)` (2 cấp, đồng bộ WingsLashes `StaffBonusLevelState.php`).
- **Doanh thu & Combo bán được**: Tất cả các báo cáo tài chính, doanh số bán Combo (`$ Combo`), bán lẻ (`$ Single`), sản phẩm (`$ Product`), điểm thưởng CC và thu nhập CC **bắt buộc phải tính theo thời điểm check-in/hoàn thành thực tế và trạng thái đơn hàng đã hoàn tất (`order_state = 'Completed'`)**.
- **Tuyệt đối không dùng date_created cho Doanh thu/Combo**: Tuyệt đối không sử dụng ngày tạo đơn (`order.date_created`) để công nhận hay ghi nhận doanh số / combo đã bán cho các báo cáo doanh thu và KPI của CC.
- **Phân biệt rõ với Chỉ số Booker (Rule #10)**: Đếm "Tạo lịch" Booker dùng `date_created` (đo năng suất telesales tạo hẹn), còn "Doanh thu & Combo" dùng `actual_booking_date_start` + `order_state = 'Completed'` (đo thực thu & nghiệm thu dịch vụ tại cửa hàng).
- **Đồng bộ cặp Query Listing & Stats (Dual-Query Alignment)**: Khi chỉnh sửa điều kiện lọc bucket/đơn hàng trong `apps/api/src/modules/customers/routes.ts`, **bắt buộc phải cập nhật đồng thời cả Listing Query (`bStr`) và Stats Query (`bStrStats`)** để đảm bảo số liệu trên bảng và số đếm trên thẻ tab khớp 100%, tránh lỗi syntax hoặc lệch data.

### 16. Eyelash Touch-up Expiration Window Rules (Quy tắc Thời hạn Dặm mi)
- **Dặm mi Khách Lẻ / Không dùng gói**: Thời hạn dặm mi tối đa là **21 ngày** tính từ ngày làm mi gần nhất (`COALESCE(ro.actual_booking_date_start, o.booking_date_start)`). Quá 21 ngày tính là dặm trễ, bắt buộc tư vấn nối mới.
- **Dặm mi Khách Có Mua Gói Combo**: Thời hạn dặm mi tối đa là **25 ngày** tính từ ngày làm mi gần nhất (`COALESCE(ro.actual_booking_date_start, o.booking_date_start)`). Quá 25 ngày tính là dặm trễ, không được áp dụng dặm mi trong gói mà bắt buộc tư vấn làm mới.

### 17. Telesales Leaderboard Productivity & Default Top Booker Selection Invariant
- **Telesales Ranking Metric**: Mọi câu truy vấn API backend (`/api/kpi/leaderboard`) và logic sắp xếp mảng Leaderboard cho Telesales bắt buộc phải xếp theo **năng suất làm việc thực tế (`totalBooked` / `booked` count, hoặc `totalCheckin` / `done` count)**. Tuyệt đối không sắp xếp theo `totalEarnings` (tổng lương cứng và phụ cấp) vì những nhân sự 0 đơn không bị trừ phạt missed call sẽ bị đẩy lên Top #1 (như Đẫm Ti).
- **Default Top Booker Fallback**: Khi mở Popup/Modal Telesales Dashboard mà không có nhân sự được chọn (hoặc nhân sự được chọn không có trong mảng kỳ được lọc), Frontend bắt buộc phải tự động chọn **Top 1 Booker có lượng đơn Booked cao nhất (như Ngọc Điệp)** thay vì chọn phần tử đầu tiên mặc định hay hardcode initials (`'TN'`) dễ gây trùng lặp username.

### 19. Strict CC IN / CC OUT / CV Staff Recognition & Fallback Prohibition Rule
- **Định nghĩa chuẩn**:
  - `CC IN` = Tư vấn viên thực hiện Check-in cho khách tại cửa hàng.
  - `CC OUT` = Tư vấn viên thực hiện Checkout / Thanh toán cho khách.
  - `BK` = Nhân sự Booker / Telesales tạo đơn hẹn.
  - `CV` = Chuyên viên / Kỹ thuật viên làm dịch vụ mi.
- **Quy tắc hiển thị & API**:
  - Đơn hàng chưa Check-in hoặc bị lỡ (`New`, `Pending`, `Missed`, `Cancelled`): `ccInName` và `ccOutName` bắt buộc phải trả về `null` (hiển thị `-` trên UI).
  - Khách hàng không chọn trước KTV chỉ định (`assigned_staff_id = null`): `technicianName` bắt buộc phải trả về `null` (hiển thị `-` trên UI), **tuyệt đối KHÔNG** fallback hiển thị chuỗi mặc định `"Kỹ thuật viên"`.
  - **Cấm giả lập fallback**: Tuyệt đối KHÔNG viết logic fallback gán tên Booker hay KTV làm CC IN/OUT (`rawCheckIn || rawBooker || firstCvStaffId`).

### 20. Staff Dropdown Deduplication & Infinite Scroll Fetch Safety Rule
- **De-duplicate Nhân Sự**: Tất cả các API trả về danh sách nhân viên (`/api/customers/staff`) bắt buộc phải lọc de-duplicate theo `displayName` (trimmed & case-insensitive) trước khi trả về cho Frontend, đảm bảo các ô chọn Select không bao giờ xuất hiện tên trùng lặp.
- **An Toàn Cuộn Trang Infinite Scroll**: Tất cả các hook/component dùng `IntersectionObserver` để cuộn tải thêm dữ liệu bắt buộc phải duy trì cờ `hasMore` (đặt thành `false` khi số item < `pageSize` hoặc đã tải hết `total`) và ref `isFetchingRef` ngăn chặn vòng lặp gọi API vô hạn gây giật lắc giao diện.

### 21. Unified Combo Recognition & Date Range Parsing Invariant (Single Source of Truth)
- **Định nghĩa Đơn Bán Combo Chuẩn (Unified Combo Recognition)**: Một giao dịch được ghi nhận là Bán Combo thành công khi thỏa 3 điều kiện: (1) `order.order_state = 'Completed'`, (2) Tồn tại chi tiết gói combo trong `order_service_combo` (`total_price > 0`, package key không chứa từ khóa loại trừ `%single%`, `%refill%`, `%balance%`) HOẶC trong `order_service` có `user_service_type = 'combo'` hoặc `service_group = 'combo'`, (3) Khách hàng được cập nhật số dư trong `user_service_balance`.
- **Quy tắc Chuẩn hóa Ngày Giờ Truy vấn (Date Range Parsing & Padding Rule)**: Khi nhận chuỗi ngày `dateFrom` và `dateTo` (dạng `YYYY-MM-DD` 10 ký tự), Fastify Backend bắt buộc dùng `parseComboDateBounds` chuẩn hóa `dateFrom` thành `YYYY-MM-DD 00:00:00` và `dateTo` thành `YYYY-MM-DD 23:59:59`. Tuyệt đối **CẤM** dùng `.slice(0, 19)` cắt thô làm rụng đuôi `23:59:59` gây lỗi SQL `<='YYYY-MM-DD 00:00:00'` làm bỏ sót 100% các đơn bán combo trong ngày.
- **Nguồn Dữ Liệu Tập Trung (Single Source of Truth Service)**: Báo cáo CC, New LoCa, Báo cáo Booker và Filter Khách hàng bắt buộc dùng chung `ComboRecognitionService` (`apps/api/src/modules/customers/services/combo-recognition.service.ts`) để đồng bộ 100% số lượng đơn combo và doanh số combo trên toàn hệ thống.
- **Pure Combo & Gift Count Separation**: Tab Gói Combo và Form tạo/sửa Combo chỉ chứa loại gói `service_price_type = 'Combo'` (không dính `Fix`, `Adjust`, `Log`). Phân tách 4 trường count: `normalCount` (mua), `bonusNormalCount` (tặng), `retainCount` (dặm mua), `bonusRetainCount` (dặm tặng). DTO tự động bóc tách tên dạng `X+Y` (`7+3`) cho các gói combo dữ liệu lịch sử.

### 22. Monday-First Weekly Calendar Business Rule (Quy tắc Tuần Bắt Đầu Từ Thứ 2)
- **Mốc Bắt Đầu Tuần**: Tất cả các bộ lọc thời gian theo Tuần (Week Preset) ở Frontend (`dayjs`), Backend API (Fastify) và các báo cáo KPI/Leaderboard bắt buộc phải xác định Tuần bắt đầu từ **Thứ 2 (Monday 00:00:00)** và kết thúc vào **Chủ Nhật (Sunday 23:59:59)**.
- **Frontend Day.js / Moment**: Tuyệt đối không sử dụng `dayjs().startOf('week')` (mặc định coi Chủ Nhật là đầu tuần theo chuẩn US). Bắt buộc phải dùng `dayjs().startOf('isoWeek')` và `dayjs().endOf('isoWeek')` để đảm bảo Thứ 2 là ngày bắt đầu tuần.

### 23. Catalog Product Stock & VND Price Integer Rounding Rule
- **Đơn vị tiền tệ chuẩn (VND)**: Bảng `product_price` và `service_price` lưu trữ giá theo `currency_id = 2` (VND). Khi truy vấn giá sản phẩm/dịch vụ, luôn lọc theo `currency_id = 2`.
- **Làm tròn số nguyên (`Math.round`)**: Do CSDL legacy lưu trữ giá dạng `float` chưa VAT (ví dụ `681818.181818`), tất cả các DTO và ô nhập liệu giá tiền **bắt buộc phải bọc trong `Math.round(price)`** để không bị xuất hiện chuỗi số thập phân rườm rà (như `.18181818`).
- **Tra cứu Tồn kho Sản phẩm (`inventory_warehouse_item`)**: Số lượng tồn kho sẵn bán của sản phẩm được liên kết từ `product.inventory_item_id` đến `inventory_warehouse_item.inventory_item_id`. Số lượng `inStockCount` được đếm từ các dòng có `item_state = 'New'`.

### 24. Controlled & Persistent Table Pagination Rule
- **Cấu hình Table Pagination**: Tất cả các bảng dữ liệu Ant Design `<Table>` khi sử dụng phân trang phải dùng dạng kiểm soát (Controlled State) gồm: `current`, `pageSize`, `onChange`, `showSizeChanger`, `pageSizeOptions: ['10', '20', '50', '100']`, và `showTotal`.
- **Lưu trạng thái (Persistence)**: Lưu `activeTab`, số trang (`page`) và kích thước trang (`pageSize`) vào `localStorage`. Khi người dùng tải lại trang hoặc chuyển đổi giữa các tab, giao diện phải giữ nguyên trang và tab làm việc hiện tại. Khi đổi bộ lọc/tìm kiếm, số trang tự động quay về 1.

### 25. Exclusive Hidden Items Filter Rule
- **Nghiệp vụ công tắc "Chỉ hiện mục đã ẩn"**:
  - **Trạng thái OFF (Mặc định)**: Bảng chỉ hiển thị danh sách các mục đang hoạt động (`!record.isDisabled`).
  - **Trạng thái ON**: Bảng chuyển sang chế độ lọc độc quyền **chỉ hiển thị các mục đã bị vô hiệu hóa/ẩn** (`record.isDisabled`), giúp Admin dễ dàng kiểm tra và bật lại trạng thái hoạt động khi cần.

### 26. Auto-Suggested Combo Price Calculation Rule
- **Công thức Giá Gợi Ý**: Giá trọn gói combo mặc định được tính theo số lượt mua và giá bán lẻ dịch vụ niêm yết: $\text{Suggested Combo Price} = (\text{Retail Price} \times \text{Purchased Count})$.
- **Lượt Tặng 0đ**: Tất cả các lượt tặng (`bonusNormalCount`, `bonusRetainCount`) có giá bằng **0đ** và không được cộng vào giá trọn gói.
- **Tính năng Auto-fill & Override**: Khi Admin chọn Dịch vụ hoặc đổi Số lượt mua trong Form Combo, CRM tự động điền Giá gợi ý vào ô *Giá trọn gói (VNĐ)*. Admin có thể nhập đè nếu gói có ưu đãi đặc biệt.

### 27. Catalog Write Authorization & Language Entry Fallback Rule
- **Phân quyền Backend Middleware (`requireCatalogAdmin`)**: Cho phép `user.role === 'admin'`, `user.username === 'admin'`, hoặc `user.username === 'danhdo@gmail.com'` / `user.email === 'danhdo@gmail.com'` thực hiện các thao tác thêm, sửa, xóa Catalog (`/catalog/*`) trên cả môi trường Local và Production.
- **Truy vấn Ngôn ngữ Dịch vụ (`service_language`)**: Khi cập nhật dịch vụ (`PUT /catalog/services/:id`), tìm kiếm `service_language` theo `service_id` linh hoạt (không gán cứng `language_id = 1`) và tự động tạo `tx.service_language.create` fallback nếu dịch vụ chưa có dòng tên trong CSDL.

### 28. Chạm 24h Yesterday-Only Definition Invariant
- **Quy tắc tính số ngày**: `Chạm 24h` (`key: 'now'`) trong chiến dịch LoCa được định nghĩa nghiêm ngặt là **chỉ lọc khách hàng ghé tiệm làm mi vào HÔM QUA** (`daysMin: 1, daysMax: 1`, `DATEDIFF(NOW(), last_visit) = 1`).
- **Loại trừ hôm nay**: Tuyệt đối **loại trừ** khách hàng ghé tiệm trong ngày hôm nay (`0 ngày`).

### 29. Booker Selector Option Label & Value Invariant
- **Chuẩn nhãn hiển thị**: Tất cả các ô chọn Select Booker / Telesales trên các trang chiến dịch (LoCa, NYC) bắt buộc phải sử dụng option value `'ALL'` và nhãn hiển thị **`All Bookers`** (thay vì `'all'`, raw `'ALL'`, hoặc `'Tất cả nhân sự'`).

### 30. Synchronized Minimalist Square Button Toolbar Styling
- **Kiểu dáng nút Icon**: Các icon bộ lọc dạng nút bấm đơn lẻ đặt cạnh ô tìm kiếm trên thanh toolbar (ví dụ: Bộ lọc trạng thái đặt lịch `Tất cả`, `Đã book`, `Chưa book`) bắt buộc phải được thiết kế dạng khối vuông `32x32px` (`w-8 h-8 rounded-lg`) đồng bộ hoàn toàn với kích thước, chiều cao (`h-8`), bo góc (`rounded-lg`) và viền của nút Cấu hình (Gear button).

### 31. Staff Fixed Weekly Off Single Source of Truth Rule (`staff_day_off_schedule`)
- **Nguồn Dữ Liệu Chuẩn (Source of Truth)**: Ngày OFF tuần cố định của tất cả các nhân sự (CV/Technician, CC/Client Consultant, BK/Booker/Telesales) **bắt buộc phải truy vấn từ bảng master `staff_day_off_schedule`** trong CSDL legacy `management` (với điều kiện `is_disabled = 0 AND user_id IS NOT NULL`).
- **Giá trị đại diện**: Cột `weekday` (`1` = Thứ 2, `2` = Thứ 3, ..., `7` = Chủ Nhật).
- **Thứ tự ưu tiên (Precedence Order)**:
  1. Ưu tiên hàng đầu: Lấy từ `staff_day_off_schedule` (`is_disabled = 0`).
  2. Dự phòng (Fallback): Chỉ khi nhân sự không có dòng cấu hình trong `staff_day_off_schedule` mới dùng số liệu đếm từ `staff_day_off` (lọc 90 ngày gần nhất) hoặc lịch ca làm `staff_working_shift_schedule`.
- **Phân biệt với Ngày Nghỉ Phép**: Bảng `staff_day_off` đại diện cho các phiếu/ticket xin nghỉ phép ngày cụ thể (`approvedOffDates`), không được dùng làm căn cứ chính để xác định lịch off tuần cố định.

### 32. System-wide Tone-Insensitive Vietnamese Search Invariant (Quy tắc Tìm kiếm Tiếng Việt Không Dấu)
- **Mọi ô tìm kiếm trên toàn bộ hệ thống** (bao gồm `<Select showSearch>`, bộ lọc `<Table>`, ô tìm kiếm Khách hàng, Nhân sự HR, Booker, Catalog, Dịch vụ):
  - **Bắt buộc hỗ trợ Tìm kiếm tiếng Việt không dấu** (Tone-insensitive & Case-insensitive matching).
  - **Hàm Chuẩn hóa (Normalize Helper)**: Luôn loại bỏ dấu tiếng Việt khi so sánh chuỗi:
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
  - **Cấu hình Antd Select**: Đối với thành phần `<Select showSearch>`, truyền hàm `filterOption` chuẩn hóa không dấu:
    ```typescript
    filterOption={(input, option) =>
      removeVietnameseTones(String(option?.label || '')).includes(removeVietnameseTones(input))
    }
    ```

### 33. Custom Hook Dependency Stability & Infinite Loop Prevention Rule
- **Tuyệt đối KHÔNG truyền object hook rác/tổng thể vào dependency array**: Khi gọi `useCallback` hoặc `useEffect`, không truyền nguyên object trả về từ custom hook (ví dụ `filtersHook`) vào mảng dependency `[currentUser, filtersHook]`. Do object này bị khởi tạo lại ở mỗi lượt render, việc này sẽ gây ra vòng lặp re-render vô tận và nút bấm bị treo trạng thái `loading` liên tục.
- **Bóc tách primitive value**: Bắt buộc bóc tách các biến primitive/nguyên thủy (như `const activeTab = filtersHook.activeTab; const selectedBatchId = filtersHook.selectedBatchId;`) trước khi đưa vào dependency array.

### 34. UI Tab vs. Database Bucket Query Alignment Rule
- **Phân biệt Tab Giao diện (UI Tab) & Bucket CSDL (Database Bucket)**: Các Tab giao diện như `'ALLOCATION'` (Đợt phân bổ) chỉ đại diện cho chế độ hiển thị trên Frontend, không phải là phân loại bucket dữ liệu trong CSDL (như `COMBO_LIVE`, `NOT_COMBO_LIVE`, `SINGLE`).
- **Bảo đảm truyền đúng parameter trong `useCustomerList.ts`**: Khi chuyển đổi `filterParams` sang tham số gọi API (`apiClient.customers.list` và `getStats`), tuyệt đối **KHÔNG** gán `params.bucket = 'ALLOCATION'`. Thay vào đó, kiểm tra `filterParams.activeTab !== 'ALL' && filterParams.activeTab !== 'ALLOCATION'` và bắt buộc gắn trực tiếp `params.allocationBatchId = filterParams.allocationBatchId` để Fastify Backend nhận diện và lọc chính xác 100% danh sách khách hàng trong đợt.

### 35. Booker Allocation Batch Workflow & Productivity Invariants (Quy tắc Nghiệp vụ Đợt phân bổ Booker)
- **Tự động chọn đợt mới nhất (Auto-Select Latest Batch)**: Khi Booker mở trang Danh sách Khách hàng (`/dashboard/customers?assignedStaffId=me`) và chuyển sang Tab `⚡ Đợt phân bổ`, hệ thống bắt buộc tự động chọn đợt phân bổ mới nhất (hoặc đợt trong ngày) để Booker có thể bắt đầu làm việc ngay mà không cần thao tác chọn thủ công.
- **Tiến độ làm việc real-time (Real-time Call Progress Tracking)**:
  - Tiến độ đợt phân bổ được tính theo công thức: $\text{Tỷ lệ \% hoàn thành} = \frac{\text{Số KH đã có tương tác/cuộc gọi}}{\text{Tổng số KH trong đợt}} \times 100\%$.
  - Hiển thị rõ ràng: `Đã gọi: X KH | Còn lại: Y KH (Tổng Z KH)`. Cuộc gọi được tính cho các KH có log phát sinh từ thời điểm đợt được tiếp nhận (`acceptedAt`/`createdAt`).
- **Lưu trạng thái trên URL (F5 Persistence Invariant)**: Trạng thái Tab làm việc và đợt phân bổ phải được đồng bộ 1:1 lên thanh địa chỉ URL dưới dạng `?tab=ALLOCATION&batchId=<ID>&assignedStaffId=me` bằng `window.history.replaceState`. Khi Booker nhấn F5 tải lại trang, giao diện phải khôi phục 100% chính xác đợt phân bổ đang làm việc.
- **Hiển thị nhãn trạng thái cuộc gọi (Call Outcome Badging)**: Mỗi dòng khách hàng trong danh sách đợt phân bổ bắt buộc hiển thị nhãn trạng thái cuộc gọi gần nhất (`Chưa gọi`, `Đã nghe máy`, `Không nhấc máy` / `Máy bận`, `Hẹn gọi lại`) và cung cấp nút 1-click gọi nhanh OmiCall.

### 36. LoCa Campaign Customer Care Touchpoint Schedule Rules (Quy tắc Mốc Chạm CSKH LoCa)
- **Mục tiêu chiến dịch LoCa**: Chăm sóc đặc biệt dành cho khách hàng đã mua Combo Live để hỗ trợ họ sử dụng hết các lượt nối/dặm trong gói và tái sử dụng dịch vụ tại salon.
- **Quy tắc 8 Mốc Chạm CSKH chuẩn**:
  1. `Chạm 24h`: Đảm bảo khách hàng hài lòng 100% với bộ mi sau lần làm dịch vụ gần nhất.
  2. `Chạm 17n`: Nhắc lịch dặm mi cho khách hàng (thời hạn dặm mi tối ưu là trong 21 ngày).
  3. `Chạm 19n`: Nếu đến ngày 17 khách vẫn chưa đặt lịch dặm, chạm lần 2 để hỗ trợ đặt lịch trong chu kỳ 21 ngày.
  4. `Chạm 21n`: Ngày cuối cùng để đặt lịch dặm 21 ngày (đối với khách lẻ, đây là ngày cuối cùng nhận giá dặm ưu đãi).
  5. `Chạm 23n`: Khách hàng mua combo có tới 25 ngày để dặm mi và được trừ lượt dặm mi trong gói.
  6. `Chạm 25n`: Ngày cuối cùng cho khách combo sử dụng lượt dặm mi đã mua trong gói.
  7. `Chạm 30n`: Đã trễ 5 ngày so với hạn dặm 25 ngày, bắt buộc sử dụng lượt nối mi mới trong gói combo.
  8. `Chạm 30n+`: Hỗ trợ khách hàng dùng hết các lượt nối mới còn lại trong gói trước khi HSD gói hết hạn.
- **Tương tác 1-Click & Popover Ghi Chú (`LocaTouchpointCell.tsx`)**: Bấm vào ô Chạm tự động đánh dấu cờ và mở ngay `<Popover>` điền phản hồi của khách, thiết kế dạng nút High-Contrast (Vàng Gold `#D4A84B`, Emerald `#059669`, Red dashed `#EF4444`).

### 37. Table Explicit Width & Responsive Tablet Layout Rules (Quy tắc Độ rộng Cột Bảng & Hiển thị trên iPad/Tablet)
- **Bắt buộc khai báo numeric `width` cho 100% các cột**: Tất cả các định nghĩa cột trong `<Table>` Ant Design (đặc biệt khi sử dụng `scroll={{ x: 'max-content' }}`) bắt buộc phải có thuộc tính `width` số cụ thể (ví dụ: `width: 95` đến `width: 170`). Tuyệt đối không để `width: undefined`.
- **Ngăn ngừa co chữ theo chiều dọc (`white-space: nowrap`)**: Tất cả các cell hiển thị văn bản, số tiền VND, số điện thoại, ngày giờ hoặc nhãn trạng thái bắt buộc sử dụng `white-space: nowrap` để tránh hiện tượng rớt dòng từng ký tự theo chiều dọc (`3 \n . \n 6 \n 6...`) trên các thiết bị iPad/Tablet (màn hình 1024px – 1366px).
- **Cơ chế Dự phòng trong `useTableConfig.ts`**: Hook quản lý cấu hình bảng phải bọc `effectiveWidth` (`width >= 40 ? config.width : staticCol.width || 120`) để tự động khắc phục các dữ liệu cấu hình lưu trong CSDL bị thiếu `width`.

### 38. Allocation Batch Query Intersecting Rule (Quy tắc Giao Tập Khách Hàng Đợt Phân Bổ)
- **Đồng bộ Listing & Stats Query (`bStr` & `bStrStats`)**: Khi nhận `allocationBatchId`, Fastify Backend API (`GET /api/customers` và `/stats`) bắt buộc truy vấn danh sách `customerId` từ `crmAllocationBatchItem` (`where: { batchId }`) và thực hiện giao tập (Intersect) với `allowedUserIds` bằng `Set` (`bSet.has(id)`). Tuyệt đối không thay thế hay ghi đè hoàn toàn danh sách phân quyền `allowedUserIds` của Booker.
