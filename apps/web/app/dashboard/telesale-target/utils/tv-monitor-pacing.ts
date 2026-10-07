export interface ShiftPacingResult {
  rTime: number; // 0.0 to 1.0
  minutesWorked: number; // 0 to 480
  minutesRemaining: number; // 0 to 480
  hoursRemaining: number;
  minsRemaining: number;
  shiftStatus: 'BEFORE_SHIFT' | 'IN_SHIFT_MORNING' | 'LUNCH_BREAK' | 'IN_SHIFT_AFTERNOON' | 'AFTER_SHIFT';
  shiftStatusLabel: string;
  countdownText: string;
}

export interface ShiftTimeInput {
  hour: number;
  minute: number;
  second?: number;
}

/**
 * Calculates work shift pacing according to business rules:
 * - Work shift: 08:00 – 17:00 (Total 8 working hours = 480 minutes)
 * - Lunch break: 12:00 – 13:00 (1 hour excluded, pacing frozen at 50% to prevent false delays)
 * - R_time pacing progression:
 *   * Before 08:00: 0%
 *   * 08:00 – 12:00: elapsedMorning / 480 (0% -> 50%)
 *   * 12:00 – 13:00: 50% constant
 *   * 13:00 – 17:00: (240 + elapsedAfternoon) / 480 (50% -> 100%)
 *   * After 17:00: 100%
 */
export function calculateShiftPacing(now: Date | ShiftTimeInput = new Date()): ShiftPacingResult {
  let h: number;
  let m: number;

  if ('hour' in now) {
    h = now.hour;
    m = now.minute;
  } else {
    h = now.getHours();
    m = now.getMinutes();
  }

  const currentTotalMinutes = h * 60 + m;
  const shiftStartMinutes = 8 * 60; // 08:00 = 480
  const lunchStartMinutes = 12 * 60; // 12:00 = 720
  const lunchEndMinutes = 13 * 60; // 13:00 = 780
  const shiftEndMinutes = 17 * 60; // 17:00 = 1020
  const totalWorkMinutes = 8 * 60; // 480 minutes

  // 1. Before Shift (< 08:00)
  if (currentTotalMinutes < shiftStartMinutes) {
    const untilStart = shiftStartMinutes - currentTotalMinutes;
    const uh = Math.floor(untilStart / 60);
    const um = untilStart % 60;
    return {
      rTime: 0,
      minutesWorked: 0,
      minutesRemaining: totalWorkMinutes,
      hoursRemaining: 8,
      minsRemaining: 0,
      shiftStatus: 'BEFORE_SHIFT',
      shiftStatusLabel: 'Chưa vào ca · Bắt đầu lúc 08:00',
      countdownText: `Bắt đầu sau ${uh}h ${um < 10 ? '0' : ''}${um}p`,
    };
  }

  // 2. Morning Shift (08:00 – 12:00)
  if (currentTotalMinutes < lunchStartMinutes) {
    const elapsed = currentTotalMinutes - shiftStartMinutes;
    const worked = elapsed;
    const remaining = totalWorkMinutes - worked;
    const rTime = Math.min(0.5, worked / totalWorkMinutes);
    const rh = Math.floor(remaining / 60);
    const rm = remaining % 60;
    return {
      rTime,
      minutesWorked: worked,
      minutesRemaining: remaining,
      hoursRemaining: rh,
      minsRemaining: rm,
      shiftStatus: 'IN_SHIFT_MORNING',
      shiftStatusLabel: 'Ca sáng (08:00 – 12:00)',
      countdownText: `Còn ${rh} giờ ${rm < 10 ? '0' : ''}${rm} phút`,
    };
  }

  // 3. Lunch Break (12:00 – 13:00)
  if (currentTotalMinutes < lunchEndMinutes) {
    const untilAfternoon = lunchEndMinutes - currentTotalMinutes;
    return {
      rTime: 0.5,
      minutesWorked: 240,
      minutesRemaining: 240,
      hoursRemaining: 4,
      minsRemaining: 0,
      shiftStatus: 'LUNCH_BREAK',
      shiftStatusLabel: 'Nghỉ trưa (Chiều bắt đầu lúc 13:00)',
      countdownText: `Nghỉ trưa · Ca chiều còn ${untilAfternoon}p`,
    };
  }

  // 4. Afternoon Shift (13:00 – 17:00)
  if (currentTotalMinutes < shiftEndMinutes) {
    const afternoonElapsed = currentTotalMinutes - lunchEndMinutes;
    const worked = 240 + afternoonElapsed;
    const remaining = Math.max(0, totalWorkMinutes - worked);
    const rTime = Math.min(1.0, worked / totalWorkMinutes);
    const rh = Math.floor(remaining / 60);
    const rm = remaining % 60;
    return {
      rTime,
      minutesWorked: worked,
      minutesRemaining: remaining,
      hoursRemaining: rh,
      minsRemaining: rm,
      shiftStatus: 'IN_SHIFT_AFTERNOON',
      shiftStatusLabel: 'Ca chiều (13:00 – 17:00)',
      countdownText: `Còn ${rh} giờ ${rm < 10 ? '0' : ''}${rm} phút`,
    };
  }

  // 5. After Shift (>= 17:00)
  return {
    rTime: 1.0,
    minutesWorked: totalWorkMinutes,
    minutesRemaining: 0,
    hoursRemaining: 0,
    minsRemaining: 0,
    shiftStatus: 'AFTER_SHIFT',
    shiftStatusLabel: 'Đã kết thúc ca làm việc (17:00)',
    countdownText: 'Đã hết giờ ca làm việc',
  };
}

export interface TvMonitorKpiMetrics {
  doneTarget: number;
  bookTarget: number;
  doneActual: number;
  bookActual: number;
  comboLiveDoneActual: number;
  comboLiveBookActual: number;
  donePercent: number;
  bookPercent: number;
  expectedDone: number;
  expectedBook: number;
  gapDone: number;
  gapBook: number;
  remainingDone: number;
  remainingBook: number;
  checkinTarget: number;
  checkinActual: number;
  comboLiveCheckinActual: number;
  checkinPercent: number;
  expectedCheckin: number;
  gapCheckin: number;
  remainingCheckin: number;
  teamState: 'WARMUP' | 'ON_PACE' | 'ACCELERATING' | 'APPROACHING' | 'COMPLETED' | 'NEEDS_BREAKTHROUGH';
  teamStateLabel: string;
  teamStateBadge: string;
  teamStateColor: 'blue' | 'emerald' | 'amber' | 'rose';
  actionableMessage: string;
  bookTier: 'emerald' | 'amber' | 'rose';
  doneTier: 'emerald' | 'amber' | 'rose';
  checkinTier: 'emerald' | 'amber' | 'rose';
}

/**
 * Tính toán màu sắc nhịp độ (Pacing Tier) theo thời gian thực:
 * - Đạt 100% mục tiêu cả ngày -> 'emerald' (Xanh lá)
 * - Đầu ca làm việc (rTime <= 0.08, khoảng 35-40 phút đầu ngày):
 *   + Nếu đã có >= 1 đơn -> 'emerald' (Xanh lá - Nổ đơn sớm vượt nhịp)
 *   + Nếu chưa có đơn -> 'amber' (Vàng - Đang khởi động, không phạt đỏ đầu ngày)
 * - Trong ca làm việc (rTime > 0.08):
 *   + gap >= 0 (Thực tế >= Kỳ vọng thời gian) -> 'emerald' (Xanh lá - Đạt/Vượt nhịp)
 *   + gap >= -1 (hoặc tỷ lệ bám nhịp >= 80%) -> 'amber' (Vàng - Chậm nhẹ 1 đơn / Bám nhịp)
 *   + gap <= -2 (trễ từ 2 đơn trở lên) -> 'rose' (Đỏ - Cần tăng tốc)
 */
export function calculatePacingTier(
  actual: number,
  expected: number,
  fullDayTarget: number,
  rTime: number
): 'emerald' | 'amber' | 'rose' {
  if (fullDayTarget > 0 && actual >= fullDayTarget) return 'emerald';

  if (rTime <= 0.08) {
    if (actual >= 1) return 'emerald';
    return 'amber';
  }

  const gap = actual - expected;
  if (gap >= 0) return 'emerald';
  if (gap >= -1 || (expected > 0 && actual / expected >= 0.8)) return 'amber';
  return 'rose';
}

export function calculateTvMonitorMetrics(
  teamDaily: {
    doneTarget?: number | null;
    bookTarget?: number | null;
    doneActual?: number | null;
    bookActual?: number | null;
    comboLiveDoneActual?: number | null;
    comboLiveBookActual?: number | null;
    checkinTarget?: number | null;
    checkinActual?: number | null;
    retailCheckinActual?: number | null;
    comboLiveCheckinActual?: number | null;
  },
  pacing: ShiftPacingResult
): TvMonitorKpiMetrics {
  const doneTarget = teamDaily.doneTarget || 18;
  const bookTarget = teamDaily.bookTarget || 25;
  const doneActual = teamDaily.doneActual || 0;
  const bookActual = teamDaily.bookActual || 0;
  const comboLiveDoneActual = teamDaily.comboLiveDoneActual || 0;
  const comboLiveBookActual = teamDaily.comboLiveBookActual || 0;

  const checkinTarget = teamDaily.checkinTarget || doneTarget;
  const checkinActual = teamDaily.checkinActual ?? teamDaily.retailCheckinActual ?? doneActual;
  const comboLiveCheckinActual = teamDaily.comboLiveCheckinActual ?? comboLiveDoneActual;

  const donePercent = Math.round((doneActual / doneTarget) * 100);
  const bookPercent = Math.round((bookActual / bookTarget) * 100);
  const checkinPercent = Math.round((checkinActual / checkinTarget) * 100);

  const expectedDone = Math.round(doneTarget * pacing.rTime);
  const expectedBook = Math.round(bookTarget * pacing.rTime);
  const expectedCheckin = Math.round(checkinTarget * pacing.rTime);

  const gapDone = doneActual - expectedDone;
  const gapBook = bookActual - expectedBook;
  const gapCheckin = checkinActual - expectedCheckin;

  const remainingDone = Math.max(0, doneTarget - doneActual);
  const remainingBook = Math.max(0, bookTarget - bookActual);
  const remainingCheckin = Math.max(0, checkinTarget - checkinActual);

  // 1. Determine Team State - Ưu tiên theo tiến độ BOOK (MOS-BUG-75)
  let teamState: TvMonitorKpiMetrics['teamState'];
  let teamStateLabel: string;
  let teamStateBadge: string;
  let teamStateColor: TvMonitorKpiMetrics['teamStateColor'];

  if (bookPercent >= 100 && donePercent >= 100) {
    teamState = 'COMPLETED';
    teamStateLabel = 'Hoàn thành KPI';
    teamStateBadge = '🎉 HOÀN THÀNH KPI';
    teamStateColor = 'emerald';
  } else if (bookPercent >= 100) {
    teamState = 'COMPLETED';
    teamStateLabel = 'Đạt mục tiêu Book';
    teamStateBadge = '🎉 ĐẠT MỤC TIÊU BOOK';
    teamStateColor = 'emerald';
  } else if (pacing.rTime < 0.15) {
    teamState = 'WARMUP';
    teamStateLabel = 'Khởi động';
    teamStateBadge = '⚡ KHỞI ĐỘNG';
    teamStateColor = 'blue';
  } else if (gapBook >= 2) {
    teamState = 'ACCELERATING';
    teamStateLabel = 'Vượt tiến độ';
    teamStateBadge = '🚀 VƯỢT TIẾN ĐỘ';
    teamStateColor = 'emerald';
  } else if (gapBook >= -1) {
    teamState = 'ON_PACE';
    teamStateLabel = 'Bám nhịp';
    teamStateBadge = '✓ BÁM NHỊP';
    teamStateColor = 'blue';
  } else {
    // Book chậm -> cần tăng tốc (không cảnh báo quá gay gắt nếu pipeline đang duy trì)
    teamState = 'NEEDS_BREAKTHROUGH';
    teamStateLabel = 'Cần tăng tốc';
    teamStateBadge = '⚡ CẦN TĂNG TỐC';
    teamStateColor = 'amber';
  }

  // 2. Actionable Instruction Message (MOS-BUG-75: Hướng hành động "Còn X Book để chạm mục tiêu hôm nay")
  let actionableMessage: string;
  if (pacing.shiftStatus === 'AFTER_SHIFT') {
    if (remainingBook === 0 && remainingDone === 0) {
      actionableMessage = '🎉 Xuất sắc! Team đã hoàn thành toàn bộ mục tiêu hôm nay!';
    } else {
      actionableMessage = `Kết quả ca hôm nay: ${bookActual}/${bookTarget} Book · ${doneActual}/${doneTarget} Done`;
    }
  } else {
    if (remainingBook > 0) {
      actionableMessage = `Còn ${remainingBook} Book để chạm mục tiêu hôm nay`;
    } else if (remainingDone > 0) {
      actionableMessage = `Đã đạt mục tiêu Book! Còn ${remainingDone} Done để hoàn tất mục tiêu hôm nay`;
    } else {
      actionableMessage = '🎉 Xuất sắc! Team đã hoàn thành 100% mục tiêu hôm nay!';
    }
  }

  // 3. Pacing-aware Tiers (Xanh khi bám/vượt nhịp thời gian, Vàng khi chậm nhẹ/khởi động, Đỏ khi trễ nhịp rõ rệt)
  const bookTier = calculatePacingTier(bookActual, expectedBook, bookTarget, pacing.rTime);
  const doneTier = calculatePacingTier(doneActual, expectedDone, doneTarget, pacing.rTime);
  const checkinTier = calculatePacingTier(checkinActual, expectedCheckin, checkinTarget, pacing.rTime);

  return {
    doneTarget,
    bookTarget,
    doneActual,
    bookActual,
    comboLiveDoneActual,
    comboLiveBookActual,
    donePercent,
    bookPercent,
    expectedDone,
    expectedBook,
    gapDone,
    gapBook,
    remainingDone,
    remainingBook,
    checkinTarget,
    checkinActual,
    comboLiveCheckinActual,
    checkinPercent,
    expectedCheckin,
    gapCheckin,
    remainingCheckin,
    teamState,
    teamStateLabel,
    teamStateBadge,
    teamStateColor,
    actionableMessage,
    bookTier,
    doneTier,
    checkinTier,
  };
}
