import { describe, it, expect } from 'vitest';
import { calculateShiftPacing, calculateTvMonitorMetrics } from './tv-monitor-pacing';

describe('calculateShiftPacing', () => {
  it('handles before shift (< 08:00)', () => {
    const res = calculateShiftPacing({ hour: 7, minute: 30 });
    expect(res.shiftStatus).toBe('BEFORE_SHIFT');
    expect(res.rTime).toBe(0);
    expect(res.minutesWorked).toBe(0);
    expect(res.minutesRemaining).toBe(480);
    expect(res.hoursRemaining).toBe(8);
    expect(res.countdownText).toContain('Bắt đầu sau 0h 30p');
  });

  it('handles morning shift progression (08:00 – 12:00)', () => {
    // 08:00 sharp
    const at8 = calculateShiftPacing({ hour: 8, minute: 0 });
    expect(at8.shiftStatus).toBe('IN_SHIFT_MORNING');
    expect(at8.rTime).toBe(0);
    expect(at8.minutesRemaining).toBe(480);

    // 10:00 (2 hours elapsed = 120/480 = 25%)
    const at10 = calculateShiftPacing({ hour: 10, minute: 0 });
    expect(at10.shiftStatus).toBe('IN_SHIFT_MORNING');
    expect(at10.rTime).toBe(0.25);
    expect(at10.minutesWorked).toBe(120);
    expect(at10.minutesRemaining).toBe(360);
    expect(at10.hoursRemaining).toBe(6);
    expect(at10.minsRemaining).toBe(0);
    expect(at10.countdownText).toBe('Còn 6 giờ 00 phút');
  });

  it('handles lunch break (12:00 – 13:00) with frozen 50% pacing', () => {
    // 12:30
    const lunch = calculateShiftPacing({ hour: 12, minute: 30 });
    expect(lunch.shiftStatus).toBe('LUNCH_BREAK');
    expect(lunch.rTime).toBe(0.5);
    expect(lunch.minutesWorked).toBe(240);
    expect(lunch.minutesRemaining).toBe(240);
    expect(lunch.countdownText).toContain('Nghỉ trưa · Ca chiều còn 30p');
  });

  it('handles afternoon shift progression (13:00 – 17:00)', () => {
    // 13:00
    const at13 = calculateShiftPacing({ hour: 13, minute: 0 });
    expect(at13.shiftStatus).toBe('IN_SHIFT_AFTERNOON');
    expect(at13.rTime).toBe(0.5);
    expect(at13.minutesWorked).toBe(240);
    expect(at13.minutesRemaining).toBe(240);

    // 15:00 (4h morning + 2h afternoon = 360/480 = 75%)
    const at15 = calculateShiftPacing({ hour: 15, minute: 0 });
    expect(at15.shiftStatus).toBe('IN_SHIFT_AFTERNOON');
    expect(at15.rTime).toBe(0.75);
    expect(at15.minutesWorked).toBe(360);
    expect(at15.minutesRemaining).toBe(120);
    expect(at15.hoursRemaining).toBe(2);
    expect(at15.minsRemaining).toBe(0);
    expect(at15.countdownText).toBe('Còn 2 giờ 00 phút');
  });

  it('handles after shift (>= 17:00)', () => {
    const after = calculateShiftPacing({ hour: 17, minute: 15 });
    expect(after.shiftStatus).toBe('AFTER_SHIFT');
    expect(after.rTime).toBe(1.0);
    expect(after.minutesWorked).toBe(480);
    expect(after.minutesRemaining).toBe(0);
    expect(after.countdownText).toBe('Đã hết giờ ca làm việc');
  });
});

describe('calculateTvMonitorMetrics', () => {
  it('calculates metrics for ticket example: BOOK 16/25 | Kỳ vọng 15 | Gap +1 | Còn 9', () => {
    // At 15:00, rTime = 0.6 (or pacing with expected 15 out of 25 = 15/25 = 60%)
    const pacing = {
      rTime: 0.6,
      minutesWorked: 288,
      minutesRemaining: 192,
      hoursRemaining: 3,
      minsRemaining: 12,
      shiftStatus: 'IN_SHIFT_AFTERNOON' as const,
      shiftStatusLabel: 'Ca chiều',
      countdownText: 'Còn 3 giờ 12 phút',
    };

    const metrics = calculateTvMonitorMetrics(
      {
        bookTarget: 25,
        bookActual: 16,
        doneTarget: 18,
        doneActual: 11,
      },
      pacing
    );

    expect(metrics.bookActual).toBe(16);
    expect(metrics.bookTarget).toBe(25);
    expect(metrics.expectedBook).toBe(15);
    expect(metrics.gapBook).toBe(1);
    expect(metrics.remainingBook).toBe(9);

    // Done: 18 * 0.6 = 10.8 -> 11. gapDone = 11 - 11 = 0
    expect(metrics.expectedDone).toBe(11);
    expect(metrics.gapDone).toBe(0);
    expect(metrics.remainingDone).toBe(7);

    // Gap >= -1 for book -> ON_PACE (MOS-BUG-75: Ưu tiên theo tiến độ Book)
    expect(metrics.teamState).toBe('ON_PACE');
    expect(metrics.actionableMessage).toBe('Còn 9 Book để chạm mục tiêu hôm nay');
  });

  it('determines WARMUP during start of shift (rTime < 0.15)', () => {
    const pacing = {
      rTime: 0.1,
      minutesWorked: 48,
      minutesRemaining: 432,
      hoursRemaining: 7,
      minsRemaining: 12,
      shiftStatus: 'IN_SHIFT_MORNING' as const,
      shiftStatusLabel: 'Ca sáng',
      countdownText: 'Còn 7 giờ 12 phút',
    };

    const metrics = calculateTvMonitorMetrics(
      {
        bookTarget: 25,
        bookActual: 1,
        doneTarget: 18,
        doneActual: 0,
      },
      pacing
    );

    expect(metrics.teamState).toBe('WARMUP');
    expect(metrics.teamStateLabel).toBe('Khởi động');
  });

  it('determines COMPLETED when both KPIs reach 100%', () => {
    const pacing = {
      rTime: 0.8,
      minutesWorked: 384,
      minutesRemaining: 96,
      hoursRemaining: 1,
      minsRemaining: 36,
      shiftStatus: 'IN_SHIFT_AFTERNOON' as const,
      shiftStatusLabel: 'Ca chiều',
      countdownText: 'Còn 1 giờ 36 phút',
    };

    const metrics = calculateTvMonitorMetrics(
      {
        bookTarget: 25,
        bookActual: 26,
        doneTarget: 18,
        doneActual: 18,
      },
      pacing
    );

    expect(metrics.teamState).toBe('COMPLETED');
    expect(metrics.remainingBook).toBe(0);
    expect(metrics.remainingDone).toBe(0);
    expect(metrics.actionableMessage).toContain('hoàn thành 100%');
  });

  it('determines EMERALD bookTier and AMBER doneTier at 08:14 morning shift', () => {
    // 08:14 is 14 minutes into shift (rTime = 14/480 = 0.029)
    const pacing = calculateShiftPacing({ hour: 8, minute: 14 });
    expect(pacing.shiftStatus).toBe('IN_SHIFT_MORNING');
    expect(pacing.rTime).toBeLessThan(0.08);

    const metrics = calculateTvMonitorMetrics(
      {
        bookTarget: 25,
        bookActual: 1,
        doneTarget: 18,
        doneActual: 0,
      },
      pacing
    );

    // 1 Book at 08:14 is ahead of time pace (expected: 0.73 book) -> MUST BE EMERALD (Xanh)
    expect(metrics.bookTier).toBe('emerald');
    // 0 Done at 08:14 is during warmup (< 0.08 rTime) -> MUST BE AMBER (Khởi động, không phạt đỏ)
    expect(metrics.doneTier).toBe('amber');
  });

  it('determines pacing tiers correctly during midday shift progression', () => {
    // 10:00 is 120 minutes into shift (rTime = 0.25, expected = 25 * 0.25 = 6.25 -> 6)
    const pacing = calculateShiftPacing({ hour: 10, minute: 0 });

    // On pace (6 books >= expected 6) -> EMERALD
    const onPace = calculateTvMonitorMetrics({ bookTarget: 25, bookActual: 6 }, pacing);
    expect(onPace.bookTier).toBe('emerald');

    // Slight delay (5 books, gap = -1) -> AMBER
    const slightDelay = calculateTvMonitorMetrics({ bookTarget: 25, bookActual: 5 }, pacing);
    expect(slightDelay.bookTier).toBe('amber');

    // Severe delay (3 books, gap = -3) -> ROSE
    const severeDelay = calculateTvMonitorMetrics({ bookTarget: 25, bookActual: 3 }, pacing);
    expect(severeDelay.bookTier).toBe('rose');
  });
});
