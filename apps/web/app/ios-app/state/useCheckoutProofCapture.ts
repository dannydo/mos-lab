'use client';

import { useCallback, useRef, useState } from 'react';
import { compressLashImage } from '../utils/imageCompressor';
import type { IosCloudSyncStatus } from '../components/ui-kit/IosCloudSyncBadge';

export function useCheckoutProofCapture(initialServiceProof?: string | null, initialTipProof?: string | null) {
  const [transferProofPhoto, setTransferProofPhoto] = useState<string | null>(initialServiceProof || null);
  const [proofCloudSyncStatus, setProofCloudSyncStatus] = useState<IosCloudSyncStatus>(
    initialServiceProof ? 'synced' : 'idle'
  );
  const [tipTransferProofPhoto, setTipTransferProofPhoto] = useState<string | null>(initialTipProof || null);
  const [tipProofCloudSyncStatus, setTipProofCloudSyncStatus] = useState<IosCloudSyncStatus>(
    initialTipProof ? 'synced' : 'idle'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tipFileInputRef = useRef<HTMLInputElement>(null);

  const captureForTarget = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, target: 'service' | 'tip') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const setPhoto = target === 'tip' ? setTipTransferProofPhoto : setTransferProofPhoto;
    const setStatus = target === 'tip' ? setTipProofCloudSyncStatus : setProofCloudSyncStatus;
    let instantUrl: string | null = null;
    try {
      instantUrl = URL.createObjectURL(file);
      setPhoto(instantUrl);
      setStatus('uploading');
      const compressed = await compressLashImage(file, 1024, 0.72);
      if (instantUrl) {
        try {
          URL.revokeObjectURL(instantUrl);
        } catch (_) {}
      }
      setPhoto(compressed);
      await new Promise((resolve) => setTimeout(resolve, 850));
      setStatus('synced');
    } catch (err) {
      console.warn('[useCheckoutProofCapture] Failed to process proof image:', err);
      setStatus('synced');
    }
    e.target.value = '';
  }, []);

  const handleCaptureProof = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => captureForTarget(e, 'service'),
    [captureForTarget]
  );

  const handleCaptureTipProof = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => captureForTarget(e, 'tip'),
    [captureForTarget]
  );

  return {
    transferProofPhoto,
    proofCloudSyncStatus,
    tipTransferProofPhoto,
    tipProofCloudSyncStatus,
    fileInputRef,
    tipFileInputRef,
    handleCaptureProof,
    handleCaptureTipProof,
  };
}

export function useCheckoutModalControls(
  initialZaloPhone: string,
  dispatchChoosePayment: (zaloConsentData: {
    agreed: boolean;
    phone: string;
    sentAt?: string;
    voucherCode?: string;
  }) => void
) {
  const [isProductQrScannerOpen, setIsProductQrScannerOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isZaloModalOpen, setIsZaloModalOpen] = useState(false);
  const [zaloPhone, setZaloPhone] = useState(initialZaloPhone);
  const [isSendingZalo, setIsSendingZalo] = useState(false);
  const [isZaloSentSuccess, setIsZaloSentSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const copyToClipboard = useCallback((text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(null), 2000);
    }
  }, []);

  const handleConfirmQrPaid = useCallback(() => {
    setIsQrModalOpen(false);
    setIsZaloModalOpen(true);
  }, []);

  const handleConfirmZaloSend = useCallback(() => {
    setIsSendingZalo(true);
    setTimeout(() => {
      setIsSendingZalo(false);
      setIsZaloSentSuccess(true);
      setTimeout(() => {
        setIsZaloModalOpen(false);
        setIsZaloSentSuccess(false);
        dispatchChoosePayment({
          agreed: true,
          phone: zaloPhone,
          sentAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          voucherCode: 'WINGS50K-ZALO',
        });
      }, 600);
    }, 700);
  }, [dispatchChoosePayment, zaloPhone]);

  const handleSkipZalo = useCallback(() => {
    setIsZaloModalOpen(false);
    dispatchChoosePayment({
      agreed: false,
      phone: zaloPhone,
    });
  }, [dispatchChoosePayment, zaloPhone]);

  return {
    isProductQrScannerOpen,
    setIsProductQrScannerOpen,
    isQrModalOpen,
    setIsQrModalOpen,
    isZaloModalOpen,
    setIsZaloModalOpen,
    zaloPhone,
    setZaloPhone,
    isSendingZalo,
    isZaloSentSuccess,
    copySuccess,
    copyToClipboard,
    handleConfirmQrPaid,
    handleConfirmZaloSend,
    handleSkipZalo,
  };
}
