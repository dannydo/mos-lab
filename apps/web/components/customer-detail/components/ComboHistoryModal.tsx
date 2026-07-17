'use client';

import React from 'react';
import { Modal, Button, Table, Tag } from 'antd';

interface ComboHistoryModalProps {
  open: boolean;
  onCancel: () => void;
  customer: SafeAny;
  comboBalances: SafeAny[];
  modalWidth: number;
  handleModalDragStart: (e: React.MouseEvent, direction: 'left' | 'right') => void;
}

export const ComboHistoryModal: React.FC<ComboHistoryModalProps> = ({
  open,
  onCancel,
  customer,
  comboBalances,
  modalWidth,
  handleModalDragStart,
}) => {
  const comboHistoryColumns = [
    {
      title: 'Tên Combo',
      key: 'serviceName',
      render: (_: SafeAny, record: SafeAny) => (
        <span style={{ fontWeight: 'bold' }}>
          {record.serviceName} {record.packageKey ? `(${record.packageKey})` : ''}
        </span>
      ),
    },
    {
      title: 'Ngày mua',
      dataIndex: 'dateCreated',
      key: 'dateCreated',
      render: (text: string) => (text ? new Date(text).toLocaleDateString('vi-VN') : 'N/A'),
      width: '110px',
    },
    {
      title: 'Người bán (CC)',
      dataIndex: 'creatorStaffName',
      key: 'creatorStaffName',
      render: (text: string) => text || 'Hệ thống',
      width: '130px',
    },
    {
      title: 'Giá tiền',
      dataIndex: 'packagePrice',
      key: 'packagePrice',
      render: (val: number | null | undefined) => {
        if (val === null || val === undefined) {
          return 'N/A';
        }
        if (val === 0) {
          return 'Miễn phí';
        }
        return `${val.toLocaleString('vi-VN')} đ`;
      },
      width: '120px',
    },
    {
      title: 'Số buổi',
      key: 'sessions',
      render: (_: SafeAny, record: SafeAny) => (
        <span>
          Mới: <strong>{record.normalCount}</strong> / Dặm: <strong>{record.retainCount}</strong>
        </span>
      ),
      width: '130px',
    },
    {
      title: 'Hạn dùng',
      dataIndex: 'dateExpired',
      key: 'dateExpired',
      render: (text: string) => (text ? new Date(text).toLocaleDateString('vi-VN') : 'Vô thời hạn'),
      width: '110px',
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_: SafeAny, record: SafeAny) => {
        const isActive = (record.normalCount || 0) + (record.retainCount || 0) > 0;
        return <Tag color={isActive ? 'success' : 'default'}>{isActive ? 'Đang chạy' : 'Đã dùng hết'}</Tag>;
      },
      width: '110px',
    },
  ];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 'bold' }}>
          <span>📦 Lịch sử mua Combo</span>
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
        dataSource={comboBalances}
        columns={comboHistoryColumns}
        rowKey="id"
        pagination={{ pageSize: 8, showSizeChanger: false }}
        size="small"
        locale={{ emptyText: 'Không có lịch sử mua combo nào.' }}
      />
    </Modal>
  );
};
