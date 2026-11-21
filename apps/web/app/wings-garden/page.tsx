'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  isAdminOrSuperAdminRole,
  WINGS_GARDEN_WAREHOUSES,
  WingsGardenActionRequest,
  WingsGardenActionResponse,
  WingsGardenChestKind,
  WingsGardenOverlayItem,
  WingsGardenPayMethod,
  WingsGardenPreviewRole,
  WingsGardenSkuConfig,
  WingsGardenStateResponse,
  WingsGardenWarehouseId,
} from '@mos-lab/shared';
import {
  BarChart3,
  LogOut,
  Pause,
  Play,
  QrCode,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  TreeDeciduous,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { useTheme } from '../../context/ThemeContext';
import {
  CvFeather1Badge,
  CvFeather2Badge,
  FeatherSvg,
  switchWingsGardenAccount,
  WingsGardenAuthScreen,
} from './components/GardenVisuals';
import { WingsGardenTabId, WingsGardenTabs } from './components/WingsGardenTabs';
import { WingsQrScannerModal } from './components/WingsQrScannerModal';
import { ChestRewardDialog, FmInsuranceDialog, ItemInspectorDialog } from './components/WingsGardenActionDialogs';
import { playGardenFx } from './utils/soundFx';
import './wings-garden.css';

type SkyMood = 'dawn' | 'sunset' | 'starlight';

export default function WingsGardenPage() {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [authStatus, setAuthStatus] = useState<'checking' | 'authorized' | 'forbidden'>('checking');
  const [checkingSlow, setCheckingSlow] = useState<boolean>(false);
  const [state, setState] = useState<WingsGardenStateResponse | null>(null);
  const [warehouseId, setWarehouseId] = useState<WingsGardenWarehouseId>(3);
  const [previewRole, setPreviewRole] = useState<WingsGardenPreviewRole>('CVL');
  const [activeTab, setActiveTab] = useState<WingsGardenTabId>('garden');
  const [skyMood, setSkyMood] = useState<SkyMood>('dawn');
  const [muted, setMuted] = useState<boolean>(false);
  const [motionPaused, setMotionPaused] = useState<boolean>(false);
  const [showAdminDeck, setShowAdminDeck] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [toast, setToast] = useState<{ text: string; tone: 'good' | 'warn' | 'danger' } | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Modals state
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);
  const [scannerSku, setScannerSku] = useState<WingsGardenSkuConfig | null>(null);
  const [scannerPayMethod, setScannerPayMethod] = useState<WingsGardenPayMethod>('FEATHER');
  const [inspectorItem, setInspectorItem] = useState<WingsGardenOverlayItem | null>(null);
  const [chestOutcome, setChestOutcome] = useState<WingsGardenActionResponse['chestOutcome'] | null>(null);
  const [insuranceOpen, setInsuranceOpen] = useState<boolean>(false);

  const showBannerToast = useCallback((text: string, tone: 'good' | 'warn' | 'danger') => {
    setToast({ text, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Live 1s clock tick for Airship countdown timers
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // UI-010 Zero-Trust Admin-Only Auth Guard
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    const slowTimer = setTimeout(() => {
      if (!cancelled) setCheckingSlow(true);
    }, 3500);

    const verify = async () => {
      try {
        const token = window.localStorage.getItem('mos_token');
        const rawUser = window.localStorage.getItem('mos_user');
        if (!token || !rawUser) {
          window.location.replace(`/login?next=${encodeURIComponent('/wings-garden')}`);
          return;
        }
        const parsed = JSON.parse(rawUser) as { role?: string };
        if (isAdminOrSuperAdminRole(parsed?.role)) {
          if (!cancelled) setAuthStatus('authorized');
          return;
        }
        const fresh = await Promise.race([
          apiClient.auth.me(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
        ]);
        if (cancelled) return;
        if (!fresh?.id) {
          window.location.replace(`/login?next=${encodeURIComponent('/wings-garden')}`);
          return;
        }
        if (isAdminOrSuperAdminRole(fresh.role)) {
          try {
            window.localStorage.setItem('mos_user', JSON.stringify({ ...parsed, ...fresh }));
          } catch {
            // ignore storage error
          }
          setAuthStatus('authorized');
          return;
        }
        setAuthStatus('forbidden');
      } catch {
        if (!cancelled) setAuthStatus('forbidden');
      }
    };

    void verify();
    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
    };
  }, []);

  const loadState = useCallback(async () => {
    if (authStatus !== 'authorized') return;
    try {
      const data = await apiClient.wingsGarden.getState({ warehouseId, previewRole });
      setState(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error ||
        'Không tải được dữ liệu Thiên Đường Nối Lông.';
      showBannerToast(msg, 'danger');
    }
  }, [authStatus, warehouseId, previewRole, showBannerToast]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const runAction = useCallback(
    async (
      partial: Omit<WingsGardenActionRequest, 'warehouseId' | 'previewRole'>,
      fx: 'scan' | 'harvest' | 'craft' | 'chest' | 'error' = 'scan'
    ): Promise<boolean> => {
      setBusy(true);
      try {
        const res = await apiClient.wingsGarden.executeAction({
          ...partial,
          warehouseId,
          previewRole,
        });
        setState(res.state);
        if (res.chestOutcome) {
          setChestOutcome(res.chestOutcome);
        }
        if (inspectorItem) {
          const refreshed = res.state.island.items.find((i) => i.uid === inspectorItem.uid) || null;
          setInspectorItem(refreshed);
        }
        playGardenFx(fx, muted);
        showBannerToast(res.message, 'good');
        return true;
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error ||
          'Thao tác chưa hoàn tất.';
        playGardenFx('error', muted);
        showBannerToast(msg, 'danger');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [inspectorItem, muted, previewRole, showBannerToast, warehouseId]
  );

  if (authStatus !== 'authorized') {
    return <WingsGardenAuthScreen mode={authStatus} checkingSlow={checkingSlow} />;
  }

  const skyClass =
    skyMood === 'sunset'
      ? 'bg-gradient-to-b from-orange-300 via-amber-100 to-yellow-100 text-slate-900'
      : skyMood === 'starlight'
        ? 'bg-gradient-to-b from-indigo-950 via-indigo-900 to-amber-900/90 text-slate-50'
        : 'bg-gradient-to-b from-sky-200 via-sky-50 to-amber-100 text-slate-900';

  const currentMeta = WINGS_GARDEN_WAREHOUSES.find((w) => w.warehouseId === warehouseId) || WINGS_GARDEN_WAREHOUSES[0];
  const totalChests = state
    ? (state.wallet.chests.bronze || 0) + (state.wallet.chests.silver || 0) + (state.wallet.chests.gold || 0)
    : 0;
  const wingObj = state?.config.wingTiers.find((w) => w.tier === state.wallet.wingTier) || null;
  const overdraftActive = Boolean(state && state.wallet.feathers < 0);

  return (
    <div className={`wg-root min-h-dvh flex justify-center bg-slate-950/95 ${motionPaused ? 'wg-motion-paused' : ''}`}>
      {/* iPhone Fullscreen Shell */}
      <div className={`relative w-full max-w-[430px] min-h-dvh flex flex-col shadow-2xl ${skyClass}`}>
        {/* Top Safe Header & Celestial HUD */}
        <header className="sticky top-0 z-20 px-3 pt-2.5 pb-2 space-y-2 backdrop-blur-md">
          <div className="rounded-2xl bg-white/92 text-slate-900 border border-amber-200 shadow-sm px-3 py-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shrink-0">
                  {previewRole === 'CVL' ? (
                    <CvFeather1Badge textClass="text-slate-950 text-xs" featherClass="w-3 h-3 text-amber-900" />
                  ) : previewRole === 'CVLL' ? (
                    <CvFeather2Badge textClass="text-slate-950 text-xs" featherClass="w-2.5 h-2.5 text-amber-900" />
                  ) : (
                    previewRole
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">
                    {state?.wallet.staffName || 'Danny Do'} · {currentMeta.shortName}
                  </div>
                  <div className="text-xs text-slate-600 truncate">
                    {wingObj ? wingObj.name : 'Thiên Đường Nối Lông'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runAction({ action: 'SIMULATE_SERVICE', serviceKind: 'FULL_SET' }, 'scan')}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer tabular-nums"
                >
                  +1 Ca (+12)
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdminDeck((v) => !v)}
                  aria-label="Mở bảng điều khiển test Admin"
                  className="px-2 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs font-bold cursor-pointer"
                >
                  Test
                </button>
              </div>
            </div>

            {state && (
              <>
                <div className="grid grid-cols-3 gap-1.5 tabular-nums">
                  <div
                    className={`px-2 py-1 rounded-xl border flex items-center justify-between text-xs ${
                      state.hasExpiredGlue
                        ? 'bg-rose-50 border-rose-300 text-rose-700'
                        : overdraftActive
                          ? 'bg-amber-100 border-amber-400 text-amber-950'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <FeatherSvg className="w-3.5 h-3.5 text-amber-600" /> Lông
                    </span>
                    <strong>{state.wallet.feathers}</strong>
                  </div>
                  <div className="px-2 py-1 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center justify-between text-xs">
                    <span>🔥 Chuỗi</span>
                    <strong>{state.wallet.streakDays}d</strong>
                  </div>
                  <div className="px-2 py-1 rounded-xl border border-purple-200 bg-purple-50 text-purple-900 flex items-center justify-between text-xs">
                    <span>🎁 Rương</span>
                    <strong>{totalChests}</strong>
                  </div>
                </div>

                {state.wallet.cashSpentVnd > 0 && (
                  <div className="px-2.5 py-1 rounded-lg bg-slate-900 text-amber-300 text-xs font-semibold flex items-center justify-between tabular-nums">
                    <span>🧾 Sổ Mua Niêm Yết ({state.wallet.cashOrdersCount} món)</span>
                    <strong>{state.wallet.cashSpentVnd.toLocaleString('vi-VN')}đ</strong>
                  </div>
                )}

                {state.hasExpiredGlue && (
                  <div className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-semibold">
                    ⚠️ Keo quá hạn &gt;21 ngày · Khoá Kết Cánh &amp; Rương Bạc/Vàng
                  </div>
                )}
              </>
            )}

            {/* Collapsible Admin Test Strip */}
            {showAdminDeck && (
              <div className="pt-2 border-t border-slate-200 space-y-2 text-xs">
                <div className="flex flex-wrap gap-1.5">
                  {WINGS_GARDEN_WAREHOUSES.map((w) => (
                    <button
                      key={w.warehouseId}
                      type="button"
                      onClick={() => setWarehouseId(w.warehouseId)}
                      className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                        warehouseId === w.warehouseId ? 'bg-slate-900 text-amber-300' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {w.name}
                    </button>
                  ))}
                  {(['CVL', 'CVLL', 'CV', 'FM', 'ADMIN'] as WingsGardenPreviewRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setPreviewRole(r)}
                      className={`px-2 py-1 rounded-lg font-bold cursor-pointer ${
                        previewRole === r ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void runAction({ action: 'BONUS_FEATHERS', amountFeathers: 60 }, 'chest')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold cursor-pointer"
                  >
                    +60 Lông
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void runAction({ action: 'FAST_FORWARD_DAYS', amountFeathers: 7 }, 'scan')}
                    className="px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 font-bold cursor-pointer"
                  >
                    Tua +7 ngày
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void runAction({ action: 'CREATE_AIRSHIP' }, 'scan')}
                    className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 font-bold cursor-pointer"
                  >
                    +Khinh Khí Cầu
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void runAction({ action: 'CREATE_CLOUD' }, 'error')}
                    className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-bold cursor-pointer"
                  >
                    +Mây Đen
                  </button>
                  <button
                    type="button"
                    onClick={() => setSkyMood((s) => (s === 'dawn' ? 'sunset' : s === 'sunset' ? 'starlight' : 'dawn'))}
                    className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold cursor-pointer"
                  >
                    Đổi Trời
                  </button>
                  <button
                    type="button"
                    onClick={() => setMuted((m) => !m)}
                    className="px-2 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    {muted ? 'Tắt tiếng' : 'Âm thanh'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMotionPaused((p) => !p)}
                    className="px-2 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    {motionPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    {motionPaused ? 'Bật hiệu ứng' : 'Tạm dừng chuyển động'}
                  </button>
                  {[
                    {
                      label: '+Dặm',
                      cls: 'bg-amber-100 text-amber-900',
                      req: { action: 'SIMULATE_SERVICE' as const, serviceKind: 'REFILL' as const },
                    },
                    {
                      label: '+Mi Dưới',
                      cls: 'bg-sky-100 text-sky-900',
                      req: { action: 'TRIGGER_EARN_EVENT' as const, earnTrigger: 'BOTTOM_LASH' as const },
                    },
                    {
                      label: '+Dưỡng Mi',
                      cls: 'bg-emerald-100 text-emerald-900',
                      req: { action: 'TRIGGER_EARN_EVENT' as const, earnTrigger: 'SERUM_UPSELL' as const },
                    },
                    {
                      label: '+Khách Combo',
                      cls: 'bg-purple-100 text-purple-900',
                      req: { action: 'TRIGGER_EARN_EVENT' as const, earnTrigger: 'CUSTOMER_COMBO_BUY' as const },
                    },
                    {
                      label: 'Đồng bộ đơn',
                      cls: 'bg-cyan-100 text-cyan-900',
                      req: { action: 'SYNC_LEGACY_TODAY' as const },
                    },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      disabled={busy}
                      onClick={() => void runAction(btn.req, 'scan')}
                      className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${btn.cls}`}
                    >
                      {btn.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void runAction({ action: 'RESET_PROTOTYPE' }, 'scan')}
                    className="px-2 py-1 rounded-lg bg-slate-200 text-slate-800 font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                  <button
                    type="button"
                    onClick={switchWingsGardenAccount}
                    className="px-2 py-1 rounded-lg bg-slate-900 text-amber-300 font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3 h-3" /> Đổi TK
                  </button>
                </div>
              </div>
            )}
          </div>

          {toast && (
            <div
              className={`px-3 py-2 rounded-2xl text-xs font-bold shadow-lg text-center ${
                toast.tone === 'danger'
                  ? 'bg-rose-600 text-white'
                  : toast.tone === 'warn'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-emerald-600 text-white'
              }`}
            >
              {toast.text}
            </div>
          )}
        </header>

        {/* Scrollable Body */}
        <main className="flex-1 px-3 pb-24">
          {!state ? (
            <div className="p-8 text-center text-xs font-semibold opacity-75">Đang tải khu vườn...</div>
          ) : (
            <WingsGardenTabs
              activeTab={activeTab}
              state={state}
              busy={busy}
              nowMs={nowMs}
              onStartOrderSku={(sku, payMethod) => {
                setScannerSku(sku);
                setScannerPayMethod(payMethod);
                setScannerOpen(true);
              }}
              onOpenInspector={(item) => setInspectorItem(item)}
              onCraftWing={() => void runAction({ action: 'CRAFT_WING' }, 'craft')}
              onOpenChest={(kind: WingsGardenChestKind) =>
                void runAction({ action: 'OPEN_CHEST', chestKind: kind }, 'chest')
              }
              onBuyChest={(kind: WingsGardenChestKind) =>
                void runAction({ action: 'BUY_CHEST', chestKind: kind }, 'scan')
              }
              onActivatePerk={(cardId) => void runAction({ action: 'ACTIVATE_PERK', perkCardId: cardId }, 'craft')}
              onDispatchAirship={(orderId) =>
                void runAction({ action: 'DISPATCH_AIRSHIP', airshipOrderId: orderId }, 'harvest')
              }
              onClearCloud={(cloudId) => void runAction({ action: 'CLEAR_CLOUD', cloudId }, 'harvest')}
              onOpenInsurance={() => setInsuranceOpen(true)}
              onUpdateSkuConfig={(skuId, listedPriceVnd, costFeathers) =>
                void runAction({ action: 'UPDATE_SKU_CONFIG', skuId, listedPriceVnd, costFeathers }, 'scan')
              }
              onClaimReward={(claimId, claimAll) =>
                void runAction({ action: 'CLAIM_REWARD', claimId, claimAll }, 'chest')
              }
              onSyncLegacyToday={() => void runAction({ action: 'SYNC_LEGACY_TODAY' }, 'scan')}
              onSaveFeatherRules={(featherRules) => runAction({ action: 'SAVE_FEATHER_RULES', featherRules }, 'scan')}
            />
          )}
        </main>

        {/* Bottom Sticky Game Navigation Bar */}
        <nav
          aria-label="Điều hướng Thiên Đường Nối Lông"
          className="sticky bottom-0 z-20 bg-white/95 text-slate-800 border-t border-amber-200 px-2 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] grid grid-cols-5 items-end shadow-lg"
        >
          <button
            type="button"
            onClick={() => setActiveTab('garden')}
            className={`flex flex-col items-center gap-0.5 py-1 rounded-xl text-xs font-semibold cursor-pointer ${
              activeTab === 'garden' ? 'text-amber-600 bg-amber-100/80' : 'text-slate-600'
            }`}
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>Vườn</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shop')}
            className={`flex flex-col items-center gap-0.5 py-1 rounded-xl text-xs font-semibold cursor-pointer ${
              activeTab === 'shop' ? 'text-amber-600 bg-amber-100/80' : 'text-slate-600'
            }`}
          >
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            <span>Cửa Hàng</span>
          </button>

          <div className="flex flex-col items-center -mt-6">
            <button
              type="button"
              onClick={() => {
                setScannerSku(null);
                setScannerPayMethod('FEATHER');
                setScannerOpen(true);
              }}
              aria-label="Quét QR sản phẩm"
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/40 border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              <QrCode className="w-6 h-6" aria-hidden="true" />
            </button>
            <span className="text-xs font-bold text-amber-800 mt-0.5">Quét QR</span>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('island')}
            className={`flex flex-col items-center gap-0.5 py-1 rounded-xl text-xs font-semibold cursor-pointer ${
              activeTab === 'island' ? 'text-amber-600 bg-amber-100/80' : 'text-slate-600'
            }`}
          >
            <TreeDeciduous className="w-4 h-4" aria-hidden="true" />
            <span>Đảo Shop</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col items-center gap-0.5 py-1 rounded-xl text-xs font-semibold cursor-pointer ${
              activeTab === 'reports' ? 'text-amber-600 bg-amber-100/80' : 'text-slate-600'
            }`}
          >
            <BarChart3 className="w-4 h-4" aria-hidden="true" />
            <span>Báo Cáo</span>
          </button>
        </nav>
      </div>

      {/* Native <dialog> Modals */}
      <WingsQrScannerModal
        open={scannerOpen}
        isDark={isDark}
        warehouseId={warehouseId}
        warehouseShortName={currentMeta.shortName}
        initialSku={scannerSku}
        initialPayMethod={scannerPayMethod}
        activeItems={state?.island.items || []}
        sampleStickers={state?.legacyCounts.sampleNewStickers || []}
        busy={busy}
        onScanSubmit={({ scanCode, skuId, payMethod }) =>
          runAction({ action: 'SCAN_QR', scanCode, skuId, payMethod }, 'scan')
        }
        onScanImport={(scanCode) => runAction({ action: 'SCAN_IMPORT_QR', scanCode }, 'scan')}
        onClose={() => setScannerOpen(false)}
      />

      <ItemInspectorDialog
        item={inspectorItem}
        isDark={isDark}
        fmAllowed={previewRole === 'FM' || previewRole === 'ADMIN'}
        busy={busy}
        nowMs={nowMs}
        onConsumeStep={(uid) => void runAction({ action: 'CONSUME_ITEM_STEP', itemUid: uid }, 'scan')}
        onHarvestUsed={(item) => {
          void runAction({ action: 'SCAN_QR', scanCode: item.scanCode, itemUid: item.uid }, 'harvest').then((ok) => {
            if (ok) setInspectorItem(null);
          });
        }}
        onOpenInsurance={() => setInsuranceOpen(true)}
        onClose={() => setInspectorItem(null)}
      />

      <ChestRewardDialog outcome={chestOutcome} isDark={isDark} onClose={() => setChestOutcome(null)} />

      <FmInsuranceDialog
        open={insuranceOpen}
        isDark={isDark}
        busy={busy}
        onGrant={(reason, amountFeathers) => {
          void runAction({ action: 'FM_INSURANCE_REFUND', reason, amountFeathers }, 'chest').then((ok) => {
            if (ok) setInsuranceOpen(false);
          });
        }}
        onClose={() => setInsuranceOpen(false)}
      />
    </div>
  );
}
