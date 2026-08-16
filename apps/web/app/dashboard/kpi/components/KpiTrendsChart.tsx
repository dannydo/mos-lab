'use client';

import React, { useState } from 'react';
import { Card, Space, theme } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { TrendDay } from '@mos-lab/shared';

interface KpiTrendsChartProps {
  trends: TrendDay[];
}

// Simple Tooltip helper component for CSS Bar Charts
function TooltipTitle({ title, children }: { title: string; children: React.ReactElement }) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative flex justify-center w-full"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {visible && (
        <div
          className="absolute z-10 px-2 py-1 text-xs text-white bg-black rounded shadow-md whitespace-nowrap"
          style={{ bottom: '100%', marginBottom: '4px', fontSize: '10px', pointerEvents: 'none' }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

export default function KpiTrendsChart({ trends }: KpiTrendsChartProps) {
  const { token } = theme.useToken();
  const hasTrendData = trends.some((trend) => trend.planned > 0 || trend.called > 0);
  const maxValue = Math.max(...trends.map((trend) => Math.max(trend.planned, trend.called, 0)), 1);
  const labelEvery = trends.length > 21 ? 3 : trends.length > 14 ? 2 : 1;
  const barWidth = trends.length > 21 ? 5 : trends.length > 14 ? 7 : 10;

  return (
    <Card
      title={
        <span style={{ color: token.colorText }}>
          <LineChartOutlined /> Xu hướng gọi điện hàng ngày
        </span>
      }
      variant="outlined"
      style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary, height: '400px' }}
    >
      {!hasTrendData ? (
        <div className="flex flex-col justify-center items-center h-64 gap-1 text-center">
          <span style={{ color: token.colorTextSecondary }}>Chưa có dữ liệu xu hướng trong kỳ này</span>
          <span style={{ color: token.colorTextDescription, fontSize: 12 }}>
            Dữ liệu sẽ hiển thị khi có cuộc gọi hoặc lịch hẹn được ghi nhận.
          </span>
        </div>
      ) : (
        <div className="flex flex-col h-64 justify-end pt-4">
          {/* Visual custom bar graphs */}
          <div
            className="kpi-trends-bars flex justify-between items-end h-48 w-full px-2 gap-px"
            style={{ borderBottom: `1px solid ${token.colorBorderSecondary}` }}
          >
            {trends.map((t, index) => {
              const plannedHeight = (t.planned / maxValue) * 100;
              const calledHeight = (t.called / maxValue) * 100;
              const dateLabel = dayjs(t.date).format('DD/MM');
              const showDateLabel = index % labelEvery === 0 || index === trends.length - 1;

              return (
                <div key={t.date} className="kpi-trends-day flex min-w-0 flex-1 flex-col items-center group relative">
                  {/* Bars Container */}
                  <div className="flex items-end justify-center w-full gap-0.5 h-32 mb-2">
                    {/* Planned Bar (Gold) */}
                    <TooltipTitle title={`Kế hoạch: ${t.planned}`}>
                      <div
                        className="rounded-t-sm transition-all duration-300 group-hover:opacity-80"
                        style={{
                          width: `${barWidth}px`,
                          height: `${plannedHeight}%`,
                          background: 'linear-gradient(to top, #D4A84B, #FFEC3D)',
                        }}
                      />
                    </TooltipTitle>

                    {/* Called Bar (Blue) */}
                    <TooltipTitle title={`Thực tế gọi: ${t.called}`}>
                      <div
                        className="rounded-t-sm transition-all duration-300 group-hover:opacity-80"
                        style={{
                          width: `${barWidth}px`,
                          height: `${calledHeight}%`,
                          background: 'linear-gradient(to top, #1890FF, #40A9FF)',
                        }}
                      />
                    </TooltipTitle>
                  </div>
                  {/* X-axis Label */}
                  <span
                    aria-hidden={!showDateLabel}
                    style={{
                      color: token.colorTextDescription,
                      fontSize: 10,
                      lineHeight: '14px',
                      visibility: showDateLabel ? 'visible' : 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {dateLabel}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex justify-center gap-6 mt-4">
            <Space>
              <div style={{ width: '12px', height: '12px', background: '#D4A84B', borderRadius: '2px' }} />
              <span style={{ fontSize: '12px', color: token.colorText }}>Số cuộc kế hoạch</span>
            </Space>
            <Space>
              <div style={{ width: '12px', height: '12px', background: '#1890FF', borderRadius: '2px' }} />
              <span style={{ fontSize: '12px', color: token.colorText }}>Số cuộc đã gọi</span>
            </Space>
          </div>
        </div>
      )}
    </Card>
  );
}
