'use client';

import React from 'react';
import { FmInfoTrigger } from './FmInfoGuideModal';
import type { FmGuideId } from './fm-guide-content-pillars';
import {
  Camera,
  Check,
  Crown,
  MapPin,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Star,
  Store,
  Users,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react';
import { AppleSurface } from './ApplePrimitives';
import {
  AUTONOMY_HARD_MAX_PCT,
  FM_MIN_CEO_HR_MEETINGS_PER_WEEK,
  type FmPillarBreakdown,
  type MetricPillarKey,
  type PillarKey,
  type PillarMeta,
  type PillarMetrics,
  formatK,
} from './fm-simulator.engine';

const PILLAR_ICONS: Record<PillarKey, React.ReactNode> = {
  maps: <MapPin className="h-4 w-4 text-rose-500" />,
  fal: <Wrench className="h-4 w-4 text-amber-500" />,
  autonomy: <Shield className="h-4 w-4 text-emerald-500" />,
  inventory: <Package className="h-4 w-4 text-blue-500" />,
  room: <Store className="h-4 w-4 text-violet-500" />,
  grooming: <Sparkles className="h-4 w-4 text-pink-500" />,
  turn: <RefreshCw className="h-4 w-4 text-cyan-500" />,
  bonding: <UtensilsCrossed className="h-4 w-4 text-amber-500" />,
};

export interface MetricSliderSpec {
  readonly label: string;
  readonly metricField: keyof PillarMetrics;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly formatValue: (val: number) => string;
}

export const METRIC_SLIDER_SPECS: Record<MetricPillarKey, MetricSliderSpec> = {
  maps: {
    label: 'Review 5★',
    metricField: 'mapsReviews5Star',
    min: 0,
    max: 40,
    step: 1,
    formatValue: (v) => `${Math.round(v)} review`,
  },
  fal: {
    label: 'Tỷ lệ FAL',
    metricField: 'falRatePct',
    min: 0,
    max: 3,
    step: 0.1,
    formatValue: (v) => `${v.toFixed(1)}%`,
  },
  inventory: {
    label: 'Lệch kho',
    metricField: 'inventoryVariancePct',
    min: 0,
    max: 5,
    step: 0.1,
    formatValue: (v) => `${v.toFixed(1)}%`,
  },
  room: {
    label: 'Điểm phòng',
    metricField: 'roomScore',
    min: 80,
    max: 100,
    step: 1,
    formatValue: (v) => `${Math.round(v)}đ`,
  },
  turn: {
    label: 'Chỉ số HI',
    metricField: 'turnHiPct',
    min: 60,
    max: 100,
    step: 1,
    formatValue: (v) => `${Math.round(v)}%`,
  },
};

const GROOMING_STANDARDS = ['Đồng phục', 'Mi nối', 'Son', 'Tóc gọn'] as const;

function AutonomyRowStepper({
  icon,
  label,
  hint,
  value,
  min,
  max,
  suffix = '',
  warn = false,
  onChange,
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly hint: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly suffix?: string;
  readonly warn?: boolean;
  readonly onChange: (next: number) => void;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-2 py-1">
      <div className="flex min-w-0 items-center gap-1.5">
        {icon}
        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">{label}</span>
        <span className="text-[11px] font-normal text-neutral-400 dark:text-neutral-500">{hint}</span>
      </div>
      <div className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/80 p-0.5 shadow-2xs dark:bg-neutral-900/70">
        <button
          type="button"
          aria-label={`Giảm ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-30 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span
          className={`min-w-9 text-center text-xs font-semibold tabular-nums ${
            warn ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-900 dark:text-white'
          }`}
        >
          {value}
          {suffix}
        </span>
        <button
          type="button"
          aria-label={`Tăng ${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-30 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

interface FmPillarCardProps {
  readonly pillar: PillarMeta;
  readonly breakdown?: FmPillarBreakdown;
  readonly cvs: number;
  readonly metrics: PillarMetrics;
  readonly autonomyPct: number;
  readonly cvllKeyholders: number;
  readonly ceoHrMeetingsPerWeek: number;
  readonly ceoHrGatePassed: boolean;
  readonly bondingDinnerOrganized: boolean;
  readonly bondingHasSocialCheckin: boolean;
  readonly bondingParticipationPct: number;
  readonly onAutonomyChange: (nextPct: number, nextCvll: number) => void;
  readonly onCeoHrChange: (nextMeetings: number) => void;
  readonly onBondingChange: (patch: {
    bondingDinnerOrganized?: boolean;
    bondingHasSocialCheckin?: boolean;
    bondingParticipationPct?: number;
  }) => void;
  readonly onMetricChange: (key: MetricPillarKey, rawVal: number) => void;
  readonly onSelectStar: (key: PillarKey, star: 0 | 1 | 2 | 3) => void;
}

export function FmPillarCard({
  pillar,
  breakdown,
  cvs,
  metrics,
  autonomyPct,
  cvllKeyholders,
  ceoHrMeetingsPerWeek,
  ceoHrGatePassed,
  bondingDinnerOrganized,
  bondingHasSocialCheckin,
  bondingParticipationPct,
  onAutonomyChange,
  onCeoHrChange,
  onBondingChange,
  onMetricChange,
  onSelectStar,
}: FmPillarCardProps) {
  const effective = breakdown?.effectiveStar ?? 0;
  const gross = breakdown?.grossVnd ?? 0;
  const isAutonomy = pillar.key === 'autonomy';
  const isGrooming = pillar.key === 'grooming';
  const isBonding = pillar.key === 'bonding';
  const metricSpec = !isAutonomy && !isGrooming && !isBonding ? METRIC_SLIDER_SPECS[pillar.key] : null;
  const metricValue = isAutonomy
    ? Math.min(AUTONOMY_HARD_MAX_PCT, Math.round(autonomyPct))
    : isBonding
      ? Math.max(0, Math.min(100, Math.round(bondingParticipationPct)))
      : metricSpec
        ? metrics[metricSpec.metricField]
        : null;

  return (
    <AppleSurface className="flex h-full flex-col justify-between gap-3 p-4">
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
              {PILLAR_ICONS[pillar.key]}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-neutral-900 dark:text-white">{pillar.label}</span>
                <FmInfoTrigger guideId={`pillar-${pillar.key}` as FmGuideId} label={pillar.label} />
              </div>
              <div className="text-[11px] font-normal text-neutral-400 dark:text-neutral-500">
                {breakdown?.note ?? pillar.targets[Math.max(0, effective - 1)]}
              </div>
            </div>
          </div>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {gross > 0 ? `+${formatK(gross)}` : '0đ'}
          </span>
        </div>

        {metricValue !== null ? (
          <div className="space-y-0.5 pt-0.5">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-neutral-400 dark:text-neutral-500">
                {isAutonomy ? 'Tỷ lệ Tự lái' : isBonding ? 'Tỷ lệ tham gia tiệc' : metricSpec?.label}
              </span>
              <span className="font-medium tabular-nums text-neutral-700 dark:text-neutral-200">
                {isAutonomy || isBonding
                  ? `${metricValue}%`
                  : pillar.key === 'maps'
                    ? `${Math.round(metricValue)} rv (${(metricValue / Math.max(1, cvs)).toFixed(1)}%)`
                    : metricSpec?.formatValue(metricValue)}
              </span>
            </div>
            <input
              type="range"
              min={isAutonomy || isBonding ? 0 : metricSpec?.min}
              max={
                isAutonomy
                  ? AUTONOMY_HARD_MAX_PCT
                  : isBonding
                    ? 100
                    : pillar.key === 'maps'
                      ? Math.max(40, cvs * 5)
                      : metricSpec?.max
              }
              step={isAutonomy || isBonding ? 5 : metricSpec?.step}
              value={metricValue}
              aria-label={`Chỉ số ${pillar.label}`}
              onChange={(e) => {
                const nextVal = Number(e.target.value);
                if (isAutonomy) {
                  onAutonomyChange(nextVal, cvllKeyholders);
                } else if (isBonding) {
                  onBondingChange({ bondingParticipationPct: nextVal });
                } else if (!isGrooming) {
                  onMetricChange(pillar.key as MetricPillarKey, nextVal);
                }
              }}
              className="fm-apple-range"
            />
          </div>
        ) : null}

        {isBonding ? (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => onBondingChange({ bondingDinnerOrganized: !bondingDinnerOrganized })}
              className={`inline-flex min-h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-medium transition ${
                bondingDinnerOrganized
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
              }`}
            >
              <UtensilsCrossed className="h-3 w-3" />
              <span>{bondingDinnerOrganized ? 'Đã đi ăn tháng' : 'Chưa tổ chức'}</span>
            </button>
            <button
              type="button"
              onClick={() => onBondingChange({ bondingHasSocialCheckin: !bondingHasSocialCheckin })}
              className={`inline-flex min-h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-medium transition ${
                bondingHasSocialCheckin
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
              }`}
            >
              <Camera className="h-3 w-3" />
              <span>{bondingHasSocialCheckin ? 'Có ảnh MXH' : 'Thiếu ảnh MXH'}</span>
            </button>
          </div>
        ) : null}

        {isGrooming ? (
          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            {GROOMING_STANDARDS.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 rounded-lg bg-neutral-100/90 px-2.5 py-1.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800/80 dark:text-neutral-300"
              >
                <Check className="h-3 w-3 text-pink-500" />
                <span>{item}</span>
              </span>
            ))}
          </div>
        ) : null}

        {isAutonomy ? (
          <div className="divide-y divide-black/5 rounded-xl bg-neutral-100/75 px-3 dark:divide-white/10 dark:bg-neutral-800/65">
            <AutonomyRowStepper
              icon={<Crown className="h-3.5 w-3.5 text-amber-500" />}
              label="CVLL"
              hint="≥2 lên 3★"
              value={cvllKeyholders}
              min={0}
              max={4}
              warn={metricValue !== null && metricValue >= 60 && cvllKeyholders < 2}
              onChange={(cvll) => onAutonomyChange(autonomyPct, cvll)}
            />
            <AutonomyRowStepper
              icon={<Users className="h-3.5 w-3.5 text-blue-500" />}
              label="CEO & HR"
              hint="buổi/tuần"
              value={ceoHrMeetingsPerWeek}
              min={0}
              max={5}
              suffix={`/${FM_MIN_CEO_HR_MEETINGS_PER_WEEK}`}
              warn={!ceoHrGatePassed}
              onChange={onCeoHrChange}
            />
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-4 gap-1 rounded-xl bg-neutral-100/90 p-1 dark:bg-neutral-800/80">
        {([0, 1, 2, 3] as const).map((star) => {
          const active = effective === star;
          return (
            <button
              key={star}
              type="button"
              aria-pressed={active}
              onClick={() => onSelectStar(pillar.key, star)}
              className={`inline-flex min-h-11 items-center justify-center gap-0.5 rounded-lg text-xs font-medium tabular-nums transition ${
                active
                  ? 'bg-white text-neutral-900 shadow-xs dark:bg-neutral-700 dark:text-white'
                  : 'text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-200'
              }`}
            >
              {star === 0 ? (
                <span>0★</span>
              ) : (
                <>
                  <span>{star}</span>
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                </>
              )}
            </button>
          );
        })}
      </div>
    </AppleSurface>
  );
}
