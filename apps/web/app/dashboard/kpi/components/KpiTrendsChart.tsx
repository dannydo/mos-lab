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
      {trends.length === 0 ? (
        <div className="flex justify-center items-center h-64 text-secondary">Không có dữ liệu xu hướng</div>
      ) : (
        <div className="flex flex-col h-64 justify-end pt-4">
          {/* Visual custom bar graphs */}
          <div
            className="flex justify-around items-end h-48 w-full px-2"
            style={{ borderBottom: `1px solid ${token.colorBorderSecondary}` }}
          >
            {trends.map((t) => {
              const maxVal = Math.max(...trends.map((d) => Math.max(d.planned, d.called, 1)));
              const plannedHeight = (t.planned / maxVal) * 100;
              const calledHeight = (t.called / maxVal) * 100;
              const dateLabel = dayjs(t.date).format('DD/MM');

              return (
                <div
                  key={t.date}
                  className="flex flex-col items-center flex-1 group relative"
                  style={{ maxWidth: '60px' }}
                >
                  {/* Bars Container */}
                  <div className="flex items-end justify-center w-full gap-1 h-32 mb-2">
                    {/* Planned Bar (Gold) */}
                    <TooltipTitle title={`Kế hoạch: ${t.planned}`}>
                      <div
                        className="w-3 rounded-t-sm transition-all duration-300 group-hover:opacity-80"
                        style={{
                          height: `${Math.max(plannedHeight, 2)}%`,
                          background: 'linear-gradient(to top, #D4A84B, #FFEC3D)',
                        }}
                      />
                    </TooltipTitle>

                    {/* Called Bar (Blue) */}
                    <TooltipTitle title={`Thực tế gọi: ${t.called}`}>
                      <div
                        className="w-3 rounded-t-sm transition-all duration-300 group-hover:opacity-80"
                        style={{
                          height: `${Math.max(calledHeight, 2)}%`,
                          background: 'linear-gradient(to top, #1890FF, #40A9FF)',
                        }}
                      />
                    </TooltipTitle>
                  </div>
                  {/* X-axis Label */}
                  <span style={{ fontSize: '10px', color: token.colorTextDescription }}>{dateLabel}</span>
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
