'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, CheckCircle2, Keyboard, QrCode, ShieldAlert, Trash2, X } from 'lucide-react';
import type { IosScannedProductCatalogMatch } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import type { BookingItem } from '../../state/mockData';
import { collectScannedWarehouseItemIds, formatCartProductDisplayName } from '../screens/upsell/upsellCheckoutHelpers';

export interface ProductQrScannerModalProps {
  open: boolean;
  isDark: boolean;
  bookingId: number;
  cartProducts: NonNullable<BookingItem['cartProducts']>;
  onScannedProduct: (product: IosScannedProductCatalogMatch) => void;
  onRemoveUnit: (productIndex: number, inventoryWarehouseItemId?: number) => void;
  onClose: () => void;
}

type CameraStatus = 'idle' | 'starting' | 'active' | 'unavailable';

export function ProductQrScannerModal({
  open,
  isDark,
  bookingId,
  cartProducts,
  onScannedProduct,
  onRemoveUnit,
  onClose,
}: ProductQrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScanCheckAtRef = useRef<number>(0);
  const recentCodesRef = useRef<Map<string, number>>(new Map());
  const inFlightRef = useRef<boolean>(false);

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [cameraNotice, setCameraNotice] = useState<string>('');
  const [manualCode, setManualCode] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const scannedItemIds = useMemo(() => collectScannedWarehouseItemIds(cartProducts), [cartProducts]);
  const scannedItemIdsRef = useRef<number[]>(scannedItemIds);
  useEffect(() => {
    scannedItemIdsRef.current = scannedItemIds;
  }, [scannedItemIds]);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        try {
          track.stop();
        } catch {
          // ignore cleanup failure
        }
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const submitScannedCode = useCallback(
    async (rawCode: string, source: 'camera' | 'manual') => {
      const cleaned = rawCode.trim();
      if (!cleaned || inFlightRef.current) return;

      if (source === 'camera') {
        const lastTs = recentCodesRef.current.get(cleaned) || 0;
        if (Date.now() - lastTs < 1800) {
          return;
        }
        recentCodesRef.current.set(cleaned, Date.now());
      }

      inFlightRef.current = true;
      setSubmitting(true);
      try {
        const res = await apiClient.ios.scanProduct({
          bookingId,
          code: cleaned,
          scannedItemIds: scannedItemIdsRef.current,
        });

        if (res?.success && res.product) {
          if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            try {
              navigator.vibrate(80);
            } catch {
              // ignore haptic errors on unsupported browsers
            }
          }
          const serialNum = res.product.scannedUnit.firstInventoryWarehouseOrderItemId;
          const serialLabel = serialNum > 0 ? `#${serialNum}` : res.product.scannedUnit.scanCode;
          onScannedProduct(res.product);
          setFeedback({
            type: 'success',
            text: `Đã thêm ${formatCartProductDisplayName(res.product.productName)} · ${serialLabel}`,
          });
          if (source === 'manual') {
            setManualCode('');
          }
        } else {
          setFeedback({
            type: 'error',
            text: res?.error || 'Mã QR không hợp lệ hoặc không còn tồn kho New tại chi nhánh.',
          });
        }
      } catch (err: any) {
        const apiError =
          err?.response?.data?.error || err?.message || 'Không thể kiểm tra mã QR sản phẩm. Vui lòng thử lại.';
        setFeedback({ type: 'error', text: String(apiError) });
      } finally {
        inFlightRef.current = false;
        setSubmitting(false);
      }
    },
    [bookingId, onScannedProduct]
  );

  const submitRef = useRef(submitScannedCode);
  useEffect(() => {
    submitRef.current = submitScannedCode;
  }, [submitScannedCode]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setCameraStatus('idle');
      setCameraNotice('');
      setFeedback(null);
      setManualCode('');
      recentCodesRef.current.clear();
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unavailable');
      setCameraNotice('Trình duyệt / thiết bị không hỗ trợ camera trực tiếp. Nhập mã QR hoặc số #serial bên dưới.');
      return;
    }

    let cancelled = false;
    setCameraStatus('starting');
    setCameraNotice('');

    Promise.resolve()
      .then(() =>
        navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
      )
      .then(async (stream) => {
        if (cancelled) {
          stream?.getTracks?.().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          try {
            await video.play?.();
          } catch {
            // Safari autoplay fallback
          }
        }
        setCameraStatus('active');

        const scanLoop = (timestamp: number) => {
          if (cancelled) return;
          if (timestamp - lastScanCheckAtRef.current >= 130) {
            lastScanCheckAtRef.current = timestamp;
            const currentVideo = videoRef.current;
            const canvas = canvasRef.current;
            if (
              currentVideo &&
              canvas &&
              currentVideo.readyState >= 2 &&
              currentVideo.videoWidth > 0 &&
              currentVideo.videoHeight > 0
            ) {
              if (canvas.width !== currentVideo.videoWidth) {
                canvas.width = currentVideo.videoWidth;
                canvas.height = currentVideo.videoHeight;
              }
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(currentVideo, 0, 0, canvas.width, canvas.height);
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const decoded = jsQR(imgData.data, imgData.width, imgData.height, {
                  inversionAttempts: 'dontInvert',
                });
                if (decoded?.data) {
                  void submitRef.current(decoded.data, 'camera');
                }
              }
            }
          }
          rafRef.current = requestAnimationFrame(scanLoop);
        };

        if (typeof requestAnimationFrame === 'function') {
          rafRef.current = requestAnimationFrame(scanLoop);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setCameraStatus('unavailable');
        setCameraNotice(
          'Chưa cấp quyền Camera hoặc kết nối HTTP không hỗ trợ camera. Hãy nhập mã QR / #serial bên dưới.'
        );
      });

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, stopCamera]);

  if (!open) return null;

  const totalUnitsInCart = cartProducts.reduce((sum, item) => sum + Math.max(0, Number(item.quantity || 0)), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-150"
      data-testid="product-qr-scanner-modal"
    >
      <div className="fixed inset-0 bg-black/70 backdrop-blur-xs" onClick={onClose} />
      <div
        className={`relative ${
          isDark ? 'bg-[#1C1C1E] text-white border-neutral-800' : 'bg-white text-neutral-900 border-neutral-200'
        } rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-4 sm:p-5 shadow-2xl space-y-3.5 max-h-[92vh] overflow-y-auto z-10 border`}
      >
        {/* Header: Title Left, Close Right */}
        <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-[var(--mos-surface-border)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isDark ? 'bg-amber-400/20 text-amber-300' : 'bg-amber-100 text-amber-800'
              }`}
            >
              <QrCode className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-black leading-tight truncate">Quét QR Thêm Sản Phẩm</h3>
              <p className="text-[11px] text-[var(--mos-text-muted)] mt-0.5 truncate">
                Quét 1 chạm thêm thẳng · Giữ camera để quét cây tiếp theo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng trình quét QR"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
              isDark
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Viewfinder */}
        <div
          className={`relative rounded-2xl overflow-hidden border ${
            isDark ? 'bg-black border-neutral-800' : 'bg-neutral-950 border-neutral-300'
          }`}
        >
          <div className="relative w-full aspect-[16/10] flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover ${cameraStatus === 'active' ? 'opacity-100' : 'opacity-20'}`}
            />
            <canvas ref={canvasRef} className="hidden" />

            {cameraStatus === 'active' && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-4">
                <div className="w-44 h-44 rounded-2xl border-2 border-[#FFB400] shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] relative">
                  <span className="absolute -top-0.5 -left-0.5 w-5 h-5 border-t-4 border-l-4 border-[#FFB400] rounded-tl-xl" />
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 border-t-4 border-r-4 border-[#FFB400] rounded-tr-xl" />
                  <span className="absolute -bottom-0.5 -left-0.5 w-5 h-5 border-b-4 border-l-4 border-[#FFB400] rounded-bl-xl" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 border-b-4 border-r-4 border-[#FFB400] rounded-br-xl" />
                </div>
                <span className="mt-2.5 text-[11px] font-bold text-white bg-black/65 px-2.5 py-1 rounded-full">
                  Đưa tem QR trên hộp vào khung vàng
                </span>
              </div>
            )}

            {cameraStatus !== 'active' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-5 gap-2 text-white">
                <Camera className="w-7 h-7 text-[#FFB400]" aria-hidden="true" />
                <p className="text-[12px] font-semibold leading-snug max-w-xs text-neutral-200">
                  {cameraStatus === 'starting'
                    ? 'Đang bật camera sau...'
                    : cameraNotice || 'Chưa kích hoạt được camera.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Scan Result Banner */}
        {feedback && (
          <div
            data-testid={feedback.type === 'success' ? 'qr-scan-success-banner' : 'qr-scan-error-banner'}
            className={`rounded-xl px-3 py-2.5 border flex items-start gap-2 text-[12px] font-bold leading-snug ${
              feedback.type === 'success'
                ? isDark
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : isDark
                  ? 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <span className="flex-1">{feedback.text}</span>
          </div>
        )}

        {/* Manual Code / #Serial Fallback */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitScannedCode(manualCode, 'manual');
          }}
          className={`rounded-2xl p-3 border space-y-2 ${
            isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--mos-text-muted)]">
            <Keyboard className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
            <span>Nhập tay dự phòng nếu tem mờ / rách (mã QR hoặc số #serial)</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              data-testid="qr-manual-code-input"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="VD: QR-YEPPEUM-01 hoặc #1045"
              className={`flex-1 min-h-[44px] px-3 rounded-xl border text-[13px] font-mono outline-none transition-colors ${
                isDark
                  ? 'bg-black border-neutral-700 text-white focus:border-[#FFB400]'
                  : 'bg-white border-neutral-300 text-neutral-900 focus:border-[#FF9500]'
              }`}
            />
            <button
              type="submit"
              data-testid="qr-manual-submit-btn"
              disabled={submitting || !manualCode.trim()}
              className={`min-h-[44px] px-4 rounded-xl font-black text-[13px] shrink-0 transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                isDark ? 'bg-[#FFB400] text-black hover:bg-[#ffc233]' : 'bg-[#FF9500] text-white hover:bg-[#e88700]'
              }`}
            >
              {submitting ? 'Đang kiểm...' : 'Thêm'}
            </button>
          </div>
        </form>

        {/* Live Scanned Cart Units */}
        {cartProducts.length > 0 && (
          <div
            className={`rounded-2xl p-3 border space-y-2 ${
              isDark ? 'bg-neutral-900/70 border-neutral-800' : 'bg-white border-neutral-200'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-[var(--mos-text-muted)]">
              <span>Đã gắn vào đơn ({totalUnitsInCart} cây/SP)</span>
              <span className="tabular-nums text-amber-500">
                {cartProducts.reduce((s, p) => s + p.price * p.quantity, 0).toLocaleString('vi-VN')}đ
              </span>
            </div>
            <div className="space-y-2 max-h-36 overflow-y-auto pr-0.5">
              {cartProducts.map((item, productIdx) => {
                const units = item.scannedUnits || [];
                const cleanName = formatCartProductDisplayName(item.productName);
                return (
                  <div key={`${item.productId}-${productIdx}`} className="space-y-1">
                    <div className="flex items-center justify-between text-[12px] font-bold">
                      <span className="truncate">{cleanName}</span>
                      <span className="tabular-nums shrink-0 text-[var(--mos-text-muted)]">×{item.quantity}</span>
                    </div>
                    {units.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {units.map((unit) => {
                          const label =
                            unit.firstInventoryWarehouseOrderItemId > 0
                              ? `#${unit.firstInventoryWarehouseOrderItemId}`
                              : unit.scanCode;
                          return (
                            <button
                              key={unit.inventoryWarehouseItemId}
                              type="button"
                              onClick={() => onRemoveUnit(productIdx, unit.inventoryWarehouseItemId)}
                              aria-label={`Xóa mã ${label}`}
                              className={`min-h-[34px] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11.5px] font-bold tabular-nums cursor-pointer transition-colors ${
                                isDark
                                  ? 'bg-neutral-800 border-neutral-700 text-neutral-100 hover:border-rose-500/70'
                                  : 'bg-neutral-100 border-neutral-200 text-neutral-800 hover:border-rose-400'
                              }`}
                            >
                              <span>{label}</span>
                              <X className="w-3.5 h-3.5 text-rose-500" aria-hidden="true" />
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRemoveUnit(productIdx)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Bớt 1 sản phẩm</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Action */}
        <button
          type="button"
          data-testid="qr-scanner-done-btn"
          onClick={onClose}
          className={`w-full min-h-[46px] rounded-2xl font-black text-[14px] flex items-center justify-center gap-2 cursor-pointer transition-all ${
            isDark ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          <span>{totalUnitsInCart > 0 ? `Xong (${totalUnitsInCart} sản phẩm)` : 'Đóng'}</span>
        </button>
      </div>
    </div>
  );
}
