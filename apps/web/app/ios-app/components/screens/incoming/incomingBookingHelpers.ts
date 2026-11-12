import { BookingItem } from '../../../state/mockData';

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

/**
 * Format thông số mi chuẩn Danny:
 * LINE 2: HyperLight 5X 770 60
 * (curl, thickness, length được chuyển vào Detail Popup)
 */
export function formatLashSpecLine(b: BookingItem): string {
  // 1. Dòng mi (Material)
  let mat = b.attributes?.material || '';
  const sName = b.serviceName || '';
  if (!mat || mat.toLowerCase().includes('any')) {
    if (sName.includes('Classic')) mat = 'Classic';
    else if (sName.includes('Hyperlight') || sName.includes('HyperLight')) mat = 'HyperLight';
    else if (sName.includes('Ultralight') || sName.includes('UltraLight')) mat = 'UltraLight';
    else if (sName.includes('Ivylight')) mat = 'Ivylight';
    else if (sName.includes('Mink') || sName.includes('Flawless')) mat = 'Flawless Mink';
    else mat = 'HyperLight';
  }
  if (mat === 'New Classic') mat = 'Classic';

  // 2. Độ dày (Volume): 5X, 1D, 2X, 3X, 4D, 5D...
  let vol = b.attributes?.volume || '';
  if (!vol) {
    vol = mat === 'Classic' ? '1D' : '2X';
  }
  if (mat === 'Classic' && !vol.includes('D')) vol = '1D';

  // 3. Mức giá (Price k): 770, 550, 440, 660, 1220...
  let priceNum = '';
  const priceMatch = sName.match(/\b(390|440|550|660|770|880|1020|1220)\b/);
  if (priceMatch) {
    priceNum = priceMatch[1];
  } else if (b.servicePrice && b.servicePrice > 0) {
    priceNum = String(Math.round(b.servicePrice / 1000));
  } else {
    priceNum = '550';
  }

  // 4. Số lượng sợi/fan (Count): 60, 70, 90...
  let countNum = '';
  const countMatch = (b.attributes?.count || '').match(/\d+/);
  if (countMatch) {
    countNum = countMatch[0];
  } else {
    countNum = mat === 'Classic' ? '90' : '60';
  }

  return [mat, vol, priceNum, countNum].filter(Boolean).join(' ');
}

/**
 * Trích xuất toàn bộ thông số nối mi chi tiết cho Detail Popup
 */
export function getLashDetailSpecs(b: BookingItem) {
  let mat = b.attributes?.material || '';
  const sName = b.serviceName || '';
  if (!mat || mat.toLowerCase().includes('any')) {
    if (sName.includes('Classic')) mat = 'Classic';
    else if (sName.includes('Hyperlight') || sName.includes('HyperLight')) mat = 'HyperLight';
    else if (sName.includes('Ultralight') || sName.includes('UltraLight')) mat = 'UltraLight';
    else if (sName.includes('Ivylight')) mat = 'Ivylight';
    else if (sName.includes('Mink') || sName.includes('Flawless')) mat = 'Flawless Mink';
    else mat = 'HyperLight';
  }
  if (mat === 'New Classic') mat = 'Classic';

  let vol = b.attributes?.volume || '';
  if (!vol) {
    vol = mat === 'Classic' ? '1D' : '2X';
  }
  if (mat === 'Classic' && !vol.includes('D')) vol = '1D';

  let priceNum = '';
  const priceMatch = sName.match(/\b(390|440|550|660|770|880|1020|1220)\b/);
  if (priceMatch) {
    priceNum = priceMatch[1];
  } else if (b.servicePrice && b.servicePrice > 0) {
    priceNum = String(Math.round(b.servicePrice / 1000));
  } else {
    priceNum = '550';
  }

  let countNum = '';
  const countMatch = (b.attributes?.count || '').match(/\d+/);
  if (countMatch) {
    countNum = countMatch[0];
  } else {
    countNum = mat === 'Classic' ? '90' : '60';
  }

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
    material: mat,
    volume: vol,
    price: `${priceNum}.000đ`,
    count: `${countNum} sợi`,
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
  now: Date
): { text: string; colorClass: string; diffMins: number | null } {
  if (dateOffset !== 0) {
    if (dateOffset === 1) return { text: 'Ngày mai', colorClass: 'text-neutral-400', diffMins: null };
    if (dateOffset === -1) return { text: 'Hôm qua', colorClass: 'text-neutral-500', diffMins: null };
    return { text: `${dateOffset > 0 ? '+' : ''}${dateOffset}N`, colorClass: 'text-neutral-400', diffMins: null };
  }

  if (!timeStr) return { text: '-- mins', colorClass: 'text-neutral-500', diffMins: null };

  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!match) return { text: '-- mins', colorClass: 'text-neutral-500', diffMins: null };

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
    return { text: `${diffMins} ${suffix}`, colorClass: 'text-neutral-400 font-bold', diffMins };
  }
  if (diffMins > 15) {
    return { text: `${diffMins} ${suffix}`, colorClass: 'text-sky-400 font-extrabold', diffMins };
  }
  if (diffMins > 0) {
    return { text: `${diffMins} ${suffix}`, colorClass: 'text-emerald-400 font-black animate-pulse', diffMins };
  }
  if (diffMins === 0) {
    return { text: '0 mins', colorClass: 'text-amber-400 font-black animate-pulse', diffMins: 0 };
  }
  // diffMins < 0: Đã quá giờ hẹn
  return { text: `${diffMins} ${suffix}`, colorClass: 'text-rose-400 font-bold', diffMins };
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
  now: Date
): {
  completionTimeStr: string;
  countdownText: string;
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
      colorClass: 'text-emerald-400 font-extrabold',
      diffMins: remainingMins,
    };
  }
  if (remainingMins > 0) {
    return {
      completionTimeStr,
      countdownText: `${remainingMins} ${suffix}`,
      colorClass: 'text-amber-400 font-black animate-pulse',
      diffMins: remainingMins,
    };
  }
  if (remainingMins === 0) {
    return {
      completionTimeStr,
      countdownText: '0 mins',
      colorClass: 'text-amber-400 font-black animate-pulse',
      diffMins: 0,
    };
  }
  // remainingMins < 0: Đã quá giờ hoàn tất dự kiến
  return {
    completionTimeStr,
    countdownText: `${remainingMins} ${suffix}`,
    colorClass: 'text-rose-400 font-bold',
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
  const cvPoints = Number(b.cvRotationPoints || 41);
  const tipAmount = Number(b.billing?.tipAmount || 0);
  const settlementStatus = b.billing?.settlementStatus;

  return {
    timeAndDurationStr,
    hasDebt,
    debtAmount,
    soldComboPrice,
    upgradeOrPaidAmount,
    cvPoints,
    tipAmount,
    settlementStatus,
  };
}
