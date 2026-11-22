'use client';

import React, { useState } from 'react';
import type { BookingItem } from '../../../state/mockData';
import { buildCheckoutVietQrInfo } from '../../../state/iosBillingMath';
import { useCheckoutProofCapture } from '../../../state/useCheckoutProofCapture';
import { CheckoutVietQrModal, type VietQrSplitMode } from '../checkout/CheckoutVietQrModal';

export interface PostCheckoutQrModalClusterProps {
  open: boolean;
  isDark: boolean;
  booking: BookingItem;
  vietqrAmount: number;
  tipDeltaAmount: number;
  onClose: () => void;
  onConfirmProofs: (payload: {
    transferProofPhoto?: string;
    tipTransferProofPhoto?: string;
    qrSplitTipSeparate: boolean;
  }) => void;
}

export function PostCheckoutQrModalCluster({
  open,
  isDark,
  booking,
  vietqrAmount,
  tipDeltaAmount,
  onClose,
  onConfirmProofs,
}: PostCheckoutQrModalClusterProps) {
  const [qrSplitMode, setQrSplitMode] = useState<VietQrSplitMode>('COMBINED');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const {
    transferProofPhoto,
    proofCloudSyncStatus,
    tipTransferProofPhoto,
    tipProofCloudSyncStatus,
    fileInputRef,
    tipFileInputRef,
    handleCaptureProof,
    handleCaptureTipProof,
  } = useCheckoutProofCapture(null, null);

  const qrInfo = buildCheckoutVietQrInfo({
    booking,
    tipAmount: tipDeltaAmount,
    vietQrTransferAmount: vietqrAmount,
    tipTransferAmount: tipDeltaAmount,
  });

  const handleCopy = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(null), 1800);
    }
  };

  return (
    <>
      <CheckoutVietQrModal
        open={open}
        isDark={isDark}
        branchCode={qrInfo.branchCode}
        vietQrUrl={qrInfo.vietQrUrl}
        qrTransferContent={qrInfo.qrTransferContent}
        finalGrandTotal={vietqrAmount}
        copySuccess={copySuccess}
        onCopyToClipboard={handleCopy}
        transferProofPhoto={transferProofPhoto}
        proofCloudSyncStatus={proofCloudSyncStatus}
        onTriggerFilePicker={() => fileInputRef.current?.click()}
        serviceQrAmount={qrInfo.serviceQrAmount}
        serviceQrUrl={qrInfo.serviceQrUrl}
        serviceQrContent={qrInfo.serviceQrContent}
        tipQrAmount={qrInfo.tipQrAmount}
        tipQrUrl={qrInfo.tipQrUrl}
        tipQrContent={qrInfo.tipQrContent}
        qrSplitMode={qrSplitMode}
        onChangeQrSplitMode={setQrSplitMode}
        tipTransferProofPhoto={tipTransferProofPhoto}
        tipProofCloudSyncStatus={tipProofCloudSyncStatus}
        onTriggerTipFilePicker={() => tipFileInputRef.current?.click()}
        onConfirmQrPaid={() => {
          onConfirmProofs({
            transferProofPhoto: transferProofPhoto || undefined,
            tipTransferProofPhoto: tipTransferProofPhoto || undefined,
            qrSplitTipSeparate: qrSplitMode === 'SEPARATE',
          });
          onClose();
        }}
        onClose={onClose}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCaptureProof}
      />
      <input
        ref={tipFileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCaptureTipProof}
      />
    </>
  );
}
