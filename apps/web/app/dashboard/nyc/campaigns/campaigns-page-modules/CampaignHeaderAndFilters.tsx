'use client';

import React from 'react';
import { Button, Col, Input, Row, Select, Space, Switch, Typography } from 'antd';
import { Clock, Plus, Search } from 'lucide-react';
import { AppIcon, ContentSurface } from '~/components/ui';
import { CAMPAIGN_STATUS_FILTER_OPTIONS } from './campaignManagementTypes';

const { Title, Text } = Typography;

export interface CampaignHeaderAndFiltersProps {
  showInSidebar: boolean;
  isAdmin: boolean;
  searchQuery: string;
  statusFilter: string;
  filteredCount: number;
  onToggleSidebar: (checked: boolean) => void;
  onOpenCreate: () => void;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
}

export function CampaignHeaderAndFilters({
  showInSidebar,
  isAdmin,
  searchQuery,
  statusFilter,
  filteredCount,
  onToggleSidebar,
  onOpenCreate,
  onSearchChange,
  onStatusFilterChange,
}: CampaignHeaderAndFiltersProps) {
  return (
    <>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <Title
            level={2}
            className="m-0 flex items-center gap-2 font-bold text-amber-800 dark:text-[var(--color-primary)]"
          >
            <AppIcon icon={Clock} size={22} className="shrink-0" />
            <span>Quản lý Chiến dịch NYC</span>
          </Title>
          <Text type="secondary">Thiết lập và theo dõi các chiến dịch chăm sóc khách hàng NYC đặc biệt.</Text>
        </div>

        <Space wrap size="middle">
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-semibold dark:border-white/10 dark:bg-white/[0.04]">
            <span className="text-slate-700 dark:text-slate-300">Hiện link chiến dịch ở Sidebar:</span>
            <Switch
              checked={showInSidebar}
              onChange={onToggleSidebar}
              size="small"
              aria-label="Hiện link chiến dịch ở Sidebar"
              className="[&.ant-switch-checked]:bg-emerald-500"
            />
          </div>

          {isAdmin && (
            <Button
              type="primary"
              icon={<AppIcon icon={Plus} size={16} />}
              size="large"
              onClick={onOpenCreate}
              className="border-amber-700 bg-amber-700 font-bold text-white hover:bg-amber-600 dark:border-amber-500 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
            >
              Tạo chiến dịch mới
            </Button>
          )}
        </Space>
      </div>

      <ContentSurface className="mb-5" padding={16}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Tìm kiếm chiến dịch (Tên, Slug, Mô tả)..."
              prefix={<AppIcon icon={Search} size={14} className="text-slate-400" />}
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={10}>
            <Select
              value={statusFilter}
              onChange={onStatusFilterChange}
              className="w-full"
              options={[...CAMPAIGN_STATUS_FILTER_OPTIONS]}
            />
          </Col>
          <Col xs={24} sm={24} md={6} className="text-right">
            <Text type="secondary" className="tabular-nums">
              Hiển thị <strong>{filteredCount}</strong> chiến dịch
            </Text>
          </Col>
        </Row>
      </ContentSurface>
    </>
  );
}
