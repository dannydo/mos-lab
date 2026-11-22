'use client';

import React from 'react';
import { Button, Divider, Form, Input, Typography } from 'antd';
import { Lock, User } from 'lucide-react';
import { isLocalDevLoginEnabled } from './loginConstants';
import type { PasswordLoginFormValues } from './useLoginAuth';

const { Text } = Typography;

export interface PasswordLoginSectionProps {
  loading: boolean;
  showPasswordForm: boolean;
  onShowPasswordForm: () => void;
  onHidePasswordForm: () => void;
  onFinish: (values: PasswordLoginFormValues) => Promise<void> | void;
}

export function PasswordLoginSection({
  loading,
  showPasswordForm,
  onShowPasswordForm,
  onHidePasswordForm,
  onFinish,
}: PasswordLoginSectionProps) {
  if (!showPasswordForm) {
    return (
      <div className="text-center mt-6">
        <Text className="text-[var(--mos-text-muted)] cursor-pointer underline" onClick={onShowPasswordForm}>
          Hoặc đăng nhập bằng tài khoản & mật khẩu
        </Text>
      </div>
    );
  }

  return (
    <>
      <Divider className="border-[var(--mos-border-secondary)] mt-6 mb-4 text-[var(--mos-text-muted)] text-xs">
        TÀI KHOẢN & MẬT KHẨU
      </Divider>

      <Form name="login_form" initialValues={{ remember: true }} onFinish={onFinish} size="large" layout="vertical">
        <Form.Item name="username" rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập!' }]}>
          <Input prefix={<User className="h-4 w-4 text-[var(--mos-text-muted)]" />} placeholder="Tên đăng nhập" />
        </Form.Item>

        <Form.Item
          name="password"
          rules={isLocalDevLoginEnabled ? [] : [{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
          extra={
            isLocalDevLoginEnabled ? (
              <span className="text-[11px] text-[var(--mos-text-muted)]">
                Dev mode: Tài khoản thường không cần mật khẩu; Super Admin yêu cầu mật khẩu
              </span>
            ) : undefined
          }
        >
          <Input.Password
            prefix={<Lock className="h-4 w-4 text-[var(--mos-text-muted)]" />}
            placeholder={isLocalDevLoginEnabled ? 'Mật khẩu (Dev: Bỏ trống nếu không phải Super Admin)' : 'Mật khẩu'}
          />
        </Form.Item>

        <Form.Item className="mt-6 mb-2">
          <Button type="primary" htmlType="submit" loading={loading} block className="h-11 font-semibold">
            ĐĂNG NHẬP
          </Button>
        </Form.Item>
      </Form>

      <div className="text-center mt-3">
        <Text className="text-[var(--mos-text-muted)] cursor-pointer underline" onClick={onHidePasswordForm}>
          Quay lại đăng nhập Google
        </Text>
      </div>
    </>
  );
}
