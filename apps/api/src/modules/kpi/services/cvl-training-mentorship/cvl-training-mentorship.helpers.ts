import {
  CvlTrainingMentorshipConfig,
  CvlTrainingMentorshipOutcome,
  CvlTrainingMentorshipPair,
  DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG,
  validateStrictOneToOneMentorshipPairs,
} from '@mos-lab/shared';

export { validateStrictOneToOneMentorshipPairs };

const VALID_OUTCOMES = new Set<CvlTrainingMentorshipOutcome>(['ACTIVE', 'GRADUATED', 'EXTENDED', 'RETURNED_TO_CV']);

export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const CACHE_TTL_MS = 30_000;
export const RECONCILE_COOLDOWN_MS = 60_000;

let cachedConfig: CvlTrainingMentorshipConfig | null = null;
let cacheTimestamp = 0;
const lastReconciledAtByKey = new Map<string, number>();

export function clearMentorshipCaches(): void {
  cachedConfig = null;
  cacheTimestamp = 0;
  lastReconciledAtByKey.clear();
}

export function clearReconcileCooldown(): void {
  lastReconciledAtByKey.clear();
}

export function getCachedMentorshipConfig(now = Date.now()): CvlTrainingMentorshipConfig | null {
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedConfig;
  }
  return null;
}

export function setCachedMentorshipConfig(config: CvlTrainingMentorshipConfig, now = Date.now()): void {
  cachedConfig = config;
  cacheTimestamp = now;
}

export function getLastReconciledAt(key: string): number {
  return lastReconciledAtByKey.get(key) || 0;
}

export function setLastReconciledAt(key: string, now: number): void {
  lastReconciledAtByKey.set(key, now);
}

export function sanitizeStoreCode(raw?: string | null): string {
  const upper = String(raw || 'DT')
    .trim()
    .toUpperCase();
  if (upper.includes('ESTELLA') || upper === 'EP') return 'EP';
  if (upper.includes('PXL') || upper.includes('PHAN')) return 'PXL';
  return 'DT';
}

export function sanitizeCvlTrainingMentorshipPair(
  raw: Partial<CvlTrainingMentorshipPair>,
  index: number
): CvlTrainingMentorshipPair | null {
  const menteeId = Math.floor(Number(raw.menteeLegacyStaffId || 0));
  const mentorId = Math.floor(Number(raw.mentorLegacyStaffId || 0));
  if (!Number.isInteger(menteeId) || menteeId <= 0) return null;
  if (!Number.isInteger(mentorId) || mentorId <= 0) return null;

  const startDate = String(raw.startDate || '').slice(0, 10);
  const endDate = String(raw.endDate || '').slice(0, 10);
  if (!ISO_DATE_RE.test(startDate) || !ISO_DATE_RE.test(endDate) || startDate > endDate) {
    return null;
  }

  const fixedAllowanceVnd = Math.max(0, Math.round(Number(raw.fixedAllowanceVnd ?? 1_000_000)));
  const rawShare = Number(raw.menteeBonusShareRate ?? 0.5);
  const menteeBonusShareRate = Number.isFinite(rawShare) ? Math.min(2, Math.max(0, rawShare)) : 0.5;
  const rawThreshold = Number(raw.minComboRateThreshold ?? 0.2);
  const minComboRateThreshold = Number.isFinite(rawThreshold) ? Math.min(1, Math.max(0, rawThreshold)) : 0.2;

  const id =
    String(raw.id || '')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '-') || `pair-${menteeId}-${mentorId}-${startDate}-${index}`;

  const rawMentorRole = String(raw.mentorRoleGroup || '').toUpperCase();
  const mentorRoleGroup: CvlTrainingMentorshipPair['mentorRoleGroup'] =
    rawMentorRole === 'CVLL' ? 'CVLL' : rawMentorRole === 'CVL' ? 'CVL' : rawMentorRole === 'CC' ? 'CC' : undefined;
  const rawOutcome = String(raw.outcome || '').toUpperCase() as CvlTrainingMentorshipOutcome;
  const outcome: CvlTrainingMentorshipPair['outcome'] = VALID_OUTCOMES.has(rawOutcome) ? rawOutcome : undefined;

  return {
    id,
    menteeLegacyStaffId: menteeId,
    menteeDisplayName: String(raw.menteeDisplayName || `CVL #${menteeId}`).trim(),
    mentorLegacyStaffId: mentorId,
    mentorDisplayName: String(raw.mentorDisplayName || `Mentor #${mentorId}`).trim(),
    ...(mentorRoleGroup ? { mentorRoleGroup } : {}),
    storeCode: sanitizeStoreCode(raw.storeCode),
    startDate,
    endDate,
    fixedAllowanceVnd,
    menteeBonusShareRate,
    minComboRateThreshold,
    isActive: raw.isActive !== false,
    ...(outcome ? { outcome } : {}),
    ...(raw.resolvedAt ? { resolvedAt: String(raw.resolvedAt) } : {}),
    ...(raw.resolvedBy ? { resolvedBy: String(raw.resolvedBy) } : {}),
    note: raw.note ? String(raw.note).trim() : undefined,
  };
}

export function normalizeCvlTrainingMentorshipConfig(raw: unknown): CvlTrainingMentorshipConfig {
  if (!raw || typeof raw !== 'object') {
    return structuredClone(DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG);
  }
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.pairs)) {
    return structuredClone(DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG);
  }
  const pairs: CvlTrainingMentorshipPair[] = [];
  obj.pairs.forEach((item, idx) => {
    const cleaned = sanitizeCvlTrainingMentorshipPair(item as Partial<CvlTrainingMentorshipPair>, idx);
    if (cleaned) pairs.push(cleaned);
  });
  return {
    pairs,
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : undefined,
    updatedBy: typeof obj.updatedBy === 'string' ? obj.updatedBy : undefined,
  };
}
