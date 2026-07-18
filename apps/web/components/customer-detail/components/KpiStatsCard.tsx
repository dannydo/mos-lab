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
            background: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#ffffff',
            padding: '12px 14px',
            borderRadius: '12px',
            border: `1px solid ${themeMode === 'dark' ? '#334155' : '#e2e8f0'}`,
            borderLeft: '4px solid #D4A84B',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: themeMode === 'dark' ? '0 4px 6px -1px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '82px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(212, 168, 75, 0.15)';
            e.currentTarget.style.borderColor = '#D4A84B';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow =
              themeMode === 'dark' ? '0 4px 6px -1px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.02)';
            e.currentTarget.style.borderColor = themeMode === 'dark' ? '#334155' : '#e2e8f0';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#888', fontWeight: '500' }}>LTV (Doanh thu)</span>
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.1)' : '#fdf9f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LineChartOutlined style={{ color: '#D4A84B', fontSize: '13px' }} />
            </div>
          </div>
          <div
            style={{
              fontSize: '19px',
              fontWeight: '800',
              color: themeMode === 'dark' ? '#f8fafc' : '#0f172a',
              marginTop: '2px',
            }}
          >
            {formatCompactVND(stats?.totalSpent || 0)}
          </div>
        </div>

        {/* Box 2: Lịch hẹn / Tần suất */}
        <div
          style={{
            background: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#ffffff',
            padding: '12px 14px',
            borderRadius: '12px',
            border: `1px solid ${themeMode === 'dark' ? '#334155' : '#e2e8f0'}`,
            borderLeft: '4px solid #14b8a6',
            boxShadow: themeMode === 'dark' ? '0 4px 6px -1px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '82px',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(20, 184, 166, 0.15)';
            e.currentTarget.style.borderColor = '#14b8a6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow =
              themeMode === 'dark' ? '0 4px 6px -1px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.02)';
            e.currentTarget.style.borderColor = themeMode === 'dark' ? '#334155' : '#e2e8f0';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#888', fontWeight: '500' }}>Lịch hẹn / Tần suất</span>
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: themeMode === 'dark' ? 'rgba(20, 184, 166, 0.1)' : '#f0fdfa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CalendarOutlined style={{ color: '#14b8a6', fontSize: '13px' }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
            <span style={{ fontSize: '19px', fontWeight: '800', color: themeMode === 'dark' ? '#f8fafc' : '#0f172a' }}>
              {stats?.totalVisits || 0}
            </span>
            <span style={{ color: '#888', fontSize: '12px' }}>lần</span>
            <span style={{ color: '#888', fontWeight: 'normal', fontSize: '12px', margin: '0 1px' }}>/</span>
            <span style={{ color: '#14b8a6', fontWeight: '700', fontSize: '14px' }}>
              {stats?.avgFrequency ? `${Math.round(Number(stats.avgFrequency))} ngày` : 'N/A'}
            </span>
          </div>
        </div>

        {/* Box 3: Kim cương còn lại */}
        <div
          onClick={onOpenGemModal}
          style={{
            background: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#ffffff',
            padding: '12px 14px',
            borderRadius: '12px',
            border: `1px solid ${themeMode === 'dark' ? '#334155' : '#e2e8f0'}`,
            borderLeft: '4px solid #0ea5e9',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: themeMode === 'dark' ? '0 4px 6px -1px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '82px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(14, 165, 233, 0.15)';
            e.currentTarget.style.borderColor = '#0ea5e9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow =
              themeMode === 'dark' ? '0 4px 6px -1px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.02)';
            e.currentTarget.style.borderColor = themeMode === 'dark' ? '#334155' : '#e2e8f0';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#888', fontWeight: '500' }}>Kim cương còn lại</span>
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: themeMode === 'dark' ? 'rgba(14, 165, 233, 0.1)' : '#f0f9ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SketchOutlined style={{ color: '#0ea5e9', fontSize: '13px' }} />
            </div>
          </div>
          <div
            style={{
              fontSize: '19px',
              fontWeight: '800',
              color: themeMode === 'dark' ? '#f8fafc' : '#0f172a',
              marginTop: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {stats?.gemBalance || 0} <span style={{ fontSize: '12px', color: '#888', fontWeight: 'normal' }}>💎</span>
          </div>
        </div>

        {/* Box 4: Tips */}
        <div
          onClick={onOpenTipModal}
          style={{
            background: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#ffffff',
            padding: '12px 14px',
            borderRadius: '12px',
            border: `1px solid ${themeMode === 'dark' ? '#334155' : '#e2e8f0'}`,
            borderLeft: '4px solid #22c55e',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: themeMode === 'dark' ? '0 4px 6px -1px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '82px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(34, 197, 94, 0.15)';
            e.currentTarget.style.borderColor = '#22c55e';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow =
              themeMode === 'dark' ? '0 4px 6px -1px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.02)';
            e.currentTarget.style.borderColor = themeMode === 'dark' ? '#334155' : '#e2e8f0';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '11px',
                color: '#888',
                fontWeight: '500',
                maxWidth: '80%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={`Tips (${stats?.tipRate || 0}% | Avg ${formatCompactVND(stats?.avgTip || 0)})`}
            >
              Tips ({stats?.tipRate || 0}% | Avg {formatCompactVND(stats?.avgTip || 0)})
            </span>
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: themeMode === 'dark' ? 'rgba(34, 197, 94, 0.1)' : '#f0fdf4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DollarOutlined style={{ color: '#22c55e', fontSize: '13px' }} />
            </div>
          </div>
          <div
            style={{
              fontSize: '19px',
              fontWeight: '800',
              color: themeMode === 'dark' ? '#f8fafc' : '#0f172a',
              marginTop: '2px',
            }}
          >
            {formatCompactVND(stats?.totalTips || 0)}
          </div>
        </div>
      </div>
    </Card>
  );
};
