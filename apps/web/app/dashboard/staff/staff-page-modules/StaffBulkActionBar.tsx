'use client';

import React from 'react';
import { Badge, Button, Divider, Select, Typography } from 'antd';
import { Ban, Check, GitMerge, Mail, X } from 'lucide-react';
import type { Role } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';

const { Text } = Typography;

export interface StaffBulkActionBarProps {
  canManageStaff: boolean;
  isHrOrAdmin: boolean;
  selectedRowKeys: React.Key[];
  assignableRoles: Role[];
  selectedBulkRole: string | undefined;
  onSelectedBulkRoleChange: (val: string | undefined) => void;
  bulkSubmitting: boolean;
  onBulkUpdateRole: () => void;
  onBulkToggleActive: (active: boolean) => void;
  onOpenBulkEmailModal: () => void;
  onOpenMergeModal: () => void;
  onClearSelection: () => void;
}

export function StaffBulkActionBar({
  canManageStaff,
  isHrOrAdmin,
  selectedRowKeys,
  assignableRoles,
  selectedBulkRole,
  onSelectedBulkRoleChange,
  bulkSubmitting,
  onBulkUpdateRole,
  onBulkToggleActive,
  onOpenBulkEmailModal,
  onOpenMergeModal,
  onClearSelection,
}: StaffBulkActionBarProps) {
  if (!canManageStaff || selectedRowKeys.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-7 left-1/2 z-[1050] flex max-w-[95vw] -translate-x-1/2 flex-row items-center gap-3.5 overflow-x-auto whitespace-nowrap rounded-[14px] border border-black/10 bg-white/95 px-[18px] py-2.5 shadow-2xl backdrop-blur-md transition-all duration-300 dark:border-white/15 dark:bg-zinc-900/95">
      {/* Cluster 1: Selected Counter */}
      <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
        <Badge
          count={selectedRowKeys.length}
          overflowCount={999}
          color="var(--color-primary)"
          classNames={{ indicator: 'font-bold tabular-nums' }}
        />
        <Text className="whitespace-nowrap text-sm font-semibold text-slate-900 dark:text-slate-100">
          Đã chọn <strong className="tabular-nums text-[var(--color-primary)]">{selectedRowKeys.length}</strong> nhân
          viên
        </Text>
      </div>

      <Divider type="vertical" className="mx-0.5 my-0 h-6 shrink-0 border-slate-300 dark:border-white/15" />

      {/* Cluster 2: Role Adjustment */}
      <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
        <Select
          placeholder="Chọn vai trò mới..."
          value={selectedBulkRole}
          onChange={onSelectedBulkRoleChange}
          className="w-[190px]"
          allowClear
          options={assignableRoles.map((role) => ({
            value: role.key,
            label: role.name,
          }))}
        />

        <Button
          type="primary"
          loading={bulkSubmitting}
          disabled={!selectedBulkRole}
          onClick={onBulkUpdateRole}
          className="rounded-md font-semibold whitespace-nowrap"
        >
          Đổi vai trò
        </Button>
      </div>

      <Divider type="vertical" className="mx-0.5 my-0 h-6 shrink-0 border-slate-300 dark:border-white/15" />

      {/* Cluster 3: Status & Merge */}
      <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
        <Button
          loading={bulkSubmitting}
          onClick={() => onBulkToggleActive(true)}
          icon={<AppIcon icon={Check} size={14} className="text-emerald-500" />}
          className="rounded-md whitespace-nowrap"
        >
          Kích hoạt
        </Button>
        <Button
          loading={bulkSubmitting}
          onClick={() => onBulkToggleActive(false)}
          danger
          icon={<AppIcon icon={Ban} size={14} />}
          className="rounded-md whitespace-nowrap"
        >
          Khóa tài khoản
        </Button>
        {isHrOrAdmin && (
          <Button
            icon={<AppIcon icon={Mail} size={14} className="text-cyan-500" />}
            onClick={onOpenBulkEmailModal}
            className="rounded-md border-cyan-500 font-medium whitespace-nowrap text-cyan-500"
          >
            <span className="tabular-nums">Gửi email hướng dẫn ({selectedRowKeys.length})</span>
          </Button>
        )}
        {selectedRowKeys.length >= 2 && (
          <Button
            type="primary"
            icon={<AppIcon icon={GitMerge} size={14} />}
            onClick={onOpenMergeModal}
            className="rounded-md border-transparent bg-gradient-to-br from-violet-500 to-indigo-500 font-semibold whitespace-nowrap text-white"
          >
            Gộp trùng lặp
          </Button>
        )}
      </div>

      <Divider type="vertical" className="mx-0.5 my-0 h-6 shrink-0 border-slate-300 dark:border-white/15" />

      {/* Cluster 4: Clear Selection */}
      <Button
        onClick={onClearSelection}
        type="text"
        danger
        icon={<AppIcon icon={X} size={14} />}
        className="shrink-0 font-medium whitespace-nowrap"
      >
        Bỏ chọn
      </Button>
    </div>
  );
}
