'use client';

import React from 'react';
import { Button, Space, Typography } from 'antd';
import { IdCard, Plus, RefreshCw } from 'lucide-react';
import { AppIcon } from '~/components/ui';

const { Title, Text } = Typography;

export interface StaffPageHeaderProps {
  activeTab: string;
  canManageStaff: boolean;
  syncing: boolean;
  onSyncLegacyStaff: () => void;
  onAddStaff: () => void;
  onAddRole: () => void;
}

export function StaffPageHeader({
  activeTab,
  canManageStaff,
  syncing,
  onSyncLegacyStaff,
  onAddStaff,
  onAddRole,
}: StaffPageHeaderProps) {
  return (
    <div className="staff-page-header">
      <div className="staff-page-header-copy">
        <Title level={3} className="m-0 flex items-center gap-2 text-[var(--color-primary)]">
          <AppIcon icon={IdCard} size={22} className="shrink-0" />
          <span>Quản Lý Nhân Sự &amp; Vai Trò (HR)</span>
        </Title>
        <Text type="secondary">
          Cấu hình nhân sự, quản lý nhóm quyền, liên kết Google Auth và cập nhật thông tin nội bộ.
        </Text>
      </div>
      <div className="staff-page-header-actions">
        {activeTab !== 'roles' ? (
          <Space wrap>
            {canManageStaff && (
              <Button
                icon={<AppIcon icon={RefreshCw} size={14} />}
                onClick={onSyncLegacyStaff}
                loading={syncing}
                className="rounded-md font-medium"
              >
                Đồng bộ Wings Lashes
              </Button>
            )}
            <Button
              type="primary"
              icon={<AppIcon icon={Plus} size={14} />}
              onClick={onAddStaff}
              className="rounded-md font-semibold"
            >
              Thêm Nhân Viên
            </Button>
          </Space>
        ) : (
          <Button
            type="primary"
            icon={<AppIcon icon={Plus} size={14} />}
            onClick={onAddRole}
            className="rounded-md font-semibold"
          >
            Thêm Vai Trò
          </Button>
        )}
      </div>
    </div>
  );
}
