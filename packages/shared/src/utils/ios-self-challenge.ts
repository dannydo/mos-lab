import { matchComboCategoryAndVolumeFromBooking } from '../catalog/wings-combo-catalog.js';

export type IosCvLashMaterialKey =
  'classic' | 'mink' | 'volume' | 'hyperlight' | 'ultralight' | 'ivylight' | 'undermink';

export type IosCvServiceMode = 'Normal' | 'Retain';

export interface IosCvHistoricalCaseSample {
  materialKey: IosCvLashMaterialKey;
  mode: IosCvServiceMode;
  fanNum: number;
  countPerEye: number;
  durationMinutes: number;
}

export interface IosCvSelfSpeedHistoryProfile {
  staffId: number;
  samples: IosCvHistoricalCaseSample[];
  overallSpeedRatio?: number;
}

export type IosSelfChallengeTierKey = 'SLOWER_10' | 'AVG_RECENT' | 'FASTER_5' | 'FASTER_10';

export interface IosSelfChallengeOption {
  key: IosSelfChallengeTierKey;
  order: 1 | 2 | 3 | 4;
  label: string;
  badgeText: string;
  minutes: number;
  deltaPercent: number;
}

export interface IosSelfChallengeSelection {
  tierKey: IosSelfChallengeTierKey;
  tierLabel: string;
  baseOptionMinutes: number;
  committedMinutes: number;
  baselineMinutes: number;
  sampleCount: number;
  matchedSetLabel: string;
  slowerReason?: string;
}

export interface IosSlowerReasonValidationResult {
  valid: boolean;
  normalized: string;
  error?: string;
}

export function isSelfChallengeSlowerThanAverage(
  committedMinutes?: number | null,
  baselineMinutes?: number | null
): boolean {
  const committed = Number(committedMinutes || 0);
  const baseline = Number(baselineMinutes || 0);
  return (
    Number.isFinite(committed) && Number.isFinite(baseline) && committed > 0 && baseline > 0 && committed > baseline
  );
}

const VIETNAMESE_VOWEL_RE = /[aeiouyăâêôơưáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/iu;

const NON_REASON_PATTERNS = [
  /^(không biết|ko biết|k biết|chưa biết|không rõ|ko rõ)(\s|$)/iu,
  /^(không có lý do|ko có lý do|không có gì|ko có gì|bình thường)(\s|$)/iu,
  /^(thích thì chọn|chọn đại|điền đại|test|demo|ok|oke|okay|alo)(\s|$)/iu,
  /\b(asdf|qwer|zxcv|hjkl|abc|xyz|blabla|haha|hihi|kaka)\b/iu,
];

export function validateSelfChallengeSlowerReason(reason?: string | null): IosSlowerReasonValidationResult {
  const normalized = String(reason ?? '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return {
      valid: false,
      normalized: '',
      error: 'Vui lòng chia sẻ lý do cần thêm thời gian để hệ thống hỗ trợ bạn tốt hơn.',
    };
  }

  if (normalized.length < 10) {
    return {
      valid: false,
      normalized,
      error: 'Lý do còn quá ngắn — vui lòng mô tả cụ thể hơn (tối thiểu 3 từ rõ nghĩa).',
    };
  }

  if (normalized.length > 500) {
    return {
      valid: false,
      normalized: normalized.slice(0, 500),
      error: 'Lý do tối đa 500 ký tự.',
    };
  }

  if (/(.)\1{3,}/u.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'Vui lòng điền lý do thực tế, không nhập ký tự lặp lại.',
    };
  }

  for (const pattern of NON_REASON_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        valid: false,
        normalized,
        error: 'Vui lòng điền lý do chuyên môn hoặc khó khăn thực tế hợp lý để hệ thống hỗ trợ bạn.',
      };
    }
  }

  const words = normalized.match(/\p{L}+/gu) || [];
  const meaningfulWords = words.filter((w) => w.length >= 2);
  const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
  const vowelWords = words.filter((w) => VIETNAMESE_VOWEL_RE.test(w));

  if (words.length < 3 || meaningfulWords.length < 3 || uniqueWords.size < 3 || vowelWords.length < 2) {
    return {
      valid: false,
      normalized,
      error: 'Vui lòng nêu lý do cụ thể tối thiểu 3 từ rõ nghĩa (VD: Mi cũ keo dày cần vệ sinh kỹ).',
    };
  }

  return {
    valid: true,
    normalized,
  };
}

export interface IosSelfChallengePlan {
  baselineMinutes: number;
  sampleCount: number;
  recentSampleDurations: number[];
  matchedSetLabel: string;
  source: 'exact_3' | 'partial_recent' | 'personal_model_fallback';
  options: [IosSelfChallengeOption, IosSelfChallengeOption, IosSelfChallengeOption, IosSelfChallengeOption];
}

export interface NormalizedBookingTargetLashSet {
  materialKey: IosCvLashMaterialKey;
  mode: IosCvServiceMode;
  fanNum: number;
  countPerEye: number;
  isPureUnderLash: boolean;
  hasUnderMink: boolean;
  underMinkMode: IosCvServiceMode;
  matchedSetLabel: string;
}

function normalizeMathStyleToken(raw?: string | null): string {
  return String(raw || '')
    .replace(/[𝒙𝑿]/gu, 'x')
    .replace(/[ℓ𝓵𝓛]/gu, 'l')
    .toLowerCase()
    .trim();
}

function hasUpperLashKeyword(combined: string): boolean {
  return (
    combined.includes('hyperlight') ||
    combined.includes('hyper light') ||
    combined.includes('hyper_light') ||
    combined.includes('ivylight') ||
    combined.includes('ivy light') ||
    combined.includes('ivy_light') ||
    combined.includes('ultralight') ||
    combined.includes('ultra light') ||
    combined.includes('ultra_light') ||
    combined.includes('classic') ||
    combined.includes('flawless') ||
    (combined.includes('mink') && !combined.includes('under') && !combined.includes('mink-390')) ||
    combined.includes('volume')
  );
}

function tryResolveMaterialKeyFromText(text: string): {
  materialKey: IosCvLashMaterialKey;
  isPureUnderLash: boolean;
} | null {
  const combined = normalizeMathStyleToken(text);
  const mentionsUnder = combined.includes('under') || combined.includes('mi dưới') || combined.includes('mink-390');
  const mentionsUpperNonMink390 =
    combined.includes('hyperlight') ||
    combined.includes('hyper light') ||
    combined.includes('hyper_light') ||
    combined.includes('ivylight') ||
    combined.includes('ivy light') ||
    combined.includes('ivy_light') ||
    combined.includes('ultralight') ||
    combined.includes('ultra light') ||
    combined.includes('ultra_light') ||
    combined.includes('classic') ||
    combined.includes('volume') ||
    (combined.includes('flawless') && !combined.includes('mink-390') && !combined.includes('under'));

  if (mentionsUnder && !mentionsUpperNonMink390) {
    return { materialKey: 'undermink', isPureUnderLash: true };
  }
  if (combined.includes('hyperlight') || combined.includes('hyper light') || combined.includes('hyper_light')) {
    return { materialKey: 'hyperlight', isPureUnderLash: false };
  }
  if (combined.includes('ivylight') || combined.includes('ivy light') || combined.includes('ivy_light')) {
    return { materialKey: 'ivylight', isPureUnderLash: false };
  }
  if (combined.includes('ultralight') || combined.includes('ultra light') || combined.includes('ultra_light')) {
    return { materialKey: 'ultralight', isPureUnderLash: false };
  }
  if (combined.includes('volume')) {
    return { materialKey: 'volume', isPureUnderLash: false };
  }
  if (combined.includes('classic')) {
    return { materialKey: 'classic', isPureUnderLash: false };
  }
  if (combined.includes('flawless') || combined.includes('mink')) {
    return { materialKey: 'mink', isPureUnderLash: false };
  }
  if (mentionsUnder) {
    return { materialKey: 'undermink', isPureUnderLash: true };
  }
  return null;
}

function resolveMaterialKeyFromText(text: string): {
  materialKey: IosCvLashMaterialKey;
  isPureUnderLash: boolean;
} {
  return tryResolveMaterialKeyFromText(text) ?? { materialKey: 'mink', isPureUnderLash: false };
}

function defaultFanNumForMaterial(materialKey: IosCvLashMaterialKey): number {
  if (materialKey === 'classic' || materialKey === 'mink' || materialKey === 'undermink') return 1;
  if (materialKey === 'volume') return 3;
  return 4;
}

function parseFanNum(
  materialKey: IosCvLashMaterialKey,
  explicitVolume?: string | null,
  fallbackText?: string | null
): number {
  if (materialKey === 'classic' || materialKey === 'mink' || materialKey === 'undermink') {
    return 1;
  }
  const volNorm = normalizeMathStyleToken(explicitVolume);
  const directMatch = volNorm.match(/(\d+)\s*[dxl]/i) || volNorm.match(/^(\d+)$/);
  if (directMatch) {
    const num = Number(directMatch[1]);
    if (num >= 1 && num <= 8) return num;
  }
  const textNorm = normalizeMathStyleToken(fallbackText);
  const textMatch = textNorm.match(/\b([2-6])\s*[dxl]\b/i);
  if (textMatch) {
    const num = Number(textMatch[1]);
    if (num >= 1 && num <= 8) return num;
  }
  return defaultFanNumForMaterial(materialKey);
}

function formatMaterialDisplayName(materialKey: IosCvLashMaterialKey, fanNum: number): string {
  switch (materialKey) {
    case 'classic':
      return 'Classic 1D';
    case 'mink':
      return 'Flawless Mink 1D';
    case 'volume':
      return `Volume ${fanNum}D`;
    case 'hyperlight':
      return `HyperLight ${fanNum}X`;
    case 'ultralight':
      return `UltraLight ${fanNum}D`;
    case 'ivylight':
      return `IvyLight ${fanNum}L`;
    case 'undermink':
      return 'Mi Dưới 1D';
  }
}

function formatCountUnit(materialKey: IosCvLashMaterialKey): string {
  if (materialKey === 'classic' || materialKey === 'mink' || materialKey === 'undermink') return 'sợi';
  if (materialKey === 'ivylight') return 'nhịp';
  return 'fan';
}

function resolveCountPerEye(params: {
  materialKey: IosCvLashMaterialKey;
  explicitCount?: string | number | null;
  serviceKey?: string | null;
  serviceName?: string | null;
  volume?: string | null;
  totalLashesCountRequired?: number | null;
}): number {
  const { materialKey, explicitCount, serviceKey, serviceName, volume, totalLashesCountRequired } = params;
  if (materialKey === 'undermink') {
    const rawCount = parseInt(String(explicitCount || '').replace(/\D+/g, ''), 10);
    if (Number.isFinite(rawCount) && rawCount >= 15 && rawCount <= 60) return rawCount;
    return 30;
  }

  const rawExplicit = parseInt(String(explicitCount || '').replace(/\D+/g, ''), 10);
  if (Number.isFinite(rawExplicit) && rawExplicit >= 20 && rawExplicit <= 160) {
    return rawExplicit;
  }

  const combinedText = `${serviceKey || ''} ${serviceName || ''}`.trim();
  if (combinedText) {
    const matched = matchComboCategoryAndVolumeFromBooking({
      material: materialKey === 'mink' ? 'Flawless Mink' : materialKey,
      serviceKey: serviceKey || undefined,
      serviceName: serviceName || undefined,
      volume: volume || undefined,
    });
    if (matched.volume !== 'under' && matched.volumeMeta?.countPerEye) {
      return matched.volumeMeta.countPerEye;
    }
  }

  const requiredBothEyes = Number(totalLashesCountRequired || 0);
  if (requiredBothEyes >= 60 && requiredBothEyes <= 320 && (materialKey === 'classic' || materialKey === 'mink')) {
    return Math.round(requiredBothEyes / 2);
  }

  return 60;
}

export function normalizeHistoricalOrderRowToSample(row: {
  serviceKey?: string | null;
  serviceName?: string | null;
  serviceType?: string | null;
  attributeVolume?: string | null;
  totalLashesCountRequired?: number | null;
  explicitCountPerEye?: number | string | null;
  isTemporary?: number | null;
  preparationMinute?: number | null;
  preServicingMinute?: number | null;
  cleaningMinute?: number | null;
  servicingMinute?: number | null;
  durationMinutes?: number | null;
}): IosCvHistoricalCaseSample | null {
  if (Number(row.isTemporary) === 1) return null;

  const svcKey = String(row.serviceKey || '').toLowerCase();
  const svcName = String(row.serviceName || '').toLowerCase();
  const combined = `${svcKey} ${svcName}`;
  if (
    !combined.trim() ||
    combined.includes('any') ||
    combined.includes('remove') ||
    combined.includes('tháo') ||
    combined.includes('lash-lift') ||
    combined.includes('lash lift') ||
    combined.includes('uốn mi')
  ) {
    return null;
  }

  const totalMin =
    row.durationMinutes !== undefined && row.durationMinutes !== null
      ? Number(row.durationMinutes)
      : Number(row.preparationMinute || 0) +
        Number(row.preServicingMinute || 0) +
        Number(row.cleaningMinute || 0) +
        Number(row.servicingMinute || 0);

  if (!Number.isFinite(totalMin) || totalMin <= 15 || totalMin >= 200) {
    return null;
  }

  const sTypeLower = String(row.serviceType || '').toLowerCase();
  const mode: IosCvServiceMode =
    sTypeLower === 'retain' ||
    svcKey.includes('retain') ||
    svcKey.includes('refill') ||
    svcName.includes('dặm') ||
    svcName.includes('refill')
      ? 'Retain'
      : 'Normal';

  // Lưu ý: luôn kiểm tra Under Mink TRƯỚC Flawless/Mink vì service_key legacy là 'new-flawless.mink-390'
  const { materialKey } = resolveMaterialKeyFromText(combined);
  const fanNum = parseFanNum(materialKey, row.attributeVolume, combined);
  const countPerEye = resolveCountPerEye({
    materialKey,
    explicitCount: row.explicitCountPerEye,
    serviceKey: row.serviceKey,
    serviceName: row.serviceName,
    volume: row.attributeVolume,
    totalLashesCountRequired: row.totalLashesCountRequired,
  });

  return {
    materialKey,
    mode,
    fanNum,
    countPerEye,
    durationMinutes: Math.round(totalMin),
  };
}

export function normalizeBookingTargetLashSet(booking: {
  serviceName?: string;
  serviceType?: string;
  serviceKey?: string;
  comboLiveStatus?: { isComboLive?: boolean; comboName?: string; serviceKey?: string };
  attributes?: {
    material?: string;
    volume?: string;
    count?: string;
    hasUnderMink?: boolean;
    underMinkServiceType?: 'Normal' | 'Retain';
    overrideReason?: string;
    serviceType?: string;
    isRefill?: boolean;
  };
}): NormalizedBookingTargetLashSet {
  const attrs = booking.attributes || {};
  const explicitMaterial = String(attrs.material || '').trim();
  const serviceText = [
    explicitMaterial,
    booking.serviceName || '',
    booking.serviceKey || '',
    booking.comboLiveStatus?.comboName || '',
  ]
    .filter((s) => !s.toLowerCase().includes('any'))
    .join(' ');

  const resolvedFromExplicit = explicitMaterial ? tryResolveMaterialKeyFromText(explicitMaterial) : null;
  const resolvedFromAll = resolveMaterialKeyFromText(serviceText);
  const materialKey = resolvedFromExplicit?.materialKey || resolvedFromAll.materialKey;

  const isPureUnderLash = materialKey === 'undermink' && !hasUpperLashKeyword(normalizeMathStyleToken(serviceText));

  const overrideReasonLower = String(attrs.overrideReason || '').toLowerCase();
  const isComboNewFullSet =
    Boolean(booking.comboLiveStatus?.isComboLive) &&
    (booking.serviceType === 'Normal' ||
      overrideReasonLower.includes('gỡ toàn bộ') ||
      overrideReasonLower.includes('nối mới combo'));

  const sTypeLower = String(booking.serviceType || attrs.serviceType || '').toLowerCase();
  const svcTextLower = String(booking.serviceName || booking.serviceKey || '').toLowerCase();

  let mode: IosCvServiceMode = 'Normal';
  if (!isComboNewFullSet && sTypeLower !== 'normal' && sTypeLower !== 'new') {
    if (
      sTypeLower === 'retain' ||
      attrs.isRefill === true ||
      svcTextLower.includes('dặm') ||
      svcTextLower.includes('dam') ||
      svcTextLower.includes('retain') ||
      svcTextLower.includes('refill')
    ) {
      mode = 'Retain';
    }
  }

  const fanNum = parseFanNum(materialKey, attrs.volume, serviceText);
  const countPerEye = resolveCountPerEye({
    materialKey,
    explicitCount: attrs.count,
    serviceKey: booking.serviceKey,
    serviceName: booking.serviceName,
    volume: attrs.volume,
  });

  const hasUnderMink = Boolean(attrs.hasUnderMink) && !isPureUnderLash;
  const underMinkMode: IosCvServiceMode = attrs.underMinkServiceType === 'Retain' ? 'Retain' : 'Normal';

  const modePrefix = mode === 'Retain' ? 'Dặm ' : '';
  const unit = formatCountUnit(materialKey);
  const baseLabel = `${modePrefix}${formatMaterialDisplayName(materialKey, fanNum)} · ${countPerEye} ${unit}`;
  const matchedSetLabel = hasUnderMink ? `${baseLabel} + Mi Dưới` : baseLabel;

  return {
    materialKey,
    mode,
    fanNum,
    countPerEye,
    isPureUnderLash,
    hasUnderMink,
    underMinkMode,
    matchedSetLabel,
  };
}

export function computeCvSelfChallengePlan(params: {
  booking: Parameters<typeof normalizeBookingTargetLashSet>[0];
  historyProfile?: IosCvSelfSpeedHistoryProfile | null;
  fallbackSuggestedMinutes: number;
}): IosSelfChallengePlan {
  const { booking, historyProfile, fallbackSuggestedMinutes } = params;
  const target = normalizeBookingTargetLashSet(booking);
  const samples = historyProfile?.samples || [];

  // Ưu tiên 1: Khớp chặt Material + Mode + Fan + Count
  const strictMatches: IosCvHistoricalCaseSample[] = [];
  const relaxedFanMatches: IosCvHistoricalCaseSample[] = [];

  for (const s of samples) {
    if (s.materialKey !== target.materialKey) continue;
    if (s.mode !== target.mode) continue;
    if (s.countPerEye !== target.countPerEye) continue;

    if (s.fanNum === target.fanNum) {
      if (strictMatches.length < 3) strictMatches.push(s);
    } else if (relaxedFanMatches.length < 3) {
      relaxedFanMatches.push(s);
    }
  }

  const pickedSamples = [...strictMatches];
  if (pickedSamples.length < 3) {
    for (const s of relaxedFanMatches) {
      if (pickedSamples.length >= 3) break;
      pickedSamples.push(s);
    }
  }

  const sampleCount = pickedSamples.length;
  const recentSampleDurations = pickedSamples.map((s) => Math.round(s.durationMinutes));

  let upperBaseline: number;
  let source: IosSelfChallengePlan['source'];
  let level2Label: string;

  if (sampleCount > 0) {
    const sum = recentSampleDurations.reduce((acc, v) => acc + v, 0);
    upperBaseline = Math.round(sum / sampleCount);
    source = sampleCount >= 3 ? 'exact_3' : 'partial_recent';
    level2Label = sampleCount >= 3 ? '3 lần TB vừa rồi' : sampleCount === 2 ? '2 lần TB vừa rồi' : 'Lần gần nhất';
  } else {
    const rawRatio = Number(historyProfile?.overallSpeedRatio ?? 1.0);
    const clampedRatio = Number.isFinite(rawRatio) && rawRatio > 0 ? Math.max(0.75, Math.min(1.25, rawRatio)) : 1.0;
    const rawFallback = Math.max(20, Number(fallbackSuggestedMinutes) || 60);
    // Nếu fallbackSuggestedMinutes đã cộng +25p mi dưới từ Screen06, tách phần upper trước để cộng mi dưới theo tốc độ CV
    const baseWithoutUnder = target.hasUnderMink ? Math.max(20, rawFallback - 25) : rawFallback;
    upperBaseline = Math.round(baseWithoutUnder * clampedRatio);
    source = 'personal_model_fallback';
    level2Label = 'Mốc chuẩn cá nhân';
  }

  let underMinkAddMinutes = 0;
  if (target.hasUnderMink && !target.isPureUnderLash) {
    const underExact = samples
      .filter((s) => s.materialKey === 'undermink' && s.mode === target.underMinkMode)
      .slice(0, 3);
    const underFallback =
      underExact.length > 0 ? underExact : samples.filter((s) => s.materialKey === 'undermink').slice(0, 3);
    if (underFallback.length > 0) {
      const underSum = underFallback.reduce((acc, s) => acc + s.durationMinutes, 0);
      underMinkAddMinutes = Math.round(underSum / underFallback.length);
    } else {
      underMinkAddMinutes = target.underMinkMode === 'Retain' ? 20 : 25;
    }
  }

  const baselineMinutes = Math.max(16, Math.min(175, upperBaseline + underMinkAddMinutes));

  const min1 = Math.max(baselineMinutes + 1, Math.min(198, Math.round(baselineMinutes * 1.1)));
  const min2 = baselineMinutes;
  const min3 = Math.max(15, Math.min(baselineMinutes - 1, Math.round(baselineMinutes * 0.95)));
  const min4 = Math.max(14, Math.min(min3 - 1, Math.round(baselineMinutes * 0.9)));

  return {
    baselineMinutes,
    sampleCount,
    recentSampleDurations,
    matchedSetLabel: target.matchedSetLabel,
    source,
    options: [
      {
        key: 'SLOWER_10',
        order: 1,
        label: 'Chậm hơn 10%',
        badgeText: '+10%',
        minutes: min1,
        deltaPercent: 10,
      },
      {
        key: 'AVG_RECENT',
        order: 2,
        label: level2Label,
        badgeText: sampleCount > 0 ? `TB ${sampleCount} ca` : 'Chuẩn CV',
        minutes: min2,
        deltaPercent: 0,
      },
      {
        key: 'FASTER_5',
        order: 3,
        label: 'Nhanh hơn 5%',
        badgeText: '-5%',
        minutes: min3,
        deltaPercent: -5,
      },
      {
        key: 'FASTER_10',
        order: 4,
        label: 'Nhanh hơn 10%',
        badgeText: '-10%',
        minutes: min4,
        deltaPercent: -10,
      },
    ],
  };
}
