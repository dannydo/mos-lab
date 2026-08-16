# mos-lab Responsive Implementation Plan 2026

> **Mục tiêu:** Thiết kế lại frontend `mos-lab` để phục vụ internal staff tốt trên iPhone 12, iPad, desktop, FHD và 4K.
>
> **Trạng thái:** Phase 0–8 complete. Phase 9 cần canary nội bộ và product-owner acceptance trước rollout rộng.
>
> **Cập nhật lần cuối:** 2026-08-14.
>
> **Nguồn theo dõi chính:** File này. Khi một task vượt qua toàn bộ Definition of Done, đổi `[ ]` thành `[x]`.

## 1. Cách sử dụng tasklist

- `[ ]`: Chưa hoàn thành.
- `[x]`: Đã implement, verify và có evidence.
- Chỉ tick task cha khi tất cả subtask và acceptance criteria của task đó đã đạt.
- Mỗi lần làm chỉ mở một task ID chính; tránh rollout nhiều module trước khi foundation/pilot qua gate.
- Sau mỗi task, cập nhật checkbox trong file này và ghi ngắn gọn evidence vào mục `Execution log` cuối file.

## 2. Product contract đã chốt

### 2.1 Viewport hỗ trợ

| Nhóm                 |     Viewport chuẩn | Vai trò                                        |
| -------------------- | -----------------: | ---------------------------------------------- |
| Mobile minimum       |        `390 × 844` | iPhone 12 portrait — minimum chính thức        |
| Mobile landscape     |        `844 × 390` | iPhone 12 landscape                            |
| Mobile lớn           |        `430 × 932` | Điện thoại màn hình lớn                        |
| iPad portrait        |       `768 × 1024` | Tablet dọc                                     |
| iPad landscape       |       `1024 × 768` | Tablet ngang                                   |
| Laptop               |       `1366 × 768` | Laptop phổ biến                                |
| Desktop              |       `1440 × 900` | Desktop chuẩn                                  |
| FHD                  |      `1920 × 1080` | Màn hình vận hành chính                        |
| QHD                  |      `2560 × 1440` | Màn hình mật độ thông tin cao                  |
| 4K                   |      `3840 × 2160` | Màn hình điều hành cực rộng                    |
| Accessibility stress | `320px` equivalent | WCAG Reflow; không phải product viewport chính |

### 2.2 Information density

- **Mobile:** Chỉ giữ dữ liệu định danh, trạng thái, insight chính và primary action. Secondary action đi vào menu/drawer.
- **iPad:** Hiện thêm filter, summary và một phần cột nghiệp vụ; hỗ trợ touch đầy đủ.
- **Laptop/Desktop:** Table và workflow đầy đủ; ưu tiên tốc độ thao tác bằng bàn phím/chuột.
- **FHD/QHD/4K:** Tăng lượng thông tin hữu ích bằng cột phụ, panel, comparison và split view; không chỉ kéo giãn khoảng trắng.
- Không làm một DOM quá nặng rồi chỉ dùng CSS để ẩn hàng loạt dữ liệu trên mobile. Với data view phức tạp, dùng renderer phù hợp theo tier.

### 2.3 Quy tắc kiến trúc

- `@mos-lab/shared` là source of truth cho responsive/density/theme tokens.
- Ưu tiên CSS media queries và container queries; chỉ dùng JavaScript khi hành vi component thực sự khác nhau.
- Không đọc `window.innerWidth` trực tiếp trong feature component.
- Không tạo design system thứ hai. Nâng cấp các primitives hiện có trong `apps/web/components/ui`.
- Ant Design xử lý component có state phức tạp; Tailwind/CSS variables xử lý layout và responsive composition.
- Mọi thay đổi phải hoạt động ở cả `.light-theme` và `.dark-theme`.
- Số tiền, thời gian, duration và live counter dùng tabular numbers.
- Page không được có horizontal scroll. Table/diagram có thể scroll trong container có chủ đích.

## 3. Global Definition of Done

Một task UI chỉ được tick Done khi đáp ứng toàn bộ điều kiện liên quan:

- [ ] TypeScript/build không phát sinh lỗi mới.
- [ ] Unit/component test liên quan đã pass.
- [ ] Functional flow chính đã được chạy bằng browser automation.
- [ ] Đã kiểm tra tối thiểu tại `390×844`, `768×1024`, `1024×768`, `1440×900`, `1920×1080`, `3840×2160`.
- [ ] Đã kiểm tra iPhone 12 landscape nếu màn hình có toolbar, table hoặc form nhiều cột.
- [ ] Light và dark theme đều đọc được, không có màu hardcode sai theme.
- [ ] Không có page-level horizontal scroll, clipping, overlap hoặc action bị che.
- [ ] Mobile không yêu cầu hover; primary action có touch target tối thiểu `44×44px`.
- [ ] Keyboard focus rõ ràng; modal/drawer giữ focus đúng; Escape đóng đúng nơi.
- [ ] Loading, empty, error, disabled và permission state không vỡ layout.
- [ ] Screenshot evidence/baseline đã được cập nhật.
- [ ] Không thay đổi business logic hoặc số liệu ngoài scope responsive.

---

# Phase 0 — Audit, scope và baseline

**Gate:** Có inventory, viewport contract, công cụ QA và baseline trước khi refactor.

- [x] **RSP-001 — Audit frontend architecture**
  - Đã xác định Next.js 16, React 19, Ant Design 5, Tailwind CSS 4.
  - Đã rà App Shell, global CSS, theme context và shared UI primitives.

- [x] **RSP-002 — Inventory route và component**
  - Đã xác định 26 dashboard route chính.
  - Đã xác định khoảng 93.000 dòng TSX trong dashboard/components.
  - Đã ghi nhận các page lớn và shared overlays có blast radius cao.

- [x] **RSP-003 — Audit responsive debt**
  - `globals.css` khoảng 1.346 dòng nhưng chưa có responsive media-query architecture tập trung.
  - Nhiều table dùng fixed width/`scroll.x`; nhiều modal/drawer có width cố định.
  - Responsive JS còn phân tán qua `window.innerWidth`; chưa dùng breakpoint hook thống nhất.

- [x] **RSP-004 — Chốt device matrix**
  - Minimum chính thức là iPhone 12 `390×844`.
  - `320px` chỉ là WCAG Reflow stress test.

- [x] **RSP-005 — Chốt chiến lược rollout**
  - Foundation → Customers pilot → shared flows → module archetypes → hardening → release.

- [x] **RSP-006 — Cài và cấu hình `playwright-interactive`**
  - Cấu hình persistent browser workflow.
  - Tạo reusable device presets theo bảng viewport.
  - Xác nhận screenshot output không chứa dữ liệu nhạy cảm.
  - **Depends on:** RSP-004.

- [x] **RSP-007 — Tạo baseline screenshot**
  - Chụp light/dark cho các route đại diện: dashboard, customers, appointments, today, schedule-calendar, catalog, qa-shop.
  - Chụp các state: default, filter mở, row detail, modal/drawer, empty/loading nếu có thể tái tạo.
  - Lưu index gồm route, viewport, theme và timestamp.
  - **Depends on:** RSP-006.

- [x] **RSP-008 — Lập responsive defect register**
  - Gắn lỗi với route/component, viewport, severity và screenshot.
  - Phân nhóm: App Shell, overflow, density, navigation, table, form, overlay, chart, touch/accessibility.
  - Chốt P0/P1 defects cần xử lý trong foundation/pilot.
  - **Depends on:** RSP-007.

### Phase 0 exit criteria

- [x] Baseline xem được trên toàn bộ viewport chính.
- [x] Mỗi lỗi P0/P1 có owner task ID ở phase sau.
- [x] Browser QA workflow chạy lặp lại được.

---

# Phase 0.1 — Safari/WebKit và QA signal hardening

**Gate:** Baseline mobile/tablet chạy trên WebKit, không bị nhiễu bởi avatar/CDN ngoài, và mỗi P0 có ownership theo đúng lớp nguyên nhân.

- [x] **RSP-009 — Thêm Safari/WebKit mobile/tablet smoke**
  - Cài Playwright WebKit và mở rộng runner chọn được `chromium` hoặc `webkit`.
  - Chạy light/dark cho Customers, Today và Schedule Calendar tại iPhone 12/iPad portrait/landscape.
  - Chạy Customer interaction states trên WebKit.
  - **Evidence:** 24/24 default smoke và 30/30 interaction-state capture thành công, không có WebKit-only error.

- [x] **RSP-010 — Làm sạch network signal của responsive QA**
  - Stub image asset đã biết từ Google avatar và WingsLashes CDN/uploads bằng ảnh placeholder trong QA context.
  - Manifest phân loại local, known third-party và unexpected external failure.
  - **Evidence:** Chromium 98/98 default, Chromium 30/30 interaction, WebKit 24/24 default và WebKit 30/30 interaction đều có `0` failed request.

- [x] **RSP-011 — Tách ownership P0 giữa foundation và module**
  - `RSP-108` chịu trách nhiệm loại bỏ chiều rộng/overlay toàn cục do App Shell gây ra: sidebar mobile, gutter, header và OmiCall không được làm rộng document hoặc che primary action.
  - `RSP-502`/`RSP-508` chịu trách nhiệm thay surface Today khoảng `1300px` bằng decision-summary và visual composition theo tier.
  - RSP-502 không được dựa vào horizontal page scroll; RSP-108 không được coi route-specific card/chart reflow là scope của shell.

### Phase 0.1 exit criteria

- [x] WebKit smoke cho iPhone/iPad có evidence và không có engine-only failure.
- [x] QA runner không còn expected third-party failure che khuất signal thật.
- [x] RD-005 có owner foundation và owner module rõ ràng.

---

# Phase 1 — Responsive foundation và App Shell

**Gate:** Một responsive contract và một bộ primitives duy nhất dùng được trên toàn repo.

- [x] **RSP-101 — Refactor responsive tokens trong `@mos-lab/shared`**
  - Tách rõ CSS behavior breakpoints khỏi QA viewport presets.
  - Bổ sung tier: mobile, tablet, desktop, FHD, wide/QHD, UHD/4K.
  - Bổ sung layout tokens: page gutter, section gap, header height, nav width, content max behavior.
  - Bổ sung touch target, safe area và density mapping.
  - Giữ type-safe exports cho web app.
  - **Files:** `packages/shared/src/theme/tokens.ts` và exports liên quan.
  - **Depends on:** RSP-008.

- [x] **RSP-102 — Tạo responsive CSS architecture**
  - Tạo CSS variables theo tier cho gutter, gap, radius, control height và content padding.
  - Thêm media queries tập trung và container-query primitives.
  - Hỗ trợ `100dvh`, `env(safe-area-inset-*)`, `prefers-reduced-motion`, `hover` và `pointer` capability.
  - Giữ override Ant Design phân vùng light/dark.
  - Không thêm CSS page-specific vào foundation.
  - **Files:** `apps/web/app/globals.css` và shared styles nếu thật sự cần.
  - **Depends on:** RSP-101.

- [x] **RSP-103 — Tạo responsive runtime API thống nhất**
  - Tạo `useResponsiveTier`/`useMediaQuery` có SSR-safe hydration.
  - Tạo `ResponsiveProvider` chỉ nếu nhiều component cần cùng snapshot.
  - Cấm feature component tự gắn resize listener.
  - Thêm unit test cho boundaries và cleanup.
  - **Depends on:** RSP-101.

- [x] **RSP-104 — Nâng cấp Page primitives**
  - `PageHeader`: title/subtitle/action priority và mobile stacking.
  - `PageToolbar`: primary/secondary/overflow actions, compact mobile composition.
  - `ContentSurface`/`SectionCard`: responsive padding và full-bleed option.
  - `StatCard`: responsive grid, number wrapping và compact state.
  - `DensityContainer`: tự map density theo tier nhưng cho phép override có chủ đích.
  - **Files:** `apps/web/components/ui/*`.
  - **Depends on:** RSP-102, RSP-103.

- [x] **RSP-105 — Xây Adaptive Data View**
  - Nâng `DataTable` thành shell có column priority và controlled horizontal region.
  - Tạo `MobileRecordList`/`MobileRecordCard` cho dữ liệu cần interaction tốt trên mobile.
  - Hỗ trợ sticky primary column/action trên desktop khi cần.
  - Chuẩn hóa pagination, loading, empty, error và selected-row state.
  - Không duplicate business mapping giữa table và card renderer.
  - **Depends on:** RSP-104.

- [x] **RSP-106 — Xây Adaptive Overlay**
  - Chuẩn hóa modal/drawer width bằng viewport và content intent.
  - Mobile: full-screen modal/drawer hoặc bottom sheet tùy workflow.
  - Desktop/FHD: modal giới hạn readable width; detail workflow hỗ trợ split view khi hữu ích.
  - Chuẩn hóa footer action, sticky footer, safe-area và keyboard behavior.
  - **Depends on:** RSP-102, RSP-103.

- [x] **RSP-107 — Xây Responsive Form Grid**
  - Mobile một cột; iPad 1–2 cột; desktop 2–4 cột theo field intent.
  - Field quan trọng/textarea được phép span toàn chiều rộng.
  - Chuẩn hóa label wrapping, validation message và sticky submit actions.
  - **Depends on:** RSP-104, RSP-106.

- [x] **RSP-108 — Refactor Dashboard App Shell**
  - Mobile: sidebar thành navigation drawer; không chiếm rail 48px cố định.
  - iPad: navigation collapsible/overlay phù hợp portrait và landscape.
  - Desktop/FHD/4K: sidebar persistent, collapse state được lưu.
  - Header phân priority; action phụ đi vào overflow trên mobile.
  - Content margin/padding thay đổi bằng tokens, không fixed `24px` toàn hệ thống.
  - Đảm bảo OmiCall/global overlays không che navigation hoặc primary action.
  - Là owner foundation cho RD-005: shell, navigation, gutter, header và global overlay không được tạo thêm page-level width/overflow; Today-specific reflow vẫn do RSP-502/RSP-508.
  - **Files:** `apps/web/app/dashboard/layout.tsx`, `components/layout/*`.
  - **Depends on:** RSP-102, RSP-103, RSP-104, RSP-106.

- [x] **RSP-109 — Cập nhật Design System page**
  - Playground cho từng viewport preset và density tier.
  - Demo App Shell, toolbar, data view, form và overlay mới.
  - Hiện trạng thái Verified/Needs improvement theo test thực tế, không tự khai báo.
  - **Route:** `/dashboard/design-system`.
  - **Depends on:** RSP-104–RSP-108.

- [x] **RSP-110 — Foundation tests và visual gate**
  - Unit test tokens, responsive hook và primitives.
  - Component test cho resize/tier transition.
  - Visual test light/dark tại viewport matrix.
  - Không có hydration mismatch hoặc duplicate resize listener.
  - **Depends on:** RSP-109.

### Phase 1 exit criteria

- [x] App Shell hoạt động từ iPhone 12 đến 4K.
- [x] Shared primitives có demo và test.
- [x] Không feature nào cần tự phát minh breakpoint mới để bắt đầu pilot.

---

# Phase 2 — Pilot vertical slice: Customers

**Route pilot:** `/dashboard/customers`.

**Lý do chọn:** Bao phủ filter phức tạp, stat/bucket, table nhiều cột, selection, bulk actions, detail drawer và nhiều workflow dùng chung.

### Customers information-priority contract đã chốt

| Tier                            | Dữ liệu và thao tác được ưu tiên                                                                                                                                                                                                               |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile, gồm iPhone 12 landscape | Identity (tên, SĐT, bucket), trạng thái vận hành (chưa tới/booked/missed), kết quả gọi gần nhất, Booker phụ trách, chi tiêu khi có giá trị, và các action Gọi / Hồ sơ / Lên lịch gọi. Manager/Admin có checkbox để chọn và thanh bulk compact. |
| iPad portrait / landscape       | Compact table: Khách hàng, trạng thái vận hành, tổng chi, Booker, ngày gọi gần nhất, trạng thái cuộc gọi và thao tác. Cột tertiary được ẩn.                                                                                                    |
| Desktop / FHD / 4K              | Dense operational table giữ đầy đủ 11 cột, gồm STT, thời lượng, ghi chú gọi và ngày phân bổ. 4K tăng chiều cao vùng dữ liệu thay vì chỉ kéo giãn whitespace.                                                                                   |
| Detail và overlays              | Detail/history, advanced filters, cấu hình và destructive flows nằm trong adaptive overlay; mobile mở full-screen để giữ focus workflow.                                                                                                       |

- [x] **RSP-201 — Information-priority map cho Customers**
  - Đánh dấu từng field/action là Primary, Secondary hoặc Tertiary.
  - Chốt dữ liệu mobile card, iPad columns, desktop columns và FHD/4K extensions.
  - Chốt primary action theo role: Booker ưu tiên Gọi/Hồ sơ; Manager/Admin có thêm selection và phân bổ.
  - **Depends on:** Phase 1 complete.

- [x] **RSP-202 — Migrate Customers page shell**
  - Dùng PageHeader, PageToolbar và responsive content surface mới.
  - Loại bỏ page-level fixed spacing/width.
  - Preserve active tab/filter/page state.
  - **Depends on:** RSP-201.

- [x] **RSP-203 — Refactor Customer filters**
  - Mobile: search luôn thấy; advanced filters mở bằng drawer/bottom sheet.
  - iPad: filter chính inline, phần nâng cao collapse.
  - FHD/4K: tăng số filter inline nhưng không làm toolbar khó quét.
  - Active filter tags wrap/scroll có kiểm soát.
  - Giữ Vietnamese tone-insensitive search.
  - **Depends on:** RSP-202.

- [x] **RSP-204 — Responsive Customer data view**
  - Mobile: record cards với identity, trạng thái, insight chính và primary action.
  - iPad portrait: card/compact table theo usability test.
  - iPad landscape/Desktop: table với column priority.
  - FHD/4K: hiện thêm cột phụ có giá trị vận hành.
  - Pagination/selection/table configuration không mất state.
  - **Depends on:** RSP-203.

- [x] **RSP-205 — Responsive bulk actions**
  - Mobile dùng sticky selection bar hoặc bottom action bar.
  - Không che row/card cuối; hỗ trợ safe-area.
  - Destructive action có confirmation rõ ràng.
  - **Depends on:** RSP-204.

- [x] **RSP-206 — Responsive Customer Detail**
  - Mobile full-screen detail với section navigation.
  - iPad dùng wide drawer hoặc full-screen theo orientation.
  - FHD/4K dùng wide detail drawer (tối đa 1280px) để vẫn giữ dense table context; split view được để lại khi đo workflow chứng minh cần thiết.
  - Tabs, history và action footer không overflow.
  - **Depends on:** RSP-204, RSP-106.

- [x] **RSP-207 — Migrate Customer-related overlays**
  - Random selector, assignment history, allocation, revoke/undo và add-to-campaign flows.
  - Form/action footer tuân thủ Adaptive Overlay và Form Grid.
  - **Depends on:** RSP-206.

- [x] **RSP-208 — Customers pilot verification**
  - Functional regression cho search, filter, pagination, selection, assign, undo và detail.
  - Visual matrix đầy đủ light/dark.
  - Accessibility scan + keyboard/touch pass.
  - So sánh số liệu/API trước và sau để bảo đảm không đổi business logic.
  - **Depends on:** RSP-207.

### Phase 2 exit criteria

- [x] Customers pass các điều kiện Global Definition of Done áp dụng cho pilot.
- [x] Mobile information priority đã chốt theo product direction: internal staff, desktop/FHD/4K ưu tiên information density; mobile/iPad chỉ giữ workflow chính.
- [x] Pattern table/card/filter/detail đủ ổn định để rollout.

---

# Phase 3 — Shared workflow và overlays

**Gate:** Các flow dùng trên nhiều route phải responsive trước khi migrate hàng loạt page.

- [x] **RSP-301 — Booking Wizard responsive**
  - Mobile step flow, keyboard-safe fields, slot grid scroll có chủ đích.
  - iPad/Desktop tối ưu multi-column và review summary.
  - Sticky footer không che nội dung.
  - **Component:** `BookingWizardDrawer.tsx` và `components/booking/*`.

- [x] **RSP-302 — Update/Reschedule/Cancel booking responsive**
  - Chuẩn hóa `UpdateBookingModal`, `RescheduleBookingModal`, cancel flow và audit drawer.
  - Date/time/technician selector usable bằng touch.
  - **Depends on:** RSP-301.

- [x] **RSP-303 — Calls workflow responsive**
  - `DailyCallsDrawer`, `DailyCallsTable`, `CallLogModal`.
  - Mobile ưu tiên call action, result và note.
  - Desktop giữ dense call history.

- [x] **RSP-304 — Telesales Dashboard responsive**
  - Modal chuyển thành adaptive full-screen/split layout.
  - Leaderboard, staff selector và metric cards đổi density theo tier.
  - Không đổi ranking/business calculations.

- [x] **RSP-305 — Global utility overlays responsive**
  - Table Config, Icon Picker, notification/confirmation và allocation overlays.
  - Chuẩn hóa popup container và z-index trong Modal/Drawer.

- [x] **RSP-306 — Shared workflow verification**
  - Chạy các flow từ ít nhất hai route tiêu thụ khác nhau.
  - Kiểm tra orientation change, focus restoration và unsaved form state.

---

# Phase 4 — Operational lists và campaign workspaces

Mỗi task route dưới đây phải dùng patterns đã duyệt từ Customers pilot; không tạo component responsive riêng nếu shared primitive đáp ứng được.

- [x] **RSP-401 — Appointments** — `/dashboard/appointments`
  - Date navigator, summary, status tabs, configurable table/card và booking actions.

- [x] **RSP-402 — Calls** — `/dashboard/calls`
  - Call queue/history, filters, call action và detail flow.

- [x] **RSP-403 — Plans** — `/dashboard/plans`
  - Daily plan cards/table, progress state và quick actions.

- [x] **RSP-404 — Referrals** — `/dashboard/referrals`
  - Referral list, status, actions và detail overlays.

- [x] **RSP-405 — LoCa** — `/dashboard/loca`
  - Touchpoint toolbar, campaign buckets, customer table/card và staff activity.

- [x] **RSP-406 — NYC overview** — `/dashboard/nyc`
  - KPI summary, campaign navigation và work queue.

- [x] **RSP-407 — NYC campaigns list** — `/dashboard/nyc/campaigns`
  - Campaign cards/table, filters và create/edit overlays.

- [x] **RSP-408 — NYC campaign detail** — `/dashboard/nyc/campaigns/[slug]`
  - Large data table/card, touchpoints, bulk actions và 720px overlays.

- [x] **RSP-409 — Operational lists regression gate**
  - Cross-route keyboard/touch, persistence, light/dark và visual matrix.

---

# Phase 5 — Dashboards, KPI và compensation views

**Nguyên tắc:** Mobile hiển thị decision summary; FHD/4K hiển thị comparison và drill-down. Không thay đổi công thức nghiệp vụ.

- [x] **RSP-501 — Main dashboard** — `/dashboard`
  - `/dashboard` là command center thực: snapshot vận hành, doanh thu hoàn tất, lịch mới, khách sẽ đến và năng lực nhân sự.
  - Mobile/iPad chỉ giữ decision summary và action chính; FHD/4K có thêm cơ cấu doanh thu và năng lực từng chi nhánh để so sánh nhanh.
  - Shortcut theo vai trò, drill-down sang Today/Appointment/Schedule/KPI/Staff và route mặc định sau đăng nhập đã được chốt.
  - Dùng lại API read-only Today và Revenue Hourly; không tạo công thức hay business logic mới.

- [x] **RSP-502 — Today operations** — `/dashboard/today`
  - KPI cards, revenue charts, bookings/coming tables, attendance và calendar summary.
  - Thay surface hiện tại rộng khoảng `1300px` bằng composition theo tier: mobile decision summary, iPad responsive grid, desktop/FHD comparison và 4K panels hữu ích.
  - Không dùng page-level horizontal scroll làm phương án giữ nguyên desktop dashboard.
  - **Depends on:** RSP-108.

- [x] **RSP-503 — KPI management** — `/dashboard/kpi`
  - Summary, charts, audit drawers, leaderboard và package audit.

- [x] **RSP-504 — Booker dashboard** — `/dashboard/bk`
  - Leaderboard và Booking/Done/Revenue/Tip/Thu nhập tabs.

- [x] **RSP-505 — CC dashboard** — `/dashboard/cc`
  - Leaderboard và Xoay/Thưởng/Tip/Thu nhập/Game/Diamond tabs.

- [x] **RSP-506 — CV dashboard** — `/dashboard/cv`
  - Leaderboard, speed, Xoay/Tip/Thu nhập tabs.

- [x] **RSP-507 — FAL reporting** — `/dashboard/fal`
  - Dense ledger, rule visibility, filters và Fal Rules modal.

- [x] **RSP-508 — Analytics visualization rules**
  - Chart minimum height, legend collapse, tooltip touch behavior và axis label policy.
  - Mobile không ép desktop chart vào chiều rộng 390px nếu summary phù hợp hơn.
  - FHD/4K hỗ trợ comparison panels có giới hạn độ dài đọc.

- [x] **RSP-509 — Dashboard regression gate**
  - Verify currency rounding, tabular numbers và data equality trước/sau.
  - Visual matrix và drill-down flows pass.

---

# Phase 6 — Calendar và scheduling

- [x] **RSP-601 — Responsive schedule modes** — `/dashboard/schedule-calendar`
  - Mobile mặc định list/day agenda.
  - iPad portrait dùng day/list; landscape dùng multi-day phù hợp.
  - Desktop/FHD dùng full calendar/multi-day.
  - 4K tăng số ngày/column chỉ khi vẫn đọc và thao tác tốt.

- [x] **RSP-602 — Calendar toolbar và date navigation**
  - Primary date/action không biến mất trên mobile.
  - Secondary view options vào overflow/segmented control phù hợp.

- [x] **RSP-603 — CV Schedule Drawer**
  - Mobile full-screen; desktop resizable trong giới hạn viewport.
  - Queue lanes, search, staff cards và time picker dùng được bằng touch.

- [x] **RSP-604 — Calendar performance và interaction QA**
  - Kiểm tra large dataset, scroll, drag/touch nếu có, orientation change và resize.
  - Không tạo layout shift khi load event.

---

# Phase 7 — Admin, specialist và complex workspaces

- [x] **RSP-701 — Catalog** — `/dashboard/catalog`
  - Service/combo/product tables, report header, forms và detail panels.

- [x] **RSP-702 — Staff** — `/dashboard/staff`
  - Staff list/card, filters, forms, history và role/config overlays.

- [x] **RSP-703 — Staff Teams** — `/dashboard/staff/teams`
  - Team hierarchy, assignment controls và horizontal group navigation.

- [x] **RSP-704 — Customer Service workspace** — `/dashboard/cs`
  - Ticket/Campaign/Happy Call/Dashboard/Training tabs và ticket detail drawer.

- [x] **RSP-705 — QA Shop** — `/dashboard/qa-shop`
  - Refactor page lớn thành responsive sections trước khi polish.
  - Audit tables, report tabs, charts và large modals.

- [x] **RSP-706 — OmiCall management** — `/dashboard/omicall`
  - Switchboard/filter/table responsive; không làm gián đoạn SIP/call workflow.

- [x] **RSP-707 — Architecture and diagrams**
  - `/dashboard/architecture` và `/dashboard/diagrams`.
  - Diagram scroll/zoom/pan nằm trong container, không gây page overflow.

- [x] **RSP-708 — Design System final audit** — `/dashboard/design-system`
  - Component status khớp implementation thực tế.

- [x] **RSP-709 — Complex workspace regression gate**
  - Full viewport/theme/interaction pass cho Phase 7.

---

# Phase 8 — System-wide QA và hardening

- [x] **RSP-801 — Automated viewport suite**
  - Smoke tất cả 24 route tại iPhone 12 portrait/landscape, iPad portrait/landscape, desktop, FHD và 4K; light/dark.
  - Critical interaction suite kiểm tra filter drawer, booking wizard, random selector modal, customer detail drawer và empty state.
  - Runner là blocking gate: lỗi page, page-level overflow, overlay vượt viewport, runtime error hoặc local request failure làm command fail.

- [x] **RSP-802 — Visual regression suite**
  - Baseline privacy-safe cho 10 trạng thái đại diện (6 default workspace, filter drawer, booking wizard, customer detail drawer, empty state) tại iPhone 12 portrait/FHD × light/dark = 40 ảnh.
  - `pnpm qa:responsive:visual` so sánh candidate với baseline; ratio thay đổi tối đa `0.5%`, chỉ đếm pixel có channel delta > `24`. Baseline update là hành động rõ ràng: `pnpm qa:responsive:visual:update`.
  - Runtime text được redact trước khi lưu baseline; candidate chỉ nằm trong `output/` đã ignore. Runner fail khi visual regression, overflow, runtime/local request error hoặc unexpected external request failure.

- [x] **RSP-803 — Accessibility WCAG 2.2 pass**
  - `pnpm qa:responsive:a11y` là blocking gate, dùng Axe `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`; audit keyboard/focus-visible, accessible labels, contrast, WCAG 2.2 target size, reduced motion, page overflow, runtime error và local request failure.
  - Matrix 36/36 pass theo 9 representative states × iPhone 12 portrait/FHD × light/dark: Dashboard, Customers, Today, Schedule, Catalog, QA Shop, Customer filter drawer, booking wizard và customer detail drawer.
  - Reflow stress `320px` equivalent vẫn giữ evidence 48/48 default-route pass; đây là boundary audit phụ, không thay thế iPhone 12 contract.

- [x] **RSP-804 — Browser/input matrix**
  - Chromium desktop là primary internal browser.
  - Mở rộng baseline WebKit đã có từ RSP-009 thành browser/input coverage đầy đủ cho iPhone/iPad behavior.
  - WebKit isolated interaction matrix 30/30 pass: 5 critical states × iPhone 12 portrait, iPad portrait, FHD × light/dark; không có overflow, error, local request failure hoặc overlay vượt viewport.
  - `pnpm qa:responsive:input` pass 6/6: mouse + keyboard + wheel/trackpad-equivalent ở FHD Chromium, touch overlay ở iPhone 12/iPad WebKit, light/dark; không có overflow, error hay request failure.

- [x] **RSP-805 — Performance hardening**
  - Thêm production performance audit có budget: `<= 1.5 MB` initial JS, `<= 6,000` DOM nodes, FCP local `<= 2.5s`, page-level overflow/error/local failed request = 0.
  - Artifact QA dùng `NEXT_DIST_DIR=.next-performance`; local same-origin proxy chỉ bật khi `PERFORMANCE_QA_PROXY=1`, không thay đổi behavior production thông thường. Lệnh tái chạy: `pnpm qa:responsive:performance:build`, `pnpm qa:responsive:performance:start`, rồi `pnpm qa:responsive:performance`.
  - Production audit 3/3 pass: iPhone 12 chỉ 10 mobile cards, FHD/4K chỉ 50 table rows, không render song song hai surface; JS initial `983,611 B`, DOM cao nhất `3,581`, FCP cao nhất `152 ms`.
  - Resize/orientation chỉ phát 2 resize events/profile, không phát local request hay loop. Measurement chưa cho thấy cần virtualize thêm; controlled server/mobile pagination giữ dataset lớn trong budget.

- [x] **RSP-806 — Cleanup responsive technical debt**
  - Loại bỏ direct `window.innerWidth` trong feature components; geometry đi qua `getViewportSize`/responsive subscription chung.
  - Loại bỏ fixed modal/drawer widths đã được Adaptive Overlay thay thế.
  - Giảm page-specific Ant Design override trùng lặp.
  - Xóa dead CSS và legacy responsive hacks sau khi có regression coverage; sửa root mobile `AdaptiveModal` để không tràn inset của Ant Design.

- [x] **RSP-807 — Final build/lint/test gate**
  - `pnpm lint`.
  - `pnpm --filter @mos-lab/shared build`.
  - `pnpm --filter @mos-lab/web test:run`.
  - `pnpm build`.

---

# Phase 9 — Internal rollout và completion

- [ ] **RSP-901 — Internal canary rollout**
  - Nhóm nhỏ staff dùng mobile, iPad và FHD trong workflow thật.
  - Thu feedback theo task completion time, lỗi thao tác và missing information.

- [ ] **RSP-902 — FHD/4K admin validation**
  - Admin xác nhận lượng thông tin bổ sung hữu ích, không chỉ nhiều cột hơn.
  - Kiểm tra split view, comparison và scan distance trên màn hình lớn.

- [ ] **RSP-903 — Fix canary findings**
  - P0/P1 findings được sửa và regression-tested.
  - P2 improvement được đưa vào backlog có owner.

- [ ] **RSP-904 — Staff usage notes**
  - Ghi lại thay đổi navigation, mobile actions và cách mở advanced information.

- [ ] **RSP-905 — Final acceptance**
  - Product owner duyệt iPhone 12, iPad, FHD và 4K.
  - Không còn P0/P1 responsive defect.
  - Tất cả phase exit criteria đã tick.

---

# Execution order

Không bắt đầu phase sau nếu gate bắt buộc chưa đạt:

```text
RSP-006 → RSP-007 → RSP-008 → RSP-009 → RSP-010 → RSP-011
    ↓
Phase 1 Foundation
    ↓
Phase 2 Customers Pilot
    ↓
Phase 3 Shared Workflows
    ↓
Phase 4–7 Rollout by Archetype
    ↓
Phase 8 System QA
    ↓
Phase 9 Internal Rollout
```

## Recommended next task

- [ ] **NEXT — RSP-901 Internal canary rollout.**

Chọn nhóm nhỏ staff dùng workflow thật ở iPhone 12, iPad và FHD; ghi lại task completion time, lỗi thao tác và thông tin thiếu. Đây là gate cần người dùng thật, không thể thay bằng browser automation.

---

# Execution log

| Ngày       | Task                     | Trạng thái | Evidence / ghi chú                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | ------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-13 | RSP-001–RSP-005          | Done       | Codebase audit, route/component inventory, viewport và rollout strategy đã chốt.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-08-13 | RSP-006                  | Done       | Cài official `playwright-interactive`, Playwright Chromium; persistent Node kernel và reusable viewport presets đều đã verify.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-08-13 | RSP-007                  | Done       | 98/98 default và 30/30 interaction-state capture thành công; manifest và ảnh đã sanitize trong `output/responsive-baseline/2026-08-13`.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-08-13 | RSP-008                  | Done       | Defect register ghi nhận 15 defect; toàn bộ P0/P1 đã map sang owner task Phase 1–7.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-08-13 | RSP-009                  | Done       | Đã cài WebKit; 24/24 mobile/tablet default smoke và 30/30 interaction-state capture pass, không có lỗi WebKit-only.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-08-13 | RSP-010                  | Done       | Stub ảnh Google/WingsLashes trong QA context; toàn bộ 182 capture của Chromium/WebKit chạy lại không còn failed request.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-08-13 | RSP-011                  | Done       | RD-005 map sang RSP-108 cho containment toàn cục và RSP-502/RSP-508 cho Today composition.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-08-13 | RSP-101                  | Done       | `themeTokens.responsive` là source of truth: behavior tiers, QA viewport presets, layout, touch/safe-area và density mapping.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-08-13 | RSP-102                  | Done       | CSS variables/media/container queries, reduced-motion, touch target và responsive foundation classes đã được thêm vào global CSS.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-08-13 | RSP-103                  | Done       | `useResponsiveTier`/`useMediaQuery` SSR-safe dùng shared subscription; boundary và cleanup được unit-test.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-08-13 | RSP-104–RSP-107          | Done       | Nâng primitives, thêm adaptive data-view, overlay full-screen mobile và responsive form grid; không đụng business mapping.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-08-13 | RSP-108                  | Done       | iPhone dùng navigation drawer, iPad/desktop dùng persistent/collapsible nav, header ưu tiên action và OmiCall tôn trọng safe area.                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-08-13 | RSP-109                  | Done       | `/dashboard/design-system` có Responsive Foundation playground với tier live, toolbar, data card, form và overlay.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-08-13 | RSP-110                  | Done       | 39 tests pass; `pnpm lint` (294 UI files) và production build pass; Customers Chromium 14/14 + iPhone interaction 10/10 + WebKit 2/2, toàn bộ 0 page overflow.                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-08-13 | RSP-201                  | Done       | Priority contract được áp dụng: mobile card chỉ giữ identity/status/call/Booker/action; iPad compact table; FHD/4K dense table đủ 11 cột.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-08-13 | RSP-202–RSP-207          | Done       | Customers dùng responsive shell/data view, sticky bulk compact, Adaptive Overlay cho detail/filter/allocation/history/revoke/undo/campaign và form grid.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-08-13 | RSP-208                  | Done       | Chromium baseline 14/14 và interaction states 10/10 pass, đều 0 page overflow/error/request fail; WebKit iPhone 12 2/2 retry pass; lint, 39 tests và production build pass.                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-08-13 | RSP-301–RSP-306          | Done       | Booking/Update/Reschedule/Cancel/Audit, Calls, Telesales, Table Config/Icon/Allocation overlays dùng Adaptive Overlay; Calls có mobile record card, Telesales compact chỉ giữ dashboard chính trên iPhone/iPad. `pnpm lint`, 39 tests và `pnpm build` pass. Chromium visual baseline 98/98 không runtime/request failure; 8 page-overflow còn lại thuộc Today (RSP-502/RSP-508) và Schedule Calendar (RSP-601), không phát sinh từ Phase 3. WebKit Customers 8/8 render; iPad landscape/dark retry 1/1 sạch lỗi local API.                                                   |
| 2026-08-14 | RSP-401–RSP-409          | Done       | Operational/campaign workspaces dùng responsive workspace contract; Appointments, Plans, Referrals, LoCa và NYC list dùng `DataTable`; NYC detail có mobile decision cards cho customer/call/booking/detail. Chromium dark/light full matrix 336/336 và final iPhone rerun 96/96 đều `0` page overflow/error/request failure.                                                                                                                                                                                                                                                |
| 2026-08-14 | RSP-501                  | Done       | `/dashboard` là command center responsive, có role-aware shortcuts, drill-down theo chi nhánh và FHD/4K context. Không đổi business rules: dùng contract Today/Revenue Hourly hiện có. Chromium 14/14 (iPhone 12 portrait/landscape, iPad portrait/landscape, desktop, FHD, 4K × light/dark) và WebKit 4/4 pass, đều 0 overflow/error/request failure; lint, 40 tests và `pnpm build` pass.                                                                                                                                                                                  |
| 2026-08-14 | RSP-502–RSP-509          | Done       | Today chuyển booking/coming surface sang mobile cards, Staff Attendance được ẩn ở mobile; KPI trends contained locally; FAL có mobile ledger cards. Không thay đổi business calculations. Chromium full matrix pass tại iPhone 12, iPad, desktop, FHD, 4K ở light/dark.                                                                                                                                                                                                                                                                                                      |
| 2026-08-14 | RSP-601–RSP-604          | Done       | Calendar tự dùng agenda/day ở phone và iPad portrait, giữ multi-day ở landscape/desktop; toolbar compact, drawer/time picker adaptive. Chromium + WebKit smoke không overflow/error/request fail.                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-08-14 | RSP-701–RSP-709          | Done       | Catalog, Staff, Teams, CS, QA Shop, OmiCall, Architecture và Diagrams dùng workspace containment; diagram pan/zoom nằm trong canvas. Design System copy phản ánh rollout Phase 2–7 đã thực hiện.                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-08-14 | Shared mobile pagination | Done       | Phát hiện live NYC campaign có 1.940 records bị render hết trên mobile. `DataTable` giờ slice đúng controlled current page; thêm regression test. Route thật xác nhận iPhone chỉ render 10 cards + pagination, iPad/FHD giữ table; 40/40 tests pass.                                                                                                                                                                                                                                                                                                                         |
| 2026-08-14 | RSP-801                  | Done       | Thêm responsive gate có non-zero exit cho page error, page-level overflow, overlay vượt viewport và request local lỗi. Chromium full matrix 336/336 (24 route × 7 viewport × light/dark) và critical interaction 30/30 pass.                                                                                                                                                                                                                                                                                                                                                 |
| 2026-08-14 | RSP-803                  | Done       | Thêm blocking `qa:responsive:a11y`: Axe WCAG 2.2, keyboard/focus-visible, label, contrast, 24px target size, reduced motion, overflow/runtime/request gates. 36/36 pass theo 9 states × iPhone 12 portrait/FHD × light/dark, tất cả 0 Axe/focus/target/motion/overflow/page-error/local-request failure. Reflow-320 trước đó vẫn pass 48/48.                                                                                                                                                                                                                                 |
| 2026-08-14 | RSP-804                  | Done       | Refactor interaction runner sang browser/context isolated (`RESPONSIVE_ISOLATE=1`) để loại runtime hang sau nhiều WebKit capture. Full WebKit critical-state manifest 30/30 pass (iPhone 12 portrait, iPad portrait, FHD × light/dark), 0 overflow/error/local-request/overlay failure. Thêm `qa:responsive:input`; 6/6 pass mouse, keyboard, wheel/trackpad-equivalent (Chromium FHD) và touch overlay (WebKit iPhone 12/iPad), light/dark. Runner snapshot network state trước context shutdown nên không ghi nhầm request nền bị abort khi cleanup thành product failure. |
| 2026-08-14 | RSP-805                  | Done       | Đã sửa type gap của Ant Design row-selection accessibility label và build production pass. Thêm isolated `.next-performance` + opt-in same-origin proxy cho local performance QA, đồng thời ignore artifact khỏi Git/ESLint. Production Chromium audit 3/3 pass trên iPhone 12/FHD/4K: initial JS 983.611 B (<1,5 MB), CSS 40.100 B, DOM cao nhất 3.581 (<6.000), FCP cao nhất 152 ms (<2,5 s), 0 overflow/error/request failure. iPhone render đúng 10 cards; FHD/4K đúng 50 rows; không dual surface, resize 2 events và 0 request mỗi profile.                            |
| 2026-08-14 | RSP-806                  | Done       | Feature code không còn đọc trực tiếp `window.innerWidth/innerHeight`; helper responsive chung xử lý geometry. `AdaptiveModal` mobile được viewport-bound, random selector iPhone light/dark pass sau root fix.                                                                                                                                                                                                                                                                                                                                                               |
| 2026-08-14 | RSP-807                  | Done       | Root lint + UI contract, 41 tests và `pnpm build` pass.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-08-14 | RSP-802                  | Done       | Thêm visual gate Chromium với 40 baseline privacy-safe (10 scenario × iPhone 12/FHD × light/dark). Baseline update 40/40 pass; compare độc lập 40/40 pass, 0 overflow/page error/request failure; mức diff quan sát cao nhất 0,215%, dưới threshold 0,5%. Root lint/UI contract, 41 web tests và production build đều pass.                                                                                                                                                                                                                                                  |
| 2026-08-14 | RSP-807 re-run           | Done       | `pnpm lint` (UI contract 298 source files), `pnpm --filter @mos-lab/web test:run` (7 files, 41 tests) và `pnpm build` (30/30 static pages) đều pass sau performance hardening.                                                                                                                                                                                                                                                                                                                                                                                               |
