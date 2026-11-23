import { resolveNormalizedPaymentBreakdown, SafeAny } from '@mos-lab/shared';
import { BookingOverrideRecord } from './ios-overrides.service.js';
import { persistProgressPhotoToCloud } from './ios-photos.service.js';

export async function buildPreCheckoutPaymentOverride(params: {
  bookingId: number;
  current: BookingOverrideRecord;
  body: SafeAny;
  actorStaffId: number;
  actorStaffName: string;
  isSimulationMode: boolean;
}): Promise<BookingOverrideRecord> {
  const { bookingId, current, body, actorStaffId, actorStaffName, isSimulationMode } = params;

  const preCheckoutServicePaidAmount = Math.max(
    0,
    Math.round(Number(body?.preCheckoutServicePaidAmount ?? current.billing?.preCheckoutServicePaidAmount ?? 0) || 0)
  );
  const preCheckoutTipAmount = Math.max(
    0,
    Math.round(Number(body?.preCheckoutTipAmount ?? body?.tipAmount ?? current.billing?.preCheckoutTipAmount ?? 0) || 0)
  );
  const totalPrepaid = preCheckoutServicePaidAmount + preCheckoutTipAmount;

  const normalized = resolveNormalizedPaymentBreakdown(
    totalPrepaid,
    body?.preCheckoutPaymentMethod || body?.paymentMethod || current.billing?.preCheckoutPaymentMethod || 'VIETQR',
    body?.preCheckoutPaymentBreakdown || body?.paymentBreakdown || current.billing?.preCheckoutPaymentBreakdown
  );

  const rawQrMode = String(
    body?.preCheckoutQrSplitMode || current.billing?.preCheckoutQrSplitMode || 'COMBINED'
  ).toUpperCase();
  const preCheckoutQrSplitMode: 'COMBINED' | 'SEPARATE' = rawQrMode === 'SEPARATE' ? 'SEPARATE' : 'COMBINED';

  const hasExplicitServiceProof =
    body?.preCheckoutTransferProofPhoto !== undefined || body?.transferProofPhoto !== undefined;
  let serviceProof =
    body?.preCheckoutTransferProofPhoto === null
      ? ''
      : typeof body?.preCheckoutTransferProofPhoto === 'string'
        ? body.preCheckoutTransferProofPhoto.trim()
        : body?.transferProofPhoto === null
          ? ''
          : typeof body?.transferProofPhoto === 'string'
            ? body.transferProofPhoto.trim()
            : current.billing?.preCheckoutTransferProofPhoto || current.billing?.transferProofPhoto;
  if (!isSimulationMode && serviceProof && serviceProof.startsWith('data:image/')) {
    serviceProof = await persistProgressPhotoToCloud(bookingId, 'pre_checkout_proof', serviceProof);
  }

  const hasExplicitTipProof =
    body?.preCheckoutTipTransferProofPhoto !== undefined || body?.tipTransferProofPhoto !== undefined;
  let tipProof =
    body?.preCheckoutTipTransferProofPhoto === null
      ? ''
      : typeof body?.preCheckoutTipTransferProofPhoto === 'string'
        ? body.preCheckoutTipTransferProofPhoto.trim()
        : body?.tipTransferProofPhoto === null
          ? ''
          : typeof body?.tipTransferProofPhoto === 'string'
            ? body.tipTransferProofPhoto.trim()
            : current.billing?.preCheckoutTipTransferProofPhoto || current.billing?.tipTransferProofPhoto;
  if (!isSimulationMode && tipProof && tipProof.startsWith('data:image/')) {
    tipProof = await persistProgressPhotoToCloud(bookingId, 'pre_checkout_tip_proof', tipProof);
  }

  const tipCvShare = Math.round(preCheckoutTipAmount * 0.7);
  const tipCheckInShare = Math.round(preCheckoutTipAmount * 0.1);
  const tipCheckOutShare = Math.round(preCheckoutTipAmount * 0.1);
  const tipCcShare = tipCheckInShare + tipCheckOutShare;
  const nowIso = new Date().toISOString();

  const nextBilling: NonNullable<BookingOverrideRecord['billing']> = {
    ...(current.billing || {}),
    tipAmount: preCheckoutTipAmount,
    tipCvShare,
    tipCheckInShare,
    tipCheckOutShare,
    tipCcShare,
    qrSplitTipSeparate: totalPrepaid > 0 ? preCheckoutQrSplitMode === 'SEPARATE' : false,
    preCheckoutServicePaidAmount,
    preCheckoutTipAmount,
    preCheckoutPaymentMethod: normalized.paymentMethod,
    preCheckoutPaymentBreakdown: normalized.breakdown,
    preCheckoutQrSplitMode: totalPrepaid > 0 ? preCheckoutQrSplitMode : 'COMBINED',
  };

  if (totalPrepaid > 0) {
    nextBilling.preCheckoutRecordedAt = nowIso;
    nextBilling.preCheckoutRecordedByStaffId = actorStaffId;
    nextBilling.preCheckoutRecordedByStaffName = actorStaffName;
  } else {
    delete nextBilling.preCheckoutRecordedAt;
    delete nextBilling.preCheckoutRecordedByStaffId;
    delete nextBilling.preCheckoutRecordedByStaffName;
    delete nextBilling.preCheckoutNote;
  }

  const prevServiceProof = current.billing?.preCheckoutTransferProofPhoto;
  if (totalPrepaid === 0 || (hasExplicitServiceProof && !serviceProof)) {
    delete nextBilling.preCheckoutTransferProofPhoto;
    if (!nextBilling.transferProofPhoto || nextBilling.transferProofPhoto === prevServiceProof) {
      delete nextBilling.transferProofPhoto;
    }
  } else if (serviceProof) {
    nextBilling.preCheckoutTransferProofPhoto = serviceProof;
    nextBilling.transferProofPhoto = serviceProof;
  }

  const prevTipProof = current.billing?.preCheckoutTipTransferProofPhoto;
  if (totalPrepaid === 0 || (hasExplicitTipProof && !tipProof)) {
    delete nextBilling.preCheckoutTipTransferProofPhoto;
    if (!nextBilling.tipTransferProofPhoto || nextBilling.tipTransferProofPhoto === prevTipProof) {
      delete nextBilling.tipTransferProofPhoto;
    }
  } else if (tipProof) {
    nextBilling.preCheckoutTipTransferProofPhoto = tipProof;
    nextBilling.tipTransferProofPhoto = tipProof;
  }

  if (totalPrepaid > 0 && typeof body?.preCheckoutNote === 'string') {
    const trimmedNote = body.preCheckoutNote.trim().slice(0, 300);
    if (trimmedNote) {
      nextBilling.preCheckoutNote = trimmedNote;
    } else {
      delete nextBilling.preCheckoutNote;
    }
  }

  return {
    ...current,
    billing: nextBilling,
  };
}
