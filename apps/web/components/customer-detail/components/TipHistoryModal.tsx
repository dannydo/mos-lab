'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Table, Tag } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { useTheme } from '../../../context/ThemeContext';
import { formatVND } from '../../../lib/format-utils';

interface TipTransaction {
  id: number;
  orderKey: string;
  bookingDate: string | null;
  tipAmount: number;
  technicianName: string;
  ccOutName: string;
  totalPrice: number;
}

interface TipHistoryModalProps {
  open: boolean;
  onCancel: () => void;
  customer: { id: number; name: string } | null | undefined;
  tipTransactions: TipTransaction[];
  modalWidth: number;
  handleModalDragStart: (e: React.MouseEvent, direction: 'left' | 'right') => void;
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

export const TipHistoryModal: React.FC<TipHistoryModalProps> = ({
  open,
  onCancel,
  customer,
  tipTransactions,
  modalWidth,
  handleModalDragStart,
}) => {
  const { themeMode } = useTheme();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_tip_pageSize');
      return saved ? parseInt(saved, 10) : 10;
    }
    return 10;
  });

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const defaults: Record<string, number> = {
      bookingDate: 160,
      orderKey: 110,
      tipAmount: 120,
      technicianName: 150,
      ccOutName: 150,
      totalPrice: 130,
    };
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_col_widths_tip');
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
      localStorage.setItem('mos_col_widths_tip', JSON.stringify(updated));
      return updated;
    });
  };

  const rawColumns = [
    {
      title: 'Thời gian',
      dataIndex: 'bookingDate',
      key: 'bookingDate',
      render: (text: string) => (text ? new Date(text).toLocaleString('vi-VN') : 'N/A'),
      width: colWidths.bookingDate,
    },
    {
      title: 'Mã đơn',
      dataIndex: 'orderKey',
      key: 'orderKey',
      render: (text: string) => <Tag color="blue">{text || 'N/A'}</Tag>,
      width: colWidths.orderKey,
    },
    {
      title: 'Tiền Tip',
      dataIndex: 'tipAmount',
      key: 'tipAmount',
      render: (val: number) => (
        <span
          style={{
            fontWeight: 'bold',
            color: themeMode === 'dark' ? '#4ade80' : '#22c55e',
          }}
        >
          {formatVND(val)}
        </span>
      ),
      width: colWidths.tipAmount,
    },
    {
      title: 'Chuyên viên (CV)',
      dataIndex: 'technicianName',
      key: 'technicianName',
      render: (text: string) => text || 'N/A',
      width: colWidths.technicianName,
    },
    {
      title: 'Tư vấn viên (CC Out)',
      dataIndex: 'ccOutName',
      key: 'ccOutName',
      render: (text: string) => text || 'N/A',
      width: colWidths.ccOutName,
    },
    {
      title: 'Tổng hóa đơn',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      render: (val: number) => (
        <strong style={{ color: themeMode === 'dark' ? '#fbbf24' : '#d97706' }}>{formatVND(val)}</strong>
      ),
      width: colWidths.totalPrice,
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
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 'bold' }}>
          <DollarOutlined style={{ color: '#52c41a' }} />
          <span>Lịch sử giao dịch Tips</span>
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
      width={modalWidth}
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
                  onMouseDown={(e) => handleModalDragStart(e, 'right')}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(82, 196, 26, 0.3)';
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
                  onMouseDown={(e) => handleModalDragStart(e, 'left')}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(82, 196, 26, 0.3)';
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
        dataSource={tipTransactions || []}
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
              localStorage.setItem('mos_tip_pageSize', String(size));
            }
          },
        }}
        size="small"
        locale={{ emptyText: 'Không có giao dịch tips nào.' }}
      />
    </Modal>
  );
};
