'use client';

import React from 'react';
import { Empty, Result, Spin, theme } from 'antd';
import { ContentSurface } from './ContentSurface';

export type StatePanelKind = 'loading' | 'empty' | 'error';

export interface StatePanelProps {
  kind: StatePanelKind;
  title?: string;
  description?: React.ReactNode;
  extra?: React.ReactNode;
  minHeight?: number;
}

export function StatePanel({ kind, title, description, extra, minHeight = 240 }: StatePanelProps) {
  const { token } = theme.useToken();
  const content =
    kind === 'loading' ? (
      <Spin tip={title || 'Đang tải dữ liệu…'} />
    ) : kind === 'error' ? (
      <Result status="error" title={title || 'Không thể tải dữ liệu'} subTitle={description} extra={extra} />
    ) : (
      <Empty description={description || title || 'Chưa có dữ liệu'} />
    );

  return (
    <ContentSurface>
      <div
        className="flex items-center justify-center text-center"
        style={{ minHeight, color: token.colorTextSecondary }}
      >
        {content}
      </div>
    </ContentSurface>
  );
}

export default React.memo(StatePanel);
