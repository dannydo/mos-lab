export type FmGuideIllustrationKey =
  | 'income-stack'
  | 'revshare-curve'
  | 'star-budget-pool'
  | 'shop-fund-rollover'
  | 'rev-lock-multiplier'
  | 'rookie-grace'
  | 'bounty-ladder'
  | 'hub-spoke-2fm'
  | 'fm-levels-prorate'
  | 'shield-penalty'
  | 'pillar-maps'
  | 'pillar-fal'
  | 'pillar-autonomy'
  | 'pillar-bonding';

export interface FmGuideEntry {
  readonly id: string;
  readonly badge: string;
  readonly title: string;
  readonly summary: string;
  readonly illustration: FmGuideIllustrationKey;
  readonly howItWorks: readonly string[];
  readonly formula?: string;
  readonly example: {
    readonly title: string;
    readonly lines: readonly string[];
    readonly result: string;
  };
  readonly philosophy: string;
}

export const FM_CONTROL_GUIDES = {
  'kpi-income': {
    id: 'kpi-income',
    badge: 'KPI Tổng Hợp · 1 FM',
    title: 'Thu nhập 1 FM Thực Nhận',
    summary:
      'Tổng thu nhập hàng tháng của 1 Floor Manager, gộp từ 4 nguồn độc lập để vừa giữ chuẩn sàn vừa khuyến khích tăng doanh thu và đào tạo quân.',
    illustration: 'income-stack',
    howItWorks: [
      'Lương Cứng (8M / 9M / 10M theo bậc FM 1/2/3) nhân với tỷ lệ ngày công thực tế (Ngày công / 26, tối đa 1.0x) cộng phụ cấp Cover ca khi hỗ trợ đột xuất.',
      'Thưởng % Doanh Thu tính theo công thức mượt (lấp giường x hiệu suất REV/CV), giữ nguyên cho 1 FM hoặc chia đều nếu shop đang tách 2 FM.',
      'Quỹ 8 Trụ Sao Thực Nhận = Tổng tiền các trụ đạt 1★–3★ (tối đa 5.05M) trừ lỗi Bướm/Trễ/Khiên tuần mất.',
      'Thưởng Nóng Đẻ Quân (1 lần) trả thẳng cho FM đào tạo, KHÔNG bị chia đôi kể cả khi shop có 2 FM.',
    ],
    formula: 'Thu nhập 1 FM = Lương cứng (theo công) + Cover ca + Thưởng % DT + Quỹ 8 Sao (Net) + Thưởng Đẻ Quân',
    example: {
      title: 'Ví dụ thực tế tại Đề Thám (FM 2 · 16 CV · 768M)',
      lines: [
        '1. Lương cứng FM 2 đi đủ 26/26 công: 9.00M + 0 cover.',
        '2. 16 CV đạt 768M (48M/CV) → nền 1.31%/FM → Thưởng % DT = 10.07M.',
        '3. Đạt 15/24★ trên 8 Trụ Sao, không mất khiên → Quỹ Sao Net = 3.10M.',
        '4. Trong tháng có 1 CVL lên CVLL (+2.00M thưởng nóng không chia đôi).',
      ],
      result: 'Tổng thu nhập 1 FM = 9.00 + 10.07 + 3.10 + 2.00 = 24.17M / tháng',
    },
    philosophy:
      'Cơ chế 4 lớp giúp FM không chỉ "canh giờ chấm công" mà chủ động nuôi quân, giữ chất lượng dịch vụ 8 trụ và đẩy doanh thu bền vững cùng chủ shop.',
  },
  'kpi-revshare': {
    id: 'kpi-revshare',
    badge: 'Động Cơ Tăng Trưởng · % DT',
    title: 'Thưởng % Doanh Thu (Mô Hình Tăng Trưởng Kép)',
    summary:
      'Khoản thưởng tỷ lệ thuận với doanh thu toàn sàn, tự động tăng bậc % khi shop lấp đầy giường và giữ năng suất REV/CV chuẩn.',
    illustration: 'revshare-curve',
    howItWorks: [
      'Bước 1 — Tỷ lệ nền theo lấp giường (Quân số / Tổng giường): từ 1.00%/FM (≤50% giường) tăng mượt qua 1.20%/FM (75% giường) lên 1.40%/FM (100% giường). Mỗi FM hưởng cùng tỷ lệ nền này kể cả khi tách 2 FM.',
      'Bước 2 — Hệ số hiệu suất = (REV/CV chính thức) ÷ 48M, chặn sàn 0.70× (≤33.6M) và trần 1.15× (≥55.2M). Đạt đúng chuẩn 48M/CV = 1.00×; sau này đổi chuẩn 48M → 50M chỉ cần chỉnh 1 mốc duy nhất.',
      'Bước 3 — CV mới ≤ 45 ngày (tính tới cuối kỳ lương, tối đa 2 kỳ) được miễn khỏi mẫu số để FM mạnh dạn tuyển và kèm tân binh mà không sợ tụt REV/CV.',
    ],
    formula: 'Thưởng % DT (1 FM) = Tổng Doanh Thu × % Nền(Lấp giường) × clamp(REV/CV ÷ 48M, 0.70, 1.15)',
    example: {
      title: 'So sánh khi tăng từ 12 CV lên 16 CV (giữ 48M/CV)',
      lines: [
        '• Lúc 12 CV ở Đề Thám (576M): lấp giường 67% → nền 1.13%, REV/CV = 48M (1.00x) → Thưởng = 6.53M.',
        '• Khi tuyển thêm 4 CV thành 16 CV (768M): lấp giường 89% → nền 1.31% → Thưởng = 10.07M.',
        '• Tổng doanh thu shop tăng +192M nhưng FM được thêm +3.54M/tháng nhờ tăng cả quy mô lẫn tỷ lệ %.',
      ],
      result: 'Càng nhiều CV giỏi đạt chuẩn 48M, FM càng hưởng % cao hơn — hết tâm lý sợ chia ghế.',
    },
    philosophy:
      'Trước đây chia % cố định khiến FM ngại tuyển thêm người vì sợ loãng hiệu suất. Công thức mượt theo lấp giường + miễn mẫu số 45 ngày biến FM thành "trưởng phòng nhân sự" ngay tại sàn.',
  },
  'kpi-starpool': {
    id: 'kpi-starpool',
    badge: 'Chất Lượng Sàn · 8 Trụ 24★',
    title: 'Quỹ 8 Trụ Sao (Net)',
    summary:
      'Tổng thưởng chất lượng vận hành từ 8 Trụ Sao (tối đa 5.05M ở 24★) sau khi trừ phạt vi phạm và hệ số Khiên Tuần.',
    illustration: 'star-budget-pool',
    howItWorks: [
      'Mỗi trụ (Maps, FAL, Tự lái, Kho, Phòng, Diện mạo, Tua, Gắn Kết) có 3 mức sao 1★ / 2★ / 3★; tổng tối đa đạt 3★ cả 8 trụ là 5.05M.',
      'Một số trụ có cổng chặn cứng (ví dụ: Net Sâu Maps giới hạn trần sao Maps; thiếu họp CEO & HR 3/3 tuần thì Tự lái về 0★).',
      'Tiền Gross bị trừ trực tiếp lỗi Trễ xử lý 24–48h (-200K/lỗi), sau đó nhân hệ số Khiên Tuần (mất 1 khiên = -25% toàn quỹ sao).',
    ],
    formula: 'Quỹ Sao Net = max(0, Tổng 8 Trụ Gross - Phạt Trễ 24–48h) × max(0%, 100% - 25% × Khiên mất)',
    example: {
      title: 'Tính Net khi đạt 3.40M Gross và mất 1 Khiên',
      lines: [
        '1. 8 trụ đạt 16/24★ → Tổng Gross = 3.40M.',
        '2. Trong tháng có 1 lần xử lý trễ (-200K) → còn 3.20M.',
        '3. Tuần 3 quên tổ chức Tiệc Tháng + thiếu ảnh MXH → mất 1 khiên (-25%).',
      ],
      result: 'Quỹ Sao Net = 3.20M × 75% = 2.40M',
    },
    philosophy:
      'Doanh thu là bàn đạp tăng trưởng, còn 8 Trụ Sao là phanh an toàn bảo vệ trải nghiệm khách hàng, kỷ luật kho bãi, văn hóa chuối và tinh thần đội ngũ.',
  },
  'kpi-shopfund': {
    id: 'kpi-shopfund',
    badge: 'Quỹ Rollover · Văn Hóa Shop',
    title: 'Quỹ Shop & Weekly Quest',
    summary:
      'Ví chung của cả chi nhánh dùng để tổ chức Tiệc Tháng ăn uống cùng nhau — tích lũy tự động từ ca tư vấn (Fun Fund) và Weekly Quest.',
    illustration: 'shop-fund-rollover',
    howItWorks: [
      'Mỗi ca khách tư vấn thành công đóng góp +80K (Fun Fund) vào Quỹ Shop.',
      'Mỗi Weekly Quest đạt chuẩn trong tháng (do HR & CEO thiết kế như nối 2 bộ Undermink, tặng chuối đủ 100%, giữ FAL ≤ 1F-1A-1L) cộng thêm tiền thưởng vào Quỹ Shop.',
      'Tiền Quỹ Shop KHÔNG chảy vào túi riêng FM mà thuộc sở hữu tập thể chi nhánh, được cộng dồn (rollover) sang tháng sau nếu dùng chưa hết.',
    ],
    formula: 'Quỹ Shop tháng = (Ca tư vấn × 80K) + (Số Weekly Quest đạt × Thưởng/Quest)',
    example: {
      title: 'Ví dụ Quỹ Shop Đề Thám trong 1 tháng',
      lines: [
        '• Team tư vấn được 6 ca bổ sung: 6 × 80K = 480K.',
        '• Hoàn thành 4 Weekly Quest (250K/quest): 4 × 250K = 1.00M.',
        '• Tiền được đổ về SHOP_FUND_DT để FM book kèo đi ăn cuối tháng cho cả shop.',
      ],
      result: 'Tổng nạp Quỹ Shop trong tháng = 1.48M (cộng dồn nếu tháng trước còn dư)',
    },
    philosophy:
      'Tiền tiệc lấy trực tiếp từ thành quả Weekly Quest giúp cả team coi việc giữ kỷ luật là đi kiếm "ngân sách ăn chơi chung" thay vì bị FM ép KPI.',
  },
  'ctrl-revenue': {
    id: 'ctrl-revenue',
    badge: 'Đầu Vào Cốt Lõi · Doanh Thu',
    title: 'Doanh Thu Sàn Tháng',
    summary:
      'Tổng doanh thu thực thu của chi nhánh trong tháng; quyết định cả quy mô thưởng % DT của FM lẫn điểm hòa vốn P&L shop.',
    illustration: 'rev-lock-multiplier',
    howItWorks: [
      'Nếu đang tắt khóa REV/CV: bạn kéo thanh trượt tự do để thử các kịch bản doanh thu tăng/giảm khi giữ nguyên quân số.',
      'Nếu đang bật "Khóa REV/CV": tổng doanh thu tự động tính = (CV chính thức × REV/CV mục tiêu) + (CV mới × 25M), giúp cô lập tác động của việc tăng quân số.',
      'Cổng tách 2 FM yêu cầu 2 điều kiện song song: Doanh thu ≥ 650M VÀ Quân số chính thức ≥ 13 CV.',
    ],
    formula: 'Khi khóa REV/CV: Doanh thu = (CV chính thức × REV/CV) + (CV mới × 25M)',
    example: {
      title: 'Thử nghiệm mở rộng từ 12 CV lên 16 CV',
      lines: [
        '• Khóa REV/CV ở mức chuẩn 48M.',
        '• Với 12 CV chính thức → Doanh thu = 12 × 48M = 576M (chưa chạm mốc 650M nên vẫn 1 FM).',
        '• Tăng lên 16 CV chính thức → Doanh thu tự nhảy thành 16 × 48M = 768M (vượt 650M & 13 CV).',
      ],
      result: 'Tăng +4 CV năng suất chuẩn mang về +192M doanh thu và tự mở khóa Pha 2.',
    },
    philosophy:
      'Giúp chủ shop và FM nhìn thấy mối liên hệ trực tiếp giữa số ghế lấp đầy, năng suất đầu người và ngưỡng quy mô chi nhánh.',
  },
  'ctrl-rev-per-cv': {
    id: 'ctrl-rev-per-cv',
    badge: 'Khóa Năng Suất · REV / CV',
    title: 'REV / CV Mục Tiêu (Tính Năng Khóa)',
    summary:
      'Chỉ số năng suất trung bình mỗi Chuyên Viên chính thức mang lại. Nút Khóa giúp cố định năng suất khi tăng/giảm quân số.',
    illustration: 'rev-lock-multiplier',
    howItWorks: [
      'Ở trạng thái MỞ KHÓA: hệ thống hiển thị REV/CV hiện tại (= Doanh thu / CV chính thức); chỉnh REV/CV sẽ cập nhật lại Doanh thu tương ứng.',
      'Ở trạng thái ĐÃ KHÓA: mỗi khi bạn bấm + / - tăng giảm CV, tổng Doanh thu tự động nhân theo đúng mức REV/CV đã khóa (+25M cho mỗi CV mới ≤ 45 ngày).',
      '4 nút preset nhanh (45M / 48M / 50M / 52M) giúp test tức thì từ mức trung bình khá đến mức xuất sắc (1.00x tại 48M).',
    ],
    formula: 'REV/CV thực tế = Tổng Doanh Thu ÷ Số CV Chính Thức (chuẩn 1.00x = 48M)',
    example: {
      title: 'Khóa ở 48M và tăng từ 13 lên 15 CV',
      lines: [
        '• Trước: 13 CV × 48M = 624M.',
        '• Sau khi bấm +2 CV: 15 CV × 48M = 720M.',
        '• Bạn không phải kéo lại thanh Doanh thu thủ công mà thấy ngay nhảy P&L và thưởng FM.',
      ],
      result: 'Cô lập hoàn toàn bài toán "tuyển thêm 1 CV có lãi không?" ở cùng mặt bằng tay nghề.',
    },
    philosophy:
      'Khi tuyển người mới mà doanh thu đứng yên, công thức sẽ phạt giả vì REV/CV bị chia loãng. Nút Khóa phản ánh đúng thực tế: thêm 1 CV đứng ghế là thêm 1 phần khách mới.',
  },
  'ctrl-cvs': {
    id: 'ctrl-cvs',
    badge: 'Quy Mô Sàn · Headcount',
    title: 'Quân Số Sàn (Tổng CV)',
    summary: 'Tổng số Chuyên Viên đang vận hành tại shop, bao gồm cả CV chính thức và CV mới ≤ 45 ngày.',
    illustration: 'rookie-grace',
    howItWorks: [
      'CV chính thức = Tổng Quân số sàn − CV mới ≤ 45 ngày (tối thiểu 1).',
      'Mỗi chi nhánh có số giường tối đa (Đề Thám 18G, Estella 12G) và mức min cõng giường 9 CV.',
      'Khi số CV chính thức đạt ≥ 13 CV VÀ doanh thu ≥ 650M, mô hình Tự động chuyển sang trạng thái đủ chuẩn tách 2 FM (hoặc giữ 1 FM Vệ tinh tùy lựa chọn Hub-Spoke).',
    ],
    formula: 'Tỷ lệ lấp giường = min(100%, CV chính thức ÷ Số giường chi nhánh)',
    example: {
      title: 'Đề Thám (18 giường) có 16 CV, trong đó 2 CV mới',
      lines: [
        '• CV chính thức = 16 - 2 = 14 CV.',
        '• Tỷ lệ lấp giường = 14 / 18 = 78%.',
        '• Chỉ tiêu Undermink 85% & Google Maps tính trên mẫu số 14 CV thay vì 16 CV.',
      ],
      result: 'Quân số tăng giúp lấp giường cao hơn, trực tiếp đẩy % thưởng doanh thu của FM.',
    },
    philosophy:
      'Đủ quân số là điều kiện tiên quyết để không rớt khách giờ cao điểm và giảm quá tải ca trực cho các bạn cũ.',
  },
  'ctrl-rookies': {
    id: 'ctrl-rookies',
    badge: 'Bảo Vệ Tân Binh · 45 Ngày (1.5 Tháng)',
    title: 'CV Mới ≤ 45 Ngày (Miễn Mẫu Số)',
    summary:
      'Số Chuyên Viên đang trong 45 ngày (1.5 tháng) hòa nhập đầu tiên. Được miễn tính vào mẫu số chia năng suất REV/CV và Google Maps của FM — chốt theo cuối tháng dương lịch (tối đa 2 kỳ lương, không tràn sang kỳ thứ 3).',
    illustration: 'rookie-grace',
    howItWorks: [
      'Trong 45 ngày đầu (1.5 tháng), tay nghề và tốc độ tân binh chưa đạt chuẩn 48M nên được tách khỏi mẫu số chia REV/CV.',
      'Quy tắc chốt kỳ lương: miễn kỳ lương nào mà tính tới cuối tháng dương lịch, thâm niên CV mới ≤ 45 ngày (vào đầu tháng miễn 1 kỳ, vào giữa tháng miễn tối đa 2 kỳ, tuyệt đối không tràn tháng thứ 3).',
      'Chỉ tiêu Google Maps (2%–4%) và Undermink cũng chỉ nhân theo số CV chính thức. Sau khi vượt mốc thử việc 60 ngày & đạt ≥ 30M/tháng, FM nhận thêm +500K Thưởng Nóng Đẻ Quân.',
    ],
    formula: 'CV chính thức = Tổng CV − CV mới ≤ 45 ngày (chốt đến cuối kỳ lương)',
    example: {
      title: 'Shop 14 CV (gồm 2 CV mới) đạt 626M',
      lines: [
        '• Nếu KHÔNG miễn mẫu số: 626M / 14 = 44.7M (hiệu suất 44.7 ÷ 48 bị kéo xuống 0.93×).',
        '• Nhờ miễn 2 CV mới: Doanh thu vẫn tính đủ 626M, mẫu số là 12 CV chính thức → REV/CV giữ vững chuẩn > 48M!',
      ],
      result: 'FM không bị tụt % thưởng khi mở cửa đón người mới vào đào tạo.',
    },
    philosophy:
      '45 ngày (1.5 tháng) là điểm cân bằng chuẩn cho ngành nối mi: đủ dài để FM tự tin đón và kèm tân binh, nhưng đủ chặt để không kéo lê sang kỳ lương thứ 3 làm chùng nhịp đào tạo.',
  },
  'ctrl-bounty': {
    id: 'ctrl-bounty',
    badge: 'Đào Tạo & Nhân Bản · +500K→3M',
    title: 'Thưởng Nóng Đẻ Quân (Trả 1 Lần)',
    summary:
      '4 nấc thưởng trả 1 lần trực tiếp cho FM đào tạo khi dìu dắt nhân sự vượt mốc nghề nghiệp, không bị chia đôi kể cả khi shop tách 2 FM.',
    illustration: 'bounty-ladder',
    howItWorks: [
      'CV mới qua thử việc 60 ngày (+500K/người): trụ vững sau 45 ngày miễn mẫu số và đạt ≥ 30M/tháng ở mốc 60 ngày.',
      'Thăng hạng CV → CVL (+1.0M/người): giữ chuẩn Tự vấn ổn định 2 tháng liên tiếp.',
      'Thăng hạng CVL → CVLL (+2.0M/người): không giới hạn số CVLL trong shop, hễ đạt chuẩn là thưởng.',
      'Đào tạo FM #2 kế cận (+3.0M/người): bổ nhiệm thành công và đứng ca độc lập tại sàn.',
    ],
    formula: 'Thưởng Đẻ Quân = (Qua 60N × 500K) + (Lên CVL × 1M) + (Lên CVLL × 2M) + (Đẻ FM #2 × 3M)',
    example: {
      title: 'Tháng có 1 tân binh qua 60N và 1 CV lên CVL',
      lines: [
        '• 1 bạn vượt 60 ngày (đạt ≥30M): +500K.',
        '• 1 bạn CV thăng hạng CVL: +1.00M.',
        '• Khoản này cộng thẳng 1.50M cho FM đào tạo (không chia đôi theo tỷ lệ FM).',
      ],
      result: 'Tổng Thưởng Nóng Đẻ Quân = +1.50M trong kỳ lương.',
    },
    philosophy:
      'Muốn nhân bản chuỗi 100 cửa hàng, tài sản lớn nhất không phải mặt bằng mà là FM biết "đẻ" ra thế hệ CVL, CVLL và FM kế cận.',
  },
  'ctrl-hub-mode': {
    id: 'ctrl-hub-mode',
    badge: 'Chiến Lược 100 Shop · Hub & Spoke',
    title: 'Mô Hình Quản Lý Sàn (1 FM vs 2 FM Lò Đúc)',
    summary:
      'Lựa chọn kiến trúc quản trị khi shop lớn lên ≥ 13 CV & 650M: giữ 1 FM kết hợp CVLL Keyholder (Vệ tinh) hay chạy 2 FM (Lò Đúc đào tạo quản lý cho chuỗi).',
    illustration: 'hub-spoke-2fm',
    howItWorks: [
      'Tự động: hệ thống tự bật 2 FM khi shop vượt đồng thời cả 2 cổng (≥ 13 CV chính thức VÀ ≥ 650M), ngược lại giữ 1 FM.',
      '1 FM · Vệ tinh (chuẩn 100 shop): chỉ dùng 1 FM chính kết hợp đội CVLL Keyholder (+1M phụ cấp/người) tự vận hành ca tối & cuối tuần, giúp P&L shop rất gọn.',
      '2 FM · Lò Đúc: đầu tư thêm 1 FM #2 (CAPEX đào tạo ~70M/3 tháng) khi muốn xuất xưởng một FM đủ cứng để đi mở chi nhánh mới.',
      '3 Tín hiệu Pha 2 (Mở rộng 100 shop): cảnh báo khi có mặt bằng mới, tỷ lệ Tự lái ≥ 75% hoặc doanh thu 3 tháng liên tiếp > 650M.',
    ],
    formula: '2 FM Tự động ⇔ (CV chính thức ≥ 13) VÀ (Doanh thu ≥ 650M)',
    example: {
      title: 'So sánh tại Đề Thám 16 CV · 768M',
      lines: [
        '• Chọn 1 FM · Vệ tinh + 1 CVLL Keyholder: Chi phí quản lý gọn (~22M), Lãi ròng shop cao hơn ~14–16M/tháng.',
        '• Chọn 2 FM · Lò Đúc: Chia tải điều hành và huấn luyện một FM #2 chuẩn bị đưa sang Shop mới sau 1 quý.',
      ],
      result: 'Vệ tinh tối đa lợi nhuận 100 cửa hàng; Lò Đúc là bệ phóng tạo tướng mở rộng.',
    },
    philosophy:
      'Không áp cứng 2 FM cho mọi shop lớn vì sẽ đội định phí khi nhân 100 cửa hàng. Tách rõ Shop Vệ tinh (kiếm lời) và Shop Lò Đúc (đẻ tướng).',
  },
  'ctrl-fm-level': {
    id: 'ctrl-fm-level',
    badge: 'Thâm Niên & Năng Lực · Lương Cứng',
    title: 'Cấp Bậc FM 1 / FM 2 / FM 3',
    summary:
      'Thang bậc cấp độ của Floor Manager, quyết định trực tiếp mức lương cứng nền (8M / 9M / 10M) trước khi tính các lớp thưởng biến đổi.',
    illustration: 'fm-levels-prorate',
    howItWorks: [
      'FM 1 (8M): cấp quản lý mới nhận sàn, tập trung giữ 8 trụ ổn định.',
      'FM 2 (9M): quản lý thuần thục vận hành, giữ được Tự lái và đào tạo CV.',
      'FM 3 (10M): quản lý kỳ cựu hoặc Lò Đúc, có khả năng kèm cặp FM kế cận mở chuỗi.',
    ],
    formula: 'Lương cứng thực nhận = Lương bậc FM × min(1.0, Ngày công ÷ 26) + (Cover ca × 500K)',
    example: {
      title: 'FM 2 đi làm 25/26 công và cover 1 ca nghỉ',
      lines: [
        '• Lương bậc FM 2: 9.00M.',
        '• Tính theo ngày công: 9.00M × (25 / 26) = 8.65M.',
        '• Cộng 1 ca cover đột xuất (+500K): 8.65M + 0.50M = 9.15M.',
      ],
      result: 'Lương cứng & Cover ca = 9.15M (chưa gồm % DT và 8 Sao).',
    },
    philosophy:
      'Lương cứng đủ để FM yên tâm sống khỏe với nghề, còn thu nhập đột phá (18M–30M+) nằm ở % doanh thu và chất lượng 8 trụ sao.',
  },
  'ctrl-workdays': {
    id: 'ctrl-workdays',
    badge: 'Chuyên Cần · Chuẩn 26 Công',
    title: 'Ngày Công Thực Tế',
    summary: 'Số ngày làm việc thực tế tại sàn trong tháng trên chuẩn 26 công.',
    illustration: 'fm-levels-prorate',
    howItWorks: [
      'Đi đủ 26/26 ngày: nhận 100% lương cứng bậc FM.',
      'Nghỉ dưới 26 ngày (tính theo thực tế 18–26): lương cứng nhân theo tỷ lệ (Ngày công / 26).',
      'Thưởng % DT và Quỹ 8 Sao vẫn tính theo hiệu quả cả tháng của sàn (trừ khi nghỉ quá dài không đảm bảo hiện diện).',
    ],
    formula: 'Hệ số ngày công = min(1.0, Ngày công ÷ 26)',
    example: {
      title: 'FM 3 (10M) nghỉ 2 ngày còn 24/26 công',
      lines: ['• Hệ số công = 24 ÷ 26 = 92.31%.', '• Lương cứng = 10.00M × 92.31% = 9.23M.'],
      result: 'Giảm 770K tiền lương cứng tương ứng 2 ngày nghỉ.',
    },
    philosophy: 'Quản lý là tấm gương hiện diện cho đội ngũ tại sàn — minh bạch ngày công giúp giữ kỷ luật công bằng.',
  },
  'ctrl-cover': {
    id: 'ctrl-cover',
    badge: 'Hỗ Trợ Đồng Đội · +400K / ca (2 FM)',
    title: 'Cover Ca Đồng Đội',
    summary: 'Số ca một FM đứng ra gánh thay hoặc hỗ trợ cho đồng đội FM còn lại khi chi nhánh chạy mô hình 2 FM.',
    illustration: 'fm-levels-prorate',
    howItWorks: [
      'Chỉ áp dụng khi chi nhánh vận hành mô hình 2 FM (gồm 1 FM chính và 1 FM #2).',
      'Mỗi ca cover đồng đội cộng thêm +400K thẳng vào phần thu nhập FM đó.',
    ],
    formula: 'Tiền Cover ca (khi 2 FM) = Số ca cover × 400K',
    example: {
      title: 'Shop chạy 2 FM và FM trực cover 2 ca cho đồng đội',
      lines: ['• Số ca cover = 2 ca × 400K/ca.'],
      result: 'Cộng thêm +800K vào tổng thu nhập tháng của FM cover.',
    },
    philosophy:
      'Tạo cơ chế hỗ trợ sòng phẳng giữa hai FM tại những chi nhánh quy mô lớn, không ai bị thiệt khi đứng ra gánh ca giúp đồng đội.',
  },
  'ctrl-worms': {
    id: 'ctrl-worms',
    badge: 'Giới Hạn Trần Sao · Maps',
    title: 'Sâu Google Maps',
    summary:
      'Số review tiêu cực trên Google Maps chưa được hóa giải; cứ tăng mỗi 1 Sâu net sẽ siết chặt trần sao tối đa của trụ Google Maps.',
    illustration: 'pillar-maps',
    howItWorks: [
      'Net Sâu = max(0, Số Sâu Maps − Số Bướm chuộc sao).',
      'Net Sâu = 0: tối đa 3★ · Net Sâu = 1: trần tối đa 2★ · Net Sâu = 2: trần 1★ · Net Sâu ≥ 3: tụt về 0★ (0đ).',
    ],
    formula: 'Trần Maps: 0 sâu → 3★ · 1 sâu → 2★ · 2 sâu → 1★ · ≥3 sâu → 0★',
    example: {
      title: 'Đạt mốc 3★ theo số review nhưng dính 1 Sâu Maps (chưa có Bướm gỡ)',
      lines: [
        '• Net Sâu = 1 − 0 = 1 → Trần tối đa bị khóa ở 2★ (+400K thay vì +600K).',
        '• Nếu có 1 Bướm chuộc sao → Net Sâu về 0, khôi phục lại 3★ (+600K).',
      ],
      result: 'Mỗi Sâu net chưa gỡ hạ 1 bậc sao trụ Maps.',
    },
    philosophy:
      'Một trải nghiệm tệ làm ảnh hưởng uy tín thương hiệu trên bản đồ số; đặt cơ chế giảm trần từng nấc kết hợp Bướm chuộc để khuyến khích cứu khách ngay tại sàn.',
  },
  'ctrl-butterflies': {
    id: 'ctrl-butterflies',
    badge: 'Điểm Cộng Chuộc Lỗi · Gỡ 1 Sâu / +1★ Maps',
    title: 'Bướm Chuộc Sao',
    summary:
      'Điểm cộng ghi nhận hành động xuất sắc giúp khách quay xe hoặc khen vượt mong đợi — dùng để gỡ 1 Sâu Maps hoặc cộng thêm 1★ Maps.',
    illustration: 'pillar-maps',
    howItWorks: [
      'Mỗi Bướm chuộc sao trừ đi 1 Sâu Google Maps khi tính Net Sâu (Net Sâu = max(0, Sâu − Bướm)).',
      'Nếu sàn sạch bóng (0 Sâu Maps) và có ít nhất 1 Bướm, trụ Google Maps được cộng thêm +1★ (không vượt quá trần 3★).',
    ],
    formula: 'Net Sâu = max(0, Sâu − Bướm) · Nếu Sâu = 0 & Bướm > 0 ⇒ +1★ Maps (max 3★)',
    example: {
      title: 'Shop có 1 Sâu Maps nhưng nhận được 1 Bướm chuộc sao',
      lines: ['• Net Sâu = 1 − 1 = 0 Sâu.', '• Trần trụ Maps được gỡ khóa hoàn toàn lên lại 3★.'],
      result: 'Khôi phục trọn vẹn mốc sao Google Maps nhờ điểm Bướm.',
    },
    philosophy:
      'Lỗi vận hành đôi khi khó tránh 100%, nhưng cách đội ngũ chăm sóc chuộc lỗi biến khách chưa hài lòng thành người ủng hộ mới là bản lĩnh dịch vụ.',
  },
  'ctrl-late': {
    id: 'ctrl-late',
    badge: 'Tốc Độ Phản Hồi · -200K / lỗi',
    title: 'Trễ Xử Lý 24–48h',
    summary: 'Số phản hồi khách hàng hoặc đầu việc vận hành bị ngâm quá 24–48h chưa chốt phương án giải quyết.',
    illustration: 'shield-penalty',
    howItWorks: [
      'Mỗi trường hợp xử lý trễ 24–48h trừ -200K trực tiếp vào Quỹ 8 Trụ Sao trước khi nhân hệ số Khiên.',
      'Quỹ Sao sau trừ không âm dưới 0đ (chặn đáy ở 0đ, không trừ vào lương cứng).',
    ],
    formula: 'Trừ Quỹ Sao = Số ca trễ × 200K',
    example: {
      title: '2 ca xử lý trễ 24–48h trên Quỹ Sao 3.00M',
      lines: ['• Tổng Quỹ Sao Gross = 3.00M.', '• Trừ 2 ca trễ: 2 × 200K = -400K.'],
      result: 'Quỹ Sao còn lại trước Khiên = 2.60M.',
    },
    philosophy:
      'Trong ngành dịch vụ, vấn đề nhỏ giải quyết trong 2 giờ là khách hài lòng; để ngâm qua 48 giờ sẽ biến thành khủng hoảng mất khách vĩnh viễn.',
  },
  'ctrl-shields': {
    id: 'ctrl-shields',
    badge: 'Kỷ Luật Tuần · -25% / khiên',
    title: 'Mất Khiên Tuần (Thủ Thành 4 Tuần)',
    summary:
      'Hệ thống 4 Khiên bảo vệ Quỹ 8 Trụ Sao trong 4 tuần của tháng. Mất mỗi 1 khiên sẽ cắt 25% toàn bộ Quỹ 8 Sao thực nhận.',
    illustration: 'shield-penalty',
    howItWorks: [
      'Đầu tháng sàn có 4 Khiên nguyên vẹn (giữ 100% Quỹ 8 Sao).',
      'Mỗi khi mất 1 Khiên tuần do vi phạm kỷ luật tuần bị trừ -25% toàn bộ Quỹ 8 Sao; mất 4 Khiên = mất trắng Quỹ Sao.',
      'Đặc biệt: nếu Trụ Gắn Kết thiếu Tiệc Tháng hoặc thiếu ảnh/link check-in MXH, hệ thống tự động phạt thêm +1 Khiên mất (-25%).',
    ],
    formula: 'Hệ số Khiên = max(0%, 100% - 25% × min(4, Khiên mất + Phạt thiếu Tiệc/MXH))',
    example: {
      title: 'Mất 1 khiên kỷ luật + quên check-in MXH Tiệc Tháng',
      lines: [
        '• Khiên mất nhập tay: 1 khiên.',
        '• Phạt thiếu check-in MXH Tiệc Tháng: +1 khiên → Tổng = 2 khiên hiệu lực.',
        '• Hệ số còn lại = 100% - 50% = 50%.',
      ],
      result: 'Quỹ 8 Trụ Sao bị cắt một nửa (còn 50%).',
    },
    philosophy:
      'Không đợi cuối tháng mới "chạy nước rút". Cơ chế 4 Khiên tuần đảm bảo phong độ dịch vụ và sự gắn kết tập thể đều đặn từng tuần một.',
  },
  'ctrl-funfund': {
    id: 'ctrl-funfund',
    badge: 'Nạp Ví Đội Ngũ · +80K / ca',
    title: 'Ca Tư Vấn (Fun Fund)',
    summary: 'Số ca tư vấn khách bổ sung do sàn thực hiện trong tháng, mỗi ca trích +80K nạp thẳng vào Quỹ Shop đi ăn.',
    illustration: 'shop-fund-rollover',
    howItWorks: [
      'Mỗi ca tư vấn hợp lệ đóng góp +80K vào ví Quỹ Shop của chi nhánh.',
      'Tiền này tách riêng hoàn toàn với lương FM và cộng dồn sang tháng kế tiếp nếu chưa sử dụng hết.',
    ],
    formula: 'Fun Fund nạp Quỹ Shop = Số ca tư vấn × 80K',
    example: {
      title: 'Trong tháng sàn phát sinh 5 ca tư vấn',
      lines: ['• 5 ca × 80K/ca = 400K.'],
      result: 'Nạp +400K vào Quỹ Shop cho bữa ăn tháng.',
    },
    philosophy:
      'Gắn trực tiếp công sức tư vấn tận tâm của cả sàn thành những buổi liên hoan thật sự vui vẻ, minh bạch ngân sách.',
  },
  'ctrl-weekly-quest': {
    id: 'ctrl-weekly-quest',
    badge: 'Nhiệm Vụ Tuần · HR & CEO',
    title: 'Weekly Quest Đạt Trong Tháng',
    summary:
      'Số nhiệm vụ tuần do HR & CEO đặt ra (ví dụ: 2 bộ Undermink/CV, 100% tặng chuối không ai đi trễ, ≤1F-1A-1L) mà cả team hoàn thành.',
    illustration: 'shop-fund-rollover',
    howItWorks: [
      'Mỗi Weekly Quest đạt chuẩn nhận mức thưởng quy định (mặc định 250K/quest) đổ thẳng vào Quỹ Shop.',
      'Mỗi tháng có 4 tuần × nhiều quest linh hoạt theo mục tiêu chiến dịch (tối đa mô phỏng 16 quest/tháng).',
      'Tiền thưởng cộng dồn cùng Fun Fund để chi cho Tiệc Tháng.',
    ],
    formula: 'Quỹ Quest tháng = Số Weekly Quest đạt × Thưởng mỗi Quest',
    example: {
      title: 'Team hoàn thành 6 Weekly Quest (250K/quest)',
      lines: ['• 6 quest × 250K = 1.50M đổ vào Quỹ Shop.'],
      result: 'Cả shop có thêm 1.50M ngân sách liên hoan tháng mà không cần xin duyệt chi lại.',
    },
    philosophy:
      'Biến các chỉ tiêu khó (bán dịch vụ mới, văn hóa tặng chuối đúng giờ, chống lỗi FAL) thành trò chơi đồng đội có phần thưởng chung ngay cuối tuần.',
  },
  'ctrl-autonomy-pct': {
    id: 'ctrl-autonomy-pct',
    badge: 'Chuẩn Tự Vận Hành · CVL & CVLL',
    title: 'Tỷ Lệ Đội Ngũ Tự Lái (%)',
    summary:
      'Phần trăm nhân sự tại sàn đã đạt trình độ Tự chủ (CVL / CVLL) có thể tự đón khách, tư vấn, giữ chất lượng mà không cần FM kè kè.',
    illustration: 'pillar-autonomy',
    howItWorks: [
      'Từ 30%–49%: đạt nền 1★ Tự lái.',
      'Từ 50%–59% + có ít nhất 1 CVLL: đạt 2★ và mở khóa quyền Tự lái Lễ Tết.',
      'Từ 60%+ + có ít nhất 2 CVLL (gấp đôi định mức 2★): đạt đỉnh 3★ và tạo nền vững cho mô hình 1 FM Vệ tinh.',
    ],
    formula: 'Tự lái đạt chuẩn 2★ (≥50% & ≥1 CVLL) ⇒ Mở khóa Tự lái Lễ Tết',
    example: {
      title: 'Shop 16 CV có 8 CVL và 2 CVLL',
      lines: [
        '• Tỷ lệ tự lái = (8 + 2) / 16 = 62.5% (≥ 60%).',
        '• Có 2 CVLL (đạt chuẩn 3★).',
        '• Shop đủ sức gánh lịch Lễ Tết và có ứng viên CVLL làm Keyholder.',
      ],
      result: 'Đạt 3★ Tự lái (+700K) và mở khóa Tự lái Lễ Tết.',
    },
    philosophy:
      'Đoanh nghiệp muốn nhân 100 cửa hàng không thể phụ thuộc hoàn toàn vào 1 người quản lý trực 24/7 — đội ngũ tự chủ tại sàn là chìa khóa mở rộng.',
  },
  'ctrl-cvll-keyholders': {
    id: 'ctrl-cvll-keyholders',
    badge: 'Cánh Tay Phải · +1M / người',
    title: 'Số CVLL Keyholder',
    summary:
      'Số Chuyên Viên Tự Chủ Cấp Cao (CVLL) được giao trách nhiệm cầm chìa khóa mở/đóng ca và hỗ trợ điều phối floor trong mô hình 1 FM Vệ tinh.',
    illustration: 'hub-spoke-2fm',
    howItWorks: [
      'Mỗi CVLL Keyholder nhận phụ cấp trách nhiệm +1.00M/tháng (tính vào chi phí nhân sự P&L).',
      'Khi dùng 1 FM Vệ tinh thay cho 2 FM: dù cộng thêm 1–2 CVLL Keyholder (1M–2M), tổng định phí vẫn rẻ hơn nhiều so với nuôi thêm 1 FM #2.',
      'Đồng thời đóng góp vào điều kiện ≥ 1 hoặc ≥ 2 CVLL ở Trụ Đội Ngũ Tự Lái.',
    ],
    formula: 'Phụ cấp Keyholder trong P&L = Số CVLL Keyholder × 1.00M',
    example: {
      title: 'Shop 16 CV dùng 1 FM + 1 CVLL Keyholder thay vì 2 FM',
      lines: [
        '• Chi phí thêm 1 CVLL Keyholder: +1.00M/tháng.',
        '• Tiết kiệm được lương cứng + BHXH + thưởng sao của FM #2.',
      ],
      result: 'Giữ vận hành trơn tru cả tuần và giữ P&L tối ưu.',
    },
    philosophy:
      'Trao quyền giữ chìa khóa cho nghệ nhân giỏi nhất giúp họ tăng thu nhập, có vị thế và làm bệ đỡ cho thế hệ FM tương lai.',
  },
  'pnl-toggles': {
    id: 'pnl-toggles',
    badge: 'Tham Số P&L · Định Phí & Thuế',
    title: 'Các Công Tắc Chi Phí P&L (BHXH · CHO · Khách Mới)',
    summary:
      'Bật/tắt các lớp chi phí thực tế trong báo cáo P&L shop: Bảo hiểm xã hội, phân bổ CHO chuỗi, và chi phí Marketing kéo khách mới.',
    illustration: 'hub-spoke-2fm',
    howItWorks: [
      'Đóng BHXH Full (~1.77M/nhân sự): tính đầy đủ nghĩa vụ bảo hiểm vào tổng chi phí con người.',
      'Phân bổ CHO (~8M/tháng): tính chi phí quản lý vùng/giám đốc vận hành phân bổ về từng shop.',
      'Khách mới (CAC ~250K/khách + biến phí): phản ánh chi phí chạy quảng cáo và quà/hoa hồng kéo khách mới.',
    ],
    example: {
      title: 'So sánh Lãi Ròng khi bật đủ BHXH & CHO',
      lines: [
        '• Tắt CHO & BHXH: thấy lãi vận hành gộp tại sàn.',
        '• Bật đủ cả 2 + Khách mới: thấy Lãi Ròng (Residual) thật sau mọi nghĩa vụ chuỗi.',
      ],
      result: 'Đảm bảo ra quyết định mở rộng trên con số thật, không bị ảo giác lợi nhuận.',
    },
    philosophy:
      'Minh bạch từng đồng định phí giúp chủ shop và FM nhìn cùng một bức tranh tài chính — biết chính xác vì sao cần tăng doanh thu và giữ năng suất.',
  },
  'pnl-people': {
    id: 'pnl-people',
    badge: 'Chi Phí Nhân Sự · P&L Sàn',
    title: 'Tổng Chi Nhân Sự Toàn Sàn',
    summary:
      'Tổng chi phí trả cho toàn bộ con người vận hành tại chi nhánh: lương & chia sẻ doanh thu CV, FM (1 hoặc 2 FM), CVLL Keyholder, BHXH và CHO.',
    illustration: 'hub-spoke-2fm',
    howItWorks: [
      'Gồm lương + hoa hồng của CV/CVL/CVLL tại sàn, tổng quỹ FM (1 FM hoặc 2 FM), phụ cấp CVLL Keyholder (+1M/người), BHXH doanh nghiệp (nếu bật) và phân bổ CHO.',
      'So sánh trực tiếp tỷ lệ % chi phí nhân sự trên Tổng Doanh Thu giúp phát hiện ngay khi shop bị phình định phí quản lý.',
    ],
    formula: 'Tổng Chi Nhân Sự = Lương Sàn (CV/CVL/CVLL) + Quỹ FM + Phụ cấp Keyholder + BHXH + CHO',
    example: {
      title: 'So sánh 1 FM Vệ tinh vs 2 FM Lò Đúc ở mức 768M',
      lines: [
        '• Giữ 1 FM Vệ tinh + 1 CVLL Keyholder: tổng chi nhân sự gọn hơn ~14–16M mỗi tháng.',
        '• Chọn 2 FM Lò Đúc: cộng thêm quỹ lương FM #2 nhưng đổi lấy 1 quản lý sẵn sàng đi mở shop mới.',
      ],
      result: 'Theo dõi % Nhân sự / Doanh thu để luôn giữ biên lợi nhuận khỏe.',
    },
    philosophy:
      'Mỗi đồng chi nhân sự cần tạo ra doanh thu và chất lượng tương xứng — đó là lý do mô hình 100 cửa hàng ưu tiên Shop Vệ tinh kết hợp CVLL Keyholder.',
  },
  'pnl-residual': {
    id: 'pnl-residual',
    badge: 'Biên Giữ Lại · Lãi Trước Mặt Bằng',
    title: 'Dư Ròng Trước Mặt Bằng',
    summary:
      'Số tiền thực tế còn lại sau khi trừ toàn bộ chi phí nhân sự, vật tư, marketing khách mới và quản lý — dùng để trả tiền thuê mặt bằng, khấu hao và lãi ròng chủ shop.',
    illustration: 'income-stack',
    howItWorks: [
      'Dư ròng trước mặt bằng = Tổng Doanh Thu − Tổng Chi Nhân Sự − Vật tư & Biến phí vận hành − Marketing khách mới (nếu bật).',
      'Khi tăng quân số mà giữ được REV/CV = 48M+, định phí mặt bằng và CHO được chia mỏng trên nền doanh thu lớn hơn, giúp biên giữ lại tăng nhanh.',
    ],
    formula: 'Dư ròng trước MB = Doanh thu − Tổng chi nhân sự − Vật tư − Chi phí khách mới',
    example: {
      title: 'Tại sao thêm CV chuẩn 48M luôn làm P&L shop tốt hơn',
      lines: [
        '• Tiền thuê mặt bằng chi nhánh là cố định dù shop có 10 CV hay 16 CV.',
        '• Mỗi CV mới đạt 48M sau khi trừ lương và vật tư vẫn để lại thặng dư ròng gộp thẳng vào lãi của shop.',
      ],
      result: 'Tăng lấp giường với REV/CV chuẩn làm cả FM lẫn Chủ shop cùng thắng.',
    },
    philosophy:
      'Win–Win–Win bền vững chỉ xảy ra khi Chuyên Viên có thu nhập tốt, FM thưởng tăng theo quy mô và Chủ shop giữ được biên lợi nhuận dương khỏe mạnh.',
  },
} as const satisfies Record<string, FmGuideEntry>;
