export interface WheelBonusCapResult {
  monthlyDailyBonus: number;
  rawWheelBonus: number;
  maxWheelBonusAllowed: number;
  effectiveWheelBonus: number;
  /** Percentage of CC Xoay vs CC Daily Bonus. 100% = equal, 150% = hardcap ceiling */
  wheelCapPercent: number;
  capStatus: 'NORMAL' | 'WARNING' | 'HARDCAPPED';
}

/**
 * Single Source of Truth rule for Wheel / Minigame Bonus Capping:
 * Total Wheel Bonus must not exceed 1.5x of Monthly CC Daily Bonus per staff.
 *
 * wheelCapPercent scale: 100% = CC Xoay equals CC Daily Bonus, 150% = hardcap (1.5x).
 */
export function calculateWheelBonusCap(monthlyDailyBonus: number, rawWheelBonus: number): WheelBonusCapResult {
  const dailyBonus = Math.max(0, Math.round(monthlyDailyBonus || 0));
  const rawWheel = Math.max(0, Math.round(rawWheelBonus || 0));
  const maxWheelBonusAllowed = Math.round(1.5 * dailyBonus);
  const effectiveWheelBonus = Math.min(rawWheel, maxWheelBonusAllowed);

  // Scale: 100% = CC Xoay equals CC Daily Bonus, 150% = hardcap ceiling (1.5x)
  let wheelCapPercent = 0;
  if (dailyBonus > 0) {
    wheelCapPercent = Math.round((rawWheel / dailyBonus) * 100);
  } else if (rawWheel > 0) {
    wheelCapPercent = 999; // infinity — no daily bonus to reference
  }

  let capStatus: 'NORMAL' | 'WARNING' | 'HARDCAPPED' = 'NORMAL';
  if (rawWheel > 0 && (rawWheel >= maxWheelBonusAllowed || dailyBonus === 0)) {
    capStatus = 'HARDCAPPED';
  } else if (dailyBonus > 0 && wheelCapPercent >= 120) {
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
