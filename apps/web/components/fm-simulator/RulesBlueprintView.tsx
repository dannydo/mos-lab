'use client';

import React from 'react';
import { Building2, ChevronRight, Crown, Database, HeartHandshake, Layers, ShieldCheck, Star } from 'lucide-react';
import { AppleSurface } from './ApplePrimitives';
import {
  AUTONOMY_HARD_MAX_PCT,
  BRANCH_SPECS,
  CHO_BASE_SALARY_VND,
  COMBO_PROD_BONUS_RATE,
  CVLL_FIXED_COST_VND,
  CVL_FIXED_COST_VND,
  CV_FIXED_COST_VND,
  EMPLOYER_SS_FLOOR_VND,
  EMPLOYER_SS_MGMT_VND,
  LASH_PROD_BONUS_RATE,
  PILLAR_SPECS,
  formatK,
  formatM,
} from './fm-simulator.engine';

export function RulesBlueprintView({ compact, mode }: { readonly compact: boolean; readonly mode: 'fm' | 'pnl' }) {
  if (mode === 'pnl') {
    return (
      <div className={compact ? 'space-y-3' : 'grid grid-cols-2 gap-4'}>
        <AppleSurface className="space-y-3 p-4 sm:p-5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-100">
            <Database className="h-4 w-4 text-emerald-500" />
            <span>Hạch Toán Sàn Real-DB (0đ Lệch)</span>
          </div>
          <div className="divide-y divide-black/5 text-xs dark:divide-white/10">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-neutral-500 dark:text-neutral-400">Cứng + Phép + Phụ cấp (CV / CVL / CVLL)</span>
              <span className="font-medium tabular-nums text-neutral-800 dark:text-neutral-200">
                {formatM(CV_FIXED_COST_VND, 2)} · {formatM(CVL_FIXED_COST_VND, 2)} · {formatM(CVLL_FIXED_COST_VND, 2)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-neutral-500 dark:text-neutral-400">Thưởng Sản Lượng Mi</span>
              <span className="font-medium tabular-nums text-neutral-800 dark:text-neutral-200">
                {(LASH_PROD_BONUS_RATE * 100).toFixed(1)}% DT (ngoài Tip)
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-neutral-500 dark:text-neutral-400">Combo &amp; SP Phụ</span>
              <span className="font-medium tabular-nums text-neutral-800 dark:text-neutral-200">
                {(COMBO_PROD_BONUS_RATE * 100).toFixed(2)}% DT (T10 Verified)
              </span>
            </div>
          </div>
        </AppleSurface>

        <AppleSurface className="space-y-3 p-4 sm:p-5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-100">
            <Crown className="h-4 w-4 text-rose-500" />
            <span>CHO, Hòa Vốn &amp; BHXH</span>
          </div>
          <div className="divide-y divide-black/5 text-xs dark:divide-white/10">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-neutral-500 dark:text-neutral-400">Điểm Hòa Vốn (ĐT / EP)</span>
              <span className="font-medium tabular-nums text-neutral-800 dark:text-neutral-200">
                {formatM(BRANCH_SPECS.dt.breakevenVnd, 0)} · {formatM(BRANCH_SPECS.ep.breakevenVnd, 0)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-neutral-500 dark:text-neutral-400">Cứng CHO + Vượt Hòa Vốn</span>
              <span className="font-medium tabular-nums text-neutral-800 dark:text-neutral-200">
                {formatM(CHO_BASE_SALARY_VND, 0)} + 3M + 3% vượt BE
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="inline-flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
                <HeartHandshake className="h-3.5 w-3.5 text-blue-500" />
                <span>BHXH Doanh Nghiệp</span>
              </span>
              <span className="font-medium tabular-nums text-neutral-800 dark:text-neutral-200">
                {formatM(EMPLOYER_SS_FLOOR_VND, 2)}/Sàn · {formatM(EMPLOYER_SS_MGMT_VND, 2)}/QL
              </span>
            </div>
          </div>
        </AppleSurface>
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-3' : 'grid grid-cols-2 gap-4'}>
      <AppleSurface className="space-y-3 p-4 sm:p-5">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-100">
          <Building2 className="h-4 w-4 text-blue-500" />
          <span>3 Cổng Điều Kiện FM</span>
        </div>
        <div className="divide-y divide-black/5 text-xs dark:divide-white/10">
          <div className="flex items-center justify-between py-2.5">
            <span className="text-neutral-500 dark:text-neutral-400">
              {BRANCH_SPECS.dt.name} ({BRANCH_SPECS.dt.beds} giường)
            </span>
            <span className="font-medium tabular-nums text-neutral-800 dark:text-neutral-200">
              Min {BRANCH_SPECS.dt.minCvsGate} CV (≥50% giường)
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-neutral-500 dark:text-neutral-400">
              {BRANCH_SPECS.ep.name} ({BRANCH_SPECS.ep.beds} giường)
            </span>
            <span className="font-medium tabular-nums text-neutral-800 dark:text-neutral-200">
              Min {BRANCH_SPECS.ep.minCvsGate} CV (≥50% giường)
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-neutral-500 dark:text-neutral-400">Tách 2 FM (1 FM / 8 CV)</span>
            <span className="font-medium tabular-nums text-neutral-800 dark:text-neutral-200">
              ≥ 13 CV · Chia 60% cứng + 40% chung
            </span>
          </div>
        </div>
      </AppleSurface>

      <AppleSurface className="space-y-3 p-4 sm:p-5">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-100">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Đội Ngũ Tự Lái, Khiên &amp; Sâu</span>
        </div>
        <div className="divide-y divide-black/5 text-xs dark:divide-white/10">
          <div className="flex items-center justify-between py-2.5">
            <span className="text-neutral-500 dark:text-neutral-400">Trần Đội Ngũ Tự Lái</span>
            <span className="font-medium tabular-nums text-neutral-800 dark:text-neutral-200">
              Max {AUTONOMY_HARD_MAX_PCT}% (giữ ≥40% CV)
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-neutral-500 dark:text-neutral-400">Hướng nghiệp CEO &amp; HR (Bắt buộc)</span>
            <span className="font-medium tabular-nums text-neutral-800 dark:text-neutral-200">
              Tối thiểu 3 buổi / tuần
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-neutral-500 dark:text-neutral-400">4 Khiên Tuần (Quỹ Sao)</span>
            <span className="font-medium tabular-nums text-neutral-800 dark:text-neutral-200">
              25% Quỹ Sao / tuần · Không trừ cứng
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-neutral-500 dark:text-neutral-400">Trễ SOP &amp; Sâu Maps</span>
            <span className="font-medium tabular-nums text-neutral-800 dark:text-neutral-200">
              -200K / ca trễ · 3+ Sâu = 0★ Maps
            </span>
          </div>
        </div>
      </AppleSurface>

      <AppleSurface className={compact ? 'p-4' : 'col-span-2 p-5'}>
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-100">
            <Star className="h-4 w-4 text-amber-500" />
            <span>Bảng Thưởng 7 Trụ Cột Sao FM (Tối Đa 4.60M)</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500">
            <Layers className="h-3 w-3" />
            <span>Không Lucky Wheel</span>
          </span>
        </div>

        <div className="divide-y divide-black/5 dark:divide-white/10">
          {PILLAR_SPECS.map((p) => (
            <details key={p.key} className="group py-2.5">
              <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium text-neutral-800 dark:text-neutral-100">
                  <ChevronRight className="h-3.5 w-3.5 text-neutral-400 transition-transform group-open:rotate-90" />
                  <span>{p.label}</span>
                </span>
                <span className="font-medium tabular-nums text-neutral-500 dark:text-neutral-400">
                  {formatK(p.rewards[1])} · {formatK(p.rewards[2])} · {formatK(p.rewards[3])}
                </span>
              </summary>
              <p className="mt-1.5 pl-5 text-[11px] font-normal text-neutral-400 dark:text-neutral-500">
                1★ {p.targets[0]} · 2★ {p.targets[1]} · 3★ {p.targets[2]} — {p.hint}
              </p>
            </details>
          ))}
        </div>
      </AppleSurface>
    </div>
  );
}
