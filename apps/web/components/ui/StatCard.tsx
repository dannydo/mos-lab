'use client';

import React from 'react';
import { Card, theme } from 'antd';

export interface StatCardProps {
  title: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactNode;
  iconBgColor?: string;
  subValue?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendText?: string;
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function StatCard({
  title,
  value,
  icon,
  iconBgColor,
  subValue,
  trendText,
  loading = false,
  className = '',
  style,
}: StatCardProps) {
  const { token } = theme.useToken();

  return (
    <Card
      loading={loading}
      variant="outlined"
      style={{
        background: token.colorBgContainer,
        borderColor: token.colorBorderSecondary,
        ...style,
      }}
      styles={{ body: { padding: '16px' } }}
      className={`rounded-xl transition-all duration-200 hover:shadow-md ${className}`}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="mb-1 truncate text-xs font-medium" style={{ color: token.colorTextSecondary }}>
            {title}
          </div>
          <div className="text-xl font-bold tabular-nums tracking-tight" style={{ color: token.colorText }}>
            {value}
          </div>
          {(subValue || trendText) && (
            <div
              className="mt-1 flex items-center gap-1.5 truncate text-xs"
              style={{ color: token.colorTextSecondary }}
            >
              {subValue && <span>{subValue}</span>}
              {trendText && <span className="font-medium text-emerald-400">{trendText}</span>}
            </div>
          )}
        </div>

        {icon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg shadow-inner"
            style={{
              background: iconBgColor || (token.colorPrimary ? `${token.colorPrimary}15` : 'rgba(212, 168, 75, 0.1)'),
              color: token.colorPrimary,
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

export default React.memo(StatCard);
