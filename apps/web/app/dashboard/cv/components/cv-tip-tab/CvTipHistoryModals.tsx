'use client';

import { useMemo } from 'react';
import { Segmented } from 'antd';
import type { CvTipCustomerVisit, CvTipRecord, TipFilterType } from '@mos-lab/shared';
import { AdaptiveModal, DataTable } from '~/components/ui';
import { buildCvTipCustomerHistoryColumns, buildCvTipHistoryModalColumns } from './cvTipColumns';
import { buildTipModalFilterOptions } from './cvTipUtils';

export interface CvTipHistoryModalsProps {
  isMobile: boolean;
  tipHistoryOpen: boolean;
  tipHistoryLoading: boolean;
  tipHistoryFilter: TipFilterType;
  tipHistoryRecords: CvTipRecord[];
  visibleTipHistoryRecords: CvTipRecord[];
  onTipHistoryFilterChange: (filter: TipFilterType) => void;
  onCloseTipHistory: () => void;
  customerHistoryOpen: boolean;
  customerHistoryLoading: boolean;
  customerHistoryName: string;
  customerHistoryRecords: CvTipCustomerVisit[];
  customerHistoryFilter: TipFilterType;
  visibleCustomerHistoryRecords: CvTipCustomerVisit[];
  onCustomerHistoryFilterChange: (filter: TipFilterType) => void;
  onCloseCustomerHistory: () => void;
  onOpenCustomerHistory: (record: CvTipRecord) => void;
}

export function CvTipHistoryModals({
  isMobile,
  tipHistoryOpen,
  tipHistoryLoading,
  tipHistoryFilter,
  tipHistoryRecords,
  visibleTipHistoryRecords,
  onTipHistoryFilterChange,
  onCloseTipHistory,
  customerHistoryOpen,
  customerHistoryLoading,
  customerHistoryName,
  customerHistoryRecords,
  customerHistoryFilter,
  visibleCustomerHistoryRecords,
  onCustomerHistoryFilterChange,
  onCloseCustomerHistory,
  onOpenCustomerHistory,
}: CvTipHistoryModalsProps) {
  const tipHistoryColumns = useMemo(
    () => buildCvTipHistoryModalColumns({ onOpenCustomerHistory }),
    [onOpenCustomerHistory]
  );

  const customerHistoryColumns = useMemo(() => buildCvTipCustomerHistoryColumns(), []);

  const tipHistoryOptions = useMemo(() => buildTipModalFilterOptions(tipHistoryRecords), [tipHistoryRecords]);

  const customerHistoryOptions = useMemo(
    () => buildTipModalFilterOptions(customerHistoryRecords),
    [customerHistoryRecords]
  );

  return (
    <>
      <AdaptiveModal
        open={tipHistoryOpen}
        title="Lịch sử khách tip"
        onCancel={onCloseTipHistory}
        footer={null}
        intent="data"
        width={isMobile ? undefined : 1040}
      >
        <div className="pt-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Segmented
              options={tipHistoryOptions}
              value={tipHistoryFilter}
              onChange={(value) => onTipHistoryFilterChange(value as TipFilterType)}
            />
            <span className="tabular-nums text-xs text-slate-500 dark:text-slate-400">
              {visibleTipHistoryRecords.length} lần phục vụ
            </span>
          </div>
          <DataTable<CvTipRecord>
            dataSource={visibleTipHistoryRecords}
            columns={tipHistoryColumns}
            rowKey="serviceId"
            loading={tipHistoryLoading}
            pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'] }}
            size="small"
            scroll={{ x: 940, y: isMobile ? 440 : 480 }}
          />
        </div>
      </AdaptiveModal>

      <AdaptiveModal
        open={customerHistoryOpen}
        title={`Lịch sử ghé tiệm — ${customerHistoryName}`}
        onCancel={onCloseCustomerHistory}
        footer={null}
        intent="data"
        width={isMobile ? undefined : 1120}
      >
        <div className="pt-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Segmented
              options={customerHistoryOptions}
              value={customerHistoryFilter}
              onChange={(value) => onCustomerHistoryFilterChange(value as TipFilterType)}
            />
            <span className="tabular-nums text-xs text-slate-500 dark:text-slate-400">
              {visibleCustomerHistoryRecords.length} lượt ghé
            </span>
          </div>
          <DataTable<CvTipCustomerVisit>
            dataSource={visibleCustomerHistoryRecords}
            columns={customerHistoryColumns}
            rowKey="orderId"
            loading={customerHistoryLoading}
            pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'] }}
            size="small"
            scroll={{ x: 980, y: isMobile ? 440 : 480 }}
          />
        </div>
      </AdaptiveModal>
    </>
  );
}
