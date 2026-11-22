'use client';

import React from 'react';
import { Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Plus } from 'lucide-react';
import type { FundProposal } from '@mos-lab/shared';
import { AppIcon, DataTable, StatePanel } from '~/components/ui';

export interface FundProposalsTabProps {
  isActive: boolean;
  loading: boolean;
  proposals: FundProposal[];
  proposalColumns: ColumnsType<FundProposal>;
  onOpenProposal: () => void;
}

export function FundProposalsTab({
  isActive,
  loading,
  proposals,
  proposalColumns,
  onOpenProposal,
}: FundProposalsTabProps) {
  return (
    <div className="space-y-4 py-2">
      <div className="flex justify-between items-center p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
            Danh Sách Đề Xuất Bổ Sung Vốn & Quy Trình Duyệt Động
          </span>
          <p className="text-xs text-slate-500 m-0 mt-0.5">
            Luồng chuẩn: Tạo đề xuất → Duyệt chủ trương → Kế toán giải ngân → Thủ quỹ xác nhận nhận tiền.
          </p>
        </div>
        {isActive && (
          <Button
            type="primary"
            className="bg-sky-600 hover:bg-sky-500 text-white font-semibold"
            icon={<AppIcon icon={Plus} size="sm" />}
            onClick={onOpenProposal}
          >
            Tạo Đề Xuất Cấp Vốn
          </Button>
        )}
      </div>

      <DataTable
        columns={proposalColumns}
        dataSource={proposals}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        locale={{
          emptyText: (
            <StatePanel
              kind="empty"
              title="Chưa có phiếu đề xuất nào"
              description="Bấm 'Tạo Đề Xuất Cấp Vốn' để khởi tạo phiếu bổ sung vốn mới cho quỹ."
            />
          ),
        }}
      />
    </div>
  );
}
