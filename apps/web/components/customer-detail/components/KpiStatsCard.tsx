'use client';

import React from 'react';
import { Card } from 'antd';
import { RiseOutlined, LineChartOutlined, SketchOutlined, DollarOutlined, CalendarOutlined } from '@ant-design/icons';
import { formatCompactVND } from '../../../lib/format-utils';

interface KpiStatsCardProps {
  stats: SafeAny;
  themeMode: 'light' | 'dark';
  onOpenGemModal: () => void;
  onOpenTipModal: () => void;
  onOpenRevenueModal: () => void;
}

export const KpiStatsCard: React.FC<KpiStatsCardProps> = ({
  stats,
  themeMode,
  onOpenGemModal,
  onOpenTipModal,
  onOpenRevenueModal,
}) => {
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
        {/* Box 1: LTV (Doanh thu) */}
        <div
          onClick={onOpenRevenueModal}
          style={{
            background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.05)' : '#fdf9f0',
            padding: '10px',
            borderRadius: '8px',
            textAlign: 'center',
            border: `1px solid ${themeMode === 'dark' ? 'rgba(212, 168, 75, 0.15)' : 'rgba(212, 168, 75, 0.2)'}`,
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
              themeMode === 'dark' ? 'rgba(212, 168, 75, 0.15)' : 'rgba(212, 168, 75, 0.2)';
          }}
        >
          <div
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#D4A84B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <LineChartOutlined style={{ color: '#D4A84B' }} />
            <span>{formatCompactVND(stats?.totalSpent || 0)}</span>
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>LTV (Doanh thu)</div>
        </div>

        {/* Box 2: Lịch hẹn / Tần suất (Merged) */}
        <div
          style={{
            background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.05)' : '#fdf9f0',
            padding: '10px',
            borderRadius: '8px',
            textAlign: 'center',
            border: `1px solid ${themeMode === 'dark' ? 'rgba(212, 168, 75, 0.15)' : 'rgba(212, 168, 75, 0.2)'}`,
          }}
        >
          <div
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#D4A84B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <CalendarOutlined style={{ color: '#D4A84B' }} />
            <span>
              {stats?.totalVisits || 0} <span style={{ color: '#888', fontWeight: 'normal', fontSize: '14px' }}>/</span>{' '}
              <span style={{ color: '#52c41a' }}>
                {stats?.avgFrequency ? `${Math.round(Number(stats.avgFrequency))}d` : 'N/A'}
              </span>
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>Lịch hẹn / Tần suất</div>
        </div>

        {/* Box 3: Kim cương còn lại */}
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
              gap: '6px',
            }}
          >
            <SketchOutlined style={{ color: '#0ea5e9' }} />
            <span>{stats?.gemBalance || 0}</span>
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>Kim cương còn lại</div>
        </div>

        {/* Box 4: Tips */}
        <div
          onClick={onOpenTipModal}
          style={{
            background: themeMode === 'dark' ? 'rgba(82, 196, 26, 0.05)' : '#f6ffed',
            padding: '10px',
            borderRadius: '8px',
            textAlign: 'center',
            border: `1px solid ${themeMode === 'dark' ? 'rgba(82, 196, 26, 0.2)' : 'rgba(82, 196, 26, 0.3)'}`,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(82, 196, 26, 0.2)';
            e.currentTarget.style.borderColor = '#52c41a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
            e.currentTarget.style.borderColor =
              themeMode === 'dark' ? 'rgba(82, 196, 26, 0.2)' : 'rgba(82, 196, 26, 0.3)';
          }}
        >
          <div
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#52c41a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <DollarOutlined style={{ color: '#52c41a' }} />
            <span>{formatCompactVND(stats?.totalTips || 0)}</span>
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
            Tips ({stats?.tipRate || 0}% | Avg {formatCompactVND(stats?.avgTip || 0)})
          </div>
        </div>
      </div>
    </Card>
  );
};
