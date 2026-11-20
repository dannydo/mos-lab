'use client';

import React, { useMemo, useState } from 'react';
import {
  computeItemDaysOpened,
  isWingsGardenGlueExpired,
  WINGS_GARDEN_WAREHOUSES,
  WingsGardenCategory,
  WingsGardenChestKind,
  WingsGardenFeatherRule,
  WingsGardenOverlayItem,
  WingsGardenPayMethod,
  WingsGardenSkuConfig,
  WingsGardenStateResponse,
} from '@mos-lab/shared';
import { ChestIconSvg, FeatherSvg, HeavenIslandSvg, SupplyIconSvg } from './GardenVisuals';
import { WingsGardenDailyQuestStrip } from './WingsGardenDailyQuestStrip';
import { WingsGardenIslandReportsTabs } from './WingsGardenIslandReportsTabs';

export type WingsGardenTabId = 'garden' | 'shop' | 'island' | 'reports';

const CATEGORY_LABELS: Array<{ id: 'ALL' | WingsGardenCategory; label: string }> = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'GLUE', label: 'Keo' },
  { id: 'SWAB', label: 'Bông tăm' },
  { id: 'TAPE', label: 'Băng keo' },
  { id: 'EYEPAD', label: 'Eyepatch' },
  { id: 'SOLUTION', label: 'Dung dịch & Sáp' },
  { id: 'HYGIENE', label: 'Vệ sinh' },
  { id: 'LASH', label: 'Khay Mi' },
];

export interface WingsGardenTabsProps {
  activeTab: WingsGardenTabId;
  state: WingsGardenStateResponse;
  busy: boolean;
  nowMs: number;
  onStartOrderSku: (sku: WingsGardenSkuConfig, payMethod: WingsGardenPayMethod) => void;
  onOpenInspector: (item: WingsGardenOverlayItem) => void;
  onCraftWing: () => void;
  onOpenChest: (kind: WingsGardenChestKind) => void;
  onBuyChest: (kind: WingsGardenChestKind) => void;
  onActivatePerk: (cardId: string) => void;
  onDispatchAirship: (orderId: string) => void;
  onClearCloud: (cloudId: string) => void;
  onOpenInsurance: () => void;
  onUpdateSkuConfig: (skuId: string, listedPriceVnd: number, costFeathers: number) => void;
  onClaimReward: (claimId?: string, claimAll?: boolean) => void;
  onSyncLegacyToday: () => void;
  onSaveFeatherRules: (featherRules: WingsGardenFeatherRule[]) => Promise<boolean>;
}

function formatVnd(n: number): string {
  return `${Math.round(n || 0).toLocaleString('vi-VN')}đ`;
}

export function WingsGardenTabs({
  activeTab,
  state,
  busy,
  nowMs,
  onStartOrderSku,
  onOpenInspector,
  onCraftWing,
  onOpenChest,
  onBuyChest,
  onActivatePerk,
  onDispatchAirship,
  onClearCloud,
  onOpenInsurance,
  onUpdateSkuConfig,
  onClaimReward,
  onSyncLegacyToday,
  onSaveFeatherRules,
}: WingsGardenTabsProps) {
  const [shopSubTab, setShopSubTab] = useState<'supplies' | 'wings' | 'chests'>('supplies');
  const [shopCategory, setShopCategory] = useState<'ALL' | WingsGardenCategory>('ALL');
  const [showAllKit24, setShowAllKit24] = useState<boolean>(false);

  const currentIslandMeta =
    WINGS_GARDEN_WAREHOUSES.find((w) => w.warehouseId === state.island.warehouseId) || WINGS_GARDEN_WAREHOUSES[0];
  const wingTierObj = state.config.wingTiers.find((w) => w.tier === state.wallet.wingTier) || null;
  const activeItems = useMemo(() => state.island.items.filter((i) => i.state === 'USING'), [state.island.items]);
  const totalChests =
    (state.wallet.chests.bronze || 0) + (state.wallet.chests.silver || 0) + (state.wallet.chests.gold || 0);

  if (activeTab === 'garden') {
    const cov = state.mandatoryCoverage;
    const covPct = Math.round((cov.coveredCount / Math.max(1, cov.totalRequired)) * 100);
    const visibleChips = showAllKit24 ? cov.items : cov.items.slice(0, 8);

    return (
      <div className="space-y-3">
        <WingsGardenDailyQuestStrip
          state={state}
          busy={busy}
          onClaimReward={onClaimReward}
          onSyncLegacyToday={onSyncLegacyToday}
        />

        <HeavenIslandSvg
          islandName={currentIslandMeta.name}
          wingTierObj={wingTierObj}
          wingTier={state.wallet.wingTier}
          darkCloudCount={state.island.darkClouds.length}
        />

        {/* Bộ 24 Món Bắt Buộc Kho CV / CVL (từ ảnh IMG_5958) */}
        <section className="rounded-2xl bg-white/95 text-slate-900 border border-amber-200 p-3 shadow-xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold">🎒 Bộ 24 Món Bắt Buộc Kho CV / CVL</h2>
              <p className="text-xs text-slate-600 tabular-nums">
                Đủ{' '}
                <strong>
                  {cov.coveredCount}/{cov.totalRequired}
                </strong>{' '}
                món ({covPct}%) · chạm món thiếu để nhận ngay
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAllKit24((v) => !v)}
              className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold cursor-pointer shrink-0"
            >
              {showAllKit24 ? 'Thu gọn' : 'Xem đủ 24'}
            </button>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500"
              style={{ width: `${covPct}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {visibleChips.map((chip) => {
              const sku = state.config.skus.find((s) => s.skuId === chip.skuId);
              const chipCls =
                chip.status === 'EXPIRED'
                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                  : chip.status === 'RIPE'
                    ? 'bg-amber-100 border-amber-400 text-amber-950'
                    : chip.status === 'OK'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600';
              const tag =
                chip.status === 'EXPIRED'
                  ? 'Quá hạn'
                  : chip.status === 'RIPE'
                    ? 'Gặt vỏ'
                    : chip.status === 'OK'
                      ? '✓ Đủ'
                      : '+ Lấy';
              return (
                <button
                  key={chip.skuId}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (sku) onStartOrderSku(sku, 'FEATHER');
                  }}
                  className={`px-2 py-1.5 rounded-xl border text-left flex items-center justify-between gap-1 text-xs cursor-pointer ${chipCls}`}
                >
                  <span className="truncate font-semibold">{chip.name}</span>
                  <span className="font-bold shrink-0">{tag}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Active USING Cards */}
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-white/80 px-2.5 py-1 rounded-full">
            Đang Dùng Trong Vườn ({activeItems.length} món)
          </h2>
        </div>

        <div className="space-y-2.5">
          {activeItems.length === 0 ? (
            <div className="rounded-2xl bg-white/90 text-slate-700 p-5 text-center text-xs border border-amber-200">
              Vườn bàn nghề đang trống sạch! Sang tab <strong>Cửa Hàng</strong> hoặc bấm <strong>Quét QR</strong> để
              nhận đồ mới.
            </div>
          ) : (
            activeItems.map((it) => {
              const isRipe = it.remainingPct <= 0;
              const isExpired = isWingsGardenGlueExpired(it, nowMs);
              const daysOpened = computeItemDaysOpened(it, nowMs);
              const cardCls = isExpired
                ? 'border-rose-400 bg-rose-50 text-slate-900'
                : isRipe
                  ? 'wg-anim-ripe border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-100 text-slate-900 ring-2 ring-amber-400/60'
                  : 'border-white bg-white/95 text-slate-900';

              return (
                <button
                  key={it.uid}
                  type="button"
                  onClick={() => onOpenInspector(it)}
                  className={`w-full text-left rounded-2xl border p-3 shadow-xs transition-transform active:scale-98 cursor-pointer ${cardCls}`}
                >
                  <div className="flex items-start gap-2.5">
                    <SupplyIconSvg category={it.category} skuId={it.skuId} isRipe={isRipe} isExpired={isExpired} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold truncate">{it.name}</span>
                        {isExpired ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white tabular-nums">
                            Quá hạn {daysOpened}d
                          </span>
                        ) : isRipe ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-950">
                            ✨ Vỏ Chín · Gặt!
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 tabular-nums">
                            {it.isShared ? 'Đồ chung' : `Còn ${it.remainingPct}%`}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 tabular-nums mt-0.5">
                        {it.scanCode} · {it.payLabel}
                      </div>
                      <div className="mt-2 w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isExpired ? 'bg-rose-500' : isRipe ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${isRipe ? 100 : it.remainingPct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600 mt-1 tabular-nums">
                        <span>
                          {it.freshLimitDays
                            ? `Độ tươi: ${daysOpened}/${it.freshLimitDays} ngày`
                            : `Đã mở: ${daysOpened} ngày`}
                        </span>
                        <span className="font-bold text-amber-700">{isRipe ? 'Chạm gặt USED →' : 'Chi tiết →'}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  if (activeTab === 'shop') {
    const subTabs = (
      <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-white/90 border border-amber-200">
        <button
          type="button"
          onClick={() => setShopSubTab('supplies')}
          className={`py-1.5 rounded-xl text-xs font-bold cursor-pointer tabular-nums ${
            shopSubTab === 'supplies' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-700'
          }`}
        >
          Vật Tư ({state.config.skus.length})
        </button>
        <button
          type="button"
          onClick={() => setShopSubTab('wings')}
          className={`py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
            shopSubTab === 'wings' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-700'
          }`}
        >
          Kết Cánh
        </button>
        <button
          type="button"
          onClick={() => setShopSubTab('chests')}
          className={`py-1.5 rounded-xl text-xs font-bold cursor-pointer tabular-nums ${
            shopSubTab === 'chests' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-700'
          }`}
        >
          Rương ({totalChests})
        </button>
      </div>
    );

    if (shopSubTab === 'wings') {
      const nextWing = state.config.wingTiers.find((w) => w.tier === state.wallet.wingTier + 1);
      const pct = nextWing
        ? Math.min(100, Math.round((Math.max(0, state.wallet.feathers) / nextWing.costFeathers) * 100))
        : 100;

      return (
        <div className="space-y-2.5">
          {subTabs}
          <div className="rounded-2xl bg-white/95 text-slate-900 border border-amber-200 p-3 space-y-2 tabular-nums">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Tiến độ Kết Cánh tiếp theo</span>
              <span>
                {nextWing
                  ? `${Math.max(0, state.wallet.feathers)}/${nextWing.costFeathers} Lông (${pct}%)`
                  : 'Đỉnh Hoàng Kim!'}
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-slate-600">
              Mẹo: Mua bằng Giá Niêm Yết (VNĐ) giúp giữ nguyên Lông để Kết Cánh nhanh hơn!
            </p>
          </div>
          {state.config.wingTiers.map((w) => {
            const done = state.wallet.wingTier >= w.tier;
            const isNext = state.wallet.wingTier + 1 === w.tier;
            return (
              <div
                key={w.tier}
                className={`rounded-2xl bg-white/95 text-slate-900 border p-3 space-y-1.5 shadow-xs ${
                  done ? 'border-emerald-400' : isNext ? 'border-amber-400' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold">
                    Bậc {w.tier} · {w.name}
                  </span>
                  {done ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      ✓ Đã kết
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold tabular-nums">
                      {w.costFeathers} Lông
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-600">
                  {w.description} · Tặng 1 {state.config.chests[w.bonusChest].name}
                </div>
                {isNext && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={onCraftWing}
                    className={`w-full mt-1 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                      state.hasExpiredGlue
                        ? 'bg-rose-100 text-rose-700 border border-rose-300'
                        : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                    }`}
                  >
                    {state.hasExpiredGlue
                      ? '🔒 Thay keo >21d trước khi Kết Cánh'
                      : `Kết "${w.name}" (${w.costFeathers} Lông)`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    if (shopSubTab === 'chests') {
      const chestKeys: WingsGardenChestKind[] = ['bronze', 'silver', 'gold'];
      return (
        <div className="space-y-2.5">
          {subTabs}
          {chestKeys.map((k) => {
            const cfg = state.config.chests[k];
            const count = state.wallet.chests[k] || 0;
            const locked = (k === 'silver' || k === 'gold') && state.hasExpiredGlue;
            return (
              <div
                key={k}
                className="rounded-2xl bg-white/95 text-slate-900 border border-amber-200 p-3 shadow-xs space-y-2"
              >
                <div className="flex items-center gap-3">
                  <ChestIconSvg kind={k} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold">{cfg.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold tabular-nums">
                        Có sẵn: {count}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      +{cfg.featherMin}–{cfg.featherMax} Lông hoặc <strong>{cfg.perkTitle}</strong>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={count <= 0 || busy}
                    onClick={() => onOpenChest(k)}
                    className={`py-1.5 px-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                      count <= 0
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : locked
                          ? 'bg-rose-100 text-rose-700 border border-rose-300'
                          : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                    }`}
                  >
                    {locked ? '🔒 Keo >21d' : `✨ Mở Rương (${count})`}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onBuyChest(k)}
                    className="py-1.5 px-2.5 rounded-xl bg-slate-900 text-amber-300 text-xs font-bold cursor-pointer tabular-nums"
                  >
                    Đổi {cfg.buyCostFeathers} Lông
                  </button>
                </div>
              </div>
            );
          })}

          <div className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-white/80 px-2.5 py-1 rounded-full inline-block">
            Túi Thẻ Đặc Quyền Hạnh Kiểm ({state.wallet.perkCards.filter((p) => p.status === 'READY').length})
          </div>
          {state.wallet.perkCards.length === 0 ? (
            <div className="rounded-2xl bg-white/90 text-slate-600 p-3 text-xs text-center border border-white">
              Chưa mở Thẻ Đặc Quyền nào — bấm <strong>Mở Rương</strong> ở trên để thử!
            </div>
          ) : (
            state.wallet.perkCards.map((card) => (
              <div
                key={card.id}
                className={`rounded-2xl bg-white/95 text-slate-900 border p-3 flex items-center justify-between gap-2 ${
                  card.status === 'READY' ? 'border-emerald-400' : 'border-slate-200 opacity-75'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">{card.title}</div>
                  <div className="text-xs text-slate-600 tabular-nums">
                    {card.rule} · HSD {card.validDays}d
                  </div>
                </div>
                {card.status === 'READY' ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onActivatePerk(card.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shrink-0 cursor-pointer"
                  >
                    Kích Hoạt
                  </button>
                ) : (
                  <span className="px-2.5 py-1 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold shrink-0">
                    Đã dùng
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      );
    }

    const filteredSkus = state.config.skus.filter((s) => shopCategory === 'ALL' || s.category === shopCategory);
    return (
      <div className="space-y-2.5">
        {subTabs}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {CATEGORY_LABELS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setShopCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer ${
                shopCategory === cat.id ? 'bg-slate-900 text-amber-300' : 'bg-white/90 text-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {filteredSkus.map((sku) => {
            const stock = state.legacyCounts.bySkuNew[sku.skuId] ?? 0;
            return (
              <div
                key={sku.skuId}
                className="rounded-2xl bg-white/95 text-slate-900 border border-white p-3 shadow-xs space-y-2"
              >
                <div className="flex items-start gap-2.5">
                  <SupplyIconSvg category={sku.category} skuId={sku.skuId} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold truncate">
                        {sku.isMandatoryCvKit ? '★ ' : ''}
                        {sku.name}
                      </span>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full tabular-nums shrink-0">
                        Kho: {stock}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 truncate">{sku.legacyName}</div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs tabular-nums">
                      <span className="font-bold text-slate-800">Niêm yết: {formatVnd(sku.listedPriceVnd)}</span>
                      <span className="text-amber-700 font-semibold">· Hoàn vỏ +{sku.cashbackFeathers} Lông</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onStartOrderSku(sku, 'FEATHER')}
                    className="py-1.5 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer tabular-nums flex items-center justify-center gap-1"
                  >
                    <FeatherSvg className="w-3.5 h-3.5 text-amber-900" />
                    <span>Đổi {sku.costFeathers} Lông</span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onStartOrderSku(sku, 'CASH')}
                    className="py-1.5 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer tabular-nums"
                  >
                    Mua {formatVnd(sku.listedPriceVnd)}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <WingsGardenIslandReportsTabs
      activeTab={activeTab}
      state={state}
      busy={busy}
      nowMs={nowMs}
      onDispatchAirship={onDispatchAirship}
      onClearCloud={onClearCloud}
      onOpenInsurance={onOpenInsurance}
      onUpdateSkuConfig={onUpdateSkuConfig}
      onSaveFeatherRules={onSaveFeatherRules}
    />
  );
}
