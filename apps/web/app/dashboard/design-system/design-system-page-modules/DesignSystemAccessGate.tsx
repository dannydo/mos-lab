'use client';

import React from 'react';
import { Typography } from 'antd';
import { ShieldAlert } from 'lucide-react';
import { AppIcon, ContentSurface, StatePanel } from '~/components/ui';
import type { DesignSystemUser } from './designSystemPageTypes';

const { Paragraph, Title } = Typography;

export interface DesignSystemAccessGateProps {
  loading: boolean;
  user: DesignSystemUser | null;
}

export function DesignSystemAccessGate({ loading, user }: DesignSystemAccessGateProps) {
  if (loading) {
    return <StatePanel kind="loading" title="Đang xác thực quyền Admin..." surface={false} className="p-10" />;
  }

  return (
    <div className="p-6">
      <ContentSurface className="mx-auto max-w-xl py-8 text-center">
        <div className="mb-4 flex justify-center">
          <AppIcon icon={ShieldAlert} size={52} className="text-rose-500" />
        </div>
        <Title level={4} className="mb-2">
          Chỉ Dành Cho Quản Trị Viên (Admin)
        </Title>
        <Paragraph type="secondary" className="mb-0">
          {`Tài khoản hiện tại (${user?.displayName || user?.username || 'khách'}) chưa có quyền Admin để truy cập Hệ Thống Thiết Kế (Design System).`}
        </Paragraph>
      </ContentSurface>
    </div>
  );
}
