'use client';

import React from 'react';
import { Button, Col, Input, Row, Space, Typography } from 'antd';
import { themeTokens, type ResponsiveTier } from '@mos-lab/shared';
import {
  CollapsibleSearchField,
  ContentSurface,
  DataTable,
  PageToolbar,
  ResponsiveFormField,
  ResponsiveFormGrid,
  SectionCard,
  StatusTag,
} from '~/components/ui';
import type { ResponsiveDemoRecord } from './designSystemPageTypes';
import { VIEWPORT_QA_PRESETS, responsiveDemoColumns, responsiveDemoRecords } from './designSystemPageUtils';

const { Text } = Typography;

export interface DesignSystemResponsiveTabProps {
  responsiveTier: ResponsiveTier;
  onOpenAdaptiveModal: () => void;
  onOpenAdaptiveDrawer: () => void;
}

export function DesignSystemResponsiveTab({
  responsiveTier,
  onOpenAdaptiveModal,
  onOpenAdaptiveDrawer,
}: DesignSystemResponsiveTabProps) {
  return (
    <div className="responsive-page space-y-6 pt-2">
      <SectionCard
        title="Responsive contract đang chạy"
        extra={<StatusTag status="gold" label={`Tier hiện tại: ${responsiveTier.toUpperCase()}`} />}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Text strong>Behavior breakpoints (CSS/JS)</Text>
            <ul className="mt-2 space-y-1 text-sm tabular-nums">
              {Object.entries(themeTokens.responsive.breakpoints).map(([name, width]) => (
                <li key={name}>
                  <span className="font-medium">{name}</span>: ≥ {width}px
                </li>
              ))}
            </ul>
          </Col>
          <Col xs={24} md={12}>
            <Text strong>Viewport QA tách biệt</Text>
            <ul className="mt-2 space-y-1 text-sm tabular-nums">
              {VIEWPORT_QA_PRESETS.map((preset) => (
                <li key={preset}>{preset}</li>
              ))}
            </ul>
          </Col>
        </Row>
      </SectionCard>

      <SectionCard title="Page toolbar và information priority">
        <PageToolbar
          primary={
            <CollapsibleSearchField aria-label="Demo tìm khách hàng" behavior="filter" placeholder="Tìm khách hàng" />
          }
          actions={
            <>
              <Button>Filter</Button>
              <Button type="primary">+ Tạo lịch</Button>
            </>
          }
          secondary={<Text type="secondary">Phone stack action, desktop giữ thao tác cạnh search.</Text>}
        />
      </SectionCard>

      <SectionCard title="Adaptive data view">
        <DataTable<ResponsiveDemoRecord>
          columns={responsiveDemoColumns}
          dataSource={responsiveDemoRecords}
          rowKey="key"
          pagination={false}
          columnPriority={{ customer: 'primary', status: 'secondary', nextAction: 'tertiary' }}
          mobileRenderer={(record) => (
            <div className="space-y-1">
              <Text strong>{record.customer}</Text>
              <div>{record.status}</div>
              <Text type="secondary">{record.nextAction}</Text>
            </div>
          )}
        />
      </SectionCard>

      <SectionCard title="Responsive form grid và adaptive overlays">
        <ResponsiveFormGrid columns={3}>
          <ResponsiveFormField>
            <label className="mb-1 block text-sm font-medium" htmlFor="demo-name">
              Khách hàng
            </label>
            <Input id="demo-name" placeholder="Tên khách" />
          </ResponsiveFormField>
          <ResponsiveFormField>
            <label className="mb-1 block text-sm font-medium" htmlFor="demo-phone">
              Số điện thoại
            </label>
            <Input id="demo-phone" placeholder="090…" />
          </ResponsiveFormField>
          <ResponsiveFormField fullWidth>
            <label className="mb-1 block text-sm font-medium" htmlFor="demo-note">
              Ghi chú
            </label>
            <Input.TextArea id="demo-note" rows={3} placeholder="Mở rộng toàn hàng theo field intent" />
          </ResponsiveFormField>
        </ResponsiveFormGrid>
        <Space wrap className="mt-4">
          <Button onClick={onOpenAdaptiveModal}>Mở form modal</Button>
          <Button onClick={onOpenAdaptiveDrawer}>Mở detail drawer</Button>
        </Space>
      </SectionCard>

      <ContentSurface elevated>
        <Text type="secondary">
          Các demo này dùng chính primitives Phase 1. Rollout Phase 2–7 dùng các patterns này theo archetype, không tự
          định nghĩa breakpoint mới.
        </Text>
      </ContentSurface>
    </div>
  );
}
