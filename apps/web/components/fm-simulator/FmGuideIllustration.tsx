'use client';

import React from 'react';
import {
  ArrowRight,
  Award,
  Bug,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Crown,
  Factory,
  Lock,
  Shield,
  ShieldAlert,
  Sparkles,
  Star,
  TrendingUp,
  UserPlus,
  Users,
  Utensils,
  Wallet,
} from 'lucide-react';
import type { FmGuideIllustrationKey } from './fm-guide-content-controls';

function StepChip({
  label,
  value,
  tone = 'neutral',
}: {
  readonly label: string;
  readonly value: string;
  readonly tone?: 'neutral' | 'emerald' | 'blue' | 'amber' | 'violet' | 'rose';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : tone === 'blue'
        ? 'border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300'
        : tone === 'amber'
          ? 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300'
          : tone === 'violet'
            ? 'border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300'
            : tone === 'rose'
              ? 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300'
              : 'border-black/10 bg-white/80 text-neutral-700 dark:border-white/10 dark:bg-neutral-800/80 dark:text-neutral-200';

  return (
    <div className={`rounded-xl border px-2.5 py-2 text-center ${toneClass}`}>
      <div className="text-[10px] font-medium opacity-75">{label}</div>
      <div className="mt-0.5 text-xs font-bold tabular-nums">{value}</div>
    </div>
  );
}

export function FmGuideIllustration({ kind }: { readonly kind: FmGuideIllustrationKey }) {
  if (kind === 'income-stack') {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StepChip label="1. Lương cứng" value="8M–10M" tone="blue" />
        <StepChip label="2. Thưởng % DT" value="1.00%–1.40%" tone="emerald" />
        <StepChip label="3. Quỹ 8 Sao" value="Đến 5.05M" tone="amber" />
        <StepChip label="4. Đẻ quân (100%)" value="+500K→3M" tone="violet" />
      </div>
    );
  }

  if (kind === 'revshare-curve') {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <StepChip label="Lấp 50% giường" value="1.00% / FM" tone="neutral" />
          <StepChip label="Lấp 75% giường" value="1.20% / FM" tone="blue" />
          <StepChip label="Lấp 100% giường" value="1.40% / FM" tone="emerald" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          <span>Nhân hiệu suất (REV/CV ÷ 48M):</span>
          <span className="rounded-lg bg-rose-500/10 px-2 py-0.5 font-semibold text-rose-600 dark:text-rose-400">
            Sàn 0.70× (≤33.6M)
          </span>
          <span className="rounded-lg bg-blue-500/10 px-2 py-0.5 font-semibold text-blue-600 dark:text-blue-400">
            48M ÷ 48M = 1.00×
          </span>
          <span className="rounded-lg bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
            Trần 1.15× (≥55.2M)
          </span>
        </div>
      </div>
    );
  }

  if (kind === 'star-budget-pool') {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <StepChip label="8 Trụ × 1★" value="1.70M" tone="neutral" />
          <StepChip label="8 Trụ × 2★" value="3.40M" tone="amber" />
          <StepChip label="8 Trụ × 3★ (24★)" value="5.05M" tone="emerald" />
        </div>
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span>Maps · FAL · Tự lái · Kho · Phòng · Diện mạo · Tua · Gắn Kết</span>
        </div>
      </div>
    );
  }

  if (kind === 'shop-fund-rollover') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2">
        <StepChip label="Ca tư vấn" value="+80K / ca" tone="violet" />
        <ArrowRight className="h-4 w-4 text-neutral-400" />
        <StepChip label="Weekly Quest" value="+250K / quest" tone="amber" />
        <ArrowRight className="h-4 w-4 text-neutral-400" />
        <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-700 dark:text-emerald-300">
          <Wallet className="h-4 w-4" />
          <div className="text-left">
            <div className="text-[10px] font-medium opacity-80">Quỹ Shop (Rollover)</div>
            <div className="text-xs font-bold">Chi Tiệc Tháng</div>
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'rev-lock-multiplier') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2">
        <StepChip label="CV chính thức" value="16 CV" tone="blue" />
        <span className="text-sm font-bold text-neutral-400">×</span>
        <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-700 dark:text-emerald-300">
          <Lock className="h-3.5 w-3.5" />
          <div className="text-left">
            <div className="text-[10px] font-medium opacity-80">Đã khóa</div>
            <div className="text-xs font-bold tabular-nums">48M / CV</div>
          </div>
        </div>
        <span className="text-sm font-bold text-neutral-400">=</span>
        <StepChip label="Tự tính Doanh thu" value="768M" tone="emerald" />
      </div>
    );
  }

  if (kind === 'rookie-grace') {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-emerald-700 dark:text-emerald-300">
          <UserPlus className="h-4 w-4 shrink-0" />
          <div className="text-[11px]">
            <div className="font-bold">CV mới ≤ 45 ngày</div>
            <div>Miễn mẫu số REV/CV &amp; Maps (tối đa 2 kỳ lương)</div>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-blue-500/25 bg-blue-500/10 px-3 py-2 text-blue-700 dark:text-blue-300">
          <Users className="h-4 w-4 shrink-0" />
          <div className="text-[11px]">
            <div className="font-bold">CV chính thức (&gt; 45 ngày)</div>
            <div>Tính chuẩn REV/CV, lấp giường &amp; tách 2 FM (≥13 CV)</div>
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'bounty-ladder') {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StepChip label="Qua 60 ngày" value="+500K" tone="blue" />
        <StepChip label="CV → CVL" value="+1.00M" tone="emerald" />
        <StepChip label="CVL → CVLL" value="+2.00M" tone="amber" />
        <StepChip label="Đẻ FM #2" value="+3.00M" tone="violet" />
      </div>
    );
  }

  if (kind === 'hub-spoke-2fm') {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="flex items-start gap-2 rounded-xl border border-blue-500/25 bg-blue-500/10 px-3 py-2 text-blue-700 dark:text-blue-300">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="text-[11px]">
            <div className="font-bold">1 FM · Vệ Tinh (100 Shop)</div>
            <div>1 FM + CVLL Keyholder (+1M) · Tối ưu P&amp;L lãi ròng</div>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-violet-500/25 bg-violet-500/10 px-3 py-2 text-violet-700 dark:text-violet-300">
          <Factory className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="text-[11px]">
            <div className="font-bold">2 FM · Lò Đúc (≥13 CV &amp; ≥650M)</div>
            <div>Đào tạo FM #2 đi mở chi nhánh mới</div>
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'fm-levels-prorate') {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <StepChip label="FM 1" value="8.00M" tone="neutral" />
          <StepChip label="FM 2" value="9.00M" tone="blue" />
          <StepChip label="FM 3" value="10.00M" tone="emerald" />
        </div>
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-300">
          <CalendarCheck className="h-3.5 w-3.5 text-blue-500" />
          <span>Nhân (Ngày công ÷ 26) + Cover ca 2 FM (+400K/ca)</span>
        </div>
      </div>
    );
  }

  if (kind === 'shield-penalty') {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-1.5">
          {[1, 2, 3, 4].map((wk) => (
            <div
              key={wk}
              className="flex flex-col items-center rounded-xl border border-amber-500/25 bg-amber-500/10 px-2 py-1.5 text-amber-700 dark:text-amber-300"
            >
              <Shield className="h-3.5 w-3.5" />
              <span className="mt-0.5 text-[10px] font-semibold">Tuần {wk}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-rose-600 dark:text-rose-400">
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>Mất 1 khiên = -25% Quỹ Sao · Trễ 24–48h -200K/ca</span>
        </div>
      </div>
    );
  }

  if (kind === 'pillar-maps') {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <StepChip label="1★ (2%)" value="+250K" tone="neutral" />
          <StepChip label="2★ (3%)" value="+400K" tone="blue" />
          <StepChip label="3★ (4%)" value="+600K" tone="emerald" />
        </div>
        <div className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-500/10 px-3 py-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
          <Bug className="h-3.5 w-3.5" />
          <span>Net Sâu (Sâu − Bướm): 1→trần 2★ · 2→trần 1★ · ≥3→0★</span>
        </div>
      </div>
    );
  }

  if (kind === 'pillar-fal') {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <StepChip label="1★ (≤ 1.5%)" value="+400K" tone="neutral" />
          <StepChip label="2★ (≤ 1.0%)" value="+700K" tone="blue" />
          <StepChip label="3★ (≤ 0.6%)" value="+1.00M" tone="emerald" />
        </div>
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-300">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span>Shop ≥ 13 CV chính thức được nới thêm +1 ca Fix công bằng</span>
        </div>
      </div>
    );
  }

  if (kind === 'pillar-autonomy') {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <StepChip label="1★ · ≥30%" value="+200K" tone="neutral" />
          <StepChip label="2★ · ≥50% & 1 CVLL" value="+400K" tone="emerald" />
          <StepChip label="3★ · ≥60% & 2 CVLL" value="+700K" tone="amber" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-300">
          <Crown className="h-3.5 w-3.5 text-amber-500" />
          <span>Bắt buộc họp CEO &amp; HR 3/3 buổi/tuần · ≥2★ mở khóa Tự lái Lễ Tết</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <StepChip label="1★ (≥70% dự)" value="+150K" tone="neutral" />
        <StepChip label="2★ (≥80% dự)" value="+300K" tone="blue" />
        <StepChip label="3★ (≥90% dự)" value="+450K" tone="emerald" />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl bg-amber-500/10 px-3 py-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
        <Utensils className="h-3.5 w-3.5" />
        <span>Bắt buộc: Đi ăn tháng (Quỹ Shop) + Check-in MXH (thiếu phạt -1 Khiên)</span>
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        <Award className="h-3.5 w-3.5 text-violet-500" />
      </div>
    </div>
  );
}
