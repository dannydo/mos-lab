'use client';

import React from 'react';
import { Table, theme } from 'antd';
import type { TableProps } from 'antd';

/**
 * Shared table shell. Pagination remains controlled by the owning feature;
 * this component standardizes only visual surface and density behavior.
 */
export function DataTable<RecordType extends object>({ className = '', style, ...props }: TableProps<RecordType>) {
  const { token } = theme.useToken();

  return (
    <Table<RecordType>
      {...props}
      className={`antd-custom-table ${className}`}
      style={{
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 8,
        marginBottom: 16,
        overflow: 'hidden',
        ...style,
      }}
    />
  );
}
