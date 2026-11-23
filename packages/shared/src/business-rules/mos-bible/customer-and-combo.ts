import type { MosBibleCommandment } from '../../types/mos-bible.js';

export const MOS_BIBLE_CUSTOMER_AND_COMBO_COMMANDMENTS: readonly MosBibleCommandment[] = [
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
      'Quy tắc Combo Mi Dưới (LashesUnder) - Bán được tính thưởng nhưng KHÔNG tính Active Combo / Combo Live: Gói combo mi dưới khi bán thành công (đơn Completed) VẪN ĐƯỢC TÍNH là 1 gói combo bán được vào doanh số, KPI và hoa hồng thưởng bậc thang của nhân sự; TUY NHIÊN, gói combo mi dưới TUYỆT ĐỐI KHÔNG được tính vào Active Combo hoặc Combo Live của khách hàng. Khách hàng chỉ sở hữu gói mi dưới khi đặt lịch làm dịch vụ mi chính VẪN LÀ KHÁCH HÀNG LẺ (NOT_COMBO_LIVE), tiếp tục nằm trong mẫu số tiềm năng để Chuyên Viên tư vấn gói combo mi trên.',
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
    id: 'COMBO-002',
    book: 'CATALOG',
    title: 'Hệ thống 13 Dòng Mi Combo, Khóa Gói Welcome Ngày Đầu & Tự Động Hạch Toán Ví Gói',
    summary:
      'Toàn bộ 13 dòng mi Combo tích hợp nội bộ tại mOS; khớp đúng dòng mi & số sợi tại Checkout, khóa gói Welcome (2 tặng 1) sau ngày đầu tiên, trừ ngay buổi đầu khi mua gói và tách bạch hạch toán Lượt Mua vs Lượt Tặng (0đ).',
    commandments: [
      '1. Khớp đúng dòng mi & số sợi tại Checkout (Smart Matching): Màn hình Checkout (/ios-app) bắt buộc tự động nhận diện đúng dòng mi (Classic & Volume 2D, Flawless Mink, HyperLight 2X..5X, IvyLight 3L..5L, UltraLight 3D..5D) và đúng mã số sợi/trụ mà khách vừa làm để gợi ý chính xác bảng giá gói (2 tặng 1, 4 tặng 1, 4 tặng 2, 7 tặng 3, 7 tặng 6, 10 tặng 6, 10 tặng 10, VVIP Pass); tuyệt đối không hiển thị gói mẫu cố định lệch dịch vụ.',
      '2. Quy tắc Gói Welcome (2 tặng 1) — Chỉ Mở Duy Nhất Ngày Đầu Tiên: Gói 2 tặng 1 (Welcome) chỉ được mở bán cho khách hàng trong ngày đầu tiên sử dụng dịch vụ tại Wings (customerVisits <= 1 và chưa có lịch sử làm mi những ngày trước). Qua ngày hôm sau hoặc từ lần ghé thứ 2 trở đi, hệ thống tự động khóa gói 2 tặng 1.',
      '3. Mua Gói Mới Tại Checkout — Trừ Ngay Buổi Đầu Tiên Vào Gói: Khi khách quyết định mua gói Combo ngay tại bước Checkout của ca làm, buổi làm mi hôm nay được trừ luôn làm buổi đầu tiên (1 Paid New) của gói vừa mua. Khách chỉ thanh toán đúng tiền gói Combo (miễn thu tiền lẻ buổi hôm nay).',
      '4. Hạch Toán Kế Toán Ví Gói (FIFO Paid vs Bonus 0đ): Ví gói khách hàng tách bạch Lượt Mua (combo_new_count, combo_refill_count) và Lượt Tặng kèm (bonus_new_count, bonus_refill_count giá 0đ). Khi khách dùng gói, hệ thống ưu tiên trừ Lượt Mua trước (ghi nhận doanh thu thực hiện theo đơn giá chuẩn New/Refill từ quỹ doanh thu chờ phân bổ Deferred Revenue); sau khi hết Lượt Mua mới trừ đến Lượt Tặng với giá trị hạch toán 0đ.',
      '5. Quy Đổi Linh Hoạt & Tự Động Tính Phụ Thu (Refill -> New & Up-size Volume): Nếu ví gói của khách chỉ còn lượt Dặm (Refill) nhưng khách làm Nối Mới (hoặc quá chu kỳ 25 ngày), hệ thống cho phép trừ 1 lượt Refill trong gói và tự động cộng phụ thu chênh lệch (Giá New - Giá Refill). Nếu khách nâng cấp số sợi (Up-size Volume) hoặc đổi lên dòng mi cao hơn, hệ thống trừ 1 lượt gói và tự động cộng phụ thu chênh lệch đơn giá.',
      '6. Thưởng Tiền Tươi Chốt Combo Cho CV🪶 / 🪶CV🪶: Tính tự động theo công thức tối giản hóa (Điều răn CV-002): Tổng giá trị đơn Combo < 2M thưởng 50.000đ; mỗi 1M kế tiếp (từ 2M trở lên) cộng thêm +50.000đ (2M-<3M: 100.000đ, 3M-<4M: 150.000đ, 4M-<5M: 200.000đ...). Nếu khách mua 2 gói Combo cùng 1 lúc trong cùng 1 đơn thanh toán (ví dụ Combo Mi Trên + Combo Mi Dưới cùng order_id), bắt buộc cộng gộp tổng tiền 2 gói lại trước rồi mới áp công thức tính thưởng 1 lần duy nhất.',
    ],
    rationale:
      'Thay thế hoàn toàn trang tra cứu rời rạc bên ngoài bằng nguồn chân lý duy nhất trong mOS, ngăn chặn việc chọn nhầm gói tại quầy/giường và tự động hóa 100% kế toán doanh thu chờ phân bổ cũng như phụ thu nâng cấp.',
    tags: [
      'Combo Catalog',
      '13 dòng mi',
      '2 tặng 1',
      'Welcome',
      'hạch toán combo',
      'trừ gói',
      'phụ thu nâng cấp',
      'Deferred Revenue',
      'FIFO',
      'VVIP Pass',
    ],
    routeScopes: ['/dashboard/catalog', '/ios-app', '/dashboard/customers', '/dashboard/appointments'],
    status: 'ACTIVE',
    version: '1.1.0',
    effectiveFrom: '2026-11-12',
    sources: [
      {
        label: 'Wings Combo Catalog & Accounting Engine',
        reference: 'packages/shared/src/catalog/wings-combo-catalog.ts',
      },
      {
        label: 'Bàn Tư Vấn & So Sánh 13 Dòng Mi (/dashboard/catalog)',
        reference: 'apps/web/app/dashboard/catalog/components/CatalogComboConsultTab.tsx',
      },
      {
        label: 'Smart Combo Checkout & Upsell (/ios-app)',
        reference: 'apps/web/app/ios-app/components/screens/Screen11ProductUpsell.tsx',
      },
    ],
  },
  {
    id: 'COMBO-003',
    book: 'CUSTOMER',
    title:
      'Bộ Ba Ký Hiệu Chuẩn Combo Toàn Hệ Thống: ❖ Gói Combo · ✦ Nối mới · ↻ Dặm & Phân Định Tuyệt Đối Với Ví Kim Cương 💎',
    summary:
      'Toàn bộ hệ sinh thái mOS bắt buộc dùng ký hiệu ❖ (Gói Combo, thay thế chữ "Combo"), ✦ (Nối mới) và ↻ (Dặm); cấm tuyệt đối dùng biểu tượng 💎 cho Combo để tránh nhầm lẫn với Ví Kim Cương.',
    commandments: [
      '1. Ký hiệu Gói Combo (❖ · Unicode U+2756 · Hoa thoi 4 cánh): Biểu tượng duy nhất đại diện cho Gói Combo (thay thế hoàn toàn chữ "Combo" dài dòng gây tràn dòng trên màn hình hẹp, card và hóa đơn). Ví dụ: "❖ 5 lần HyperLight 770", "❖ (10+6) · Volume".',
      '2. Ký hiệu Nối Mới (✦ · Full Set): Đại diện duy nhất cho số suất Nối mới (normal_count / paid_new / bonus_new).',
      '3. Ký hiệu Dặm Mi (↻ · Retouch / Refill): Đại diện duy nhất cho số suất Dặm bảo hành/Dặm định kỳ (retain_count / paid_refill / bonus_refill).',
      '4. Cấm tuyệt đối dùng icon 💎 cho Combo: Biểu tượng 💎 chỉ được phép sử dụng duy nhất cho Ví Kim Cương (Loyalty Points, quy đổi 1 💎 = 1.000 VNĐ dùng để cấn trừ thanh toán hóa đơn). Mọi giao diện, bảng biểu, thẻ card và hóa đơn tuyệt đối không được gán 💎 vào số lượt Combo.',
      '5. Quy tắc hiển thị Unicode tối giản: Không dùng chữ rườm rà trên các nhãn card; hiển thị theo định dạng "✦ X · ↻ Y" (Ví dụ: "✦ 2 · ↻ 9").',
      '6. Quy tắc hiển thị cặp đôi luôn đầy đủ (The Pair Invariant): Mọi gói combo tại Wings luôn luôn được xem là một set đi liền [✦ Nối mới] và [↻ Dặm] theo định dạng "✦ X · ↻ Y" (Ví dụ: "✦ 4 · ↻ 0", "✦ 0 · ↻ 3"). Người dùng và Chuyên Viên không bao giờ phải suy nghĩ hay phỏng đoán một con số đơn lẻ đại diện cho loại suất nào.',
      '7. Quy tắc số 0 màu xám trung tính (Gray Zero Invariant): Khi một trong hai vế không có lượt làm (normal = 0 hoặc retain = 0), bắt buộc vẫn ghi rõ số 0 và áp dụng màu xám trung tính (text-neutral-500 font-bold) để biểu thị rõ ràng đã hết hoặc không có, trong khi vế còn lại (> 0) giữ màu sắc nhận diện nổi bật (✦ Vàng Gold / ↻ Xanh Cyan).',
    ],
    rationale:
      'Chữ "Combo" chiếm diện tích ngang lớn làm cắt cụt tên dịch vụ trên màn hình di động ("Combo 5 lần HyperLi..."). Đồng thời khách hàng và nhân viên thường xuyên nhầm lẫn giữa số lượt làm mi trong gói Combo và điểm số dư trong Ví Kim Cương. Bộ ba ký hiệu ❖ Gói Combo · ✦ Nối mới · ↻ Dặm tạo ra ngôn ngữ thị giác đẳng cấp, tinh gọn và chuẩn mực nhất trên toàn hệ sinh thái mOS. Việc luôn hiển thị đủ bộ cặp [✦ Nối · ↻ Dặm] với màu xám cho số 0 triệt tiêu hoàn toàn sự bối rối khi đọc số dư.',
    tags: [
      'Combo Canon',
      '❖ Gói Combo',
      '✦ Nối mới',
      '↻ Dặm',
      'Ví Kim Cương',
      '💎',
      'Ký hiệu chuẩn',
      'UI Invariant',
      'The Pair Invariant',
      'Gray Zero Invariant',
    ],
    routeScopes: [
      '/ios-app',
      '/dashboard/customers',
      '/dashboard/appointments',
      '/dashboard/catalog',
      '/dashboard/loca',
      '/dashboard/bk',
    ],
    status: 'ACTIVE',
    version: '1.1.0',
    effectiveFrom: '2026-11-07',
    sources: [
      {
        label: 'Kinh Thánh mOS · Điều răn COMBO-003',
        reference: 'packages/shared/src/business-rules/mos-bible.ts',
      },
      {
        label: 'Component ComboSessionBadge dùng chung',
        reference: 'apps/web/app/ios-app/components/ui-kit/ComboSessionBadge.tsx',
      },
      {
        label: 'Thẻ Khách hàng mOS & Hóa đơn nhiệt',
        reference: 'apps/web/app/ios-app/components/screens/Screen01IncomingBookings.tsx',
      },
    ],
  },
  {
    id: 'COMBO-004',
    book: 'CUSTOMER',
    title: 'Hạn Sử Dụng Gói Combo (HSD), Cộng Dồn Gia Hạn Sớm, Cứu Gói Hết Hạn & Bảo Lưu Admin',
    summary:
      'Mọi gói Combo (Combo Mi Trên & Combo Mi Dưới) đều quản lý chặt chẽ Hạn sử dụng (date_expired), nhịp độ (Avg: X ngày/buổi), khóa trừ 0đ khi hết hạn, tự động cộng dồn/thưởng gia hạn hoặc cứu buổi tồn khi mua gói mới, và chỉ Admin được phép Gia hạn / Bảo lưu.',
    commandments: [
      '1. Công Thức Tính HSD Khi Khách KHÔNG CÒN Combo & Mua Gói Mới: (a) Nếu trừ ngay 1 buổi vào gói mới hôm nay (USE_NEW_COMBO): HSD mới = Hôm nay + Thời hạn gói mới; (b) Nếu gói mới dùng 0 lần (hôm nay đi lẻ hoặc dùng Voucher - RETAIL_OR_VOUCHER): HSD mới = Hôm nay + Thời hạn gói mới + 21 ngày.',
      '2. Công Thức Tính HSD Khi Khách ĐANG CÒN Combo Còn Hạn & Mua Thêm Gói Mới: (a) Nếu gói mới dùng 1 lần (USE_NEW_COMBO): HSD mới = Thời hạn gói mới + Thời gian còn lại của gói cũ (= HSD cũ + Thời hạn gói mới); (b) Nếu gói mới dùng 0 lần và trừ 1 buổi vào gói cũ khi gói cũ còn >= 2 buổi (USE_OLD_COMBO): HSD mới = Thời hạn gói mới + Thời gian còn lại của gói cũ + 1 tháng thưởng mua sớm; (c) Nếu gói mới dùng 0 lần và gói cũ dùng 0 lần, hôm nay đi lẻ hoặc dùng Voucher (RETAIL_OR_VOUCHER): HSD mới = Thời hạn gói mới + Thời gian còn lại của gói cũ + 1 tháng + 21 ngày; (d) Nhánh buổi cuối (combo_last): Khi gói cũ còn hạn chỉ còn đúng 1 buổi cuối và hôm nay trừ nốt về 0 rồi mua nối tiếp gói mới, thời gian dư gói cũ kết thúc và HSD mới = Hôm nay + Thời hạn gói mới + 1 tháng thưởng mua nối tiếp sớm.',
      '3. Xử Lý Gói Combo ĐÃ HẾT HẠN (date_expired < Hôm nay, còn buổi tồn > 0): (a) Nếu khách KHÔNG mua gói mới hôm nay: Khóa cứng trừ buổi 0đ (isComboLive = false, isExpired = true), khách bắt buộc đi lẻ hoặc dùng Voucher, hiển thị thẻ cảnh báo ĐỎ rõ ràng trên mOS iOS App; (b) Nếu khách MUA thêm gói Combo mới hôm nay: Tự động cứu toàn bộ buổi tồn của gói hết hạn cộng dồn vào gói Combo chung, quy đổi thời gian tính từ Hôm nay theo công thức [Nối mới = +1 tháng/buổi] và [Dặm = +25 ngày/buổi], sau đó cộng Thời hạn gói mới (tuyệt đối KHÔNG cộng +1 tháng thưởng gia hạn sớm vì gói cũ đã để trễ hạn; nếu hôm nay đi lẻ hoặc dùng Voucher thì vẫn cộng thêm +21 ngày).',
      '4. Đồng Nhất 100% Combo Mi Trên & Combo Mi Dưới + Nhịp Độ Sử Dụng: Toàn bộ công thức HSD, cộng dồn, thưởng mua sớm và cứu gói hết hạn áp dụng đồng nhất và độc lập cho cả Combo Mi Trên và Combo Mi Dưới. Trên Chi tiết Gói Combo luôn hiển thị nhãn Combo Mi Trên / Combo Mi Dưới, HSD: dd/MM/yyyy và nhịp độ tiêu thụ (Avg: X.X ngày/buổi) để khách hàng và Chuyên Viên dễ dàng theo dõi.',
      '5. Bảo Lưu (date_expired = NULL) & Đặc Quyền Admin Duy Nhất: Gói đang Bảo lưu (date_expired = NULL khi còn buổi > 0) hiển thị trạng thái "Đang bảo lưu" và tự kích hoạt lại HSD khi dùng buổi tiếp theo. Trên /ios-app, chỉ duy nhất Admin / Super Admin mới có quyền bấm Gia hạn ngày (Extend) hoặc Bảo lưu đóng băng / Kích hoạt lại (Freeze / Unfreeze) kèm lý do bắt buộc; khóa tuyệt đối quyền này với CVL, CVLL, CC và CV.',
      '6. Đơn Đặt Lịch Có Gắn Sẵn Mã Khuyến Mãi (Mã 50% / Chiến Dịch) & Mua Kèm Gói Combo Tại Upsell / Checkout: (a) Bước 12 Upsell (Screen11ProductUpsell) luôn tự động mở sẵn (auto-expand) danh sách gói Combo khi đơn có gắn sẵn Mã khuyến mãi, kể cả khi khách còn gói cũ > 2 buổi; (b) Bước 13 Checkout (Screen12CheckoutBilling) luôn hiển thị nút "+ Chọn / Mua gói Combo" ngay trong Chi Tiết Hóa Đơn để chọn/đổi/xóa gói tại quầy kể cả với đơn nhảy thẳng Checkout; (c) Giá dịch vụ chuẩn luôn lấy giá niêm yết gốc (order_service.service_price) trước giảm giá để tránh giảm trùng 2 lần và tránh dò lệch size Combo; (d) Khi khách có Mã khuyến mãi (chưa có gói cũ hoạt động) quyết định mua thêm Combo, chế độ hôm nay mặc định là "Trả lẻ ca này hưởng Mã ưu đãi + Mua gói giữ trọn số buổi (+21N HSD)" (RETAIL_OR_VOUCHER), cho phép nhân viên gạt sang "Trừ Buổi 1 gói mới (0đ ca này)" (USE_NEW_COMBO) khi tạm ngưng áp dụng Mã ưu đãi mà vẫn giữ nhớ Mã chiến dịch (CAMP_*) trong phiên nếu gạt ngược lại.',
    ],
    rationale:
      'Đảm bảo tính công bằng tài chính, khuyến khích khách hàng gia hạn gói đúng hạn (+1 tháng thưởng mua sớm), đồng thời tạo cơ chế nhân văn và hấp dẫn để Chuyên Viên tư vấn cứu lại các buổi tồn bị quá hạn khi khách mua gói mới, tránh thất thoát doanh thu do trừ 0đ vô thời hạn.',
    examples: [
      'Khách có gói cũ hết hạn còn 1 Mới + 2 Dặm, hôm nay mua gói mới 3 tháng và trừ 1 buổi vào gói: HSD mới = Hôm nay + 3 tháng (gói mới) + 1 tháng (1 Mới cũ) + 50 ngày (2 Dặm cũ).',
      'Khách còn gói cũ HSD còn 40 ngày (còn 3 buổi), hôm nay mua tiếp gói mới 6 tháng và trừ 1 buổi vào gói cũ: HSD mới = HSD gói cũ + 6 tháng + 1 tháng thưởng mua sớm.',
    ],
    tags: [
      'HSD Combo',
      'hạn sử dụng combo',
      'date_expired',
      'cộng dồn hạn sử dụng',
      'cứu gói hết hạn',
      'bảo lưu combo',
      'Avg ngày/buổi',
      'gia hạn sớm',
      '21 ngày',
      '25 ngày',
      'mã 50%',
      'RETAIL_OR_VOUCHER',
    ],
    routeScopes: ['/ios-app', '/dashboard/customers', '/dashboard/appointments', '/dashboard/catalog'],
    status: 'ACTIVE',
    version: '1.1.0',
    effectiveFrom: '2026-11-20',
    sources: [
      {
        label: 'Canonical Combo Expiry & Revival Engine',
        reference: 'packages/shared/src/catalog/combo-expiry.ts',
      },
      {
        label: 'iOS Customer Combo Enrichment & Expiry Guard',
        reference: 'apps/api/src/modules/ios/services/ios-customer-enrichment.service.ts',
      },
      {
        label: 'Admin Combo Expiry & Freeze Service',
        reference: 'apps/api/src/modules/ios/services/ios-combo-expiry.service.ts',
      },
      {
        label: 'Chi tiết Gói Combo & Bàn Tư Vấn (/ios-app)',
        reference: 'apps/web/app/ios-app/components/ui-kit/ComboWalletDetailModal.tsx',
      },
      {
        label: 'Chọn / Mua & Chuyển Chế Độ Combo Trên Checkout (/ios-app)',
        reference: 'apps/web/app/ios-app/components/screens/checkout/ReceiptComboItemsSection.tsx',
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
      'Chu kỳ làm mi / dặm mi tính từ lần làm mới hoặc dặm gần nhất, tuyệt đối không tính từ ngày bảo hành kỹ thuật (Fix - Log - Adjust). Các đơn bảo hành không đặt lại mốc chu kỳ.',
      'Khách lẻ quá 21 ngày phải tư vấn nối mới.',
      'Khách Combo quá 25 ngày không dùng lượt dặm trong gói và phải dùng lượt nối mới.',
      'Chạm 24h của LoCa chỉ gồm khách ghé hôm qua, không gồm hôm nay.',
    ],
    rationale:
      'Chu kỳ dặm bảo vệ chất lượng bộ mi và giúp các mốc chăm sóc nói cùng một ngôn ngữ. Bảo hành (Fix/Log/Adjust) là dịch vụ hỗ trợ kỹ thuật, không làm mới bộ mi nên không được dùng làm mốc chu kỳ.',
    tags: ['dặm mi', '21 ngày', '25 ngày', 'LoCa', 'Chạm 24h', 'bảo hành', 'Fix', 'Log', 'Adjust'],
    routeScopes: ['/dashboard/loca', '/dashboard/nyc', '/dashboard/customers', '/dashboard/appointments'],
    status: 'ACTIVE',
    version: '1.1.0',
    effectiveFrom: '2026-10-19',
    sources: [
      { label: 'Chu kỳ dặm và LoCa', reference: 'AGENTS.md · Rules #16, #28, #36' },
      { label: 'Quy tắc Chu kỳ Bảo hành', reference: 'MOS-BUG-123 · Fix công thức bộ đếm chu kỳ làm mi' },
    ],
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
      'Nhận diện đúng trạng thái giúp CV và CC biết trước khách là khách mới cần hướng dẫn kỹ hay khách combo sắp hết lượt để kịp thời tư vấn tái ký.',
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
    id: 'ELSA-001',
    book: 'CUSTOMER',
    title: 'Bảo lưu Combo Elsa — Đóng băng tạm thời, chăm sóc đặc biệt',
    summary:
      'Khách hàng có lý do công tác, thai sản hoặc diện ưu tiên đặc biệt được bảo lưu gói combo vào tệp Combo Elsa; không hiển thị ở Single hay Combo Live, bắt buộc có thời hạn và reminder chăm sóc.',
    commandments: [
      'Khi bảo lưu gói combo, khách hàng được chuyển hoàn toàn sang tệp riêng biệt "Combo Elsa" (COMBO_ELSA), không hiển thị tại Single hay Combo Live.',
      'Tệp Combo Elsa bắt buộc phải có thời hạn bảo lưu (hoặc vô thời hạn cho diện đặc biệt như khách PXL) và ngày nhắc lịch (reminder) để Telesales/CS chăm sóc đặc biệt.',
      'Khi hết thời hạn bảo lưu hoặc được mở lại (Released), combo được rã đông và khách hàng trở lại trạng thái hiển thị theo số dư combo thực tế.',
      'Bộ lọc danh sách khách hàng và thống kê tabs phân tách rõ ràng tab Combo Elsa độc lập khỏi Combo Live, Not Combo Live, Combo Dead và Single.',
    ],
    rationale:
      'Gói combo của khách có lý do chính đáng cần được bảo lưu thay vì để trôi hết hạn; tệp Elsa giúp theo dõi sát sao tiến độ và kích hoạt lại đúng hẹn mà không làm nhiễu số liệu Combo Live vận hành.',
    examples: [
      'Cô Giáng Hương (0903706199) hoặc Chị Mai (0908969386) đi công tác/diện PXL được đưa vào tệp Combo Elsa kèm reminder chăm sóc khi về SG.',
    ],
    tags: ['Combo Elsa', 'Bảo lưu', 'Frozen', 'COMBO_ELSA', 'Reminder', 'Chăm sóc đặc biệt'],
    routeScopes: ['/dashboard/customers', '/dashboard/loca', '/dashboard/nyc'],
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-10-18',
    sources: [
      { label: 'Quy tắc tệp khách hàng bảo lưu Combo Elsa', reference: 'mOS Inbox · MOS-BUG-111' },
      {
        label: 'Service bảo lưu Combo Elsa',
        reference: 'apps/api/src/modules/customers/routes/customer-elsa.routes.ts',
      },
    ],
  },
];
