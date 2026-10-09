import type { MosBibleBook, MosBibleBookKey, MosBibleCommandment } from '../types/mos-bible.js';
import { removeVietnameseTones } from '../utils/search.js';

export const MOS_BIBLE_BOOKS: readonly MosBibleBook[] = [
  {
    key: 'GOVERNANCE',
    label: 'Quyển Khải mOS',
    description: 'Cách một chân lý nghiệp vụ được định nghĩa, thi hành và sửa đổi.',
  },
  {
    key: 'BOOKING',
    label: 'Quyển Đặt Lịch',
    description: 'Năng suất Booker, lịch hẹn, Missed và vòng đời đơn.',
  },
  {
    key: 'SERVICE',
    label: 'Quyển Phụng Vụ',
    description: 'Check-in, thực hiện dịch vụ, doanh thu và vận hành salon.',
  },
  {
    key: 'REWARDS',
    label: 'Quyển Chuối & Thưởng',
    description: 'Điểm, thưởng, tip, FAL và cách chia trách nhiệm.',
  },
  {
    key: 'CUSTOMER',
    label: 'Quyển Chăm Khách',
    description: 'Combo, mốc chăm sóc, phân bổ và vòng đời khách hàng.',
  },
  {
    key: 'PEOPLE',
    label: 'Quyển Giáo Dân',
    description: 'Vai trò, lịch làm việc, ngày nghỉ và nhận diện nhân sự.',
  },
  {
    key: 'CATALOG',
    label: 'Quyển Vật Phẩm',
    description: 'Dịch vụ, sản phẩm, giá, tồn kho và quyền sửa Catalog.',
  },
  {
    key: 'SYSTEM',
    label: 'Quyển Nghi Lễ',
    description: 'Các chuẩn trải nghiệm dùng chung trên toàn hệ thống.',
  },
] as const;

/**
 * Kinh Thánh mOS is the human-readable business-rule registry used by the
 * contextual help UI. Executable calculations still live in their canonical
 * backend/shared services; each commandment points back to those sources.
 */
export const MOS_BIBLE_COMMANDMENTS: readonly MosBibleCommandment[] = [
  {
    id: 'MOS-001',
    book: 'GOVERNANCE',
    title: 'Mỗi chân lý có một chỗ đứng',
    summary: 'Một định nghĩa nghiệp vụ phải có nguồn thi hành duy nhất và một Điều răn dễ đọc cho con người.',
    commandments: [
      'Logic dùng ở từ hai nơi trở lên phải được tập trung tại Fastify service/model hoặc helper dùng chung phù hợp.',
      'Kiểu dữ liệu công khai phải được định nghĩa tại @mos-lab/shared; frontend chỉ trình bày kết quả đã thống nhất.',
      'Khi nghiệp vụ thay đổi, cùng thay đổi đó phải cập nhật hoặc tạo Điều răn, routeScopes và nguồn kiểm chứng.',
      'Mỗi Điều răn phải khai báo các trang liên quan; khi mở Kinh Thánh từ một trang đó, Điều răn phải tự xuất hiện trong “Trang này” và có test chứng minh.',
      'Điều răn cũ không bị xóa âm thầm: chuyển sang Revised hoặc Retired và dẫn tới phiên bản thay thế.',
    ],
    rationale: 'AI, nhân viên và mã nguồn cần cùng trỏ về một ý nghĩa để báo cáo không diễn giải khác nhau.',
    examples: ['Thay đổi cách tính Missed phải cập nhật service KPI và Điều răn BK-002 trong cùng một thay đổi.'],
    tags: ['single source of truth', 'AI', 'quản trị', 'thay đổi nghiệp vụ'],
    routeScopes: ['/dashboard'],
    status: 'ACTIVE',
    version: '1.1.0',
    effectiveFrom: '2026-09-10',
    sources: [
      { label: 'Quy tắc hợp nhất business logic', reference: 'AGENTS.md · Rule #11' },
      { label: 'Hướng dẫn phát triển', reference: 'docs/DEVELOPMENT.md' },
      { label: 'Contextual Kinh Thánh UI', reference: 'apps/web/components/mos-bible/MosBibleDrawer.tsx' },
    ],
  },
  {
    id: 'BK-001',
    book: 'BOOKING',
    title: 'Booked đo năng suất tạo lịch',
    summary: 'Booked / Đặt lịch / Tạo lịch của Booker được ghi nhận theo ngày đơn được tạo.',
    commandments: [
      'Đếm Booked bằng order.date_created nằm trong kỳ đang lọc.',
      'Không OR date_created với booking_date_start; ngày khách hẹn đến không thay đổi ngày ghi nhận năng suất tạo lịch.',
      'Mọi leaderboard, widget, modal và export của Booker phải dùng cùng định nghĩa.',
    ],
    rationale: 'Chỉ số này đo công việc Booker tạo ra trong ca/ngày, không đo ngày khách thực tế đến salon.',
    examples: [
      'Booker tạo lịch ngày 02/09 cho khách đến ngày 05/09: Booked thuộc ngày 02/09.',
      'Nếu khách đến ngày 05/09, Done/doanh thu có thể thuộc ngày 05/09; hai cohort không bắt buộc bằng nhau.',
    ],
    tags: ['Booker', 'Booked', 'date_created', 'năng suất'],
    routeScopes: ['/dashboard/bk', '/dashboard/kpi'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-02',
    sources: [
      { label: 'Định nghĩa Booker productivity', reference: 'AGENTS.md · Rule #10' },
      { label: 'Booking KPI API', reference: 'apps/api/src/modules/kpi/routes/bk.routes.ts' },
    ],
  },
  {
    id: 'BK-002',
    book: 'BOOKING',
    title: 'Missed chỉ được tính khi số phận đơn đã chốt',
    summary: 'KPI Missed chỉ nhận đơn ở trạng thái cuối Missed hoặc Cancelled; không suy đoán từ lịch hẹn chưa xử lý.',
    commandments: [
      'Đơn New hoặc Confirmed không có check-in, checkout, thanh toán hay hoàn thành dịch vụ sẽ tự chuyển Missed lúc 00:00 ngày kế tiếp theo giờ ICT.',
      'Việc chuyển tự động phải tạo audit order_state và thông báo cho Booker chịu trách nhiệm.',
      'KPI Booking Missed dùng đúng hai trạng thái finalized: Missed và Cancelled.',
      'Danh sách chi tiết và số tổng trên leaderboard phải dùng cùng một điều kiện lọc.',
    ],
    rationale: 'Chỉ kết luận khách lỡ hẹn sau khi ngày phục vụ đã qua và vòng đời đơn đã được hệ thống chốt.',
    exceptions: [
      'Đơn được hủy thủ công vẫn giữ trạng thái Cancelled và được tính là một kết quả lỡ/hủy của Booking KPI.',
    ],
    tags: ['Booker', 'Missed', 'Cancelled', '00:00', 'ICT'],
    routeScopes: [
      '/dashboard/bk',
      '/dashboard/kpi',
      '/dashboard/appointments',
      '/dashboard/schedule-calendar',
      '/dashboard/today',
    ],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-02',
    sources: [
      { label: 'Yêu cầu đã nghiệm thu', reference: 'MOS-BUG-6' },
      { label: 'Nguồn KPI chuẩn', reference: 'apps/api/src/modules/kpi/services/bk-booking.service.ts' },
      { label: 'Production commit', reference: 'a3c82239' },
    ],
  },
  {
    id: 'BK-003',
    book: 'BOOKING',
    title: 'Lịch không chọn KTV không mượn lịch nghỉ của KTV khác',
    summary:
      'Khi Booker dời hoặc tạo lịch không chỉ định KTV, ngày có thể chọn được xác định theo ngày hiện tại và công suất chi nhánh, không theo lịch nghỉ của một KTV mặc định.',
    commandments: [
      'Không gán fallback KTV vào date picker khi booking.assigned_staff_id là null.',
      'Ngày quá khứ vẫn bị khóa; ngày nghỉ hoặc phép chỉ khóa khi chính KTV được chọn có lịch nghỉ hợp lệ.',
      'Khung giờ còn chỗ được kiểm tra bằng roster và công suất của chi nhánh khi chưa chỉ định KTV.',
    ],
    rationale: 'Một KTV không được chọn không thể làm cho lịch của cả chi nhánh bị mờ hoặc bị khóa sai.',
    tags: ['đặt lịch', 'dời lịch', 'KTV', 'công suất', 'ngày nghỉ'],
    routeScopes: ['/dashboard/customers', '/dashboard/appointments', '/dashboard/schedule-calendar'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-02',
    sources: [
      { label: 'Ticket production', reference: 'MOS-BUG-11' },
      { label: 'Date picker chuẩn', reference: 'apps/web/components/booking/CvDatePicker.tsx' },
    ],
  },
  {
    id: 'BK-004',
    book: 'BOOKING',
    title: 'Minigame đo nỗ lực bằng 4 thước đo minh bạch',
    summary:
      'Game Booker/Telesales chỉ tính điểm trên 4 chỉ số chuẩn: Booking tạo mới, Cuộc gọi phát sinh, Khách nghe máy và Đơn hoàn thành.',
    commandments: [
      'Chỉ số Booking tạo mới (BOOKINGS) tính theo order.date_created nằm trong thời gian diễn ra game, loại trừ đơn trạng thái Cancelled; 1 booking hợp lệ = 1 điểm.',
      'Chỉ số Cuộc gọi (CALLS) đếm toàn bộ cuộc gọi đi từ máy lẻ OmiCall của nhân sự trong thời gian game; 1 cuộc gọi = 1 điểm.',
      'Chỉ số Khách nghe máy (PICKUPS) đếm các cuộc gọi OmiCall có thời lượng đàm thoại > 0 giây (answered); 1 cuộc nghe máy = 1 điểm.',
      'Chỉ số Đơn hoàn thành (DONE) đếm số đơn hàng khách đã đến làm dịch vụ và hoàn tất (Completed) trong thời gian game; 1 đơn Done = 1 điểm.',
      'Tuân thủ Điều răn BK-001: Điểm tạo booking tính theo ngày tạo đơn thực tế, không phụ thuộc ngày hẹn đến.',
    ],
    rationale:
      'Minigame phải phản ánh đúng nỗ lực kết nối khách hàng và tạo booking thực tế của Telesales, dữ liệu đối soát trực tiếp từ OmiCall và ledger đơn hàng.',
    examples: [
      'Booker A thực hiện 50 cuộc gọi, 25 cuộc nghe máy, chốt được 10 booking mới: được tính 50 điểm CALLS, 25 điểm PICKUPS và 10 điểm BOOKINGS.',
    ],
    tags: ['Minigame', 'Booker', 'Telesales', 'OmiCall', 'BOOKINGS', 'CALLS', 'PICKUPS', 'DONE', 'điểm thưởng'],
    routeScopes: ['/dashboard/bk', '/dashboard/kpi'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-28',
    sources: [
      {
        label: 'Quy tắc tính điểm Minigame',
        reference: 'packages/shared/src/types/bk-game.ts · BK_GAME_SCORING_RULES',
      },
      { label: 'Service Minigame', reference: 'apps/api/src/modules/kpi/services/bk-game.service.ts' },
    ],
  },
  {
    id: 'BK-005',
    book: 'BOOKING',
    title: 'Khách lẻ đo chỉ tiêu Done; Khách có Combo luôn là khách Combo',
    summary:
      'Khách lẻ là khách hoàn toàn không có gói combo active và là trọng tâm tính KPI Done; khách có gói combo active dù không dùng gói vẫn là khách combo.',
    commandments: [
      'Phân định Khách lẻ và Khách combo dựa trên trạng thái tài khoản của khách hàng tại thời điểm đặt lịch (order.date_created qua user_service_balance), tuyệt đối không suy đoán từ việc có bấm trừ lượt combo trên hóa đơn hay không.',
      'Khách lẻ (Retail / Single Customer): Là khách hàng hoàn toàn không có gói combo nào đang active (chưa từng mua gói, hoặc gói combo trước đó đã dùng hết lượt hay hết hạn sử dụng).',
      'Đơn hoàn tất (Completed) của Khách lẻ là nguồn duy nhất tính vào Chỉ tiêu KPI Done chính thức của Booker và Đội nhóm (ví dụ: mốc 450 Done toàn đội).',
      'Khách lẻ mang lại dòng tiền mới, Booker được hưởng thưởng Check-in từ 12.000đ đến 35.000đ/khách (theo mức giảm giá) và cộng dồn vào các mốc thưởng bậc thang Done tháng (từ +300.000đ đến +2.700.000đ).',
      'Khách Combo (Combo Live Customer): Là khách hàng đang có ít nhất 1 gói combo còn hiệu lực (còn số lượt normal_count + retain_count > 0 và date_expired còn hạn).',
      'Quy tắc bất biến: Khách hàng đang có gói combo active, dù buổi hẹn đó làm dịch vụ lẻ khác, trả thêm tiền mặt, hay không dùng đến gói combo, thì khách đó VẪN LÀ KHÁCH COMBO.',
      'Đơn của Khách Combo không tính vào chỉ tiêu KPI Done Khách Lẻ, được tracking tiến độ riêng biệt trên War Room/TV Monitor (Combo: +X Done), và Booker nhận thưởng chăm sóc cố định 1.000đ/lượt hoàn tất.',
      'Tỷ lệ chuyển đổi Single ➔ Combo (%) đo lường hiệu quả phối hợp giữa Telesale (đưa khách lẻ đến tiệm) và Salon (tư vấn chốt bán combo mới cho khách lẻ).',
    ],
    rationale:
      'Bảo đảm tính công bằng về độ khó và công sức lao động: Telesale thuyết phục khách lẻ mang dòng tiền mới về tiệm; khách có combo là khách chăm sóc định kỳ theo chu kỳ dặm/nối.',
    examples: [
      'Khách A có gói Combo 5 lần còn 2 lượt. Khách đến tiệm chỉ làm dịch vụ uốn mi 300.000đ tiền mặt (không dùng lượt nối mi trong combo). Hệ thống vẫn ghi nhận đây là Khách Combo; Booker nhận thưởng 1.000đ, không tính vào chỉ tiêu 450 Done khách lẻ.',
      'Khách B chưa từng mua combo hoặc gói combo đã hết hạn tháng trước. Khách đến nối mi mới giảm 20%. Hệ thống ghi nhận Khách Lẻ Done; Booker nhận 12.000đ thưởng check-in và tính +1 vào chỉ tiêu Done tháng của Booker.',
    ],
    tags: [
      'Booker',
      'Telesales',
      'Khách lẻ',
      'Khách Combo',
      'Combo Live',
      'KPI Done',
      '1.000đ',
      'Checkin Bonus',
      'Single to Combo',
    ],
    routeScopes: [
      '/dashboard/bk',
      '/dashboard/telesale-target',
      '/dashboard/kpi',
      '/dashboard/customers',
      '/dashboard/appointments',
    ],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-10-06',
    sources: [
      {
        label: 'Telesale Target Service',
        reference: 'apps/api/src/modules/kpi/services/telesale-target.service.ts',
      },
      {
        label: 'BK Salary Service',
        reference: 'apps/api/src/modules/kpi/services/bk-salary.service.ts',
      },
      {
        label: 'Nhận diện Combo Live tại thời điểm đặt lịch',
        reference: 'apps/api/src/modules/customers/services/combo-recognition.service.ts · buildComboLiveAtBookingSql',
      },
    ],
  },
  {
    id: 'BK-006',
    book: 'REWARDS',
    title:
      'Quy chế Thu nhập Booker: Lương ca, Thưởng Check-in, Mốc bậc thang Khách lẻ, Thưởng Missed và Hoa hồng Doanh thu',
    summary:
      'Thu nhập hàng tháng của Booker gồm 5 cấu phần minh bạch: Lương theo ca, Thưởng Check-in đơn, Thưởng Mốc bậc thang Khách Lẻ Done, Thưởng/Phạt tỷ lệ Missed và Hoa hồng Doanh thu + Tip.',
    interactiveComponent: 'BK_SALARY_EXPLAINER',
    commandments: [
      'Công thức tổng thu nhập Booker: Tổng Thu Nhập = Lương ca/cơ bản + Thưởng Check-in đơn + Thưởng Mốc bậc thang Done + Thưởng/Phạt tỷ lệ Missed + Hoa hồng Doanh thu Net + Tiền Tip được chia.',
      'Cấu phần 1 - Lương cơ bản theo ca: Mức chuẩn 6.500.000đ/tháng dựa trên 26 ngày công chuẩn; chi trả tương ứng theo số giờ công ca làm việc thực tế được chấm trên hệ thống.',
      'Cấu phần 2 - Thưởng Check-in đơn (Basic Bonus): Khách Lẻ Nối Mới nhận 35.000đ (0% giảm), 12.000đ (giảm ≤30%), 6.000đ (giảm ≤50%), 1.000đ (giảm >50%). Khách Lẻ Dặm Mi nhận 9.000đ (giảm ≤30%), 6.000đ (giảm ≤50%), 1.000đ (giảm >50%). Khách Combo Live nhận cố định 1.000đ/lượt.',
      'Cấu phần 3 - Thưởng Mốc Bậc Thang Done (Milestone Bonus): Áp dụng chuẩn Điều răn BK-005, chỉ tính trên số lượng Khách Lẻ Done trong tháng. Bắt đầu từ mốc 100 khách lẻ (+300.000đ), mỗi bước 50 khách lẻ tăng thêm 300.000đ: 150 (+600k), 200 (+900k), 250 (+1.200k), 300 (+1.500k), 350 (+1.800k), 400 (+2.100k), 450 (+2.400k), 500 (+2.700k). Hưởng mức thưởng của mốc cao nhất đạt được.',
      'Cấu phần 4 - Thưởng/Phạt Tỷ lệ Khách Missed: Tỷ lệ Missed = Missed / (Done + Missed) * 100%. Đạt ≤10% thưởng +1.000.000đ; ≤15% thưởng +500.000đ; 15.1% - 20% là 0đ; 20.1% - 25% phạt -500.000đ; >25% phạt -1.000.000đ. Điều kiện kích hoạt: Booker bắt buộc phải đạt mốc khách hàng Done tối thiểu là 100 khách (theo Điều răn BK-005). Trong trường hợp Booker không đạt mốc tối thiểu 100 khách Done, phần thưởng/phạt Missed sẽ không tính (0đ).',
      'Cấu phần 5 - Hoa hồng Doanh thu Net & Tip: Doanh thu Net từ 50tr (0.7%), 100tr (0.8%), 150tr (0.9%), 200tr (1.0%), 250tr (1.1%), từ 300tr (1.2%). Thưởng Tip: 7% tổng tiền tip khách hàng tặng cho Booker.',
    ],
    rationale:
      'Chính sách thu nhập Booker được xây dựng theo triết lý "Đa nguồn - Trúng đích - Lũy tiến": Đảm bảo lương nền ổn định, kích thích đưa khách lẻ mới về tiệm qua mốc bậc thang, kiểm soát chất lượng đặt lịch qua tỷ lệ Missed, và đồng hành cùng doanh số salon qua hoa hồng doanh thu. Việc áp dụng mốc chặn 100 khách Done tối thiểu ngăn chặn bất hợp lý khi Booker có số lượng khách quá ít (dưới mốc tối thiểu) mà nhận thưởng lớn hoặc bị phạt nặng.',
    examples: [
      'Booker A trong tháng đi làm đủ 26 công (Lương cơ bản 6.500.000đ). Tạo ra 210 Khách Lẻ Done (Thưởng check-in tích lũy 4.500.000đ) và 40 Khách Combo Live (40.000đ). Đạt mốc 200 Khách Lẻ Done (Thưởng mốc bậc thang +900.000đ). Tỷ lệ Missed 12% (Thưởng Missed +500.000đ). Doanh thu mang về 160 triệu (Hoa hồng 0.9% = 1.440.000đ). Tiền tip 200.000đ (14.000đ). 👉 Tổng thu nhập tháng: 6.500.000 + 4.540.000 + 900.000 + 500.000 + 1.440.000 + 14.000 = 13.894.000đ.',
      'Booker B chỉ đạt 35 Khách Lẻ Done (dưới mốc tối thiểu 100 khách), có 2 khách Missed (tỷ lệ 5.4%). Dù tỷ lệ Missed <= 10%, do chưa đạt mốc tối thiểu 100 Done nên Booker B nhận 0đ thưởng Missed thay vì +1.000.000đ.',
    ],
    tags: [
      'Booker',
      'Telesales',
      'Lương thưởng',
      'Thu nhập',
      'Bậc thang',
      'Milestone Bonus',
      'Checkin Bonus',
      'Missed Bonus',
      'Hoa hồng Doanh thu',
      'Paystub',
    ],
    routeScopes: ['/dashboard/bk', '/dashboard/kpi', '/dashboard/telesale-target'],
    status: 'ACTIVE',
    version: '1.1.0',
    effectiveFrom: '2026-10-09',
    sources: [
      {
        label: 'BK Salary Service',
        reference: 'apps/api/src/modules/kpi/services/bk-salary.service.ts',
      },
      {
        label: 'Salary Calculator Engine',
        reference: 'apps/api/src/modules/kpi/services/salary-calculator.ts',
      },
      {
        label: 'Điều răn Khách Lẻ Done BK-005',
        reference: 'packages/shared/src/business-rules/mos-bible.ts · BK-005',
      },
    ],
  },
  {
    id: 'OPS-001',
    book: 'SERVICE',
    title: 'Vòng đời đơn có chủ nhân rõ ràng',
    summary: 'Mỗi trạng thái của đơn thuộc đúng bộ phận và mang một ý nghĩa vận hành riêng.',
    commandments: [
      'BK/Telesales sở hữu New, Confirmed; BK/Admin sở hữu Cancelled.',
      'CC sở hữu CheckIn, Consultation, Preparation, ServiceStart và CheckOut trong luồng đón và thanh toán.',
      'CV/KTV thực hiện các mốc ServiceStart, ServiceCleaned, ServiceEnd và ServiceCompleted của dịch vụ.',
      'Hệ thống tự chốt Completed hoặc Missed; không gán người dùng giả cho hành động tự động.',
      'ServiceCompleted trả CV về hàng chờ ngay; ServiceEnd chỉ xác nhận đã nối xong và có ảnh After.',
    ],
    rationale: 'Tách đúng chủ nhân giúp audit, queue CV và KPI thời gian phản ánh đúng thao tác thực tế.',
    tags: ['order state', 'BK', 'CC', 'CV', 'lifecycle'],
    routeScopes: [
      '/dashboard/today',
      '/dashboard/appointments',
      '/dashboard/schedule-calendar',
      '/dashboard/bk',
      '/dashboard/cc',
      '/dashboard/cv',
    ],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-02',
    sources: [
      { label: 'Vòng đời đơn', reference: 'AGENTS.md · Rule #51' },
      { label: 'Wings model', reference: 'WingsLashes/Server/src/api/1/app/models/Order.php' },
    ],
  },
  {
    id: 'OPS-002',
    book: 'SERVICE',
    title: 'Doanh thu đi theo lần khách thật sự đến',
    summary: 'Doanh thu và thu nhập dịch vụ chỉ được ghi nhận từ đơn Completed theo thời điểm check-in thực tế.',
    commandments: [
      'Thời điểm chuẩn là COALESCE(report_order.actual_booking_date_start, order.booking_date_start).',
      'Doanh thu, combo bán, bán lẻ, sản phẩm, điểm và thu nhập CC chỉ nhận order_state = Completed.',
      'Không dùng order.date_created để ghi nhận doanh thu hoặc Combo bán được.',
      'Query danh sách và query thống kê phải cập nhật cùng nhau để bảng và số tổng luôn khớp.',
    ],
    rationale: 'Ngày tạo lịch đo công Booker; ngày check-in/hoàn thành mới đo nghiệm thu dịch vụ và thực thu.',
    tags: ['doanh thu', 'Completed', 'actual_booking_date_start', 'check-in'],
    routeScopes: ['/dashboard/today', '/dashboard/kpi', '/dashboard/cc', '/dashboard/cv', '/dashboard/catalog'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-02',
    sources: [{ label: 'Quy tắc ghi nhận check-in', reference: 'AGENTS.md · Rule #15' }],
  },
  {
    id: 'CC-001',
    book: 'PEOPLE',
    title: 'Không mượn danh người khác làm CC hay CV',
    summary: 'CC IN, CC OUT, BK và CV là bốn vai trò khác nhau; dữ liệu thiếu phải hiển thị thiếu.',
    commandments: [
      'Đơn chưa check-in hoặc bị lỡ/hủy phải trả ccInName và ccOutName là null.',
      'Khách không chọn KTV chỉ định phải trả technicianName là null.',
      'Không fallback Booker, CV đầu tiên hoặc chuỗi “Kỹ thuật viên” vào vai trò đang thiếu.',
      'UI hiển thị dấu “-” khi chưa có người thực hiện thật.',
    ],
    rationale: 'Một cái tên dễ nhìn nhưng sai làm sai trách nhiệm, thưởng và lịch sử phục vụ khách hàng.',
    tags: ['CC IN', 'CC OUT', 'Booker', 'CV', 'null'],
    routeScopes: [
      '/dashboard/today',
      '/dashboard/appointments',
      '/dashboard/schedule-calendar',
      '/dashboard/cc',
      '/dashboard/cv',
      '/dashboard/customers',
    ],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-02',
    sources: [{ label: 'Nhận diện vai trò nghiêm ngặt', reference: 'AGENTS.md · Rule #19' }],
  },
  {
    id: 'CC-002',
    book: 'REWARDS',
    title: 'Một ca hai CC thì chia đôi công trạng',
    summary: 'Khi CC IN khác CC OUT, điểm và khoản thưởng thuộc ca được chia 50/50 theo đúng nguồn ledger.',
    commandments: [
      'CC Bonus và điểm CC chia 50/50 khi CC IN khác CC OUT.',
      'CC Tip chỉ tính từ Cash Tip của đơn Completed; hai CC khác nhau nhận 10% mỗi người.',
      'Thưởng thực tế ưu tiên đọc staff_bonus; công thức chỉ là fallback khi ledger hợp lệ bị thiếu.',
      'Tổng trên leaderboard phải khớp từng đồng với tổng chi tiết ca làm.',
    ],
    rationale:
      'Check-in và checkout đều là phần của trải nghiệm; ledger phải ghi nhận đúng phần việc mà không nhân đôi tiền.',
    tags: ['CC', '50/50', 'tip', 'staff_bonus', 'ledger'],
    routeScopes: ['/dashboard/cc', '/dashboard/kpi'],
    status: 'ACTIVE',
    version: '1.1.0',
    effectiveFrom: '2026-09-10',
    sources: [
      { label: 'CC Gamification', reference: 'AGENTS.md · Rules #6, #7, #12' },
      { label: 'Hằng số thưởng', reference: 'packages/shared/src/constants/system-constants.ts' },
    ],
  },
  {
    id: 'TIP-001',
    book: 'REWARDS',
    title: 'Khách tip từ 20K mới tính một lượt tip',
    summary:
      'Lượt tip KPI chỉ tính cho hóa đơn có tổng tiền tip từ 20.000đ trở lên; tiền tip dưới 20.000đ là tiền thối lẻ không tính lượt nhưng vẫn kết chuyển đủ vào thu nhập.',
    commandments: [
      'Chỉ các hóa đơn có tổng tiền khách tip (Customer Tip) ≥ 20.000đ mới được ghi nhận là 1 lượt có tip và tính vào Tỷ lệ Tip (%) trên Leaderboard.',
      'Các khoản tip dưới 20.000đ là tiền thối lẻ khách không lấy lại: không tính vào số lượt có tip (Tipped Visits), không làm tăng Tỷ lệ Tip chuyển đổi.',
      'Nhân viên vẫn được hưởng đủ số tiền chia thưởng tip (CV 70%, CC 20% hoặc 10% mỗi người khi chia ca) đối với các khoản tip dưới 20.000đ trên bảng lương.',
      'Giao diện tra cứu chi tiết phân định rõ 4 trạng thái: Tất cả (ALL), Có Tip ≥ 20K (TIPPED), Tiền lẻ < 20K (SMALL_CHANGE) và Không Tip 0đ (NO_TIP).',
    ],
    rationale:
      'Ngăn ngừa hiện tượng tiền thối lẻ làm sai lệch chỉ số đánh giá mức độ hài lòng khách hàng (KPI), đồng thời bảo toàn trọn vẹn thu nhập thực tế cho nhân sự.',
    tags: ['TIP', '20K', 'KPI', 'CV', 'CC', 'CS', 'tiền lẻ', 'ledger'],
    routeScopes: ['/dashboard/cv', '/dashboard/cc', '/dashboard/cs', '/dashboard/kpi'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-28',
    sources: [
      { label: 'Quy tắc Tip 20K', reference: 'AGENTS.md · Rule #7 & Điều răn TIP-001' },
      { label: 'Hằng số hệ thống', reference: 'packages/shared/src/constants/system-constants.ts · TIP_SYSTEM_CONFIG' },
    ],
  },
  {
    id: 'CC-003',
    book: 'REWARDS',
    title: 'CC có thưởng ngày, không có thưởng doanh số tháng',
    summary: 'Thu nhập CC gồm thưởng ca, thưởng doanh số theo ngày và tip; không tự sinh hoa hồng chốt tháng.',
    commandments: [
      'CC Xoay chỉ đọc Cash Bonus đã ghi sổ và liên kết dịch vụ; không tự dựng tiền bằng công thức Level × 65đ khi ledger thiếu dòng.',
      'Daily Bonus dùng tổng thưởng ngày đã tính theo quy tắc CC trong cùng kỳ để báo cáo cap; không dùng tổng Combo-Sold payroll như một khoản thay thế.',
      'Daily Bonus có bốn danh mục: Combo mới, sản phẩm, thu nợ và nâng cấp Combo.',
      'Không cộng thêm Monthly Sales Bonus hoặc nhân tỷ lệ trên doanh số tháng.',
      'Wheel Bonus mỗi tháng không vượt 1,5 lần tổng CC Daily Bonus cùng tháng.',
    ],
    rationale:
      'Ranh giới khoản thưởng giúp paystub và leaderboard không phát sinh một chính sách lương chưa được phê duyệt.',
    tags: ['CC', 'daily bonus', 'không thưởng tháng', 'wheel cap'],
    routeScopes: ['/dashboard/cc', '/dashboard/kpi'],
    status: 'ACTIVE',
    version: '1.1.0',
    effectiveFrom: '2026-09-09',
    sources: [
      { label: 'Sổ Cash Bonus và payroll legacy', reference: 'Wings Report::getClientConsultantReport' },
      { label: 'Chính sách thu nhập CC', reference: 'AGENTS.md · Rules #45, #49, #50' },
    ],
  },
  {
    id: 'CV-001',
    book: 'REWARDS',
    title: 'Vòng xoay CV tích lũy theo cá nhân và chốt theo tháng',
    summary:
      'Thưởng Vòng xoay Kỹ thuật viên (CV) là mô hình lũy tiến cấp số cộng theo từng cá nhân, reset về 0 vào ngày 1 hàng tháng và không tính theo chu kỳ tuần.',
    commandments: [
      'Thưởng Vòng xoay CV được tính theo cấp số cộng lũy tiến dựa trên số lượng ca hoàn thành của riêng từng Kỹ thuật viên trong tháng.',
      'Chu kỳ Vòng xoay CV reset về 0 vào đúng 00:00:00 ngày đầu tiên của mỗi tháng; không áp dụng chu kỳ tuần hay ngày.',
      'Do tính chất phi tuyến bậc hai O(N²), khi số lượng khách làm tăng gấp đôi thì tiền thưởng vòng xoay cá nhân tăng xấp xỉ gấp 4 lần.',
      'Mọi báo cáo, widget KPI và Leaderboard CV lấy trực tiếp số tiền thưởng thực tế đã ghi sổ trong bảng ledger staff_bonus.',
    ],
    rationale:
      'Tạo động lực mạnh mẽ cho Kỹ thuật viên gia tăng năng suất và gắn bó phục vụ khách hàng liên tục trong suốt tháng mà không bị ngắt quãng.',
    examples: [
      'KTV A hoàn thành 40 ca trong tháng sẽ nhận mức thưởng vòng xoay cao gấp gần 4 lần so với KTV B chỉ hoàn thành 20 ca.',
    ],
    tags: ['CV', 'Vòng xoay', 'cấp số cộng', 'phi tuyến', 'reset tháng', 'staff_bonus'],
    routeScopes: ['/dashboard/cv', '/dashboard/kpi'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-29',
    sources: [
      { label: 'Quy tắc Vòng xoay CV', reference: 'AGENTS.md · Rule #14' },
      { label: 'Service tính thưởng CV', reference: 'apps/web/app/dashboard/cv/components/CvXoayTab.tsx' },
    ],
  },
  {
    id: 'FC-001',
    book: 'REWARDS',
    title: 'Dự đoán Vòng xoay là tổng dự đoán từng người, không lấy tổng công ty bình phương',
    summary:
      'Dự đoán thưởng Vòng xoay (CV & CC) cuối kỳ bắt buộc phải tính cho từng nhân viên rồi lấy tổng (∑ Bonus_hat_i), tuyệt đối không đưa tổng check-in toàn công ty vào công thức bậc 2.',
    commandments: [
      'Vòng xoay của CV và CC là mô hình lũy tiến phi tuyến bậc hai (O(N²)). Tuyệt đối không dùng phép ngoại suy tuyến tính thông thường.',
      'Thẻ Header tổng của Vòng xoay (CV Xoay, CC Xoay) bắt buộc phải tính bằng tổng các giá trị dự đoán của từng nhân sự: Tổng Dự Kiến = ∑ f(N_i / r), trong đó r là tỷ lệ thời gian ca làm đã trôi qua trong kỳ.',
      'Tuyệt đối không lấy tổng lượt check-in toàn công ty N_total đưa vào công thức cấp số cộng f(N_total) vì (∑ N_i)² ≫ ∑ N_i² sẽ làm số tiền thưởng dự đoán bị phóng đại ảo gấp hàng chục lần (120-150 triệu).',
      'Thưởng CC Xoay dự đoán phải tuân thủ điều răn CC-003: kẹp trần tối đa 1.5× tổng CC Daily Bonus dự đoán của cùng kỳ.',
      "Vòng xoay chỉ hỗ trợ dự đoán khi người dùng xem theo Tháng (comparisonMode === 'month'); ẩn hoàn toàn khi xem theo Tuần hoặc Ngày.",
      "Mọi nhãn hiển thị dự đoán tại thẻ StatCard và Bảng xếp hạng bắt buộc có nhãn chữ rõ ràng '🔮 Dự kiến: ~...' để chống nhầm lẫn thị giác dấu ngã (~) thành dấu âm (-).",
    ],
    rationale:
      'Bảo toàn tính chính xác toán học, ngăn ngừa số liệu phóng đại ảo làm sai lệch kỳ vọng tài chính của ban giám đốc và nhân sự.',
    examples: [
      'Đầu tháng ngày 5, toàn công ty có 100 check-in chia cho 10 CC (mỗi người 10 ca). Dự đoán cuối tháng phải tính cho từng CC rồi cộng lại (~20 triệu), không được lấy 100 ca ngoại suy thành 600 ca toàn công ty rồi tính f(600) sẽ ra hơn 100 triệu.',
    ],
    tags: ['Forecast', 'Dự đoán', 'Vòng xoay', 'CV', 'CC', 'phi tuyến', 'bậc 2', 'kẹp trần 1.5x'],
    routeScopes: ['/dashboard/cv', '/dashboard/cc', '/dashboard/kpi'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-29',
    sources: [
      { label: 'Quy tắc Dự đoán Vòng Xoay', reference: 'AGENTS.md · Rule #14 & #15' },
      { label: 'Implementation Plan', reference: 'CvXoayTab.tsx, CcXoayTab.tsx' },
    ],
  },
  {
    id: 'CC-004',
    book: 'REWARDS',
    title: 'Thưởng Kim Cương chỉ trao khi tỷ lệ giới thiệu đạt từ 3% trở lên',
    summary:
      'Tư vấn viên (CC) chỉ được nhận thưởng khách giới thiệu (Kim Cương) khi tỷ lệ giới thiệu trong tháng đạt từ ≥ 3.0% trên tổng số lượt khách tiếp đón.',
    commandments: [
      'Tổng lượt khách tiếp đón của CC trong tháng được chuẩn hóa bằng (Check-in + Check-out) / 2.',
      'Tỷ lệ giới thiệu = (Số khách mới đăng ký qua CC / Tổng lượt khách tiếp đón) × 100%.',
      'Nếu tỷ lệ giới thiệu < 3.0%, tiền thưởng Kim Cương hiển thị 0đ (không đủ điều kiện nhận thưởng) và hệ thống hiển thị số tiền thưởng tiềm năng để khuyến khích CC phấn đấu.',
      'Khi đạt tỷ lệ ≥ 3.0%, toàn bộ số khách giới thiệu hợp lệ được nhân với mức thưởng quy định để kết chuyển vào thu nhập.',
    ],
    rationale:
      'Đảm bảo tỷ lệ chuyển đổi giới thiệu đạt ngưỡng chất lượng tối thiểu, tránh tình trạng phát sinh lẻ tẻ không tạo ra hiệu ứng lan tỏa khách hàng.',
    examples: [
      'CC tiếp đón 100 lượt khách và giới thiệu được 3 khách mới (3.0%): Nhận đủ thưởng Kim Cương. Nếu chỉ giới thiệu được 2 khách (2.0%): Nhận 0đ thưởng Kim Cương.',
    ],
    tags: ['CC', 'Kim Cương', 'Giới thiệu', 'Diamond', '3.0%', 'ngưỡng thưởng'],
    routeScopes: ['/dashboard/cc', '/dashboard/kpi'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-29',
    sources: [
      { label: 'Quy tắc Thưởng Kim Cương', reference: 'apps/web/app/dashboard/cc/components/CcDiamondTab.tsx' },
    ],
  },
  {
    id: 'COMBO-002',
    book: 'REWARDS',
    title: 'Doanh số Combo tính theo thực thu, thu nợ chia 50/50 theo ca',
    summary:
      'Doanh số tính thưởng Combo CC Daily Sales Bonus chỉ ghi nhận trên tiền thực thu trong ca; nợ cũ thu được khi khách quay lại được ghi nhận cho CC ca thu nợ và chia 50/50.',
    commandments: [
      'Khi bán gói Combo mới có phát sinh nợ (user_debt có debt_amount > 0), doanh số tính thưởng CC Daily Sales Bonus của ngày bán chỉ tính theo số tiền thực thu trong ca (total_price_pre_tax - unpaid_debt_amount).',
      'Khoản tiền nợ cũ khi khách hàng quay lại thanh toán (user_debt_payment) được ghi nhận vào danh mục Doanh Số Thu Nợ (debt_collected) cho CC IN / CC OUT của ngày/ca thu nợ đó.',
      'Khoản thưởng thu nợ được chia 50/50 nếu CC IN khác CC OUT, hoặc 100% nếu một CC phụ trách cả ca.',
      'Tuyệt đối không tính thưởng trên doanh số nợ chưa thu tiền để bảo toàn dòng tiền thực tế của doanh nghiệp.',
    ],
    rationale:
      'Gắn liền quyền lợi nhân sự với dòng tiền thực thu của tiệm, đồng thời tạo động lực cho tư vấn viên ca sau nhắc khách hoàn tất các khoản công nợ tồn đọng.',
    examples: [
      'Khách mua Combo 2.000.000đ nhưng chỉ trả trước 1.000.000đ, nợ 1.000.000đ: CC bán chỉ được ghi nhận 1.000.000đ vào doanh số tính thưởng ngày hôm đó. Khi khách quay lại trả 1.000.000đ còn lại, ca CC tiếp đón hôm đó sẽ được ghi nhận 1.000.000đ thu nợ chia 50/50.',
    ],
    tags: ['Combo', 'Thực thu', 'Thu nợ', 'Debt Collection', '50/50', 'CC'],
    routeScopes: ['/dashboard/cc', '/dashboard/customers', '/dashboard/kpi'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-29',
    sources: [
      { label: 'Quy tắc Doanh số Thực thu & Thu nợ', reference: 'AGENTS.md · Rule #46' },
      {
        label: 'Fastify Gamification Service',
        reference: 'apps/api/src/modules/gamification/daily-sales-bonus.service.ts',
      },
    ],
  },
  {
    id: 'FAL-001',
    book: 'REWARDS',
    title: 'FAL tách lỗi cũ, công mới và mốc 25 phút thành một contract',
    summary:
      'Fix, Adjust, Log và Replace phải tách trách nhiệm ca gốc khỏi công sức của ca xử lý mới; mọi màn hình dùng cùng contract thời lượng 25 phút.',
    commandments: [
      'Adjust thu hồi 100% điểm/thưởng CC ca gốc; CV ca gốc giữ nguyên. Fix làm điều ngược lại: thu hồi CV ca gốc, CC giữ nguyên.',
      'Thời lượng FAL luôn bằng servicing + cleaning. Đúng 25 phút vẫn là ca ngắn; trên 25 phút là ca Normal.',
      'Ca Fix/Adjust/Log mới có thời lượng dương không quá 25 phút: CV nhận 15 Chuối, CC nhận tổng 5 Chuối và vào tua đầu.',
      'Ca mới trên 25 phút chạy như Normal ở tua cuối. Thời lượng bằng 0, thiếu, âm hoặc không hợp lệ phải Pending review; không được tự coi là 0 hay tự sinh thưởng.',
      'Log không phạt ca gốc; bất kỳ ledger thưởng Log nào cũng chỉ chốt sau khi Admin hoặc Quản lý/CHO duyệt giải trình.',
      'Replace tính thưởng Full theo bộ mi mới và áp dụng quy tắc thu hồi kỹ thuật riêng cho CV ca gốc.',
    ],
    rationale:
      'Trách nhiệm sửa lỗi và công lao xử lý lại là hai sự kiện khác nhau, kể cả khi cùng một người xuất hiện ở cả hai.',
    tags: ['FAL', 'Fix', 'Adjust', 'Log', 'Replace', 'Chuối'],
    routeScopes: ['/dashboard/fal', '/dashboard/cv', '/dashboard/cc', '/dashboard/kpi'],
    status: 'ACTIVE',
    version: '1.1.0',
    effectiveFrom: '2026-09-10',
    sources: [
      { label: 'Ledger FAL', reference: 'AGENTS.md · Rule #13' },
      {
        label: 'FAL duration contract',
        reference: 'apps/api/src/modules/fal/fal.service.ts',
      },
    ],
  },
  {
    id: 'PAY-001',
    book: 'REWARDS',
    title: 'Payroll chỉ tạo Adjustment từ snapshot đã khóa',
    summary:
      'Kỳ REVIEWING chưa là nguồn tài chính. Chỉ kỳ LOCKED có snapshot bất biến để tính shadow settlement; sửa trễ trở thành adjustment có audit ở kỳ hiện tại.',
    commandments: [
      'Mọi UI payroll, iOS và mOS phải lấy cùng một nguồn settlement; không màn hình nào tự tính lại từ Level hiện tại.',
      'Cash Bonus và các sổ nguồn phải cộng ở độ chính xác nửa đồng trước, sau đó chỉ làm tròn một lần ở tổng người/kỳ.',
      'Kỳ LOCKED không bị xóa, regenerate hay ghi đè. Fix, Adjust hoặc Log phát sinh trễ chỉ có thể tạo một adjustment mới sau phê duyệt.',
      'Kỳ REVIEWING chưa có snapshot tài chính để tham chiếu: không được hiển thị số Trước/Sau/Delta, tạo draft Adjustment hay ghi payout. Hệ thống phải fail closed cho đến khi kỳ chuyển LOCKED.',
      'Shadow settlement phải gắn period, calculation version, source key duy nhất và chỉ-đọc; thiếu snapshot hoặc lệch nguồn thì fail closed.',
      'Tích hợp từ Wings chỉ nhận settlement export đã LOCKED, có cutoff, phiên bản và hash xác minh. Không được truy vấn Legacy đang biến động rồi gọi kết quả đó là snapshot đã chốt.',
      'mOS Payroll Ledger phải tạo settlement ở REVIEWING với snapshot đầy đủ trước; chỉ một transaction chốt hợp lệ mới chuyển đồng thời settlement và kỳ sang LOCKED để phát export.',
      'Mọi khoản nguồn của settlement phải bắt đầu bằng mOS evidence bất biến cho dịch vụ Completed, chốt doanh số ngày hoặc Cash Tip; sau đó mới đi qua Payroll Ledger Event có idempotency key, subject, số nửa đồng, reference và hash. Kỳ LOCKED hoặc ARCHIVED tuyệt đối không nhận evidence hay event mới.',
      'Pilot CC chỉ được Super Admin mở một lần cho đúng tháng hiện tại ở trạng thái OPEN sau khi cohort fail-closed đã hợp lệ. Mở kỳ chỉ tạo biên nhận evidence; không tạo settlement, adjustment hoặc payout và không được tái sử dụng kỳ đã thuộc workflow khác.',
      'Số tháng lịch sử được phép hiện trong dashboard pilot chỉ dưới dạng snapshot parity đã xác minh và có hash. Snapshot này chỉ giải thích, không phải evidence mOS và không được dùng để finalize, tạo settlement hay payout.',
      'CC native chỉ nhận evidence do mOS phát hành; không nhập Cash Bonus từ iOS/Legacy. Mỗi cash event được mOS tính theo Level = floor(điểm trước ca / 100) + 1, × 65đ, và chia 50/50 chính xác tới nửa đồng khi có hai CC. CC Xoay thiếu event Cash là 0. Mỗi người/kỳ phải có evidence chốt Daily Bonus, kể cả giá trị 0, trước khi finalize. Cap 150% lấy tổng Daily Bonus và tổng CC Xoay của cả tháng, chỉ chạy đúng một lần khi finalize người/kỳ; phần vượt được ghi thành một event hold bất biến trước khi settlement review.',
      'Đối chiếu mOS với iOS/Legacy chỉ đọc phải so từng component theo source key chuẩn và đơn vị nửa đồng. Không có tolerance “lệch vài đồng”; thiếu dòng hoặc lệch nửa đồng đều là case cần điều tra trước khi LOCKED.',
      'Mỗi Adjustment Line phải lưu snapshot bất biến của người nhận: người cụ thể, avatar, vai trò CC/CV/Staff và chi nhánh. Không được suy lại từ hồ sơ hiện tại; thiếu snapshot thì không được tạo draft.',
      'Chỉ thành viên active của nhóm Payroll Adjustment Approvers mới được duyệt hoặc từ chối Adjustment. Người tạo case bị cấm tự duyệt; mọi quyết định phải ghi người duyệt, thời điểm và lý do.',
      'Phase 2 chỉ tạo case, snapshot, line và audit để review. Chỉ một Phase posting được duyệt riêng mới có quyền ghi adjustment vào kỳ hiện tại.',
    ],
    rationale:
      'Lương phải truy vết được từng đồng mà vẫn giữ nguyên payslip đã chốt; một thay đổi muộn không được làm lịch sử hay level của kỳ cũ trôi đi.',
    tags: ['payroll', 'ledger', 'settlement', 'adjustment', 'audit', 'Cash Bonus'],
    routeScopes: [
      '/dashboard/cc',
      '/dashboard/cv',
      '/dashboard/fal',
      '/dashboard/kpi',
      '/dashboard/payroll-pilot',
      '/payroll-adjustment-lab',
      '/payroll-native-cc-run',
    ],
    status: 'ACTIVE',
    version: '2.7.0',
    effectiveFrom: '2026-09-10',
    sources: [
      {
        label: 'Payroll Period và shadow settlement',
        reference: 'apps/api/src/modules/payroll-ledger/shadow-settlement.service.ts',
      },
      {
        label: 'Phân quyền duyệt Adjustment',
        reference: 'apps/api/src/modules/payroll-ledger/payroll-adjustment-approver.service.ts',
      },
      {
        label: 'Snapshot người nhận Adjustment',
        reference: 'apps/api/src/modules/payroll-ledger/fal-adjustment-case.service.ts',
      },
      {
        label: 'Xác minh settlement export đã khóa',
        reference: 'apps/api/src/modules/payroll-ledger/locked-settlement-import.service.ts',
      },
      {
        label: 'mOS Payroll Ledger phát hành settlement export',
        reference: 'apps/api/src/modules/payroll-ledger/locked-settlement-export.service.ts',
      },
      {
        label: 'Staging settlement export chỉ-đọc ở local',
        reference: 'apps/api/src/modules/payroll-ledger/locked-settlement-import.service.ts',
      },
      {
        label: 'Nghi thức review và lock payroll settlement',
        reference: 'apps/api/src/modules/payroll-ledger/payroll-settlement-closing.service.ts',
      },
      {
        label: 'Payroll Ledger Event bất biến',
        reference: 'apps/api/src/modules/payroll-ledger/payroll-ledger-event.service.ts',
      },
      {
        label: 'CC native policy và cap event',
        reference: 'apps/api/src/modules/payroll-ledger/cc-native-payroll-policy.service.ts',
      },
      {
        label: 'Evidence CC native từ mOS',
        reference: 'apps/api/src/modules/payroll-ledger/cc-native-evidence.service.ts',
      },
      {
        label: 'Mở kỳ intake cho pilot CC',
        reference: 'apps/api/src/modules/payroll-ledger/cc-native-pilot-period.service.ts',
      },
      {
        label: 'Snapshot parity lịch sử cho dashboard pilot',
        reference: 'apps/api/src/modules/payroll-ledger/cc-native-pilot-history.service.ts',
      },
      {
        label: 'Đối chiếu component payroll chính xác',
        reference: 'apps/api/src/modules/payroll-ledger/payroll-component-parity.service.ts',
      },
      { label: 'Ledger và cap CC', reference: 'AGENTS.md · Rules #45, #49, #50' },
    ],
  },
  {
    id: 'COMBO-001',
    book: 'CUSTOMER',
    title: 'Combo bán mới và Combo Live không phải một phép màu',
    summary:
      'Combo bán mới cần giao dịch Completed; Khách lẻ là khách không có gói combo active; Khách hàng có combo active không dùng gói vẫn là khách combo.',
    commandments: [
      'Đơn bán Combo chuẩn phải Completed, có chi tiết Combo hợp lệ và cập nhật user_service_balance.',
      'Loại trừ package key chứa single, refill hoặc balance khỏi nhận diện Combo bán mới.',
      'Combo Live định nghĩa chuẩn xác: Vào thời điểm đặt lịch (order.date_created), khách hàng vẫn còn số dư combo (user_service_balance đã tồn tại trước đó), còn số lần sử dụng (normal_count + retain_count > 0) và còn hạn sử dụng (date_expired >= ngày đặt lịch hoặc không thời hạn).',
      'Khách hàng combo không dùng gói vẫn là khách combo: Việc khách làm dịch vụ ngoài gói hoặc trả tiền mặt không biến khách đó thành khách lẻ; trạng thái combo gắn liền với tài khoản khách hàng tại thời điểm đặt lịch.',
      'Khách lẻ định nghĩa chuẩn xác: Là khách hàng hoàn toàn không có gói combo nào đang active tại thời điểm đặt lịch.',
      'Đối với KPI Telesale/Booking: Đơn hoàn tất (Completed) của khách Combo Live được tracking tiến độ riêng (Combo: +X Done); chỉ đơn của khách lẻ (Not Combo Live) mới tính vào chỉ tiêu KPI Done chính thức (450 Done).',
      'Combo Live Completed cho Booker 1.000đ cố định thay tier giảm giá và UI phải hiện “Combo Live”.',
    ],
    rationale: 'Bán một gói mới và phục vụ trên gói cũ tạo ra hai loại doanh số và khoản thưởng khác nhau.',
    tags: ['Combo', 'Combo Live', 'Khách lẻ', 'Completed', 'user_service_balance', 'Telesale KPI'],
    routeScopes: [
      '/dashboard/customers',
      '/dashboard/loca',
      '/dashboard/nyc',
      '/dashboard/cc',
      '/dashboard/bk',
      '/dashboard/telesale-target',
    ],
    status: 'ACTIVE',
    version: '1.2.0',
    effectiveFrom: '2026-10-06',
    sources: [
      { label: 'Nhận diện Combo tập trung', reference: 'AGENTS.md · Rule #21' },
      {
        label: 'Service chuẩn',
        reference: 'apps/api/src/modules/customers/services/combo-recognition.service.ts',
      },
      {
        label: 'Telesale Target Service',
        reference: 'apps/api/src/modules/kpi/services/telesale-target.service.ts',
      },
    ],
  },
  {
    id: 'CARE-001',
    book: 'CUSTOMER',
    title: 'Dặm mi có hạn, tình thương thì không',
    summary: 'Khách lẻ có tối đa 21 ngày để dặm; khách có Combo có tối đa 25 ngày.',
    commandments: [
      'Mốc tính từ lần làm mi gần nhất theo actual check-in, fallback booking start.',
      'Khách lẻ quá 21 ngày phải tư vấn nối mới.',
      'Khách Combo quá 25 ngày không dùng lượt dặm trong gói và phải dùng lượt nối mới.',
      'Chạm 24h của LoCa chỉ gồm khách ghé hôm qua, không gồm hôm nay.',
    ],
    rationale: 'Chu kỳ dặm bảo vệ chất lượng bộ mi và giúp các mốc chăm sóc nói cùng một ngôn ngữ.',
    tags: ['dặm mi', '21 ngày', '25 ngày', 'LoCa', 'Chạm 24h'],
    routeScopes: ['/dashboard/loca', '/dashboard/nyc', '/dashboard/customers', '/dashboard/appointments'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-02',
    sources: [{ label: 'Chu kỳ dặm và LoCa', reference: 'AGENTS.md · Rules #16, #28, #36' }],
  },
  {
    id: 'CUSTOMER-002',
    book: 'CUSTOMER',
    title: 'Chủ khách hiện tại quyết định quyền và nhãn phân bổ',
    summary:
      'Quyền xem khách và trạng thái “Chưa phân bổ” chỉ dùng chủ hiện tại trong crm_customer_assignments, không suy từ lịch sử hay ledger.',
    commandments: [
      'Admin và Quản lý đang hoạt động được xem danh sách và chi tiết khách trong phạm vi vận hành của họ.',
      'Telesales/Booker chỉ được xem hoặc thao tác khách có crm_customer_assignments hiện tại trỏ đúng CRM staff ID của họ.',
      'Khách đã trả pool, bị thu hồi, chuyển sang người khác hoặc chỉ còn batch/history/ledger cũ không cấp quyền truy cập.',
      'Bộ lọc “Chưa phân bổ” loại trừ mọi khách có chủ hiện tại; batch đang chờ xác nhận có thể hiện nhãn chờ nhưng không được thay thế chủ hiện tại.',
      'Role của phiên phải được đối chiếu với CRM staff ID đang active; không ghép quyền theo tên hiển thị hoặc email gần giống.',
    ],
    rationale:
      'Lịch sử cần giữ để audit, nhưng dùng nó làm quyền hiện tại sẽ vừa lộ sai khách vừa làm bảng “Chưa phân bổ” nói sai trạng thái.',
    tags: ['khách hàng', 'phân bổ', 'crm_customer_assignments', 'telesales', 'phân quyền'],
    routeScopes: ['/dashboard/customers', '/dashboard/nyc', '/dashboard/nyc/campaigns'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-09',
    sources: [
      {
        label: 'Chủ khách và access policy',
        reference: 'apps/api/src/modules/customers/services/customer-access.service.ts',
      },
      { label: 'API danh sách khách', reference: 'apps/api/src/modules/customers/routes.ts' },
    ],
  },
  {
    id: 'CARE-002',
    book: 'CUSTOMER',
    title: 'Hẹn gọi lại phải gắn với kế hoạch ngày',
    summary:
      'Mọi tương tác hẹn gọi lại từ mốc Chạm, lịch sử cuộc gọi hay Daily Plan đều đồng bộ về một kế hoạch làm việc có ngày hẹn cụ thể.',
    commandments: [
      'Khách hàng được ghi nhận vào Tab Callback (has_callback = 1) khi thỏa mãn ít nhất một trong 3 điều kiện: Trạng thái điểm Chạm là CALLBACK, hoặc có lịch hẹn Daily Plan >= Hôm nay, hoặc có nhật ký cuộc gọi hẹn gọi lại >= Hôm nay.',
      'Khi chọn trạng thái Hẹn gọi lại từ Popover điểm Chạm (LoCa hoặc Campaign), hệ thống tự động upsert bản ghi vào crm_daily_plans với plannedDate bằng callbackDate dưới bucket tương ứng (LOCA_CALLBACK hoặc CAMPAIGN_CALLBACK).',
      'Giao diện điểm Chạm hiển thị màu tím phát sáng (#a855f7) kèm biểu tượng Đồng hồ và tooltip ngày hẹn khi có lịch gọi lại hợp lệ.',
      'Listing query, stats query và count subquery phải đồng bộ 100% cùng điều kiện lọc để số lượng trên tab khớp với danh sách chi tiết.',
    ],
    rationale:
      'Khách hàng hẹn gọi lại không được bị rơi vào quên lãng; việc tự động đưa vào Daily Plan đảm bảo nhân viên CSKH có danh sách việc cần làm mỗi ngày.',
    examples: [
      'Khách bảo "chiều mai gọi lại": Booker bấm Chạm chọn CALLBACK ngày mai, hệ thống tự tạo một dòng việc trong Daily Plan ngày mai cho Booker đó.',
    ],
    tags: ['Callback', 'Hẹn gọi lại', 'Daily Plan', 'Chạm', 'LoCa', 'Campaign', 'CSKH'],
    routeScopes: ['/dashboard/loca', '/dashboard/nyc', '/dashboard/customers', '/dashboard/campaigns'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-28',
    sources: [
      { label: 'Quy tắc Callback và Daily Plan', reference: 'AGENTS.md · Rule #42' },
      { label: 'Customer Routes Helper', reference: 'apps/api/src/modules/customers/routes.ts' },
    ],
  },
  {
    id: 'CUSTOMER-003',
    book: 'CUSTOMER',
    title: 'Trạng thái khách hàng xác định động theo lịch sử và gói dịch vụ',
    summary:
      'Trạng thái làm dịch vụ của khách hàng (user_service_type) được hệ thống tự động xác định khi tạo hoặc dời lịch hẹn, không hardcode.',
    commandments: [
      'Trạng thái user_service_type phải được tính toán tự động qua UserServiceTypeService khi tạo mới hoặc dời lịch hẹn.',
      'Các phân loại chuẩn gồm: lead_book (khách đặt lịch làm lần đầu, chưa từng hoàn thành ca dịch vụ nào), new (khách mới quay lại trong vòng 30 ngày sau lần làm đầu tiên), combo (đang sở hữu gói combo còn lượt), combo_last (còn đúng 1 lượt cuối trong gói), combo_expired (hết hạn sử dụng gói combo), combo_over (đã dùng hết sạch lượt trong gói), lapser (quá 60 ngày chưa quay lại tiệm), long_time (quá 180 ngày chưa quay lại tiệm).',
      'Khách hàng chưa từng có ca dịch vụ hoàn thành nào trước ngày hẹn khi book lịch hẹn vào hệ thống bắt buộc phải mang trạng thái lead_book, tuyệt đối không gán nhầm new.',
      'Tuyệt đối không hardcode chuỗi "new" hoặc giữ nguyên trạng thái cũ khi lịch hẹn bị thay đổi thời gian.',
      'Trạng thái này quyết định trực tiếp icon huy hiệu hiển thị trước tên khách hàng trên ứng dụng iPad/iOS và CRM Web.',
    ],
    rationale:
      'Nhận diện đúng trạng thái giúp KTV và CC biết trước khách là khách mới cần hướng dẫn kỹ hay khách combo sắp hết lượt để kịp thời tư vấn tái ký.',
    examples: [
      'Khách đặt lịch làm lần đầu tiên: trạng thái hiển thị là lead_book, nhắc CC đón tiếp và tư vấn dịch vụ lần đầu chu đáo.',
      'Khách đã mua Combo 5 lượt và đã dùng 4 lượt: trạng thái hiển thị là combo_last, nhắc CC chuẩn bị kịch bản tư vấn mua tiếp combo mới.',
    ],
    tags: [
      'user_service_type',
      'lead_book',
      'khách hàng',
      'combo',
      'combo_last',
      'lapser',
      'long_time',
      'phân loại khách',
    ],
    routeScopes: [
      '/dashboard/customers',
      '/dashboard/appointments',
      '/dashboard/schedule-calendar',
      '/dashboard/today',
      '/dashboard/cc',
    ],
    status: 'ACTIVE',
    version: '1.1.0',
    effectiveFrom: '2026-10-02',
    sources: [
      { label: 'Quy tắc xác định user_service_type', reference: 'AGENTS.md · Rule #40' },
      {
        label: 'Service tính toán phân loại khách',
        reference: 'apps/api/src/modules/customers/services/user-service-type.service.ts',
      },
      { label: 'Sửa lỗi khách làm lần đầu hiển thị new thay vì lead_book', reference: 'MOS-BUG-85' },
    ],
  },
  {
    id: 'CUSTOMER-004',
    book: 'CUSTOMER',
    title: 'Khách nước ngoài nhận diện qua đầu số viễn thông hoặc cờ định danh',
    summary:
      'Khách quốc tế được nhận diện tự động qua số điện thoại không thuộc chuẩn viễn thông Việt Nam, hoặc qua cờ xác nhận có chủ đích trong hồ sơ.',
    commandments: [
      'Số điện thoại chuẩn Việt Nam bắt đầu bằng 0 hoặc +84/84, tiếp theo là một trong các đầu số 3, 5, 7, 8, 9 và 8 chữ số (tổng 10 chữ số). Mọi số khác quy chuẩn này được xác định là số điện thoại quốc tế.',
      'Khách hàng được tính là Khách nước ngoài (is_foreign = 1) khi số điện thoại là quốc tế HOẶC cờ up.is_foreign = 1 trong user_profile.',
      'Nếu cờ ghi đè (is_foreign_overridden = 1) được bật, hệ thống ưu tiên tuyệt đối giá trị up.is_foreign do nhân viên vận hành xác nhận thủ công.',
      'Bộ lọc khách nước ngoài trên danh sách khách hàng và báo cáo vận hành phải áp dụng thống nhất cùng một câu truy vấn kiểm tra định dạng viễn thông.',
    ],
    rationale:
      'Khách nước ngoài có rào cản ngôn ngữ và nhu cầu tư vấn khác biệt; việc nhận diện chuẩn xác giúp xếp lịch CC biết tiếng Anh và chuẩn bị kịch bản đón tiếp phù hợp.',
    examples: [
      'Khách dùng số điện thoại Mỹ +1-415-555-2671: hệ thống tự động gán nhãn Khách nước ngoài mà không cần thao tác thủ công.',
    ],
    tags: ['khách nước ngoài', 'is_foreign', 'quốc tế', 'số điện thoại', 'user_profile', 'phân loại'],
    routeScopes: [
      '/dashboard/customers',
      '/dashboard/appointments',
      '/dashboard/schedule-calendar',
      '/dashboard/today',
    ],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-28',
    sources: [
      {
        label: 'Service nhận diện khách nước ngoài',
        reference: 'apps/api/src/modules/customers/services/foreign-customer.service.ts',
      },
    ],
  },
  {
    id: 'PEOPLE-001',
    book: 'PEOPLE',
    title: 'Ngày OFF cố định phải xem từ lịch gốc',
    summary: 'Lịch nghỉ tuần của nhân sự lấy từ staff_day_off_schedule trước mọi nguồn suy đoán.',
    commandments: [
      'Nguồn chuẩn là staff_day_off_schedule với is_disabled = 0 và user_id khác null.',
      'weekday dùng 1 = Thứ 2 đến 7 = Chủ Nhật.',
      'Chỉ fallback staff_day_off 90 ngày hoặc lịch ca khi nhân sự hoàn toàn chưa có cấu hình tuần.',
      'staff_day_off là phiếu nghỉ ngày cụ thể, không phải nguồn chính của lịch OFF cố định.',
    ],
    rationale: 'Suy đoán ngày nghỉ từ lịch sử dễ khóa nhầm lịch đặt khách và sai kế hoạch nhân sự.',
    tags: ['nhân sự', 'OFF', 'staff_day_off_schedule', 'lịch tuần'],
    routeScopes: ['/dashboard/staff', '/dashboard/schedule-calendar', '/dashboard/today'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-02',
    sources: [{ label: 'Lịch OFF chuẩn', reference: 'AGENTS.md · Rule #31' }],
  },
  {
    id: 'PEOPLE-002',
    book: 'PEOPLE',
    title: 'Mượn áo, không mượn quyền',
    summary:
      'Super Admin có thể vào tài khoản đang hoạt động để hỗ trợ, kể cả Admin; phiên đó luôn ngắn hạn và có dấu vết.',
    commandments: [
      'Admin thường chỉ được giả lập tài khoản đang hoạt động không phải Admin; Super Admin được giả lập thêm tài khoản Admin.',
      'Không giả lập tài khoản Super Admin khác, tài khoản đang khóa, chính mình hoặc nối tiếp từ một phiên giả lập.',
      'Phiên giả lập hết hạn sau 30 phút, luôn có banner và thao tác quay về tài khoản gốc không cần mật khẩu.',
      'Mỗi lần bắt đầu/kết thúc phải lưu actor, target, thời điểm và hạn phiên trong crm_impersonation_audits; không bao giờ đọc hoặc lộ mật khẩu nhân sự.',
    ],
    rationale:
      'Hỗ trợ và kiểm tra theo đúng góc nhìn người dùng, nhưng vẫn giữ ranh giới đặc quyền và khả năng truy vết.',
    tags: ['nhân sự', 'Super Admin', 'Admin', 'giả lập', 'bảo mật', 'audit'],
    routeScopes: ['/dashboard/staff'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-02',
    sources: [
      { label: 'Policy giả lập', reference: 'apps/api/src/modules/auth/impersonation-policy.ts' },
      { label: 'Auth account-switch API', reference: 'apps/api/src/modules/auth/routes.ts' },
    ],
  },
  {
    id: 'PEOPLE-003',
    book: 'PEOPLE',
    title: 'Ứng viên đội nhóm chuẩn hoá tự động cho nhân sự mới',
    summary:
      'Picker đội nhóm giữ nguyên tập nhân sự hợp lệ, tự động công nhận nhân sự mới từ crm_staff và auto-provision staff_profile.',
    commandments: [
      'Danh sách nhân sự legacy hợp lệ yêu cầu provider = Staff, is_disabled = 0 và liên kết staff_profile (cô lập triệt để 50.800 khách hàng mang nhầm provider Staff).',
      'Đội nhóm tự động công nhận tất cả các tài khoản crm_staff đang active có vai trò tương ứng (telesales cho BK_TELESALES, cc cho CC, technician cho CV) và có liên kết legacyStaffId hợp lệ.',
      'Khi nhân sự được thêm vào đội nhóm hoặc đồng bộ trên hệ thống, nếu legacy DB còn thiếu bản ghi staff_profile, hệ thống tự động khởi tạo (auto-provision) staff_profile mặc định.',
      'Hiển thị ứng viên không tự thêm người vào team; chỉ phân quyền đúng đối tượng vào đúng nhóm nghiệp vụ.',
    ],
    rationale:
      'Hơn 50.800 khách hàng legacy mang provider Staff; việc liên kết staff_profile kết hợp tự động nhận diện từ crm_staff active giúp nhân sự mới luôn hiển thị ngay lập tức mà vẫn cô lập triệt để tệp khách hàng.',
    exceptions: [
      'Áp dụng cơ chế nhận diện tự động cho toàn bộ nhân sự mới gia nhập đội nhóm, mở rộng từ tiền lệ Thanh Vũ (#52598) và Thuý Kiều (#52648).',
    ],
    tags: ['nhân sự', 'BK', 'Telesales', 'nhóm', 'staff_profile', 'auto-provision'],
    routeScopes: ['/dashboard/staff/teams'],
    status: 'ACTIVE',
    version: '2.0.0',
    effectiveFrom: '2026-09-22',
    sources: [
      { label: 'Điều kiện ứng viên và auto-provision', reference: 'apps/api/src/modules/teams/team.service.ts' },
      { label: 'Kiểm thử phạm vi ứng viên đội nhóm', reference: 'apps/api/src/modules/teams/team.service.test.ts' },
    ],
  },
  {
    id: 'CAT-001',
    book: 'CATALOG',
    title: 'Một đồng là một đồng, không có 0,18 đồng',
    summary: 'Giá VND trên API, UI, báo cáo và export luôn là số nguyên.',
    commandments: [
      'Mọi giá VND phải Math.round trước khi trả DTO hoặc hiển thị.',
      'service_price và product_price phải lọc currency_id = 2.',
      'Tồn kho sẵn bán lấy qua product.inventory_item_id tới inventory_warehouse_item và item_state = New.',
      'Giá Combo gợi ý bằng giá bán lẻ nhân số lượt mua; lượt tặng có giá 0đ.',
    ],
    rationale: 'VND không có đơn vị nhỏ hơn đồng; số thập phân từ dữ liệu legacy không phải giá bán hợp lệ.',
    tags: ['Catalog', 'VND', 'Math.round', 'tồn kho', 'giá Combo'],
    routeScopes: ['/dashboard/catalog'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-02',
    sources: [{ label: 'Giá và tồn kho', reference: 'AGENTS.md · Rules #23, #26' }],
  },
  {
    id: 'CAT-002',
    book: 'CATALOG',
    title: 'Kho giao dịch là bất khả xâm phạm',
    summary: 'mOS chỉ đọc bảng giao dịch legacy; Catalog là ngoại lệ ghi có kiểm soát.',
    commandments: [
      'Không ghi từ mOS vào order, order_service, user, user_profile, staff_bonus hoặc user_service_balance.',
      'Catalog chỉ được ghi vào các bảng master metadata đã cho phép qua /api/catalog/*.',
      'Mọi ghi Catalog phải có guard Admin và chạy trong transaction.',
      'Tên service_language phải tìm linh hoạt theo service_id và tạo fallback nếu chưa có bản ghi.',
    ],
    rationale: 'Wings giữ quyền sở hữu transaction; mOS không được tạo nguồn ghi cạnh tranh làm lệch ledger.',
    tags: ['legacy', 'read-only', 'Catalog', 'transaction', 'Admin'],
    routeScopes: ['/dashboard/catalog', '/dashboard/architecture'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-02',
    sources: [
      { label: 'Ranh giới legacy DB', reference: 'AGENTS.md · Coding Guideline #3' },
      { label: 'Quyền ghi Catalog', reference: 'AGENTS.md · Rule #27' },
    ],
  },
  {
    id: 'CAT-003',
    book: 'CATALOG',
    title: 'Dòng mi, Loại dịch vụ và Nhóm dịch vụ là ba tầng độc lập',
    summary:
      'Không nhầm lẫn giữa Kiểu/Dòng mi (Classic, Volume, Ivylight...), Loại thao tác (Nối mới, Dặm, Tháo) và Nhóm danh mục sản phẩm dịch vụ.',
    commandments: [
      'Tầng 1 - Dòng Mi / Dáng Mi (lashStyle): Quy định kỹ thuật và phong cách sợi mi (Classic, Mink, Volume 3D-5D, Ultralight, Hyperlight, Flawless, Ivylight 3L-5L, Under Mink...). Định nghĩa chuẩn tại @mos-lab/shared LASH_STYLES.',
      'Tầng 2 - Loại Dịch Vụ (serviceType): Quy định tính chất thao tác gồm Normal (Nối mi mới), Retain (Dặm mi), Fix (Bảo hành sửa lỗi), Adjust (Chỉnh sửa kỹ thuật) và Removal (Tháo mi).',
      'Tầng 3 - Nhóm Dịch Vụ (serviceGroup): Quy định ngành hàng vận hành gồm LashesTop (Mi trên), LashesUnder (Mi dưới), Lashes, Sauna, Hair và Khác.',
      'Khi phân tích dịch vụ, LashBenchmarkService tách riêng { lashStyle, lashCount } từ mã và tên dịch vụ; không dùng chuỗi tự do để so khớp.',
      'Giá gợi ý của gói Combo tính theo số lượt mua nhân giá bán lẻ niêm yết của dịch vụ gốc; các lượt tặng (bonusNormalCount, bonusRetainCount) có giá quy ước 0đ.',
    ],
    rationale:
      'Việc tách bạch 3 tầng phân loại giúp hệ thống tính đúng điểm kỹ thuật cho KTV, phân bổ doanh thu chính xác và ngăn ngừa sai lệch thời lượng phục vụ.',
    examples: [
      'Dịch vụ "Dặm Mi Ivylight 3L": Dòng mi là Ivylight, Loại dịch vụ là Retain (Dặm), Nhóm dịch vụ là LashesTop.',
    ],
    tags: [
      'Dòng mi',
      'Dáng mi',
      'LashStyle',
      'ServiceType',
      'ServiceGroup',
      'Classic',
      'Volume',
      'Ivylight',
      'Combo',
      'Catalog',
    ],
    routeScopes: ['/dashboard/catalog', '/dashboard/cv', '/dashboard/today', '/dashboard/customers'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-28',
    sources: [
      { label: 'Thuật ngữ Dòng mi', reference: 'AGENTS.md · Rule #42 & Rule #26' },
      { label: 'Lash Styles Catalog Types', reference: 'packages/shared/src/types/catalog.ts' },
      { label: 'Benchmark Service', reference: 'apps/api/src/modules/catalog/services/lash-benchmark.service.ts' },
    ],
  },
  {
    id: 'STORE-001',
    book: 'SERVICE',
    title: 'Vận hành nối mi chỉ có hai thánh đường',
    summary: 'Dropdown vận hành salon chỉ hiển thị Đề Thám và Estella Place.',
    commandments: [
      'Đề Thám là Store #6 / DT; Estella Place là Store #16 / EP.',
      'Không đưa Academy, HQ, Phan Xích Long hoặc chi nhánh đã vô hiệu hóa vào dropdown nối mi.',
      'Mọi nơi phải dùng ACTIVE_LASH_SALONS từ @mos-lab/shared thay vì hardcode danh sách riêng.',
    ],
    rationale: 'Bộ lọc chung ngăn nhân viên vô tình đặt khách hoặc đọc KPI vào địa điểm không phục vụ nối mi.',
    tags: ['store', 'Đề Thám', 'Estella Place', 'ACTIVE_LASH_SALONS'],
    routeScopes: [
      '/dashboard/today',
      '/dashboard/appointments',
      '/dashboard/schedule-calendar',
      '/dashboard/bk',
      '/dashboard/cc',
      '/dashboard/cv',
    ],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-02',
    sources: [
      { label: 'Tiệm nối mi hoạt động', reference: 'AGENTS.md · Rule #54' },
      { label: 'Danh sách chuẩn', reference: 'packages/shared/src/constants/system-constants.ts' },
    ],
  },
  {
    id: 'CV-002',
    book: 'SERVICE',
    title: 'Tốc độ làm mi tính từ iPad trong khung 90 ngày động',
    summary:
      'Tốc độ thao tác của KTV được đo bằng tổng thời gian thao tác thực tế trên ứng dụng iPad qua 90 ngày gần nhất, chia theo 3 nhóm dịch vụ.',
    commandments: [
      'Thời lượng thao tác thực tế tính bằng: preparation_minute + pre_servicing_minute + cleaning_minute + servicing_minute ghi nhận từ report_order_service trên iPad.',
      'Khung thời gian tính toán lấy động trong 90 ngày gần nhất (actual_booking_date_start >= NOW() - 90 ngày) cho các đơn Completed thuộc nhóm dịch vụ Lashes (Lashes, LashesTop, LashesUnder).',
      'Chỉ nhận các ca làm có thời lượng hợp lệ từ 15 đến 200 phút để loại bỏ ca lỗi dữ liệu hoặc quên bấm kết thúc trên iPad.',
      'Phân chia thành 3 chỉ số độc lập: normalAvg (Nối mới), retainAvg (Dặm mi) và removalAvg (Tháo mi hoặc Fix).',
      'Giao diện hiển thị Badge tốc độ linh hoạt khi KTV có bất kỳ chỉ số nào trong 3 nhóm, không ẩn badge khi nhân sự chuyên dặm hoặc tháo.',
    ],
    rationale:
      'Thời lượng niêm yết trên catalog chỉ mang tính ước lượng; tốc độ thực tế từ iPad phản ánh đúng tay nghề và công suất phục vụ thực tế của từng KTV.',
    examples: [
      'KTV có trung bình nối mới 65 phút, dặm mi 38 phút, tháo mi 18 phút: badge hiển thị chi tiết 3 chỉ số tương ứng theo ca làm.',
    ],
    tags: ['KTV', 'CV', 'tốc độ', 'iPad', 'benchmark', '90 ngày', 'normalAvg', 'retainAvg', 'removalAvg'],
    routeScopes: ['/dashboard/cv', '/dashboard/today', '/dashboard/schedule-calendar', '/dashboard/customers'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-28',
    sources: [
      { label: 'Quy chuẩn tốc độ KTV', reference: 'AGENTS.md · Rule #52' },
      { label: 'Service tính toán tốc độ', reference: 'apps/api/src/modules/kpi/services/cv-speed-model.service.ts' },
    ],
  },
  {
    id: 'CV-003',
    book: 'PEOPLE',
    title: 'Quy chuẩn tính lương nghỉ phép tháng theo ca làm việc thực tế và đối soát phép năm Chuyên Viên',
    summary:
      'Lương ngày nghỉ phép tháng của Chuyên Viên tính theo thời lượng ca làm việc thực tế được phân công (ca 9h tính 9h, ca full 11h tính 11h); phép năm tích lũy theo thời gian hợp đồng hiện hành và không cộng dồn từ hợp đồng cũ.',
    commandments: [
      'Ngày nghỉ phép tháng có hưởng 100% lương giờ của Chuyên Viên được tính theo Thời Lượng Ca Làm Việc Thực Tế được xếp lịch trong ngày nghỉ đó (staff_working_shift). Ca thường tính 9 tiếng (9h), ca full tính 11 tiếng (11h). Tiền phép = Số ngày phép x Số giờ ca x Lương giờ.',
      'Trường hợp Chuyên Viên làm việc ca full 11h (09:00 - 20:00 như Thảo Ly, Nhung): ngày nghỉ phép tháng được hưởng trọn vẹn lương ca full 11h (11h x Lương giờ).',
      'Chỉ công nhận ngày nghỉ phép có hưởng lương khi đơn nghỉ phép (staff_day_off) được Approved và bản ghi chấm công (report_staff) có working_minute = 0. Nếu đơn bị Cancelled hoặc nhân viên vẫn check-in đi làm, tính lương theo giờ công thực tế, không tính đè tiền phép.',
      'Quỹ phép năm tiêu chuẩn 12 ngày/năm (1 ngày/tháng). Nhân viên vào làm giữa năm hoặc ký lại hợp đồng mới chỉ tích lũy từ tháng bắt đầu hợp đồng mới (payroll_date_start), tuyệt đối không cộng dồn ngày phép của hợp đồng cũ trước khi nghỉ việc.',
      'Số ngày phép năm còn lại = Quỹ phép tích lũy trong năm - Tổng số ngày phép tháng đã dùng trong năm. Khi đã nghỉ hết quỹ tích lũy, số dư phép bằng 0 ngày.',
    ],
    rationale:
      'Đảm bảo sự công bằng, chính xác theo ca làm việc thực tế của nhân sự, đồng thời triệt tiêu lỗi cộng dồn phép ảo từ hệ thống cũ gây sai lệch sổ sách nhân sự.',
    examples: [
      'Thiên Thiên làm ca thường 9h (11:00 - 20:00): 1 ngày phép tính 9h x 25.500đ = +229.500đ.',
      'Thảo Ly làm ca full 11h (09:00 - 20:00): 1 ngày phép tính 11h x 25.500đ = +280.500đ.',
      'HânEmBé làm ca thường 9h (09:00 - 18:00): 2 ngày phép tính 2 x 9h x 27.500đ = +495.000đ.',
    ],
    tags: ['CV', 'phép năm', 'nghỉ phép', 'ca 9h', 'ca 11h', 'lương giờ', 'payroll_date_start', 'day_off_available'],
    routeScopes: ['/dashboard/cv', '/dashboard/kpi'],
    status: 'ACTIVE',
    version: '1.1.0',
    effectiveFrom: '2026-10-09',
    sources: [
      { label: 'Quy chuẩn Nghỉ phép CV', reference: 'AGENTS.md · Rule #57' },
      { label: 'Service tính lương CV', reference: 'apps/api/src/modules/kpi/routes/cv-paystub.routes.ts' },
    ],
  },
  {
    id: 'UI-001',
    book: 'SYSTEM',
    title: 'Có dấu hay không dấu đều tìm thấy nhau',
    summary: 'Mọi ô tìm kiếm mOS phải hỗ trợ tiếng Việt không dấu và không phân biệt hoa thường.',
    commandments: [
      'Select showSearch dùng vietnameseSearchFilter từ @mos-lab/shared.',
      'Tìm kiếm mảng hoặc bảng dùng removeVietnameseTones trước khi so khớp.',
      'Không viết thêm một hàm bỏ dấu cục bộ khi helper dùng chung đã tồn tại.',
    ],
    rationale:
      'Nhân viên cần tìm được “Nguyễn” bằng “nguyen” trên mọi màn hình, không phải nhớ cách gõ của từng trang.',
    tags: ['tìm kiếm', 'tiếng Việt', 'không dấu', 'Select'],
    routeScopes: ['/dashboard'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-02',
    sources: [
      { label: 'Tìm kiếm tiếng Việt', reference: 'AGENTS.md · Rule #32' },
      { label: 'Helper chuẩn', reference: 'packages/shared/src/utils/search.ts' },
    ],
  },
  {
    id: 'UI-002',
    book: 'SYSTEM',
    title: 'Tuần bắt đầu bằng Thứ Hai, bảng nhớ nơi giáo dân đang đứng',
    summary: 'Bộ lọc tuần dùng ISO week; bảng phân trang phải được kiểm soát và ghi nhớ trạng thái làm việc.',
    commandments: [
      'Tuần bắt đầu Thứ 2 00:00 và kết thúc Chủ Nhật 23:59:59; frontend dùng isoWeek.',
      'Bảng phân trang dùng current, pageSize, onChange, showSizeChanger, options 10/20/50/100 và showTotal.',
      'activeTab, page và pageSize được lưu; khi đổi bộ lọc hoặc tìm kiếm, trang quay về 1.',
      'Mọi cột bảng có numeric width và nội dung số/ngày/tiền không rớt dòng trên tablet.',
    ],
    rationale: 'Nhân viên giữ được mạch công việc sau khi F5 hoặc chuyển tab, và số liệu tuần không lệch Chủ Nhật.',
    tags: ['isoWeek', 'pagination', 'localStorage', 'table', 'tablet'],
    routeScopes: ['/dashboard'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-02',
    sources: [{ label: 'Chuẩn lịch và bảng', reference: 'AGENTS.md · Rules #22, #24, #37' }],
  },
  {
    id: 'UI-003',
    book: 'SYSTEM',
    title: 'Lưu trữ campaign là policy chung, không phải công tắc trình duyệt',
    summary:
      'Campaign ARCHIVED không hiển thị hoặc truy cập được bởi nhân viên; Admin và Quản lý vẫn thấy để audit, khôi phục hoặc mở lại.',
    commandments: [
      'API danh sách và tra cứu campaign phải lọc ARCHIVED cho người không có quyền quản lý campaign.',
      'Không dùng localStorage hoặc sidebar client làm nguồn quyền hiển thị campaign.',
      'Trạng thái PAUSED và COMPLETED không bị thay đổi bởi quy tắc ARCHIVED này.',
    ],
    rationale:
      'Một thao tác lưu trữ phải có hiệu lực nhất quán ở mọi phiên nhân viên và vẫn giữ được khả năng quản trị.',
    tags: ['campaign', 'ARCHIVED', 'phân quyền', 'sidebar', 'API'],
    routeScopes: ['/dashboard/nyc', '/dashboard/nyc/campaigns'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-02',
    sources: [
      { label: 'Ticket production', reference: 'MOS-BUG-12' },
      { label: 'Campaign visibility service', reference: 'apps/api/src/modules/campaigns/campaign.service.ts' },
    ],
  },
  {
    id: 'UI-004',
    book: 'SYSTEM',
    title: 'Inbox đã xem phải đổi chủ nhân rõ ràng',
    summary:
      'Một phản hồi AI theo sự kiện chỉ được xem là hoàn tất khi Inbox hiển thị bước tiếp theo rõ ràng: hỏi đúng một câu hoặc xác nhận ticket đã đủ rõ để Danny duyệt.',
    commandments: [
      'Ticket PENDING_AGENT chỉ chuyển READY khi Agent xác nhận rõ ràng; REVIEW thường dùng PROGRESS_REVIEWED, còn REPORTER_REOPENED bắt buộc dùng REANALYSIS_CONFIRMED.',
      'Nếu còn thiếu dữ kiện trọng yếu, AI chỉ tạo đúng một câu hỏi và chuyển ticket sang WAITING_REPORTER.',
      'NO_OP chỉ dùng cho ticket đã qua bước Agent-needed hoặc sự kiện đã lỗi thời; REPORTER_REOPENED phải từ chối NO_OP để không tự READY hoặc mất lý do người báo.',
      'Reopen phải khóa snapshot audit gồm lý do, audit ID, thời điểm và metadata giới hạn của ảnh gốc vào follow-up/plan job; blob/URL không đi trong job. Worker chỉ đọc ảnh qua lease còn hạn.',
      'Nếu một ảnh gốc đã snapshot không còn đọc được, Agent phải tạo đúng một clarification thay vì suy đoán rằng đã có bằng chứng.',
      'Người báo có thể gửi mô tả tối thiểu; chi tiết dành cho người quen kỹ thuật là tùy chọn, được lưu có cấu trúc cho Agent và không phải điều kiện gửi hoặc chuyển ticket sang READY.',
      'Màn “Yêu cầu của tôi” chỉ dùng projection do server quyết định và chỉ nói trạng thái, mOS đang làm gì, việc tiếp theo và cập nhật gần đây; kế hoạch, worker, commit, deploy và audit là chi tiết vận hành, không hiển thị cho người báo.',
    ],
    rationale:
      'Người báo và Danny phải nhìn thấy cùng một chủ nhân bước tiếp theo; completed trong background không thể thay cho tiến độ vận hành trên Inbox.',
    examples: [
      'Ticket QA PENDING_AGENT nêu rõ không cần hỏi thêm: AI review xong, Inbox hiển thị Đã đủ rõ và Danny là người duyệt tiếp theo.',
      'Ticket thiếu bước tái hiện lỗi: AI hỏi một câu trọng yếu, Inbox hiển thị Chờ người báo.',
    ],
    tags: ['mOS Inbox', 'Agent cần làm rõ', 'READY', 'ASK_REPORTER', 'follow-up', 'AI review'],
    routeScopes: ['/dashboard/bug-reports'],
    status: 'ACTIVE',
    version: '1.4.0',
    effectiveFrom: '2026-09-04',
    sources: [
      {
        label: 'Inbox follow-up source of truth',
        reference: 'apps/api/src/modules/bug-reports/inbox-follow-up.service.ts',
      },
      { label: 'Visible review transition', reference: 'apps/api/src/modules/bug-reports/bug-report.service.ts' },
      { label: 'Progressive reporter intake', reference: 'apps/web/components/bug-reports/BugReportSurface.tsx' },
      { label: 'Reporter experience projection', reference: 'apps/api/src/modules/bug-reports/bug-report.service.ts' },
    ],
  },
  {
    id: 'UI-005',
    book: 'SYSTEM',
    title: 'Plan Inbox theo sự kiện phải hiển thị và chờ Danny duyệt',
    summary:
      'Khi ticket đã đủ rõ để lập phương án, worker outbound phải tạo đúng một plan native theo từng phiên bản sự kiện; plan không phải là quyền triển khai.',
    commandments: [
      'Chỉ ticket NEW hoặc APPROVED có clarification READY mới được enqueue plan; ticket mơ hồ, đang triển khai hoặc đã kết thúc không được lập plan tự động.',
      'Mỗi plan job phải khóa theo eventVersion của nội dung cần phân tích, lease và kiểm tra stale ngay trước khi ghi để retry hoặc event trùng không tạo plan thứ hai. Triage status/priority và audit vận hành không phải nội dung plan, nên không được làm plan đang chạy trở thành stale.',
      'Plan hoàn tất phải hiển thị native comment gồm bằng chứng/giả thuyết, kết quả, phạm vi, bước làm, kiểm chứng, rủi ro/rollback và quyết định Danny cần duyệt.',
      'Plan sau REPORTER_REOPENED phải mang event REOPEN_REANALYZED, nhãn reopen, lý do immutable của người báo, metadata ảnh gốc đã đối chiếu và audit riêng; priority, Danny approval và implementation approval cũ bị hủy.',
      'Worker plan chỉ phân tích và ghi phương án; không được sửa code, dữ liệu, cấu hình, triage, priority hay deploy. Các cổng duyệt triển khai và deploy vẫn tách biệt.',
      'NO_OP, thiếu thông tin và stale phải được ghi nhận trung thực; không được coi là plan hoàn tất hoặc che giấu tiến độ khỏi Inbox.',
    ],
    rationale:
      'Phương án cần đến Danny ngay khi ticket rõ, nhưng quyền triển khai phải luôn đến từ một phê duyệt riêng, có thể kiểm tra và không bị suy diễn từ trạng thái lịch sử.',
    examples: [
      'Reporter trả lời đủ thông tin: event CLARITY_READY tạo một plan native và Inbox vẫn chờ Danny quyết định.',
      'Reporter cập nhật ticket sau khi worker claim: kết quả cũ bị đánh dấu stale, không đăng plan cũ; phiên bản mới mới được xử lý.',
    ],
    tags: ['mOS Inbox', 'event-driven', 'plan', 'Danny approval', 'lease', 'idempotency', 'stale'],
    routeScopes: ['/dashboard/bug-reports'],
    status: 'ACTIVE',
    version: '1.3.0',
    effectiveFrom: '2026-09-04',
    sources: [
      {
        label: 'Durable plan job source of truth',
        reference: 'apps/api/src/modules/bug-reports/inbox-plan.service.ts',
      },
      { label: 'Outbound worker contract', reference: 'scripts/request-classifier-worker.ts' },
    ],
  },
  {
    id: 'UI-006',
    book: 'SYSTEM',
    title: 'Sức khỏe Inbox Worker là trạng thái do server chốt',
    summary:
      'Inbox chỉ hiển thị metadata vận hành đã được server xác nhận; heartbeat không được sửa ticket, plan, priority hoặc nội dung yêu cầu.',
    commandments: [
      'Worker outbound gửi identity ổn định, phiên chạy, sequence, phiên bản, trạng thái kết nối, job đang chạy và outcome đã được giới hạn mỗi 30 giây.',
      'Server dùng giờ server và ngưỡng cấu hình để chốt Online ≤ 90 giây, Degraded trước 180 giây hoặc khi có lỗi nghiêm trọng/liên tiếp, Offline từ 180 giây.',
      'Heartbeat cũ không được ghi đè heartbeat mới; state transition chỉ được lưu một lần cho mỗi lần đổi trạng thái.',
      'Circuit breaker giai đoạn đầu chỉ là ADVISORY: server tính thời lượng job theo giờ server, cảnh báo review/chẩn đoán từ 10/20 phút và code/test từ 15/45 phút. Nó không tự kill, pause, retry hay đổi ticket; ngưỡng pause chỉ là đề nghị kiểm tra thủ công cho tới khi runner có checkpoint/resume an toàn.',
      'Inbox Admin chỉ đọc snapshot an toàn, trạng thái tải/lỗi và transition thấy được; không hiển thị ticket ID, prompt, attachment, token hay output AI.',
      'Thanh Live trên Inbox chỉ đại diện một Worker Mac và một job RUNNING có lease còn hiệu lực do server chọn; bảng chỉ trình bày lại cùng trạng thái đó theo từng ticket, không đếm job như thể có nhiều worker.',
    ],
    rationale:
      'Vận hành cần biết worker có đang sống và xử lý được việc hay không, nhưng quan sát kỹ thuật không được trở thành một luồng thay đổi nghiệp vụ.',
    examples: [
      'Worker không gửi heartbeat 95 giây: Inbox hiển thị Degraded với lý do HEARTBEAT_STALE.',
      'Worker gửi heartbeat mới sau Offline: server lưu transition Online và Inbox hiển thị tín hiệu phục hồi.',
    ],
    tags: ['mOS Inbox', 'worker health', 'heartbeat', 'server time', 'observability', 'safe metadata'],
    routeScopes: ['/dashboard/bug-reports'],
    status: 'ACTIVE',
    version: '1.2.0',
    effectiveFrom: '2026-09-04',
    sources: [
      {
        label: 'Server-authoritative health service',
        reference: 'apps/api/src/modules/bug-reports/request-classifier-worker-health.service.ts',
      },
      { label: 'Outbound worker telemetry contract', reference: 'scripts/request-classifier-worker.ts' },
      {
        label: 'Inbox compact live-worker presentation',
        reference: 'apps/web/app/dashboard/bug-reports/components/BugReportWorkerActivity.tsx',
      },
    ],
  },
  {
    id: 'UI-007',
    book: 'SYSTEM',
    title: 'Inbox implementation phải có cổng commit và deploy tách biệt',
    summary:
      'Code, test, commit và deploy chỉ diễn ra trong Codex IDE hiển thị. Inbox giữ cổng duyệt, handoff và receipt đã kiểm chứng; commit và deploy vẫn là hai quyết định Danny tách biệt.',
    commandments: [
      'APPROVED triage không tự là quyền chạy code: Danny phải thực hiện hành động Duyệt code/test riêng, ticket phải READY, có priority và có native plan khớp source version.',
      'Inbox tạo một implementation job IDE-owned, source/plan-version-bound cùng một provisioning request ID. Local companion được cài qua launchd managed runtime (config 0600 riêng bearer) tự poll, lease request rồi gọi Codex App Server tạo đúng một task/worktree hiển thị; request ID và ledger 0600 khiến restart/reconnect hoàn tất task cũ thay vì tạo task thứ hai. Worker Mac và route claim không được lease hay thực hiện code/test, commit hoặc deploy.',
      'Nonce handoff chỉ được sinh sau khi companion báo task ID và server bind atomically đúng request đang lease. Inbox phải chiếu PENDING/LEASED/READY bằng nhãn Codex IDE phù hợp, không được nói chờ Worker Mac. Revoked, stale, thiếu quyền hoặc callback khác request bị từ chối không giao nonce, không audit/comment/notification; provisioning tạm không có task là retryable.',
      'IDE receipt chỉ được ghi sau khi IDE đã code/test. Receipt của task đã bind đi qua bridge bearer riêng, đối chiếu task/job/nonce/source/plan/quality gate/trạng thái trong một transaction; browser không gửi nonce. Thiếu, cũ, sai, revoked, task khác hoặc không có quyền bị từ chối không ghi gì; replay không nhân audit.',
      'Danny duyệt commit chỉ cấp nonce commit cho đúng candidate đã review. Inbox phải chiếu rõ “Chờ Codex IDE ghi commit đã duyệt”, còn task đã bind nhận nonce qua bridge bearer riêng và ghi commit SHA hợp lệ; ticket mới sang chờ duyệt deploy. Replay cùng SHA trả kết quả idempotent, không tạo audit thứ hai.',
      'Danny duyệt deploy chỉ là xác nhận quyền phát hành cho đúng commit/manifest. Inbox không tự deploy, push, merge, accept hay close ticket; IDE release publisher mới có thể gửi receipt sau khi production đã chạy.',
      'IDE release publisher chỉ được gửi metadata release bất biến sau khi production đã chạy, bằng bearer token riêng; server tự đối chiếu manifest review (job/source/plan/base commit/hash bản diff/files/tests), approval code/test hiện hành, approval commit và deploy gắn đúng manifest, nội dung commit thật trong Git và release API/web Production. Candidate có thể nối sau một hotfix control-plane chỉ khi base là ancestor, hotfix xen giữa không chạm bất kỳ file reviewed nào và hash diff từ parent trực tiếp của candidate vẫn khớp; các trường hợp khác bị từ chối. Native IDE job ở deploy-review được phép giữ projection `APPROVED` hoặc `IN_PROGRESS`; owner khác hoặc trạng thái khác đều bị từ chối. Thiếu, cũ, sai hoặc không có quyền phải từ chối không ghi gì; không backfill, reconciliation hay tái dùng approval. Một giao dịch ghi job/resolution/audit nguồn IDE/checkpoint/comment/thông báo rồi chuyển chờ người báo nghiệm thu; retry cùng receipt không nhân đôi, receipt cũ không áp lại sau reopen. Publisher không chạy worker, commit, push, deploy, đóng hay nghiệm thu ticket.',
      'Sau release đã xác minh, người báo là người nghiệm thu mặc định. Ticket/audit/next action/Inbox notification được thay đổi cùng transaction; người báo yêu cầu sửa thêm phải quay lại Agent phân tích và cần approval mới.',
    ],
    rationale:
      'Tự động hóa phải giảm thao tác lặp lại nhưng không được vượt qua cổng quyết định của Danny hay làm mất bằng chứng review trước commit/deploy.',
    examples: [
      'Plan/source khớp và Danny bấm Duyệt code/test: Inbox tạo IDE handoff; Codex IDE chạy code/test và gửi receipt một lần, rồi Inbox chờ duyệt commit.',
      'Receipt đến với nonce cũ hoặc source/plan khác: server từ chối, không tạo audit/comment/notification và không thay đổi ticket.',
    ],
    tags: ['mOS Inbox', 'Codex IDE', 'implementation', 'handoff', 'Danny approval', 'receipt', 'commit review'],
    routeScopes: ['/dashboard/bug-reports'],
    status: 'ACTIVE',
    version: '1.34.0',
    effectiveFrom: '2026-09-07',
    sources: [
      {
        label: 'IDE release evidence and atomic checkpoint',
        reference: 'apps/api/src/modules/bug-reports/inbox-ide-release.service.ts',
      },
      {
        label: 'IDE latest-review rejection and approval regression tests',
        reference: 'apps/api/src/modules/bug-reports/inbox-ide-release.test.ts',
      },
      {
        label: 'Implementation gate and durable job',
        reference: 'apps/api/src/modules/bug-reports/inbox-implementation.service.ts',
      },
      {
        label: 'Managed local Codex App Server provisioner, launchd runtime and replay ledger',
        reference: 'scripts/ide-task-provisioner.ts',
      },
      {
        label: 'Versioned native-plan event and outbox retry',
        reference: 'apps/api/src/modules/bug-reports/inbox-plan.service.ts',
      },
      { label: 'IDE-only worker dispatch guard', reference: 'scripts/request-classifier-worker.ts' },
      {
        label: 'Verified IDE publisher receipt and retry tests',
        reference: 'scripts/request-classifier-worker.test.ts',
      },
      {
        label: 'Exact Game BK private visual-QA recovery guard',
        reference: 'apps/api/src/modules/bug-reports/inbox-implementation.service.ts',
      },
    ],
  },
  {
    id: 'UI-009',
    book: 'SYSTEM',
    title: 'Nhật ký Experience & Reliability phải tách khỏi luồng người báo',
    summary:
      'Sự cố trải nghiệm và hạ tầng được ghi append-only để vận hành cải thiện dần, nhưng người báo chỉ thấy trạng thái và hành động tiếp theo đơn giản.',
    commandments: [
      'Journal chỉ nhận metadata đã lọc: nhóm UX/INFRA, mức độ, component, mã, fingerprint, tham chiếu ticket/job/release và tóm tắt an toàn. Không ghi prompt, attachment, stdout/stderr thô, token, mật khẩu hoặc đường dẫn máy nội bộ.',
      'Mỗi occurrence là bản ghi append-only có retention hữu hạn; fingerprint là bản tổng hợp riêng để gộp tần suất và triage. Triage không được sửa, xóa hoặc làm mất event gốc.',
      'Chỉ Admin được đọc hoặc triage Journal. Reporter-facing Inbox không hiển thị retry, log hoặc nguyên nhân hạ tầng; nó chỉ nói trạng thái có nghĩa và hành động kế tiếp.',
      'Nếu không thể lọc hoặc xác minh dữ liệu event, bỏ metadata nghi ngờ và giữ tóm tắt an toàn thay vì lưu log thô.',
    ],
    rationale:
      'Độ mượt của hệ thống cần dữ liệu tích lũy để ưu tiên sửa lỗi, nhưng quan sát nội bộ không được làm lộ dữ liệu hoặc biến thành gánh nặng cho người báo.',
    examples: [
      'Một deploy timeout tạo occurrence INFRA đã lọc, gộp theo fingerprint để vận hành triage; người báo chỉ nhận được cập nhật mOS đang xử lý.',
    ],
    tags: ['mOS Inbox', 'reliability', 'observability', 'retention', 'privacy'],
    routeScopes: ['/dashboard/bug-reports'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-04',
    sources: [
      {
        label: 'Experience & Reliability Journal service',
        reference: 'apps/api/src/modules/experience-journal/experience-journal.service.ts',
      },
      { label: 'Internal Journal routes', reference: 'apps/api/src/modules/experience-journal/routes.ts' },
    ],
  },
  {
    id: 'UI-008',
    book: 'SYSTEM',
    title: 'Thời gian Agent phải tách khỏi thời gian chờ của con người',
    summary:
      'Mỗi ticket Inbox phải cho thấy rõ Agent thực sự làm việc bao lâu; thời gian chờ người báo, Danny hoặc hàng đợi hệ thống không được gộp vào AI execution time.',
    commandments: [
      'AI execution time chỉ là tổng các đoạn Agent đang active: phân tích/plan, code và test, retry/sửa lỗi, deploy, và xác minh sau deploy tới khi sẵn sàng nghiệm thu.',
      'WAITING_REPORTER, WAITING_DANNY, SYSTEM_QUEUE và BLOCKED được lưu, hiển thị và tính riêng; không được làm số giờ Agent bị phình lên.',
      'Mỗi đoạn thời gian phải có giờ server bắt đầu/kết thúc, loại giai đoạn và outcome; job thiếu mốc kết thúc phải được đánh dấu đang chạy hoặc không đủ dữ liệu, không được suy diễn là Agent làm liên tục.',
      'Timeline ticket và dashboard tuần/tháng phải dùng cùng dữ liệu server-authoritative; dashboard nêu rõ ticket nào tốn thời gian Agent nhiều nhất, cùng median và p95 theo loại/giai đoạn.',
      'Telemetry thời gian chỉ chứa metadata vận hành; không lưu prompt, nội dung ticket, ảnh đính kèm, token hoặc bí mật môi trường.',
    ],
    rationale:
      'Danny cần biết chính xác nút thắt nằm ở Agent, ở thời gian chờ quyết định hay ở hạ tầng để cải thiện workflow bằng bằng chứng thay vì cảm giác.',
    examples: [
      'Agent code/test 18 phút, chờ Danny duyệt commit 2 giờ và deploy/xác minh 7 phút: AI execution time là 25 phút; Danny wait là 2 giờ.',
      'Job nằm trong hàng đợi 6 phút trước khi worker bắt đầu: 6 phút đó thuộc System wait, không phải Agent active time.',
    ],
    exceptions: [
      'Dữ liệu lịch sử không có mốc đáng tin phải hiển thị là ước tính hoặc không có dữ liệu; không được tạo độ chính xác giả.',
    ],
    tags: ['mOS Inbox', 'AI execution time', 'thời gian Agent', 'queue', 'approval', 'deploy', 'observability'],
    routeScopes: ['/dashboard/bug-reports'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-03',
    sources: [
      { label: 'Backlog được Danny chốt', reference: 'MOS-FEAT-23' },
      {
        label: 'Vòng đời implementation job hiện có',
        reference: 'apps/api/src/modules/bug-reports/inbox-implementation.service.ts',
      },
      {
        label: 'Health và thời gian job do server chốt',
        reference: 'apps/api/src/modules/bug-reports/request-classifier-worker-health.service.ts',
      },
    ],
  },
  {
    id: 'WS-001',
    book: 'SERVICE',
    title: 'Thực đơn Workshop: Danh mục món hiển thị động theo dữ liệu thực tế',
    summary:
      'Các phân loại thực đơn Workshop (Nước uống, Món chính, Tráng miệng...) tự động hiển thị hoặc ẩn hoàn toàn theo danh sách món hiện có. Khi không phục vụ một nhóm món, người quản lý chỉ cần xóa các món trong nhóm đó.',
    commandments: [
      'Các nhóm thực đơn (JUICE, MAIN_COURSE, DESSERT...) chỉ hiển thị trên giao diện quản trị và trang đăng ký khi có ít nhất một món thuộc nhóm đó.',
      'Để bỏ một nhóm thực đơn (như Tráng miệng), người vận hành tự vào tab Thực đơn của Workshop và bấm Xóa các món thuộc nhóm đó thay vì báo lỗi hệ thống.',
      'Hệ thống lưu giữ đầy đủ lựa chọn thực đơn lịch sử của học viên đã đăng ký trước đó để đối soát nhà hàng; việc xóa món khỏi thực đơn hiện tại không làm mất dữ liệu lịch sử.',
      'Tuyệt đối không tạo ticket báo lỗi kỹ thuật khi yêu cầu thực tế chỉ là thao tác dữ liệu cấu hình thực đơn có sẵn.',
    ],
    rationale:
      'Hệ thống Workshop được thiết kế dạng dữ liệu động (data-driven), trao toàn quyền chủ động cho Host cấu hình linh hoạt danh mục phục vụ mà không cần can thiệp mã nguồn.',
    examples: [
      'Workshop Bí Kíp Nối Mi Triệu Đồng không phục vụ tráng miệng: Quản lý chỉ cần xóa món "Trái cây theo mùa" trong tab Thực đơn, mục Tráng miệng sẽ tự động biến mất trên cả giao diện quản trị và biểu mẫu đăng ký học viên.',
    ],
    tags: ['workshop', 'academy', 'thực đơn', 'menu', 'tráng miệng', 'xóa món', 'món ăn'],
    routeScopes: ['/dashboard/academy-leads/workshops'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-30',
    sources: [
      {
        label: 'Academy Workshop Menu Manager',
        reference: 'apps/web/app/dashboard/academy-leads/components/AcademyWorkshopMenuManager.tsx',
      },
      {
        label: 'Academy Workshop Service',
        reference: 'apps/api/src/modules/academy-workshops/academy-workshop.service.ts',
      },
    ],
  },
  {
    id: 'CAREER-QA-001',
    book: 'PEOPLE',
    title: 'Kiểm Định QA/QC Tác Phong & Phòng Nối Mi Trong Lộ Trình Thăng Tiến CV',
    summary:
      'Để đủ điều kiện nâng cấp (CV lên CV+, CV++), kỹ thuật viên CV bắt buộc phải chủ động mời QA/QC kiểm tra tác phong bản thân và phòng nối mi định kỳ ít nhất 1 lần/tuần. Nếu có bài kiểm tra FAILED, nhân viên bị khóa quyền nâng cấp.',
    commandments: [
      'Chủ động mời QA/QC kiểm tra định kỳ: Kỹ thuật viên CV phải chủ động sắp xếp và mời QA/QC kiểm tra tác phong bản thân và phòng nối mi ít nhất 1 lần mỗi tuần trong suốt chu kỳ xét thăng cấp.',
      'Nội dung kiểm tra song song hai hạng mục: (1) Tác phong bản thân (đồng phục, đầu tóc, vệ sinh móng tay, khẩu trang, giao tiếp) và (2) Phòng nối mi cá nhân (giường, đèn chiếu sáng không dính keo/mi, khay dụng cụ khử trùng chuẩn, nhíp sạch, không đồ cá nhân).',
      'Cổng kiểm soát chất lượng tuyệt đối (Hard Gatekeeper): Nếu có bất kỳ bài kiểm tra nào bị FAILED hoặc không đạt tần suất tối thiểu 1 lần/tuần, nhân viên lập tức bị KHÓA QUYỀN NÂNG CẤP, không được mở Ải Trùm Cuối và không được duyệt thăng hạng.',
      'Duy trì liên tục: Khi đã thăng cấp lên CV+ hoặc CV++, kỹ thuật viên vẫn phải duy trì kiểm định QA/QC định kỳ hàng tuần; vi phạm kiểm định là căn cứ xem xét giáng cấp.',
    ],
    rationale:
      'Tay nghề kỹ thuật và doanh số tự bán combo chỉ có giá trị bền vững khi đi kèm kỷ luật tác phong và chuẩn mực vệ sinh phòng nối mi. Quy định này đảm bảo khách hàng luôn được phục vụ trong không gian sạch sẽ, an toàn và chuyên nghiệp nhất.',
    examples: [
      'CV hoàn thành vượt chỉ tiêu số ca, tip và combo nhưng trong 12 tuần chỉ mời QA kiểm tra 8 lần (< 1 lần/tuần): Hệ thống báo Chưa đủ tần suất kiểm định QA/QC, khóa quyền thăng cấp cho đến khi đạt đủ tuần kiểm tra.',
      'CV có bài kiểm tra bị FAILED do đèn mi dính keo hoặc không chuẩn tác phong: Toàn bộ tiến trình nâng cấp bị đóng băng, bắt buộc rèn luyện lại và kiểm định đạt chuẩn.',
    ],
    tags: [
      'career',
      'progression',
      'thăng tiến',
      'CV',
      'CV+',
      'CV++',
      'QA',
      'QC',
      'tác phong',
      'phòng nối mi',
      'kiểm tra',
    ],
    routeScopes: ['/dashboard/career-path'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-10-01',
    sources: [
      {
        label: 'Career Progression Service',
        reference: 'apps/api/src/modules/career/career.service.ts',
      },
      {
        label: 'Career Path Simulation',
        reference: 'apps/web/app/dashboard/career-path/page.tsx',
      },
    ],
  },
];

export function getMosBibleBook(bookKey: MosBibleBookKey): MosBibleBook {
  const book = MOS_BIBLE_BOOKS.find((candidate) => candidate.key === bookKey);
  if (!book) throw new Error(`Unknown mOS Bible book: ${bookKey}`);
  return book;
}

export function normalizeMosBiblePathname(pathname: string): string {
  const cleanPath = pathname.split(/[?#]/, 1)[0] || '/dashboard';
  if (cleanPath === '/') return cleanPath;
  return cleanPath.replace(/\/+$/, '');
}

export function isMosBibleCommandmentRelevant(commandment: MosBibleCommandment, pathname: string): boolean {
  const normalizedPath = normalizeMosBiblePathname(pathname);
  return commandment.routeScopes.some((scope) => {
    const normalizedScope = normalizeMosBiblePathname(scope);
    return normalizedPath === normalizedScope || normalizedPath.startsWith(`${normalizedScope}/`);
  });
}

export function getMosBibleCommandmentsForPath(pathname: string): readonly MosBibleCommandment[] {
  return MOS_BIBLE_COMMANDMENTS.filter(
    (commandment) => commandment.status === 'ACTIVE' && isMosBibleCommandmentRelevant(commandment, pathname)
  );
}

export function filterMosBibleCommandments(
  commandments: readonly MosBibleCommandment[],
  searchText: string,
  book: MosBibleBookKey | 'ALL' = 'ALL'
): readonly MosBibleCommandment[] {
  const normalizedQuery = removeVietnameseTones(searchText);

  return commandments.filter((commandment) => {
    if (book !== 'ALL' && commandment.book !== book) return false;
    if (!normalizedQuery) return true;

    const searchableText = [
      commandment.id,
      getMosBibleBook(commandment.book).label,
      commandment.title,
      commandment.summary,
      commandment.rationale,
      ...commandment.commandments,
      ...(commandment.examples ?? []),
      ...(commandment.exceptions ?? []),
      ...commandment.tags,
      ...commandment.sources.flatMap((source) => [source.label, source.reference]),
    ].join(' ');

    return removeVietnameseTones(searchableText).includes(normalizedQuery);
  });
}
