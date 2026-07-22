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

export function PageHeader({
  title,
  subtitle,
  icon,
  tag,
  extra,
  className = '',
}: PageHeaderProps) {
  const { token } = theme.useToken();

  return (
    <div className={`flex flex-wrap justify-between items-center mb-6 gap-4 ${className}`}>
      <div>
        <div className="flex items-center gap-2">
          {icon && <span className="text-xl text-amber-500 flex items-center">{icon}</span>}
          <Title level={2} style={{ color: token.colorPrimary, margin: 0 }}>
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

      {extra && <Space wrap size={10}>{extra}</Space>}
    </div>
  );
}

export default React.memo(PageHeader);
