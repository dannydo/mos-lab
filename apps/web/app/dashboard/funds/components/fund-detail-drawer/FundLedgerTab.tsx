'use client';

import React from 'react';
import { Button, Segmented, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Download, Plus } from 'lucide-react';
import type { FundTransaction } from '@mos-lab/shared';
import { AppIcon, DataTable, StatePanel } from '~/components/ui';
import { TX_TYPE_FILTER_OPTIONS } from './fundDetailHelpers';

export interface FundLedgerTabProps {
  isActive: boolean;
  loading: boolean;
  txTypeFilter: string;
  onTxTypeFilterChange: (value: string) => void;
  filteredTransactions: FundTransaction[];
  transactionColumns: ColumnsType<FundTransaction>;
  onExportLedger: () => void;
  onOpenExpense: () => void;
}

export function FundLedgerTab({
  isActive,
  loading,
  txTypeFilter,
  onTxTypeFilterChange,
  filteredTransactions,
  transactionColumns,
  onExportLedger,
  onOpenExpense,
}: FundLedgerTabProps) {
  return (
    <div className="space-y-4 py-2">
      {/* Ledger toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <Segmented
          value={txTypeFilter}
          onChange={(val) => onTxTypeFilterChange(val as string)}
          options={TX_TYPE_FILTER_OPTIONS}
        />
        <Space>
          <Button icon={<AppIcon icon={Download} size="sm" />} onClick={onExportLedger}>
            Xuất Excel / CSV Sổ Quỹ
          </Button>
          {isActive && (
            <Button
              type="primary"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              icon={<AppIcon icon={Plus} size="sm" />}
              onClick={onOpenExpense}
            >
              Ghi Nhận Thu/Chi
            </Button>
          )}
        </Space>
      </div>

      <DataTable
        columns={transactionColumns}
        dataSource={filteredTransactions}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 15 }}
        locale={{
          emptyText: (
            <StatePanel
              kind="empty"
              title="Chưa có giao dịch nào"
              description="Các giao dịch nạp card, chi tiêu hoặc cấp bù quỹ sẽ được ghi nhận tại đây."
            />
          ),
        }}
      />
    </div>
  );
}
