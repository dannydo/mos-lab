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
  - `fastify.prisma.legacy`: Database `management` for Legacy CRM data (**READ-ONLY**).

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



