import React from 'react';
import { Row, Col, Card, Progress, Skeleton } from 'antd';
import type { RevenueHourlySummary } from '@mos-lab/shared';

interface RevenueKpiCardsProps {
  themeMode: 'light' | 'dark';
  token: any;
  summary: RevenueHourlySummary | null;
  loading?: boolean;
  onCardClick?: (type: 'revenue' | 'aov' | 'forecast' | 'combo') => void;
}

const formatVnd = (value: number) => new Intl.NumberFormat('vi-VN').format(Math.round(value)) + ' đ';

export const RevenueKpiCards: React.FC<RevenueKpiCardsProps> = ({
  themeMode,
  token,
  summary,
  loading,
  onCardClick,
}) => {
  if (loading || !summary) {
    return (
      <Row gutter={[16, 16]}>
        {[1, 2, 3].map((i) => (
          <Col xs={24} sm={12} lg={8} key={i}>
            <Card>
              <Skeleton active />
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  const {
    totalRevenue = 0,
    dailyTarget = 1,
    aov = 0,
    completedOrders = 0,
    projectedRevenue = 0,
    elapsedRatio = 0,
    comboCount = 0,
    comboRevenue = 0,
    singleRevenue = 0,
    productRevenue = 0,
    isSingleDay = true,
  } = summary;
  const isDark = themeMode === 'dark';

  const revenuePercent = Math.min(100, Math.round((totalRevenue / (dailyTarget || 1)) * 100));
  const timePercent = Math.min(100, Math.round(elapsedRatio * 100));

  const isClosed = elapsedRatio >= 1;
  const forecastTitle = isClosed
    ? isSingleDay
      ? 'Thực tế chốt ngày (🔮)'
      : 'Thực tế chốt kỳ (🔮)'
    : isSingleDay
      ? 'Dự báo cuối ngày (🔮)'
      : 'Dự báo cuối kỳ (🔮)';

  const forecastSubtext = isClosed ? 'Đã chốt (100% thời gian)' : `Đã trôi ${timePercent}% thời gian`;

  const cards = [
    {
      type: 'revenue' as const,
      title: isSingleDay ? 'Doanh thu ngày (💰)' : 'Tổng doanh thu (💰)',
      color: '#10b981',
      value: formatVnd(totalRevenue),
      bg: isDark ? '#062016' : '#ecfdf5',
      border: isDark ? '#14532d' : '#a7f3d0',
      content: (
        <div style={{ marginTop: 10 }}>
          <Progress percent={revenuePercent} size="small" strokeColor="#10b981" />
          <div
            style={{
              fontSize: '11px',
              color: token.colorTextSecondary,
              marginBottom: 8,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>{revenuePercent}% mục tiêu</span>
            <span>Mục tiêu: {formatVnd(dailyTarget)}</span>
          </div>
          <div
            style={{
              paddingTop: 8,
              borderTop: `1px dashed ${isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1'}`,
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#10b981', fontWeight: 500 }}>📦 Combo:</span>
              <span style={{ fontWeight: 600, color: token.colorText }} className="tabular-nums">
                {comboCount > 0 ? `${comboCount} gói • ` : ''}
                {formatVnd(comboRevenue)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#06b6d4', fontWeight: 500 }}>👁️ Lẻ:</span>
              <span style={{ fontWeight: 600, color: token.colorText }} className="tabular-nums">
                {formatVnd(singleRevenue)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#f59e0b', fontWeight: 500 }}>🛍️ Sản phẩm:</span>
              <span style={{ fontWeight: 600, color: token.colorText }} className="tabular-nums">
                {formatVnd(productRevenue)}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      type: 'aov' as const,
      title: 'AOV & Đơn Hàng (📊)',
      color: '#06b6d4',
      value: formatVnd(aov),
      bg: isDark ? '#0c1a2a' : '#ecfeff',
      border: isDark ? '#164e63' : '#a5f3fc',
      content: (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: '12px', color: token.colorTextSecondary, marginBottom: 8 }}>
            Doanh số bình quân / đơn completed
          </div>
          <div
            style={{
              paddingTop: 8,
              borderTop: `1px dashed ${isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1'}`,
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#06b6d4', fontWeight: 500 }}>✅ Đơn hoàn thành:</span>
              <span style={{ fontWeight: 600, color: token.colorText }} className="tabular-nums">
                {completedOrders} đơn
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: token.colorTextSecondary, fontWeight: 500 }}>💡 Chi tiết:</span>
              <span style={{ fontSize: '11px', color: '#06b6d4', fontWeight: 500 }}>Nhấp để xem giao dịch</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      type: 'forecast' as const,
      title: forecastTitle,
      color: isClosed ? '#94a3b8' : '#a855f7',
      value: isClosed ? formatVnd(projectedRevenue) : `~${formatVnd(projectedRevenue)}`,
      bg: isDark ? (isClosed ? '#181e29' : '#1a0f2e') : isClosed ? '#f8fafc' : '#faf5ff',
      border: isDark ? (isClosed ? '#334155' : '#581c87') : isClosed ? '#e2e8f0' : '#d8b4fe',
      content: (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: '12px', color: token.colorTextSecondary, marginBottom: 8 }}>{forecastSubtext}</div>
          <div
            style={{
              paddingTop: 8,
              borderTop: `1px dashed ${isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1'}`,
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: isClosed ? '#94a3b8' : '#a855f7', fontWeight: 500 }}>⏱️ Trạng thái:</span>
              <span style={{ fontWeight: 600, color: isClosed ? '#94a3b8' : '#a855f7' }}>
                {isClosed ? 'Đã đóng sổ' : 'Đang vận hành'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: token.colorTextSecondary, fontWeight: 500 }}>📌 Ca vận hành:</span>
              <span style={{ fontSize: '11px', color: token.colorTextSecondary }}>09:00 - 21:00 (+2h)</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Row gutter={[16, 16]} className="tabular-nums">
      {cards.map((card, i) => (
        <Col xs={24} sm={12} lg={8} key={i}>
          <div
            onClick={() => onCardClick && onCardClick(card.type)}
            style={{
              backgroundColor: card.bg,
              border: `1px solid ${card.border}`,
              borderRadius: token.borderRadiusLG,
              padding: token.padding,
              cursor: 'pointer',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            }}
          >
            <div>
              <div style={{ color: card.color, fontWeight: 'bold', marginBottom: 8 }}>{card.title}</div>
              <div style={{ fontSize: '24px', fontWeight: 600, color: token.colorText }}>{card.value}</div>
            </div>
            {card.content}
          </div>
        </Col>
      ))}
    </Row>
  );
};
