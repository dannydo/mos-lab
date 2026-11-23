'use client';

import React from 'react';
import { Button, Segmented } from 'antd';
import { LayoutGrid, List, Plus, RotateCw } from 'lucide-react';
import { AppIcon } from '~/components/ui';
import type { ViewMode } from './branchesPageTypes';

interface BranchesHeaderActionsProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  loading: boolean;
  onRefresh: () => void;
  canManage: boolean;
  onOpenCreate: () => void;
}

export function BranchesHeaderActions({
  viewMode,
  onViewModeChange,
  loading,
  onRefresh,
  canManage,
  onOpenCreate,
}: BranchesHeaderActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Segmented
        value={viewMode}
        onChange={(val) => onViewModeChange(val as ViewMode)}
        options={[
          {
            value: 'grid',
            icon: <AppIcon icon={LayoutGrid} size="sm" />,
            label: 'Dạng Thẻ',
          },
          {
            value: 'table',
            icon: <AppIcon icon={List} size="sm" />,
            label: 'Dạng Bảng',
          },
        ]}
      />
      <Button icon={<AppIcon icon={RotateCw} size="sm" />} onClick={onRefresh} loading={loading}>
        Làm mới
      </Button>
      {canManage && (
        <Button
          type="primary"
          icon={<AppIcon icon={Plus} size="sm" />}
          onClick={onOpenCreate}
          className="bg-emerald-600 hover:bg-emerald-500 border-none text-white"
        >
          Thêm Chi Nhánh
        </Button>
      )}
    </div>
  );
}
