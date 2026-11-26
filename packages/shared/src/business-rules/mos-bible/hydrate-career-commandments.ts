import { calculateComboBonus, DEFAULT_FM_FLOOR_FARM_CONFIG } from '../../types/career-progression/career-defaults.js';
import type { CareerProgressionConfig } from '../../types/career-progression/career-requirements.types.js';
import type { MosBibleCommandment } from '../../types/mos-bible.js';

export const LIVE_CAREER_BIBLE_IDS = new Set<string>(['CV-002', 'CV-004', 'CAREER-CVL-001', 'FM-001']);

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

function buildLiveFm001(base: MosBibleCommandment, config: CareerProgressionConfig): MosBibleCommandment {
  const fm = {
    ...DEFAULT_FM_FLOOR_FARM_CONFIG,
    ...(config.fmFloorFarm || {}),
  };
  const star1Total = fm.gmaps1StarBonus + fm.inv1StarBonus + fm.fac1StarBonus + fm.ops1StarBonus;
  const star2Total = fm.gmaps2StarBonus + fm.inv2StarBonus + fm.fac2StarBonus + fm.ops2StarBonus;
  const star3Total = fm.gmaps3StarBonus + fm.inv3StarBonus + fm.fac3StarBonus + fm.ops3StarBonus;
  const maxSingleFmCvs = Math.max(fm.cvsPerFm, fm.minCvsForSecondFm - 1);
  const sharedPct = fmtPct(fm.dtBranchSharedWeight);
  const groupPct = fmtPct(fm.dtGroupOwnedWeight);
  const butterflyNote = fm.gmapsAllowButterflyRedemption
    ? ' và cơ chế Sâu Hóa Bướm (khách tự sửa lên 5★ xóa khỏi bộ đếm sâu)'
    : ' (đang tắt Sâu Hóa Bướm)';
  const tipFunNote = fm.consultTipToFunFund
    ? 'toàn bộ 20% Tip tư vấn của FM chảy về Quỹ Ăn Chơi Nhóm/Chi Nhánh'
    : '20% Tip tư vấn phân bổ theo cấu hình lương hiện hành';
  const falGateNote = fm.requireAllFalThroughFm
    ? `100% ca FAL (Fix · Adjust · Log) bắt buộc đi qua cổng FM xác minh trong ${fm.falSlaHours}h (cấm tự duyệt Adjust của chính FM)`
    : `Ca FAL xử lý theo phân quyền hiện hành trong ${fm.falSlaHours}h`;
  const activeClaimNote = fm.requireActiveClaimWallet
    ? 'Bấm nhận công & nhận thưởng kiểu Active Claim tiền mới nổ vào Ví (quên bấm công ngày cuối tháng vẫn auto trả đủ 100% theo luật lao động)'
    : 'Thưởng và công ngày tự động kết chuyển cuối kỳ';

  return {
    ...base,
    summary: `Floor Manager vận hành theo mô hình Nông Trại Vui Vẻ với 3 bậc lương cứng (FM 1: ${fmtVnd(fm.fm1BaseSalary)} · FM 2: ${fmtVnd(fm.fm2BaseSalary)} · FM 3: ${fmtVnd(fm.fm3BaseSalary)} / ${fm.workingDaysPerMonth} công), Quỹ DT bậc thang ${fmtPct(fm.dtRateBelowTarget)}/${fmtPct(fm.dtRateAtTarget)}/${fmtPct(fm.dtRateAccelerator)} chia ${sharedPct}/${groupPct}, 4 trụ sao 1★–3★ (tối đa +${fmtVnd(star3Total)}), Google Maps chỉ tính 5★ & trần ≤ ${fm.gmapsMaxNegativeWormsPerMonth} sâu/tháng, FAL tối đa ${fmtPct(fm.falMaxRate3Star)}/${fmtPct(fm.falMaxRate2Star)}/${fmtPct(fm.falMaxRate1Star)}, giữ lửa ${fm.weeklyRegularConsultTarget} ca tư vấn/tuần và ${fm.requireActiveClaimWallet ? 'chế độ Active Claim bấm nhận tiền vào ví' : 'kết chuyển tự động'}.`,
    commandments: [
      `3 Bậc Lương Cứng FM 1–2–3 & Công Ngày + Active Claim: FM 1 nhận ${fmtVnd(fm.fm1BaseSalary)}, FM 2 nhận ${fmtVnd(fm.fm2BaseSalary)} (≥ ${fm.fm2MinStars}/12★ liên tiếp ${fm.fm2PromotionMonths} tháng, FAL ≤ ${fmtPct(fm.falMaxRate2Star)}, HI Tua ≥ ${fmtPct(fm.minFairnessHi2Star)}, 0 tháng vỡ ≥ 2 tuần), FM 3 nhận ${fmtVnd(fm.fm3BaseSalary)} (≥ ${fm.fm3MinStars}/12★ liên tiếp ${fm.fm3PromotionMonths} tháng, FAL ≤ ${fmtPct(fm.falMaxRate3Star)}, HI Tua ≥ ${fmtPct(fm.minFairnessHi3Star)}, kèm ≥ 1 CVLL hoặc FM 1) trên chuẩn ${fm.workingDaysPerMonth} công/tháng. Rớt chuẩn ${fm.demoteConsecutiveMonths} tháng liên tiếp lùi 1 bậc; vi phạm trung thực rút quyền FM ngay. ${activeClaimNote}; Tưới hộ đồng đội nghỉ thưởng +${fmtVnd(fm.coverShiftBonus)}/ca.`,
      `Biên Chế Sàn, Công Suất & Chia Quỹ DT ${sharedPct}/${groupPct}: Định mức 1 FM / ${fm.cvsPerFm} CV-CVL; khi vượt quá tỷ lệ 1.5× (> ${maxSingleFmCvs} CV, từ ≥ ${fm.minCvsForSecondFm} CV) mới được phép và bắt buộc tuyển FM #2. Chuẩn công suất ≥ ${fmtPct(fm.targetBedCapacityRatio)} số giường (${fmtVnd(fm.revPerCvTarget)} & ${fm.visitsPerCvTarget} khách/CV). Quỹ DT bậc thang mềm: dưới chuẩn = ${fmtPct(fm.dtRateBelowTarget)} DT · đạt chuẩn = ${fmtPct(fm.dtRateAtTarget)} DT · vượt ≥ ${fmtPct(fm.dtAcceleratorCapacityRatio)} giường = ${fmtPct(fm.dtRateAccelerator)} DT. Khi chi nhánh có ≥ 2 FM: ${sharedPct} Quỹ DT chia chung toàn đội theo ngày công & độ xanh vườn, ${groupPct} theo doanh thu nhóm phụ trách kèm điều phối Tua FIFO trên mOS.`,
      `Trụ 1 · Google Maps (Chỉ tính 5★ · 4★ = 0đ · 1–3★ = Sâu · Trần ≤ ${fm.gmapsMaxNegativeWormsPerMonth} Sâu/Tháng): 1★ = ${fm.gmaps1StarReviewsPerCv} quả 5★/CV (+${fmtVnd(fm.gmaps1StarBonus)}); 2★ = ${fm.gmaps2StarReviewsPerCv} quả 5★/CV + SLA ≤ ${fm.falSlaHours}h (+${fmtVnd(fm.gmaps2StarBonus)}); 3★ = ≥ ${fm.gmaps3StarReviewsPerCv} quả 5★/CV + 0 sâu (+${fmtVnd(fm.gmaps3StarBonus)}). Trần sâu: 0 sâu mở 3★; 1 sâu tối đa 2★; 2 sâu tụt trần tối đa ${fm.gmapsTwoWormsMaxStar}★ & khóa Vòng Quay; ≥ ${fm.gmapsZeroBonusWormsThreshold} sâu khóa thẳng 0★ (0đ). Hỗ trợ miễn trừ review ảo (Verified Customer Only)${butterflyNote}.`,
      `Trụ 2 & 3 · Kho Vật Tư + CSVC/Giường 3 Sạch/Son: Kho 1★ (hao hụt ≤ ${fmtPct(fm.invMaxLossRate1Star)}) = +${fmtVnd(fm.inv1StarBonus)} · 2★ (≤ ${fmtPct(fm.invMaxLossRate2Star)}) = +${fmtVnd(fm.inv2StarBonus)} · 3★ (≤ ${fmtPct(fm.invMaxLossRate3Star)} & 0 đứt hàng) = +${fmtVnd(fm.inv3StarBonus)}. CSVC & Phong thái 1★ (≥ ${fm.facMinScore1Star}đ) = +${fmtVnd(fm.fac1StarBonus)} · 2★ (≥ ${fm.facMinScore2Star}đ & 0 lỗi son) = +${fmtVnd(fm.fac2StarBonus)} · 3★ (≥ ${fm.facMinScore3Star}đ & 0 lỗi QA) = +${fmtVnd(fm.fac3StarBonus)}. (Tổng Quỹ 4 Trụ: 1★ = +${fmtVnd(star1Total)} · 2★ = +${fmtVnd(star2Total)} · 3★ = +${fmtVnd(star3Total)}).`,
      `Trụ 4 · Tua, Giờ Công, FAL & Tư Vấn: Mức FAL ${fmtPct(fm.falMaxRate3Star)} / ${fmtPct(fm.falMaxRate2Star)} / ${fmtPct(fm.falMaxRate1Star)} là ngưỡng trần (trên ${fmtPct(fm.falMaxRate1Star)} = 0★). 1★ (FAL ≤ ${fmtPct(fm.falMaxRate1Star)}, HI ≥ ${fmtPct(fm.minFairnessHi1Star)}) = +${fmtVnd(fm.ops1StarBonus)} · 2★ (FAL ≤ ${fmtPct(fm.falMaxRate2Star)}, HI ≥ ${fmtPct(fm.minFairnessHi2Star)}) = +${fmtVnd(fm.ops2StarBonus)} · 3★ (FAL ≤ ${fmtPct(fm.falMaxRate3Star)}, HI ≥ ${fmtPct(fm.minFairnessHi3Star)}) = +${fmtVnd(fm.ops3StarBonus)}.`,
      `Cổng Kiểm Định FAL & Giữ Lửa Nghề Tư Vấn: ${falGateNote}. FM thực hiện tối thiểu ${fm.weeklyRegularConsultTarget} ca tư vấn thường/tuần (tối thiểu ${fm.weeklyNewCustomerConsultMin} ca Khách Mới), duy trì Combo ≥ ${fmtPct(fm.consultMinComboRate)} (xuất sắc ≥ ${fmtPct(fm.consultExcellentComboRate)}). FM không nhận hoa hồng Combo/SP cá nhân; ${tipFunNote}.`,
      `Bậc Thang Phạt Sâu Xử Lý Trễ: Xử lý dứt điểm ≤ ${fm.falSlaHours}h = 0đ phạt. Trễ 24–48h: sâu Google Maps 1–3★ trừ -${fmtVnd(fm.mapsWormLate24hPenalty)}/con, sâu FAL nội bộ trừ -${fmtVnd(fm.falWormLate24hPenalty)}/con. Trễ > 48h: sâu Maps gây Vỡ Rương tuần (-25% Quỹ Sao) + khóa Vòng Quay; sâu FAL nội bộ trừ -${fmtVnd(fm.falWormLate48hPenalty)}/con + khóa Vòng Quay. Tiền phạt chỉ trừ trong Quỹ Sao/Thưởng, tuyệt đối không trừ lương cứng.`,
      `Lõi Game Nông Trại Vui Vẻ & Vòng Quay 4 Tuần Xanh: Hoàn thành 4 khung giờ chuẩn mỗi ngày nhận +${fmtVnd(fm.dailyQuestBonusTotal)}/ngày, giữ Thanh Khiên ≥ ${fm.minShieldHpForChest} HP (mất -${fm.missedQuestHpPenalty} HP/việc sót) để bảo toàn Rương tuần; QA/CHO kiểm đột xuất chống tưới khống. Đủ 4/4 Tuần Xanh + ≥ ${fm.fm2MinStars}/12★ mở Vòng Quay Thần Tài (+${fmtVnd(fm.wheelMinPrize)} đến +${fmtVnd(fm.wheelMaxPrize)}).`,
      `Đặc Quyền Nghỉ Lễ Tự Lái (Thay thế CC): Mở khóa khi chi nhánh đạt tỷ lệ ≥ ${fmtPct(fm.holidayAutopilotMinCvlRatio)} CVL/CVLL, có ≥ 1 CVLL cầm chìa khóa trực lễ và FM hoàn tất 5 bước bàn giao T-1 (quân số, kho đệm 150%, CSVC/POS 100%, khóa tua Booker, Hotline/Maps từ xa). FM nghỉ lễ hưởng trọn 100% gói tháng.`,
    ],
    effectiveFrom: config.updatedAt ? config.updatedAt.slice(0, 10) : base.effectiveFrom,
  };
}

/**
 * Đồng bộ trực tiếp các Điều răn Kinh Thánh mOS liên quan đến CVL / CVLL / FM theo cấu hình sống CAREER_PROGRESSION_RULES.
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
    if (commandment.id === 'FM-001') {
      return buildLiveFm001(commandment, config);
    }
    return commandment;
  });
}
