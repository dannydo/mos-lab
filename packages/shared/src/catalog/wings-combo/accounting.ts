import { calculateComboBonus } from '../../types/career-progression.js';
import type {
  ComboPurchaseAccountingBreakdown,
  ComboRedemptionAccountingBreakdown,
  MatchedComboPackageOption,
  WelcomeComboEligibilityResult,
  WingsComboCategoryId,
} from './types.js';
import { getWingsComboCategory } from './data/index.js';
import { getVolumeFiberMeta } from './fiber.js';
import { checkWelcomeComboEligibility, formatReadableComboContent } from './matcher.js';

/**
 * Lấy danh sách tất cả các gói Combo đúng chuẩn cho (categoryId, volume)
 * kèm kiểm tra khóa tự động gói Welcome (2 tặng 1) nếu qua ngày đầu tiên.
 */
export function getComboPackagesForCategoryAndVolume(params: {
  categoryId: WingsComboCategoryId | string;
  volume: number | 'under';
  welcomeEligibility?: WelcomeComboEligibilityResult;
  includeVvipPass?: boolean;
}): MatchedComboPackageOption[] {
  const category = getWingsComboCategory(params.categoryId);
  const eligibility = params.welcomeEligibility ?? checkWelcomeComboEligibility({ customerVisits: 1 });
  const results: MatchedComboPackageOption[] = [];

  for (const rule of category.rules) {
    if (category.id === 'VVIP' || rule.name === 'VVIP Pass') {
      const comboPrice = rule.fixedPrice || 23900000;
      const totalSessions = rule.totalSessions || 20;
      const retailTotal = 35400000;
      results.push({
        id: `VVIP:VVIP_Pass:all`,
        categoryId: 'VVIP',
        categoryName: 'VVIP Pass',
        ruleName: rule.name,
        displayName: `Gói VVIP Pass (20 Lần · 36 Tháng)`,
        shortRuleLabel: '20 Lần VIP',
        volume: params.volume,
        volumeMeta: getVolumeFiberMeta('VVIP', params.volume),
        packageKind: 'vvip_pass',
        isWelcomePackage: false,
        isLocked: false,
        validityMonths: rule.validityMonths || 36,
        discountPct: 48,
        comboNewCount: 20,
        comboRefillCount: 0,
        bonusNewCount: 0,
        bonusRefillCount: 0,
        totalPaidSessions: 20,
        totalBonusSessions: 0,
        totalSessions,
        newUnitPrice: Math.round(comboPrice / totalSessions),
        refillUnitPrice: Math.round(comboPrice / totalSessions),
        retailTotal,
        comboPrice,
        comboPriceWithVat: Math.round(comboPrice * 1.08),
        savingsAmount: retailTotal - comboPrice,
        avgPerSessionPrice: Math.round(comboPrice / totalSessions),
        cvBonus: calculateComboBonus(comboPrice),
        bonusRetailValue: 0,
        cardImageUrl: rule.cardImageUrl,
        cardPreviewUrl: rule.cardPreviewUrl,
        readableContent: rule.special || '20 lần nối mi cao cấp · Dùng chung cho bạn bè & người thân',
        specialNote: rule.special,
        theme: category.theme,
        allVolumePrices: rule.prices,
      });
      continue;
    }

    const priceRow =
      rule.prices.find((p) =>
        params.volume === 'under' ? p.isUnderLash || p.volume === 'under' : Number(p.volume) === Number(params.volume)
      ) || rule.prices[0];

    if (!priceRow) continue;

    const volMeta = getVolumeFiberMeta(category.id, priceRow.isUnderLash ? 'under' : priceRow.volume);
    const isWelcome = rule.isWelcomePackage;
    const isLocked = isWelcome && !eligibility.eligible;
    const comboPrice = priceRow.comboPrice;
    const retailTotal = priceRow.retailTotal || comboPrice;
    const totalSessions = rule.totalSessions || 3;

    const ruleSlug = rule.name.replace(/\s+/g, '_');
    const volSlug = priceRow.isUnderLash ? 'under_390' : String(priceRow.volume);

    const newUnitPrice = priceRow.newPrice;
    const refillUnitPrice = priceRow.refillPrice || priceRow.newPrice;
    const bonusRetailValue = rule.bonusNewCount * newUnitPrice + rule.bonusRefillCount * refillUnitPrice;

    results.push({
      id: `${category.id}:${ruleSlug}:${volSlug}`,
      categoryId: category.id,
      categoryName: category.name,
      ruleName: rule.name,
      displayName: priceRow.isUnderLash
        ? `Combo ${rule.name} · Mi Dưới 390`
        : `Combo ${rule.name} · ${category.name} ${priceRow.volume}`,
      shortRuleLabel: isWelcome ? `${rule.name} (Welcome)` : rule.name,
      volume: priceRow.isUnderLash ? 'under' : Number(priceRow.volume),
      volumeMeta: volMeta,
      packageKind: rule.packageKind,
      isWelcomePackage: isWelcome,
      isLocked,
      lockReason: isLocked ? eligibility.reason : undefined,
      validityMonths: rule.validityMonths,
      discountPct: rule.discountPct,
      comboNewCount: rule.comboNewCount,
      comboRefillCount: rule.comboRefillCount,
      bonusNewCount: rule.bonusNewCount,
      bonusRefillCount: rule.bonusRefillCount,
      totalPaidSessions: rule.totalPaidSessions,
      totalBonusSessions: rule.totalBonusSessions,
      totalSessions,
      newUnitPrice,
      refillUnitPrice,
      retailTotal,
      comboPrice,
      comboPriceWithVat: Math.round(comboPrice * 1.08),
      savingsAmount: Math.max(0, retailTotal - comboPrice),
      avgPerSessionPrice: Math.round(comboPrice / totalSessions),
      cvBonus: calculateComboBonus(comboPrice),
      bonusRetailValue,
      cardImageUrl: rule.cardImageUrl,
      cardPreviewUrl: rule.cardPreviewUrl,
      readableContent: formatReadableComboContent(rule, bonusRetailValue),
      theme: category.theme,
      allVolumePrices: rule.prices,
    });
  }

  if (params.includeVvipPass && category.id !== 'VVIP') {
    const vvipCat = getWingsComboCategory('VVIP');
    const vvipRule = vvipCat.rules[0];
    if (vvipRule) {
      const comboPrice = vvipRule.fixedPrice || 23900000;
      results.push({
        id: 'VVIP:VVIP_Pass:all',
        categoryId: 'VVIP',
        categoryName: 'VVIP Pass',
        ruleName: 'VVIP Pass',
        displayName: 'Gói VVIP Pass · 20 Lần (Dùng chung người thân)',
        shortRuleLabel: 'VVIP Pass (20 lần)',
        volume: params.volume,
        volumeMeta: getVolumeFiberMeta('VVIP', params.volume),
        packageKind: 'vvip_pass',
        isWelcomePackage: false,
        isLocked: false,
        validityMonths: 36,
        discountPct: 48,
        comboNewCount: 20,
        comboRefillCount: 0,
        bonusNewCount: 0,
        bonusRefillCount: 0,
        totalPaidSessions: 20,
        totalBonusSessions: 0,
        totalSessions: 20,
        newUnitPrice: Math.round(comboPrice / 20),
        refillUnitPrice: Math.round(comboPrice / 20),
        retailTotal: 35400000,
        comboPrice,
        comboPriceWithVat: Math.round(comboPrice * 1.08),
        savingsAmount: 35400000 - comboPrice,
        avgPerSessionPrice: Math.round(comboPrice / 20),
        cvBonus: calculateComboBonus(comboPrice),
        bonusRetailValue: 0,
        cardImageUrl: vvipRule.cardImageUrl,
        cardPreviewUrl: vvipRule.cardPreviewUrl,
        readableContent: '20 lần nối mi cao cấp · Hạn dùng 36 tháng · Chia sẻ cùng bạn bè & người thân',
        specialNote: vvipRule.special,
        theme: vvipCat.theme,
        allVolumePrices: vvipRule.prices,
      });
    }
  }

  return results;
}

/**
 * Tính toán hạch toán kế toán & trừ ví gói tức thì khi khách MUA GÓI COMBO MỚI tại Checkout:
 * - Buổi làm mi hôm nay được trừ ngay làm buổi đầu tiên (1 Paid New) của gói mới mua.
 * - Khách hàng chỉ thanh toán đúng giá gói Combo (không bị cộng dồn tiền lẻ buổi hôm nay).
 * - Tách bạch Lượt Mua (Paid) và Lượt Tặng (Bonus 0đ) còn lại trong ví.
 */
export function calculateComboPurchaseAccounting(
  pkg: MatchedComboPackageOption,
  todaySingleServiceOriginalPrice?: number
): ComboPurchaseAccountingBreakdown {
  const singleOriginal = todaySingleServiceOriginalPrice ?? pkg.newUnitPrice;
  const recognizedToday =
    pkg.packageKind === 'vvip_pass'
      ? pkg.avgPerSessionPrice
      : Math.min(pkg.comboPrice, pkg.newUnitPrice || singleOriginal);
  const deferredRevenueBalance = Math.max(0, pkg.comboPrice - recognizedToday);

  const paidNewAfter = Math.max(0, pkg.comboNewCount - 1);
  const paidRefillAfter = pkg.comboRefillCount;
  const bonusNewAfter = pkg.bonusNewCount;
  const bonusRefillAfter = pkg.bonusRefillCount;
  const totalPaidRemaining = paidNewAfter + paidRefillAfter;
  const totalBonusRemaining = bonusNewAfter + bonusRefillAfter;
  const totalRemaining = totalPaidRemaining + totalBonusRemaining;

  const bonusRetailValue =
    pkg.bonusRetailValue ||
    pkg.bonusNewCount * (pkg.newUnitPrice || 0) + pkg.bonusRefillCount * (pkg.refillUnitPrice || 0);
  const bonusRemainingRetailValue =
    bonusNewAfter * (pkg.newUnitPrice || 0) + bonusRefillAfter * (pkg.refillUnitPrice || 0);

  return {
    mode: 'BUY_NEW_COMBO',
    packageId: pkg.id,
    packageName: pkg.displayName,
    categoryId: pkg.categoryId,
    categoryName: pkg.categoryName,
    ruleName: pkg.ruleName,
    volume: pkg.volume,
    comboPrice: pkg.comboPrice,
    comboPriceWithVat: pkg.comboPriceWithVat,
    retailTotal: pkg.retailTotal,
    savingsAmount: pkg.savingsAmount,
    todaySingleServiceWaived: true,
    todaySingleServiceOriginalPrice: singleOriginal,
    todayServiceChargeToCustomer: 0,
    recognizedRevenueToday: recognizedToday,
    deferredRevenueBalance,
    avgPerSessionPrice: pkg.avgPerSessionPrice,
    initialWallet: {
      paidNew: pkg.comboNewCount,
      paidRefill: pkg.comboRefillCount,
      bonusNew: pkg.bonusNewCount,
      bonusRefill: pkg.bonusRefillCount,
      totalSessions: pkg.totalSessions,
    },
    deductedToday: {
      sessionType: pkg.packageKind === 'vvip_pass' ? 'VVIP_PASS' : 'PAID_NEW',
      count: 1,
      recognizedValue: recognizedToday,
    },
    remainingWalletAfterToday: {
      paidNew: paidNewAfter,
      paidRefill: paidRefillAfter,
      bonusNew: bonusNewAfter,
      bonusRefill: bonusRefillAfter,
      totalPaidRemaining,
      totalBonusRemaining,
      totalRemaining,
    },
    cvComboBonus: pkg.cvBonus,
    bonusRetailValue,
    bonusRemainingRetailValue,
    accountingSummaryNote: `Đã trừ buổi hôm nay vào lượt 1 của gói (${pkg.ruleName}). Miễn thu lẻ ${singleOriginal.toLocaleString('vi-VN')}đ. Còn lại ${totalRemaining}/${pkg.totalSessions} lần trong ví (${totalPaidRemaining} lượt mua${
      totalBonusRemaining > 0
        ? ` + ${totalBonusRemaining} lượt tặng trị giá ${bonusRemainingRetailValue.toLocaleString('vi-VN')}đ`
        : ''
    }).`,
  };
}

/**
 * Tính toán trừ ví gói & phụ thu tự động khi khách ĐANG CÓ GÓI COMBO (REDEEM_EXISTING_COMBO):
 * - Ưu tiên trừ Lượt Mua (Paid) trước, hết Lượt Mua mới trừ sang Lượt Tặng (Bonus 0đ) theo FIFO.
 * - Nếu ví chỉ còn lượt Dặm (Refill) mà khách làm Nối Mới (hoặc quá hạn 25 ngày):
 *   tự động trừ 1 lượt Refill trong gói + thu phần chênh lệch (New Price - Refill Price).
 * - Nếu khách nâng cấp số sợi (Up-size Volume) hoặc đổi lên dòng mi cao hơn:
 *   tự động cộng phần chênh lệch đơn giá (Target Unit Price - Base Package Unit Price).
 */
export function calculateComboRedemptionAccounting(params: {
  comboName: string;
  baseCategoryId: WingsComboCategoryId | string;
  baseVolume: number | 'under';
  targetCategoryId?: WingsComboCategoryId | string;
  targetVolume?: number | 'under';
  requestedServiceType: 'Normal' | 'Retain';
  /** Cho phép giữ đúng lượt Dặm (Retain) đã chốt trên đơn/tư vấn kể cả khi daysSinceLastVisit > 25 */
  respectRequestedServiceType?: boolean;
  daysSinceLastVisit?: number | null;
  paidNewRemaining: number;
  paidRefillRemaining: number;
  bonusNewRemaining: number;
  bonusRefillRemaining: number;
}): ComboRedemptionAccountingBreakdown {
  const baseCat = getWingsComboCategory(params.baseCategoryId);
  const targetCat = getWingsComboCategory(params.targetCategoryId || params.baseCategoryId);
  const baseVol = params.baseVolume;
  const targetVol = params.targetVolume ?? params.baseVolume;

  const baseUnit = baseCat.unitPrices.find((u) =>
    baseVol === 'under' ? u.isUnderLash || u.volume === 'under' : Number(u.volume) === Number(baseVol)
  ) ||
    baseCat.unitPrices[0] || { newPrice: 770000, refillPrice: 470000 };

  const targetUnit =
    targetCat.unitPrices.find((u) =>
      targetVol === 'under' ? u.isUnderLash || u.volume === 'under' : Number(u.volume) === Number(targetVol)
    ) || baseUnit;

  const isWithin25DayCycle = params.daysSinceLastVisit == null ? true : params.daysSinceLastVisit <= 25;
  const effectiveServiceType: 'Normal' | 'Retain' =
    params.requestedServiceType === 'Retain' && (isWithin25DayCycle || params.respectRequestedServiceType)
      ? 'Retain'
      : 'Normal';

  let paidNew = Math.max(0, params.paidNewRemaining);
  let paidRefill = Math.max(0, params.paidRefillRemaining);
  let bonusNew = Math.max(0, params.bonusNewRemaining);
  let bonusRefill = Math.max(0, params.bonusRefillRemaining);

  const walletBefore = {
    paidNew,
    paidRefill,
    bonusNew,
    bonusRefill,
    totalRemaining: paidNew + paidRefill + bonusNew + bonusRefill,
  };

  let deductedBucket: ComboRedemptionAccountingBreakdown['deductedBucket'] = 'PAID_NEW';
  let typeConversionSurcharge = 0;
  let baseRecognizedValue = 0;

  if (effectiveServiceType === 'Retain') {
    if (paidRefill > 0) {
      paidRefill -= 1;
      deductedBucket = 'PAID_REFILL';
      baseRecognizedValue = baseUnit.refillPrice || baseUnit.newPrice;
    } else if (bonusRefill > 0) {
      bonusRefill -= 1;
      deductedBucket = 'BONUS_REFILL';
      baseRecognizedValue = 0; // Lượt tặng ghi nhận 0đ
    } else if (paidNew > 0) {
      paidNew -= 1;
      deductedBucket = 'PAID_NEW';
      baseRecognizedValue = baseUnit.newPrice;
    } else if (bonusNew > 0) {
      bonusNew -= 1;
      deductedBucket = 'BONUS_NEW';
      baseRecognizedValue = 0;
    }
  } else {
    // Khách làm Nối Mới (Normal) hoặc quá 25 ngày
    if (paidNew > 0) {
      paidNew -= 1;
      deductedBucket = 'PAID_NEW';
      baseRecognizedValue = baseUnit.newPrice;
    } else if (bonusNew > 0) {
      bonusNew -= 1;
      deductedBucket = 'BONUS_NEW';
      baseRecognizedValue = 0; // Lượt tặng ghi nhận 0đ
    } else if (paidRefill > 0 || bonusRefill > 0) {
      // Ví gói hết lượt New, chỉ còn lượt Refill -> Trừ 1 lượt Refill + Phụ thu chênh lệch (New - Refill)
      if (paidRefill > 0) {
        paidRefill -= 1;
        baseRecognizedValue = baseUnit.refillPrice || 0;
      } else {
        bonusRefill -= 1;
        baseRecognizedValue = 0;
      }
      deductedBucket = 'CONVERTED_REFILL_TO_NEW';
      typeConversionSurcharge = Math.max(0, baseUnit.newPrice - (baseUnit.refillPrice || baseUnit.newPrice));
    }
  }

  // Tính phụ thu nâng cấp số sợi / đổi dòng mi cao hơn (nếu có)
  const baseComparisonPrice =
    effectiveServiceType === 'Retain' ? baseUnit.refillPrice || baseUnit.newPrice : baseUnit.newPrice;
  const targetComparisonPrice =
    effectiveServiceType === 'Retain' ? targetUnit.refillPrice || targetUnit.newPrice : targetUnit.newPrice;

  const upgradeVolumeSurcharge = Math.max(0, targetComparisonPrice - baseComparisonPrice);
  const totalCustomerPayToday = typeConversionSurcharge + upgradeVolumeSurcharge;
  const totalCustomerPayTodayWithVat = Math.round(totalCustomerPayToday * 1.08);
  const recognizedRevenueToday = baseRecognizedValue + totalCustomerPayToday;

  const walletAfter = {
    paidNew,
    paidRefill,
    bonusNew,
    bonusRefill,
    totalRemaining: paidNew + paidRefill + bonusNew + bonusRefill,
  };

  const explainParts: string[] = [];
  if (deductedBucket === 'PAID_NEW') {
    explainParts.push(`Trừ 1 lượt Nối mới (Lượt mua: hạch toán ${baseRecognizedValue.toLocaleString('vi-VN')}đ)`);
  } else if (deductedBucket === 'PAID_REFILL') {
    explainParts.push(`Trừ 1 lượt Dặm Refill (Lượt mua: hạch toán ${baseRecognizedValue.toLocaleString('vi-VN')}đ)`);
  } else if (deductedBucket === 'BONUS_NEW') {
    explainParts.push('Trừ 1 lượt Nối mới Tặng kèm (Bonus 0đ)');
  } else if (deductedBucket === 'BONUS_REFILL') {
    explainParts.push('Trừ 1 lượt Dặm Tặng kèm (Bonus 0đ)');
  } else if (deductedBucket === 'CONVERTED_REFILL_TO_NEW') {
    explainParts.push(
      `Ví hết lượt New, quy đổi trừ 1 lượt Refill + phụ thu chênh lệch Nối mới +${typeConversionSurcharge.toLocaleString('vi-VN')}đ`
    );
  }

  if (upgradeVolumeSurcharge > 0) {
    explainParts.push(
      `Phụ thu nâng cấp (${targetCat.name} ${targetVol}): +${upgradeVolumeSurcharge.toLocaleString('vi-VN')}đ`
    );
  }

  return {
    mode: 'REDEEM_EXISTING_COMBO',
    comboName: params.comboName,
    categoryId: baseCat.id,
    baseVolume: baseVol,
    targetVolume: targetVol,
    requestedServiceType: effectiveServiceType,
    isWithin25DayCycle,
    deductedBucket,
    typeConversionSurcharge,
    upgradeVolumeSurcharge,
    totalCustomerPayToday,
    totalCustomerPayTodayWithVat,
    recognizedRevenueToday,
    walletBefore,
    walletAfter,
    explanation: explainParts.join(' · '),
  };
}

/**
 * Tạo nội dung báo giá tư vấn chuẩn Zalo / Messenger / SMS để gửi khách hàng
 */
export function formatComboConsultationQuote(pkg: MatchedComboPackageOption, includeVat: boolean = false): string {
  const finalPrice = includeVat ? pkg.comboPriceWithVat : pkg.comboPrice;
  const lines = [
    `💎 BÁO GIÁ GÓI COMBO WINGS LASHES`,
    `• Dòng mi: ${pkg.categoryName} (${pkg.volumeMeta.detailLabel})`,
    `• Gói ưu đãi: ${pkg.ruleName} — Tổng ${pkg.totalSessions} lần (${pkg.readableContent})`,
    `• Thời hạn sử dụng: ${pkg.validityMonths} tháng (Chu kỳ bảo dưỡng 25 ngày)`,
    `• Giá lẻ tổng ${pkg.totalSessions} lần: ${pkg.retailTotal.toLocaleString('vi-VN')}đ`,
    `• Giá Combo ưu đãi (${includeVat ? 'Đã gồm 8% VAT' : 'Chưa VAT'}): ${finalPrice.toLocaleString('vi-VN')}đ (Tiết kiệm ${pkg.savingsAmount.toLocaleString('vi-VN')}đ · Ưu đãi +${pkg.discountPct}%)`,
    `• Chi phí bình quân: chỉ ~${pkg.avgPerSessionPrice.toLocaleString('vi-VN')}đ/lần`,
  ];
  if (pkg.isWelcomePackage) {
    lines.push(`• Lưu ý: Gói Welcome (2 tặng 1) áp dụng đặc quyền duy nhất trong ngày đầu tiên sử dụng dịch vụ.`);
  }
  lines.push(
    `👉 Khi đăng ký gói hôm nay, buổi làm mi hôm nay được trừ luôn vào buổi đầu tiên của gói (không tính tiền lẻ buổi hôm nay)!`
  );
  return lines.join('\n');
}
