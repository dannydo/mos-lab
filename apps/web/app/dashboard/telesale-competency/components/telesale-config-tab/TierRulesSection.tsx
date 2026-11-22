'use client';

import React from 'react';
import { Card, InputNumber } from 'antd';
import { Sparkles } from 'lucide-react';
import type { TelesaleTier, TelesaleTierPromotionRule } from '@mos-lab/shared';
import { StatusTag } from '~/components/ui';
import { getTierStatus, TIER_ORDER } from './telesaleConfigHelpers';

type TierNumericFieldKey =
  'minTenureMonths' | 'passingScore' | 'consecutiveMonthsRequired' | 'demotionConsecutiveFailMonths';

interface TierFieldMeta {
  key: TierNumericFieldKey;
  label: string;
  min: number;
  max?: number;
  addonAfter: string;
  readOnlySuffix: string;
}

const TIER_NUMERIC_FIELDS: readonly TierFieldMeta[] = [
  {
    key: 'minTenureMonths',
    label: 'Thâm niên tối thiểu:',
    min: 0,
    addonAfter: 'tháng',
    readOnlySuffix: 'tháng',
  },
  {
    key: 'passingScore',
    label: 'Điểm chuẩn (Passing):',
    min: 50,
    max: 100,
    addonAfter: 'đ',
    readOnlySuffix: 'điểm',
  },
  {
    key: 'consecutiveMonthsRequired',
    label: 'Số tháng đạt để thăng:',
    min: 1,
    max: 12,
    addonAfter: 'tháng',
    readOnlySuffix: 'tháng liên tiếp',
  },
  {
    key: 'demotionConsecutiveFailMonths',
    label: 'Số tháng trượt để giáng:',
    min: 1,
    max: 6,
    addonAfter: 'tháng',
    readOnlySuffix: 'tháng liên tiếp',
  },
];

interface TierRulesSectionProps {
  tierRules: Record<TelesaleTier, TelesaleTierPromotionRule>;
  isDraft: boolean;
  onUpdateTierRule: (tierKey: TelesaleTier, patch: Partial<TelesaleTierPromotionRule>) => void;
}

export function TierRulesSection({ tierRules, isDraft, onUpdateTierRule }: TierRulesSectionProps) {
  return (
    <Card
      title={
        <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-100">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span>Quy Chuẩn Thăng/Giáng Bậc & Quy Tắc Fresher</span>
        </div>
      }
      className="rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TIER_ORDER.map((tierKey) => {
          const rule = tierRules[tierKey];
          return (
            <div
              key={tierKey}
              className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3 bg-slate-50/50 dark:bg-zinc-800/20"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusTag status={getTierStatus(tierKey)} label={rule.label} />
                  <span className="text-xs text-slate-500">
                    (L{rule.levelRange[0]} - L{rule.levelRange[1]})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {TIER_NUMERIC_FIELDS.map((field) => (
                  <div key={field.key}>
                    <span className="text-slate-500 block">{field.label}</span>
                    {isDraft ? (
                      <InputNumber
                        min={field.min}
                        max={field.max}
                        value={rule[field.key]}
                        addonAfter={field.addonAfter}
                        className="w-full mt-1"
                        onChange={(v) => {
                          if (v === null) return;
                          onUpdateTierRule(tierKey, { [field.key]: Number(v) });
                        }}
                      />
                    ) : (
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">
                        {rule[field.key]} {field.readOnlySuffix}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {tierKey === 'FRESHER' && (
                <div className="pt-2 border-t border-slate-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      Quy tắc đặc xá Fresher (học việc không giáng bậc):
                    </span>
                    {isDraft ? (
                      <InputNumber
                        min={0}
                        max={6}
                        value={rule.fresherGracePeriodMonths || 2}
                        addonAfter="tháng"
                        className="w-28"
                        onChange={(v) => {
                          if (v === null) return;
                          onUpdateTierRule('FRESHER', { fresherGracePeriodMonths: Number(v) });
                        }}
                      />
                    ) : (
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        {rule.fresherGracePeriodMonths || 2} tháng đầu
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
