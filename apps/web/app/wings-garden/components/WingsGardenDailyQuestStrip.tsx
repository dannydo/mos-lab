'use client';

import React from 'react';
import type { WingsGardenChestKind, WingsGardenStateResponse } from '@mos-lab/shared';
import { CheckCircle2, Gift, RefreshCw, Sparkles } from 'lucide-react';
import { FeatherSvg } from './GardenVisuals';

export interface WingsGardenDailyQuestStripProps {
  state: WingsGardenStateResponse;
  busy: boolean;
  onClaimReward: (claimId?: string, claimAll?: boolean) => void;
  onSyncLegacyToday: () => void;
}

function formatChestTag(kind?: WingsGardenChestKind | null): string | null {
  if (kind === 'gold') return 'Rương Vàng';
  if (kind === 'silver') return 'Rương Bạc';
  if (kind === 'bronze') return 'Rương Đồng';
  return null;
}

export function WingsGardenDailyQuestStrip({
  state,
  busy,
  onClaimReward,
  onSyncLegacyToday,
}: WingsGardenDailyQuestStripProps) {
  const progress = state.wallet.dailyProgress;
  const rules = state.config.featherRules || [];
  const msRule = rules.find((r) => r.trigger === 'DAILY_LASH_MILESTONE');
  const tiers = [...(msRule?.milestoneTiers || [])].sort((a, b) => a.thresholdSets - b.thresholdSets);
  const maxThreshold = tiers.length > 0 ? tiers[tiers.length - 1].thresholdSets : 5;
  const setsToday = Number(progress?.lashSetsToday || 0);
  const pct = Math.min(100, Math.round((setsToday / Math.max(1, maxThreshold)) * 100));
  const claimedIds = new Set(progress?.claimedMilestoneIds || []);
  const readyClaims = (state.wallet.pendingClaims || []).filter((c) => c.status === 'READY');
  const readyTotalFeathers = readyClaims.reduce((sum, c) => sum + Number(c.feathers || 0), 0);
  const totalScansToday =
    Number(progress?.scanImportToday || 0) +
    Number(progress?.scanUsingToday || 0) +
    Number(progress?.scanUsedToday || 0);

  return (
    <div className="space-y-2.5">
      {/* Khay Nhận Lông ✨ */}
      {readyClaims.length > 0 && (
        <section
          aria-label="Khay Nhận Lông Hôm Nay"
          className="rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 text-slate-900 p-3 shadow-sm space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
              <span>Khay Nhận Lông ({readyClaims.length})</span>
            </div>
            {readyClaims.length > 1 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onClaimReward(undefined, true)}
                className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-xs cursor-pointer tabular-nums"
              >
                Nhận tất cả (+{readyTotalFeathers}) ✨
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            {readyClaims.map((claim) => {
              const chestName = formatChestTag(claim.bonusChest);
              return (
                <div
                  key={claim.id}
                  className="rounded-xl bg-white/95 border border-amber-300 px-2.5 py-2 flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{claim.title}</div>
                    <div className="text-xs text-slate-600 truncate">{claim.detail}</div>
                    {chestName && (
                      <div className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800 text-xs font-bold leading-none">
                        <Gift className="w-3 h-3" aria-hidden="true" />
                        <span>+{chestName}</span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onClaimReward(claim.id, false)}
                    className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-extrabold shadow-xs shrink-0 inline-flex items-center gap-1 cursor-pointer tabular-nums"
                  >
                    <FeatherSvg className="w-3.5 h-3.5 text-amber-950" />
                    <span>Nhận +{claim.feathers} Lông ✨</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Thanh Nhiệm Vụ Ngày (0 -> 3 -> 4 -> 5) */}
      <section
        aria-label="Nhiệm Vụ Ngày Mốc Nối Mi"
        className="rounded-2xl bg-white/95 text-slate-900 border border-amber-200 p-3 shadow-xs space-y-2"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-slate-900 truncate">🎯 Nhiệm Vụ Ngày · Mốc Nối Mi</h2>
            <p className="text-xs text-slate-600 tabular-nums">
              Hôm nay:{' '}
              <strong>
                {setsToday}/{maxThreshold}
              </strong>{' '}
              bộ · Đã đồng bộ <strong>{progress?.syncedLegacyEventsCount || 0}</strong> sự kiện đơn
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onSyncLegacyToday}
            className="px-2.5 py-1.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-900 text-xs font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${busy ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Đồng bộ đơn</span>
          </button>
        </div>

        {/* Dynamic Milestone Progress Bar */}
        <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Milestone Tiers Row (0 -> configurable thresholds) */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs tabular-nums">
          <span className="inline-flex items-center justify-center leading-none px-2 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold border border-slate-200">
            0 bộ
          </span>
          {tiers.map((tier) => {
            const reached = setsToday >= tier.thresholdSets;
            const claimed = claimedIds.has(tier.id);
            const chestName = formatChestTag(tier.bonusChest);
            const cls = claimed
              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
              : reached
                ? 'bg-amber-100 text-amber-950 border-amber-400 ring-1 ring-amber-400/60'
                : 'bg-slate-50 text-slate-600 border-slate-200';
            return (
              <span
                key={tier.id}
                className={`inline-flex items-center justify-center gap-1 leading-none px-2 py-1 rounded-lg border font-bold ${cls}`}
              >
                {claimed && <CheckCircle2 className="w-3 h-3 text-emerald-700" aria-hidden="true" />}
                <span>
                  {tier.thresholdSets} bộ: +{tier.feathers}
                  {chestName ? ` + ${chestName}` : ''}
                </span>
              </span>
            );
          })}
        </div>

        {/* Daily Breakdown Pills */}
        <div className="flex flex-wrap gap-1.5 pt-0.5 text-xs tabular-nums text-slate-700">
          <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200">
            Mới: <strong>{progress?.fullSetsToday || 0}</strong>
          </span>
          <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200">
            Dặm: <strong>{progress?.refillsToday || 0}</strong>
          </span>
          <span className="px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200">
            Mi dưới: <strong>{progress?.bottomLashToday || 0}</strong>
          </span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
            Dưỡng mi: <strong>{progress?.serumSoldToday || 0}</strong>
          </span>
          <span className="px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200">
            Combo: <strong>{progress?.comboConvertedToday || 0}</strong>
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
            Quét QR: <strong>{totalScansToday}</strong>
          </span>
        </div>
      </section>
    </div>
  );
}
