'use client';

import React from 'react';
import {
  Activity,
  AlertTriangle,
  Award,
  Bug,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Lock,
  ShieldAlert,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { AppleKpiHero, AppleSegmented, AppleSliderRow, AppleStepperRow, AppleSurface } from './ApplePrimitives';
import { FmPillarCard, METRIC_SLIDER_SPECS } from './FmPillarCard';
import {
  AUTONOMY_HARD_MAX_PCT,
  BRANCH_SPECS,
  BranchKey,
  DEFAULT_PILLAR_METRICS,
  FM_MIN_CEO_HR_MEETINGS_PER_WEEK,
  FmLevel,
  FmSimulationResult,
  MetricPillarKey,
  PILLAR_SPECS,
  PillarKey,
  SimulatorInput,
  formatK,
  formatM,
  resolveAutonomyBoundsForStar,
  resolveAutonomyStar,
  resolveDefaultMetricForStar,
  resolveStarFromPillarMetric,
} from './fm-simulator.engine';

export type FmPresetKey = 'dt-2star' | 'dt-3star' | 'ep-1fm' | 'below-gate';

const PILLAR_DISPLAY_ORDER: readonly PillarKey[] = ['maps', 'fal', 'inventory', 'room', 'turn', 'grooming', 'autonomy'];

interface FmCockpitViewProps {
  readonly input: SimulatorInput;
  readonly fm: FmSimulationResult;
  readonly compact: boolean;
  readonly onChange: (patch: Partial<SimulatorInput>) => void;
  readonly onApplyPreset: (preset: FmPresetKey) => void;
}

export function FmCockpitView({ input, fm, compact, onChange, onApplyPreset }: FmCockpitViewProps) {
  const spec = BRANCH_SPECS[input.branch];
  const revM = Math.round(input.revVnd / 1_000_000);
  const metrics = input.pillarMetrics ?? DEFAULT_PILLAR_METRICS;

  const handleAutonomyChange = (nextPct: number, nextKeyholders = input.cvllKeyholders) => {
    const capped = Math.min(AUTONOMY_HARD_MAX_PCT, Math.max(0, nextPct));
    const star = resolveAutonomyStar(capped, nextKeyholders);
    onChange({
      autonomyPct: capped,
      cvllKeyholders: nextKeyholders,
      stars: { ...input.stars, autonomy: star },
    });
  };

  const handleMetricChange = (key: MetricPillarKey, rawVal: number) => {
    const cleaned = METRIC_SLIDER_SPECS[key].step < 1 ? Math.round(rawVal * 10) / 10 : Math.round(rawVal);
    const nextStar = resolveStarFromPillarMetric(key, cleaned, input.cvs);
    onChange({
      pillarMetrics: {
        ...metrics,
        [METRIC_SLIDER_SPECS[key].metricField]: cleaned,
      },
      stars: { ...input.stars, [key]: nextStar },
    });
  };

  const handleCvsChange = (nextCvs: number) => {
    const nextMapsStar = resolveStarFromPillarMetric('maps', metrics.mapsReviews5Star, nextCvs);
    onChange({
      cvs: nextCvs,
      stars: { ...input.stars, maps: nextMapsStar },
    });
  };

  const handleSelectStar = (key: PillarKey, star: 0 | 1 | 2 | 3) => {
    if (key === 'autonomy') {
      const bounds = resolveAutonomyBoundsForStar(star);
      onChange({
        autonomyPct: bounds.autonomyPct,
        cvllKeyholders: bounds.cvllKeyholders,
        ceoHrMeetingsPerWeek:
          star > 0 ? Math.max(FM_MIN_CEO_HR_MEETINGS_PER_WEEK, input.ceoHrMeetingsPerWeek) : input.ceoHrMeetingsPerWeek,
        stars: { ...input.stars, autonomy: star },
      });
      return;
    }
    if (key === 'grooming') {
      onChange({
        stars: { ...input.stars, grooming: star },
      });
      return;
    }
    const snappedMetric = resolveDefaultMetricForStar(key, star, input.cvs);
    onChange({
      pillarMetrics: {
        ...metrics,
        [METRIC_SLIDER_SPECS[key].metricField]: snappedMetric,
      },
      stars: { ...input.stars, [key]: star },
    });
  };

  return (
    <div className="space-y-4">
      {/* Independent FM Presets */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'dt-2star' as const, label: 'ĐT Chuẩn 2★', icon: <Sparkles className="h-3.5 w-3.5 text-amber-500" /> },
          {
            id: 'dt-3star' as const,
            label: 'ĐT Đỉnh 3★',
            icon: <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />,
          },
          { id: 'ep-1fm' as const, label: 'EP 1 FM', icon: <Building2 className="h-3.5 w-3.5 text-blue-500" /> },
          {
            id: 'below-gate' as const,
            label: 'Dưới Cổng 8 CV',
            icon: <Activity className="h-3.5 w-3.5 text-rose-500" />,
          },
        ].map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onApplyPreset(p.id)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-black/5 bg-white/80 px-3.5 text-xs font-medium text-neutral-700 shadow-xs backdrop-blur transition hover:bg-white dark:border-white/10 dark:bg-neutral-900/80 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            {p.icon}
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      {/* Top 4 KPIs */}
      <div className={compact ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-4 gap-3'}>
        <AppleKpiHero
          icon={<Award className="h-3.5 w-3.5 text-blue-500" />}
          label="Thu nhập 1 FM"
          value={formatM(fm.fmIncomeOneVnd, 2)}
          hint={`Cứng ${formatM(fm.fmBaseOneVnd, 1)} · ${input.workDays}/26 công`}
          tone="blue"
        />
        <AppleKpiHero
          icon={<Users className="h-3.5 w-3.5 text-emerald-500" />}
          label="Thưởng % DT"
          value={formatM(fm.revShareOneFmVnd + fm.coverBonusOneFmVnd, 2)}
          hint={`${(fm.revPoolRate * 100).toFixed(1)}% · ${fm.fmCount === 2 ? '50% × 2 FM' : '100% × 1 FM'}`}
          tone="emerald"
        />
        <AppleKpiHero
          icon={<Star className="h-3.5 w-3.5 text-amber-500" />}
          label="Quỹ 7 Sao (Net)"
          value={formatM(fm.netStarPoolOneFmVnd, 2)}
          hint={`${fm.totalEffectiveStars}/21★ · Trừ phạt ${formatK(fm.latePenaltyVnd + fm.shieldLossVnd)}`}
          tone="amber"
        />
        <AppleKpiHero
          icon={<Wallet className="h-3.5 w-3.5 text-violet-500" />}
          label="Ví Game · Fun Fund"
          value={formatM(fm.claimedWalletVnd, 2)}
          hint={`Quỹ chơi ${formatK(fm.funFundVnd)} (${input.consultShifts} ca TV)`}
          tone="neutral"
        />
      </div>

      {/* 3 Gates Status Row */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium ${
            fm.gate1Passed
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
          }`}
        >
          {fm.gate1Passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          <span>
            Cổng Giường: {input.cvs}/{fm.minCvsGate} CV
          </span>
        </span>

        <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-neutral-100 px-3 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
          <Sparkles className="h-3.5 w-3.5 text-blue-500" />
          <span>REV/CV: {formatM(fm.revPerCvVnd, 1)}</span>
        </span>

        <span
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium ${
            fm.ceoHrGatePassed
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
          }`}
        >
          {fm.ceoHrGatePassed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          <span>
            CEO &amp; HR: {input.ceoHrMeetingsPerWeek}/{FM_MIN_CEO_HR_MEETINGS_PER_WEEK} buổi/tuần
          </span>
        </span>

        <span
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium ${
            fm.holidayAutopilotUnlocked
              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
              : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500'
          }`}
        >
          {fm.holidayAutopilotUnlocked ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          <span>Tự lái Lễ Tết (≥2★)</span>
        </span>
      </div>

      <div className={compact ? 'space-y-4' : 'grid grid-cols-12 gap-4'}>
        {/* Standalone FM Controls */}
        <AppleSurface className={compact ? 'space-y-3 p-4' : 'col-span-5 space-y-3 p-5'}>
          <AppleSegmented<BranchKey>
            ariaLabel="Chọn chi nhánh FM"
            value={input.branch}
            onChange={(branch) => {
              const target = BRANCH_SPECS[branch];
              const nextMapsStar = resolveStarFromPillarMetric(
                'maps',
                metrics.mapsReviews5Star,
                target.presetDefaultCvs
              );
              onChange({
                branch,
                revVnd: target.presetDefaultRev,
                cvs: target.presetDefaultCvs,
                stars: { ...input.stars, maps: nextMapsStar },
              });
            }}
            options={[
              { value: 'dt', label: 'Đề Thám · 18G', icon: <Building2 className="h-3.5 w-3.5" /> },
              { value: 'ep', label: 'Estella · 12G', icon: <Building2 className="h-3.5 w-3.5" /> },
            ]}
            className="w-full"
          />

          <AppleSliderRow
            id="fm-rev-slider"
            icon={<TrendingUp className="h-3.5 w-3.5 text-blue-500" />}
            label="Doanh thu sàn"
            valueText={`${revM}M`}
            value={revM}
            min={300}
            max={950}
            step={10}
            hint={`Min cổng giường: ${spec.minCvsGate} CV · REV/CV quyết định % DT`}
            onChange={(nextM) => onChange({ revVnd: nextM * 1_000_000 })}
          />

          <AppleStepperRow
            icon={<Users className="h-3.5 w-3.5 text-neutral-500" />}
            label="Quân số sàn"
            hint="≤12 CV = 1 FM · ≥13 CV = 2 FM"
            value={input.cvs}
            min={6}
            max={18}
            suffix=" CV"
            onChange={handleCvsChange}
          />

          <div className="border-t border-black/5 pt-2 dark:border-white/10">
            <AppleSegmented<string>
              ariaLabel="Chọn bậc FM"
              value={String(input.fmLevel)}
              onChange={(next) => onChange({ fmLevel: Number(next) as FmLevel })}
              options={[
                { value: '1', label: 'FM 1 · 8M' },
                { value: '2', label: 'FM 2 · 9M' },
                { value: '3', label: 'FM 3 · 10M' },
              ]}
              className="w-full"
            />
          </div>

          <AppleSliderRow
            id="fm-work-days"
            icon={<CalendarCheck className="h-3.5 w-3.5 text-blue-500" />}
            label="Ngày công thực tế"
            valueText={`${input.workDays}/26`}
            value={input.workDays}
            min={16}
            max={26}
            step={1}
            onChange={(workDays) => onChange({ workDays })}
          />

          {fm.fmCount === 2 ? (
            <AppleStepperRow
              icon={<UserCheck className="h-3.5 w-3.5 text-emerald-500" />}
              label="Cover ca đồng đội"
              hint="+400K / ca khi sàn có 2 FM"
              value={input.coverShifts}
              min={0}
              max={6}
              onChange={(coverShifts) => onChange({ coverShifts })}
            />
          ) : null}

          <AppleStepperRow
            icon={<Bug className="h-3.5 w-3.5 text-rose-500" />}
            label="Sâu Google Maps"
            hint={`Bướm chuộc: ${input.butterflies} · Net sâu: ${fm.netWorms}`}
            value={input.worms}
            min={0}
            max={5}
            onChange={(worms) => onChange({ worms })}
          />

          <AppleStepperRow
            icon={<Sparkles className="h-3.5 w-3.5 text-amber-500" />}
            label="Bướm chuộc sao"
            hint="Gỡ 1 sâu hoặc cộng 1★ Maps"
            value={input.butterflies}
            min={0}
            max={3}
            onChange={(butterflies) => onChange({ butterflies })}
          />

          <AppleStepperRow
            icon={<Clock className="h-3.5 w-3.5 text-amber-500" />}
            label="Trễ xử lý 24–48h"
            hint="-200K vào Quỹ Sao"
            value={input.late24To48Count}
            min={0}
            max={4}
            onChange={(late24To48Count) => onChange({ late24To48Count })}
          />

          <AppleStepperRow
            icon={<ShieldAlert className="h-3.5 w-3.5 text-rose-500" />}
            label="Mất Khiên Tuần"
            hint="4 khiên/tháng · Mất 1 = -25% Quỹ Sao"
            value={input.shieldsLost}
            min={0}
            max={4}
            onChange={(shieldsLost) => onChange({ shieldsLost })}
          />

          <AppleStepperRow
            icon={<Wallet className="h-3.5 w-3.5 text-violet-500" />}
            label="Ca tư vấn (Fun Fund)"
            hint="80K / ca · Riêng ngoài lương"
            value={input.consultShifts}
            min={0}
            max={12}
            onChange={(consultShifts) => onChange({ consultShifts })}
          />
        </AppleSurface>

        {/* 7 Star Pillars */}
        <div className={compact ? 'space-y-2.5' : 'col-span-7 grid grid-cols-2 content-start gap-3'}>
          {PILLAR_DISPLAY_ORDER.map((pillarKey) => {
            const pillar = PILLAR_SPECS.find((p) => p.key === pillarKey);
            if (!pillar) return null;
            return (
              <FmPillarCard
                key={pillar.key}
                pillar={pillar}
                breakdown={fm.pillarBreakdowns.find((b) => b.key === pillar.key)}
                cvs={input.cvs}
                metrics={metrics}
                autonomyPct={input.autonomyPct}
                cvllKeyholders={input.cvllKeyholders}
                ceoHrMeetingsPerWeek={input.ceoHrMeetingsPerWeek}
                ceoHrGatePassed={fm.ceoHrGatePassed}
                onAutonomyChange={handleAutonomyChange}
                onCeoHrChange={(ceoHrMeetingsPerWeek) => onChange({ ceoHrMeetingsPerWeek })}
                onMetricChange={handleMetricChange}
                onSelectStar={handleSelectStar}
              />
            );
          })}
          {!compact ? (
            <AppleSurface className="flex h-full flex-col justify-between gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-neutral-900 dark:text-white">Tổng Quỹ Sao</div>
                    <div className="text-[11px] font-normal text-neutral-400 dark:text-neutral-500">
                      7 trụ cột chuẩn KPI
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold tabular-nums text-neutral-900 dark:text-white">
                  {fm.totalEffectiveStars}/21★
                </span>
              </div>

              <div className="divide-y divide-black/5 rounded-xl bg-neutral-100/75 px-3 text-xs dark:divide-white/10 dark:bg-neutral-800/65">
                {[
                  { label: 'Mức 1★', value: formatM(fm.sum1StarBudgetVnd, 2) },
                  { label: 'Mức 2★', value: formatM(fm.sum2StarBudgetVnd, 2) },
                  { label: 'Mức 3★', value: formatM(fm.sum3StarBudgetVnd, 2) },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-2">
                    <span className="text-neutral-400 dark:text-neutral-500">{row.label}</span>
                    <span className="font-semibold tabular-nums text-neutral-800 dark:text-neutral-100">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex min-h-11 items-center justify-between rounded-xl bg-neutral-100/90 px-3 text-xs dark:bg-neutral-800/80">
                <span className="text-neutral-500 dark:text-neutral-400">Tự lái Lễ Tết</span>
                <span
                  className={`font-semibold ${
                    fm.holidayAutopilotUnlocked
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-neutral-400 dark:text-neutral-500'
                  }`}
                >
                  {fm.holidayAutopilotUnlocked ? 'Đã mở khóa' : 'Cần ≥2★ Tự lái'}
                </span>
              </div>
            </AppleSurface>
          ) : null}
        </div>
      </div>
    </div>
  );
}
