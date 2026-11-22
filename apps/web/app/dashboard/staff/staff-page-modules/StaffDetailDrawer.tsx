'use client';

import React from 'react';
import { Typography } from 'antd';
import { IdCard } from 'lucide-react';
import type { Role, Staff, StaffAuditLog } from '@mos-lab/shared';
import { AdaptiveDrawer, AppIcon } from '~/components/ui';
import StaffDetailDrawerContent from '~/components/staff/StaffDetailDrawerContent';
import type { LegacyStaffOption } from './staffPageConstants';

const { Text } = Typography;

export interface StaffDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedStaff: Staff | null;
  roles: Role[];
  legacyStaffList: LegacyStaffOption[];
  currentUser: Staff | null;
  isHrOrAdmin: boolean;
  canManageStaff: boolean;
  auditLogs: StaffAuditLog[];
  loadingAuditLogs: boolean;
}

export function StaffDetailDrawer({
  open,
  onClose,
  selectedStaff,
  roles,
  legacyStaffList,
  currentUser,
  isHrOrAdmin,
  canManageStaff,
  auditLogs,
  loadingAuditLogs,
}: StaffDetailDrawerProps) {
  return (
    <AdaptiveDrawer
      intent="detail"
      title={
        <div className="flex items-center gap-3">
          <AppIcon icon={IdCard} size={20} className="text-[var(--color-primary)]" />
          <Text className="text-base font-bold text-[var(--mos-text)]">Hồ Sơ Nhân Sự Chi Tiết</Text>
        </div>
      }
      placement="right"
      width={550}
      onClose={onClose}
      open={open}
    >
      {selectedStaff && (
        <StaffDetailDrawerContent
          selectedStaff={selectedStaff}
          roles={roles}
          legacyStaffList={legacyStaffList}
          currentUser={currentUser}
          isHrOrAdmin={isHrOrAdmin}
          canManageStaff={canManageStaff}
          auditLogs={auditLogs}
          loadingAuditLogs={loadingAuditLogs}
        />
      )}
    </AdaptiveDrawer>
  );
}
