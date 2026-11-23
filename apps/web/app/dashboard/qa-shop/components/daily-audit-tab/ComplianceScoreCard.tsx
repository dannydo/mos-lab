'use client';

import React from 'react';
import { Button, Card, Progress, theme } from 'antd';
import { CircleCheck, CircleMinus, CircleX, Maximize2, Minimize2 } from 'lucide-react';
import { AppIcon, StatusTag } from '~/components/ui';
import { getComplianceGradeMeta } from './dailyAuditUtils';
import type { ComplianceStats } from './types';

interface ComplianceScoreCardProps {
  themeMode: string;
  stats: ComplianceStats;
  allSectionsExpanded: boolean;
  onToggleExpandAll: () => void;
}

export const ComplianceScoreCard: React.FC<ComplianceScoreCardProps> = ({
  themeMode,
  stats,
  allSectionsExpanded,
  onToggleExpandAll,
}) => {
  const { token } = theme.useToken();
  const gradeMeta = getComplianceGradeMeta(stats.rate);
  const progressStrokeColor =
    stats.rate >= 95 ? token.colorSuccess : stats.rate >= 85 ? token.colorInfo : token.colorError;

  return (
    <Card
      className={`shadow-sm border transition-all ${
        themeMode === 'dark'
          ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border-slate-800'
          : 'bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-white border-emerald-100'
      }`}
      classNames={{ body: 'px-5 py-4' }}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center">
            <Progress
              type="dashboard"
              percent={stats.rate}
              width={84}
              strokeColor={progressStrokeColor}
              format={() => <span className="tabular-nums font-black text-sm">{stats.rate}%</span>}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-600 dark:text-slate-400">
                Tỷ lệ Tuân thủ Tạm tính (Compliance Score)
              </span>
              <StatusTag
                status={gradeMeta.status}
                label={gradeMeta.label}
                className="font-bold px-3 py-1 text-xs uppercase"
              />
            </div>
            <div className="text-lg font-black tracking-tight mt-1 flex items-baseline gap-2">
              <span className="tabular-nums text-2xl text-emerald-600 dark:text-emerald-400">{stats.score}</span>
              <span className="text-sm font-normal text-slate-500 dark:text-slate-400 tabular-nums">
                / {stats.maxScore} điểm trọng số
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-3 md:pt-0 md:pl-6">
          <div className="text-center px-3">
            <div className="text-xs text-slate-600 dark:text-slate-400">∑ Mục</div>
            <div className="tabular-nums font-bold text-base mt-0.5">{stats.total}</div>
          </div>
          <div className="text-center px-3 border-l border-slate-200 dark:border-slate-800">
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <AppIcon icon={CircleCheck} size={12} /> Đạt (Pass)
            </div>
            <div className="tabular-nums font-bold text-emerald-600 text-base mt-0.5">{stats.passed}</div>
          </div>
          <div className="text-center px-3 border-l border-slate-200 dark:border-slate-800">
            <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
              <AppIcon icon={CircleX} size={12} /> Không đạt (Fail)
            </div>
            <div className="tabular-nums font-bold text-rose-600 text-base mt-0.5">{stats.failed}</div>
          </div>
          <div className="text-center px-3 border-l border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
              <AppIcon icon={CircleMinus} size={12} /> N/A
            </div>
            <div className="tabular-nums font-bold text-slate-500 dark:text-slate-400 text-base mt-0.5">{stats.na}</div>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <Button
            type="text"
            size="small"
            icon={<AppIcon icon={allSectionsExpanded ? Minimize2 : Maximize2} size={13} />}
            onClick={onToggleExpandAll}
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
          >
            {allSectionsExpanded ? 'Thu hẹp tất cả phân khu' : 'Mở rộng tất cả phân khu'}
          </Button>
        </div>
      </div>
    </Card>
  );
};
