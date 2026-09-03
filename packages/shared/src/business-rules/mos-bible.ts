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
      'Điều răn cũ không bị xóa âm thầm: chuyển sang Revised hoặc Retired và dẫn tới phiên bản thay thế.',
    ],
    rationale: 'AI, nhân viên và mã nguồn cần cùng trỏ về một ý nghĩa để báo cáo không diễn giải khác nhau.',
    examples: ['Thay đổi cách tính Missed phải cập nhật service KPI và Điều răn BK-002 trong cùng một thay đổi.'],
    tags: ['single source of truth', 'AI', 'quản trị', 'thay đổi nghiệp vụ'],
    routeScopes: ['/dashboard'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-02',
    sources: [
      { label: 'Quy tắc hợp nhất business logic', reference: 'AGENTS.md · Rule #11' },
      { label: 'Hướng dẫn phát triển', reference: 'docs/DEVELOPMENT.md' },
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
      'CC Tip là 20% tổng tip của đơn Completed; hai CC khác nhau nhận 10% mỗi người.',
      'Thưởng thực tế ưu tiên đọc staff_bonus; công thức chỉ là fallback khi ledger hợp lệ bị thiếu.',
      'Tổng trên leaderboard phải khớp từng đồng với tổng chi tiết ca làm.',
    ],
    rationale:
      'Check-in và checkout đều là phần của trải nghiệm; ledger phải ghi nhận đúng phần việc mà không nhân đôi tiền.',
    tags: ['CC', '50/50', 'tip', 'staff_bonus', 'ledger'],
    routeScopes: ['/dashboard/cc', '/dashboard/kpi'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-02',
    sources: [
      { label: 'CC Gamification', reference: 'AGENTS.md · Rules #6, #7, #12' },
      { label: 'Hằng số thưởng', reference: 'packages/shared/src/constants/system-constants.ts' },
    ],
  },
  {
    id: 'CC-003',
    book: 'REWARDS',
    title: 'CC có thưởng ngày, không có thưởng doanh số tháng',
    summary: 'Thu nhập CC gồm thưởng ca, thưởng doanh số theo ngày và tip; không tự sinh hoa hồng chốt tháng.',
    commandments: [
      'Chỉ ghi nhận Thưởng Ca Làm CC Xoay, CC Daily Bonus và CC Tip theo nguồn đã chốt.',
      'Daily Bonus có bốn danh mục: Combo mới, sản phẩm, thu nợ và nâng cấp Combo.',
      'Không cộng thêm Monthly Sales Bonus hoặc nhân tỷ lệ trên doanh số tháng.',
      'Wheel Bonus mỗi tháng không vượt 1,5 lần tổng CC Daily Bonus cùng tháng.',
    ],
    rationale:
      'Ranh giới khoản thưởng giúp paystub và leaderboard không phát sinh một chính sách lương chưa được phê duyệt.',
    tags: ['CC', 'daily bonus', 'không thưởng tháng', 'wheel cap'],
    routeScopes: ['/dashboard/cc', '/dashboard/kpi'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-02',
    sources: [{ label: 'Chính sách thu nhập CC', reference: 'AGENTS.md · Rules #45, #49, #50' }],
  },
  {
    id: 'FAL-001',
    book: 'REWARDS',
    title: 'FAL tách lỗi cũ và công mới thành hai ledger',
    summary: 'Fix, Adjust, Log và Replace phải tách trách nhiệm ca gốc khỏi công sức của ca xử lý mới.',
    commandments: [
      'Adjust thu hồi 100% điểm/thưởng CC ca gốc; CV ca gốc giữ nguyên. Fix làm điều ngược lại: thu hồi CV ca gốc, CC giữ nguyên.',
      'Ca Fix/Adjust/Log mới có thời lượng dương không quá 25 phút: CV nhận 15 Chuối, CC nhận tổng 5 Chuối và vào tua đầu.',
      'Ca mới trên 25 phút chạy như Normal ở tua cuối; thời lượng bằng 0 hoặc thiếu dữ liệu phải rà soát.',
      'Log không phạt ca gốc; thưởng Log mới chỉ chốt sau khi Admin hoặc Quản lý/CHO duyệt giải trình.',
      'Replace tính thưởng Full theo bộ mi mới và áp dụng quy tắc thu hồi kỹ thuật riêng cho CV ca gốc.',
    ],
    rationale:
      'Trách nhiệm sửa lỗi và công lao xử lý lại là hai sự kiện khác nhau, kể cả khi cùng một người xuất hiện ở cả hai.',
    tags: ['FAL', 'Fix', 'Adjust', 'Log', 'Replace', 'Chuối'],
    routeScopes: ['/dashboard/fal', '/dashboard/cv', '/dashboard/cc', '/dashboard/kpi'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-02',
    sources: [{ label: 'Ledger FAL', reference: 'AGENTS.md · Rule #13' }],
  },
  {
    id: 'COMBO-001',
    book: 'CUSTOMER',
    title: 'Combo bán mới và Combo Live không phải một phép màu',
    summary: 'Combo bán mới cần giao dịch Completed; Combo Live là gói đã tồn tại và còn hiệu lực trước lúc khách làm.',
    commandments: [
      'Đơn bán Combo chuẩn phải Completed, có chi tiết Combo hợp lệ và cập nhật user_service_balance.',
      'Loại trừ package key chứa single, refill hoặc balance khỏi nhận diện Combo bán mới.',
      'Combo Live chỉ hợp lệ khi số dư đã tồn tại trước thời điểm dịch vụ, còn hạn và còn lượt theo transaction gần nhất.',
      'Combo Live Completed cho Booker 1.000đ cố định thay tier giảm giá và UI phải hiện “Combo Live”.',
    ],
    rationale: 'Bán một gói mới và phục vụ trên gói cũ tạo ra hai loại doanh số và khoản thưởng khác nhau.',
    tags: ['Combo', 'Combo Live', 'Completed', 'user_service_balance'],
    routeScopes: ['/dashboard/customers', '/dashboard/loca', '/dashboard/nyc', '/dashboard/cc', '/dashboard/bk'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-09-02',
    sources: [
      { label: 'Nhận diện Combo tập trung', reference: 'AGENTS.md · Rule #21' },
      {
        label: 'Service chuẩn',
        reference: 'apps/api/src/modules/customers/services/combo-recognition.service.ts',
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
    version: '1.2.0',
    effectiveFrom: '2026-09-03',
    sources: [
      {
        label: 'Inbox follow-up source of truth',
        reference: 'apps/api/src/modules/bug-reports/inbox-follow-up.service.ts',
      },
      { label: 'Visible review transition', reference: 'apps/api/src/modules/bug-reports/bug-report.service.ts' },
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
    version: '1.1.0',
    effectiveFrom: '2026-09-03',
    sources: [
      {
        label: 'Server-authoritative health service',
        reference: 'apps/api/src/modules/bug-reports/request-classifier-worker-health.service.ts',
      },
      { label: 'Outbound worker telemetry contract', reference: 'scripts/request-classifier-worker.ts' },
      {
        label: 'Inbox worker health card',
        reference: 'apps/web/app/dashboard/bug-reports/components/RequestClassifierWorkerHealthCard.tsx',
      },
    ],
  },
  {
    id: 'UI-007',
    book: 'SYSTEM',
    title: 'Inbox implementation phải có cổng commit và deploy tách biệt',
    summary:
      'Codex CLI chỉ được chạy code/test sau phê duyệt implementation riêng của Danny, trong worktree tách biệt và theo đúng source/plan version; commit và deploy là hai cổng Danny riêng, có action UI khớp trạng thái server.',
    commandments: [
      'APPROVED triage không tự là quyền chạy code: Danny phải thực hiện hành động Duyệt code/test riêng, ticket phải READY, có priority và có native plan khớp source version.',
      'Approval event được lưu bền và idempotent theo source + event kind; worker fallback chỉ phục hồi delivery của approval đã có, không tạo quyền duyệt hoặc ticket scheduler mới.',
      'Mỗi implementation job có lease token/worker identity/PID, heartbeat server-time chỉ khi Codex process thật sự còn sống, idempotency theo source/plan version, một active job mỗi ticket và một permit build toàn cục mặc định cho Mac worker.',
      'Worker chỉ dùng worktree/branch riêng từ workspace tin cậy; không sửa primary checkout. Sau khi Danny bấm Duyệt commit, worker chỉ được stage danh sách tệp review bất biến và commit vào branch riêng; không push, merge, deploy, migration hay sửa production.',
      'Chỉ khi CLI thật sự bắt đầu ticket mới chuyển sang IMPLEMENTING. Kết quả thành công phải ghi native review gồm diff/file/test/risk đã lọc và chuyển sang chờ Danny duyệt commit.',
      'Bàn giao release là hai bằng chứng riêng: worker lưu commit SHA từ cổng commit, rồi khi Danny xác nhận deploy server chỉ cho chuyển tiếp nếu commit đó chính là hoặc là tổ tiên của release marker production đang chạy. Release marker một mình không chứng minh code của ticket đã được deploy.',
      'Sau khi release được xác minh, người báo/yêu cầu ticket là người nghiệm thu mặc định; Danny chỉ nghiệm thu khi chính Danny là người báo. Người báo có thể đạt hoặc yêu cầu sửa thêm; cả hai quyết định phải cập nhật job, ticket, audit và notification trong cùng giao dịch.',
      'Người báo chọn yêu cầu sửa thêm là phản hồi mới, không phải quyền chạy code: ticket phải quay về Agent phân tích, giữ nguyên bằng chứng cũ, xoá xác nhận làm rõ cũ và chỉ được tạo implementation job mới sau khi requirement/tiêu chí nghiệm thu được xác nhận lại và Danny duyệt riêng.',
      'Từ pha code/test trở đi, Inbox phải suy ra tiến độ và bước tiếp theo từ implementation job bền vững do server trả về. Job FAILED, STALE hoặc EXPIRED phải hiện rõ worker đã dừng an toàn và cần Danny quyết định retry; AWAITING_COMMIT_REVIEW phải có nút Duyệt commit, còn AWAITING_DEPLOY_REVIEW phải hiện rõ chờ Danny xác nhận deploy. Không dùng nhãn ticket chung để che outcome job.',
      'Inbox serialise progress và chủ nhân bước tiếp theo trong cùng một server workflow projection. Frontend chỉ render projection này; không được tự đổi chặng từ status, clarification hoặc cache cục bộ.',
      'Worker chỉ lưu bằng chứng vận hành đã lọc (pha, thời điểm tiến triển, số checkpoint), không lưu prompt, nội dung ticket hay stdout/stderr Codex. Sau 10 phút không có bằng chứng mới phải hiện cảnh báo; sau 20 phút không có bằng chứng mới phải dừng an toàn và giữ worktree.',
      'Một phiên code/test mặc định tối đa 45 phút. Khi còn có bằng chứng tiến triển, worker được tự tiếp tục đúng một chặng checkpoint trong cùng worktree và cùng approval; sau đó phải dừng an toàn để Danny quyết định. Không checkpoint nào cho phép commit, push, merge hoặc deploy tự động.',
      'Timeout, lease cũ, source hoặc plan stale phải dừng an toàn, giữ worktree để review/retry và không tạo comment hoặc worktree trùng. Retry sau terminal failure chỉ có thể do Danny xác nhận riêng, tối đa hai retry cho cùng source/plan: mỗi retry tạo job/branch/worktree mới liên kết immutable với job terminal ngay trước đó, recheck approval/source/plan trước worktree, prelaunch và result, rồi dừng trước commit. Restart chỉ reclaim lease stale khi không còn Codex PID đã đăng ký sống; worker preflight CLI thật trong môi trường launchd, quản lý process group và terminate group khi timeout/lease failure để không bỏ orphan. Recovery chỉ giữ nguyên active-job pointer khi nó trỏ đúng cùng job; pointer khác là hard stop. Worktree chờ review được giữ tối thiểu 30 ngày; không có cleanup scheduler tự xóa branch chờ duyệt.',
    ],
    rationale:
      'Tự động hóa phải giảm thao tác lặp lại nhưng không được vượt qua cổng quyết định của Danny hay làm mất bằng chứng review trước commit/deploy.',
    examples: [
      'MOS-BUG-16 có plan/source khớp và Danny bấm Duyệt code/test: worker tạo một worktree, chạy CLI, đăng diff/test an toàn rồi chờ duyệt commit.',
      'Người báo đổi scope sau duyệt: source version không khớp, job cũ STALE và không được chạy hoặc đăng kết quả cũ.',
    ],
    tags: ['mOS Inbox', 'Codex CLI', 'implementation', 'worktree', 'Danny approval', 'lease', 'commit review'],
    routeScopes: ['/dashboard/bug-reports'],
    status: 'ACTIVE',
    version: '1.13.0',
    effectiveFrom: '2026-09-04',
    sources: [
      {
        label: 'Implementation gate and durable job',
        reference: 'apps/api/src/modules/bug-reports/inbox-implementation.service.ts',
      },
      {
        label: 'Versioned native-plan event and outbox retry',
        reference: 'apps/api/src/modules/bug-reports/inbox-plan.service.ts',
      },
      { label: 'Outbound isolated-worktree worker', reference: 'scripts/request-classifier-worker.ts' },
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
