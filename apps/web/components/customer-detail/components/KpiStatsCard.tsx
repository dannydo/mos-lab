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

export const KpiStatsCard: React.FC<KpiStatsCardProps> = React.memo(
  ({ stats, themeMode, onOpenGemModal, onOpenTipModal, onOpenRevenueModal }) => {
    const cardStyle = (color: string) => ({
      background: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#ffffff',
      padding: '12px 14px',
      borderRadius: '12px',
      border: `1px solid ${themeMode === 'dark' ? '#334155' : '#e2e8f0'}`,
      borderLeft: `4px solid ${color}`,
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: themeMode === 'dark' ? '0 4px 6px -1px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.02)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: '92px',
    });

    const valueStyle = {
      fontSize: '20px',
      fontWeight: '800',
      color: themeMode === 'dark' ? '#f8fafc' : '#0f172a',
      lineHeight: '1.2',
    };

    const subtextStyle = {
      fontSize: '11px',
      color: themeMode === 'dark' ? '#94a3b8' : '#64748b',
      marginTop: '2px',
      fontWeight: '400',
    };

    const labelStyle = {
      fontSize: '12px',
      color: themeMode === 'dark' ? '#94a3b8' : '#64748b',
      fontWeight: '500',
    };

    return (
      <Card
        className="customer-kpi-card"
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
        <div className="customer-kpi-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {/* Box 1: LTV */}
          <div
            className="customer-kpi-metric"
            onClick={onOpenRevenueModal}
            style={cardStyle('#D4A84B') as React.CSSProperties}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={labelStyle}>LTV</span>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.1)' : '#fdf9f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <LineChartOutlined style={{ color: '#D4A84B', fontSize: '13px' }} />
              </div>
            </div>
            <div>
              <div style={{ ...valueStyle, fontVariantNumeric: 'tabular-nums' }}>
                {formatCompactVND(stats?.totalSpent || 0)}
              </div>
              <div style={subtextStyle}>∑ Chi tiêu</div>
            </div>
          </div>

          {/* Box 2: Lịch hẹn */}
          <div
            className="customer-kpi-metric"
            style={cardStyle('#14b8a6') as React.CSSProperties}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={labelStyle}>Lịch hẹn</span>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: themeMode === 'dark' ? 'rgba(20, 184, 166, 0.1)' : '#f0fdfa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CalendarOutlined style={{ color: '#14b8a6', fontSize: '13px' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', lineHeight: '1.2' }}>
                <span style={{ ...valueStyle, fontVariantNumeric: 'tabular-nums' }}>{stats?.totalVisits || 0}</span>
                <span
                  style={{ color: themeMode === 'dark' ? '#94a3b8' : '#64748b', fontSize: '12px', fontWeight: '500' }}
                >
                  lần
                </span>
              </div>
              <div style={subtextStyle}>
                {stats?.avgFrequency ? `Mỗi ${Math.round(Number(stats.avgFrequency))} ngày` : 'Chưa có tần suất'}
              </div>
            </div>
          </div>

          {/* Box 3: Kim Cương */}
          <div
            className="customer-kpi-metric"
            onClick={onOpenGemModal}
            style={cardStyle('#0ea5e9') as React.CSSProperties}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={labelStyle}>Kim Cương</span>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: themeMode === 'dark' ? 'rgba(14, 165, 233, 0.1)' : '#f0f9ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <SketchOutlined style={{ color: '#0ea5e9', fontSize: '13px' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', lineHeight: '1.2' }}>
                <span style={{ ...valueStyle, fontVariantNumeric: 'tabular-nums' }}>{stats?.gemBalance || 0}</span>
                <span style={{ fontSize: '13px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b' }}>💎</span>
              </div>
              <div style={subtextStyle}>Số dư tích luỹ</div>
            </div>
          </div>

          {/* Box 4: Tips */}
          <div
            className="customer-kpi-metric"
            onClick={onOpenTipModal}
            style={cardStyle('#22c55e') as React.CSSProperties}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={labelStyle}>Tips</span>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: themeMode === 'dark' ? 'rgba(34, 197, 94, 0.1)' : '#f0fdf4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <DollarOutlined style={{ color: '#22c55e', fontSize: '13px' }} />
              </div>
            </div>
            <div>
              <div style={{ ...valueStyle, fontVariantNumeric: 'tabular-nums' }}>
                {formatCompactVND(stats?.totalTips || 0)}
              </div>
              <div style={{ ...subtextStyle, fontVariantNumeric: 'tabular-nums' }}>
                {stats?.tipRate || 0}% (Avg {formatCompactVND(stats?.avgTip || 0).replace(/\sđ$/, '')})
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }
);

KpiStatsCard.displayName = 'KpiStatsCard';
