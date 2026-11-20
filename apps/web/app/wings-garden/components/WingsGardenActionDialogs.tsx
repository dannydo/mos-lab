'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import {
  computeItemDaysOpened,
  isWingsGardenGlueExpired,
  WingsGardenActionResponse,
  WingsGardenOverlayItem,
} from '@mos-lab/shared';
import { ChestIconSvg, FeatherSvg, SupplyIconSvg } from './GardenVisuals';

function useNativeModalSync(dialogRef: React.RefObject<HTMLDialogElement | null>, open: boolean, onClose: () => void) {
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
  }, [dialogRef, open, onClose]);
}

export interface ItemInspectorDialogProps {
  item: WingsGardenOverlayItem | null;
  isDark: boolean;
  fmAllowed: boolean;
  busy: boolean;
  nowMs: number;
  onConsumeStep: (uid: string) => void;
  onHarvestUsed: (item: WingsGardenOverlayItem) => void;
  onOpenInsurance: () => void;
  onClose: () => void;
}

export function ItemInspectorDialog({
  item,
  isDark,
  fmAllowed,
  busy,
  nowMs,
  onConsumeStep,
  onHarvestUsed,
  onOpenInsurance,
  onClose,
}: ItemInspectorDialogProps) {
  const ref = useRef<HTMLDialogElement | null>(null);
  useNativeModalSync(ref, Boolean(item), onClose);

  const daysOpened = item ? computeItemDaysOpened(item, nowMs) : 0;
  const expired = item ? isWingsGardenGlueExpired(item, nowMs) : false;

  return (
    <dialog
      ref={ref}
      className="wg-dialog"
      {...({ closedby: 'any' } as Record<string, unknown>)}
      aria-labelledby="wg-inspector-title"
    >
      <div
        className={`rounded-3xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-amber-200'
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/15 to-transparent">
          <div className="min-w-0">
            <h2 id="wg-inspector-title" className="text-sm font-bold truncate">
              {item?.name || 'Chi tiết vật tư'}
            </h2>
            <p className="text-xs opacity-75 tabular-nums truncate">
              {item ? `Tem QR ${item.scanCode} · ${item.ownerName} · Mở ${daysOpened} ngày` : ''}
            </p>
          </div>
          <form method="dialog">
            <button
              type="submit"
              value="close"
              aria-label="Đóng chi tiết vật tư"
              className="w-8 h-8 rounded-full border border-amber-500/30 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>
        </div>

        {item && (
          <div className="p-4 space-y-3 max-h-[72vh] overflow-y-auto">
            <div className="flex items-center gap-3 p-3 rounded-2xl border border-amber-500/20 bg-amber-500/5">
              <SupplyIconSvg
                category={item.category}
                skuId={item.skuId}
                isRipe={item.remainingPct <= 0}
                isExpired={expired}
              />
              <div className="flex-1 min-w-0 tabular-nums">
                <div className="text-xs font-bold">
                  Còn lại: {item.remainingPct}% · {item.payLabel}
                </div>
                {item.freshLimitDays && (
                  <div className="text-xs opacity-75">
                    Hạn tươi: {daysOpened}/{item.freshLimitDays} ngày
                  </div>
                )}
                {expired && (
                  <div className="text-xs font-bold text-rose-500 mt-1">
                    ⚠️ Keo quá hạn &gt;21 ngày — cần thay keo tươi!
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider opacity-70">
                Lịch sử vòng đời (Chuẩn Bảo Hân)
              </div>
              <div className="space-y-2 p-3 rounded-2xl border border-amber-500/20 bg-amber-500/5">
                {item.timeline.map((t, idx) => (
                  <div key={`${t.time}-${idx}`} className="flex items-start gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <div>
                      <div className="font-semibold">
                        {t.actor} <span className="opacity-65 font-normal tabular-nums">({t.time})</span>
                      </div>
                      <div className="opacity-80">{t.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {item.remainingPct > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onConsumeStep(item.uid)}
                  className="w-full py-2.5 px-3 rounded-xl bg-sky-500/15 text-sky-500 border border-sky-500/40 text-xs font-bold cursor-pointer"
                >
                  🪄 Đánh dấu đã dùng thêm (-35%)
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => onHarvestUsed(item)}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer tabular-nums"
              >
                🌾 Quét Thu Hoạch Vỏ Rỗng (USED · +{item.cashbackFeathers} Lông Tái Sinh)
              </button>
              {fmAllowed && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    onClose();
                    onOpenInsurance();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/40 text-xs font-bold cursor-pointer"
                >
                  🛡️ FM/Admin: Hoàn Lông Bảo Hiểm (Vỡ/Lỗi)
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}

export function ChestRewardDialog({
  outcome,
  isDark,
  onClose,
}: {
  outcome: WingsGardenActionResponse['chestOutcome'] | null;
  isDark: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement | null>(null);
  useNativeModalSync(ref, Boolean(outcome), onClose);

  return (
    <dialog
      ref={ref}
      className="wg-dialog"
      {...({ closedby: 'any' } as Record<string, unknown>)}
      aria-labelledby="wg-chest-title"
    >
      <div
        className={`rounded-3xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-amber-200'
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/20 to-transparent">
          <h2 id="wg-chest-title" className="text-sm font-bold">
            Mở Rương Thiên Đường Nối Lông
          </h2>
          <form method="dialog">
            <button
              type="submit"
              value="close"
              aria-label="Đóng hộp quà rương"
              className="w-8 h-8 rounded-full border border-amber-500/30 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>
        </div>

        {outcome && (
          <div className="p-5 flex flex-col items-center text-center gap-3">
            <ChestIconSvg kind={outcome.chestKind} className="w-16 h-16" />
            {outcome.rewardType === 'PERK' && outcome.perkCard ? (
              <>
                <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/40 text-xs font-bold">
                  🎉 TRÚNG THẺ ĐẶC QUYỀN HẠNH KIỂM
                </span>
                <div className="text-base font-extrabold">{outcome.perkCard.title}</div>
                <p className="text-xs opacity-80">{outcome.perkCard.rule}</p>
                <div className="w-full p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-500 font-semibold tabular-nums">
                  Hạn dùng: {outcome.perkCard.validDays} ngày · Đã cất vào Túi Thẻ
                </div>
              </>
            ) : (
              <>
                <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/40 text-xs font-bold">
                  ✨ TÚI LÔNG THIÊN ĐƯỜNG
                </span>
                <div className="text-2xl font-extrabold text-amber-500 flex items-center gap-2 tabular-nums">
                  +{outcome.feathersAwarded} Lông <FeatherSvg className="w-6 h-6 text-amber-400" />
                </div>
                <p className="text-xs opacity-80">Đã cộng vào Ví Lông Vàng để đổi NVL hoặc Kết Cánh.</p>
              </>
            )}
            <form method="dialog" className="w-full">
              <button
                type="submit"
                value="ok"
                className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Tuyệt vời
              </button>
            </form>
          </div>
        )}
      </div>
    </dialog>
  );
}

export function FmInsuranceDialog({
  open,
  isDark,
  busy,
  onGrant,
  onClose,
}: {
  open: boolean;
  isDark: boolean;
  busy: boolean;
  onGrant: (reason: string, amountFeathers: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement | null>(null);
  useNativeModalSync(ref, open, onClose);

  const reasons = [
    { reason: 'Keo bị đông / lỗi nhà sản xuất', amount: 28 },
    { reason: 'Rơi vỡ ngoài ý muốn trong ca làm', amount: 16 },
    { reason: 'Hỗ trợ Thiên Thần đang giai đoạn học việc', amount: 20 },
  ];

  return (
    <dialog
      ref={ref}
      className="wg-dialog"
      {...({ closedby: 'any' } as Record<string, unknown>)}
      aria-labelledby="wg-insurance-title"
    >
      <div
        className={`rounded-3xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-amber-200'
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-emerald-500/20 bg-gradient-to-r from-emerald-500/15 to-transparent">
          <div>
            <h2 id="wg-insurance-title" className="text-sm font-bold">
              Hoàn Lông Bảo Hiểm (FM / Admin)
            </h2>
            <p className="text-xs opacity-75">Hỗ trợ ngay để không bao giờ đứt ca khách</p>
          </div>
          <form method="dialog">
            <button
              type="submit"
              value="close"
              aria-label="Đóng hộp thoại bảo hiểm"
              className="w-8 h-8 rounded-full border border-emerald-500/30 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>
        </div>

        <div className="p-4 space-y-2">
          {reasons.map((r) => (
            <button
              key={r.reason}
              type="button"
              disabled={busy}
              onClick={() => onGrant(r.reason, r.amount)}
              className="w-full p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 flex items-center justify-between text-left cursor-pointer"
            >
              <span className="text-xs font-semibold">{r.reason}</span>
              <span className="text-xs font-bold text-emerald-500 tabular-nums shrink-0">+{r.amount} Lông</span>
            </button>
          ))}
        </div>
      </div>
    </dialog>
  );
}
