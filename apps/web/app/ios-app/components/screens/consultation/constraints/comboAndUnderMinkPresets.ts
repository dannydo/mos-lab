import type {
  AutoResolvedComboServiceSpec,
  LashMaterialSpec,
  QuickCheckInComboPreset,
} from './constraintTypesAndOptions';
import { DEFAULT_LASH_MATERIAL_CATALOG, resolveMaterialSpec } from './materialCatalogData';
import { isAlwaysFullSetMaterial } from './pricingAndCvPoints';

// ============================================================================
// QUY TẮC TỰ ĐỘNG CHỌN DỊCH VỤ: COMBO (25 NGÀY) vs SINGLE (21 NGÀY VÔ ĐIỀU KIỆN)
// ============================================================================

export const COMBO_RETAIN_CYCLE_DAYS_LIMIT = 25;
export const SINGLE_RETAIN_CYCLE_DAYS_LIMIT = 21;
export const RETAIN_CYCLE_DAYS_LIMIT = COMBO_RETAIN_CYCLE_DAYS_LIMIT;
export const IVYLIGHT_SYSTEM_DB_RETENTION_DAYS = 25;
export const IVYLIGHT_SYSTEM_COMBO_REMIND_DAYS = 14;

export function getRetainCycleDaysLimit(isComboLive?: boolean): number {
  return isComboLive ? COMBO_RETAIN_CYCLE_DAYS_LIMIT : SINGLE_RETAIN_CYCLE_DAYS_LIMIT;
}

/**
 * Tính số ngày kể từ lần ghé thăm gần nhất (hỗ trợ định dạng DD/MM/YYYY hoặc YYYY-MM-DD)
 */
export function parseDaysSinceLastVisit(
  lastVisitDateStr?: string,
  referenceDateStr: string = '03/11/2026'
): number | null {
  if (!lastVisitDateStr || !lastVisitDateStr.trim()) return null;

  const parseDate = (s: string): Date | null => {
    const clean = s.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
      const [dd, mm, yyyy] = clean.split('/').map(Number);
      return new Date(yyyy, mm - 1, dd, 12, 0, 0);
    }
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  };

  const lastDate = parseDate(lastVisitDateStr);
  if (!lastDate) return null;

  const refDate = parseDate(referenceDateStr) || new Date(2026, 10, 3, 12, 0, 0);
  const diffMs = refDate.getTime() - lastDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Tự động bóc tách Chất liệu, Kỹ thuật Volume và Số sợi/fan từ tên Gói Combo hoặc Mã dịch vụ đã mua
 */
export function resolveServiceSpecsFromComboOrHistory(
  rawText?: string,
  catalog: LashMaterialSpec[] = DEFAULT_LASH_MATERIAL_CATALOG
): AutoResolvedComboServiceSpec | null {
  if (!rawText || !rawText.trim()) return null;
  const s = rawText.toLowerCase();

  const mat = resolveMaterialSpec(rawText, catalog);
  const priceMatch = s.match(/\b(390|440|550|660|770|880|990|1110|1220|1330|1440|1550|1770|2110)\b/);
  const kPrice = priceMatch ? Number(priceMatch[1]) : undefined;

  let volume = mat.defaultVolume;
  let count = mat.defaultCount;

  if (mat.code === 'FLAWLESS_MINK') {
    volume = '1D';
    if (kPrice === 770 || s.includes('60 sợi')) count = '60 sợi';
    else if (kPrice === 880 || s.includes('70 sợi')) count = '70 sợi';
    else if (kPrice === 1110 || s.includes('90 sợi')) count = '90 sợi';
    else if (kPrice === 1440 || s.includes('110 sợi')) count = '110 sợi';
    else if (kPrice === 1770 || s.includes('130 sợi')) count = '130 sợi';
    else count = '70 sợi';
  } else if (mat.code === 'IVYLIGHT') {
    if (s.includes('3l')) volume = '3L';
    else if (s.includes('5l')) volume = '5L';
    else volume = '4L';

    if (volume === '3L') {
      if (kPrice === 770) count = '70 sợi';
      else if (kPrice === 880) count = '90 sợi';
      else if (kPrice === 990) count = '110 sợi';
      else if (kPrice === 1330) count = '130 sợi';
      else count = '90 sợi';
    } else if (volume === '5L') {
      if (kPrice === 1110) count = '70 sợi';
      else if (kPrice === 1440) count = '90 sợi';
      else if (kPrice === 1770) count = '110 sợi';
      else if (kPrice === 2110) count = '130 sợi';
      else count = '90 sợi';
    } else {
      if (kPrice === 990) count = '70 sợi';
      else if (kPrice === 1220) count = '90 sợi';
      else if (kPrice === 1440) count = '110 sợi';
      else if (kPrice === 1770) count = '130 sợi';
      else count = '90 sợi';
    }
  } else if (mat.code === 'HYPERLIGHT') {
    if (s.includes('2x')) volume = '2X';
    else if (s.includes('3x')) volume = '3X';
    else if (s.includes('5x')) volume = '5X';
    else volume = '4X';

    if (kPrice === 440) {
      volume = '2X';
      count = '50 fan';
    } else if (kPrice === 550) {
      volume = '3X';
      count = '50 fan';
    } else if (kPrice === 660) {
      if (s.includes('4x')) {
        volume = '4X';
        count = '50 fan';
      } else {
        volume = '3X';
        count = '70 fan';
      }
    } else if (kPrice === 770) {
      volume = '4X';
      count = '70 fan';
    } else if (kPrice === 880) {
      volume = '4X';
      count = '90 fan';
    } else if (kPrice === 990) {
      volume = '4X';
      count = '110 fan';
    } else if (kPrice === 1220) {
      volume = '5X';
      count = '90 fan';
    } else if (kPrice === 1330) {
      volume = '4X';
      count = '130 fan';
    } else if (kPrice === 1440) {
      volume = '5X';
      count = '110 fan';
    } else if (kPrice === 1770) {
      volume = '5X';
      count = '130 fan';
    }
  } else if (mat.code === 'ULTRALIGHT') {
    if (s.includes('3d')) volume = '3D';
    else if (s.includes('5d')) volume = '5D';
    else volume = '4D';

    if (kPrice === 550) {
      volume = '3D';
      count = '60 fan';
    } else if (kPrice === 660) {
      volume = '4D';
      count = '60 fan';
    } else if (kPrice === 770) {
      volume = '4D';
      count = '80 fan';
    } else if (kPrice === 880) {
      volume = '4D';
      count = '100 fan';
    } else if (kPrice === 990) {
      volume = '5D';
      count = '80 fan';
    } else if (kPrice === 1110) {
      volume = '4D';
      count = '120 fan';
    } else if (kPrice === 1220) {
      volume = '5D';
      count = '100 fan';
    } else if (kPrice === 1550) {
      volume = '5D';
      count = '120 fan';
    }
  } else if (mat.code === 'NEW_VOLUME') {
    volume = '2D';
    if (kPrice === 390) count = '50 fan';
    else if (kPrice === 440) count = '60 fan';
    else if (kPrice === 550) count = '80 fan';
    else if (kPrice === 660) count = '100 fan';
    else if (kPrice === 880) count = '120 fan';
    else count = '80 fan';
  } else if (mat.code === 'NEW_CLASSIC') {
    volume = '1D';
    const explicitClassicCount = s.match(/\b(60|70|90|110|130)\s*sợi\b/);
    const refillMatch = s.match(/\b(250|280|340|530)k?\b/);
    const refillCode = refillMatch ? Number(refillMatch[1]) : undefined;
    if (explicitClassicCount) count = `${explicitClassicCount[1]} sợi`;
    else if (kPrice === 390 || refillCode === 250) count = '60 sợi';
    else if (kPrice === 440 || refillCode === 280) count = '70 sợi';
    else if (kPrice === 550 || refillCode === 340) count = '90 sợi';
    else if (kPrice === 660) count = '110 sợi';
    else if (kPrice === 880 || refillCode === 530) count = '130 sợi';
    else count = '90 sợi';
  }

  return {
    materialId: mat.id,
    materialCode: mat.code,
    materialShortLabel: mat.shortLabel,
    volume,
    count,
    matchedKPrice: kPrice,
  };
}

/**
 * Kiểm tra xem lần ghé gần nhất của khách trong `lashHistory` có làm kèm Mi Dưới (Under Mink) không
 */
export function detectUnderMinkFromLastVisit(
  lashHistory?: Array<{ date: string; serviceName: string; staffName?: string }>,
  explicitFlag?: boolean
): boolean {
  if (typeof explicitFlag === 'boolean') return explicitFlag;
  if (!Array.isArray(lashHistory) || lashHistory.length === 0) return false;
  const latestDate = lashHistory[0]?.date;
  return lashHistory.some((h) => {
    if (latestDate && h.date !== latestDate) return false;
    const s = String(h.serviceName || '').toLowerCase();
    return s.includes('under') || s.includes('mi dưới');
  });
}

export const UNDER_MINK_PREP_SPEC = {
  materialName: 'Flawless Under Mink (1D)',
  shortLabel: 'Mi Dưới (Under Mink)',
  fixedThickness: '0.10 mm',
  allowedCurls: ['B', 'C'] as const,
  defaultCurl: 'B',
  allowedLengths: ['5 mm', '6 mm', '7 mm', '8 mm', '9 mm', '10 mm'] as const,
  defaultLength: '7 mm',
  defaultLengthMm: 7,
  minLengthMm: 5,
  maxLengthMm: 10,
  lengthStepMm: 1,
  allowedCounts: ['10 sợi', '20 sợi', '30 sợi', '40 sợi', '50 sợi', '60 sợi'] as const,
  defaultCount: '30 sợi',
  defaultCountFibers: 30,
  minCountFibers: 10,
  maxCountFibers: 60,
  countStepFibers: 10,
  maxFibersRule: '≤ 60 sợi',
  durationMin: 30,
  newPrice: 390000,
  retainPrice: 250000,
};

export function parseUnderMinkLengthMm(val?: string | number | null): number {
  if (typeof val === 'number' && Number.isFinite(val)) {
    return Math.min(UNDER_MINK_PREP_SPEC.maxLengthMm, Math.max(UNDER_MINK_PREP_SPEC.minLengthMm, Math.round(val)));
  }
  const str = String(val || '').trim();
  if (!str) return UNDER_MINK_PREP_SPEC.defaultLengthMm;
  const matches = str.match(/\d+/g);
  if (!matches || matches.length === 0) return UNDER_MINK_PREP_SPEC.defaultLengthMm;
  const num = Number(matches[matches.length - 1]);
  if (!Number.isFinite(num)) return UNDER_MINK_PREP_SPEC.defaultLengthMm;
  return Math.min(UNDER_MINK_PREP_SPEC.maxLengthMm, Math.max(UNDER_MINK_PREP_SPEC.minLengthMm, num));
}

export function stepUnderMinkLength(currentStr?: string, delta: number = 1): string {
  const currentMm = parseUnderMinkLengthMm(currentStr);
  const nextMm = Math.min(
    UNDER_MINK_PREP_SPEC.maxLengthMm,
    Math.max(UNDER_MINK_PREP_SPEC.minLengthMm, currentMm + delta)
  );
  return `${nextMm} mm`;
}

export function parseUnderMinkCountFibers(val?: string | number | null): number {
  if (typeof val === 'number' && Number.isFinite(val)) {
    const rounded = Math.round(val / 10) * 10;
    return Math.min(UNDER_MINK_PREP_SPEC.maxCountFibers, Math.max(UNDER_MINK_PREP_SPEC.minCountFibers, rounded));
  }
  const str = String(val || '').trim();
  if (!str) return UNDER_MINK_PREP_SPEC.defaultCountFibers;
  const match = str.match(/\d+/);
  if (!match) return UNDER_MINK_PREP_SPEC.defaultCountFibers;
  const num = Math.round(Number(match[0]) / 10) * 10;
  if (!Number.isFinite(num)) return UNDER_MINK_PREP_SPEC.defaultCountFibers;
  return Math.min(UNDER_MINK_PREP_SPEC.maxCountFibers, Math.max(UNDER_MINK_PREP_SPEC.minCountFibers, num));
}

export function stepUnderMinkCount(currentStr?: string, delta: number = 10): string {
  const currentFibers = parseUnderMinkCountFibers(currentStr);
  const nextFibers = Math.min(
    UNDER_MINK_PREP_SPEC.maxCountFibers,
    Math.max(UNDER_MINK_PREP_SPEC.minCountFibers, currentFibers + delta)
  );
  return `${nextFibers} sợi`;
}

/**
 * Tổng hợp toàn bộ thông số Quick Check-in cho khách có Gói Combo (hoặc khách cũ giữ nguyên form lần trước)
 */
export function resolveQuickCheckInComboPreset(
  booking: {
    serviceName?: string;
    comboLiveStatus?: {
      isComboLive?: boolean;
      remainingSessions?: number;
      normalRemaining?: number;
      retainRemaining?: number;
      comboName?: string;
      serviceKey?: string;
      retainDaysLimit?: number;
    };
    underMinkComboStatus?: {
      hasUnderCombo?: boolean;
      remainingSessions?: number;
      normalRemaining?: number;
      retainRemaining?: number;
      comboName?: string;
    };
    lashHistory?: Array<{ date: string; serviceName: string; staffName?: string }>;
    attributes?: {
      style?: string;
      curl?: string;
      length?: string;
      thickness?: string;
      material?: string;
      color?: string;
      volume?: string;
      count?: string;
      hasUnderMink?: boolean;
      underMinkServiceType?: 'Normal' | 'Retain';
      underMinkCurl?: string;
      underMinkThickness?: string;
      underMinkLength?: string;
      underMinkCount?: string;
    };
  },
  catalog: LashMaterialSpec[] = DEFAULT_LASH_MATERIAL_CATALOG
): QuickCheckInComboPreset {
  const isComboLive = Boolean(booking?.comboLiveStatus?.isComboLive);
  const historyUpperEntry = (booking?.lashHistory || []).find((h) => {
    const s = String(h.serviceName || '').toLowerCase();
    return !s.includes('under') && !s.includes('mi dưới');
  });

  const sourceText = isComboLive
    ? booking?.comboLiveStatus?.serviceKey ||
      booking?.comboLiveStatus?.comboName ||
      historyUpperEntry?.serviceName ||
      booking?.serviceName
    : booking?.attributes?.material || historyUpperEntry?.serviceName || booking?.serviceName;

  const resolved = resolveServiceSpecsFromComboOrHistory(sourceText || 'New Flawless Mink 880', catalog) || {
    materialId: 'New Flawless Mink',
    materialCode: 'FLAWLESS_MINK',
    materialShortLabel: 'Flawless Mink',
    volume: '1D',
    count: '70 sợi',
  };

  const mat = resolveMaterialSpec(resolved.materialId, catalog);
  const hasHistoryOrCombo = isComboLive || Boolean(historyUpperEntry);

  const rawVolume =
    (hasHistoryOrCombo
      ? resolved.volume || booking?.attributes?.volume
      : booking?.attributes?.volume || resolved.volume) || mat.defaultVolume;
  const volume = mat.allowedVolumes.includes(rawVolume)
    ? rawVolume
    : resolved.volume && mat.allowedVolumes.includes(resolved.volume)
      ? resolved.volume
      : mat.defaultVolume;

  const rawCount =
    (hasHistoryOrCombo ? resolved.count || booking?.attributes?.count : booking?.attributes?.count || resolved.count) ||
    mat.defaultCount;
  const count = mat.allowedCounts.includes(rawCount)
    ? rawCount
    : resolved.count && mat.allowedCounts.includes(resolved.count)
      ? resolved.count
      : mat.defaultCount;

  const rawStyle = booking?.attributes?.style || mat.defaultDesign;
  const style = mat.allowedDesigns.includes(rawStyle) ? rawStyle : mat.defaultDesign;

  const rawCurl = booking?.attributes?.curl || mat.defaultCurl;
  const curl = mat.allowedCurls.includes(rawCurl) ? rawCurl : mat.defaultCurl;

  const rawThick = booking?.attributes?.thickness || mat.defaultThickness;
  const thickness = mat.allowedThicknesses.includes(rawThick) ? rawThick : mat.defaultThickness;

  const validLengths = [...mat.allowedLengthMappings.map((m) => m.id), ...mat.allowedSingleLengths];
  const rawLength = booking?.attributes?.length || mat.defaultLength;
  const length = validLengths.includes(rawLength) ? rawLength : mat.defaultLength;

  const color = booking?.attributes?.color || 'Đen Tuyền (Jet Black)';
  const hasUnderMinkCombo = Boolean(
    booking?.underMinkComboStatus?.hasUnderCombo && Number(booking?.underMinkComboStatus?.remainingSessions ?? 0) > 0
  );
  const underComboRemaining = Number(booking?.underMinkComboStatus?.remainingSessions ?? 0);
  const underComboNormalRemaining = Number(booking?.underMinkComboStatus?.normalRemaining ?? 0);
  const underComboRetainRemaining = Number(booking?.underMinkComboStatus?.retainRemaining ?? 0);
  const underComboName = booking?.underMinkComboStatus?.comboName || 'Combo Mi Dưới';

  const hasUnderMink =
    detectUnderMinkFromLastVisit(booking?.lashHistory, booking?.attributes?.hasUnderMink) || hasUnderMinkCombo;
  const underMinkCurl = booking?.attributes?.underMinkCurl || UNDER_MINK_PREP_SPEC.defaultCurl;
  const underMinkThickness = booking?.attributes?.underMinkThickness || UNDER_MINK_PREP_SPEC.fixedThickness;
  const underMinkLength = `${parseUnderMinkLengthMm(booking?.attributes?.underMinkLength)} mm`;
  const underMinkCount = `${parseUnderMinkCountFibers(booking?.attributes?.underMinkCount)} sợi`;

  const lastVisitDate = booking?.lashHistory?.[0]?.date || null;
  const daysSinceLastVisit = parseDaysSinceLastVisit(lastVisitDate || undefined);
  const retainDaysLimit = getRetainCycleDaysLimit(isComboLive);
  const isWithinRetainWindow = daysSinceLastVisit !== null && daysSinceLastVisit <= retainDaysLimit;
  const isAlwaysFullSet = isAlwaysFullSetMaterial(mat.code || mat.id);

  const remainingSessions = Number(booking?.comboLiveStatus?.remainingSessions ?? 0);
  const hasExplicitCounts =
    booking?.comboLiveStatus?.normalRemaining !== undefined || booking?.comboLiveStatus?.retainRemaining !== undefined;

  const normalRemaining = isComboLive
    ? hasExplicitCounts
      ? Number(booking?.comboLiveStatus?.normalRemaining ?? 0)
      : isAlwaysFullSet
        ? remainingSessions
        : Math.max(1, Math.floor(remainingSessions / 2))
    : 0;

  const retainRemaining = isComboLive
    ? hasExplicitCounts
      ? Number(booking?.comboLiveStatus?.retainRemaining ?? 0)
      : isAlwaysFullSet
        ? 0
        : Math.max(0, remainingSessions - normalRemaining)
    : 0;

  const hasNormalRemaining = normalRemaining > 0;
  const hasRetainRemaining = hasExplicitCounts
    ? retainRemaining > 0
    : isAlwaysFullSet
      ? remainingSessions > 0
      : retainRemaining > 0;

  const expectedServiceType: 'Normal' | 'Retain' = isWithinRetainWindow
    ? isComboLive && !hasRetainRemaining && hasNormalRemaining
      ? 'Normal'
      : 'Retain'
    : 'Normal';

  const underMinkServiceType: 'Normal' | 'Retain' =
    booking?.attributes?.underMinkServiceType ||
    (hasUnderMinkCombo
      ? isWithinRetainWindow && underComboRetainRemaining > 0
        ? 'Retain'
        : underComboNormalRemaining > 0
          ? 'Normal'
          : 'Retain'
      : hasUnderMink && isWithinRetainWindow
        ? 'Retain'
        : 'Normal');

  return {
    materialSpec: mat,
    materialId: mat.id,
    materialShortLabel: mat.shortLabel,
    volume,
    count,
    style,
    curl,
    thickness,
    length,
    color,
    hasUnderMink,
    underMinkServiceType,
    underMinkCurl,
    underMinkThickness,
    underMinkLength,
    underMinkCount,
    hasUnderMinkCombo,
    underComboRemaining,
    underComboNormalRemaining,
    underComboRetainRemaining,
    underComboName,
    lastVisitDate,
    daysSinceLastVisit,
    retainDaysLimit,
    isWithinRetainWindow,
    expectedServiceType,
    isAlwaysFullSet,
    remainingSessions,
    normalRemaining,
    retainRemaining,
    hasNormalRemaining,
    hasRetainRemaining,
  };
}
