import { createHash } from 'node:crypto';
import mysql from 'mysql2/promise';
import { IosBookingProgress, IosServicingRound, resolveActiveServicingRound, SafeAny } from '@mos-lab/shared';
import { getLegacyPool } from './db-pools.js';
import { DEMO_BOOKING_IDS, LegacyPhpEndpointCaller } from './ios-legacy-bridge.service.js';
import { BookingOverrideRecord } from './ios-overrides.service.js';
import { extractRawBase64ForLegacyPhp, persistProgressPhotoToCloud } from './ios-photos.service.js';
import {
  attachLashHistoryProgressPhotos,
  fetchLegacyProgressHydrationByOrderIds,
  isUnderMinkServiceRow,
  mergeHydratedBookingProgress,
} from './ios-progress-hydration.helper.js';

export { attachLashHistoryProgressPhotos, fetchLegacyProgressHydrationByOrderIds, mergeHydratedBookingProgress };

const ROUND_PHOTO_FIELDS: ReadonlyArray<{ field: keyof IosBookingProgress; type: string }> = [
  { field: 'beforePhotoUrl', type: 'before' },
  { field: 'cleanedPhotoUrl', type: 'cleaned' },
  { field: 'afterPhotoUrl', type: 'after' },
  { field: 'underBeforePhotoUrl', type: 'under_before' },
  { field: 'underCleanedPhotoUrl', type: 'under_cleaned' },
  { field: 'underAfterPhotoUrl', type: 'under_after' },
];

export interface RoundOrderServiceIds {
  upperOsId: number | null;
  underOsId: number | null;
  underServiceId: number | null;
}

export interface SyncServicingRoundsParams {
  bookingId: number;
  action: string;
  mappedState: string | null;
  mergedOverride: BookingOverrideRecord;
  assignedStaffId: number;
  activeOrderServiceIds: number[];
  catalogCurrentOrderState: string;
  effectiveOrderState: string;
  previousLastLegacyProgressState?: string;
  previousLastLegacyUpperState?: string;
  previousLastLegacyUnderState?: string;
  previousLastLegacyUpperPhotoSigs?: Record<string, string>;
  previousLastLegacyUnderPhotoSigs?: Record<string, string>;
  hasCustomResolveCatalog: boolean;
  pool: mysql.Pool;
  preCheckInStates: ReadonlySet<string>;
  ensureConsulted: () => Promise<{ ok: boolean; warning?: string }>;
  refreshOrderServiceIds: () => Promise<number[]>;
  withAuth: (modifyStaffId: number, body: Record<string, SafeAny>) => Record<string, SafeAny>;
  callPhp: LegacyPhpEndpointCaller;
}

export interface SyncServicingRoundsResult {
  synced: boolean;
  status: 'SYNCED' | 'SKIPPED' | 'DEFERRED';
  legacyOrderState?: string;
  lastLegacyProgressState?: string;
  lastLegacyUpperState?: string;
  lastLegacyUnderState?: string;
  lastLegacyUpperPhotoSigs?: Record<string, string>;
  lastLegacyUnderPhotoSigs?: Record<string, string>;
  warning?: string;
}

function hashPhotoSignature(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

export async function persistIncomingRoundPhotosToCloud(
  bookingId: number,
  incomingProgress: Record<string, SafeAny>,
  isSimulationMode: boolean
): Promise<void> {
  if (isSimulationMode) return;
  for (const { field, type } of ROUND_PHOTO_FIELDS) {
    const val = incomingProgress[field];
    if (typeof val === 'string' && val.startsWith('data:image/')) {
      incomingProgress[field] = await persistProgressPhotoToCloud(bookingId, type, val);
    }
  }
}

async function upsertRetainCountsForOsId(
  pool: mysql.Pool,
  osId: number,
  leftVal: unknown,
  rightVal: unknown
): Promise<void> {
  if (leftVal === undefined || rightVal === undefined || osId <= 0) return;
  const leftStr = String(leftVal);
  const rightStr = String(rightVal);
  const [latestRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT attribute_id, attribute_option_value
     FROM item_attribute_value
     WHERE item_id = ? AND type = 'service-retain-attribute' AND attribute_id IN (17, 18)
     ORDER BY id DESC
     LIMIT 2`,
    [osId]
  );
  const latestLeft = latestRows.find((r) => Number(r.attribute_id) === 17)?.attribute_option_value;
  const latestRight = latestRows.find((r) => Number(r.attribute_id) === 18)?.attribute_option_value;
  if (String(latestLeft ?? '') === leftStr && String(latestRight ?? '') === rightStr) {
    return;
  }
  const groupKey = String(Math.floor(Date.now() / 1000));
  await pool.query(
    `INSERT INTO item_attribute_value (client_id, client_business_id, type, item_id, attribute_id, attribute_option_value, group_key, date_created)
     VALUES (11, 1, 'service-retain-attribute', ?, 17, ?, ?, NOW()),
            (11, 1, 'service-retain-attribute', ?, 18, ?, ?, NOW())`,
    [osId, leftStr, groupKey, osId, rightStr, groupKey]
  );
}

export async function persistRetainCountsByServiceIndex(
  bookingId: number,
  incomingProgress: Record<string, SafeAny>,
  getPoolOverride?: () => mysql.Pool,
  underMinkServiceType?: string
): Promise<void> {
  if (bookingId <= 0 || bookingId >= 900_000_000 || DEMO_BOOKING_IDS.has(bookingId)) {
    return;
  }
  const hasUpperInput = incomingProgress.retainLashCountLeft !== undefined || Boolean(incomingProgress.retainLashes);
  const hasUnderInput =
    incomingProgress.underRetainLashCountLeft !== undefined || Boolean(incomingProgress.underRetainLashes);
  if (!hasUpperInput && !hasUnderInput) {
    return;
  }

  let progressPool: mysql.Pool;
  try {
    progressPool = (getPoolOverride || getLegacyPool)();
  } catch {
    return;
  }

  try {
    const [osRows] = await progressPool.query<mysql.RowDataPacket[]>(
      'SELECT id, service_id, service_group FROM order_service WHERE order_id = ? ORDER BY id ASC',
      [Number(bookingId)]
    );
    if (osRows.length === 0) return;

    const underRow = osRows.find((r) => isUnderMinkServiceRow(r)) || (osRows.length >= 2 ? osRows[1] : undefined);
    const upperRow = osRows.find((r) => r !== underRow) || osRows[0];

    if (hasUpperInput && upperRow) {
      await upsertRetainCountsForOsId(
        progressPool,
        Number(upperRow.id),
        incomingProgress.retainLashCountLeft ?? incomingProgress.retainLashes?.left,
        incomingProgress.retainLashCountRight ?? incomingProgress.retainLashes?.right
      );
    }

    const allowUnderRetain = underMinkServiceType === 'Retain' || Number(underRow?.service_id || 0) === 128;
    if (hasUnderInput && underRow && Number(underRow.id) !== Number(upperRow?.id) && allowUnderRetain) {
      await upsertRetainCountsForOsId(
        progressPool,
        Number(underRow.id),
        incomingProgress.underRetainLashCountLeft ?? incomingProgress.underRetainLashes?.left,
        incomingProgress.underRetainLashCountRight ?? incomingProgress.underRetainLashes?.right
      );
    }
  } catch (dbErr) {
    console.warn('[ios-actions] Failed to persist retain lash counts to legacy DB:', dbErr);
  }
}

async function resolveRoundOrderServiceIds(
  bookingId: number,
  activeOrderServiceIds: number[],
  hasCustomResolveCatalog: boolean,
  pool: mysql.Pool
): Promise<RoundOrderServiceIds> {
  if (!hasCustomResolveCatalog) {
    try {
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        'SELECT id, service_id, service_group FROM order_service WHERE order_id = ? ORDER BY id ASC',
        [bookingId]
      );
      if (rows.length > 0) {
        const underRow = rows.find((r) => isUnderMinkServiceRow(r)) || (rows.length >= 2 ? rows[1] : undefined);
        const upperRow = rows.find((r) => r !== underRow) || rows[0];
        return {
          upperOsId: upperRow ? Number(upperRow.id) : null,
          underOsId: underRow && Number(underRow.id) !== Number(upperRow?.id) ? Number(underRow.id) : null,
          underServiceId: underRow ? Number(underRow.service_id || 0) : null,
        };
      }
    } catch {
      // Fallback to activeOrderServiceIds below
    }
  }
  const upperOsId = activeOrderServiceIds[0] ? Number(activeOrderServiceIds[0]) : null;
  const underOsId = activeOrderServiceIds[1] ? Number(activeOrderServiceIds[1]) : null;
  return { upperOsId, underOsId, underServiceId: null };
}

function resolveCandidatePhotoForState(
  progress: IosBookingProgress | undefined,
  round: IosServicingRound,
  mappedState: string | null
): string | undefined {
  if (!progress || !mappedState) return undefined;
  if (round === 'UNDER') {
    if (mappedState === 'ServiceStart') return progress.underBeforePhotoUrl;
    if (mappedState === 'ServiceCleaned') return progress.underCleanedPhotoUrl;
    if (mappedState === 'ServiceEnd') return progress.underAfterPhotoUrl;
    return undefined;
  }
  if (mappedState === 'ServiceStart') return progress.beforePhotoUrl;
  if (mappedState === 'ServiceCleaned') return progress.cleanedPhotoUrl;
  if (mappedState === 'ServiceEnd') return progress.afterPhotoUrl;
  return undefined;
}

function resolveProgressActionRound(mergedOverride: BookingOverrideRecord): IosServicingRound {
  const rawOrderState = String(mergedOverride.orderState || '').trim();
  if (rawOrderState.startsWith('Photo under_')) return 'UNDER';
  if (rawOrderState.startsWith('Photo upper_')) return 'UPPER';
  return resolveActiveServicingRound(mergedOverride as SafeAny);
}

export function resolveIncompleteOrderServiceIdsForDone(
  activeOrderServiceIds: number[],
  mergedOverride: BookingOverrideRecord
): number[] {
  const prog = mergedOverride.progress;
  const upperDone = prog?.lastLegacyUpperState === 'ServiceCompleted' || prog?.upperCompleted === true;
  const underDone = prog?.lastLegacyUnderState === 'ServiceCompleted';
  if (activeOrderServiceIds.length === 1) {
    return prog?.lastLegacyUpperState === 'ServiceCompleted' ? [] : activeOrderServiceIds;
  }
  if (activeOrderServiceIds.length > 1) {
    return activeOrderServiceIds.filter((_, idx) => (idx === 0 ? !upperDone : idx === 1 ? !underDone : true));
  }
  return activeOrderServiceIds;
}

async function uploadServiceEndPhotoIfUnsent(params: {
  osId: number;
  assignedStaffId: number;
  photoUrl?: string;
  sigs: Record<string, string>;
  withAuth: SyncServicingRoundsParams['withAuth'];
  callPhp: SyncServicingRoundsParams['callPhp'];
}): Promise<{ ok: boolean; warning?: string }> {
  const { osId, assignedStaffId, photoUrl, sigs, withAuth, callPhp } = params;
  const raw = await extractRawBase64ForLegacyPhp(photoUrl);
  const sig = raw && photoUrl ? hashPhotoSignature(photoUrl) : undefined;
  if (!raw || !sig || sig === sigs.ServiceEnd) return { ok: true };
  const res = await callPhp(
    '/order/service/progress/update',
    withAuth(assignedStaffId, {
      order_service_id: String(osId),
      assigned_staff_id: String(assignedStaffId),
      service_state: 'ServiceEnd',
      image: raw,
    })
  );
  if (!res.ok) return { ok: false, warning: res.message || `Legacy ServiceEnd failed (${res.code})` };
  sigs.ServiceEnd = sig;
  return { ok: true };
}

export async function syncServicingRoundsToLegacyPhp(
  params: SyncServicingRoundsParams
): Promise<SyncServicingRoundsResult> {
  const {
    bookingId,
    action,
    mappedState,
    mergedOverride,
    assignedStaffId,
    catalogCurrentOrderState,
    effectiveOrderState,
    previousLastLegacyProgressState,
    previousLastLegacyUpperState,
    previousLastLegacyUnderState,
    previousLastLegacyUpperPhotoSigs,
    previousLastLegacyUnderPhotoSigs,
    hasCustomResolveCatalog,
    pool,
    preCheckInStates,
    ensureConsulted,
    refreshOrderServiceIds,
    withAuth,
    callPhp,
  } = params;
  let activeOsIds = [...params.activeOrderServiceIds];
  const progress = mergedOverride.progress as IosBookingProgress | undefined;

  if (action === 'NEXT_SERVICE_ROUND' || action === 'ADD_UNDER_LASH_ROUND') {
    if (assignedStaffId <= 0) {
      return { synced: false, status: 'SKIPPED' };
    }
    if (
      action === 'ADD_UNDER_LASH_ROUND' ||
      preCheckInStates.has(effectiveOrderState) ||
      effectiveOrderState === 'CheckIn' ||
      (mergedOverride.attributes?.hasUnderMink && activeOsIds.length < 2)
    ) {
      const consultRes = await ensureConsulted();
      if (!consultRes.ok) return { synced: false, status: 'DEFERRED', warning: consultRes.warning };
      activeOsIds = await refreshOrderServiceIds();
    }
    if (activeOsIds.length === 0) activeOsIds = await refreshOrderServiceIds();
    const roundIds = await resolveRoundOrderServiceIds(bookingId, activeOsIds, hasCustomResolveCatalog, pool);
    if (!roundIds.upperOsId) {
      return { synced: false, status: 'DEFERRED', warning: 'No legacy order_service found for next service round.' };
    }

    const nextUpperSigs = { ...(previousLastLegacyUpperPhotoSigs || {}) };
    const endUpload = await uploadServiceEndPhotoIfUnsent({
      osId: roundIds.upperOsId,
      assignedStaffId,
      photoUrl: progress?.afterPhotoUrl,
      sigs: nextUpperSigs,
      withAuth,
      callPhp,
    });
    if (!endUpload.ok) {
      return { synced: false, status: 'DEFERRED', warning: endUpload.warning };
    }

    if (previousLastLegacyUpperState !== 'ServiceCompleted') {
      const nextRes = await callPhp(
        '/order/service/next',
        withAuth(assignedStaffId, {
          order_service_id: String(roundIds.upperOsId),
          assigned_staff_id: String(assignedStaffId),
        })
      );
      if (!nextRes.ok) {
        return {
          synced: false,
          status: 'DEFERRED',
          warning: nextRes.message || `Legacy /order/service/next failed (${nextRes.code})`,
        };
      }
    }

    let nextUnderState = previousLastLegacyUnderState;
    if (roundIds.underOsId && !previousLastLegacyUnderState) {
      const prepRes = await callPhp(
        '/order/service/progress/update',
        withAuth(assignedStaffId, {
          order_service_id: String(roundIds.underOsId),
          assigned_staff_id: String(assignedStaffId),
          service_state: 'Preparation',
        })
      );
      if (!prepRes.ok) {
        return {
          synced: false,
          status: 'DEFERRED',
          warning: prepRes.message || `Legacy Round 2 Preparation failed (${prepRes.code})`,
        };
      }
      nextUnderState = 'Preparation';
    }

    return {
      synced: true,
      status: 'SYNCED',
      legacyOrderState: nextUnderState || 'ServiceCompleted',
      lastLegacyProgressState: nextUnderState || 'ServiceCompleted',
      lastLegacyUpperState: 'ServiceCompleted',
      ...(nextUnderState ? { lastLegacyUnderState: nextUnderState } : {}),
      lastLegacyUpperPhotoSigs: nextUpperSigs,
      lastLegacyUnderPhotoSigs: previousLastLegacyUnderPhotoSigs,
    };
  }

  const round = resolveProgressActionRound(mergedOverride);
  const candidatePhoto = resolveCandidatePhotoForState(progress, round, mappedState);
  const rawImageBase64 = await extractRawBase64ForLegacyPhp(candidatePhoto);
  const photoSig = rawImageBase64 && candidatePhoto ? hashPhotoSignature(candidatePhoto) : undefined;
  const prevRoundState =
    round === 'UNDER' ? previousLastLegacyUnderState : previousLastLegacyUpperState || previousLastLegacyProgressState;
  const roundSigs = round === 'UNDER' ? previousLastLegacyUnderPhotoSigs : previousLastLegacyUpperPhotoSigs;
  const prevSig = mappedState ? roundSigs?.[mappedState] : undefined;
  const hasNewUploadableImage = Boolean(rawImageBase64 && photoSig && photoSig !== prevSig);

  if (
    !mappedState ||
    assignedStaffId <= 0 ||
    (!hasNewUploadableImage &&
      mappedState === prevRoundState &&
      (round === 'UNDER' || catalogCurrentOrderState === mappedState))
  ) {
    return {
      synced: false,
      status: 'SKIPPED',
      lastLegacyProgressState: previousLastLegacyProgressState,
    };
  }

  if (preCheckInStates.has(effectiveOrderState) || effectiveOrderState === 'CheckIn') {
    const consultRes = await ensureConsulted();
    if (!consultRes.ok) return { synced: false, status: 'DEFERRED', warning: consultRes.warning };
    activeOsIds = await refreshOrderServiceIds();
  }
  if (activeOsIds.length === 0) activeOsIds = await refreshOrderServiceIds();
  if (activeOsIds.length === 0) {
    return { synced: false, status: 'DEFERRED', warning: 'No legacy order_service found for progress sync.' };
  }

  const roundIds = await resolveRoundOrderServiceIds(bookingId, activeOsIds, hasCustomResolveCatalog, pool);
  const targetOsId = round === 'UNDER' ? roundIds.underOsId || roundIds.upperOsId : roundIds.upperOsId;
  if (!targetOsId) {
    return { synced: false, status: 'DEFERRED', warning: 'No target order_service_id resolved for round sync.' };
  }

  const nextUpperSigs = { ...(previousLastLegacyUpperPhotoSigs || {}) };
  const nextUnderSigs = { ...(previousLastLegacyUnderPhotoSigs || {}) };
  if (mappedState === 'ServiceCompleted') {
    const endRes = await uploadServiceEndPhotoIfUnsent({
      osId: targetOsId,
      assignedStaffId,
      photoUrl: resolveCandidatePhotoForState(progress, round, 'ServiceEnd'),
      sigs: round === 'UNDER' ? nextUnderSigs : nextUpperSigs,
      withAuth,
      callPhp,
    });
    if (!endRes.ok) {
      return { synced: false, status: 'DEFERRED', warning: endRes.warning };
    }
  }

  const res =
    mappedState === 'ServiceCompleted'
      ? await callPhp(
          '/order/service/done',
          withAuth(assignedStaffId, {
            order_service_id: String(targetOsId),
            assigned_staff_id: String(assignedStaffId),
          })
        )
      : await callPhp(
          '/order/service/progress/update',
          withAuth(assignedStaffId, {
            order_service_id: String(targetOsId),
            assigned_staff_id: String(assignedStaffId),
            service_state: mappedState,
            ...(rawImageBase64 ? { image: rawImageBase64 } : {}),
          })
        );
  if (!res.ok) {
    return {
      synced: false,
      status: 'DEFERRED',
      warning: res.message || `Legacy progress update (${mappedState}) returned code ${res.code}`,
    };
  }

  if (hasNewUploadableImage && photoSig) {
    if (round === 'UNDER') nextUnderSigs[mappedState] = photoSig;
    else nextUpperSigs[mappedState] = photoSig;
  }

  return {
    synced: true,
    status: 'SYNCED',
    legacyOrderState: mappedState,
    lastLegacyProgressState: mappedState,
    lastLegacyUpperState: round === 'UPPER' ? mappedState : previousLastLegacyUpperState,
    lastLegacyUnderState: round === 'UNDER' ? mappedState : previousLastLegacyUnderState,
    lastLegacyUpperPhotoSigs: nextUpperSigs,
    lastLegacyUnderPhotoSigs: nextUnderSigs,
  };
}
