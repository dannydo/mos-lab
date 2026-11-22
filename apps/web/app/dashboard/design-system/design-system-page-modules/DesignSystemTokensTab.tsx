'use client';

import React from 'react';
import { Col, Row, Typography } from 'antd';
import { Laptop, Monitor, Smartphone, Tablet } from 'lucide-react';
import { themeTokens, type ThemeColors } from '@mos-lab/shared';
import { AppIcon, SectionCard } from '~/components/ui';
import type { BreakpointDisplaySpec } from './designSystemPageTypes';
import { BREAKPOINT_DISPLAY_SPECS, DISPLAY_DENSITY_SPECS, TOKEN_SWATCH_SPECS } from './designSystemPageUtils';

const { Paragraph, Text } = Typography;

export interface DesignSystemTokensTabProps {
  currentTokens: ThemeColors;
  counter: number;
}

function BreakpointIcon({ spec }: { spec: BreakpointDisplaySpec }) {
  const iconMap = {
    phone: Smartphone,
    ipad: Tablet,
    laptop: Laptop,
    desktop: Monitor,
    fourK: Monitor,
  } as const;
  return <AppIcon icon={iconMap[spec.iconKey]} size={14} className={spec.iconColorClass} />;
}

export function DesignSystemTokensTab({ currentTokens, counter }: DesignSystemTokensTabProps) {
  return (
    <div className="space-y-6 pt-2">
      <SectionCard title="Bảng Màu Chuẩn (Single Source of Truth Theme Colors)">
        <Row gutter={[16, 16]}>
          {TOKEN_SWATCH_SPECS.map((swatch) => (
            <Col xs={24} sm={12} md={6} key={swatch.key}>
              <div
                className={`rounded-xl border border-black/10 p-4 text-center font-bold shadow-sm dark:border-white/10 ${swatch.className}`}
              >
                {swatch.title}
                <div className="text-xs opacity-90">{currentTokens[swatch.key]}</div>
              </div>
            </Col>
          ))}
        </Row>
      </SectionCard>

      <SectionCard title="Quy Tắc Định Dạng Số (Tabular-nums Jitter Prevention Rule)">
        <Paragraph>
          Tất cả các số đếm ngược, thời lượng, số đơn, doanh thu bắt buộc dùng `tabular-nums` để chữ số có chiều rộng
          bằng nhau, ngăn nhảy giật giao diện khi cập nhật liên tục.
        </Paragraph>
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <Text strong className="text-lg">
            Đồng Hồ Đếm Tương Tác Live:
          </Text>
          <span className="text-2xl font-bold text-amber-500 tabular-nums">
            {counter.toLocaleString('vi-VN')}
            {'\u00a0'}đ
          </span>
        </div>
      </SectionCard>

      <SectionCard title="Responsive Breakpoints & Density Presets">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Text strong>Responsive Breakpoints Token:</Text>
            <ul className="mt-2 space-y-1 text-sm tabular-nums">
              {BREAKPOINT_DISPLAY_SPECS.map((spec) => (
                <li key={spec.key} className="flex items-center gap-1.5">
                  <BreakpointIcon spec={spec} />
                  <span>
                    <strong>{spec.label}</strong>: {themeTokens.breakpoints[spec.key]}px
                  </span>
                </li>
              ))}
            </ul>
          </Col>
          <Col xs={24} md={12}>
            <Text strong>Display Density Contract:</Text>
            <ul className="mt-2 space-y-1 text-sm">
              {DISPLAY_DENSITY_SPECS.map((spec) => (
                <li key={spec.title}>
                  <strong>{spec.title}</strong>: {spec.description}
                </li>
              ))}
            </ul>
          </Col>
        </Row>
      </SectionCard>
    </div>
  );
}
