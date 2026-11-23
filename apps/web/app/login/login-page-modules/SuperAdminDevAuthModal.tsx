'use client';

import React from 'react';
import { Button, Input, Typography } from 'antd';
import { Crown, Lock } from 'lucide-react';
import { AdaptiveModal } from '~/components/ui';
import type { DevStaff } from './loginConstants';

const { Text } = Typography;

export interface SuperAdminDevAuthModalProps {
  target: DevStaff | null;
  password: string;
  loading: boolean;
  onPasswordChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SuperAdminDevAuthModal({
  target,
  password,
  loading,
  onPasswordChange,
  onConfirm,
  onCancel,
}: SuperAdminDevAuthModalProps) {
  return (
    <AdaptiveModal
      intent="confirm"
      open={!!target}
      onCancel={onCancel}
      footer={null}
      title={
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Xác thực Super Admin (Dev Mode)</span>
        </div>
      }
      destroyOnClose
      centered
      width={380}
    >
      <div className="py-2">
        <Text type="secondary" className="block mb-3">
          Đăng nhập tài khoản Super Admin: <b>{target?.displayName}</b> (@{target?.username}).
          <br />
          Tài khoản Super Admin được bảo vệ. Vui lòng nhập mật khẩu xác thực.
        </Text>
        <Input.Password
          prefix={<Lock className="h-4 w-4 text-[var(--mos-text-muted)]" />}
          placeholder="Nhập mật khẩu xác thực"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          onPressEnter={onConfirm}
          size="large"
          className="mb-4"
          autoFocus
        />
        <div className="flex gap-2">
          <Button type="primary" block disabled={!password} onClick={onConfirm} loading={loading} className="font-bold">
            Xác Nhận Đăng Nhập
          </Button>
          <Button block onClick={onCancel}>
            Hủy
          </Button>
        </div>
      </div>
    </AdaptiveModal>
  );
}
