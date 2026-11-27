'use client';

import React from 'react';
import { Award, Calculator, ChevronDown, Info, Sparkles, UserPlus } from 'lucide-react';
import { AppleStepperRow } from './ApplePrimitives';
import { FmInfoTrigger } from './FmInfoGuideModal';
import {
  BRANCH_SPECS,
  FM_BOUNTY_CVLL_PROMO_VND,
  FM_BOUNTY_CVL_PROMO_VND,
  FM_BOUNTY_FM2_MENTOR_VND,
  FM_BOUNTY_ROOKIE_PASS_VND,
  FM_EFFICIENCY_BENCHMARK_REV_VND,
  FM_ROOKIE_ESTIMATED_REV_VND,
  FM_ROOKIE_GRACE_DAYS,
  FM_SECOND_FM_MIN_MATURE_CVS,
  FM_SECOND_FM_MIN_REV_VND,
  FmSimulationResult,
  SimulatorInput,
  formatK,
  formatM,
  resolveBaseOccupancyRate,
} from './fm-simulator.engine';

interface FmGrowthControlsSectionProps {
  readonly input: SimulatorInput;
  readonly fm: FmSimulationResult;
  readonly onChange: (patch: Partial<SimulatorInput>) => void;
}

function formatBountyUnit(vnd: number): string {
  return vnd >= 1_000_000 ? `${(vnd / 1_000_000).toFixed(1)}M` : formatK(vnd);
}

export function FmGrowthControlsSection({ input, fm, onChange }: FmGrowthControlsSectionProps) {
  const spec = BRANCH_SPECS[input.branch];
  const maxRookies = Math.max(0, input.cvs - 1);
  const occRawPct = Math.round((input.cvs / spec.beds) * 100);
  const baseOccRatePct = resolveBaseOccupancyRate(input.cvs, spec.beds) * 100;
  const estRookieRevVnd = Math.min(input.revVnd * 0.4, fm.rookieCvs * FM_ROOKIE_ESTIMATED_REV_VND);
  const matureRevM = Math.round((input.revVnd - estRookieRevVnd) / 1_000_000);
  const totalRevM = Math.round(input.revVnd / 1_000_000);

  const bountyRows = [
    {
      key: 'rookie',
      icon: <Sparkles className="h-3.5 w-3.5 text-blue-500" />,
      label: 'CV mới qua 60 ngày',
      unitVnd: FM_BOUNTY_ROOKIE_PASS_VND,
      condition: 'Qua thử việc 60 ngày & đạt ≥30M/tháng',
      count: input.bountyRookiePassCount,
      min: 0,
      max: 4,
      onChange: (bountyRookiePassCount: number) => onChange({ bountyRookiePassCount }),
    },
    {
      key: 'cvl',
      icon: <Sparkles className="h-3.5 w-3.5 text-emerald-500" />,
      label: 'Thăng hạng CV ➔ CVL',
      unitVnd: FM_BOUNTY_CVL_PROMO_VND,
      condition: 'Giữ chuẩn tự tư vấn ổn định đủ 2 tháng liên tiếp',
      count: input.bountyCvlPromoCount,
      min: 0,
      max: 4,
      onChange: (bountyCvlPromoCount: number) => onChange({ bountyCvlPromoCount }),
    },
    {
      key: 'cvll',
      icon: <Sparkles className="h-3.5 w-3.5 text-amber-500" />,
      label: 'Thăng hạng CVL ➔ CVLL',
      unitVnd: FM_BOUNTY_CVLL_PROMO_VND,
      condition: 'Không giới hạn số CVLL — đạt chuẩn là thưởng',
      count: input.bountyCvllPromoCount,
      min: 0,
      max: 4,
      onChange: (bountyCvllPromoCount: number) => onChange({ bountyCvllPromoCount }),
    },
    {
      key: 'fm2',
      icon: <Award className="h-3.5 w-3.5 text-violet-500" />,
      label: 'Đào tạo FM #2 kế cận',
      unitVnd: FM_BOUNTY_FM2_MENTOR_VND,
      condition: 'Bổ nhiệm thành công & đứng ca độc lập tại sàn',
      count: input.bountyFm2MentorCount,
      min: 0,
      max: 2,
      onChange: (bountyFm2MentorCount: number) => onChange({ bountyFm2MentorCount }),
    },
  ];

  const activeBountyTerms = bountyRows
    .filter((r) => r.count > 0)
    .map((r) => `${r.count}×${formatBountyUnit(r.unitVnd)}`);

  return (
    <div className="space-y-2.5 border-t border-black/5 pt-2.5 dark:border-white/10">
      <AppleStepperRow
        icon={<UserPlus className="h-3.5 w-3.5 text-emerald-500" />}
        label={`CV mới ≤ ${FM_ROOKIE_GRACE_DAYS} ngày (Miễn mẫu số)`}
        infoSlot={<FmInfoTrigger guideId="ctrl-rookies" label={`CV mới ≤ ${FM_ROOKIE_GRACE_DAYS} ngày`} />}
        hint={`Hiện có: ${fm.matureCvs} CV chính thức + ${fm.rookieCvs} CV mới = ${input.cvs} CV`}
        value={input.rookieCvs}
        min={0}
        max={maxRookies}
        onChange={(rookieCvs) => onChange({ rookieCvs })}
      />

      {/* Live Formula Explainer for Revenue Share & Rookie Grace */}
      <details className="group rounded-2xl border border-black/5 bg-neutral-100/75 px-3.5 py-2.5 dark:border-white/10 dark:bg-neutral-800/65">
        <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-200">
            <Calculator className="h-3.5 w-3.5 text-blue-500" />
            <span>Cách tính % DT &amp; Miễn mẫu số</span>
            <FmInfoTrigger guideId="kpi-revshare" label="Cách tính % DT & Miễn mẫu số" />
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tabular-nums text-blue-600 dark:text-blue-400">
            <span>
              {(fm.revPoolRate * 100).toFixed(2)}% = {formatM(fm.revShareOneFmVnd, 2)}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-neutral-400 transition-transform group-open:rotate-180" />
          </span>
        </summary>

        <div className="mt-2.5 space-y-2 border-t border-black/5 pt-2.5 text-[11px] leading-relaxed dark:border-white/10">
          <div className="flex items-start justify-between gap-2">
            <span className="text-neutral-500 dark:text-neutral-400">
              1. Lấp giường ({input.cvs}/{spec.beds}G = {occRawPct}%)
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-neutral-800 dark:text-neutral-100">
              nền {baseOccRatePct.toFixed(2)}% / FM
            </span>
          </div>

          <div className="flex items-start justify-between gap-2">
            <span className="text-neutral-500 dark:text-neutral-400">
              2. Hiệu suất REV/CV chuẩn{' '}
              {fm.rookieCvs > 0
                ? `(trừ ${fm.rookieCvs} mới ≈ ${Math.round(estRookieRevVnd / 1e6)}M → ${matureRevM}M ÷ ${fm.matureCvs} CV)`
                : ''}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-neutral-800 dark:text-neutral-100">
              {formatM(fm.revPerMatureCvVnd, 1)} ÷ {Math.round(FM_EFFICIENCY_BENCHMARK_REV_VND / 1_000_000)}M →{' '}
              {fm.effMultiplier.toFixed(2)}×
            </span>
          </div>

          <div className="flex items-start justify-between gap-2">
            <span className="text-neutral-500 dark:text-neutral-400">3. Thưởng % DT của 1 FM</span>
            <span className="shrink-0 font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {totalRevM}M × {(fm.revPoolRate * 100).toFixed(2)}% = {formatM(fm.revShareOneFmVnd, 2)}
            </span>
          </div>

          <div className="flex items-start justify-between gap-2 rounded-xl bg-white/80 px-2.5 py-1.5 dark:bg-neutral-900/70">
            <span className="text-neutral-500 dark:text-neutral-400">
              Cổng tách 2 FM (≥{FM_SECOND_FM_MIN_MATURE_CVS} CV chính &amp; ≥650M)
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-neutral-800 dark:text-neutral-100">
              {fm.matureCvs}/{FM_SECOND_FM_MIN_MATURE_CVS} CV · {totalRevM}M/
              {Math.round(FM_SECOND_FM_MIN_REV_VND / 1e6)}M → {fm.fmCount} FM
            </span>
          </div>
        </div>
      </details>

      {/* Refactored Thưởng Nóng Đẻ Quân */}
      <details
        open
        className="group rounded-2xl border border-black/5 bg-neutral-100/75 px-3.5 py-2.5 dark:border-white/10 dark:bg-neutral-800/65"
      >
        <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 text-xs">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 font-semibold text-neutral-800 dark:text-neutral-100">
              <Award className="h-3.5 w-3.5 text-amber-500" />
              <span>Thưởng Nóng Đẻ Quân</span>
              <FmInfoTrigger guideId="ctrl-bounty" label="Thưởng Nóng Đẻ Quân" />
            </span>
            <p className="mt-0.5 text-[11px] font-normal text-neutral-400 dark:text-neutral-500">
              Trả 1 lần trực tiếp cho FM đào tạo
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            <span>{fm.graduationBountyOneFmVnd > 0 ? `+${formatM(fm.graduationBountyOneFmVnd, 2)}` : '0đ'}</span>
            <ChevronDown className="h-3.5 w-3.5 text-neutral-400 transition-transform group-open:rotate-180" />
          </span>
        </summary>

        <div className="mt-2.5 space-y-2 border-t border-black/5 pt-2.5 dark:border-white/10">
          <div className="flex items-start gap-2 rounded-xl bg-amber-50/80 px-3 py-2 text-[11px] leading-snug text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span>
              Thưởng <strong>1 lần duy nhất</strong> vào tháng đạt mốc cho FM đào tạo — tách biệt với Quỹ 8★ và{' '}
              <strong>không bị chia đôi</strong> kể cả khi shop tách 2 FM.
            </span>
          </div>

          <div className="divide-y divide-black/5 dark:divide-white/10">
            {bountyRows.map((row) => (
              <AppleStepperRow
                key={row.key}
                icon={row.icon}
                label={`${row.label} (+${formatBountyUnit(row.unitVnd)})`}
                hint={
                  row.count > 0
                    ? `${row.count} × ${formatBountyUnit(row.unitVnd)} = +${formatBountyUnit(row.count * row.unitVnd)} · ${row.condition}`
                    : row.condition
                }
                value={row.count}
                min={row.min}
                max={row.max}
                onChange={row.onChange}
              />
            ))}
          </div>

          {fm.graduationBountyOneFmVnd > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50/80 px-3 py-2 text-[11px] font-medium tabular-nums text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
              <span>Công thức: {activeBountyTerms.join(' + ')}</span>
              <span className="font-semibold">
                = +{formatM(fm.graduationBountyOneFmVnd, 2)} (cộng thẳng Thu nhập 1 FM)
              </span>
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );
}
