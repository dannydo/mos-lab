'use client';

import React from 'react';
import { Button, Popconfirm, Tooltip } from 'antd';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { CrmBranch } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';

interface BranchToggleActiveActionProps {
  branch: CrmBranch;
  onToggleActive: (branch: CrmBranch) => void | Promise<void>;
  withTooltip?: boolean;
  showLabel?: boolean;
  deactivateDescription?: string;
  activateDescription?: string;
}

export function BranchToggleActiveAction({
  branch,
  onToggleActive,
  withTooltip = false,
  showLabel = false,
  deactivateDescription = 'Chi nhánh sẽ bị ẩn khỏi các danh sách đặt lịch.',
  activateDescription = 'Chi nhánh sẽ hiển thị trở lại bình thường.',
}: BranchToggleActiveActionProps) {
  const popconfirmNode = (
    <Popconfirm
      title={branch.isActive ? 'Vô hiệu hóa chi nhánh này?' : 'Kích hoạt lại chi nhánh này?'}
      description={branch.isActive ? deactivateDescription : activateDescription}
      onConfirm={() => onToggleActive(branch)}
      okText="Xác nhận"
      cancelText="Hủy"
    >
      <Button
        type="text"
        size="small"
        danger={branch.isActive}
        icon={
          branch.isActive ? (
            <AppIcon icon={XCircle} size="sm" />
          ) : (
            <AppIcon icon={CheckCircle2} size="sm" className="text-emerald-500" />
          )
        }
      >
        {showLabel ? (branch.isActive ? 'Tắt' : 'Bật') : null}
      </Button>
    </Popconfirm>
  );

  if (!withTooltip) {
    return popconfirmNode;
  }

  return <Tooltip title={branch.isActive ? 'Vô hiệu hóa chi nhánh' : 'Kích hoạt lại'}>{popconfirmNode}</Tooltip>;
}
