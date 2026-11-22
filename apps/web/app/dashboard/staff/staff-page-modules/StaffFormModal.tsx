'use client';

import React from 'react';
import { Form, Typography, theme, type FormInstance } from 'antd';
import type { Role, Staff } from '@mos-lab/shared';
import { AdaptiveModal } from '~/components/ui';
import { useTheme } from '../../../../context/ThemeContext';
import StaffTabsContent from '../components/StaffTabsContent';
import type { LegacyStaffOption } from './staffPageConstants';

const { Text } = Typography;

export interface StaffFormModalProps {
  open: boolean;
  staffForm: FormInstance;
  editingStaff: Staff | null;
  submitting: boolean;
  roles: Role[];
  legacyStaffList: LegacyStaffOption[];
  currentUser: Staff | null;
  onCancel: () => void;
  onSubmit: (values: SafeAny) => void | Promise<void>;
}

export function StaffFormModal({
  open,
  staffForm,
  editingStaff,
  submitting,
  roles,
  legacyStaffList,
  currentUser,
  onCancel,
  onSubmit,
}: StaffFormModalProps) {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  return (
    <AdaptiveModal
      intent="form"
      title={
        <Text className="text-lg font-bold text-[var(--color-primary)]">
          {editingStaff ? `Chỉnh sửa nhân viên: ${editingStaff.displayName}` : 'Thêm Nhân Viên Mới'}
        </Text>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width={700}
      destroyOnHidden
    >
      <Form form={staffForm} layout="vertical" onFinish={onSubmit} className="mt-5" autoComplete="off">
        <StaffTabsContent
          themeMode={themeMode}
          token={token}
          editingStaff={editingStaff}
          submitting={submitting}
          roles={roles}
          onCancel={onCancel}
          legacyStaffList={legacyStaffList}
          currentUser={currentUser}
        />
      </Form>
    </AdaptiveModal>
  );
}
