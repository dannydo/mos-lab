'use client';

import React from 'react';
import { Card, Tag, Button } from 'antd';
import { InfoCircleOutlined, GlobalOutlined } from '@ant-design/icons';

interface ProfileDetailsCardProps {
  customer: SafeAny;
  themeMode: 'light' | 'dark';
  onToggleForeign?: () => void;
}

export const ProfileDetailsCard: React.FC<ProfileDetailsCardProps> = React.memo(
  ({ customer, themeMode, onToggleForeign }) => {
    const mutedTextColor = themeMode === 'dark' ? '#cbd5e1' : '#475569';
    const dangerTextColor = themeMode === 'dark' ? '#f87171' : '#b91c1c';
    const infoTextColor = themeMode === 'dark' ? '#38bdf8' : '#0369a1';
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: mutedTextColor, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <GlobalOutlined /> Quốc tịch:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag color={customer.isForeign ? 'purple' : 'default'} style={{ margin: 0, fontWeight: 600 }}>
                {customer.isForeign ? '🌐 Khách nước ngoài' : '🇻🇳 Việt Nam'}
              </Tag>
              {onToggleForeign && (
                <Button
                  size="small"
                  type="link"
                  style={{
                    padding: 0,
                    minHeight: '24px',
                    fontSize: '11px',
                    color: themeMode === 'dark' ? '#D4A84B' : '#855b0e',
                    fontWeight: 600,
                  }}
                  onClick={onToggleForeign}
                >
                  [Đổi]
                </Button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: mutedTextColor }}>Giới tính:</span>
            <span style={{ fontWeight: 'bold' }}>{customer.gender || 'N/A'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: mutedTextColor }}>Ngày sinh:</span>
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
            <span style={{ color: mutedTextColor }}>Nhóm phân loại:</span>
            <Tag color="warning" style={{ margin: 0 }}>
              {customer.bucket}
            </Tag>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: mutedTextColor }}>Số ngày chưa quay lại:</span>
            <span style={{ fontWeight: 'bold', color: dangerTextColor }}>{customer.daysSinceLastVisit || 0} ngày</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: mutedTextColor }}>Phụ trách (OC):</span>
            <span style={{ fontWeight: 'bold', color: infoTextColor }}>
              {customer.onlineConsultant || 'Chưa phân bổ'}
            </span>
          </div>
        </div>
      </Card>
    );
  }
);

ProfileDetailsCard.displayName = 'ProfileDetailsCard';
