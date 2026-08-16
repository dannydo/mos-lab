# Responsive Baseline Report — 2026-08-13

## Kết luận

Baseline Phase 0 và 0.1 đã chạy thành công 182 capture: Chromium 98/98 default + 30/30 interaction state, WebKit 24/24 iPhone/iPad smoke + 30/30 interaction state. Hiện trạng chưa đạt responsive: page-level overflow vẫn xuất hiện nhất quán ở cả Chromium và WebKit.

## Phạm vi

- 7 route đại diện: dashboard redirect, customers, appointments, today, schedule-calendar, catalog và qa-shop.
- 7 viewport: iPhone 12 portrait/landscape, iPad portrait/landscape, desktop 1440, FHD 1920 và 4K 3840.
- 2 theme: dark và light.
- Tổng: `7 × 7 × 2 = 98` capture.
- Bổ sung 30 interaction-state capture trên Customers: 5 state × iPhone 12/iPad/FHD × 2 theme.
- Bổ sung WebKit: 24 default capture cho Customers/Today/Schedule Calendar × iPhone/iPad portrait/landscape × 2 theme; 30 Customer interaction-state capture.
- iPhone 12 `390×844` là product minimum. `320px` được giữ cho WCAG Reflow ở Phase 8.

## Kết quả tự động

| Browser/suite              | Thành công | Overflow | Page error | Failed request |
| -------------------------- | ---------: | -------: | ---------: | -------------: |
| Chromium default           |      98/98 |       20 |          0 |              0 |
| Chromium interaction       |      30/30 |       10 |          0 |              0 |
| WebKit mobile/tablet smoke |      24/24 |       12 |          0 |              0 |
| WebKit interaction         |      30/30 |       10 |          0 |              0 |

Các ảnh Google avatar và WingsLashes CDN/uploads được stub bằng placeholder chỉ trong QA browser context trước khi page load. Nhờ vậy, failed request không còn che khuất lỗi local/API thật; đây không làm thay đổi product runtime.

WebKit xác nhận các overflow chính trùng với Chromium: đây là debt layout thực, không phải Safari-only issue. 10 interaction capture overflow ở mỗi engine đều nằm tại iPhone 12 portrait do App Shell nền rộng `546px`, không phải do runner.

## Phân bố page-level overflow

| Viewport            | Capture overflow | Nhận định                                                                            |
| ------------------- | ---------------: | ------------------------------------------------------------------------------------ |
| iPhone 12 portrait  |            14/14 | Tất cả route, cả hai theme đều overflow.                                             |
| iPhone 12 landscape |             2/14 | Route Today overflow ở cả hai theme.                                                 |
| iPad portrait       |             2/14 | Route Today overflow ở cả hai theme.                                                 |
| iPad landscape      |             2/14 | Route Today overflow ở cả hai theme.                                                 |
| Desktop 1440        |             0/14 | Không overflow document, nhưng một số layout còn quá dày.                            |
| FHD 1920            |             0/14 | Không overflow document.                                                             |
| 4K 3840             |             0/14 | Không overflow document, nhưng scan distance quá lớn và chưa tăng information value. |

Theo route, Today chiếm 8 capture overflow; mỗi route còn lại chiếm 2 capture ở iPhone 12 portrait.

## Kết quả kiểm tra hình ảnh

### Mobile

- Sidebar desktop rộng `200px` vẫn persistent, khiến header chỉ còn `190px` và content chính chỉ còn `142px` trên viewport `390px`.
- Content dùng margin/padding cố định; title, toolbar, search và table bị ép hoặc cắt.
- Customers, Appointments và Catalog chỉ lộ một lát nhỏ của bảng; không có mobile record renderer.
- Today tạo document rộng khoảng `1300–1316px`; lỗi còn tồn tại ở landscape và cả hai hướng iPad.
- Schedule Calendar không có mobile agenda/day mode; title và filter bị ép, calendar columns bị cắt.
- Floating OmiCall control có thể đè lên nội dung/action ở vùng hẹp.
- Customer Detail drawer đã full-width nhưng composition desktop bên trong vẫn bị cắt; filter footer bị OmiCall che một phần.

### iPad

- Sidebar `200px` chiếm khoảng 26% chiều rộng portrait và vẫn dùng desktop navigation model.
- Table/calendar không có information priority riêng cho portrait và landscape.
- Today vẫn page-overflow ở cả hai orientation.

### FHD và 4K

- Không có document overflow.
- Content kéo giãn gần toàn bộ chiều rộng (`3592px` tại 4K), làm tăng scan distance nhưng chưa cung cấp thêm comparison, panel hoặc cột phụ có giá trị.
- Header action và thông tin chính bị tách quá xa; dense admin workspace chưa tận dụng tốt màn hình lớn.

### Theme

Light/dark đều render ổn định trong baseline. Các lỗi responsive xuất hiện nhất quán ở cả hai theme, vì vậy nguyên nhân chính là shell, composition và density thay vì theme riêng lẻ.

### WebKit/Safari

WebKit smoke pass không phát hiện lỗi render/interaction chỉ xảy ra trên engine Safari. Đây là engine coverage sớm, không thay thế device-lab Safari thật, accessibility hoặc input matrix đầy đủ ở Phase 8.

## Evidence và cách chạy lại

- Runner: `pnpm qa:responsive:baseline`
- Interaction runner: `pnpm qa:responsive:states`
- WebKit mobile/tablet smoke: `pnpm qa:responsive:webkit:smoke`
- WebKit interaction states: `pnpm qa:responsive:webkit:states`
- Chạy một lát cắt: `RESPONSIVE_ROUTE=customers RESPONSIVE_VIEWPORT=iphone-12-portrait RESPONSIVE_THEME=dark pnpm qa:responsive:baseline`
- Chạy một interaction state: `RESPONSIVE_STATE=customer-detail-drawer RESPONSIVE_VIEWPORT=iphone-12-portrait RESPONSIVE_THEME=dark pnpm qa:responsive:states`
- Manifest: `output/responsive-baseline/2026-08-13/manifest.json`
- Summary: `output/responsive-baseline/2026-08-13/summary.json`
- Screenshot: `output/responsive-baseline/2026-08-13/<viewport>/<theme>/<route>.jpg`
- Interaction evidence: `output/responsive-baseline/2026-08-13/interaction-states/<viewport>/<theme>/<state>.jpg`
- WebKit evidence: `output/responsive-baseline/2026-08-13/webkit/<viewport>/<theme>/<route>.jpg`
- WebKit interaction evidence: `output/responsive-baseline/2026-08-13/interaction-states/webkit/<viewport>/<theme>/<state>.jpg`

Ảnh được sanitize trước khi lưu: dữ liệu table/list/calendar/auditor/customer/staff, input và avatar được mask. Toàn bộ `output/` là local QA artifact và đã nằm trong git-ignore.

## Giới hạn Phase 0

- Baseline đã có filter-open, row-detail, modal/drawer và empty state representative. Step sâu hơn, submit flow và error/loading timing sẽ được bổ sung khi từng workflow được migrate.
- Phase 0 không thay đổi product UI và không tuyên bố route nào đã responsive-pass.
- Native device Safari behavior, keyboard/focus, axe và `320px` Reflow nằm ở Phase 8; Playwright WebKit smoke đã được đưa lên Phase 0.1.
