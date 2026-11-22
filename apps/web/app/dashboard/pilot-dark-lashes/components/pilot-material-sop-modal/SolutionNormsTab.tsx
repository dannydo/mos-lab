'use client';

import React, { useMemo } from 'react';
import { Button } from 'antd';
import { Info, Plus } from 'lucide-react';
import type { PilotSolutionNormItem } from '@mos-lab/shared';
import { AppIcon, DataTable } from '~/components/ui';
import { createSolutionNormColumns } from './SolutionNormColumns';

interface SolutionNormsTabProps {
  solutionNorms: PilotSolutionNormItem[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (norm: PilotSolutionNormItem) => void;
  onDelete: (id: string) => void;
}

export function SolutionNormsTab({ solutionNorms, loading, onAdd, onEdit, onDelete }: SolutionNormsTabProps) {
  const columns = useMemo(() => createSolutionNormColumns({ onEdit, onDelete }), [onEdit, onDelete]);

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex-wrap">
        <div className="flex items-center gap-2">
          <AppIcon icon={Info} size={16} className="text-emerald-600 shrink-0" />
          <span>
            <strong>Nguyên tắc:</strong> Đơn giá lấy trực tiếp từ danh mục vật tư hiện tại. Cô Giang Đàm nhập định lượng
            tiêu chuẩn mỗi ca để hệ thống tự động tính chi phí và đóng gói giáo trình kỹ thuật.
          </span>
        </div>
        <Button
          type="primary"
          size="small"
          icon={<AppIcon icon={Plus} size="sm" />}
          onClick={onAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shrink-0 shadow-sm"
        >
          Thêm định mức dung dịch
        </Button>
      </div>

      <DataTable<PilotSolutionNormItem>
        columns={columns}
        dataSource={solutionNorms}
        rowKey="id"
        pagination={false}
        loading={loading}
        size="middle"
        className="border rounded-xl border-slate-200 dark:border-slate-800"
      />
    </div>
  );
}
