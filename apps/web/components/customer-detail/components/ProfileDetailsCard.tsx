'use client';

import React from 'react';
import { Card, Tag } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

interface ProfileDetailsCardProps {
  customer: SafeAny;
  themeMode: 'light' | 'dark';
}

export const ProfileDetailsCard: React.FC<ProfileDetailsCardProps> = ({ customer, themeMode }) => {
  return (
    <Card
      title={
        <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
          <InfoCircleOutlined /> THÔNG TIN CÁ NHÂN
        </span>
      }
      size="small"
      styles={{ body: { padding: '16px' } }}
      style={{
        backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
        borderColor: themeMode === 'dark' ? '#334155' : '#e5e7eb',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#888' }}>Giới tính:</span>
          <span style={{ fontWeight: 'bold' }}>{customer.gender || 'N/A'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#888' }}>Ngày sinh:</span>
          <span style={{ fontWeight: 'bold' }}>
            {(() => {
              if (!customer.dob) return 'N/A';
              const d = new Date(customer.dob);
              if (isNaN(d.getTime())) return 'N/A';
              const year = d.getFullYear();
              const formattedDate =
                year >= 2024
                  ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
                  : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${year}`;
              return customer.age !== undefined && customer.age !== null
                ? `${formattedDate} (${customer.age} tuổi)`
                : formattedDate;
            })()}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#888' }}>Nhóm phân loại:</span>
          <Tag color="warning" style={{ margin: 0 }}>
            {customer.bucket}
          </Tag>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#888' }}>Số ngày chưa quay lại:</span>
          <span style={{ fontWeight: 'bold', color: '#ff4d4f' }}>{customer.daysSinceLastVisit || 0} ngày</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#888' }}>Phụ trách (OC):</span>
          <span style={{ fontWeight: 'bold', color: themeMode === 'dark' ? '#38bdf8' : '#0284c7' }}>
            {customer.onlineConsultant || 'Chưa phân bổ'}
          </span>
        </div>
      </div>
    </Card>
  );
};
