'use client';

import React from 'react';
import { Typography, theme, Space } from 'antd';

const { Title, Text } = Typography;

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  tag?: React.ReactNode;
  extra?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, icon, tag, extra, className = '' }: PageHeaderProps) {
  const { token } = theme.useToken();

  return (
    <header className={`responsive-page-header ${className}`}>
      <div className="responsive-page-header-main">
        <div className="responsive-page-header-title-row">
          {icon && (
            <span className="flex items-center text-xl" style={{ color: token.colorPrimary }}>
              {icon}
            </span>
          )}
          <Title level={2} style={{ color: token.colorText, margin: 0 }}>
            {title}
          </Title>
          {tag && <div className="ml-1">{tag}</div>}
        </div>
        {subtitle && (
          <Text style={{ color: token.colorTextDescription }} className="mt-1 block text-sm">
            {subtitle}
          </Text>
        )}
      </div>

      {extra && (
        <div className="responsive-page-header-actions">
          <Space wrap size={10}>
            {extra}
          </Space>
        </div>
      )}
    </header>
  );
}

export default React.memo(PageHeader);
