import { FM_CONTROL_GUIDES, type FmGuideEntry } from './fm-guide-content-controls';

export const FM_PILLAR_GUIDES = {
  'pillar-maps': {
    id: 'pillar-maps',
    badge: 'Trụ 1 / 8 · Uy Tín Số',
    title: 'Google Maps (Review 5★)',
    summary: 'Đo lường độ hài lòng công khai của khách hàng qua tỷ lệ thu thập Review 5★ trên số lượng CV chính thức.',
    illustration: 'pillar-maps',
    howItWorks: [
      'Định mức review theo quy mô CV chính thức: 1★ = 2% · 2★ = 3% · 3★ = 4% lượng khách (làm tròn theo CV chính thức).',
      'Tiền thưởng Trụ Maps: 1★ = +250K · 2★ = +400K · 3★ = +600K.',
      'Net Sâu = max(0, Sâu − Bướm): 0 sâu giữ trần 3★ · 1 sâu còn 2★ · 2 sâu còn 1★ · ≥3 sâu tụt 0★ (khi 0 sâu & có Bướm được +1★).',
    ],
    formula: 'Đạt 3★ khi Net Sâu = 0 VÀ số Review 5★ ≥ mốc 4% theo số CV chính thức',
    example: {
      title: 'Với 14 CV chính thức và 0 Sâu Maps',
      lines: [
        '• Mốc 1★ (2%): cần ≥ 28 review (+250K).',
        '• Mốc 2★ (3%): cần ≥ 42 review (+400K).',
        '• Mốc 3★ (4%): cần ≥ 56 review (+600K).',
      ],
      result: 'Đạt 56 review 5★ & 0 Sâu Maps → nhận trọn +600K.',
    },
    philosophy:
      'Review 5★ là nguồn khách tự nhiên (organic) giá 0đ bền vững nhất cho chuỗi. Chặn thưởng bằng "Sâu Maps" để không ai bất chấp xin review giả mà bỏ mặc khách buồn.',
  },
  'pillar-fal': {
    id: 'pillar-fal',
    badge: 'Trụ 2 / 8 · Tỷ Lệ Lỗi Dịch Vụ',
    title: 'Kiểm Soát FAL (Fix · Angry · Late)',
    summary:
      'Kiểm soát tỷ lệ ca bảo hành (Fix), khách không hài lòng (Angry), và xử lý trễ (Late) — giữ chuẩn chất lượng đồng đều kể cả khi shop đông CV.',
    illustration: 'pillar-fal',
    howItWorks: [
      'Chỉ số đo theo % FAL trên tổng lượt phục vụ trong tháng: ≤ 1.5% đạt 1★ (+400K), ≤ 1.0% đạt 2★ (+700K), ≤ 0.6% đạt 3★ (+1.00M).',
      'Thang nới công bằng theo quy mô: khi shop có ≥ 13 CV chính thức, định mức cho phép được cộng thêm +1 ca Fix giúp FM không sợ tuyển thêm CV trẻ làm tăng xác suất bảo hành.',
    ],
    formula: 'FAL ≤ 1.5% (1★: 400K) · ≤ 1.0% (2★: 700K) · ≤ 0.6% (3★: 1.00M)',
    example: {
      title: 'Shop đạt tỷ lệ FAL 0.8% trong tháng',
      lines: ['• 0.8% vượt ngưỡng ≤ 1.0% (2★) nhưng chưa chạm ≤ 0.6% (3★).', '• Được tính mức 2★ (+700K).'],
      result: 'Nhận +700K Trụ FAL; giảm thêm 0.2% sẽ lên đỉnh 3★ (+1.00M).',
    },
    philosophy:
      'Đây là trụ có trọng số tiền cao nhất (lên tới 1.00M) vì giữ chân khách quay lại rẻ hơn gấp 5 lần đi tìm khách mới.',
  },
  'pillar-autonomy': {
    id: 'pillar-autonomy',
    badge: 'Trụ 3 / 8 · Nhân Bản Lực Lượng',
    title: 'Đội Ngũ Tự Lái (CVL & CVLL)',
    summary: 'Xây dựng tỷ lệ CV Tự Chủ & Tự Chủ Cấp Cao đủ cứng để vận hành ca độc lập và mở khóa Tự Lái Lễ Tết.',
    illustration: 'pillar-autonomy',
    howItWorks: [
      '1★ (+200K): Tỷ lệ Tự lái ≥ 30%.',
      '2★ (+400K): Tỷ lệ Tự lái ≥ 50% VÀ có ít nhất 1 CVLL, đồng thời phải họp đủ 3/3 buổi với CEO & HR/tuần.',
      '3★ (+700K): Tỷ lệ Tự lái ≥ 60% VÀ có ít nhất 2 CVLL (gấp đôi định mức 2★) + đủ 3/3 buổi CEO & HR.',
      'Đạt từ 2★ trở lên tự động mở khóa trạng thái "Tự lái Lễ Tết" cho toàn chi nhánh.',
    ],
    formula: '2★ ⇔ (Tự lái ≥ 50%) & (CVLL ≥ 1) & (CEO/HR 3/3) | 3★ ⇔ (≥ 60%) & (CVLL ≥ 2)',
    example: {
      title: 'Shop đạt 55% Tự lái, có 2 CVLL nhưng tuần chỉ họp 2/3 buổi CEO/HR',
      lines: [
        '• Thiếu buổi đồng bộ CEO & HR (2/3 < 3/3) → cổng hợp lệ đóng lại.',
        '• Mức sao hiệu lực của trụ này bị kéo xuống 0★ cho tới khi đủ 3/3.',
      ],
      result: 'Thiếu 3/3 CEO & HR = 0đ Trụ Tự lái.',
    },
    philosophy:
      'Muốn nhân 100 chi nhánh, từng chi nhánh phải biết tự chạy bằng năng lực của đội CVL & CVLL thay vì trông chờ vào một cá nhân duy nhất.',
  },
  'pillar-inventory': {
    id: 'pillar-inventory',
    badge: 'Trụ 4 / 8 · Chống Thất Thoát',
    title: 'Kho & Vật Tư Tiêu Hao',
    summary: 'Quản trị độ lệch kiểm kê keo, mi, phụ kiện và vật tư tiêu hao cuối kỳ so với định mức sử dụng.',
    illustration: 'star-budget-pool',
    howItWorks: [
      'Độ lệch kiểm kê ≤ 3.0%: đạt 1★ (+150K).',
      'Độ lệch ≤ 2.0%: đạt 2★ (+300K).',
      'Độ lệch ≤ 1.0%: đạt 3★ (+450K).',
    ],
    formula: 'Lệch kho = |Thực tế tiêu hao − Định mức xuất kho| ÷ Tổng giá trị xuất kho',
    example: {
      title: 'Kiểm kê cuối tháng lệch 1.8% so với phần mềm',
      lines: ['• 1.8% ≤ 2.0% (2★) nhưng > 1.0% (3★).'],
      result: 'Trụ Kho đạt 2★ (+300K).',
    },
    philosophy:
      'Vật tư mi-keo nếu buông lỏng kiểm kê 2–3% một tháng sẽ ăn mòn biên lợi nhuận của toàn hệ thống khi nhân lên 100 cửa hàng.',
  },
  'pillar-room': {
    id: 'pillar-room',
    badge: 'Trụ 5 / 8 · Trải Nghiệm Không Gian',
    title: 'Phòng Mi · 5 Giác Quan',
    summary:
      'Điểm audit trải nghiệm phòng dịch vụ theo chuẩn 5 giác quan: Thị giác (ánh sáng/gọn), Khứu giác (tinh dầu), Thính giác (nhạc), Xúc giác (nhiệt độ/chăn ga), và Vệ sinh.',
    illustration: 'star-budget-pool',
    howItWorks: [
      'Chấm điểm audit 5 giác quan theo thang 100 điểm:',
      '• 90–94 điểm: đạt 1★ (+150K).',
      '• 95–97 điểm: đạt 2★ (+300K).',
      '• 98–100 điểm: đạt 3★ (+500K).',
    ],
    formula: '90đ+ (1★) · 95đ+ (2★) · 98đ+ (3★)',
    example: {
      title: 'Phòng đạt 96 điểm audit cuối tuần',
      lines: ['• Đạt 96/100 điểm (nằm trong khung 95–97đ).'],
      result: 'Đạt 2★ (+300K).',
    },
    philosophy:
      'Khách hàng đến Wings không chỉ mua một bộ mi, mà mua 90 phút thư giãn tuyệt đối. 5 giác quan chuẩn chỉnh là lý do khách sẵn sàng trả giá cao.',
  },
  'pillar-grooming': {
    id: 'pillar-grooming',
    badge: 'Trụ 6 / 8 · Chuẩn Diện Mạo Wings',
    title: 'Phong Thái & Diện Mạo Thiên Thần',
    summary: 'Kiểm tra đồng phục và 4 tiêu chí diện mạo của toàn bộ nhân sự khi lên ca làm việc.',
    illustration: 'star-budget-pool',
    howItWorks: [
      '4 tiêu chí cốt lõi gồm: Đồng phục · Mi nối · Son · Tóc gọn.',
      'Đạt 2/4 tiêu chí: 1★ (+150K) · Đạt 3/4 tiêu chí: 2★ (+300K) · Đạt đủ 4/4 tiêu chí: 3★ (+500K).',
    ],
    formula: '2/4 tiêu chí (1★: 150K) · 3/4 (2★: 300K) · 4/4 (3★: 500K)',
    example: {
      title: 'Cả ca đều đạt Đồng phục, Mi nối, Tóc gọn nhưng có người quên tô Son',
      lines: ['• Đạt 3/4 tiêu chí (Đồng phục + Mi nối + Tóc gọn).'],
      result: 'Trụ Diện mạo đạt 2★ (+300K).',
    },
    philosophy:
      'Chuyên Viên ngành làm đẹp chính là hình mẫu sống thuyết phục nhất cho khách hàng ngay giây phút bước chân qua cửa.',
  },
  'pillar-turn': {
    id: 'pillar-turn',
    badge: 'Trụ 7 / 8 · Công Bằng & Vận Hành',
    title: 'Tua · Giờ Công & 6 Ca TV',
    summary:
      'Đo độ công bằng chia tua làm dịch vụ (Chỉ số công bằng HI), kỷ luật giờ công và hoàn thành tối thiểu ca tư vấn.',
    illustration: 'pillar-fal',
    howItWorks: [
      'Chỉ số HI ≥ 70% + 6 ca TV: 1★ (+150K).',
      'Chỉ số HI ≥ 80% + 6 ca TV: 2★ (+300K).',
      'Chỉ số HI ≥ 90% + 6 ca TV: 3★ (+500K).',
    ],
    formula: 'HI ≥ 70% (1★) · ≥ 80% (2★) · ≥ 90% (3★)',
    example: {
      title: 'Đội đạt HI = 88% trong tháng',
      lines: ['• Vượt 80% (2★) nhưng chưa chạm 90% (3★).'],
      result: 'Trụ Tua đạt 2★ (+300K).',
    },
    philosophy: 'Chia tua minh bạch, không thiên vị mới giữ được sự đoàn kết dài lâu trong nghề dịch vụ.',
  },
  'pillar-bonding': {
    id: 'pillar-bonding',
    badge: 'Trụ 8 / 8 · Văn Hóa & Gắn Kết',
    title: 'Gắn Kết & Tiệc Tháng (Lấy Quỹ Shop)',
    summary:
      'Mỗi tháng FM bắt buộc tổ chức ít nhất 1 bữa ăn chung bằng Quỹ Shop và đăng ảnh/link check-in MXH để giữ tinh thần đội ngũ.',
    illustration: 'pillar-bonding',
    howItWorks: [
      'Điều kiện cứng bắt buộc: ĐÃ đi ăn tháng (tiền lấy trực tiếp từ Quỹ Shop) VÀ ĐÃ đăng ảnh/link check-in MXH. Thiếu 1 trong 2 → tụt 0★ VÀ bị phạt mất +1 Khiên Tuần (-25% toàn Quỹ 8 Sao)!',
      'Tỷ lệ thành viên tham dự Tiệc Tháng: ≥ 70% đạt 1★ (+150K) · ≥ 80% đạt 2★ (+300K) · ≥ 90% đạt 3★ (+450K).',
      'Quỹ Shop tài trợ tiệc đến từ 80K/ca tư vấn và các Weekly Quest đạt được.',
    ],
    formula: 'Đủ Tiệc + Ảnh MXH & Tham dự ≥ 70%/80%/90% → 1★/2★/3★ (150K/300K/450K)',
    example: {
      title: 'Shop tổ chức tiệc đủ 80% tham gia và có ảnh check-in MXH',
      lines: [
        '• Đủ 2 điều kiện cứng (Đi ăn + Check-in MXH) → không bị phạt Khiên.',
        '• Tỷ lệ tham dự 80% → đạt mốc 2★ (+300K).',
      ],
      result: 'Giữ nguyên 100% Khiên và nhận +300K Trụ Gắn Kết.',
    },
    philosophy:
      'Con người gắn kết bằng những bữa cơm cùng cười nói sau giờ làm, không chỉ bằng tin nhắn giao việc. Quỹ tiệc lấy từ Weekly Quest giúp bữa ăn thật sự là phần thưởng chung.',
  },
  'summary-total-stars': {
    id: 'summary-total-stars',
    badge: 'Tổng Kết 24★ · Trần Quỹ Sao',
    title: 'Tổng Quỹ 8 Trụ Sao & Tự Lái Lễ Tết',
    summary: 'Tổng hợp mức sao hiệu lực của toàn bộ 8 trụ (tối đa 24★ = 5.05M) và trạng thái mở khóa Tự Lái Lễ Tết.',
    illustration: 'star-budget-pool',
    howItWorks: [
      'Đạt đều 1★ cả 8 trụ = 1.70M · 2★ cả 8 trụ = 3.40M · 3★ cả 8 trụ = 5.05M.',
      'Tổng cộng 24★ có giá trị tối đa 5.05M (tăng thêm từ mức 4.60M của bản 7★ trước đây sau khi bổ sung Trụ #8 Gắn Kết & Tiệc Tháng).',
      'Đèn "Tự lái Lễ Tết" sáng Xanh khi Trụ #3 Đội ngũ Tự lái đạt tối thiểu 2★.',
    ],
    formula: 'Tối đa 8 Trụ (24★): 1.70M (8★) → 3.40M (16★) → 5.05M (24★)',
    example: {
      title: 'Bức tranh tổng thể khi đạt 16/24★ và Tự lái 2★',
      lines: ['• Tổng Quỹ Sao Gross = 3.40M (chưa trừ lỗi/khiên).', '• Tự lái Lễ Tết = Đã mở khóa.'],
      result: 'Cân bằng hoàn hảo giữa tốc độ doanh thu và nền tảng vận hành 8 trụ.',
    },
    philosophy:
      'Một cửa hàng tốt không được phép lệch về 1 chỉ số rồi bỏ bê 7 chỉ số còn lại. Bảng tổng hợp 24★ giúp FM nhìn rõ mảnh ghép nào cần nâng cấp nhất.',
  },
} as const satisfies Record<string, FmGuideEntry>;

export const FM_GUIDE_CATALOG: Record<string, FmGuideEntry> = {
  ...FM_CONTROL_GUIDES,
  ...FM_PILLAR_GUIDES,
};

export type FmGuideId = keyof typeof FM_CONTROL_GUIDES | keyof typeof FM_PILLAR_GUIDES;
