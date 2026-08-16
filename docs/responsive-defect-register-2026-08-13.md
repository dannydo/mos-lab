# Responsive Defect Register — 2026-08-13

## Severity

- **P0:** Chặn workflow chính hoặc khiến viewport được hỗ trợ gần như không sử dụng được.
- **P1:** Workflow dùng được một phần nhưng thiếu thông tin/action quan trọng hoặc có rủi ro thao tác cao.
- **P2:** Giảm hiệu suất, accessibility hoặc chất lượng vận hành; cần xử lý trong rollout/hardening.

## Register

| ID     | Severity | Nhóm                    | Viewport/route                                                        | Evidence hiện trạng                                                                                                  | Owner task                         | Trạng thái |
| ------ | -------- | ----------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------- |
| RD-001 | P0       | App Shell / navigation  | iPhone 12 portrait, toàn bộ route                                     | Sidebar `200px` giữ nguyên, content chỉ còn `142px` trong viewport `390px`.                                          | RSP-108                            | Open       |
| RD-002 | P0       | App Shell / spacing     | Mobile, toàn bộ route                                                 | Content margin/padding desktop cố định làm mất thêm `48px`; title, toolbar và data surface bị ép.                    | RSP-102, RSP-108                   | Open       |
| RD-003 | P0       | Header / actions        | Mobile, toàn bộ route                                                 | Header chỉ còn `190px`; action/avatar crowd hoặc vượt mép, không có priority/overflow model.                         | RSP-104, RSP-108                   | Open       |
| RD-004 | P0       | Toolbar / search        | iPhone 12 portrait, Customers/Dashboard                               | Toolbar có `min-w-[280px]` trong content `142px`; document rộng `546px`.                                             | RSP-104, RSP-203                   | Open       |
| RD-005 | P0       | Dashboard / overflow    | Today trên iPhone landscape và cả hai hướng iPad; mọi mobile portrait | Surface Today rộng khoảng `1300–1316px`, gây page-level horizontal scroll và clipping; WebKit xác nhận cùng hành vi. | RSP-108, RSP-502, RSP-508          | Open       |
| RD-006 | P1       | Adaptive data view      | Mobile/iPad portrait, Customers/Appointments/Catalog                  | Table desktop chỉ lộ một phần; secondary data và row actions không có mobile card/list renderer.                     | RSP-105, RSP-204, RSP-401, RSP-701 | Open       |
| RD-007 | P1       | Calendar                | Mobile/iPad, Schedule Calendar                                        | Không có agenda/day mode theo tier; title/filter/calendar columns bị ép hoặc cắt.                                    | RSP-601–RSP-604                    | Open       |
| RD-008 | P1       | Global overlay          | Mobile, nhiều route                                                   | Floating OmiCall control có thể chồng lên content hoặc primary action; chưa xử lý safe area.                         | RSP-108, RSP-303, RSP-706          | Open       |
| RD-009 | P1       | Tablet navigation       | iPad portrait/landscape, toàn bộ route                                | Sidebar persistent chiếm ~26% chiều rộng portrait; chưa đổi model theo orientation.                                  | RSP-108                            | Open       |
| RD-010 | P1       | 4K density              | 4K, toàn bộ route đại diện                                            | Content rộng tới `3592px`; scan distance rất lớn nhưng không có thêm split view/comparison hữu ích.                  | RSP-101, RSP-104, RSP-105          | Open       |
| RD-011 | P2       | Touch accessibility     | Mobile/iPad, App Shell/toolbars                                       | Nhiều icon/menu target hiện tại khoảng `32–36px`, thấp hơn product target `44×44px`.                                 | RSP-101, RSP-104, RSP-108          | Open       |
| RD-012 | P2       | Responsive architecture | System-wide                                                           | Media-query architecture chưa tập trung; còn direct `window.innerWidth`, fixed widths và page-specific overrides.    | RSP-102, RSP-103, RSP-106, RSP-806 | Open       |
| RD-013 | P2       | Dashboard controls      | Desktop/FHD, Today                                                    | Dense filters/labels có nguy cơ va chạm; thiếu responsive composition theo container.                                | RSP-502                            | Open       |
| RD-014 | P2       | Wide-screen ergonomics  | FHD/4K, App Shell và toolbar                                          | Primary context và action ở hai đầu cực xa; không có readable/max composition hoặc action grouping.                  | RSP-104, RSP-108                   | Open       |
| RD-015 | P1       | Adaptive overlay        | Mobile, Customer Detail/advanced filter                               | Drawer dùng full viewport nhưng detail composition desktop vẫn bị cắt; filter footer bị OmiCall che một phần.        | RSP-106, RSP-206                   | Open       |

## P0/P1 gate mapping

Mọi P0/P1 đã có owner task ở Phase 1–7. Thứ tự xử lý bắt buộc:

1. RSP-101–RSP-108 xử lý responsive contract, primitives và App Shell; với RD-005, RSP-108 chỉ chịu trách nhiệm containment toàn cục.
2. RSP-201–RSP-208 xác nhận adaptive table/filter/detail qua Customers pilot.
3. RSP-401, RSP-502, RSP-601–RSP-604, RSP-701 và RSP-706 xử lý archetype/module còn lại; với RD-005, RSP-502/RSP-508 sở hữu toàn bộ Today-specific reflow.

Không đóng defect chỉ vì page không còn document overflow. Owner task phải kiểm tra information priority, touch target, interaction, light/dark và viewport matrix theo Global Definition of Done.

## Evidence index

- Baseline report: `docs/responsive-baseline-report-2026-08-13.md`
- Machine manifest: `output/responsive-baseline/2026-08-13/manifest.json`
- Mobile shell evidence: `output/responsive-baseline/2026-08-13/iphone-12-portrait/dark/customers.jpg`
- Today cross-device evidence: `output/responsive-baseline/2026-08-13/<viewport>/dark/today.jpg`
- 4K density evidence: `output/responsive-baseline/2026-08-13/4k/dark/customers.jpg`
- Interaction evidence: `output/responsive-baseline/2026-08-13/interaction-states/<viewport>/<theme>/<state>.jpg`
- WebKit evidence: `output/responsive-baseline/2026-08-13/webkit/<viewport>/<theme>/<route>.jpg`
