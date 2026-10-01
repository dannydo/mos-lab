import type { CareerProgressionConfig } from '@mos-lab/shared';

export const FALLBACK_CAREER_PROGRESSION_CONFIG: CareerProgressionConfig = {
  version: '2026.2',
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Update',
  cvToCvPlus: {
    minOrders: 300,
    minConsecutiveMonths: 3,
    minTipRatioAboveShop: 0.1,
    maxFixRate: 0.02,
    minHappinessIndex: 0.7,
    minBananaCount: 1,
    maxDisciplinaryViolations: 0,
    minWeeklyQaAudits: 1,
    requireZeroFailedAudits: true,
    trialDurationDays: 30,
    minSelfComboRate: 0.25,
    allowSelfConsultTrial: true,
  },
  cvPlusToCvPlusPlus: {
    minMonthsInCvPlus: 2,
    minSelfComboRate: 0.3,
    minHappinessIndex: 0.8,
    crossConsultCommissionRate: 0.025,
    maxDisciplinaryViolations: 0,
    minWeeklyQaAudits: 1,
    requireZeroFailedAudits: true,
  },
  cvPlusPlusToFm: {
    minMonthsInRole: 3,
    minMonthlyGoogleReviews: 30,
    maxDisciplinaryViolations: 0,
    weeklyAuditRequired: true,
    minShopComboRate: 0.25,
    minAvgLevel: 10,
  },
  cvToCc: {
    minOrders: 300,
    minConsecutiveMonths: 3,
    minTipRatioAboveShop: 0.1,
    maxFixRate: 0.02,
    minHappinessIndex: 0.7,
    minBananaCount: 1,
    maxDisciplinaryViolations: 0,
    minWeeklyQaAudits: 1,
    requireZeroFailedAudits: true,
    trialDurationDays: 30,
    minSelfComboRate: 0.25,
    allowSelfConsultTrial: true,
  },
  ccToFm: {
    minMonthsInRole: 3,
    minMonthlyGoogleReviews: 30,
    maxDisciplinaryViolations: 0,
    weeklyAuditRequired: true,
    minShopComboRate: 0.25,
    minAvgLevel: 10,
  },
  fmToCho: {
    minTargetHitMonths: 3,
    helpLowHiStaffImprove: true,
    maxInventoryLossRate: 0.005,
    minFacilityScore: 95,
    maxChoPerShop: 1,
    maxConsumablesRate: 0.05,
    maxWelcomeBudgetPerNewCustomer: 20000,
    minShopNetMarginForBonus: 0.12,
    gainSharingRatio: 0.2,
    breakEvenRevenueDT: 450_000_000,
    breakEvenRevenueEP: 350_000_000,
    fmIncrementalBonusRate: 0.02,
    fmBreakEvenMilestoneBonus: 2_000_000,
    choIncrementalBonusRate: 0.03,
    choBreakEvenMilestoneBonus: 3_000_000,
    fmFloorQualityBonus: 1_000_000,
  },
  choToBoss: {
    minProfitableMonths: 6,
    minNetProfitMargin: 0.15,
    minMonthlyNewCustomers: 60,
    minStaffEnps: 80,
    requiredSuccessors: {
      fmCount: 1,
      choCount: 1,
    },
  },
  rewardRates: {
    bananaPerFALShort: 15,
    bananaPerFALCcShort: 5,
    ccBonusRatePerLevel: 65,
    tipShareCvRatio: 0.7,
    tipShareCcRatio: 0.2,
    tipShareCvPlusSelfRatio: 0.9,
    tipShareCrossConsultCcRatio: 0.2,
    fmMonthlyBananaGrant: 500,
  },
  maintenanceRules: {
    cvPlus: {
      minSelfComboRate: 0.2,
      maxFixRate: 0.03,
      minHappinessIndex: 0.65,
      consecutiveFailedMonthsToDemote: 2,
    },
    cvPlusPlus: {
      minSelfComboRate: 0.25,
      minHappinessIndex: 0.75,
      consecutiveFailedMonthsToDemote: 2,
    },
  },
  compensation: {
    hourlyWages: {
      cv: 25_500,
      cvPlus: 27_500,
      cvPlusPlus: 29_500,
    },
    fmPackage: {
      baseSalary: 6_500_000,
      floorAllowance: 1_500_000,
      breakEvenMilestoneBonus: 2_000_000,
      excessRevenueRate: 0.02,
      floorQualityBonus: 1_000_000,
      gainSharingRatio: 0.1,
    },
    choPackage: {
      baseSalary: 11_000_000,
      breakEvenMilestoneBonus: 3_000_000,
      excessRevenueRate: 0.03,
      newCustomerBonus: 3_500_000,
      newCustomerTarget: 60,
      gainSharingRatio: 0.1,
      angelGrowthTiers: [
        { minQualifiedCount: 3, bonus: 1_500_000 },
        { minQualifiedCount: 5, bonus: 2_500_000 },
        { minQualifiedCount: 8, bonus: 3_500_000 },
        { minQualifiedCount: 11, bonus: 4_500_000 },
      ],
    },
  },
};

export interface CareerIsland {
  id: 'cv' | 'cv_plus' | 'cv_plus_plus' | 'fm' | 'cho' | 'boss';
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

  return [
    {
      id: 'cv',
      name: 'CV · Thợ Lash',
      badge: 'Ải 1',
      icon: '👁️',
      sub: '70% Tip + Thâm Niên',
      title: 'Tập Sự Thiên Thần · Lash Artisan',
      desc: 'Đôi bàn tay mềm mại, từng sợi mi êm ru ru giấc ngủ nàng thơ.',
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
      gateText: `Đạt ${cvToCc.minOrders} ca mi (3 tháng liên tiếp) + Tip cao hơn TB shop ≥ ${(cvToCc.minTipRatioAboveShop * 100).toFixed(0)}% + Fix ≤ ${(cvToCc.maxFixRate * 100).toFixed(1)}% + HI ≥ ${(cvToCc.minHappinessIndex * 100).toFixed(0)}% (0 biên bản QA/QC) ➔ Mở khóa ải Trùm Cuối Tự Bán Combo (≥ ${(cvToCc.minSelfComboRate * 100).toFixed(0)}% khách của mình) để thăng cấp CV+!`,
    },
    {
      id: 'cv_plus',
      name: 'CV+ · Tự Chủ',
      badge: 'Ải 2',
      icon: '🌸',
      sub: 'Tự Vấn + 90% Tip',
      title: 'Thợ Mi Tự Chủ · Self-Consulting Artist',
      desc: 'Độc lập tác chiến tại giường. Tự hiểu dáng mắt, tự tư vấn dáng mi & combo dưỡng mi cho khách của chính mình.',
      focus: 'Tự chủ tư vấn trọn gói cho khách mình, chốt combo ≥ 25%, chăm sóc khách ruột',
      skills: [
        { name: 'Tự Chủ Tư Vấn', desc: 'Hiểu mi khách nhất, tự tư vấn dáng mi & combo mi dưỡng ≥ 25%' },
        { name: 'Gắn Kết Khách Ruột', desc: 'Xây dựng tệp khách quen trung thành, tỷ lệ quay lại cao' },
        { name: 'Đại Sứ Google 5★', desc: 'Đạt tối thiểu 20 Google Review 5 sao/tháng từ khách hài lòng' },
      ],
      perks: [
        'Lương giờ thợ bậc cao: 27.5K/h (+2K/h so với CV)',
        'Hưởng trọn 90% Tiền Tip: 70% Tip nối mi (CV) + 20% Tip tư vấn (CC) khi tự phục vụ khách mình',
        'Hoa hồng Combo tự chốt (2% - 3%) trên doanh thu combo khách của chính mình',
        'Thưởng Thâm Niên: +5% đến +20% trên Thưởng CV Xoay',
        'Duy trì phong độ: Combo ≥ 20%, Fix ≤ 3%, HI ≥ 65% (rớt 2 tháng liên tiếp tụt về CV)',
        'Quy hoạch hạt giống để thăng cấp lên Đàn Chị Sảnh (CV++)!',
      ],
      gateText: `Duy trì CV+ ≥ ${cvPlusToCvPlusPlus?.minMonthsInCvPlus || 2} tháng + Tự chốt combo ≥ ${((cvPlusToCvPlusPlus?.minSelfComboRate || 0.3) * 100).toFixed(0)}% + Đồng đội tin yêu HI ≥ ${((cvPlusToCvPlusPlus?.minHappinessIndex || 0.8) * 100).toFixed(0)}% ➔ Thăng cấp Đàn Chị Sảnh (CV++)!`,
    },
    {
      id: 'cv_plus_plus',
      name: 'CV++ · Đàn Chị',
      badge: 'Ải 3',
      icon: '🌺',
      sub: 'Sảnh + Hộ 20%',
      title: 'Đàn Chị Sảnh · Senior Floor Consultant',
      desc: 'Bản lĩnh vững vàng. Vừa tự làm khách ruột, vừa đứng sảnh đón tiếp & tư vấn giùm cho khách của thợ CV khi FM vắng.',
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
        'Lương giờ thợ bậc cao nhất: 29.5K - 30K/h (+4K/h so với CV)',
        'Hưởng trọn 90% Tiền Tip khách mình (70% CV + 20% CC)',
        'Hưởng 20% Tiền Tip Tư Vấn (CC Tip) khi tư vấn hộ cho khách của thợ CV (khi FM vắng)',
        'Hoa hồng 2.5% tư vấn giùm cho khách của các CV khác khi FM vắng',
        'Đặc quyền làm Trưởng Ca Trực Ngày Lễ: Hưởng lương lễ x3-x4 + 90% Tip ca mình làm',
        'Thưởng Thâm Niên: +5% đến +20% trên Thưởng CV Xoay',
        'Quy hoạch hạt giống số 1 để bổ nhiệm lên Floor Manager (FM) chính thức!',
      ],
      gateText: `Duy trì CV++ ≥ ${cvPlusPlusToFm?.minMonthsInRole || 3} tháng + Đạt ≥ ${cvPlusPlusToFm?.minMonthlyGoogleReviews || 30} Google Review 5★/tháng + Kiểm tra kho & CSVC hàng tuần + Tỷ lệ combo shop ≥ ${((cvPlusPlusToFm?.minShopComboRate || 0.25) * 100).toFixed(0)}% ➔ Thăng cấp Floor Manager (FM)!`,
    },
    {
      id: 'fm',
      name: 'FM · Nữ Thần Sàn',
      badge: 'Ải 4',
      icon: '🏰',
      sub: 'Tư Vấn + Vận Hành',
      title: 'Nhạc Trưởng Vận Hành · Floor Manager',
      desc: 'Giữ cho cả tiệm vận hành chuẩn xác như đồng hồ Thụy Sĩ. Tư vấn trưởng phụ trách khách cho thợ CV, kiểm soát CSVC & kho bãi.',
      focus:
        'Tư vấn chính cho khách của CV, quản trị kho hàng hàng tuần, kiểm soát 5 giác quan CSVC & nâng đỡ đồng đội',
      skills: [
        {
          name: 'Tư Vấn Trưởng Sàn',
          desc: 'Trực tiếp đón tiếp & tư vấn chuyên sâu cho khách của các thợ CV (chưa lên CV+)',
        },
        { name: 'Mắt Thần Kho Bãi', desc: 'Kiểm kê kho & CSVC hàng tuần, chống thất thoát ≤ 0.5%' },
        { name: 'Nâng Tầm Đồng Đội', desc: 'Chăm sóc và kèm cặp giúp nhân sự có điểm HI thấp tiến bộ hơn' },
      ],
      perks: [
        'Gói thu nhập an toàn: Lương cứng 6.5M + Phụ cấp sàn 1.5M (Cố định 8.0M)',
        'Vẫn nhận Thưởng Vòng Xoay tư vấn (CC Cash / Vòng xoay CC) theo Level CC tích lũy như cũ',
        'Vẫn nhận 20% Tiền Tip Tư Vấn khi tư vấn cho khách của thợ CV (không nối mi, bảo đảm 70% tip cho thợ)',
        'Thưởng Cán Mốc Hòa Vốn (2.0M) + Thưởng 2.0% phần doanh thu vượt mốc (DT ≥ 450M, EP ≥ 350M)',
        'Thưởng Đánh Giá Sàn (1.0M - 1.5M): Đạt chuẩn CSVC ≥ 95 điểm & shop đạt ≥ 30 Google Review 5★/tháng',
        'Thưởng Tiết Kiệm: Nhận 10% số tiền chi phí vận hành tiết kiệm được (khi kho hao hụt ≤ 0.5% & vật tư ≤ 5%)',
        'Nghỉ lễ trọn vẹn hưởng nguyên gói lương khi đào tạo được CV++ tự chủ sảnh; chịu trách nhiệm On-Call 24/7 giải quyết sự cố',
        `Túi Chuối Thần Kỳ: Được cấp ${rewardRates.fmMonthlyBananaGrant} Chuối/tháng để thưởng nóng tức thì cho nhân viên xuất sắc`,
      ],
      gateText: `Chi nhánh đạt Target ≥ ${fmToCho.minTargetHitMonths} tháng + Giúp đỡ người có HI thấp tiến bộ + Thất thoát kho ≤ ${(fmToCho.maxInventoryLossRate * 100).toFixed(1)}% + CSVC 5 giác quan ≥ ${fmToCho.minFacilityScore}% ➔ Thăng cấp Chief Happiness Officer (CHO)!`,
    },
    {
      id: 'cho',
      name: 'CHO · Mẹ Thiên Thần',
      badge: 'Ải 5',
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
        'Thưởng Phát Triển Thiên Thần (1.5M - 4.5M): Khoán theo số lượng thợ đạt chuẩn CV+ & CV++ duy trì tại shop (kèm cơ chế tụt cấp)',
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
      badge: 'Ải 6',
      icon: '👑',
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

export function formatCareerRoleName(role?: string | null): string {
  if (!role) return 'CV';
  switch (role) {
    case 'CV':
      return 'CV';
    case 'CV_PLUS':
      return 'CV+';
    case 'CV_PLUS_PLUS':
      return 'CV++';
    case 'MASTER_TECH':
      return 'Master Tech';
    case 'CC':
      return 'CC';
    case 'FM':
      return 'FM';
    case 'CHO':
      return 'CHO';
    case 'BOSS':
      return 'BOSS';
    default:
      return role.replace(/_/g, ' ');
  }
}
