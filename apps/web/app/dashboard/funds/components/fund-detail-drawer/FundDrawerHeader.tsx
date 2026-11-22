'use client';

import React from 'react';
import { Button, Popconfirm, Space } from 'antd';
import { ArrowUpRight, Plus, RotateCw, Sparkles } from 'lucide-react';
import { AppIcon } from '~/components/ui';
import { FundStatusBadge } from './FundStatusBadge';
import type { FundOverviewData } from './types';

export interface FundDrawerTitleProps {
  fundOverview: FundOverviewData | null;
}

export function FundDrawerTitle({ fundOverview }: FundDrawerTitleProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-bold text-lg text-slate-900 dark:text-white">
        {fundOverview?.name || 'Vận Hành Quỹ Nội Bộ'}
      </span>
      {fundOverview?.code && (
        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          {fundOverview.code}
        </span>
      )}
      {fundOverview && <FundStatusBadge status={fundOverview.status} isLowBalance={fundOverview.isLowBalance} />}
    </div>
  );
}

export interface FundDrawerExtraActionsProps {
  isDraft: boolean;
  isActive: boolean;
  loading: boolean;
  activating: boolean;
  onActivateFund: () => Promise<void>;
  onOpenExpense: () => void;
  onOpenProposal: () => void;
  onReload: () => Promise<void>;
}

export function FundDrawerExtraActions({
  isDraft,
  isActive,
  loading,
  activating,
  onActivateFund,
  onOpenExpense,
  onOpenProposal,
  onReload,
}: FundDrawerExtraActionsProps) {
  return (
    <Space wrap size="small">
      {isDraft && (
        <Popconfirm
          title="Kích hoạt Quỹ hoạt động"
          description="Bạn có chắc chắn muốn kích hoạt quỹ từ Bản nháp sang Đang hoạt động không?"
          onConfirm={onActivateFund}
          okText="Kích hoạt ngay"
          cancelText="Hủy"
          okButtonProps={{ loading: activating }}
        >
          <Button
            type="primary"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            icon={<AppIcon icon={Sparkles} size="sm" />}
            loading={activating}
          >
            Kích Hoạt Quỹ
          </Button>
        </Popconfirm>
      )}

      {isActive && (
        <>
          <Button
            type="primary"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            icon={<AppIcon icon={Plus} size="sm" />}
            onClick={onOpenExpense}
          >
            Thu/Chi
          </Button>
          <Button
            className="border-sky-600 text-sky-600 font-semibold"
            icon={<AppIcon icon={ArrowUpRight} size="sm" />}
            onClick={onOpenProposal}
          >
            Cấp Vốn
          </Button>
        </>
      )}

      <Button icon={<AppIcon icon={RotateCw} size="sm" />} onClick={onReload} loading={loading} />
    </Space>
  );
}
