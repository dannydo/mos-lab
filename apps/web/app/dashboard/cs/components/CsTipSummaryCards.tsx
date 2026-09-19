'use client';

import React from 'react';
import { Card, Row, Col, Skeleton } from 'antd';
import { DollarSign, Heart, User, Zap } from 'lucide-react';
import { CsTipSummary } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import { useTheme } from '../../../../context/ThemeContext';

interface CsTipSummaryCardsProps {
  summary?: CsTipSummary;
  loading?: boolean;
}

const formatCurrency = (val?: number) => {
  if (val === undefined || val === null) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

export default function CsTipSummaryCards({ summary, loading = false }: CsTipSummaryCardsProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  if (loading || !summary) {
    return (
      <Row gutter={[16, 16]}>
        {[1, 2, 3].map((i) => (
          <Col xs={24} md={8} key={i}>
            <Card
              variant="outlined"
              className="rounded-2xl shadow-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            >
              <Skeleton active paragraph={{ rows: 3 }} />
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  const { total, loca, single, csBonusRatePercent } = summary;

  return (
    <Row gutter={[16, 16]}>
      {/* CARD 1: TỔNG QUỸ TIP KHÁCH HÀNG */}
      <Col xs={24} md={8}>
        <div
          className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:shadow-md ${
            isDark
              ? 'bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-blue-950/30 border-indigo-800/40 text-slate-100'
              : 'bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/40 border-indigo-200/80 text-slate-800'
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                Toàn Bộ Khách Hàng
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5 mb-0">Tổng Quỹ Tip Khách Cho</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <AppIcon icon={DollarSign} size="md" />
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-indigo-600 dark:text-indigo-400">
                {formatCurrency(total.totalCustomerTip)}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold tabular-nums bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
                <AppIcon icon={Zap} size={13} className="text-blue-600 dark:text-blue-400" />
                Thưởng CS ({csBonusRatePercent}%): {formatCurrency(total.csTipBonus)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-indigo-100/60 dark:border-indigo-900/40 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Số lượt có tip:</span>
              <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                {total.tippedVisits} / {total.totalVisits} ({total.tipRatePercent}%)
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Tip TB / lượt có tip:</span>
              <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                {formatCurrency(total.avgTipPerTippedVisit)}
              </span>
            </div>
          </div>
        </div>
      </Col>

      {/* CARD 2: QUỸ TIP KHÁCH HÀNG LOCA (COMBO LIVE) */}
      <Col xs={24} md={8}>
        <div
          className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:shadow-md ${
            isDark
              ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900/60 to-teal-950/30 border-emerald-800/40 text-slate-100'
              : 'bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 border-emerald-200/80 text-slate-800'
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Khách Hàng LoCa
                </span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Combo Live
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5 mb-0">Quỹ Tip Khách LoCa</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <AppIcon icon={Heart} size="md" className="fill-emerald-500/20" />
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
                {formatCurrency(loca.totalCustomerTip)}
              </span>
              <span className="text-xs font-bold text-emerald-700/80 dark:text-emerald-400/80 tabular-nums">
                ({loca.sharePercent}% tổng tip)
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold tabular-nums bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                <AppIcon icon={Zap} size={13} className="text-emerald-600 dark:text-emerald-400" />
                Thưởng CS ({csBonusRatePercent}%): {formatCurrency(loca.csTipBonus)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-emerald-100/60 dark:border-emerald-900/40 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Số lượt LoCa có tip:</span>
              <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                {loca.tippedVisits} / {loca.totalVisits} ({loca.tipRatePercent}%)
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Tip TB / lượt có tip:</span>
              <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                {formatCurrency(loca.avgTipPerTippedVisit)}
              </span>
            </div>
          </div>
        </div>
      </Col>

      {/* CARD 3: QUỸ TIP KHÁCH HÀNG LẺ (NOT COMBO LIVE) */}
      <Col xs={24} md={8}>
        <div
          className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:shadow-md ${
            isDark
              ? 'bg-gradient-to-br from-amber-950/40 via-slate-900/60 to-orange-950/30 border-amber-800/40 text-slate-100'
              : 'bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 border-amber-200/80 text-slate-800'
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Khách Hàng Lẻ
                </span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Single
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5 mb-0">Quỹ Tip Khách Lẻ</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AppIcon icon={User} size="md" />
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-amber-600 dark:text-amber-400">
                {formatCurrency(single.totalCustomerTip)}
              </span>
              <span className="text-xs font-bold text-amber-700/80 dark:text-amber-400/80 tabular-nums">
                ({single.sharePercent}% tổng tip)
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold tabular-nums bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                <AppIcon icon={Zap} size={13} className="text-amber-600 dark:text-amber-400" />
                Thưởng CS ({csBonusRatePercent}%): {formatCurrency(single.csTipBonus)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-amber-100/60 dark:border-amber-900/40 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Số lượt Khách Lẻ có tip:</span>
              <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                {single.tippedVisits} / {single.totalVisits} ({single.tipRatePercent}%)
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Tip TB / lượt có tip:</span>
              <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                {formatCurrency(single.avgTipPerTippedVisit)}
              </span>
            </div>
          </div>
        </div>
      </Col>
    </Row>
  );
}
