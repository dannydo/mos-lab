/**
 * 🚀 SYSTEM CONSTANTS & BUSINESS RULES DEFINITION FOR MOS-LAB
 * Single Source of Truth for all numerical values, business logic constants, and DB mappings.
 */

/**
 * 🏆 CC GAMIFICATION SYSTEM CONFIGURATION
 * @description Rules and calculation parameters for Client Consultant (CC) Gamification & KPI.
 * Ref: AGENTS.md Rule #6, #7, #9, #12
 */
export const CC_GAMIFICATION_SYSTEM_CONFIG = {
  /** Accumulated points required for 1 Level CC (Formula: Floor(pts / 100) + 1). Resets on 1st of every month. */
  POINTS_PER_LEVEL: 100,

  /** Cash bonus rate per Level CC for each shift (Formula: Level * 65đ). Main DB source: staff_bonus.bonus_amount (rule 248) */
  BONUS_PER_LEVEL_VND: 65,

  /** Base tip percentage awarded to CC when a single CC serves the client (DB column: staff_tip.tip_percentage = 20) */
  TIP_PERCENTAGE_FULL: 20,

  /** Split tip percentage awarded to each CC when CC IN != CC OUT (DB column: staff_tip.tip_percentage = 10) */
  TIP_PERCENTAGE_SPLIT: 10,

  /** Staff Bonus Rule ID for CC Cash Bonus in legacy DB `staff_bonus_rule` */
  STAFF_BONUS_CASH_RULE_ID: 248,

  /** Base denominator for target check-ins completion calculation */
  TARGET_CHECKINS_BASE: 200,

  /** Daily Sales Bonus commission tiers for CC */
  DAILY_SALES_COMMISSION_TIERS: [
    { minSales: 30000000, commissionPercent: 3.0 },
    { minSales: 25000000, commissionPercent: 2.5 },
    { minSales: 15000000, commissionPercent: 2.0 },
    { minSales: 10000000, commissionPercent: 1.5 },
    { minSales: 5000000, commissionPercent: 1.0 },
    { minSales: 0, commissionPercent: 0.5 },
  ],

  /** Fallback active CC staff IDs if crmConfig ACTIVE_CC_STAFF_CONFIG is missing */
  FALLBACK_ACTIVE_CC_STAFF_IDS: [37790, 34295, 46092, 48026, 51659],
} as const;

/**
 * 👁️ EYELASH TOUCH-UP SYSTEM CONFIGURATION
 * @description Expiration rules for eyelash touch-up / refill services.
 * Ref: AGENTS.md Rule #16
 */
export const LASH_TOUCHUP_SYSTEM_CONFIG = {
  /** Maximum days for touch-up service for Single/Retail clients (21 days max from last service date) */
  SINGLE_CUSTOMER_MAX_DAYS: 21,

  /** Maximum days for touch-up service for Combo package clients (25 days max from last service date) */
  COMBO_CUSTOMER_MAX_DAYS: 25,
} as const;

/**
 * ⏰ OPERATIONAL SHIFT SYSTEM CONFIGURATION
 * @description Store operational shift hours and cashflow tracking delay buffer.
 * Ref: AGENTS.md Rule #14
 */
export const OPERATIONAL_SHIFT_SYSTEM_CONFIG = {
  /** Store actual opening hour (09:00 AM) */
  STORE_OPEN_HOUR: 9,

  /** Store actual closing hour (21:00 PM) */
  STORE_CLOSE_HOUR: 21,

  /** Cashflow tracking start hour after 2h checkout buffer (11:00 AM) */
  CASHFLOW_TRACKING_START_HOUR: 11,

  /** Cashflow tracking end hour after 2h checkout buffer (23:00 PM / 22:59:59) */
  CASHFLOW_TRACKING_END_HOUR: 23,

  /** Cashflow tracking shift duration in hours (12 hours window) */
  CASHFLOW_SHIFT_DURATION_HOURS: 12,

  /** Midnight cron schedule for order regeneration batch (02:00 AM ICT) */
  MIDNIGHT_ORDER_REGENERATION_CRON: '0 2 * * *',
} as const;

/**
 * 💳 CATALOG & CURRENCY SYSTEM CONFIGURATION
 * @description Currency IDs, Language IDs, and Template IDs in legacy DB.
 * Ref: AGENTS.md Rule #23, #27
 */
export const CATALOG_CURRENCY_SYSTEM_CONFIG = {
  /** Currency ID for VND in `service_price` and `product_price` tables */
  CURRENCY_ID_VND: 2,

  /** Currency ID for Banana Points in `user_balance` and `user_balance_transaction` tables */
  CURRENCY_ID_BANANA_POINTS: 3,

  /** Transaction Template ID for Referral reward points in `user_balance_transaction` */
  REFERRAL_TRANSACTION_TEMPLATE_ID: 7,

  /** Language ID for Vietnamese in `service_language`, `product_language`, `user_group_language` */
  LANGUAGE_ID_VIETNAMESE: 1,
} as const;

/**
 * 💻 UI & PAGINATION SYSTEM CONFIGURATION
 * @description Ant Design Table pagination and default UI options.
 * Ref: AGENTS.md Rule #24
 */
export const UI_PAGINATION_SYSTEM_CONFIG = {
  /** Standard pagination page size options for Ant Design <Table> */
  DEFAULT_PAGE_SIZE_OPTIONS: ['10', '20', '50', '100'],

  /** Default page size for tables */
  DEFAULT_PAGE_SIZE: 20,

  /** Default debounce delay for search inputs in ms */
  DEFAULT_DEBOUNCE_DELAY_MS: 300,
} as const;

/**
 * Helper: Calculate real-time fraction today based on 11:00 - 23:00 (+2h buffer) operational shift window.
 * Ref: AGENTS.md Rule #14
 */
export function calculateFractionToday(currentHour: number): number {
  const startHour = OPERATIONAL_SHIFT_SYSTEM_CONFIG.CASHFLOW_TRACKING_START_HOUR; // 11
  const endHour = OPERATIONAL_SHIFT_SYSTEM_CONFIG.CASHFLOW_TRACKING_END_HOUR - 1; // 22

  if (currentHour < startHour) return 0;
  if (currentHour > endHour) return 1;
  return (currentHour - startHour + 1) / OPERATIONAL_SHIFT_SYSTEM_CONFIG.CASHFLOW_SHIFT_DURATION_HOURS;
}

/**
 * 🪷 ACTIVE LASH SALON CONFIGURATION
 * @description Active physical Lash Extension salons currently open for customer services.
 * Excludes Academies (is_academy = 1) and Offices (hq/hardware/ctv).
 */
export const ACTIVE_LASH_SALONS = [
  { id: 6, code: 'DT', name: 'Đề Thám', legacyId: 6, key: 'detham' },
  { id: 16, code: 'EP', name: 'Estella Place', legacyId: 16, key: 'estella' },
] as const;
