'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  getVisibleMobileScannerModes,
  INVENTORY_SCAN_MODE_LABELS,
  type InventoryPermissionAction,
  type InventoryRolePreviewKey,
  type InventoryScanMode,
} from '@mos-lab/shared';
import { ChevronLeft, Keyboard, ListChecks, X } from 'lucide-react';
import { apiClient } from '../../../../../lib/api-client';
import { InventoryAssignStaffModal } from './InventoryAssignStaffModal';
import { captureSquareJpegBase64, playInventoryScanSound } from './inventory-audio';

interface InventoryScannerScreenProps {
  permissions: Record<InventoryPermissionAction, boolean>;
  isClientConsultant: boolean;
  previewRole?: InventoryRolePreviewKey | null;
  previewStoreId?: number | null;
  initialMode?: InventoryScanMode;
  onBack: () => void;
  onOpenCheckList: () => void;
  onScanMutated?: () => void;
}

interface QrBoxPoints {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  width: number;
  height: number;
}

export function InventoryScannerScreen({
  permissions,
  isClientConsultant,
  previewRole,
  previewStoreId,
  initialMode,
  onBack,
  onOpenCheckList,
  onScanMutated,
}: InventoryScannerScreenProps) {
  const visibleModes = getVisibleMobileScannerModes(permissions, isClientConsultant);
  const [activeMode, setActiveMode] = useState<InventoryScanMode>(
    initialMode && visibleModes.includes(initialMode) ? initialMode : visibleModes[0] || 'item-state'
  );
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [qrBox, setQrBox] = useState<QrBoxPoints | null>(null);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null);
  const [assignModal, setAssignModal] = useState<{ warehouseItemId: number; itemName: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (!visibleModes.includes(activeMode)) {
      setActiveMode(visibleModes[0] || 'item-state');
    }
  }, [visibleModes, activeMode]);

  useEffect(() => {
    pausedRef.current = Boolean(alertModal || assignModal || isManualOpen || isBusy);
  }, [alertModal, assignModal, isManualOpen, isBusy]);

  const submitScannedCode = useCallback(
    async (rawCode: string, fromCamera: boolean) => {
      const trimmed = rawCode.trim();
      if (!trimmed || isBusy) return;

      pausedRef.current = true;
      setIsBusy(true);
      try {
        const shouldCapturePhoto =
          fromCamera && activeMode !== 'item-state' && !permissions['scan-code-bypass-upload-image'];
        const image = shouldCapturePhoto ? captureSquareJpegBase64(videoRef.current) : undefined;

        const res = await apiClient.inventory.scanCode({
          scan_code: trimmed,
          type: activeMode,
          image,
          previewRole: previewRole ?? undefined,
          previewStoreId: previewStoreId ?? undefined,
        });

        const item = res.inventory_item;
        const isValid = item?.is_valid === '1';
        playInventoryScanSound(isValid);

        if (activeMode !== 'item-state') {
          onScanMutated?.();
        }

        if (activeMode === 'item-assign-staff' && isValid && item.inventory_warehouse_item_id) {
          setAssignModal({
            warehouseItemId: Number(item.inventory_warehouse_item_id),
            itemName: item.item?.inventory_item_name || `Item #${item.inventory_warehouse_item_id}`,
          });
        } else {
          setAlertModal({
            title: isValid ? 'Success' : 'Error',
            message: item?.message || (isValid ? 'Success' : 'Error'),
          });
        }
      } catch (err: unknown) {
        playInventoryScanSound(false);
        setAlertModal({
          title: 'Error',
          message: err instanceof Error ? err.message : 'Error',
        });
      } finally {
        setIsBusy(false);
      }
    },
    [activeMode, isBusy, permissions, previewRole, previewStoreId, onScanMutated]
  );

  // Camera lifecycle
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function startCamera() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraError('Trình duyệt / kết nối HTTP không hỗ trợ mở camera. Hãy dùng localhost hoặc nút Nhập mã.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setCameraError(null);
      } catch {
        setCameraError('Không truy cập được camera. Kiểm tra quyền camera hoặc dùng nút Nhập mã để test.');
      }
    }

    void startCamera();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // jsQR detection loop (~12fps)
  useEffect(() => {
    let timerId: number | null = null;
    let active = true;

    const tick = () => {
      if (!active) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!pausedRef.current && video && canvas && video.readyState >= 2 && video.videoWidth > 0) {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);
          const decoded = jsQR(imageData.data, w, h, { inversionAttempts: 'dontInvert' });
          if (decoded?.data) {
            setQrBox({
              topLeft: decoded.location.topLeftCorner,
              topRight: decoded.location.topRightCorner,
              bottomRight: decoded.location.bottomRightCorner,
              bottomLeft: decoded.location.bottomLeftCorner,
              width: w,
              height: h,
            });
            void submitScannedCode(decoded.data, true);
          } else {
            setQrBox(null);
          }
        }
      }
      timerId = window.setTimeout(tick, 90);
    };

    timerId = window.setTimeout(tick, 250);
    return () => {
      active = false;
      if (timerId != null) window.clearTimeout(timerId);
    };
  }, [submitScannedCode]);

  return (
    <div className="flex-1 flex flex-col bg-black text-white min-h-0 relative overflow-hidden">
      {/* Header (#000000 with #FFB400 icons) */}
      <div className="h-[52px] bg-black text-[#FFB400] px-2.5 flex items-center justify-between shrink-0 z-20">
        <button type="button" onClick={onBack} className="p-1.5 cursor-pointer" aria-label="Quay lại">
          <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
        </button>

        <span className="font-semibold text-base text-[#FFB400]">Quét Mã</span>

        <div className="flex items-center gap-1 min-w-[40px] justify-end">
          {activeMode === 'inventory-check' && (
            <button
              type="button"
              onClick={onOpenCheckList}
              className="p-1.5 text-[#FFB400] cursor-pointer"
              aria-label="Mở danh sách kiểm kho"
              title="Danh sách kiểm kho"
            >
              <ListChecks className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Mode TabBar (#FFB400) */}
      <div className="h-[46px] bg-[#FFB400] flex items-stretch overflow-x-auto no-scrollbar shrink-0 z-20">
        {visibleModes.map((mode) => {
          const isActive = activeMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setActiveMode(mode)}
              className={`relative px-4 min-w-[88px] flex items-center justify-center text-xs font-bold whitespace-nowrap cursor-pointer ${
                isActive ? 'text-white bg-transparent' : 'text-[#7A5B00] bg-black/10'
              }`}
            >
              <span>{INVENTORY_SCAN_MODE_LABELS[mode]}</span>
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-black" />}
            </button>
          );
        })}
      </div>

      {/* Camera Viewfinder */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        <video ref={videoRef} playsInline muted autoPlay className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />

        {/* Green QR bounding box matching AVFoundation QR overlay */}
        {qrBox && (
          <svg
            viewBox={`0 0 ${qrBox.width} ${qrBox.height}`}
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <polygon
              points={`${qrBox.topLeft.x},${qrBox.topLeft.y} ${qrBox.topRight.x},${qrBox.topRight.y} ${qrBox.bottomRight.x},${qrBox.bottomRight.y} ${qrBox.bottomLeft.x},${qrBox.bottomLeft.y}`}
              fill="rgba(0, 208, 0, 0.12)"
              stroke="#00D000"
              strokeWidth={4}
            />
          </svg>
        )}

        {/* Center scan reticle */}
        {!cameraError && (
          <div className="w-56 h-56 border-2 border-[#FFB400]/80 rounded-xl pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.32)]" />
        )}

        {cameraError && (
          <div className="absolute inset-x-6 bg-neutral-900/90 border border-[#FFB400]/40 rounded-xl p-4 text-center">
            <div className="text-xs text-amber-300 leading-relaxed">{cameraError}</div>
            <button
              type="button"
              onClick={() => setIsManualOpen(true)}
              className="mt-3 px-4 py-1.5 rounded-lg bg-[#FFB400] text-black text-xs font-bold cursor-pointer"
            >
              Nhập mã thủ công
            </button>
          </div>
        )}

        {/* Single unobtrusive manual-input button in corner for camera-less testing */}
        <button
          type="button"
          onClick={() => setIsManualOpen(true)}
          className="absolute bottom-4 right-4 z-20 inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/75 border border-[#FFB400]/70 text-[#FFB400] text-xs font-semibold cursor-pointer shadow-lg"
        >
          <Keyboard className="w-3.5 h-3.5" />
          <span>Nhập mã</span>
        </button>
      </div>

      {/* Manual QR test input modal */}
      {isManualOpen && (
        <div className="absolute inset-0 z-40 bg-black/75 flex items-center justify-center p-5">
          <div className="w-full max-w-[330px] bg-white text-black rounded-xl overflow-hidden shadow-2xl">
            <div className="bg-black text-[#FFB400] px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm font-bold">Nhập Mã QR Test ({INVENTORY_SCAN_MODE_LABELS[activeMode]})</span>
              <button type="button" onClick={() => setIsManualOpen(false)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              className="p-4 flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                const code = manualCode.trim();
                setIsManualOpen(false);
                if (code) {
                  setManualCode('');
                  void submitScannedCode(code, false);
                }
              }}
            >
              <input
                type="text"
                autoFocus
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Dán scan_code hoặc URL QR..."
                className="w-full px-3 py-2 rounded border border-neutral-300 text-sm text-black focus:outline-none focus:border-[#FFB400]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsManualOpen(false)}
                  className="px-3 py-1.5 rounded border border-neutral-300 text-xs font-semibold text-neutral-700 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#FFB400] text-black text-xs font-bold cursor-pointer"
                >
                  Quét
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Staff Modal triggered on item-assign-staff scan */}
      <InventoryAssignStaffModal
        open={Boolean(assignModal)}
        warehouseItemId={assignModal?.warehouseItemId ?? null}
        itemName={assignModal?.itemName || ''}
        previewRole={previewRole}
        previewStoreId={previewStoreId}
        onClose={() => setAssignModal(null)}
        onSuccess={(msg) => {
          setAssignModal(null);
          setAlertModal({ title: 'Success', message: msg });
        }}
      />

      {/* Legacy blocking OK Alert Dialog (pauses camera until user clicks OK) */}
      {alertModal && (
        <div className="absolute inset-0 z-50 bg-black/65 flex items-center justify-center p-6">
          <div className="w-full max-w-[300px] bg-white rounded-xl p-4 text-center shadow-2xl">
            <div className="font-bold text-base text-black">{alertModal.title}</div>
            <pre className="text-xs text-neutral-800 whitespace-pre-wrap font-sans mt-2 leading-relaxed">
              {alertModal.message}
            </pre>
            <button
              type="button"
              onClick={() => setAlertModal(null)}
              className="mt-4 w-full py-2 rounded bg-[#FFB400] text-black font-bold text-xs cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
