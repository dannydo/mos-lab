'use client';

import React from 'react';
import { Button, Popconfirm, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircle2, Clock, Edit2, Sparkles, Trash2 } from 'lucide-react';
import type { PilotSolutionNormItem } from '@mos-lab/shared';
import { AppIcon, StatusTag } from '~/components/ui';
import { DEFAULT_EXPERT_REVIEWER, formatVND } from './pilot-material-sop-helpers';

interface CreateSolutionNormColumnsParams {
  onEdit: (norm: PilotSolutionNormItem) => void;
  onDelete: (id: string) => void;
}

export function createSolutionNormColumns({
  onEdit,
  onDelete,
}: CreateSolutionNormColumnsParams): ColumnsType<PilotSolutionNormItem> {
  return [
    {
      title: 'Tên vật tư / Dung dịch',
      key: 'name',
      render: (_, r) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <AppIcon icon={Sparkles} size="sm" className="text-emerald-500" />
            <span>{r.materialName}</span>
          </div>
          {r.usageInstructions && (
            <div className="text-xs text-slate-500 dark:text-slate-400 leading-snug">📖 {r.usageInstructions}</div>
          )}
          {r.technicalNotes && (
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">⚠️ {r.technicalNotes}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Đơn vị tính',
      dataIndex: 'unit',
      key: 'unit',
      width: 90,
      align: 'center',
      render: (val: string) => <StatusTag status="cyan" label={val} />,
    },
    {
      title: 'Đơn giá gốc',
      dataIndex: 'costPerUnit',
      key: 'costPerUnit',
      width: 120,
      align: 'right',
      render: (val: number, r) => (
        <div className="text-right">
          <span className="tabular-nums font-medium text-xs">{formatVND(val)}</span>
          <span className="text-[10px] text-slate-400 block">/{r.unit}</span>
        </div>
      ),
    },
    {
      title: 'Định lượng / Ca',
      dataIndex: 'standardDosagePerSession',
      key: 'standardDosagePerSession',
      width: 120,
      align: 'center',
      render: (val: number, r) => (
        <span className="tabular-nums font-bold text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-500/20">
          {val} {r.unit}
        </span>
      ),
    },
    {
      title: 'Chi phí định mức / Ca',
      dataIndex: 'costPerSession',
      key: 'costPerSession',
      width: 150,
      align: 'right',
      render: (val: number) => (
        <div className="flex flex-col items-end">
          <span className="tabular-nums font-bold text-sm text-emerald-600 dark:text-emerald-400">
            {formatVND(val)}
          </span>
          <span className="text-[10px] text-slate-400">tự động tính</span>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      align: 'center',
      render: (status: string, r) =>
        status === 'VERIFIED' ? (
          <Tooltip title={`Đã thẩm định bởi ${r.verifiedBy || DEFAULT_EXPERT_REVIEWER}`}>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <AppIcon icon={CheckCircle2} size={12} /> Đã thẩm định
            </span>
          </Tooltip>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            <AppIcon icon={Clock} size={12} /> Chờ thẩm định
          </span>
        ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 90,
      align: 'center',
      render: (_, r) => (
        <div className="flex items-center justify-center gap-1">
          <Tooltip title="Chỉnh sửa định lượng & ghi chú">
            <Button type="text" size="small" icon={<AppIcon icon={Edit2} size="sm" />} onClick={() => onEdit(r)} />
          </Tooltip>
          <Popconfirm
            title="Xóa định mức này?"
            description="Bạn có chắc chắn muốn xóa thuốc/dung dịch này khỏi định mức ca?"
            onConfirm={() => onDelete(r.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" size="small" danger icon={<AppIcon icon={Trash2} size="sm" />} />
          </Popconfirm>
        </div>
      ),
    },
  ];
}
