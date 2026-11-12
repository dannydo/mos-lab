/**
 * Ma Trận Ràng Buộc Kỹ Thuật 3 Bước Chuẩn Wings Lashes (Barrel Module)
 * Quy trình tư vấn bắt buộc:
 *   Bước 1: Chọn Chất Liệu / Dòng Mi (Material Family)
 *   Bước 2: Chọn Thiết Kế (Design) trên hạn chế của Chất Liệu
 *   Bước 3: Chọn Độ Cong (Curl), Độ Dày (Thickness), Chiều Dài (Length) & Kỹ Thuật Fan (Volume)
 *           theo đúng giới hạn của Chất Liệu đã chọn.
 */

export {
  ALL_LASH_DESIGNS,
  ALL_LASH_THICKNESSES,
  ALL_LENGTH_MAPPINGS,
  ALL_SINGLE_LENGTHS,
  ALL_LASH_CURL_CODES,
  ALL_VOLUME_OPTIONS,
  STANDARD_COLORS,
  type LashDesignOption,
  type LashThicknessOption,
  type LashLengthMappingOption,
  type WingsMenuItemMeta,
  type LashMaterialSpec,
  type LashRotationPointsBreakdown,
  type CustomerTypeMeta,
  type AutoResolvedComboServiceSpec,
  type QuickCheckInComboPreset,
} from './consultation/constraints/constraintTypesAndOptions';

export { getWingsMenuDetail } from './consultation/constraints/wingsMenuLookup';

export {
  DEFAULT_LASH_MATERIAL_CATALOG,
  UNDER_MINK_OPTION_SPEC,
  LASH_MATERIAL_CATALOG,
  MATERIAL_MATRIX_STORAGE_KEY,
  MATERIAL_MATRIX_UPDATED_EVENT,
  loadMaterialCatalog,
  saveMaterialCatalog,
  resetMaterialCatalogToDefault,
  resolveMaterialSpec,
  sanitizeSelectionForMaterial,
} from './consultation/constraints/materialCatalogData';

export {
  isAlwaysFullSetMaterial,
  getCvXoayClassPoints,
  getCvXoayFanPoints,
  getCvXoayLashPoints,
  getCvXoayTypePoints,
  resolveLashSkuPricing,
  formatComboName,
  resolveCustomerTypeMeta,
  resolveDisplayServiceName,
  getLashDesignPoints,
  getLashColorPoints,
  calculateLashPricingAndCvPoints,
  type LashPricingAndCvPointResult,
} from './consultation/constraints/pricingAndCvPoints';

export {
  COMBO_RETAIN_CYCLE_DAYS_LIMIT,
  SINGLE_RETAIN_CYCLE_DAYS_LIMIT,
  RETAIN_CYCLE_DAYS_LIMIT,
  IVYLIGHT_SYSTEM_DB_RETENTION_DAYS,
  IVYLIGHT_SYSTEM_COMBO_REMIND_DAYS,
  getRetainCycleDaysLimit,
  parseDaysSinceLastVisit,
  resolveServiceSpecsFromComboOrHistory,
  detectUnderMinkFromLastVisit,
  UNDER_MINK_PREP_SPEC,
  parseUnderMinkLengthMm,
  stepUnderMinkLength,
  parseUnderMinkCountFibers,
  stepUnderMinkCount,
  resolveQuickCheckInComboPreset,
} from './consultation/constraints/comboAndUnderMinkPresets';
