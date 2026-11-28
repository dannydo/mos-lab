import { buildAddUnderLashRoundFields, resolveActiveBookingComboWallets, SafeAny } from '@mos-lab/shared';
import { INITIAL_BOOKINGS } from '../mock-data.js';
import { BookingOverrideRecord } from './ios-overrides.service.js';
import { persistIncomingRoundPhotosToCloud } from './ios-progress-sync.helper.js';

export function buildAddUnderLashRoundOverride(params: {
  bookingId: number;
  current: BookingOverrideRecord;
  body: SafeAny;
  walletSelectionPatch: BookingOverrideRecord;
  actorStaffId: number;
  actorStaffName: string;
}): BookingOverrideRecord {
  const { bookingId, current, body, walletSelectionPatch, actorStaffId, actorStaffName } = params;
  const mockBaseline = INITIAL_BOOKINGS.find((b) => b.id === bookingId);
  const nowIso = new Date().toISOString();

  const currentAttrs = {
    ...(mockBaseline?.attributes || {}),
    ...(current.attributes || {}),
  };
  const underMinkServiceType: 'Normal' | 'Retain' = body?.underMinkServiceType === 'Retain' ? 'Retain' : 'Normal';
  const underMinkCurl: 'B' | 'C' = body?.underMinkCurl === 'B' ? 'B' : 'C';
  const underMinkLength = String(body?.underMinkLength || currentAttrs.underMinkLength || '7 mm').trim();
  const underMinkCount = String(body?.underMinkCount || currentAttrs.underMinkCount || '30 sợi').trim();

  const mergedComboFields = {
    comboWallets: body?.comboWallets ?? current.comboWallets ?? mockBaseline?.comboWallets,
    comboLiveStatus: body?.comboLiveStatus ?? current.comboLiveStatus ?? mockBaseline?.comboLiveStatus,
    underMinkComboStatus:
      body?.underMinkComboStatus ?? current.underMinkComboStatus ?? mockBaseline?.underMinkComboStatus,
    selectedUpperComboBalanceId:
      walletSelectionPatch.selectedUpperComboBalanceId ??
      current.selectedUpperComboBalanceId ??
      mockBaseline?.selectedUpperComboBalanceId ??
      null,
    selectedUnderComboBalanceId:
      walletSelectionPatch.selectedUnderComboBalanceId ??
      current.selectedUnderComboBalanceId ??
      mockBaseline?.selectedUnderComboBalanceId ??
      null,
    skipUpperCombo: Boolean(walletSelectionPatch.skipUpperCombo ?? current.skipUpperCombo),
    skipUnderCombo: Boolean(walletSelectionPatch.skipUnderCombo ?? current.skipUnderCombo),
  };

  const resolvedWallets = resolveActiveBookingComboWallets({
    ...mergedComboFields,
    bookedServiceName: current.serviceName || body?.currentServiceName || mockBaseline?.serviceName,
  });

  const hasUnderMinkCombo =
    body?.hasUnderMinkCombo !== undefined ? Boolean(body.hasUnderMinkCombo) : resolvedWallets.isRedeemingUnderToday;

  const roundFields = buildAddUnderLashRoundFields({
    currentServiceName: current.serviceName || body?.currentServiceName || mockBaseline?.serviceName,
    currentServicePrice: current.servicePrice ?? body?.currentServicePrice ?? mockBaseline?.servicePrice,
    currentUpgradePrice: current.upgradePrice ?? body?.currentUpgradePrice ?? mockBaseline?.upgradePrice ?? 0,
    currentServiceDuration:
      current.serviceDuration ?? body?.currentServiceDuration ?? mockBaseline?.serviceDuration ?? 60,
    currentCvRotationPoints:
      current.cvRotationPoints ?? body?.currentCvRotationPoints ?? mockBaseline?.cvRotationPoints,
    alreadyHasUnderMink: Boolean(currentAttrs.hasUnderMink),
    previousUnderMinkServiceType: currentAttrs.underMinkServiceType === 'Retain' ? 'Retain' : 'Normal',
    isComboLive: resolvedWallets.isRedeemingUpperToday,
    hasUnderMinkCombo,
    underMinkServiceType,
    underMinkCurl,
    underMinkLength,
    underMinkCount,
    upperTargetDurationMinutes: current.progress?.upperTargetDurationMinutes || current.progress?.targetDurationMinutes,
  });

  const nextBilling = current.billing
    ? {
        ...current.billing,
        completedAt: undefined,
        settlementStatus: undefined,
      }
    : undefined;

  const incomingAfterPhoto =
    typeof body?.afterPhotoUrl === 'string' && body.afterPhotoUrl.trim() ? body.afterPhotoUrl.trim() : undefined;

  const nextProgress = {
    ...(current.progress || {}),
    ...(incomingAfterPhoto
      ? {
          afterPhotoUrl: incomingAfterPhoto,
          afterPhotoSavedAt: current.progress?.afterPhotoSavedAt || nowIso,
        }
      : {}),
    upperCompleted: true,
    upperCompletedAt: current.progress?.upperCompletedAt || current.progress?.completedAt || nowIso,
    activeServiceRound: 'UNDER' as const,
    timerRunning: false,
    elapsedSeconds: 0,
    underElapsedSeconds: 0,
    underStartedAt: undefined,
    underCompletedAt: undefined,
    underBeforePhotoUrl: undefined,
    underCleanedPhotoUrl: undefined,
    underAfterPhotoUrl: undefined,
    completedAt: undefined,
    upperTargetDurationMinutes: roundFields.upperTargetDurationMinutes,
    underTargetDurationMinutes: roundFields.underTargetDurationMinutes,
    targetDurationMinutes: roundFields.totalDurationMinutes,
    currentStep: 7,
    cloudSynced: true,
    cloudSyncedAt: nowIso,
  };

  return {
    ...current,
    ...walletSelectionPatch,
    status: 'SERVICING',
    orderState: 'Preparation',
    completedAt: undefined,
    assignedStaffId: current.assignedStaffId || actorStaffId,
    assignedStaffName:
      current.assignedStaffName && current.assignedStaffName !== 'Chờ phân công (Đầu tua)'
        ? current.assignedStaffName
        : actorStaffName,
    serviceName: roundFields.serviceName,
    servicePrice: roundFields.servicePrice,
    upgradePrice: roundFields.upgradePrice,
    serviceDuration: roundFields.totalDurationMinutes,
    ...(roundFields.cvRotationPoints !== undefined ? { cvRotationPoints: roundFields.cvRotationPoints } : {}),
    hasUnderMinkCombo,
    attributes: {
      style: currentAttrs.style || 'Natural',
      curl: currentAttrs.curl || 'C',
      length: currentAttrs.length || '10-12 mm',
      thickness: currentAttrs.thickness || '0.07 mm',
      ...currentAttrs,
      ...roundFields.underAttributes,
    },
    ...(nextBilling ? { billing: nextBilling } : {}),
    progress: nextProgress,
  };
}

export async function prepareAddUnderLashRoundBody(
  bookingId: number,
  body: SafeAny,
  isSimulationMode: boolean
): Promise<SafeAny> {
  if (!body?.afterPhotoUrl || typeof body.afterPhotoUrl !== 'string') {
    return body;
  }
  const photoHolder = { afterPhotoUrl: body.afterPhotoUrl };
  await persistIncomingRoundPhotosToCloud(bookingId, photoHolder, isSimulationMode);
  return { ...body, afterPhotoUrl: photoHolder.afterPhotoUrl };
}
