import type { MosBibleQuizQuestion } from '@mos-lab/shared';

export const EXPANDED_BIBLE_QUIZ_POOL: readonly MosBibleQuizQuestion[] = [
  {
    id: 'quiz-mos-002-sincerity',
    commandmentId: 'MOS-002',
    title: '4 Chìa Khóa Văn Hóa Wings: Vui Vẻ, Ân Cần, Chân Thành, Khoa Học',
    scenario:
      'Một khách quen ghé salon yêu cầu Chuyên Viên nối mi thật dày và dài để đi tiệc tối nay. Tuy nhiên, sau khi kiểm tra, Chuyên Viên thấy sợi mi thật của khách đang bị yếu và rụng nhiều do chu kỳ mi trước. Theo Chìa Khóa "Chân Thành" và "Khoa Học", Chuyên Viên nên ứng xử thế nào?',
    options: [
      {
        key: 'A',
        text: 'Chiều theo ý khách nối dày tối đa để khách vui vẻ đi tiệc và salon đạt doanh thu cao.',
      },
      {
        key: 'B',
        text: 'Từ chối thẳng thừng và yêu cầu khách đi về dưỡng mi mà không cần giải thích thêm.',
      },
      {
        key: 'C',
        text: 'Nói thật tình trạng mi với thái độ ân cần, giải thích rủi ro rụng mi thật theo góc nhìn khoa học, và tư vấn dáng mi nhẹ êm phù hợp nhất để vừa đẹp đi tiệc vừa bảo vệ mắt.',
      },
      {
        key: 'D',
        text: 'Nối một nửa số sợi rồi bảo khách lần sau ghé làm tiếp.',
      },
    ],
    correctKey: 'C',
    explanation:
      'Chân Thành là đặt sức khỏe mi thật và niềm tin lâu dài của khách lên trên hết. Kết hợp cùng Khoa Học để giải thích rõ ràng và tư vấn giải pháp an toàn, bảo vệ vẻ đẹp bền vững cho khách.',
    culturalKey: 'Chân Thành',
    rewardPoints: 10,
  },
  {
    id: 'quiz-tip-001-threshold',
    commandmentId: 'TIP-001',
    title: 'Quy tắc Ngưỡng Tip 20K & Xử lý tiền lẻ (Kinh Thánh mOS)',
    scenario:
      'Khách hàng hoàn tất hóa đơn 300.000đ và đưa 315.000đ, bảo nhân viên không cần thối lại 15.000đ. Theo Điều răn TIP-001 trong Kinh Thánh mOS, số tiền 15.000đ này được hệ thống xử lý như thế nào?',
    options: [
      {
        key: 'A',
        text: 'Không ghi nhận gì cả vì dưới 20.000đ.',
      },
      {
        key: 'B',
        text: 'Được tính là 1 lượt có tip và cộng vào % Tip Rate của salon.',
      },
      {
        key: 'C',
        text: 'Vẫn cộng đủ 15.000đ vào thu nhập của nhân sự (CV, CC, CS), nhưng TUYỆT ĐỐI KHÔNG tính là 1 lượt có tip (không tăng tổng lượt tip).',
      },
      {
        key: 'D',
        text: 'Chuyển toàn bộ 15.000đ vào quỹ công đoàn salon.',
      },
    ],
    correctKey: 'C',
    explanation:
      'Theo Điều răn TIP-001: Tiền lẻ dưới 20k vẫn cộng đủ vào thu nhập nhân sự nhưng không tính là lượt tip để bảo đảm tính chuẩn mực của tỷ lệ phục vụ làm hài lòng khách hàng.',
    culturalKey: 'Khoa Học',
    rewardPoints: 10,
  },
  {
    id: 'quiz-bk-001-productivity',
    commandmentId: 'BK-001',
    title: 'Năng suất tạo lịch Booker (Booked vs Done)',
    scenario:
      'Vào ngày 15/10, bạn Booker tạo một lịch hẹn cho khách đến làm dịch vụ vào ngày 20/10. Theo Điều răn BK-001, chỉ số Booked của bạn Booker này được ghi nhận vào ngày nào?',
    options: [
      {
        key: 'A',
        text: 'Ghi nhận vào ngày 20/10 khi khách đến salon.',
      },
      {
        key: 'B',
        text: 'Ghi nhận vào ngày 15/10 theo ngày tạo đơn (date_created).',
      },
      {
        key: 'C',
        text: 'Chia đôi 50% cho ngày 15/10 và 50% cho ngày 20/10.',
      },
      {
        key: 'D',
        text: 'Chỉ ghi nhận khi khách đã thanh toán xong đơn hàng.',
      },
    ],
    correctKey: 'B',
    explanation:
      'Theo Điều răn BK-001: Năng suất tạo lịch Booked của Booker được tính theo order.date_created (ngày làm ra công việc), không phụ thuộc vào ngày khách thực tế đến salon.',
    culturalKey: 'Khoa Học',
    rewardPoints: 10,
  },
  {
    id: 'quiz-cv-001-respect-naming',
    commandmentId: 'CV-001',
    title: 'Kỷ luật Ngôn từ & Văn hóa Tôn trọng Nghệ Nhân Wings',
    scenario:
      'Trong giao tiếp nội bộ và trên giao diện mOS, danh xưng nào sau đây là CHUẨN MỰC để gọi đội ngũ kỹ thuật nối mi tại Wings?',
    options: [
      {
        key: 'A',
        text: 'Thợ mi hoặc thợ kỹ thuật.',
      },
      {
        key: 'B',
        text: 'Thợ cứng hoặc tay nghề thợ.',
      },
      {
        key: 'C',
        text: 'Chuyên Viên (CV), Chuyên Viên Tự Chủ (CV🪶), Nghệ Nhân Mi hoặc Thiên Thần.',
      },
      {
        key: 'D',
        text: 'Nhân viên bậc 1 và bậc 2.',
      },
    ],
    correctKey: 'C',
    explanation:
      'Tại Wings, việc gọi là "thợ" bị xem là thiếu tôn trọng. Toàn bộ đội ngũ là Nghệ nhân, Chuyên Viên và Thiên Thần chăm sóc khách hàng.',
    culturalKey: 'Ân Cần',
    rewardPoints: 10,
  },
  {
    id: 'quiz-mos-002-cheerfulness',
    commandmentId: 'MOS-002',
    title: 'Chìa Khóa "VUI VẺ" trong 4 Chìa Khóa Văn Hóa Wings',
    scenario:
      'Theo định nghĩa của Kinh Thánh Wings, tại sao "Vui Vẻ" là chìa khóa đứng đầu tiên trong 4 chìa khóa văn hóa?',
    options: [
      {
        key: 'A',
        text: 'Vì vui vẻ giúp salon ồn ào và náo nhiệt hơn.',
      },
      {
        key: 'B',
        text: 'Vì Vui Vẻ là khởi nguồn: phải thật sự vui vẻ từ bên trong thì mới có thể ân cần được; nụ cười và năng lượng tích cực là nền tảng.',
      },
      {
        key: 'C',
        text: 'Vì vui vẻ là để chiều lòng quản lý ca làm việc.',
      },
      {
        key: 'D',
        text: 'Vì khách hàng chỉ thích nói chuyện phiếm.',
      },
    ],
    correctKey: 'B',
    explanation:
      'VUI VẺ là khởi nguồn. Không có niềm vui tự nhiên bên trong thì mọi hành vi ân cần đều trở nên gượng gạo và giả tạo.',
    culturalKey: 'Vui Vẻ',
    rewardPoints: 10,
  },
  {
    id: 'quiz-mos-002-caring',
    commandmentId: 'MOS-002',
    title: 'Chìa Khóa "ÂN CẦN" trong 4 Chìa Khóa Văn Hóa Wings',
    scenario: 'Hành động nào sau đây thể hiện đúng tinh thần "ÂN CẦN" tinh tế tại Wings Lashes?',
    options: [
      {
        key: 'A',
        text: 'Hỏi han dồn dập ngay cả khi khách đang muốn chợp mắt nghỉ ngơi.',
      },
      {
        key: 'B',
        text: 'Tinh tế quan sát chỉnh gối nằm, đắp chăn ấm nhẹ nhàng cho khách và điều chỉnh ánh đèn dịu mắt.',
      },
      {
        key: 'C',
        text: 'Liên tục giới thiệu các gói dịch vụ đắt tiền nhất trong suốt buổi làm.',
      },
      {
        key: 'D',
        text: 'Làm thật nhanh để khách ra về sớm.',
      },
    ],
    correctKey: 'B',
    explanation:
      'ÂN CẦN là tinh tế chăm chút từng nhu cầu nhỏ nhất của khách hàng một cách tự nhiên, tạo cảm giác được nâng niu và tôn trọng.',
    culturalKey: 'Ân Cần',
    rewardPoints: 10,
  },
  {
    id: 'quiz-mos-002-science',
    commandmentId: 'MOS-002',
    title: 'Chìa Khóa "KHOA HỌC" trong 4 Chìa Khóa Văn Hóa Wings',
    scenario:
      'Một salon làm việc rất vui vẻ, ân cần nhưng lượng khách quay lại sụt giảm. Theo Chìa Khóa "KHOA HỌC", đội ngũ quản lý nên làm gì?',
    options: [
      {
        key: 'A',
        text: 'Tiếp tục vui vẻ và tin rằng mọi thứ rồi sẽ tự tốt lên.',
      },
      {
        key: 'B',
        text: 'Xem xét số liệu thực tế trên mOS: tỷ lệ rụng mi, thời gian dặm mi, conversion, và tỷ lệ quay lại để tìm ra nguyên nhân cốt lõi và cải tiến kỹ thuật.',
      },
      {
        key: 'C',
        text: 'Đổ lỗi cho mùa thấp điểm và không cần đo lường gì thêm.',
      },
      {
        key: 'D',
        text: 'Tăng chi phí quảng cáo để bù đắp số khách không quay lại.',
      },
    ],
    correctKey: 'B',
    explanation:
      'KHOA HỌC là thước đo thực tế chứng minh tổ chức đi đúng hướng. Không tự huyễn hoặc theo cảm xúc, luôn dựa trên dữ liệu chuẩn xác của mOS.',
    culturalKey: 'Khoa Học',
    rewardPoints: 10,
  },
  {
    id: 'quiz-cs-001-golden-hour',
    commandmentId: 'CS-001',
    title: 'Thời điểm Vàng Chăm sóc Khách hàng sau dịch vụ nối mi',
    scenario:
      'Sau khi khách hoàn thành dịch vụ nối mi tại salon, thời điểm vàng để Chuyên Viên CS nhắn tin/gọi điện hỏi thăm độ êm và tình trạng mi là khi nào?',
    options: [
      {
        key: 'A',
        text: 'Ngay sau khi khách bước chân ra khỏi cửa salon 5 phút.',
      },
      {
        key: 'B',
        text: 'Sau 1 tháng khi mi đã rụng gần hết.',
      },
      {
        key: 'C',
        text: 'Trong vòng 24 đến 48 giờ sau dịch vụ, khi khách đã trải nghiệm sinh hoạt và rửa mặt với bộ mi mới.',
      },
      {
        key: 'D',
        text: 'Chỉ hỏi thăm khi khách chủ động nhắn tin phàn nàn.',
      },
    ],
    correctKey: 'C',
    explanation:
      '24 - 48 giờ là thời điểm vàng để nắm bắt kịp thời cảm nhận của khách, hướng dẫn cách dưỡng mi và hỗ trợ chỉnh dặm nếu có sợi chưa quen mắt.',
    culturalKey: 'Ân Cần',
    rewardPoints: 10,
  },
  {
    id: 'quiz-cc-001-split-rule',
    commandmentId: 'CC-001',
    title: 'Quy tắc Thưởng CC Tip 20% khi CC In khác CC Out',
    scenario:
      'Đơn hàng có 100.000đ tiền tip từ khách. Bạn CC In tiếp đón và bạn CC Out thanh toán là 2 người khác nhau. Hệ thống mOS chia khoản 20% Thưởng CC Tip (20.000đ) như thế nào?',
    options: [
      {
        key: 'A',
        text: 'Toàn bộ 20.000đ thuộc về CC In vì có công đón tiếp ban đầu.',
      },
      {
        key: 'B',
        text: 'Toàn bộ 20.000đ thuộc về CC Out vì có công thanh toán chốt tiền.',
      },
      {
        key: 'C',
        text: 'Tự động chia đôi 50/50: Mỗi bạn CC nhận 10.000đ (10% tip share).',
      },
      {
        key: 'D',
        text: 'Hủy khoản thưởng CC vì không cùng 1 người phụ trách.',
      },
    ],
    correctKey: 'C',
    explanation:
      'Theo Kinh Thánh mOS: Khi CC In khác CC Out, khoản thưởng CC Tip 20% bắt buộc chia 50/50 để bảo đảm công bằng và tinh thần phối hợp đồng đội.',
    culturalKey: 'Khoa Học',
    rewardPoints: 10,
  },
  {
    id: 'quiz-drawer-001-ui-rule',
    commandmentId: 'UI-007',
    title: 'Quy chuẩn Đóng Drawer trong hệ thống mOS (UI Invariant)',
    scenario:
      'Theo quy chuẩn giao diện mOS UI-007, nút đóng [✕] của tất cả Drawer trong hệ thống bắt buộc phải đặt ở vị trí nào?',
    options: [
      {
        key: 'A',
        text: 'Ở góc trên bên trái, đứng trước tiêu đề Drawer.',
      },
      {
        key: 'B',
        text: 'Ở góc trên bên phải (closable: { placement: "end" }), tiêu đề luôn neo ở góc trên bên trái.',
      },
      {
        key: 'C',
        text: 'Ở thanh footer dưới cùng bên trái.',
      },
      {
        key: 'D',
        text: 'Không cần nút đóng, chỉ bấm ra ngoài để thoát.',
      },
    ],
    correctKey: 'B',
    explanation:
      'UI Invariant mOS quy định nút đóng [✕] bắt buộc nằm ở góc trên bên phải (placement: end) để đồng bộ trải nghiệm thị giác của người dùng.',
    culturalKey: 'Khoa Học',
    rewardPoints: 10,
  },
  {
    id: 'quiz-sec-001-privacy',
    commandmentId: 'SEC-001',
    title: 'Bảo mật Dữ liệu Khách hàng & Tôn trọng Quyền riêng tư',
    scenario:
      'Một người quen nhờ bạn tra số điện thoại và lịch sử dịch vụ của một khách hàng VIP trên mOS. Bạn nên xử lý thế nào?',
    options: [
      {
        key: 'A',
        text: 'Chụp màn hình gửi ngay vì là bạn bè thân thiết.',
      },
      {
        key: 'B',
        text: 'Từ chối dứt khoát vì dữ liệu khách hàng là tài sản bảo mật tối cao của salon và quyền riêng tư của khách.',
      },
      {
        key: 'C',
        text: 'Thu phí dịch vụ tra cứu rồi cung cấp thông tin.',
      },
      {
        key: 'D',
        text: 'Đọc số điện thoại qua miệng nhưng không gửi tin nhắn.',
      },
    ],
    correctKey: 'B',
    explanation:
      'Dữ liệu khách hàng tại Wings được bảo mật nghiêm ngặt. Nghiêm cấm mọi hành vi rò rỉ, tra cứu ngoài mục đích phục vụ khách tại salon.',
    culturalKey: 'Chân Thành',
    rewardPoints: 10,
  },
  {
    id: 'quiz-retry-001-complaint',
    commandmentId: 'MOS-002',
    title: 'Xử lý Khách chưa hài lòng với Tinh thần Ân Cần & Chân Thành',
    scenario:
      'Khách nhắn tin phản ánh mi bị vướng sau 1 ngày làm dịch vụ. Phản hồi chuẩn mực của Chuyên Viên CS là gì?',
    options: [
      {
        key: 'A',
        text: 'Giải thích là do khách rửa mặt sai cách và không hỗ trợ gì thêm.',
      },
      {
        key: 'B',
        text: 'Lắng nghe với thái độ ân cần, chân thành xin lỗi vì sự bất tiện của khách, và mời khách ghé salon để Chuyên Viên kiểm tra chỉnh sửa miễn phí ngay.',
      },
      {
        key: 'C',
        text: 'Bỏ qua tin nhắn đợi khách tự hết khó chịu.',
      },
      {
        key: 'D',
        text: 'Đổ lỗi cho Chuyên Viên làm ca hôm đó.',
      },
    ],
    correctKey: 'B',
    explanation:
      'Khách phản ánh là cơ hội để thể hiện sự ân cần và chân thành vượt trội. Luôn đón nhận với nụ cười và hành động giải quyết thực chất.',
    culturalKey: 'Ân Cần',
    rewardPoints: 10,
  },
];

export const INITIAL_WEEKLY_QUIZ: readonly MosBibleQuizQuestion[] = EXPANDED_BIBLE_QUIZ_POOL.slice(0, 3);
