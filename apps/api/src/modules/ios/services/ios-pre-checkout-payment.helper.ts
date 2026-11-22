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
    Math.round(Number(body?.preCheckoutServicePaidAmount ?? current.billing?.preCheckoutServicePaidAmount ?? 0))
  );
  const preCheckoutTipAmount = Math.max(
    0,
    Math.round(Number(body?.preCheckoutTipAmount ?? body?.tipAmount ?? current.billing?.preCheckoutTipAmount ?? 0))
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

  let serviceProof =
    typeof body?.preCheckoutTransferProofPhoto === 'string'
      ? body.preCheckoutTransferProofPhoto.trim()
      : typeof body?.transferProofPhoto === 'string'
        ? body.transferProofPhoto.trim()
        : current.billing?.preCheckoutTransferProofPhoto || current.billing?.transferProofPhoto;
  if (!isSimulationMode && serviceProof && serviceProof.startsWith('data:image/')) {
    serviceProof = await persistProgressPhotoToCloud(bookingId, 'pre_checkout_proof', serviceProof);
  }

  let tipProof =
    typeof body?.preCheckoutTipTransferProofPhoto === 'string'
      ? body.preCheckoutTipTransferProofPhoto.trim()
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

  return {
    ...current,
    billing: {
      ...(current.billing || {}),
      tipAmount: preCheckoutTipAmount,
      tipCvShare,
      tipCheckInShare,
      tipCheckOutShare,
      tipCcShare,
      qrSplitTipSeparate: preCheckoutQrSplitMode === 'SEPARATE',
      preCheckoutServicePaidAmount,
      preCheckoutTipAmount,
      preCheckoutPaymentMethod: normalized.paymentMethod,
      preCheckoutPaymentBreakdown: normalized.breakdown,
      preCheckoutQrSplitMode,
      ...(serviceProof
        ? {
            preCheckoutTransferProofPhoto: serviceProof,
            transferProofPhoto: serviceProof,
          }
        : {}),
      ...(tipProof
        ? {
            preCheckoutTipTransferProofPhoto: tipProof,
            tipTransferProofPhoto: tipProof,
          }
        : {}),
      preCheckoutRecordedAt: totalPrepaid > 0 ? nowIso : undefined,
      preCheckoutRecordedByStaffId: totalPrepaid > 0 ? actorStaffId : undefined,
      preCheckoutRecordedByStaffName: totalPrepaid > 0 ? actorStaffName : undefined,
      ...(typeof body?.preCheckoutNote === 'string' && body.preCheckoutNote.trim()
        ? { preCheckoutNote: body.preCheckoutNote.trim().slice(0, 300) }
        : {}),
    },
  };
}
