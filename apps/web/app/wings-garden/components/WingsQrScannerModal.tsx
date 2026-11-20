'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, CheckCircle2, Keyboard, QrCode, Search, ShieldAlert, X } from 'lucide-react';
import type {
  WingsGardenLegacyQrLookup,
  WingsGardenLiveSampleQr,
  WingsGardenOverlayItem,
  WingsGardenPayMethod,
  WingsGardenSkuConfig,
  WingsGardenWarehouseId,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { FeatherSvg } from './GardenVisuals';

export interface WingsQrScannerModalProps {
  open: boolean;
  isDark: boolean;
  warehouseId: WingsGardenWarehouseId;
  warehouseShortName: string;
  initialSku: WingsGardenSkuConfig | null;
  initialPayMethod: WingsGardenPayMethod;
  activeItems: WingsGardenOverlayItem[];
  sampleStickers: WingsGardenLiveSampleQr[];
  busy: boolean;
  onScanSubmit: (params: { scanCode: string; skuId?: string; payMethod: WingsGardenPayMethod }) => Promise<boolean>;
  onScanImport: (scanCode: string) => Promise<boolean>;
  onClose: () => void;
}

export function WingsQrScannerModal({
  open,
  isDark,
  warehouseId,
  warehouseShortName,
  initialSku,
  initialPayMethod,
  activeItems,
  sampleStickers,
  busy,
  onScanSubmit,
  onScanImport,
  onClose,
}: WingsQrScannerModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastCheckAtRef = useRef<number>(0);
  const recentCodesRef = useRef<Map<string, number>>(new Map());
  const inFlightRef = useRef<boolean>(false);

  const [scanMode, setScanMode] = useState<'USE_OR_HARVEST' | 'IMPORT'>('USE_OR_HARVEST');
  const [payMethod, setPayMethod] = useState<WingsGardenPayMethod>(initialPayMethod);
  const [comboScan, setComboScan] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'starting' | 'active' | 'unavailable'>('idle');
  const [cameraNotice, setCameraNotice] = useState<string>('');
  const [lookupResult, setLookupResult] = useState<WingsGardenLegacyQrLookup | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setPayMethod(initialPayMethod);
  }, [initialPayMethod, open]);

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
          // ignore stop error
        }
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleSubmitCode = useCallback(
    async (rawCode: string, explicitSkuId?: string, source: 'camera' | 'manual' | 'chip' = 'manual') => {
      const cleaned = rawCode.trim();
      if (!cleaned || inFlightRef.current) return;

      if (source === 'camera') {
        const prevTs = recentCodesRef.current.get(cleaned) || 0;
        if (Date.now() - prevTs < 1800) return;
        recentCodesRef.current.set(cleaned, Date.now());
      }

      inFlightRef.current = true;
      try {
        const ok =
          scanMode === 'IMPORT'
            ? await onScanImport(cleaned)
            : await onScanSubmit({
                scanCode: cleaned,
                skuId: explicitSkuId || initialSku?.skuId,
                payMethod,
              });
        if (ok) {
          if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            try {
              navigator.vibrate(70);
            } catch {
              // ignore haptic unsupported
            }
          }
          setFeedback({ type: 'success', text: `Đã xử lý thành công tem ${cleaned}!` });
          setManualCode('');
          setLookupResult(null);
          if (!comboScan) {
            onClose();
          }
        }
      } finally {
        inFlightRef.current = false;
      }
    },
    [comboScan, initialSku?.skuId, onClose, onScanImport, onScanSubmit, payMethod, scanMode]
  );

  const submitRef = useRef(handleSubmitCode);
  useEffect(() => {
    submitRef.current = handleSubmitCode;
  }, [handleSubmitCode]);

  // Sync native <dialog> open/close + Safari closedby="any" fallback + returnValue reset
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }

    const handleClose = () => {
      dialog.returnValue = '';
      if (open) onClose();
    };
    dialog.addEventListener('close', handleClose);

    let cleanupFallback: (() => void) | undefined;
    if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const isOutside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      const onDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e);
      };
      const onUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e)) dialog.close();
      };
      dialog.addEventListener('pointerdown', onDown);
      dialog.addEventListener('pointerup', onUp);
      cleanupFallback = () => {
        dialog.removeEventListener('pointerdown', onDown);
        dialog.removeEventListener('pointerup', onUp);
      };
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      cleanupFallback?.();
    };
  }, [open, onClose]);

  // Camera lifecycle
  useEffect(() => {
    if (!open) {
      stopCamera();
      setCameraStatus('idle');
      setCameraNotice('');
      setFeedback(null);
      setLookupResult(null);
      recentCodesRef.current.clear();
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unavailable');
      setCameraNotice('Thiết bị không mở được camera trực tiếp (hãy dùng HTTPS trên iPhone hoặc nhập mã bên dưới).');
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
            width: { ideal: 1080 },
            height: { ideal: 1080 },
            aspectRatio: { ideal: 1 },
          },
          audio: false,
        })
      )
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const [videoTrack] = stream.getVideoTracks();
        if (videoTrack && typeof videoTrack.applyConstraints === 'function') {
          try {
            await videoTrack.applyConstraints({
              advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
            });
          } catch {
            // Focus constraints optional on Safari
          }
        }
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

        const scanLoop = (ts: number) => {
          if (cancelled) return;
          if (ts - lastCheckAtRef.current >= 110) {
            lastCheckAtRef.current = ts;
            const v = videoRef.current;
            const c = canvasRef.current;
            if (v && c && v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0) {
              const vw = v.videoWidth;
              const vh = v.videoHeight;
              const side = Math.min(vw, vh);
              const sx = Math.floor((vw - side) / 2);
              const sy = Math.floor((vh - side) / 2);
              const target = Math.min(640, side);
              if (c.width !== target || c.height !== target) {
                c.width = target;
                c.height = target;
              }
              const ctx = c.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(v, sx, sy, side, side, 0, 0, target, target);
                const img = ctx.getImageData(0, 0, target, target);
                const decoded = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
                if (decoded?.data) {
                  void submitRef.current(decoded.data, undefined, 'camera');
                }
              }
            }
          }
          rafRef.current = requestAnimationFrame(scanLoop);
        };
        rafRef.current = requestAnimationFrame(scanLoop);
      })
      .catch(() => {
        if (cancelled) return;
        setCameraStatus('unavailable');
        setCameraNotice(
          'Chưa cấp quyền Camera hoặc đang mở qua HTTP. Anh vẫn tra cứu & quét mã #serial ở bên dưới bình thường.'
        );
      });

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, stopCamera]);

  const handleLookupPreview = async () => {
    const clean = manualCode.trim();
    if (!clean) return;
    try {
      const res = await apiClient.wingsGarden.lookupQr({ code: clean, warehouseId });
      setLookupResult(res.lookup);
      if (!res.lookup.found) {
        setFeedback({
          type: 'error',
          text: `Không thấy mã "${clean}" trên kho legacy — vẫn có thể nhận theo SKU đã chọn.`,
        });
      } else {
        setFeedback({
          type: 'success',
          text: `Khớp Legacy: ${res.lookup.itemName} (${res.lookup.legacyState || 'New'})`,
        });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Lỗi tra cứu mã QR.' });
    }
  };

  const ripeItems = activeItems.filter((i) => i.state === 'USING' && i.remainingPct <= 0);
  const filteredSamples = initialSku
    ? sampleStickers.filter((s) => s.skuId === initialSku.skuId)
    : sampleStickers.slice(0, 5);

  return (
    <dialog
      ref={dialogRef}
      className="wg-dialog"
      {...({ closedby: 'any' } as Record<string, unknown>)}
      aria-labelledby="wg-scanner-title"
    >
      <div
        className={`rounded-3xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-amber-200'
        }`}
      >
        {/* Header: Title Left, [✕] End Right */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/15 to-transparent">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
              <QrCode className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="wg-scanner-title" className="text-sm font-bold truncate">
                {initialSku ? `Quét nhận: ${initialSku.name}` : 'Máy Quét QR Thiên Đường'}
              </h2>
              <p className="text-xs opacity-75 truncate">Đọc live tem QR từ kho {warehouseShortName}</p>
            </div>
          </div>
          <form method="dialog">
            <button
              type="submit"
              value="close"
              aria-label="Đóng máy quét QR"
              className="w-8 h-8 rounded-full border border-amber-500/30 flex items-center justify-center text-sm font-bold hover:bg-amber-500/15 cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>
        </div>

        <div className="p-4 space-y-3 max-h-[78vh] overflow-y-auto">
          {/* 3-Stage Unique QR Stage Mode Toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <button
              type="button"
              onClick={() => setScanMode('USE_OR_HARVEST')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold cursor-pointer ${
                scanMode === 'USE_OR_HARVEST' ? 'bg-emerald-600 text-white shadow-xs' : 'opacity-75'
              }`}
            >
              Dùng / Gặt (USING · USED)
            </button>
            <button
              type="button"
              onClick={() => setScanMode('IMPORT')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold cursor-pointer ${
                scanMode === 'IMPORT' ? 'bg-sky-600 text-white shadow-xs' : 'opacity-75'
              }`}
            >
              Scan Nhập Kho (NEW)
            </button>
          </div>

          {/* Payment Mode & Combo Toggle */}
          {scanMode === 'USE_OR_HARVEST' ? (
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-amber-500/10 border border-amber-500/25">
              <button
                type="button"
                onClick={() => setPayMethod('FEATHER')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer ${
                  payMethod === 'FEATHER' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'opacity-75'
                }`}
              >
                <FeatherSvg className="w-3.5 h-3.5 text-amber-700" />
                <span>Đổi Lông</span>
              </button>
              <button
                type="button"
                onClick={() => setPayMethod('CASH')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer ${
                  payMethod === 'CASH' ? 'bg-slate-950 text-amber-300 shadow-xs' : 'opacity-75'
                }`}
              >
                <span>Mua Niêm Yết (VNĐ)</span>
              </button>
            </div>
          ) : (
            <div className="px-3 py-2 rounded-xl border border-sky-500/30 bg-sky-500/10 text-xs font-semibold">
              Quét mã QR hàng mới nhập kho shop để nhận thưởng Lông (mỗi tem nhận tối đa 1 lần cho bước NEW).
            </div>
          )}

          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <span className="text-xs font-semibold">Quét Liên Thanh ⚡ (giữ camera mở)</span>
            <button
              type="button"
              onClick={() => setComboScan((prev) => !prev)}
              className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer ${
                comboScan ? 'bg-amber-500 text-slate-950' : 'bg-slate-500/20 opacity-80'
              }`}
            >
              {comboScan ? 'Đang Bật' : 'Tắt'}
            </button>
          </div>

          {/* Camera Viewport — Large edge-to-edge Square for easy iPhone QR scanning */}
          <div className="relative mx-auto w-full max-w-[300px] sm:max-w-[320px] aspect-square rounded-2xl bg-slate-950 text-white overflow-hidden border-2 border-amber-500/50 shadow-inner">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover ${cameraStatus === 'active' ? 'block' : 'hidden'}`}
            />
            <canvas ref={canvasRef} className="hidden" />
            {cameraStatus !== 'active' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center space-y-1.5">
                <Camera className="w-8 h-8 text-amber-400 mx-auto" aria-hidden="true" />
                <div className="text-xs font-semibold text-amber-200">
                  {cameraStatus === 'starting' ? 'Đang bật camera sau iPhone...' : 'Camera chưa khả dụng'}
                </div>
                {cameraNotice && <p className="text-xs text-slate-300">{cameraNotice}</p>}
              </div>
            )}
            <div className="pointer-events-none absolute inset-5 rounded-xl border border-amber-400/35">
              <span className="absolute -top-0.5 -left-0.5 w-7 h-7 border-t-4 border-l-4 border-amber-400 rounded-tl-xl" />
              <span className="absolute -top-0.5 -right-0.5 w-7 h-7 border-t-4 border-r-4 border-amber-400 rounded-tr-xl" />
              <span className="absolute -bottom-0.5 -left-0.5 w-7 h-7 border-b-4 border-l-4 border-amber-400 rounded-bl-xl" />
              <span className="absolute -bottom-0.5 -right-0.5 w-7 h-7 border-b-4 border-r-4 border-amber-400 rounded-br-xl" />
            </div>
          </div>

          {/* Manual Serial / QR Input + Live Lookup */}
          <div className="space-y-1.5">
            <label htmlFor="wg-manual-qr" className="text-xs font-bold flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
              Nhập tay mã QR hoặc số #serial (VD: #4509466, #4421750)
            </label>
            <div className="flex gap-1.5">
              <input
                id="wg-manual-qr"
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Quét hoặc gõ mã tem..."
                className={`flex-1 px-3 py-2 rounded-xl border text-xs tabular-nums focus:outline-none focus:border-amber-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
              <button
                type="button"
                onClick={() => void handleLookupPreview()}
                disabled={!manualCode.trim() || busy}
                className="px-2.5 py-2 rounded-xl border border-amber-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <Search className="w-3.5 h-3.5" aria-hidden="true" />
                Soi
              </button>
              <button
                type="button"
                onClick={() => void handleSubmitCode(manualCode, initialSku?.skuId, 'manual')}
                disabled={!manualCode.trim() || busy}
                className="px-3 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer disabled:opacity-40"
              >
                {busy ? '...' : 'Xác nhận'}
              </button>
            </div>
          </div>

          {feedback && (
            <div
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              ) : (
                <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {lookupResult && lookupResult.found && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1 tabular-nums">
              <div className="font-bold">
                {lookupResult.itemName} · #{lookupResult.numericSerial || lookupResult.cleanedCode}
              </div>
              <div className="opacity-80">
                Kho: {lookupResult.warehouseName || warehouseShortName} · Trạng thái Legacy: {lookupResult.legacyState}{' '}
                · Niêm yết:{' '}
                {lookupResult.retailPriceVnd ? `${lookupResult.retailPriceVnd.toLocaleString('vi-VN')}đ` : 'Theo SKU'}
              </div>
            </div>
          )}

          {/* Quick Live QR Chips from Production Legacy DB & Garden */}
          {ripeItems.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-amber-500">Vỏ chín vàng chờ quét USED:</div>
              <div className="space-y-1.5">
                {ripeItems.map((it) => (
                  <button
                    key={it.uid}
                    type="button"
                    disabled={busy}
                    onClick={() => void handleSubmitCode(it.scanCode, it.skuId, 'chip')}
                    className="w-full p-2.5 rounded-xl border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 flex items-center justify-between text-left cursor-pointer"
                  >
                    <span className="text-xs font-bold tabular-nums">
                      {it.scanCode} · {it.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold tabular-nums">
                      +{it.cashbackFeathers} Lông
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredSamples.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-emerald-500">
                Tem NEW thật từ kho {warehouseShortName} (chạm để test quét nhanh):
              </div>
              <div className="space-y-1.5">
                {filteredSamples.map((s) => (
                  <button
                    key={s.scanCode}
                    type="button"
                    disabled={busy}
                    onClick={() => void handleSubmitCode(s.scanCode, s.skuId || initialSku?.skuId, 'chip')}
                    className="w-full p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:border-amber-500 flex items-center justify-between text-left cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold truncate tabular-nums">
                        #{s.serialNumber} · {s.skuName}
                      </div>
                      <div className="text-xs opacity-70 truncate tabular-nums">
                        QR: {s.scanCode} {s.isLiveFromDb ? '· Live DB' : '· Mẫu'}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-xs font-bold shrink-0 tabular-nums">
                      {payMethod === 'CASH' ? `${s.retailPriceVnd.toLocaleString('vi-VN')}đ` : 'Quét nhận'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
