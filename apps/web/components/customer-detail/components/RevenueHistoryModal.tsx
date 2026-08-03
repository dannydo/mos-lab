'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Table, Tag } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import { useTheme } from '../../../context/ThemeContext';
import { formatVND } from '../../../lib/format-utils';

interface RevenueTransaction {
  id: number;
  orderKey: string;
  bookingDate: string | null;
  totalPrice: number;
  tipAmount: number;
  debtAmount: number;
  technicianName: string;
  ccOutName: string;
  services: { name: string; price: number }[];
  combos: { name: string; price: number }[];
  products: { name: string; price: number }[];
}

interface RevenueHistoryModalProps {
  open: boolean;
  onCancel: () => void;
  customer: { id: number; name: string } | null | undefined;
  revenueTransactions: RevenueTransaction[];
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

export const RevenueHistoryModal: React.FC<RevenueHistoryModalProps> = ({
  open,
  onCancel,
  customer,
  revenueTransactions,
  modalWidth,
  handleModalDragStart,
}) => {
  const { themeMode } = useTheme();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_revenue_pageSize');
      return saved ? parseInt(saved, 10) : 10;
    }
    return 10;
  });

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const defaults: Record<string, number> = {
      bookingDate: 150,
      orderKey: 110,
      technicianName: 140,
      ccOutName: 140,
      services: 200,
      combos: 150,
      products: 150,
      tipAmount: 100,
      debtAmount: 100,
      totalPrice: 120,
    };
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_col_widths_revenue');
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
      localStorage.setItem('mos_col_widths_revenue', JSON.stringify(updated));
      return updated;
    });
  };

  const renderItemList = (items: { name: string; price: number }[]) => {
    if (!items || items.length === 0) return <span style={{ color: '#888' }}>-</span>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {items.map((item, idx) => (
          <div key={idx} style={{ fontSize: '11px', lineHeight: '1.3' }}>
            <div
              style={{
                fontWeight: 'bold',
                color: themeMode === 'dark' ? '#fbbf24' : '#d97706',
              }}
            >
              {formatVND(item.price)}
            </div>
            <div
              style={{
                color: themeMode === 'dark' ? '#94a3b8' : '#64748b',
                fontSize: '10px',
                marginTop: '1px',
              }}
            >
              {item.name}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const rawColumns: ColumnsType<RevenueTransaction> = [
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
      title: 'Chuyên viên (CV)',
      dataIndex: 'technicianName',
      key: 'technicianName',
      render: (text: string) => (text && text !== 'Kỹ thuật viên' && text !== 'Unknown' ? text : '-'),
      width: colWidths.technicianName,
    },
    {
      title: 'Tư vấn viên (CC Out)',
      dataIndex: 'ccOutName',
      key: 'ccOutName',
      render: (text: string) => (text && text !== 'Tư vấn viên' && text !== 'Unknown' ? text : '-'),
      width: colWidths.ccOutName,
    },
    {
      title: 'Dịch vụ',
      dataIndex: 'services',
      key: 'services',
      render: (services: { name: string; price: number }[]) => renderItemList(services),
      width: colWidths.services,
    },
    {
      title: 'Combo',
      dataIndex: 'combos',
      key: 'combos',
      render: (combos: { name: string; price: number }[]) => renderItemList(combos),
      width: colWidths.combos,
    },
    {
      title: 'Sản phẩm',
      dataIndex: 'products',
      key: 'products',
      render: (products: { name: string; price: number }[]) => renderItemList(products),
      width: colWidths.products,
    },
    {
      title: 'Tip',
      dataIndex: 'tipAmount',
      key: 'tipAmount',
      align: 'right',
      render: (val: number) => (
        <span className="tabular-nums" style={{ color: themeMode === 'dark' ? '#4ade80' : '#16a34a' }}>
          {val > 0 ? formatVND(val) : '0 đ'}
        </span>
      ),
      width: colWidths.tipAmount,
    },
    {
      title: 'Nợ',
      dataIndex: 'debtAmount',
      key: 'debtAmount',
      align: 'right',
      render: (val: number) => (
        <span
          className="tabular-nums"
          style={{ color: themeMode === 'dark' ? '#f87171' : '#dc2626', fontWeight: val > 0 ? 'bold' : 'normal' }}
        >
          {val > 0 ? formatVND(val) : '0 đ'}
        </span>
      ),
      width: colWidths.debtAmount,
    },
    {
      title: 'Tổng hóa đơn',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      align: 'right',
      render: (val: number) => (
        <strong className="tabular-nums" style={{ color: themeMode === 'dark' ? '#fbbf24' : '#d97706' }}>
          {formatVND(val)}
        </strong>
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
          <LineChartOutlined style={{ color: '#D4A84B' }} />
          <span>Chi tiết Lịch sử Doanh thu (LTV)</span>
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
                  onMouseDown={(e) => handleModalDragStart(e, 'left')}
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
        dataSource={revenueTransactions || []}
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
              localStorage.setItem('mos_revenue_pageSize', String(size));
            }
          },
        }}
        size="small"
        locale={{ emptyText: 'Không có giao dịch doanh thu nào.' }}
      />
    </Modal>
  );
};
