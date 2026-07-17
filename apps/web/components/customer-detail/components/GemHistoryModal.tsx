'use client';

import React from 'react';
import { Modal, Button, Table, Tag } from 'antd';
import { useTheme } from '../../../context/ThemeContext';

interface GemHistoryModalProps {
  open: boolean;
  onCancel: () => void;
  customer: SafeAny;
  gemTransactions: SafeAny[];
  gemModalWidth: number;
  handleGemModalDragStart: (e: React.MouseEvent, direction: 'left' | 'right') => void;
}

export const GemHistoryModal: React.FC<GemHistoryModalProps> = ({
  open,
  onCancel,
  customer,
  gemTransactions,
  gemModalWidth,
  handleGemModalDragStart,
}) => {
  const { themeMode } = useTheme();

  const gemColumns = [
    {
      title: 'Thời gian',
      dataIndex: 'dateCreated',
      key: 'dateCreated',
      render: (text: string) => (text ? new Date(text).toLocaleString('vi-VN') : 'N/A'),
      width: '160px',
    },
    {
      title: 'Loại',
      dataIndex: 'method',
      key: 'method',
      render: (method: string, record: SafeAny) => {
        const val = Number(record.amount || 0);
        const isNegative = val < 0 || method !== 'Credit';
        return <Tag color={isNegative ? 'error' : 'success'}>{isNegative ? 'Trừ (-)' : 'Cộng (+)'}</Tag>;
      },
      width: '100px',
    },
    {
      title: 'Số lượng',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number, record: SafeAny) => {
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
            {displayVal} 💎
          </span>
        );
      },
      width: '110px',
    },
    {
      title: 'Số dư khả dụng',
      dataIndex: 'balance',
      key: 'balance',
      render: (val: number) => (
        <strong style={{ color: themeMode === 'dark' ? '#fbbf24' : '#d97706' }}>{val} 💎</strong>
      ),
      width: '130px',
    },
    {
      title: 'Lý do / Mô tả',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string) => desc || <span style={{ color: '#888', fontStyle: 'italic' }}>Không có mô tả</span>,
    },
    {
      title: 'Người thực hiện',
      dataIndex: 'staffName',
      key: 'staffName',
      width: '150px',
    },
  ];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 'bold' }}>
          <span>💎 Lịch sử giao dịch Kim cương</span>
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
        dataSource={gemTransactions || []}
        columns={gemColumns}
        rowKey="id"
        pagination={{ pageSize: 8, showSizeChanger: false }}
        size="small"
        locale={{ emptyText: 'Không có giao dịch kim cương nào.' }}
      />
    </Modal>
  );
};
