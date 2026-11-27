'use client';

import React from 'react';
import { InputNumber, Select, Slider, Switch } from 'antd';
import { ShieldAlert } from 'lucide-react';
import { DEFAULT_COMBO_MIN_COLLECTED_AMOUNT, calculateComboDebtBonus, type ComboDebtBonusMode } from '@mos-lab/shared';
import { CvFeather1Badge, CvFeather2Badge } from '~/app/ios-app/components/ui-kit/CvFeatherLabels';
import { formatThousandsInput, parseThousandsInput } from './careerConfigTypesAndHelpers';

export type SectionCardTone = 'slate' | 'purple' | 'amber' | 'emerald';
export type SectionAccentTone = 'blue' | 'purple' | 'amber' | 'emerald';

const CARD_TONE_CLASSES: Record<SectionCardTone, { container: string; headerBorder: string }> = {
  slate: {
    container:
      'p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3.5 shadow-xs',
    headerBorder: 'border-slate-200/60 dark:border-slate-800',
  },
  purple: {
    container:
      'p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 space-y-4 shadow-xs',
    headerBorder: 'border-purple-200/50 dark:border-purple-800/40',
  },
  amber: {
    container:
      'p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 space-y-3.5 shadow-xs',
    headerBorder: 'border-amber-200/50 dark:border-amber-800/40',
  },
  emerald: {
    container:
      'p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 space-y-3.5 shadow-xs',
    headerBorder: 'border-emerald-200/50 dark:border-emerald-800/40',
  },
};

const ACCENT_TONE_CLASSES: Record<SectionAccentTone, { iconBox: string; badge: string }> = {
  blue: {
    iconBox: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  purple: {
    iconBox: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
  amber: {
    iconBox: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  emerald: {
    iconBox: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
};

export function CvlBadge({ className = '' }: { className?: string }) {
  return <CvFeather1Badge className={className} featherClass="w-3 h-3 text-amber-500 dark:text-amber-400" />;
}

export function CvllBadge({ className = '' }: { className?: string }) {
  return <CvFeather2Badge className={className} featherClass="w-3 h-3 text-amber-500 dark:text-amber-400" />;
}

interface CareerConfigSectionCardProps {
  tone: SectionCardTone;
  iconTone?: SectionAccentTone;
  badgeTone: SectionAccentTone;
  icon: React.ReactNode;
  title: React.ReactNode;
  badge: React.ReactNode;
  children: React.ReactNode;
}

export function CareerConfigSectionCard({
  tone,
  iconTone,
  badgeTone,
  icon,
  title,
  badge,
  children,
}: CareerConfigSectionCardProps) {
  const cardClasses = CARD_TONE_CLASSES[tone];
  const resolvedIconTone = ACCENT_TONE_CLASSES[iconTone ?? badgeTone];
  const resolvedBadgeTone = ACCENT_TONE_CLASSES[badgeTone];

  return (
    <div className={cardClasses.container}>
      <div className={`flex items-center justify-between border-b ${cardClasses.headerBorder} pb-2`}>
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${resolvedIconTone.iconBox}`}>
            {icon}
          </div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 m-0">
            {title}
          </h3>
        </div>
        <span
          className={`inline-flex items-center justify-center gap-1 leading-none px-2 py-1 rounded-full text-[10px] font-bold border uppercase tracking-tight ${resolvedBadgeTone.badge}`}
        >
          {badge}
        </span>
      </div>
      {children}
    </div>
  );
}

interface CareerConfigSliderFieldProps {
  label: React.ReactNode;
  labelDescription?: React.ReactNode;
  labelClassName?: string;
  preSliderNote?: React.ReactNode;
  valueDisplay: React.ReactNode;
  valueClassName?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  footnote?: React.ReactNode;
}

export function CareerConfigSliderField({
  label,
  labelDescription,
  labelClassName = 'text-xs font-bold text-slate-800 dark:text-slate-200',
  preSliderNote,
  valueDisplay,
  valueClassName = 'font-mono font-black tabular-nums text-blue-600 dark:text-blue-400',
  min,
  max,
  step,
  value,
  onChange,
  footnote,
}: CareerConfigSliderFieldProps) {
  return (
    <div>
      <div className={`flex justify-between ${labelClassName}`}>
        {labelDescription ? (
          <div>
            {label}
            <p className="text-[10px] text-slate-400 font-normal mt-0.5">{labelDescription}</p>
          </div>
        ) : (
          <span>{label}</span>
        )}
        <span className={`tabular-nums shrink-0 ${valueClassName}`}>{valueDisplay}</span>
      </div>
      {preSliderNote}
      <Slider min={min} max={max} step={step} value={value} onChange={onChange} />
      {footnote}
    </div>
  );
}

interface CareerConfigVndInputFieldProps {
  label: React.ReactNode;
  headerValue?: React.ReactNode;
  headerValueClassName?: string;
  value: number;
  step: number;
  min: number;
  max?: number;
  addonAfter?: string;
  onChange: (value: number) => void;
}

export function CareerConfigVndInputField({
  label,
  headerValue,
  headerValueClassName = 'font-mono text-amber-600 dark:text-amber-400 font-black tabular-nums',
  value,
  step,
  min,
  max,
  addonAfter = 'đ',
  onChange,
}: CareerConfigVndInputFieldProps) {
  return (
    <div className="space-y-1">
      {headerValue ? (
        <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
          <span>{label}</span>
          <span className={headerValueClassName}>{headerValue}</span>
        </div>
      ) : (
        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{label}</label>
      )}
      <InputNumber
        className="w-full"
        value={value}
        step={step}
        min={min}
        max={max}
        formatter={formatThousandsInput}
        parser={parseThousandsInput}
        addonAfter={addonAfter}
        onChange={(val) => onChange(Number(val || 0))}
      />
    </div>
  );
}

interface CareerConfigSwitchCardProps {
  title: React.ReactNode;
  description: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function CareerConfigSwitchCard({ title, description, checked, onChange }: CareerConfigSwitchCardProps) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
      <div>
        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{title}</div>
        <div className="text-[10px] text-slate-400">{description}</div>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

interface CareerConfigComboPenaltyBoxProps {
  minComboPercent: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description: React.ReactNode;
}

export function CareerConfigComboPenaltyBox({
  minComboPercent,
  checked,
  onChange,
  description,
}: CareerConfigComboPenaltyBoxProps) {
  return (
    <div className="p-2.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
          <span>Chế tài nếu không đạt tối thiểu {minComboPercent}% combo:</span>
        </span>
        <Switch checked={checked} onChange={onChange} />
      </div>
      <div className="text-[10px] text-rose-700 dark:text-rose-300 leading-relaxed">{description}</div>
    </div>
  );
}

interface CareerConfigDebtBonusBoxProps {
  mode?: ComboDebtBonusMode;
  rate?: number;
  comboUnder2mBonus?: number;
  comboStepPerMillionBonus?: number;
  comboMinCollectedAmount?: number;
  onChangeMode: (mode: ComboDebtBonusMode) => void;
  onChangeRate: (rate: number) => void;
}

export function CareerConfigDebtBonusBox({
  mode = 'TIER_LADDER',
  rate = 0.015,
  comboUnder2mBonus = 50000,
  comboStepPerMillionBonus = 50000,
  comboMinCollectedAmount = DEFAULT_COMBO_MIN_COLLECTED_AMOUNT,
  onChangeMode,
  onChangeRate,
}: CareerConfigDebtBonusBoxProps) {
  const safeRatePct = Number(((rate ?? 0.015) * 100).toFixed(2));
  const minCollected = Math.max(0, Math.round(Number(comboMinCollectedAmount ?? DEFAULT_COMBO_MIN_COLLECTED_AMOUNT)));
  const minLabel =
    minCollected < 1_000_000
      ? `${Math.round(minCollected / 1000)}K`
      : `${Number((minCollected / 1_000_000).toFixed(1))}M`;
  const under2mLabel = `${Math.round(comboUnder2mBonus / 1000)}K`;
  const stepLabel = `${Math.round(comboStepPerMillionBonus / 1000)}K`;
  const sample153 = calculateComboDebtBonus(1_527_500, {
    comboDebtBonusMode: mode,
    comboDebtBonusRate: rate,
    comboUnder2mBonus,
    comboStepPerMillionBonus,
    comboMinCollectedAmount: minCollected,
  });
  const sample416 = calculateComboDebtBonus(4_158_000, {
    comboDebtBonusMode: mode,
    comboDebtBonusRate: rate,
    comboUnder2mBonus,
    comboStepPerMillionBonus,
    comboMinCollectedAmount: minCollected,
  });

  return (
    <div className="pt-2.5 border-t border-purple-200/60 dark:border-purple-800/50 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
          💳 Thưởng Thu Nợ Combo (Thực thu):
        </span>
        <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 tabular-nums">
          1.53M → +{sample153.toLocaleString('vi-VN')}đ · 4.16M → +{sample416.toLocaleString('vi-VN')}đ
        </span>
      </div>
      <div className={`grid ${mode === 'PERCENTAGE' ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
        <Select<ComboDebtBonusMode>
          size="small"
          value={mode}
          onChange={onChangeMode}
          options={[
            {
              value: 'TIER_LADDER',
              label:
                minCollected > 0
                  ? `Bậc thang thực thu (${minLabel}–<2M=${under2mLabel}, +${stepLabel}/1M)`
                  : `Bậc thang thực thu (<2M=${under2mLabel}, +${stepLabel}/1M)`,
            },
            { value: 'PERCENTAGE', label: 'Tỷ lệ % số tiền thu nợ' },
          ]}
        />
        {mode === 'PERCENTAGE' && (
          <InputNumber
            size="small"
            className="w-full"
            min={0}
            max={10}
            step={0.5}
            value={safeRatePct}
            addonAfter="%"
            onChange={(val) => onChangeRate(Math.max(0, Number(val || 0)) / 100)}
          />
        )}
      </div>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 m-0 leading-relaxed tabular-nums">
        * Tối thiểu thực thu {minCollected.toLocaleString('vi-VN')}đ mới tính thưởng. Bán gói mới có nợ chỉ thưởng trên
        thực thu (tránh trả trùng). Ca thu nợ không cộng vào tử số % chốt Combo.
      </p>
    </div>
  );
}
