import type { CareerProgressionConfig, CareerStaffSummary, StaffCareerStatus } from '@mos-lab/shared';
import {
  DEFAULT_CAREER_PROGRESSION_CONFIG,
  DEFAULT_FM_FLOOR_FARM_CONFIG,
  calculateComboBonus,
  formatComboTierBracketLabel,
  matchesCareerBranchFilter as matchesSharedCareerBranchFilter,
  resolveCareerBranchFilterStoreId,
} from '@mos-lab/shared';

export { calculateComboBonus, formatComboTierBracketLabel };

export const FALLBACK_CAREER_PROGRESSION_CONFIG: CareerProgressionConfig = DEFAULT_CAREER_PROGRESSION_CONFIG;

export interface CareerIsland {
  id: 'ktv' | 'cv' | 'cv_plus' | 'cv_plus_plus' | 'fm' | 'cho' | 'boss';
  name: string;
  badge: string;
  icon: string;
  sub: string;
  title: string;
  desc: string;
  focus: string;
  skills: Array<{ name: string; desc: string }>;
  perks: string[];
  gateText: string;
}

export function getCareerIslands(safeConfig: CareerProgressionConfig): CareerIsland[] {
  const { cvToCc, cvPlusToCvPlusPlus, cvPlusPlusToFm, ccToFm, fmToCho, choToBoss, rewardRates } = safeConfig;
  const fm = { ...DEFAULT_FM_FLOOR_FARM_CONFIG, ...(safeConfig.fmFloorFarm || {}) };
  const fm3StarTotal = fm.gmaps3StarBonus + fm.inv3StarBonus + fm.fac3StarBonus + fm.ops3StarBonus;
  const fm1M = (fm.fm1BaseSalary / 1_000_000).toFixed(fm.fm1BaseSalary % 1_000_000 === 0 ? 0 : 1);
  const fm2M = (fm.fm2BaseSalary / 1_000_000).toFixed(fm.fm2BaseSalary % 1_000_000 === 0 ? 0 : 1);
  const fm3M = (fm.fm3BaseSalary / 1_000_000).toFixed(fm.fm3BaseSalary % 1_000_000 === 0 ? 0 : 1);

  return [
    {
      id: 'ktv',
      name: 'KTV · Thử Việc',
      badge: 'Khởi Đầu',
      icon: '⛑️',
      sub: 'Tập Sự & Rèn Luyện',
      title: 'Kỹ Thuật Viên Tập Sự · Probation Tech',
      desc: 'Giai đoạn học hỏi kỹ thuật và văn hóa phục vụ Wings. Cần có sự bảo trợ và kiểm định để chính thức lên CV.',
      focus: 'Thực hành tay nghề nối mi, quy trình tiệt trùng nhíp giường và được bảo trợ uy tín',
      skills: [
        { name: 'Sát Hạch Dáng Mi', desc: 'Đúng chuẩn form mi Wings, hoàn thiện đúng SLA thời gian quy định' },
        { name: 'An Toàn Tiệt Trùng', desc: 'Quy trình khử trùng nhíp & vệ sinh giường mi đạt 0 biên bản QA/QC' },
        {
          name: 'Bảo Trợ Uy Tín',
          desc: 'Được Floor Manager, Đàn Chị hoặc Bộ phận Đào tạo kiểm định & bảo kê lên Chuyên Viên',
        },
      ],
      perks: [
        'Được các Đàn Chị và FM kèm cặp cầm tay chỉ việc trực tiếp tại giường',
        'Hưởng mức hỗ trợ học việc / lương thử việc theo quy chế chi nhánh',
        'Được bảo kê nâng cấp lên CV ngay khi hoàn thành kỳ sát hạch',
      ],
      gateText:
        'Được Floor Manager hoặc Đàn Chị bảo trợ + Hoàn thành kỳ sát hạch tay nghề & an toàn QA/QC ➔ Thăng cấp chính thức thành CV!',
    },
    {
      id: 'cv',
      name: 'CV',
      badge: 'Ải 1',
      icon: '👁️',
      sub: '70% Tip + Thâm Niên',
      title: 'Chuyên Viên Mi',
      desc: 'Đôi bàn tay mềm mại, từng sợi mi êm ru ru giấc ngủ nàng thơ. Kỹ thuật an toàn tuyệt đối tại giường.',
      focus: 'Kỹ thuật tinh xảo & An toàn tuyệt đối tại giường (3 tháng liền)',
      skills: [
        { name: 'Khử Trùng Phép Thuật', desc: 'Vệ sinh giường, nhíp tiệt trùng 100%, 0 biên bản QA/QC' },
        { name: 'Nối Mi Êm Ái', desc: 'Đúng SLA, không cộm, không cay mắt' },
        { name: 'Bảo Hành Kỹ Thuật', desc: 'Chịu trách nhiệm sửa ca Fix không tính công' },
      ],
      perks: [
        'Hưởng trọn vẹn 70% tổng tiền tip khách yêu quý (20% CC + 3% CS)',
        'Thưởng nóng tiền tươi khi khách đánh giá 5★',
        'Thưởng giữ chân khách quen (Retention Bonus)',
        'Thưởng Thâm Niên: +5% đến +20% trên Thưởng CV Xoay hàng tháng',
      ],
      gateText: `Đạt ${cvToCc.minOrders} ca mi (3 tháng liên tiếp) + Tip cao hơn TB chi nhánh ≥ ${(cvToCc.minTipRatioAboveShop * 100).toFixed(0)}% + Fix ≤ ${(cvToCc.maxFixRate * 100).toFixed(1)}% + HI ≥ ${(cvToCc.minHappinessIndex * 100).toFixed(0)}% (0 biên bản QA/QC) ➔ Mở khóa ải Trùm Cuối Tự Bán Combo (≥ ${(cvToCc.minSelfComboRate * 100).toFixed(0)}% khách của mình) để thăng cấp CV🪶!`,
    },
    {
      id: 'cv_plus',
      name: 'CV🪶',
      badge: 'Đang Triển Khai',
      icon: '👁️',
      sub: 'Tự Vấn + 90% Tip',
      title: 'Chuyên Viên · CV🪶',
      desc: 'Sang trọng kiểu quý cô, tự tin tư vấn, đĩnh đạc và cuốn hút. Độc lập tác chiến tại giường: tự hiểu dáng mắt, tự tư vấn dáng mi & combo dưỡng mi cho khách của chính mình.',
      focus:
        'Trực tiếp tư vấn trọn gói cho khách mình, chốt combo ≥ 20% trên khách Not Combo Live, chăm sóc khách ruột',
      skills: [
        { name: 'Trực Tiếp Tư Vấn', desc: 'Hiểu mi khách nhất, tự tư vấn dáng mi & combo mi dưỡng ≥ 20%' },
        { name: 'Gắn Kết Khách Ruột', desc: 'Xây dựng tệp khách quen trung thành, tỷ lệ quay lại cao' },
        { name: 'Đại Sứ Google 5★', desc: 'Đạt tối thiểu 20 Google Review 5 sao/tháng từ khách hài lòng' },
      ],
      perks: [
        'Lương giờ bậc cao: 27.5K/h (+2K/h so với CV)',
        'Hưởng trọn 90% Tiền Tip (70% Tip nối mi + 20% Tip tự tư vấn) khi tự phục vụ khách mình',
        'Điều kiện nhận hết thưởng: Bán tối thiểu 20% Combo trên khách Not Combo Live (Combo Live bán thêm cũng cộng dồn)',
        'Trường hợp bán không được (< 20% Combo): Vẫn nhận 90% Tip, không nhận thêm bất kỳ phần thưởng nào khác (lương tăng, thưởng combo = 0đ)',
        'Quy tắc 2 Tháng Liền: 2 tháng liền không đạt chuẩn thì quay lại CV (Tip tụt về 70%, mất quyền tự tư vấn)',
        'Hoa hồng Combo tiền tươi: < 2M = 50K, mỗi 1M kế tiếp = +50K (mua 2 gói cùng lúc cộng gộp tổng tiền) + Thưởng Dưỡng mi 100K/cây',
        'Thưởng Thâm Niên: +5% đến +20% trên Thưởng CV Xoay hàng tháng',
      ],
      gateText: `Duy trì CV🪶: Tự chốt combo ≥ 20% trên khách Not Combo Live + 0 vi phạm QA/QC + HI ≥ 65%. Chú ý: 2 tháng liền không đạt chuẩn thì quay lại CV!`,
    },
    {
      id: 'cv_plus_plus',
      name: '🪶CV🪶',
      badge: 'Đang Nghiên Cứu',
      icon: '👁️',
      sub: 'Sảnh + Hộ 20%',
      title: 'Chuyên Viên Cấp Cao · 🪶CV🪶',
      desc: 'Bản lĩnh vững vàng, phong thái đỉnh đạc. Vừa tự làm khách ruột, vừa đứng sảnh đón tiếp & tư vấn giùm cho khách của Chuyên Viên CV khi FM vắng.',
      focus: 'Tư vấn chốt combo toàn sàn khi FM vắng, làm chủ ca trực ngày lễ, nâng đỡ đàn em',
      skills: [
        { name: 'Đàn Chị Sảnh', desc: 'Đón tiếp và tư vấn giùm cho khách của CV khác khi FM không có mặt' },
        {
          name: 'Làm Chủ Ca Trực Lễ',
          desc: 'Độc lập vận hành mở/đóng tiệm, quản lý sảnh và xử lý sự cố trong ngày lễ',
        },
        {
          name: 'Đại Sứ Review 5★',
          desc: `Đạt tối thiểu ${ccToFm?.minMonthlyGoogleReviews || 30} Google Review 5 sao/tháng`,
        },
      ],
      perks: [
        'Lương giờ chuyên viên bậc cao nhất: 29.5K - 30K/h (+4K/h so với CV)',
        'Hưởng trọn 90% Tiền Tip khách mình (70% CV + 20% CC)',
        'Hưởng 20% Tiền Tip Tư Vấn (CC Tip) khi tư vấn hộ cho khách của Chuyên Viên CV (khi FM vắng)',
        'Hoa hồng 2.5% tư vấn giùm cho khách của các CV khác khi FM vắng',
        'Đặc quyền làm Trưởng Ca Trực Ngày Lễ: Hưởng lương lễ x3-x4 + 90% Tip ca mình làm',
        'Thưởng Thâm Niên: +5% đến +20% trên Thưởng CV Xoay',
        'Quy hoạch hạt giống số 1 để bổ nhiệm lên Floor Manager (FM) chính thức!',
      ],
      gateText: `Duy trì 🪶CV🪶 ≥ ${cvPlusPlusToFm?.minMonthsInRole || 3} tháng + Đạt ≥ ${cvPlusPlusToFm?.minMonthlyGoogleReviews || 30} Google Review 5★/tháng + Kiểm tra kho & CSVC hàng tuần + Tỷ lệ combo shop ≥ ${((cvPlusPlusToFm?.minShopComboRate || 0.25) * 100).toFixed(0)}% ➔ Thăng cấp Floor Manager (🪽 FM 🪽)!`,
    },
    {
      id: 'fm',
      name: 'FM 1–2–3 · Vận Hành 8★',
      badge: 'Chuẩn Hóa 8★',
      icon: '🏰',
      sub: `Lương ${fm1M}/${fm2M}/${fm3M}M + 8 Trụ Sao`,
      title: 'Nhạc Trưởng Vận Hành · Floor Manager (FM 1–2–3)',
      desc: 'Quản lý sàn theo hệ thống 8 Trụ Cột Sao (24★ · tối đa 5.05M): 5★ Google Maps 2–4%, kiểm soát FAL, đội ngũ Tự Lái trần 60%, họp CEO & HR ≥ 3 buổi/tuần, tổ chức tiệc tháng ≥ 70–90% check-in MXH và điều phối Quỹ Shop + Weekly Quest.',
      focus:
        'Giữ ≥ 50% giường vận hành, đạt 8 Trụ Cột Sao (5.05M), dẫn dắt Weekly Quest nạp Quỹ Shop và tổ chức ăn uống gắn kết đội ngũ mỗi tháng ≥ 1 lần',
      skills: [
        {
          name: 'Google Maps 5★ & Kiểm Soát FAL',
          desc: 'Đạt 2%/3%/4% review 5★ (2/3/4 rv/CV) với 0 Sâu và giữ FAL ≤ 1.5% / 1.0% / 0.5% trước 48h',
        },
        {
          name: 'Đội Ngũ Tự Lái (Trần 60%) & Weekly Quest Shop',
          desc: 'Phát triển 40–60% CVL/CVLL, gặp CEO & HR ≥ 3 buổi/tuần và dẫn dắt shop chinh phục Weekly Quest (Undermink ≥ 2 bộ/CV, Tặng chuối 0 đi trễ, FAL ≤ 1F·1A·1L)',
        },
        {
          name: 'Tiệc Tháng (70/80/90%), Kho, Phòng & Diện Mạo',
          desc: 'Tổ chức ăn uống ≥ 1 lần/tháng bằng Quỹ Shop + ảnh check-in MXH (0 tiệc mất 1 Khiên), lệch kho ≤ 1%, điểm phòng ≥ 98đ, phong thái chuẩn (đồng phục · mi nối · son), HI ≥ 92% & 6 ca TV',
        },
      ],
      perks: [
        `3 Bậc Lương Cứng nối thẳng CHO: FM 1 = ${fm1M}M · FM 2 = ${fm2M}M · FM 3 = ${fm3M}M / ${fm.workingDaysPerMonth} công (không bao giờ trừ vào lương cứng)`,
        'Quỹ % DT Tăng Trưởng Kép (Xóa vực thẳm 12→13 CV): 1.00% → 1.40%/FM theo độ lấp giường × hiệu suất mượt, cổng kép tách 2 FM (≥13 CV chính thức & ≥650M), miễn mẫu số 45 ngày cho CV mới (tối đa 2 kỳ lương)',
        'Thưởng Nóng Đẻ Quân (1 lần): +500K CV mới qua 60N · +1M CV ➔ CVL · +2M CVL ➔ CVLL · +3M đào tạo FM #2 kế cận',
        '8 Trụ Cột Sao (Max 24★ = 5.05M: 1★ = 1.70M · 2★ = 3.40M · 3★ = 5.05M) kèm 4 Khiên Tuần',
        'Tự Lái Lễ Tết: mở khóa khi đạt ≥ 2★ Tự Lái (50–60% CVL/CVLL, có ≥ 1 CVLL Keyholder và họp CEO & HR ≥ 3 buổi/tuần)',
        'Quỹ Shop Cộng Dồn (Rollover): Fun Fund 80K/ca tư vấn + 100% thưởng Weekly Quest do HR & CEO tùy chỉnh, chi trực tiếp cho tiệc tháng đội ngũ',
        `Túi Chuối Thần Kỳ: Được cấp ${rewardRates.fmMonthlyBananaGrant} Chuối/tháng để thưởng nóng đồng đội`,
      ],
      gateText: `Đạt ≥ 20/24★ liên tiếp 3 tháng (FAL ≤ 0.5%, đủ Tiệc Tháng check-in MXH) + Đội ngũ Tự Lái đạt 3★ (60% & ≥ 2 CVLL) + Họp CEO & HR ≥ 3 buổi/tuần + Thất thoát kho ≤ 1.0% ➔ Thăng cấp Chief Happiness Officer (CHO 11M)!`,
    },
    {
      id: 'cho',
      name: 'CHO · Mẹ Thiên Thần',
      badge: 'Đang Nghiên Cứu',
      icon: '💖',
      sub: 'Khách Mới 1/Shop',
      title: 'Nữ Thần Hạnh Phúc · Chief Happiness Officer',
      desc: 'Trái tim của chi nhánh. 100% Cảm tính & Yêu thương con người. Duy nhất 1 người/Shop. Tập trung 100% Khách Mới & Hạnh Phúc Thiên Thần (không gánh P&L).',
      focus: 'Đón tiếp và thu hút khách mới (ra tiền!) & Nâng đỡ điểm HI Thiên Thần',
      skills: [
        { name: 'Người Giữ Lửa Văn Hóa', desc: 'Lắng nghe tâm tư, chữa lành áp lực và nâng đỡ bạn có điểm HI thấp' },
        {
          name: 'Lan Tỏa & Thu Hút Khách Mới',
          desc: 'Đón tiếp chuẩn 5 sao cho khách mới đến shop (Định mức ≤ 20K/khách)',
        },
        { name: 'Bồi Dưỡng Kế Cận', desc: 'Kèm cặp và đào tạo thế hệ FM & CHO mới tiếp quản' },
      ],
      perks: [
        'Gói đãi ngộ Executive cấp Trưởng Ban (Lương cứng 11M)',
        'Thưởng Cán Mốc Hòa Vốn (3.0M) + Thưởng 3.0% phần doanh thu vượt mốc (DT ≥ 450M, EP ≥ 350M)',
        'Thưởng Phát Triển Thiên Thần (1.5M - 4.5M): Khoán theo số lượng Chuyên Viên đạt chuẩn CV🪶 & 🪶CV🪶 duy trì tại shop (kèm cơ chế tụt cấp)',
        `Thưởng trực tiếp theo số lượng khách mới đến shop (Đạt ≥ ${choToBoss.minMonthlyNewCustomers || 60} khách mới/tháng hoặc 50K/khách)`,
        'Thưởng Tiết Kiệm: Đồng hưởng 10% chi phí vận hành tiết kiệm được cùng FM',
        'Nghỉ lễ trọn vẹn hưởng nguyên gói 11M (không tính thưởng giờ x3-x4); chịu trách nhiệm tối hậu về kết quả và vận hành chi nhánh',
        'Được tài trợ 100% các khóa đào tạo Lãnh đạo Khai vấn chuyên sâu',
      ],
      gateText: `Shop có lãi P&L dương liên tục ≥ ${choToBoss.minProfitableMonths} tháng + Khách mới đến shop ≥ ${choToBoss.minMonthlyNewCustomers || 60} khách/tháng + Biên LN ròng ≥ ${(choToBoss.minNetProfitMargin * 100).toFixed(0)}% + Đã đào tạo thành công 1 FM mới & 1 CHO kế cận ➔ Bổ nhiệm làm BOSS Co-Owner!`,
    },
    {
      id: 'boss',
      name: 'BOSS · Co-Owner',
      badge: 'Đang Nghiên Cứu',
      icon: '💎',
      sub: 'Cổ Tức P&L',
      title: 'Nữ Hoàng Đồng Sáng Lập · Partner & Co-Owner',
      desc: 'Đỉnh cao sự nghiệp. Từ bàn tay cầm nhíp trở thành Bà Chủ đồng sở hữu tiệm. Trách nhiệm tối cao: Tối ưu chi phí & Lợi nhuận P&L.',
      focus: 'Tối ưu chi phí vận hành, quản trị P&L, chia sẻ lợi nhuận & nhân bản chi nhánh',
      skills: [
        { name: 'Tầm Nhìn Chiến Lược', desc: 'Đồng hành cùng Danny mở rộng chuỗi chi nhánh' },
        { name: 'Quản Trị & Tối Ưu Chi Phí', desc: 'Cân đối P&L, siết chặt lãng phí, nâng cao biên lợi nhuận ròng' },
        { name: 'Nhân Bản Văn Hóa', desc: 'Truyền cảm hứng và bệ phóng cho hàng trăm bạn nữ trẻ yêu nghề' },
      ],
      perks: [
        'Nhận Cổ tức Lợi nhuận P&L chi nhánh hàng quý (15% - 20% Lợi nhuận ròng)',
        'Đặc quyền cấp vốn mở chi nhánh nhượng quyền Wings Lashes mới',
        'Tự do tài chính và vị thế Người dẫn dắt trong ngành làm đẹp',
      ],
      gateText: 'Đỉnh vinh quang! Bạn đã đạt nấc thang cao nhất và trở thành Đồng sở hữu Wings Lashes.',
    },
  ];
}

export function formatCareerRoleName(role?: string | null, compact = false): string {
  if (!role) return 'CV';
  switch (role) {
    case 'KTV':
      return compact ? 'KTV' : 'KTV Thử Việc';
    case 'CV':
      return 'CV';
    case 'CV_PLUS':
      return 'CV🪶';
    case 'CV_PLUS_PLUS':
      return '🪶CV🪶';
    case 'MASTER_TECH':
      return 'Master Tech';
    case 'CC':
      return 'CC';
    case 'FM':
      return '🪽 FM 🪽';
    case 'CHO':
      return compact ? 'CHO' : 'CHO · Mẹ Thiên Thần';
    case 'BOSS':
      return compact ? 'BOSS' : 'BOSS · Co-Owner';
    default:
      return role.replace(/_/g, ' ');
  }
}

export interface HudMetricItem {
  id: number;
  name: string;
  value: string;
  iconType: 'eye' | 'bug' | 'coins' | 'shieldCheck' | 'heart' | 'banana';
  isPassed: boolean;
  hasFailed?: boolean;
  tooltip: string;
}

export function computeHudMetrics(
  metrics: StaffCareerStatus['metrics'] | undefined,
  simulationTarget: 'CV_PLUS' | 'CV_PLUS_PLUS',
  safeConfig: CareerProgressionConfig
): HudMetricItem[] | null {
  if (!metrics) return null;
  const m = metrics;
  const targetReq =
    simulationTarget === 'CV_PLUS_PLUS' ? safeConfig.cvPlusToCvPlusPlus : safeConfig.cvToCvPlus || safeConfig.cvToCc;

  const targetOrders = targetReq?.minOrders ?? (simulationTarget === 'CV_PLUS_PLUS' ? 350 : 330);
  const targetMaxFix = targetReq?.maxFixRate ?? (simulationTarget === 'CV_PLUS_PLUS' ? 0.015 : 0.015);
  const minTipRatioAboveShop = targetReq?.minTipRatioAboveShop ?? (simulationTarget === 'CV_PLUS_PLUS' ? 0.15 : 0.05);
  const minBananaCount = targetReq?.minBananaCount ?? (simulationTarget === 'CV_PLUS_PLUS' ? 25 : 20);
  const minHappinessIndex = targetReq?.minHappinessIndex ?? (simulationTarget === 'CV_PLUS_PLUS' ? 0.8 : 0.7);
  const requiredQaAudits =
    targetReq?.minQaAudits ?? (targetReq?.minWeeklyQaAudits ? Math.round(targetReq.minWeeklyQaAudits * 4) : 4);

  const isOrdersPassed = (m.ordersCount || 0) >= targetOrders;
  const isFixPassed = (m.fixRate || 0) <= targetMaxFix;

  const staffTipRate =
    m.staffTipRate ??
    (m.ordersCount ? Math.min(0.65, Math.max(0.2, ((m.totalTip || 0) / (m.ordersCount * 38000)) * 0.45)) : 0.314);
  const shopTipRate = m.shopTipRate ?? 0.45;
  const targetTipRate = m.targetTipRate ?? Number((shopTipRate * (1 + minTipRatioAboveShop)).toFixed(3));
  const isTipPassed = staffTipRate >= targetTipRate || (m.tipRatioAboveShop || 0) >= minTipRatioAboveShop;
  const staffTipRatePercent = Number((staffTipRate * 100).toFixed(1));

  const totalQaAudits = m.qaAudit?.totalAudits ?? 0;
  const hasFailedQa = Boolean(m.qaAudit?.hasFailedAudit);
  const isQaPassed =
    requiredQaAudits === 0 || Boolean(m.qaAudit?.isPassed ?? (totalQaAudits >= requiredQaAudits && !hasFailedQa));

  const happinessIndex = m.happinessIndex ?? 0;
  const isHiPassed = happinessIndex >= minHappinessIndex;
  const hiPercent = Math.round(happinessIndex * 100);

  const bananaCount = m.bananaCount ?? 0;
  const isBananaPassed = bananaCount >= minBananaCount;

  return [
    {
      id: 1,
      name: 'Bộ mi',
      value: `${m.ordersCount || 0}`,
      iconType: 'eye',
      isPassed: isOrdersPassed,
      tooltip: `Bộ mi hoàn thành (90 ngày qua): ${m.ordersCount || 0}/${targetOrders} bộ · ${isOrdersPassed ? '✓ Đạt chuẩn' : '⚡ Còn thiếu'} (Bấm để xem)`,
    },
    {
      id: 2,
      name: 'Fix mi',
      value: `${((m.fixRate || 0) * 100).toFixed(1)}%`,
      iconType: 'bug',
      isPassed: isFixPassed,
      tooltip: `Tỷ lệ bảo hành / sửa: ${((m.fixRate || 0) * 100).toFixed(1)}% (chuẩn < ${(targetMaxFix * 100).toFixed(1)}%) · ${isFixPassed ? '✓ Xuất sắc' : '⚡ Vượt mức'} (Bấm để xem)`,
    },
    {
      id: 3,
      name: 'Tỷ lệ Tip',
      value: `${staffTipRatePercent}%`,
      iconType: 'coins',
      isPassed: isTipPassed,
      tooltip: `Tỷ lệ khách tip: ${staffTipRatePercent}% (chuẩn ≥ ${(targetTipRate * 100).toFixed(1)}% · TB ${m.branchName || 'chi nhánh'}: ${((m.branchTipRate || shopTipRate) * 100).toFixed(1)}%) · ${isTipPassed ? '✓ Đạt chuẩn' : '⚡ Cần thêm'} (Bấm để xem)`,
    },
    {
      id: 4,
      name: 'QA/QC',
      value: `${totalQaAudits}/${requiredQaAudits}`,
      iconType: 'shieldCheck',
      isPassed: isQaPassed,
      hasFailed: hasFailedQa,
      tooltip: `Kiểm định QA/QC: ${totalQaAudits}/${requiredQaAudits} lần · ${hasFailedQa ? 'Bị lỗi FAILED' : isQaPassed ? '✓ Đạt chuẩn' : totalQaAudits === 0 ? 'Chưa kiểm định' : 'Thiếu lượt'} (Bấm để xem)`,
    },
    {
      id: 5,
      name: 'Teamwork HI',
      value: `${hiPercent}%`,
      iconType: 'heart',
      isPassed: isHiPassed,
      tooltip: `Chỉ số HI Thả tim: ${hiPercent}% (chuẩn > ${Math.round(minHappinessIndex * 100)}%) · ${isHiPassed ? '✓ Tin yêu' : '⚡ Cần gắn kết'} (Bấm để xem)`,
    },
    {
      id: 6,
      name: 'Chuối',
      value: `${bananaCount}`,
      iconType: 'banana',
      isPassed: isBananaPassed,
      tooltip: `Chuối yêu thương: ${bananaCount}/${minBananaCount} chuối · ${isBananaPassed ? '✓ Đạt chuẩn' : '⚡ Chưa đủ'} (Bấm để xem)`,
    },
  ];
}

export interface CareerBranchOption {
  key: string;
  label: string;
  count: number;
}

const BRANCH_DISPLAY_PRIORITY: Record<string, number> = {
  'Đề Thám': 1,
  'Estella Place': 2,
  PXL: 3,
};

/** Resolve canonical branch key for Career Path filtering. */
export function getStaffBranchKey(staff: Pick<CareerStaffSummary, 'branchName' | 'branchCode' | 'storeId'>): string {
  const name = staff.branchName?.trim();
  if (name) return name;
  const code = staff.branchCode?.trim();
  if (code) return code;
  if (staff.storeId) return String(staff.storeId);
  return '';
}

/** Check whether a staff member matches the selected career role filter. */
export function matchesCareerRoleFilter(
  staff: Pick<CareerStaffSummary, 'careerRole' | 'role'>,
  roleFilter: string
): boolean {
  if (!roleFilter || roleFilter === 'ALL') return true;
  if (roleFilter === 'CC') return staff.careerRole === 'CC' || (staff.role || '').toLowerCase() === 'cc';
  if (roleFilter === 'FM')
    return staff.careerRole === 'FM' || ['manager', 'fm'].includes((staff.role || '').toLowerCase());
  return staff.careerRole === roleFilter;
}

/** Check whether a staff member matches the selected branch filter. */
export function matchesCareerBranchFilter(
  staff: Pick<CareerStaffSummary, 'branchName' | 'branchCode' | 'storeId'>,
  branchFilter: string
): boolean {
  if (!branchFilter || branchFilter === 'ALL') return true;
  if (resolveCareerBranchFilterStoreId(branchFilter) !== null) {
    return matchesSharedCareerBranchFilter(staff, branchFilter);
  }
  return getStaffBranchKey(staff) === branchFilter;
}

/** Build deterministic branch filter options with per-branch counts for the active role. */
export function buildCareerBranchOptions(
  staffList: CareerStaffSummary[],
  activeRoleFilter = 'ALL'
): CareerBranchOption[] {
  const allBranches = new Set<string>();
  const roleMatchedCounts = new Map<string, number>();
  let totalForRole = 0;

  for (const staff of staffList) {
    const branchKey = getStaffBranchKey(staff);
    if (branchKey) {
      allBranches.add(branchKey);
    }
    if (matchesCareerRoleFilter(staff, activeRoleFilter)) {
      totalForRole += 1;
      if (branchKey) {
        roleMatchedCounts.set(branchKey, (roleMatchedCounts.get(branchKey) || 0) + 1);
      }
    }
  }

  const sortedBranches = Array.from(allBranches).sort((a, b) => {
    const pa = BRANCH_DISPLAY_PRIORITY[a] ?? 99;
    const pb = BRANCH_DISPLAY_PRIORITY[b] ?? 99;
    if (pa !== pb) return pa - pb;
    return a.localeCompare(b, 'vi');
  });

  return [
    { key: 'ALL', label: 'Tất cả chi nhánh', count: totalForRole },
    ...sortedBranches.map((branch) => ({
      key: branch,
      label: branch,
      count: roleMatchedCounts.get(branch) || 0,
    })),
  ];
}
