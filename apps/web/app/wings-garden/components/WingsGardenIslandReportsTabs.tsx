'use client';

import React, { useState } from 'react';
import { WINGS_GARDEN_WAREHOUSES, WingsGardenFeatherRule, WingsGardenStateResponse } from '@mos-lab/shared';
import { WingsGardenRuleConfigEditor } from './WingsGardenRuleConfigEditor';

export interface WingsGardenIslandReportsTabsProps {
  activeTab: 'island' | 'reports';
  state: WingsGardenStateResponse;
  busy: boolean;
  nowMs: number;
  onDispatchAirship: (orderId: string) => void;
  onClearCloud: (cloudId: string) => void;
  onOpenInsurance: () => void;
  onUpdateSkuConfig: (skuId: string, listedPriceVnd: number, costFeathers: number) => void;
  onSaveFeatherRules: (featherRules: WingsGardenFeatherRule[]) => Promise<boolean>;
}

function formatVnd(n: number): string {
  return `${Math.round(n || 0).toLocaleString('vi-VN')}đ`;
}

function formatSecCountdown(dueAtIso: string, nowMs: number): string {
  const diffSec = Math.max(0, Math.floor((Date.parse(dueAtIso) - nowMs) / 1000));
  const m = Math.floor(diffSec / 60);
  const s = diffSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function WingsGardenIslandReportsTabs({
  activeTab,
  state,
  busy,
  nowMs,
  onDispatchAirship,
  onClearCloud,
  onOpenInsurance,
  onUpdateSkuConfig,
  onSaveFeatherRules,
}: WingsGardenIslandReportsTabsProps) {
  const [selectedHistoryUid, setSelectedHistoryUid] = useState<string>('');
  const [editSkuId, setEditSkuId] = useState<string>(state.config.skus[0]?.skuId || 'keo-den');
  const [editPrice, setEditPrice] = useState<string>(String(state.config.skus[0]?.listedPriceVnd || 95000));
  const [editFeathers, setEditFeathers] = useState<string>(String(state.config.skus[0]?.costFeathers || 28));

  const currentIslandMeta =
    WINGS_GARDEN_WAREHOUSES.find((w) => w.warehouseId === state.island.warehouseId) || WINGS_GARDEN_WAREHOUSES[0];

  if (activeTab === 'island') {
    const fmAllowed = state.previewRole === 'FM' || state.previewRole === 'ADMIN';
    return (
      <div className="space-y-2.5">
        <div className="rounded-3xl bg-white/95 text-slate-900 border border-amber-200 p-3.5 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold">🌳 Cây Ánh Sáng · {currentIslandMeta.name}</h2>
              <p className="text-xs text-slate-600">Đạt &gt;90% tháng nhận Rương Vàng toàn Đảo</p>
            </div>
            <span className="text-base font-extrabold text-amber-600 tabular-nums">{state.island.lightHp}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500"
              style={{ width: `${state.island.lightHp}%` }}
            />
          </div>
          {state.island.darkClouds.length === 0 ? (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              ☀️ Bầu trời {currentIslandMeta.shortName} quang đãng — không có Mây Đen!
            </div>
          ) : (
            <div className="space-y-1.5">
              {state.island.darkClouds.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={busy}
                  onClick={() => onClearCloud(c.id)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 text-white border border-amber-400/50 flex items-center justify-between text-left cursor-pointer"
                >
                  <span className="text-xs">🌩️ {c.text}</span>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 text-xs font-bold shrink-0">
                    Xử lý →
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Friendly Island Race */}
        <div className="rounded-2xl bg-white/95 text-slate-900 border border-white p-3 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Đua Đảo Thân Thiện (Đề Thám vs Estella)
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs tabular-nums">
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300">
              <div className="font-bold">{currentIslandMeta.name}</div>
              <div className="text-slate-600 mt-0.5">
                Ánh sáng: <strong>{state.island.lightHp}%</strong>
              </div>
              <div className="text-slate-600">
                Vỏ gặt hôm nay: <strong>{state.island.harvestedToday}</strong>
              </div>
              <div className="text-slate-600">
                Off Gấp hôm nay: <strong>{state.island.emergencyOffCountToday}/1</strong>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold">{state.otherIslandSummary.name}</div>
              <div className="text-slate-600 mt-0.5">
                Ánh sáng: <strong>{state.otherIslandSummary.lightHp}%</strong>
              </div>
              <div className="text-slate-600">
                Vỏ gặt hôm nay: <strong>{state.otherIslandSummary.harvestedToday}</strong>
              </div>
              <div className="text-slate-600">
                Off Gấp hôm nay: <strong>{state.otherIslandSummary.emergencyOffCountToday}/1</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Airship Dispatch */}
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider bg-white/85 text-slate-800 px-2.5 py-1 rounded-full">
            Khinh Khí Cầu Tiếp Tế (CVLL / FM)
          </h3>
          {state.island.comboCount > 0 && (
            <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 tabular-nums">
              🔥 Combo x{state.island.comboCount}
            </span>
          )}
        </div>
        {state.island.airshipOrders.length === 0 ? (
          <div className="p-3 rounded-xl bg-white/85 text-slate-600 text-xs text-center">
            Hiện chưa có đơn Khinh Khí Cầu chờ giao.
          </div>
        ) : (
          state.island.airshipOrders.map((ord) => (
            <div
              key={ord.id}
              className="p-2.5 rounded-xl bg-white/95 text-slate-900 border border-amber-200 flex items-center justify-between gap-2"
            >
              <div>
                <div className="text-xs font-bold">🎈 {ord.itemName}</div>
                <div className="text-xs text-slate-600 tabular-nums">
                  Cho {ord.requesterName} · Còn {formatSecCountdown(ord.dueAt, nowMs)}
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => onDispatchAirship(ord.id)}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shrink-0 cursor-pointer"
              >
                Quét Giao ⚡
              </button>
            </div>
          ))
        )}

        {fmAllowed && (
          <button
            type="button"
            disabled={busy}
            onClick={onOpenInsurance}
            className="w-full py-2.5 px-3 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-500 cursor-pointer"
          >
            🛡️ Cấp Hoàn Lông Bảo Hiểm (Quyền FM / Admin)
          </button>
        )}
      </div>
    );
  }

  // Reports + Live Config Editor Tab
  const selectedHist =
    state.island.usedHistory.find((h) => h.uid === selectedHistoryUid) || state.island.usedHistory[0] || null;
  const usedPerks = state.wallet.perkCards.filter((p) => p.status === 'USED').length;

  return (
    <div className="space-y-2.5">
      <div className="rounded-2xl bg-white/95 text-slate-900 border border-amber-200 p-3 shadow-xs space-y-1">
        <div className="text-xs font-bold text-amber-700">9 BÁO CÁO QUẢN TRỊ BẢO HÂN (LIVE OVERLAY)</div>
        <div className="text-xs text-slate-600">
          {state.legacyCounts.legacyOnline ? 'Đang đọc live DB Legacy (READ-ONLY)' : 'Chế độ Offline fallback'} · Ghi
          overlay trên `mos_lab`
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center tabular-nums">
        <div className="rounded-2xl bg-white/95 text-slate-900 p-2.5 border border-white">
          <div className="text-xs text-slate-600">1. Tồn NEW</div>
          <div className="text-base font-extrabold text-sky-700 mt-0.5">{state.reports.report1NewCount}</div>
          <div className="text-xs text-slate-500">Tổng: {state.reports.report1LegacyNewCount}</div>
        </div>
        <div className="rounded-2xl bg-white/95 text-slate-900 p-2.5 border border-white">
          <div className="text-xs text-slate-600">2. Tồn USING</div>
          <div className="text-base font-extrabold text-amber-600 mt-0.5">{state.reports.report2UsingCount}</div>
          <div className="text-xs text-slate-500">
            {state.reports.report2PersonalUsing} riêng · {state.reports.report2SharedUsing} chung
          </div>
        </div>
        <div className="rounded-2xl bg-white/95 text-slate-900 p-2.5 border border-white">
          <div className="text-xs text-slate-600">3. Đã USED</div>
          <div className="text-base font-extrabold text-emerald-700 mt-0.5">{state.reports.report3UsedTodayCount}</div>
          <div className="text-xs text-slate-500">Gặt hôm nay</div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/95 text-slate-900 p-3 border border-white space-y-1.5 text-xs tabular-nums">
        <div className="font-bold">4 &amp; 5. Chuyên Viên · Mua Kép &amp; Thẻ Đặc Quyền</div>
        <div className="flex justify-between py-1 border-b border-slate-100">
          <span>{state.wallet.staffName}</span>
          <span>
            <strong>{state.wallet.servicesDoneToday}</strong> ca ·{' '}
            <strong>{state.reports.report4WalletFeathers} Lông</strong>
          </span>
        </div>
        <div className="flex justify-between py-1 border-b border-slate-100">
          <span>Sổ Mua Niêm Yết ({state.reports.report4CashOrdersCount} món)</span>
          <strong>{formatVnd(state.reports.report4CashSpentVnd)}</strong>
        </div>
        <div className="flex justify-between">
          <span>Cánh &amp; Thẻ đã dùng</span>
          <strong>
            Bậc {state.wallet.wingTier}/4 · {usedPerks} Thẻ
          </strong>
        </div>
      </div>

      <div className="rounded-2xl bg-white/95 text-slate-900 p-3 border border-white space-y-2 text-xs">
        <div className="font-bold">6. Lịch Sử Từng Mã Sản Phẩm (Chuẩn Canva Bảo Hân)</div>
        <div className="flex flex-wrap gap-1.5">
          {state.island.usedHistory.slice(0, 5).map((h) => (
            <button
              key={h.uid}
              type="button"
              onClick={() => setSelectedHistoryUid(h.uid)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold tabular-nums cursor-pointer ${
                selectedHist?.uid === h.uid ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {h.scanCode}
            </button>
          ))}
        </div>
        {selectedHist && (
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 tabular-nums">
            <div className="font-bold">
              {selectedHist.scanCode} · {selectedHist.name}
            </div>
            <div className="text-slate-600">{selectedHist.originSummary}</div>
            <div className="text-emerald-700 font-semibold">
              Ghi nhận USED bởi {selectedHist.actorName} ({selectedHist.usedAt})
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white/95 text-slate-900 p-3 border border-white space-y-1 text-xs tabular-nums">
        <div className="font-bold">7, 8 &amp; 9. Danh Mục · Order Mùa 3 · Kiểm Kê</div>
        <div>• Danh mục đang chạy: {state.reports.report7ActiveSkuCount} SKU (24 món bắt buộc CV/CVL).</div>
        <div>• Cảnh báo đặt hàng Kho Tổng: {state.reports.report8SuggestedReorderCount} SKU chạm mức thấp.</div>
        <div>• Tồn Lost nền legacy ({state.reports.report9LegacyLostBaseline}) giảm nhờ Lông Tái Sinh.</div>
      </div>

      {/* Configurable Feather Rule Engine + Live Economy Calculator */}
      <WingsGardenRuleConfigEditor state={state} busy={busy} onSaveFeatherRules={onSaveFeatherRules} />

      {/* Config-Driven Live Admin Editor */}
      <div className="rounded-2xl bg-white/95 text-slate-900 border border-amber-300 p-3 space-y-2 text-xs">
        <div className="font-bold text-amber-800">⚙️ Chỉnh Nhanh Giá Niêm Yết &amp; Lông (Admin Config)</div>
        <select
          value={editSkuId}
          onChange={(e) => {
            const sku = state.config.skus.find((s) => s.skuId === e.target.value);
            setEditSkuId(e.target.value);
            if (sku) {
              setEditPrice(String(sku.listedPriceVnd));
              setEditFeathers(String(sku.costFeathers));
            }
          }}
          className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold"
        >
          {state.config.skus.map((s) => (
            <option key={s.skuId} value={s.skuId}>
              {s.name} ({formatVnd(s.listedPriceVnd)} / {s.costFeathers} Lông)
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min={1000}
            step={1000}
            value={editPrice}
            onChange={(e) => setEditPrice(e.target.value)}
            aria-label="Giá niêm yết VNĐ"
            className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs tabular-nums"
          />
          <input
            type="number"
            min={1}
            max={200}
            value={editFeathers}
            onChange={(e) => setEditFeathers(e.target.value)}
            aria-label="Giá đổi Lông"
            className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs tabular-nums"
          />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => onUpdateSkuConfig(editSkuId, Number(editPrice), Number(editFeathers))}
          className="w-full py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
        >
          Lưu Cấu Hình Lên Server
        </button>
      </div>
    </div>
  );
}
