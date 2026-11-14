import { BookingItem, isDoneBookingPendingCheckout } from '../../../state/mockData';
import { resolveServiceSpecsFromComboOrHistory } from '../consultation/constraints/comboAndUnderMinkPresets';
import { calculateLashPricingAndCvPoints } from '../consultation/constraints/pricingAndCvPoints';
import { getWingsMenuDetail } from '../consultation/constraints/wingsMenuLookup';

export interface SegmentCounts {
  incoming: number;
  servicing: number;
  done: number;
  cancel: number;
}

export function getStepShortTitle(step?: number): string {
  switch (step) {
    case 6:
      return 'Nhận ca';
    case 7:
      return 'Ảnh Before';
    case 8:
      return 'Ảnh Vệ Sinh';
    case 9:
      return 'Giờ Phục Vụ';
    case 10:
      return 'Ảnh After';
    case 11:
      return 'Khảo sát';
    case 12:
      return 'Tư vấn Dưỡng mi / Combo';
    case 13:
      return 'Thanh toán';
    case 14:
      return 'Ghi nhận Tip';
    case 15:
      return 'VietQR & Hoàn tất';
    default:
      return 'Tiến trình nối mi';
  }
}

function resolveCanonicalBookingLashSpec(b: BookingItem): {
  material: string;
  volume: string;
  priceCode: string;
  countNum: string;
  countUnit: 'sợi' | 'fan' | 'nhịp';
} {
  const rawAttrMat = String(b.attributes?.material || '').trim();
  const hasExplicitAttrMat = Boolean(rawAttrMat && !rawAttrMat.toLowerCase().includes('any'));

  const primaryServiceText =
    [b.serviceName, b.comboLiveStatus?.comboName, b.lashHistory?.[0]?.serviceName].find((s) =>
      Boolean(s && !String(s).toLowerCase().includes('any'))
    ) || '';

  const matSource = (hasExplicitAttrMat ? rawAttrMat : primaryServiceText).toLowerCase();

  let material = 'HyperLight';
  let menuLookupCode = 'HYPERLIGHT';
  let countUnit: 'sợi' | 'fan' | 'nhịp' = 'fan';

  if (matSource.includes('under') || matSource.includes('mi dưới')) {
    material = 'Under Mink';
    menuLookupCode = 'UNDER_MINK';
    countUnit = 'sợi';
  } else if (matSource.includes('classic')) {
    material = 'Classic';
    menuLookupCode = 'NEW_CLASSIC';
    countUnit = 'sợi';
  } else if (matSource.includes('hyper')) {
    material = 'HyperLight';
    menuLookupCode = 'HYPERLIGHT';
    countUnit = 'fan';
  } else if (matSource.includes('ultra')) {
    material = 'UltraLight';
    menuLookupCode = 'ULTRALIGHT';
    countUnit = 'fan';
  } else if (matSource.includes('ivy')) {
    material = 'Ivylight';
    menuLookupCode = 'IVYLIGHT';
    countUnit = 'nhịp';
  } else if (matSource.includes('volume')) {
    material = 'Volume';
    menuLookupCode = 'NEW_VOLUME';
    countUnit = 'fan';
  } else if (matSource.includes('mink') || matSource.includes('flawless')) {
    material = 'Flawless Mink';
    menuLookupCode = 'FLAWLESS_MINK';
    countUnit = 'sợi';
  }

  const inferredFromService = primaryServiceText ? resolveServiceSpecsFromComboOrHistory(primaryServiceText) : null;
  const serviceMatchesMaterial = inferredFromService?.materialCode === menuLookupCode;

  const rawVol = String(
    b.attributes?.volume || (serviceMatchesMaterial ? inferredFromService?.volume : '') || ''
  ).trim();
  const volUpper = rawVol.toUpperCase();

  let volume = '4X';
  if (menuLookupCode === 'NEW_CLASSIC' || menuLookupCode === 'FLAWLESS_MINK' || menuLookupCode === 'UNDER_MINK') {
    volume = '1D';
  } else if (menuLookupCode === 'NEW_VOLUME') {
    volume = volUpper.includes('3') || matSource.includes('3d') ? '3D' : '2D';
  } else if (menuLookupCode === 'IVYLIGHT') {
    if (rawVol.includes('3') || matSource.includes('3l')) volume = '3L';
    else if (rawVol.includes('5') || matSource.includes('5l')) volume = '5L';
    else volume = '4L';
  } else if (menuLookupCode === 'ULTRALIGHT') {
    if (volUpper.includes('3')) volume = '3D';
    else if (volUpper.includes('5')) volume = '5D';
    else volume = '4D';
  } else {
    if (volUpper.includes('2')) volume = '2X';
    else if (volUpper.includes('3')) volume = '3X';
    else if (volUpper.includes('5')) volume = '5X';
    else volume = '4X';
  }

  const attrCountMatch = String(b.attributes?.count || '').match(/\d+/);
  const serviceExplicitCountMatch = serviceMatchesMaterial
    ? primaryServiceText.match(/\b(\d{2,3})\s*(?:sợi|fan|nhịp|trụ)\b/i)
    : null;
  const inferredCountMatch = serviceMatchesMaterial ? String(inferredFromService?.count || '').match(/\d+/) : null;

  const defaultCountByCode: Record<string, string> = {
    NEW_CLASSIC: '90',
    FLAWLESS_MINK: '70',
    UNDER_MINK: '70',
    IVYLIGHT: '90',
    ULTRALIGHT: '80',
    NEW_VOLUME: '80',
    HYPERLIGHT: '70',
  };

  const countNum =
    attrCountMatch?.[0] ||
    serviceExplicitCountMatch?.[1] ||
    inferredCountMatch?.[0] ||
    defaultCountByCode[menuLookupCode] ||
    '70';

  // Mã số hiển thị luôn là mã SKU Nối Mới chuẩn Menu Wings (PriceCode * 1000 = newPrice)
  // khớp chính xác 100% với bộ ba (Material, Volume, Count) — tuyệt đối không ghép lệch mã!
  const menuDetail = getWingsMenuDetail(menuLookupCode, countNum, volume);
  const resolvedCountNum = menuDetail ? String(menuDetail.countNum) : countNum;
  const priceCode = menuDetail ? String(Math.round(menuDetail.newPrice / 1000)) : '550';

  return {
    material,
    volume,
    priceCode,
    countNum: resolvedCountNum,
    countUnit,
  };
}

/**
 * Format thông số mi chuẩn Danny:
 * LINE 2: [Material] [Volume] [PriceCode] [Count] (VD: Classic 1D 440 70, HyperLight 5X 770 50)
 * Trong đó PriceCode luôn là mã và giá Nối Mới chuẩn Menu Wings (PriceCode * 1000 VNĐ) của đúng (Material, Volume, Count).
 */
export function formatLashSpecLine(b: BookingItem): string {
  const spec = resolveCanonicalBookingLashSpec(b);
  return [spec.material, spec.volume, spec.priceCode, spec.countNum].filter(Boolean).join(' ');
}

/**
 * Trích xuất toàn bộ thông số nối mi chi tiết cho Detail Popup
 */
export function getLashDetailSpecs(b: BookingItem) {
  const spec = resolveCanonicalBookingLashSpec(b);

  const curl = (b.attributes?.curl || 'C').trim();
  let thick = (b.attributes?.thickness || '0.07')
    .replace(/mm/gi, '')
    .replace(/^0\.10$/, '0.1')
    .trim();
  if (!thick) thick = '0.07';

  let len = (b.attributes?.length || '10-12')
    .replace(/mm/gi, '')
    .replace(/\s+/g, '')
    .replace(/8-9-10-11-12/g, '8-12')
    .trim();
  if (!len) len = '10-12';

  const design = b.attributes?.style || 'Tự nhiên';

  return {
    material: spec.material,
    volume: spec.volume,
    price: `${spec.priceCode}.000đ`,
    count: `${spec.countNum} ${spec.countUnit}`,
    curl: `${curl} (Cong)`,
    thickness: `${thick}mm`,
    length: `${len}mm`,
    design,
  };
}

/**
 * Tính toán thời gian đếm ngược khách sẽ đến (theo phút - in mins)
 */
export function formatArrivalCountdownInMins(
  timeStr: string | undefined,
  dateOffset: number,
  now: Date,
  isDark = true
): { text: string; colorClass: string; diffMins: number | null } {
  const mutedTextClass = isDark ? 'text-neutral-400' : 'text-neutral-600';
  const dimTextClass = isDark ? 'text-neutral-500' : 'text-neutral-500';
  if (dateOffset !== 0) {
    if (dateOffset === 1) return { text: 'Ngày mai', colorClass: mutedTextClass, diffMins: null };
    if (dateOffset === -1) return { text: 'Hôm qua', colorClass: dimTextClass, diffMins: null };
    return { text: `${dateOffset > 0 ? '+' : ''}${dateOffset}N`, colorClass: mutedTextClass, diffMins: null };
  }

  if (!timeStr) return { text: '-- mins', colorClass: dimTextClass, diffMins: null };

  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!match) return { text: '-- mins', colorClass: dimTextClass, diffMins: null };

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toLowerCase();

  if (period === 'pm' && hours < 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;

  const apptDate = new Date(now);
  apptDate.setHours(hours, minutes, 0, 0);

  const diffMs = apptDate.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / (60 * 1000));
  const suffix = Math.abs(diffMins) === 1 ? 'min' : 'mins';

  if (diffMins > 60) {
    return {
      text: `${diffMins} ${suffix}`,
      colorClass: isDark ? 'text-neutral-400 font-bold' : 'text-neutral-600 font-bold',
      diffMins,
    };
  }
  if (diffMins > 15) {
    return {
      text: `${diffMins} ${suffix}`,
      colorClass: isDark ? 'text-sky-400 font-extrabold' : 'text-sky-700 font-extrabold',
      diffMins,
    };
  }
  if (diffMins > 0) {
    return {
      text: `${diffMins} ${suffix}`,
      colorClass: isDark ? 'text-emerald-400 font-black animate-pulse' : 'text-emerald-700 font-black animate-pulse',
      diffMins,
    };
  }
  if (diffMins === 0) {
    return {
      text: '0 mins',
      colorClass: isDark ? 'text-amber-400 font-black animate-pulse' : 'text-amber-700 font-black animate-pulse',
      diffMins: 0,
    };
  }
  // diffMins < 0: Đã quá giờ hẹn
  return {
    text: `${diffMins} ${suffix}`,
    colorClass: isDark ? 'text-rose-400 font-bold' : 'text-rose-700 font-bold',
    diffMins,
  };
}

export function parseBookingTime(timeStr?: string, baseDate: Date = new Date()): Date {
  const d = new Date(baseDate);
  if (!timeStr) {
    d.setHours(9, 0, 0, 0);
    return d;
  }
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!match) {
    d.setHours(9, 0, 0, 0);
    return d;
  }
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toLowerCase();

  if (period === 'pm' && hours < 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;

  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function formatTime24hFromDate(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatTime24h(timeStr?: string): string {
  if (!timeStr) return '';
  const match = timeStr.match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = match[3]?.toLowerCase();
    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }
  return timeStr.replace(/\s*(am|pm)/gi, '').trim();
}

/**
 * Tính toán thời gian hoàn tất dự kiến và số phút còn lại (in mins) cho ca đang làm
 */
export function getBookingCompletionInfo(
  b: BookingItem,
  now: Date,
  isDark = true
): {
  completionTimeStr: string;
  countdownText: string;
  shortCountdownText: string;
  colorClass: string;
  diffMins: number;
} {
  const durationMinutes = b.serviceDuration || 90;

  // 1. Xác định thời điểm bắt đầu
  let startDate: Date;
  if (b.progress?.startedAt) {
    const parsed = new Date(b.progress.startedAt);
    startDate = isNaN(parsed.getTime()) ? parseBookingTime(b.time12h || b.timeSlot, now) : parsed;
  } else {
    startDate = parseBookingTime(b.time12h || b.timeSlot, now);
  }

  // 2. Thời điểm hoàn tất dự kiến
  const completionDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  const completionTimeStr = formatTime24hFromDate(completionDate);

  // 3. Đếm ngược số phút còn lại để hoàn tất
  let remainingMins: number;
  if (b.progress?.elapsedSeconds && b.progress.elapsedSeconds > 0) {
    remainingMins = Math.round((durationMinutes * 60 - b.progress.elapsedSeconds) / 60);
  } else {
    const diffMs = completionDate.getTime() - now.getTime();
    remainingMins = Math.round(diffMs / (60 * 1000));
  }

  const suffix = Math.abs(remainingMins) === 1 ? 'min' : 'mins';

  if (remainingMins > 30) {
    return {
      completionTimeStr,
      countdownText: `${remainingMins} ${suffix}`,
      shortCountdownText: `còn ${remainingMins}p`,
      colorClass: isDark ? 'text-emerald-400 font-extrabold' : 'text-emerald-700 font-extrabold',
      diffMins: remainingMins,
    };
  }
  if (remainingMins > 0) {
    return {
      completionTimeStr,
      countdownText: `${remainingMins} ${suffix}`,
      shortCountdownText: `còn ${remainingMins}p`,
      colorClass: isDark ? 'text-amber-400 font-black animate-pulse' : 'text-amber-700 font-black animate-pulse',
      diffMins: remainingMins,
    };
  }
  if (remainingMins === 0) {
    return {
      completionTimeStr,
      countdownText: '0 mins',
      shortCountdownText: 'đến giờ',
      colorClass: isDark ? 'text-amber-400 font-black animate-pulse' : 'text-amber-700 font-black animate-pulse',
      diffMins: 0,
    };
  }
  // remainingMins < 0: Đã quá giờ hoàn tất dự kiến
  return {
    completionTimeStr,
    countdownText: `${remainingMins} ${suffix}`,
    shortCountdownText: `trễ ${Math.abs(remainingMins)}p`,
    colorClass: isDark ? 'text-rose-400 font-bold' : 'text-rose-700 font-bold',
    diffMins: remainingMins,
  };
}

/**
 * Định dạng số tiền siêu gọn chuẩn Wings:
 * 770.000 -> 770K, 7.700.000 -> 7.700K, 200.000 -> 200K, 0 -> 0đ
 */
export function formatShortMoney(amount: number): string {
  if (!amount || amount === 0) return '0đ';
  const k = Math.round(amount / 1000);
  return `${k.toLocaleString('vi-VN')}K`;
}

export function resolveBookingCvRotationPoints(b: BookingItem): number {
  if (typeof b.cvRotationPoints === 'number' && Number.isFinite(b.cvRotationPoints) && b.cvRotationPoints > 0) {
    return Math.round(b.cvRotationPoints);
  }
  const spec = resolveCanonicalBookingLashSpec(b);
  const menuDetail = getWingsMenuDetail(spec.material, spec.countNum, spec.volume);
  const combined = `${b.serviceType || ''} ${b.serviceName || ''}`.toLowerCase();
  let effectiveServiceType = 'Normal';
  if (/fix|adjust/.test(combined)) {
    effectiveServiceType = 'Fix';
  } else if (/retain|\bdặm\b|refill/.test(combined)) {
    effectiveServiceType = 'Retain';
  } else if (menuDetail && menuDetail.refillPrice < menuDetail.newPrice) {
    const paidService = Number(b.billing?.serviceTotal ?? b.servicePrice ?? 0);
    if (paidService > 0 && paidService === menuDetail.refillPrice) {
      effectiveServiceType = 'Retain';
    }
  }
  return Math.round(
    calculateLashPricingAndCvPoints({
      materialId: spec.material,
      countStr: `${spec.countNum} ${spec.countUnit}`,
      volumeStr: spec.volume,
      designId: b.attributes?.style,
      colorStr: b.attributes?.color,
      serviceType: effectiveServiceType,
      hasUnderMink: Boolean(b.attributes?.hasUnderMink),
      underMinkServiceType: b.attributes?.underMinkServiceType,
    }).totalPoints
  );
}

/**
 * Trích xuất 3 tầng thông tin chuẩn cho Cột Phải của ca ĐÃ XONG (DONE):
 * 1. Thời gian: 09:00 · 55p
 * 2. Tiền (Quan trọng nhất): -200K (nếu nợ) | Package 7.700K (nếu bán Combo) | +770K (nếu thu dịch vụ/phụ thu) | 0đ (nếu trừ combo)
 * 3. Điểm CVL & Tip: ↻ +41 pts (kèm Heart 50K nếu có tip)
 */
export function getDoneBookingSummary(b: BookingItem) {
  // 1. Giờ book và số phút làm thực tế
  const rawTime = b.time12h || b.timeSlot || '09:00';
  const bookingTimeStr = formatTime24h(rawTime);
  const rawElapsed = b.progress?.elapsedSeconds ? Math.round(b.progress.elapsedSeconds / 60) : 0;
  const durationMinutes = rawElapsed >= 20 && rawElapsed <= 150 ? rawElapsed : b.serviceDuration || 60;
  const timeAndDurationStr = `${bookingTimeStr} · ${durationMinutes}p`;

  // 2. Dòng TIỀN (Chỉ số quan trọng nhất: tổng cả Combo Mi Trên + Combo Mi Dưới nếu mua 2 gói)
  const debtAmount = Number(b.debtAmount || b.billing?.debtAmount || 0);
  const hasDebt = debtAmount > 0;

  const explicitComboSum = Number(b.selectedCombo?.price || 0) + Number(b.selectedUnderCombo?.price || 0);
  const soldComboPrice =
    explicitComboSum > 0 ? explicitComboSum : Number(b.billing?.comboTotal || (b.billing as any)?.soldComboPrice || 0);
  const isComboLive = Boolean(b.comboLiveStatus?.isComboLive);
  const upgradeOrPaidAmount = Number(
    b.upgradePrice && b.upgradePrice > 0 ? b.upgradePrice : isComboLive ? 0 : b.servicePrice
  );

  // 3. Điểm CVL & Tip & Trạng thái hạch toán (Completed vs Chờ Quầy chốt Tiền mặt/POS)
  const cvPoints = resolveBookingCvRotationPoints(b);
  const tipAmount = Number(b.billing?.tipAmount || 0);
  const settlementStatus = b.billing?.settlementStatus;
  const isPendingCheckout = isDoneBookingPendingCheckout(b);
  const paymentMethod = b.billing?.paymentMethod;

  return {
    timeAndDurationStr,
    hasDebt,
    debtAmount,
    soldComboPrice,
    upgradeOrPaidAmount,
    cvPoints,
    tipAmount,
    settlementStatus,
    isPendingCheckout,
    paymentMethod,
  };
}
