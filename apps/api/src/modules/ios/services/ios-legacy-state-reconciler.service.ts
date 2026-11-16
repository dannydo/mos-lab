import { IosBookingStatus, SafeAny } from '@mos-lab/shared';
import { resolveBookingStatusFromState } from './ios-bookings-formatters.js';
import { RawIosOrderSnapshot } from './ios-bookings-sql.service.js';
import { DEMO_BOOKING_IDS } from './ios-legacy-bridge.service.js';
import { SyncIosStepBridgeDeps, syncIosStepWithLegacyPhp } from './ios-legacy-step-sync.service.js';
import { BookingOverrideRecord, createOverrideRepository } from './ios-overrides.service.js';

type IosOverrideRepository = ReturnType<typeof createOverrideRepository>;

const PRE_CHECKIN_ORDER_STATES = new Set(['New', 'Confirmed', 'Parking', '']);
const TERMINAL_ORDER_STATES = new Set(['Completed', 'Cancelled', 'Missed']);
const PROGRESS_ORDER_STATES = new Set([
  'Preparation',
  'Service Start',
  'ServiceStart',
  'Service Cleaned',
  'ServiceCleaned',
  'Service End',
  'ServiceEnd',
  'Photo before auto-saved',
  'Photo cleaned auto-saved',
  'Photo after auto-saved',
]);
const DEFERRED_RETRY_COOLDOWN_MS = 15_000;

export function getLegacyOrderStageRank(state?: string | null): number {
  switch (String(state || '').trim()) {
    case 'Cancelled':
    case 'Missed':
      return -1;
    case '':
    case 'New':
    case 'Confirmed':
      return 0;
    case 'Parking':
      return 1;
    case 'CheckIn':
    case 'Check-in':
      return 2;
    case 'Consultation':
      return 3;
    case 'Preparation':
    case 'Photo before auto-saved':
      return 4;
    case 'ServiceStart':
    case 'Service Start':
    case 'In-progress':
      return 5;
    case 'ServiceCleaned':
    case 'Service Cleaned':
    case 'Photo cleaned auto-saved':
      return 6;
    case 'ServiceEnd':
    case 'Service End':
    case 'Photo after auto-saved':
      return 7;
    case 'ServiceCompleted':
    case 'Service Completed':
      return 8;
    case 'CheckOut':
    case 'Check-out':
      return 9;
    case 'Completed':
      return 10;
    default:
      return 0;
  }
}

export function resolveEffectiveLiveOrderStateAndStatus(params: {
  dbOrderState: string | null | undefined;
  override: BookingOverrideRecord;
  targetDate: string;
  todayVn: string;
}): { state: string; status: IosBookingStatus; revertedInLegacy: boolean } {
  const { dbOrderState, override, targetDate, todayVn } = params;
  const dbState = String(dbOrderState || '').trim();

  if (dbState === 'Cancelled' || dbState === 'Missed') {
    return { state: dbState, status: 'CANCELLED', revertedInLegacy: false };
  }

  if (dbState === 'Completed') {
    return { state: 'Completed', status: 'DONE', revertedInLegacy: false };
  }

  if (
    override.legacyStepSyncStatus === 'SYNCED' &&
    getLegacyOrderStageRank(override.legacySyncedOrderState) >= 1 &&
    (dbState === 'New' || dbState === 'Confirmed')
  ) {
    return {
      state: dbState,
      status: resolveBookingStatusFromState(undefined, dbState, targetDate, todayVn),
      revertedInLegacy: true,
    };
  }

  const dbRank = getLegacyOrderStageRank(dbState);
  const ovrRank = getLegacyOrderStageRank(override.orderState);
  if (dbRank > ovrRank && dbRank >= 1) {
    return {
      state: dbState,
      status: resolveBookingStatusFromState(undefined, dbState, targetDate, todayVn),
      revertedInLegacy: false,
    };
  }

  const state = override.orderState || dbState;
  const status = resolveBookingStatusFromState(override.status, state, targetDate, todayVn);
  return { state, status, revertedInLegacy: false };
}

export function inferDeferredStepReplayAction(override: BookingOverrideRecord): string | null {
  if (override.status !== 'CHECKED_IN' && override.status !== 'SERVICING') {
    return null;
  }

  const orderState = String(override.orderState || '').trim();
  if (orderState === 'Check-out' || orderState === 'CheckOut') {
    return 'SAVE_UPSELL_AND_CHECKOUT';
  }
  if (override.survey || orderState === 'Service Completed' || orderState === 'ServiceCompleted') {
    return 'COMPLETE_SURVEY';
  }

  const progress = override.progress as Record<string, SafeAny> | undefined;
  if (
    progress &&
    (progress.startedAt ||
      progress.beforePhotoUrl ||
      progress.cleanedPhotoUrl ||
      progress.afterPhotoUrl ||
      PROGRESS_ORDER_STATES.has(orderState))
  ) {
    return 'UPDATE_PROGRESS';
  }

  if (Number(override.assignedStaffId || 0) > 0 && orderState === 'Preparation') {
    return 'ASSIGN_STAFF';
  }
  if (override.consultedAt || override.attributes?.isNewClientDiagnosticDone) {
    return 'SAVE_CONSULTATION';
  }
  if (override.status === 'CHECKED_IN' || Number(override.checkInStaffId || 0) > 0) {
    return 'CHECK_IN';
  }
  return null;
}

export async function reconcileLiveBookingOverridesWithLegacy(params: {
  orders: RawIosOrderSnapshot[];
  overrides: Record<string, BookingOverrideRecord>;
  repo: IosOverrideRepository;
  activeStaffId: number;
  targetDate: string;
  todayVn: string;
  syncDeps?: Partial<SyncIosStepBridgeDeps>;
  nowMs?: number;
}): Promise<boolean> {
  const { orders, overrides, repo, activeStaffId, targetDate, todayVn, syncDeps, nowMs = Date.now() } = params;
  if (targetDate !== todayVn) {
    return false;
  }

  let reconciledAny = false;

  for (const row of orders) {
    const bookingId = Number(row.id);
    if (!Number.isFinite(bookingId) || bookingId <= 0 || bookingId >= 900_000_000 || DEMO_BOOKING_IDS.has(bookingId)) {
      continue;
    }

    const ovr = overrides[String(bookingId)];
    if (!ovr) continue;

    const dbState = String(row.order_state || '').trim();

    if (
      ovr.legacyStepSyncStatus === 'SYNCED' &&
      getLegacyOrderStageRank(ovr.legacySyncedOrderState) >= 1 &&
      (dbState === 'New' || dbState === 'Confirmed')
    ) {
      await repo.withBookingLock(bookingId, async () => {
        const freshOvr = (await repo.loadBookingOverride(bookingId)) || ovr;
        const nextOvr: BookingOverrideRecord = {
          ...(freshOvr.customerAvatar ? { customerAvatar: freshOvr.customerAvatar } : {}),
          status: 'INCOMING',
          orderState: dbState,
          legacyStepSyncStatus: 'SYNCED',
          legacySyncedOrderState: dbState,
          legacyStepSyncedAt: new Date(nowMs).toISOString(),
        };
        await repo.saveBookingOverride(bookingId, nextOvr);
        overrides[String(bookingId)] = nextOvr;
      });
      continue;
    }

    const isActiveInMos = ovr.status === 'CHECKED_IN' || ovr.status === 'SERVICING';
    const isNeedsDeferredSync =
      ovr.legacyStepSyncStatus === 'DEFERRED' ||
      (PRE_CHECKIN_ORDER_STATES.has(dbState) &&
        !(ovr.legacyStepSyncStatus === 'SYNCED' && getLegacyOrderStageRank(ovr.legacySyncedOrderState) >= 1));

    if (!isActiveInMos || TERMINAL_ORDER_STATES.has(dbState) || !isNeedsDeferredSync) {
      continue;
    }

    if (ovr.legacyStepLastAttemptAt) {
      const lastAttemptMs = new Date(String(ovr.legacyStepLastAttemptAt)).getTime();
      if (Number.isFinite(lastAttemptMs) && nowMs - lastAttemptMs < DEFERRED_RETRY_COOLDOWN_MS) {
        continue;
      }
    }

    const replayAction = inferDeferredStepReplayAction(ovr);
    if (!replayAction) continue;

    await repo.withBookingLock(bookingId, async () => {
      const freshOvr: BookingOverrideRecord = (await repo.loadBookingOverride(bookingId)) || ovr;
      const freshAction = inferDeferredStepReplayAction(freshOvr);
      if (!freshAction) return;

      const stepCheckInStaffId = Number(freshOvr.checkInStaffId || freshOvr.assignedStaffId || activeStaffId);
      const stepAssignedStaffId =
        freshOvr.status === 'CHECKED_IN'
          ? Number(freshOvr.assignedStaffId || 0)
          : Number(freshOvr.assignedStaffId || freshOvr.checkInStaffId || activeStaffId);
      const stepCheckOutStaffId = Number(freshOvr.checkOutStaffId || stepCheckInStaffId || activeStaffId);
      const stepActorId = Number(
        (stepAssignedStaffId > 0 ? stepAssignedStaffId : 0) || stepCheckInStaffId || activeStaffId
      );

      const stepSync = await syncIosStepWithLegacyPhp(
        {
          bookingId,
          action: freshAction,
          mergedOverride: freshOvr,
          actorStaffId: stepActorId,
          checkInStaffId: stepCheckInStaffId,
          assignedStaffId: stepAssignedStaffId,
          checkOutStaffId: stepCheckOutStaffId,
          isSimulationMode: false,
          isDemoRequest: false,
          previousLastLegacyProgressState: freshOvr.progress?.lastLegacyProgressState,
        },
        syncDeps
      );

      const attemptIso = new Date(nowMs).toISOString();
      const updatedOvr: BookingOverrideRecord = {
        ...freshOvr,
        legacyStepLastAttemptAt: attemptIso,
        legacyStepSyncStatus: stepSync.status,
        ...(stepSync.legacyOrderState ? { legacySyncedOrderState: stepSync.legacyOrderState } : {}),
        ...(stepSync.synced ? { legacyStepSyncedAt: attemptIso } : {}),
        ...(stepSync.lastLegacyProgressState && freshOvr.progress
          ? {
              progress: {
                ...freshOvr.progress,
                lastLegacyProgressState: stepSync.lastLegacyProgressState,
              },
            }
          : {}),
      };
      if (stepSync.warning) {
        updatedOvr.legacyStepSyncWarning = stepSync.warning;
      } else {
        delete updatedOvr.legacyStepSyncWarning;
      }
      await repo.saveBookingOverride(bookingId, updatedOvr);
      overrides[String(bookingId)] = updatedOvr;

      if (stepSync.synced) {
        reconciledAny = true;
      }
    });
  }

  return reconciledAny;
}
