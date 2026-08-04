export interface WheelBonusCapResult {
  monthlyDailyBonus: number;
  rawWheelBonus: number;
  maxWheelBonusAllowed: number;
  effectiveWheelBonus: number;
  wheelCapPercent: number;
  capStatus: 'NORMAL' | 'WARNING' | 'HARDCAPPED';
}

/**
 * Single Source of Truth rule for Wheel / Minigame Bonus Capping:
 * Total Wheel Bonus must not exceed 1.5x of Monthly CC Daily Bonus per staff.
 */
export function calculateWheelBonusCap(monthlyDailyBonus: number, rawWheelBonus: number): WheelBonusCapResult {
  const dailyBonus = Math.max(0, Math.round(monthlyDailyBonus || 0));
  const rawWheel = Math.max(0, Math.round(rawWheelBonus || 0));
  const maxWheelBonusAllowed = Math.round(1.5 * dailyBonus);
  const effectiveWheelBonus = Math.min(rawWheel, maxWheelBonusAllowed);

  let wheelCapPercent = 0;
  if (maxWheelBonusAllowed > 0) {
    wheelCapPercent = Math.min(100, Math.round((rawWheel / maxWheelBonusAllowed) * 100));
  } else if (rawWheel > 0) {
    wheelCapPercent = 100;
  }

  let capStatus: 'NORMAL' | 'WARNING' | 'HARDCAPPED' = 'NORMAL';
  if (rawWheel > 0 && (rawWheel >= maxWheelBonusAllowed || dailyBonus === 0)) {
    capStatus = 'HARDCAPPED';
  } else if (wheelCapPercent >= 80) {
    capStatus = 'WARNING';
  }

  return {
    monthlyDailyBonus: dailyBonus,
    rawWheelBonus: rawWheel,
    maxWheelBonusAllowed,
    effectiveWheelBonus,
    wheelCapPercent,
    capStatus,
  };
}
