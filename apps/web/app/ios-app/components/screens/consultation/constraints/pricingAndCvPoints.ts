import { formatComboName as sharedFormatComboName } from '@mos-lab/shared';
import type { CustomerTypeMeta, LashRotationPointsBreakdown } from './constraintTypesAndOptions';
import { resolveMaterialSpec } from './materialCatalogData';
import { getWingsMenuDetail } from './wingsMenuLookup';

// ============================================================================
// MA TRẬN MAPPING GIÁ TIỀN & ĐIỂM THƯỞNG VÒNG XOAY CHUYÊN VIÊN (CV ROTATION)
// Chuẩn Điều răn CV-001, CV-002 & Danh mục Dịch Vụ Wings Lashes
// ============================================================================

/**
 * Kiểm tra dòng mi luôn bắt buộc thực hiện kỹ thuật Nối Mới 100% (không dặm đè):
 * - Flawless Mink (FLAWLESS_MINK) & Ivylight 3L-5L (IVYLIGHT) luôn tháo ra nối mới toàn bộ.
 * - Tuy nhiên nếu khách quay lại trong chu kỳ <= 25 ngày thì vẫn được tính Giá Dặm (Refill Price).
 */
export function isAlwaysFullSetMaterial(materialIdOrCode?: string): boolean {
  const s = String(materialIdOrCode || '').toLowerCase();
  if (s.includes('under') || s.includes('dưới')) return false;
  return s.includes('mink') || s.includes('flawless') || s.includes('ivy');
}

/**
 * 1. Điểm Class (OrderServiceClass) chuẩn Báo cáo CV Xoay:
 * - Classic 1D: 0 pts
 * - Volume 2D / UltraLight / HyperLight: +3 pts
 * - Flawless Mink / Flawless Under Mink: +5 pts
 * - Ivylight: +20 pts
 */
export function getCvXoayClassPoints(materialIdOrCode?: string): number {
  const spec = resolveMaterialSpec(materialIdOrCode);
  switch (spec.code) {
    case 'IVYLIGHT':
      return 20;
    case 'FLAWLESS_MINK':
    case 'UNDER_MINK':
      return 5;
    case 'NEW_VOLUME':
    case 'ULTRALIGHT':
    case 'HYPERLIGHT':
      return 3;
    case 'NEW_CLASSIC':
    default:
      return 0;
  }
}

/**
 * 2. Điểm Fan (OrderServiceAttributeFan) chuẩn Báo cáo CV Xoay:
 * - 1D / 2D / Under Mink: 0 pts
 * - 2X / 3D / 3X / 3L: +1 pt
 * - 4D / 4X / 4L: +2 pts
 * - 5D / 5X / 5L: +3 pts
 */
export function getCvXoayFanPoints(materialIdOrCode?: string, volumeStr?: string): number {
  const spec = resolveMaterialSpec(materialIdOrCode);
  if (spec.code === 'NEW_CLASSIC' || spec.code === 'UNDER_MINK' || spec.code === 'NEW_VOLUME') {
    return 0;
  }
  const v = String(volumeStr || '')
    .toUpperCase()
    .trim();
  if (v.includes('5')) return 3;
  if (v.includes('4')) return 2;
  if (v.includes('3') || v.includes('2X')) return 1;
  return 0;
}

/**
 * 3. Điểm Số Lượng Sợi/Fan (OrderServiceAttributeLashes) chuẩn Báo cáo CV Xoay:
 * - Under Mink / <= 50 fan/sợi: +17 pts
 * - 60: +20 pts | 70: +23 pts | 80: +26 pts | 90: +29 pts
 * - 100: +32 pts | 110: +35 pts | 120: +38 pts | 130+: +41 pts
 */
export function getCvXoayLashPoints(materialIdOrCode?: string, countStr?: string): number {
  const spec = resolveMaterialSpec(materialIdOrCode);
  if (spec.code === 'UNDER_MINK') return 17;
  const match = String(countStr || '').match(/\d+/);
  const num = match ? Number(match[0]) : 70;
  if (num <= 50) return 17;
  if (num <= 60) return 20;
  if (num <= 70) return 23;
  if (num <= 80) return 26;
  if (num <= 90) return 29;
  if (num <= 100) return 32;
  if (num <= 110) return 35;
  if (num <= 120) return 38;
  return 41;
}

/**
 * 4. Điểm Loại Ca Làm (OrderServiceType) chuẩn Báo cáo CV Xoay:
 * - Retain (Dặm): 0 pts
 * - Normal (Nối Mới): +7 pts
 * - Fix / Adjust (Sửa mi FAL): +15 pts
 */
export function getCvXoayTypePoints(serviceType?: string, isAlwaysFullSet?: boolean): number {
  const st = String(serviceType || '').toLowerCase();
  if (st.includes('fix') || st.includes('adjust')) return 15;
  if (isAlwaysFullSet) return 7;
  if (st.includes('retain') || st.includes('dặm')) return 0;
  return 7;
}

/**
 * Tra cứu mã SKU Wings và Giá niêm yết chuẩn theo [Chất Liệu + Số Lượng Sợi/Kỹ Thuật Fan]
 */
export function resolveLashSkuPricing(
  materialId: string,
  countStr?: string,
  volumeStr?: string,
  serviceType?: string
): {
  skuName: string;
  price: number;
  classPts: number;
  lashPts: number;
  fanPts: number;
  isRetain: boolean;
  isAlwaysFullSet?: boolean;
} {
  const mid = String(materialId || '').toLowerCase();
  const isRetain =
    String(serviceType || '')
      .toLowerCase()
      .includes('retain') ||
    String(serviceType || '')
      .toLowerCase()
      .includes('dặm');
  const alwaysFullSet = isAlwaysFullSetMaterial(materialId);
  const classPts = getCvXoayClassPoints(materialId);
  const lashPts = getCvXoayLashPoints(materialId, countStr);
  const fanPts = getCvXoayFanPoints(materialId, volumeStr);

  // Ưu tiên tra cứu trực tiếp Ma Trận Menu Wings Lashes chuẩn xác 100%
  const menuDetail = getWingsMenuDetail(materialId, countStr, volumeStr);
  if (menuDetail) {
    const price = isRetain ? menuDetail.refillPrice : menuDetail.newPrice;
    const kPrice = Math.round(price / 1000);
    const matSpec = resolveMaterialSpec(materialId);
    const unit =
      matSpec.code === 'UNDER_MINK' || matSpec.code === 'FLAWLESS_MINK' || matSpec.code === 'NEW_CLASSIC'
        ? 'sợi'
        : matSpec.code === 'IVYLIGHT'
          ? 'nhịp'
          : 'fan';
    const actionPrefix = alwaysFullSet ? (isRetain ? 'Nối Mới (Giá Dặm)' : 'New') : isRetain ? 'Dặm' : 'New';
    const skuName = `${actionPrefix} ${matSpec.shortLabel} ${kPrice}K (${menuDetail.countNum} ${unit})`;
    return { skuName, price, classPts, lashPts, fanPts, isRetain, isAlwaysFullSet: alwaysFullSet };
  }

  // Fallback price resolution if menuDetail not matched directly
  if (mid.includes('dưới') || mid.includes('under')) {
    const price = isRetain ? 250000 : 390000;
    const skuName = isRetain ? 'Dặm Mi Dưới 250K' : 'New Flawless Under Mink 390K';
    return { skuName, price, classPts: 5, lashPts: 17, fanPts: 0, isRetain };
  }

  const fallbackPrice = isRetain ? 350000 : 550000;
  const fallbackSkuName = `${isRetain ? 'Dặm' : 'New'} ${materialId} ${Math.round(fallbackPrice / 1000)}K`;
  return {
    skuName: fallbackSkuName,
    price: fallbackPrice,
    classPts,
    lashPts,
    fanPts,
    isRetain,
    isAlwaysFullSet: alwaysFullSet,
  };
}

/**
 * Fallback-safe wrapper for formatComboName to prevent Webpack HMR bundle desync errors
 */
export function formatComboName(name?: string, packageKey?: string): string {
  if (typeof sharedFormatComboName === 'function') {
    return sharedFormatComboName(name, packageKey);
  }
  const raw = String(name || '').trim();
  if (!raw) return '';
  return raw.startsWith('❖') ? raw : `❖ ${raw}`;
}

/**
 * Phân định bộ ký hiệu Unicode sang trọng cho 4 nhóm khách hàng (Kinh Thánh mOS Điều răn COMBO-003):
 * - ✦ : Khách mới lần đầu (customerVisits <= 1)
 * - ❖ : Khách có Gói Combo Live (> 2 suất còn lại)
 * - ❖! : Khách Combo sắp hết (còn ≤ 2 suất)
 * - ↻ : Khách quay lại
 */
export function resolveCustomerTypeMeta(booking?: {
  customerVisits?: number;
  lashHistory?: Array<{ date?: string; serviceName?: string }>;
  comboLiveStatus?: { isComboLive?: boolean; remainingSessions?: number; isExpired?: boolean };
}): CustomerTypeMeta {
  const visits = booking?.customerVisits || 1;
  const isCombo = Boolean(booking?.comboLiveStatus?.isComboLive);
  const isComboExpired = Boolean(booking?.comboLiveStatus?.isExpired);
  const remaining = booking?.comboLiveStatus?.remainingSessions ?? 0;
  const hasHistory = Boolean(booking?.lashHistory && booking.lashHistory.length > 0);

  if (isCombo && remaining > 0) {
    if (remaining <= 2) {
      return { symbol: '❖!', label: 'Khách Combo sắp hết (≤ 2 lần)', colorClass: 'text-rose-400' };
    }
    return { symbol: '❖', label: 'Khách có Combo Live', colorClass: 'text-amber-400' };
  }
  if (visits <= 1 && !hasHistory && !isComboExpired) {
    return { symbol: '✦', label: 'Khách mới lần đầu', colorClass: 'text-cyan-400' };
  }
  return { symbol: '↻', label: 'Khách quay lại', colorClass: 'text-purple-300' };
}

/**
 * Chuẩn hóa tên dịch vụ hiển thị, triệt tiêu hoàn toàn placeholder tạm "Any - Lashes"
 */
export function resolveDisplayServiceName(booking?: {
  serviceName?: string;
  comboLiveStatus?: { isComboLive?: boolean; comboName?: string; packageKey?: string };
  packageKey?: string;
  lashHistory?: Array<{ serviceName?: string }>;
  attributes?: { material?: string; count?: string; volume?: string; style?: string };
  customerVisits?: number;
}): string {
  const cleanPriceSuffix = (str: string) => str.replace(/\s*\(\s*[\d.,]+\s*đ?\s*\)/gi, '').trim();
  const s = String(booking?.serviceName || '').trim();
  const pkgKey = booking?.packageKey || booking?.comboLiveStatus?.packageKey;
  if (s && !s.toLowerCase().includes('any')) {
    return cleanPriceSuffix(formatComboName(s, pkgKey));
  }
  if (booking?.comboLiveStatus?.isComboLive && booking.comboLiveStatus.comboName) {
    return cleanPriceSuffix(formatComboName(booking.comboLiveStatus.comboName, pkgKey));
  }
  if (booking?.lashHistory && booking.lashHistory.length > 0) {
    const validHistory = booking.lashHistory.find((h) => h.serviceName && !h.serviceName.toLowerCase().includes('any'));
    if (validHistory?.serviceName) {
      return cleanPriceSuffix(validHistory.serviceName);
    }
  }
  const mat = booking?.attributes?.material || 'HyperLight';
  const vol = booking?.attributes?.volume || '2X';
  const count = booking?.attributes?.count || '70 fan';
  const sku = resolveLashSkuPricing(mat, count, vol);
  if (sku?.skuName && !sku.skuName.toLowerCase().includes('any')) {
    return cleanPriceSuffix(sku.skuName);
  }
  return booking?.customerVisits && booking.customerVisits > 1 ? 'New Hyperlight 550' : 'Chưa chọn mẫu mi';
}

/**
 * 5. Điểm Thiết kế Dáng mi (OrderServiceAttributeDesign) chuẩn Báo cáo CV Xoay (staff_bonus_rule):
 * - Natural (id=49): 0 pts
 * - Kim-K / Katun / Thiết kế (id=101): +5 pts
 * - Wing (id=50): +6 pts
 * - Doll (id=102): +7 pts
 */
export function getLashDesignPoints(designId?: string): number {
  const d = String(designId || '').toLowerCase();
  if (d.includes('doll') || d.includes('búp bê')) return 7;
  if (d.includes('wing')) return 6;
  if (
    d.includes('kim') ||
    d.includes('katun') ||
    d.includes('anime') ||
    d.includes('wispy') ||
    d.includes('wet') ||
    d.includes('thiết kế')
  ) {
    return 5;
  }
  return 0;
}

/**
 * 6. Điểm Màu mi (OrderServiceAttributeColor) chuẩn Báo cáo CV Xoay (staff_bonus_rule):
 * - Đen (black, id=34): 0 pts
 * - Nâu / Xanh / Tím / Phối màu (brown/blue/purple, id=35,89,90): +5 pts
 */
export function getLashColorPoints(colorStr?: string): number {
  const c = String(colorStr || '').toLowerCase();
  if (!c || c === 'black' || c.includes('đen tuyền') || c.includes('jet black')) return 0;
  if (
    c.includes('brown') ||
    c.includes('nâu') ||
    c.includes('blue') ||
    c.includes('xanh') ||
    c.includes('purple') ||
    c.includes('tím') ||
    c.includes('color') ||
    c.includes('màu') ||
    c.includes('highlight') ||
    c.includes('ombre')
  ) {
    return 5;
  }
  return 0;
}

/**
 * Tính toàn bộ thông số Vòng xoay CV (Báo cáo CV Xoay) & Giá tiền mi nối
 */
export function calculateLashPricingAndCvPoints(params: {
  materialId: string;
  countStr?: string;
  volumeStr?: string;
  designId?: string;
  colorStr?: string;
  originalBookedPrice?: number;
  serviceType?: string; // "Normal" | "Retain" | "Fix" | "Adjust"
  hasUnderMink?: boolean;
  underMinkServiceType?: 'Normal' | 'Retain';
  hasUnderMinkCombo?: boolean;
}): LashRotationPointsBreakdown {
  const {
    materialId,
    countStr,
    volumeStr,
    designId,
    colorStr,
    originalBookedPrice = 550000,
    serviceType = 'Normal',
    hasUnderMink = false,
    underMinkServiceType,
    hasUnderMinkCombo = false,
  } = params;

  const skuInfo = resolveLashSkuPricing(materialId, countStr, volumeStr, serviceType);
  const isRetain = skuInfo.isRetain;
  const alwaysFullSet = Boolean(skuInfo.isAlwaysFullSet);

  const resolvedUnderMinkType: 'Normal' | 'Retain' = underMinkServiceType || (isRetain ? 'Retain' : 'Normal');
  const isUnderMinkRetain = resolvedUnderMinkType === 'Retain';
  const isUnderMinkComboDeducted = Boolean(hasUnderMink && hasUnderMinkCombo);
  const underMinkListPrice = isUnderMinkRetain ? 250000 : 390000;
  const underMinkPrice = hasUnderMink ? (isUnderMinkComboDeducted ? 0 : underMinkListPrice) : 0;
  const underMinkFibers = hasUnderMink ? 30 : 0;
  const underMinkDuration = hasUnderMink ? 30 : 0;

  const skuPrice = skuInfo.price + underMinkPrice;
  const underSkuSuffix = isUnderMinkComboDeducted
    ? `Trừ Gói Mi Dưới (${isUnderMinkRetain ? 'Dặm' : 'Mới'} · 0đ)`
    : isUnderMinkRetain
      ? 'Dặm 250K'
      : 'Mới 390K';
  const skuName = hasUnderMink ? `${skuInfo.skuName} + Mi Dưới (${underSkuSuffix})` : skuInfo.skuName;

  const originalPrice = originalBookedPrice;
  const upgradePrice = Math.max(0, skuPrice - originalPrice);

  const vatRate = 0.08;
  const vatAmount = Math.round(skuPrice * vatRate);
  const totalPriceWithVat = skuPrice + vatAmount;
  const upgradeVat = Math.round(upgradePrice * vatRate);
  const upgradePriceWithVat = upgradePrice + upgradeVat;

  const classPts = skuInfo.classPts;
  const fanPts = skuInfo.fanPts;
  const typePts = getCvXoayTypePoints(serviceType, alwaysFullSet);
  const lashPts = skuInfo.lashPts;
  const designPts = getLashDesignPoints(designId);
  const colorPts = getLashColorPoints(colorStr);

  const upperSetPoints = classPts + fanPts + typePts + lashPts + designPts + colorPts;
  const upperSetBreakdownLabel = `Class +${classPts} · Fan +${fanPts} · Type +${typePts} · Lash +${lashPts} · Design +${designPts}${
    colorPts > 0 ? ` · Color +${colorPts}` : ''
  }`;

  const serviceSetsCount: 1 | 2 = hasUnderMink ? 2 : 1;
  const underClassPts = hasUnderMink ? 5 : 0;
  const underTypePts = hasUnderMink ? (isUnderMinkRetain ? 0 : 7) : 0;
  const underLashPts = hasUnderMink ? 17 : 0;
  const underSetPoints = hasUnderMink ? underClassPts + underTypePts + underLashPts : 0;
  const underSetBreakdownLabel = hasUnderMink
    ? `Class +${underClassPts} · Fan +0 · Type +${underTypePts} · Lash +${underLashPts} · Design +0`
    : '';

  const totalPoints = upperSetPoints + underSetPoints;

  const breakdownLabel = hasUnderMink
    ? `Bộ 1 Mi Trên: +${upperSetPoints}p (${upperSetBreakdownLabel}) | Bộ 2 Mi Dưới (${
        isUnderMinkRetain ? 'Dặm' : 'Mới'
      }): +${underSetPoints}p (Class +5 · Type +${underTypePts} · Lash +17)`
    : upperSetBreakdownLabel;

  const progressUnicode = totalPoints >= 100 ? '●' : totalPoints >= 65 ? '◕' : totalPoints >= 35 ? '◑' : '◔';
  const summaryLabel = hasUnderMink
    ? `${progressUnicode} 2 Bộ Mi Độc Lập · +${totalPoints} pts (${upperSetPoints}p + ${underSetPoints}p)`
    : `${progressUnicode} 1 Bộ Mi · +${totalPoints} pts Vòng Xoay CV`;

  return {
    skuName,
    skuPrice,
    upgradePrice,
    originalPrice,
    vatRate,
    vatAmount,
    totalPriceWithVat,
    upgradeVat,
    upgradePriceWithVat,
    classPts,
    lashPts,
    designPts,
    fanPts,
    typePts,
    colorPts,
    upperSetPoints,
    upperSetBreakdownLabel,
    serviceSetsCount,
    underClassPts,
    underTypePts,
    underLashPts,
    underSetPoints,
    underSetBreakdownLabel,
    totalPoints,
    summaryLabel,
    breakdownLabel,
    isRetain,
    serviceType: isRetain ? 'Retain' : 'Normal',
    hasUnderMink,
    underMinkServiceType: resolvedUnderMinkType,
    isUnderMinkComboDeducted,
    underMinkPrice,
    underMinkFibers,
    underMinkDuration,
  };
}

export type LashPricingAndCvPointResult = ReturnType<typeof calculateLashPricingAndCvPoints>;
