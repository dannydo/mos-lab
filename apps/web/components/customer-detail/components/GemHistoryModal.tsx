'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button, Table, Tag } from 'antd';
import { SketchOutlined } from '@ant-design/icons';
import { useTheme } from '../../../context/ThemeContext';
import { AdaptiveModal } from '../../ui';

interface GemTransaction {
  id: number;
  method: string;
  amount: number;
  balance: number;
  description: string;
  dateCreated: string | null;
  staffName: string;
}

interface GemHistoryModalProps {
  open: boolean;
  onCancel: () => void;
  customer: { id: number; name: string } | null | undefined;
  gemTransactions: GemTransaction[];
  gemModalWidth: number;
  handleGemModalDragStart: (e: React.MouseEvent, direction: 'left' | 'right') => void;
}

interface ResizableTitleProps extends React.HTMLAttributes<HTMLTableHeaderCellElement> {
  onResize?: (width: number) => void;
  width?: number;
}

const ResizableTitle: React.FC<ResizableTitleProps> = (props) => {
  const { onResize, width, children, ...restProps } = props;
  const thRef = useRef<HTMLTableHeaderCellElement>(null);

  if (!width) {
    return <th {...restProps}>{children}</th>;
  }

  return (
    <th
      ref={thRef}
      {...restProps}
      style={{
        ...restProps.style,
        position: 'relative',
      }}
    >
      {children}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '10px',
          cursor: 'col-resize',
          zIndex: 10,
          userSelect: 'none',
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          const startX = e.clientX;
          const startWidth = thRef.current ? thRef.current.getBoundingClientRect().width : width;

          const handleMouseMove = (moveEvent: MouseEvent) => {
            if (onResize) {
              const newWidth = Math.max(50, startWidth + (moveEvent.clientX - startX));
              onResize(newWidth);
            }
          };

          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };

          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }}
      />
    </th>
  );
};

export const GemHistoryModal: React.FC<GemHistoryModalProps> = ({
  open,
  onCancel,
  customer,
  gemTransactions,
  gemModalWidth,
  handleGemModalDragStart,
}) => {
  const { themeMode } = useTheme();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_gem_pageSize');
      return saved ? parseInt(saved, 10) : 10;
    }
    return 10;
  });

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const defaults: Record<string, number> = {
      dateCreated: 160,
      method: 100,
      amount: 110,
      balance: 130,
      description: 250,
      staffName: 150,
    };
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_col_widths_gem');
      if (saved) {
        try {
          return { ...defaults, ...JSON.parse(saved) };
        } catch (e) {
          return defaults;
        }
      }
    }
    return defaults;
  });

  useEffect(() => {
    if (open) {
      setCurrentPage(1);
    }
  }, [customer?.id, open]);

  const handleResize = (key: string, newWidth: number) => {
    setColWidths((prev) => {
      const updated = { ...prev, [key]: newWidth };
      localStorage.setItem('mos_col_widths_gem', JSON.stringify(updated));
      return updated;
    });
  };

  const rawColumns = [
    {
      title: 'Thời gian',
      dataIndex: 'dateCreated',
      key: 'dateCreated',
      render: (text: string) => (text ? new Date(text).toLocaleString('vi-VN') : 'N/A'),
      width: colWidths.dateCreated,
    },
    {
      title: 'Loại',
      dataIndex: 'method',
      key: 'method',
      render: (method: string, record: GemTransaction) => {
        const val = Number(record.amount || 0);
        const isNegative = val < 0 || method !== 'Credit';
        return <Tag color={isNegative ? 'error' : 'success'}>{isNegative ? 'Trừ (-)' : 'Cộng (+)'}</Tag>;
      },
      width: colWidths.method,
    },
    {
      title: 'Số lượng',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number, record: GemTransaction) => {
        const amountVal = Number(val || 0);
        const isNegative = amountVal < 0 || record.method !== 'Credit';
        const displayVal = Math.abs(amountVal);
        return (
          <span
            style={{
              fontWeight: 'bold',
              color: isNegative
                ? themeMode === 'dark'
                  ? '#ff7875'
                  : '#ff4d4f'
                : themeMode === 'dark'
                  ? '#4ade80'
                  : '#22c55e',
            }}
          >
            {isNegative ? '-' : '+'}
            {displayVal} <SketchOutlined style={{ color: '#0ea5e9', marginLeft: '2px' }} />
          </span>
        );
      },
      width: colWidths.amount,
    },
    {
      title: 'Số dư khả dụng',
      dataIndex: 'balance',
      key: 'balance',
      render: (val: number) => (
        <strong style={{ color: themeMode === 'dark' ? '#fbbf24' : '#d97706' }}>
          {val} <SketchOutlined style={{ color: '#0ea5e9', marginLeft: '2px' }} />
        </strong>
      ),
      width: colWidths.balance,
    },
    {
      title: 'Lý do / Mô tả',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string) => desc || <span style={{ color: '#888', fontStyle: 'italic' }}>Không có mô tả</span>,
      width: colWidths.description,
    },
    {
      title: 'Người thực hiện',
      dataIndex: 'staffName',
      key: 'staffName',
      width: colWidths.staffName,
    },
  ];

  const columns = rawColumns.map((col) => ({
    ...col,
    onHeaderCell: (column: unknown) => {
      const c = column as { key: string; width: number };
      return {
        width: c.width,
        onResize: (newWidth: number) => handleResize(c.key, newWidth),
      };
    },
  }));

  const components = {
    header: {
      cell: ResizableTitle,
    },
  };

  return (
    <AdaptiveModal
      intent="data"
      className="customer-gem-history-overlay"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 'bold' }}>
          <SketchOutlined style={{ color: '#0ea5e9' }} />
          <span>Lịch sử giao dịch Kim cương</span>
          {customer && (
            <span style={{ fontSize: '13px', color: '#888', fontWeight: 'normal' }}>(Khách hàng: {customer.name})</span>
          )}
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="close" type="primary" onClick={onCancel}>
          Đóng
        </Button>,
      ]}
      width={gemModalWidth}
      styles={{
        body: { padding: '12px 0 0 0' },
      }}
      modalRender={(modal) => {
        if (React.isValidElement(modal)) {
          return React.cloneElement(modal as SafeAny, {
            style: {
              ...(modal.props as SafeAny)?.style,
              position: 'relative',
            },
            children: (
              <>
                {(modal.props as SafeAny)?.children}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: '-4px',
                    bottom: 0,
                    width: '8px',
                    cursor: 'ew-resize',
                    zIndex: 10000,
                    transition: 'background 0.2s',
                  }}
                  onMouseDown={(e) => handleGemModalDragStart(e, 'right')}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(212, 168, 75, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '-4px',
                    bottom: 0,
                    width: '8px',
                    cursor: 'ew-resize',
                    zIndex: 10000,
                    transition: 'background 0.2s',
                  }}
                  onMouseDown={(e) => handleGemModalDragStart(e, 'left')}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(212, 168, 75, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                />
              </>
            ),
          });
        }
        return modal;
      }}
    >
      <Table
        components={components}
        dataSource={gemTransactions || []}
        columns={columns}
        rowKey="id"
        scroll={{ x: 'max-content' }}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          showSizeChanger: true,
          pageSizeOptions: ['5', '10', '20', '50'],
          onChange: (page, size) => {
            setCurrentPage(page);
            if (size !== pageSize) {
              setPageSize(size);
              localStorage.setItem('mos_gem_pageSize', String(size));
            }
          },
        }}
        size="small"
        locale={{ emptyText: 'Không có giao dịch kim cương nào.' }}
      />
    </AdaptiveModal>
  );
};
