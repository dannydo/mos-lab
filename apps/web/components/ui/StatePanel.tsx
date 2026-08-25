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
  /** Set false when this state is already inside a SectionCard or ContentSurface. */
  surface?: boolean;
  className?: string;
}

export function StatePanel({
  kind,
  title,
  description,
  extra,
  minHeight = 240,
  surface = true,
  className = '',
}: StatePanelProps) {
  const { token } = theme.useToken();
  const content =
    kind === 'loading' ? (
      <Spin tip={title || 'Đang tải dữ liệu…'} />
    ) : kind === 'error' ? (
      <Result status="error" title={title || 'Không thể tải dữ liệu'} subTitle={description} extra={extra} />
    ) : (
      <div>
        <Empty
          description={
            title || description ? (
              <div>
                {title ? (
                  <div className="font-semibold" style={{ color: token.colorText }}>
                    {title}
                  </div>
                ) : null}
                {description ? <div className={title ? 'mt-1' : ''}>{description}</div> : null}
              </div>
            ) : (
              'Chưa có dữ liệu'
            )
          }
        />
        {extra ? <div className="mt-4">{extra}</div> : null}
      </div>
    );

  const panel = (
    <div
      className={`state-panel flex items-center justify-center text-center ${className}`.trim()}
      style={{ minHeight, color: token.colorTextSecondary }}
    >
      {content}
    </div>
  );

  return surface ? <ContentSurface>{panel}</ContentSurface> : panel;
}

export default React.memo(StatePanel);
