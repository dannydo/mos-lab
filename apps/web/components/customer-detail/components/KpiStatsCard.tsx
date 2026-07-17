'use client';

import React from 'react';
import { Card } from 'antd';
import { RiseOutlined } from '@ant-design/icons';

interface KpiStatsCardProps {
  stats: SafeAny;
  themeMode: 'light' | 'dark';
  onOpenGemModal: () => void;
}

export const KpiStatsCard: React.FC<KpiStatsCardProps> = ({ stats, themeMode, onOpenGemModal }) => {
  return (
    <Card
      title={
        <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
          <RiseOutlined /> CHỈ SỐ TÍCH LUỸ
        </span>
      }
      size="small"
      styles={{ body: { padding: '16px' } }}
      style={{
        backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
        borderColor: themeMode === 'dark' ? '#334155' : '#e5e7eb',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div
          style={{
            background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.05)' : '#fdf9f0',
            padding: '10px',
            borderRadius: '8px',
            textAlign: 'center',
            border: `1px solid ${themeMode === 'dark' ? 'rgba(212, 168, 75, 0.15)' : 'rgba(212, 168, 75, 0.2)'}`,
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#D4A84B' }}>
            {new Intl.NumberFormat('vi-VN', {
              style: 'currency',
              currency: 'VND',
              notation: 'compact',
            }).format(stats?.totalSpent || 0)}
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>LTV (Doanh thu)</div>
        </div>

        <div
          style={{
            background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.05)' : '#fdf9f0',
            padding: '10px',
            borderRadius: '8px',
            textAlign: 'center',
            border: `1px solid ${themeMode === 'dark' ? 'rgba(212, 168, 75, 0.15)' : 'rgba(212, 168, 75, 0.2)'}`,
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#D4A84B' }}>{stats?.totalVisits || 0}</div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Tổng đặt lịch</div>
        </div>

        <div
          onClick={onOpenGemModal}
          style={{
            background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.05)' : '#fdf9f0',
            padding: '10px',
            borderRadius: '8px',
            textAlign: 'center',
            border: `1px solid ${themeMode === 'dark' ? 'rgba(212, 168, 75, 0.2)' : 'rgba(212, 168, 75, 0.3)'}`,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(212, 168, 75, 0.2)';
            e.currentTarget.style.borderColor = '#fa8c16';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
            e.currentTarget.style.borderColor =
              themeMode === 'dark' ? 'rgba(212, 168, 75, 0.2)' : 'rgba(212, 168, 75, 0.3)';
          }}
        >
          <div
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#fa8c16',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            💎 {stats?.gemBalance || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Kim cương còn lại</div>
        </div>

        <div
          style={{
            background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.05)' : '#fdf9f0',
            padding: '10px',
            borderRadius: '8px',
            textAlign: 'center',
            border: `1px solid ${themeMode === 'dark' ? 'rgba(212, 168, 75, 0.15)' : 'rgba(212, 168, 75, 0.2)'}`,
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a' }}>
            {stats?.avgFrequency ? `${stats.avgFrequency}d` : 'N/A'}
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Tần suất (Avg)</div>
        </div>
      </div>
    </Card>
  );
};
