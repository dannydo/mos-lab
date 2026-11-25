import { calculateComboBonus } from '../../types/career-progression/career-defaults.js';
import type { CareerProgressionConfig } from '../../types/career-progression/career-requirements.types.js';
import type { MosBibleCommandment } from '../../types/mos-bible.js';

export const LIVE_CAREER_BIBLE_IDS = new Set<string>(['CV-002', 'CV-004', 'CAREER-CVL-001']);

function fmtVnd(value: number): string {
  return `${Math.round(value).toLocaleString('vi-VN')}đ`;
}

function fmtPct(ratio: number): string {
  const pct = Number((ratio * 100).toFixed(1));
  return `${Number.isInteger(pct) ? pct.toFixed(0) : pct}%`;
}

function buildLiveCv002(base: MosBibleCommandment, config: CareerProgressionConfig): MosBibleCommandment {
  const cvl = config.cvToCvPlus || config.cvToCc;
  const cvBaseWage = config.compensation?.hourlyWages?.cv ?? 25500;
  const cvlWage = cvl.hourlyWage ?? config.compensation?.hourlyWages?.cvPlus ?? 27500;
  const deltaWage = Math.max(0, cvlWage - cvBaseWage);
  const minOrders = cvl.minOrders ?? 330;
  const maxFixPct = fmtPct(cvl.maxFixRate ?? 0.015);
  const tipAbovePct = fmtPct(cvl.minTipRatioAboveShop ?? 0.05);
  const qaAudits = cvl.minQaAudits ?? 4;
  const minHiPct = fmtPct(cvl.minHappinessIndex ?? 0.7);
  const minBananas = cvl.minBananaCount ?? 20;
  const minComboPct = fmtPct(cvl.minSelfComboRate ?? 0.21);
  const tipSharePct = fmtPct(cvl.tipShareRatio ?? 0.9);
  const under2m = cvl.comboUnder2mBonus ?? 50000;
  const step1m = cvl.comboStepPerMillionBonus ?? 50000;
  const sample45m = calculateComboBonus(4500000, cvl);
  const serumOrig = cvl.serumOriginalPriceBonus ?? 100000;
  const serumDisc = cvl.serumDiscountedPriceBonus ?? 50000;
  const serumDeep = cvl.serumDeepDiscountPriceBonus ?? 10000;
  const serumFree = cvl.serumFreePriceBonus ?? 1000;
  const demoteMonths = config.maintenanceRules?.cvPlus?.consecutiveFailedMonthsToDemote ?? 2;

  const updatedCommandments = [...base.commandments];
  updatedCommandments[3] = `Chuẩn 6 Ải Cốt Lõi xét thăng cấp (CV ➔ CVL): (1) Sản lượng tối thiểu ${minOrders} bộ mi trong 3 tháng liền; (2) Tỷ lệ bảo hành Fix ≤ ${maxFixPct}; (3) Tỷ lệ Tip cao hơn tối thiểu ${tipAbovePct} trung bình shop; (4) Kiểm định QA/QC tối thiểu ${qaAudits} lần/tháng và bắt buộc không có bài FAILED (0 vi phạm); (5) Chỉ số gắn kết đồng đội HI ≥ ${minHiPct}; (6) Tích lũy tối thiểu ${minBananas} Chuối Yêu Thương check-in trong tháng.`;
  updatedCommandments[4] = `Ải Trùm Cuối (Thử thách tự tư vấn): ${cvl.trialDurationDays ?? 30} ngày trực tiếp tư vấn tại giường với tỷ lệ chốt combo đạt tối thiểu ${minComboPct} theo cấu hình sống trên tập khách tiềm năng.`;
  updatedCommandments[5] = `Đãi ngộ vượt trội khi đạt chuẩn: Lương giờ tăng +${fmtVnd(deltaWage)}/h (đạt ${fmtVnd(cvlWage)}/h), nhận trọn ${tipSharePct} Tip khách cho (70% làm mi + 20% tư vấn), Thưởng tiền tươi Dưỡng mi Yeppeum 6ml (Giá gốc 1.1M nhận ${fmtVnd(serumOrig)}; Giảm giá < 50% nhận ${fmtVnd(serumDisc)}; Giảm sâu ≥ 50% nhận ${fmtVnd(serumDeep)}; Tặng kèm Free 0đ nhận ${fmtVnd(serumFree)}), và Thưởng hoa hồng Combo theo công thức tối giản (< 2M = ${fmtVnd(under2m)}; mỗi 1M kế tiếp từ mốc 2M = +${fmtVnd(step1m)}; gói 4.5M nhận ${fmtVnd(sample45m)}). Khi khách mua nhiều gói Combo cùng 1 đơn (order_id), hệ thống cộng gộp tổng tiền rồi tính thưởng 1 lần.`;
  updatedCommandments[7] = `Quy tắc Giáng cấp ${demoteMonths} Tháng Liền: Nếu trong ${demoteMonths} tháng liên tiếp tỷ lệ tự chốt combo vẫn dưới ngưỡng ${minComboPct}, Chuyên Viên bị giáng cấp quay lại CV, tỷ lệ Tip tụt về 70%, mất quyền tự tư vấn tại giường.`;

  return {
    ...base,
    summary: `CVL (Chuyên Viên Tự Chủ) nhận trọn bộ đãi ngộ (lương ${fmtVnd(cvlWage)}/h, ${tipSharePct} Tip, thưởng Combo <2M = ${fmtVnd(under2m)} & +${fmtVnd(step1m)}/1M) khi đạt tỷ lệ tự chốt Combo tối thiểu ${minComboPct} trên khách Not Combo Live. Không đạt vẫn bảo lưu ${tipSharePct} Tip; trượt ${demoteMonths} tháng liền quay lại CV.`,
    commandments: updatedCommandments,
    effectiveFrom: config.updatedAt ? config.updatedAt.slice(0, 10) : base.effectiveFrom,
  };
}

function buildLiveCv004(base: MosBibleCommandment, config: CareerProgressionConfig): MosBibleCommandment {
  const cvl = config.cvToCvPlus || config.cvToCc;
  const cvll = config.cvPlusToCvPlusPlus;
  const cvlWage = cvl.hourlyWage ?? config.compensation?.hourlyWages?.cvPlus ?? 27500;
  const cvllWage = cvll.hourlyWage ?? config.compensation?.hourlyWages?.cvPlusPlus ?? 29500;
  const deltaVsCvl = cvllWage - cvlWage;
  const deltaLabel = deltaVsCvl >= 0 ? `+${fmtVnd(deltaVsCvl)}/h` : `-${fmtVnd(Math.abs(deltaVsCvl))}/h`;

  const minOrders = cvll.minOrders ?? 330;
  const maxFixPct = fmtPct(cvll.maxFixRate ?? 0.015);
  const tipAbovePct = fmtPct(cvll.minTipRatioAboveShop ?? 0.05);
  const qaAudits = cvll.minQaAudits ?? 4;
  const minHiPct = fmtPct(cvll.minHappinessIndex ?? 0.7);
  const minBananas = cvll.minBananaCount ?? 20;

  const promoComboPct = fmtPct(cvll.promotionMinComboRate ?? 0.3);
  const promoMonths = cvll.promotionConsecutiveMonths ?? 2;
  const maintComboPct = fmtPct(cvll.minSelfComboRate ?? config.maintenanceRules?.cvPlusPlus?.minSelfComboRate ?? 0.21);
  const demoteMonths =
    cvll.consecutiveFailedMonthsToDemote ?? config.maintenanceRules?.cvPlusPlus?.consecutiveFailedMonthsToDemote ?? 2;

  const cvShareRate = cvll.crossConsultCvShareRate ?? 0;
  const cvllSharePct = fmtPct(1 - cvShareRate);
  const partnerSharePct = fmtPct(cvShareRate);
  const exemptDenom = cvll.exemptCvlDenominatorOnCrossConsult !== false;
  const mandatoryQueue = cvll.enforceMandatoryOwnQueue !== false;

  const under2m = cvll.comboUnder2mBonus ?? cvl.comboUnder2mBonus ?? 50000;
  const step1m = cvll.comboStepPerMillionBonus ?? cvl.comboStepPerMillionBonus ?? 50000;
  const sample45m = calculateComboBonus(4500000, cvll);
  const serumOrig = cvll.serumOriginalPriceBonus ?? 100000;

  return {
    ...base,
    summary: `CVLL hưởng lương giờ ${fmtVnd(cvllWage)}/h (${deltaLabel} so với CVL), tư vấn hộ CV/CVL nhận ${cvllSharePct} Combo & Sản phẩm (đồng đội nhận ${partnerSharePct}), Tip 70+20 như CVL, ${mandatoryQueue ? 'bắt buộc đi tua khách mình' : 'hỗ trợ linh hoạt theo phân công'} và phải đạt 6 ải + ≥ ${promoComboPct} Combo trong ${promoMonths} tháng liên tiếp để lên hạng.`,
    commandments: [
      `Điều kiện Thăng Cấp lên CVLL (6 Ải + ${promoComboPct} × ${promoMonths} Tháng Liền): Phải đạt đầy đủ 6 ải cốt lõi (≥ ${minOrders} bộ mi/3 tháng, Fix ≤ ${maxFixPct}, Tip cao hơn TB shop ≥ +${tipAbovePct}, QA/QC ≥ ${qaAudits} lần/tháng và 0 lỗi FAILED, HI ≥ ${minHiPct}, ≥ ${minBananas} Chuối Yêu Thương) VÀ đạt tối thiểu ${promoComboPct} tỷ lệ tự chốt Combo trên khách Not Combo Live trong ${promoMonths} tháng liên tiếp.`,
      `Lương Giờ & Quyền Lợi Cơ Bản Như CVL: Lương giờ đạt ${fmtVnd(cvllWage)}/h (${deltaLabel} so với CVL ${fmtVnd(cvlWage)}/h). Công thức Combo bậc thang (<2M = ${fmtVnd(under2m)}, mỗi 1M kế tiếp = +${fmtVnd(step1m)}; gói 4.5M = ${fmtVnd(sample45m)}), thưởng Dưỡng mi (tối đa ${fmtVnd(serumOrig)}/cây) và các quyền lợi cá nhân giữ nguyên như Điều răn CV-002.`,
      `Cơ Chế Tư Vấn Chéo (${cvllSharePct}/${partnerSharePct}) Cho CV và CVL Khác: Khi CVLL tư vấn hỗ trợ chốt đơn cho khách của CV hoặc CVL khác, CVLL nhận ${cvllSharePct} tiền thưởng Combo & Sản phẩm; CV hoặc CVL thực hiện ca đó nhận ${partnerSharePct} (${cvShareRate === 0 ? '0đ thưởng bán hàng' : 'chia theo cấu hình'}).`,
      `Quy Tắc Chia Tip 70+20 Giữ Nguyên Như CVL: Toàn bộ ca của bản thân hoặc ca hỗ trợ chéo đều áp dụng quy tắc Tip 70% làm mi + 10% Check-in + 10% Check-out (+ 10% Quỹ tiệm).`,
      exemptDenom
        ? `Miễn Trừ Mẫu Số % Combo Cho CVL (Đang Bật): Khi CVL nhờ CVLL tư vấn chốt hộ, đơn hàng đó được loại khỏi mẫu số Not Combo Live của CVL để không làm tụt tỷ lệ chốt Combo hàng tháng của CVL.`
        : `Mẫu Số % Combo Khi Nhờ CVLL (Đang Tắt Miễn Trừ): Ca CVL nhờ CVLL chốt hộ vẫn tính vào mẫu số Not Combo Live theo cấu hình Admin hiện hành.`,
      mandatoryQueue
        ? `Kỷ Luật Bắt Buộc Đi Tua Khách Mình (Đang Bật): CVLL bắt buộc phải nhận và phục vụ đầy đủ các lượt khách theo tua của mình (bao gồm khách đầu tua và khách book); bỏ tua để chạy sang hỗ trợ sảnh sẽ bị xử phạt theo quy định công ty.`
        : `Chế Độ Đi Tua Linh Hoạt (Đang Tắt Khóa Bắt Buộc): Cấu hình hiện hành đang cho phép điều phối ca linh hoạt theo sắp xếp của quản lý sảnh.`,
      `Ngưỡng Duy Trì Hàng Tháng & Giáng Cấp: Sau khi lên CVLL, ngưỡng duy trì hàng tháng là ≥ ${maintComboPct} Combo. Trượt 1 tháng sẽ bảo lưu Tip nhưng khóa phụ cấp lương giờ & thưởng bán hàng cá nhân; trượt ${demoteMonths} tháng liên tiếp sẽ giáng về CVL.`,
    ],
    effectiveFrom: config.updatedAt ? config.updatedAt.slice(0, 10) : base.effectiveFrom,
  };
}

function buildLiveCareerCvl001(base: MosBibleCommandment, config: CareerProgressionConfig): MosBibleCommandment {
  const cvl = config.cvToCvPlus || config.cvToCc;
  const cvlWage = cvl.hourlyWage ?? 27500;
  const minOrders = cvl.minOrders ?? 330;
  const maxFixPct = fmtPct(cvl.maxFixRate ?? 0.015);
  const minHiPct = fmtPct(cvl.minHappinessIndex ?? 0.7);
  const minBananas = cvl.minBananaCount ?? 20;
  const minComboPct = fmtPct(cvl.minSelfComboRate ?? 0.21);
  const under2m = cvl.comboUnder2mBonus ?? 50000;
  const step1m = cvl.comboStepPerMillionBonus ?? 50000;
  const sample45m = calculateComboBonus(4500000, cvl);
  const demoteMonths = config.maintenanceRules?.cvPlus?.consecutiveFailedMonthsToDemote ?? 2;

  const updatedCommandments = [...base.commandments];
  updatedCommandments[0] = `Phiên bản 1 · 30 Giây Tóm Tắt Siêu Ngắn: CVL là Chuyên Viên Tự Chủ — vừa làm mi đẹp, vừa tự tư vấn và tự bấm thanh toán. Để lên cấp: vượt 6 ải (${minOrders} bộ mi/3 tháng, fix ≤ ${maxFixPct}, khách tip đều, QA 0 lỗi, ${minBananas} chuối) và hoàn thành ${cvl.trialDurationDays ?? 30} ngày thử thách (tỷ lệ Combo ≥ ${minComboPct}). Khi lên cấp: lương giờ ${fmtVnd(cvlWage)}/h, trọn 90% Tip, thưởng combo (<2M = ${fmtVnd(under2m)}, mỗi +1M = +${fmtVnd(step1m)}, gói 4.5M = ${fmtVnd(sample45m)}) và dưỡng mi.`;
  updatedCommandments[2] = `Phiên bản 3 · Chi Tiết 6 Ải Cốt Lõi & Quy Tắc Giữ Lông: (1) ${minOrders} bộ mi / 3 tháng liền; (2) Fix ≤ ${maxFixPct}; (3) Tip cao hơn TB shop ≥ ${fmtPct(cvl.minTipRatioAboveShop ?? 0.05)}; (4) QA/QC ≥ ${cvl.minQaAudits ?? 4} lần/tháng và 0 bài FAILED; (5) HI ≥ ${minHiPct}; (6) ≥ ${minBananas} Chuối Yêu Thương. Vượt 6 ải mở khóa ${cvl.trialDurationDays ?? 30} ngày tự tư vấn đạt ≥ ${minComboPct}. Trượt ${demoteMonths} tháng liền quay về CV.`;

  return {
    ...base,
    commandments: updatedCommandments,
    effectiveFrom: config.updatedAt ? config.updatedAt.slice(0, 10) : base.effectiveFrom,
  };
}

/**
 * Đồng bộ trực tiếp các Điều răn Kinh Thánh mOS liên quan đến CVL / CVLL theo cấu hình sống CAREER_PROGRESSION_RULES.
 */
export function hydrateMosBibleCommandmentsWithCareerConfig(
  commandments: readonly MosBibleCommandment[],
  config?: CareerProgressionConfig | null
): readonly MosBibleCommandment[] {
  if (!config) return commandments;

  return commandments.map((commandment) => {
    if (commandment.id === 'CV-002') {
      return buildLiveCv002(commandment, config);
    }
    if (commandment.id === 'CV-004') {
      return buildLiveCv004(commandment, config);
    }
    if (commandment.id === 'CAREER-CVL-001') {
      return buildLiveCareerCvl001(commandment, config);
    }
    return commandment;
  });
}
