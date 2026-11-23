'use client';

import React from 'react';
import { Button, Col, Input, Row, Space, Switch, Tooltip, Typography } from 'antd';
import { RefreshCw, Search } from 'lucide-react';
import { AppIcon, ContentSurface } from '~/components/ui';

const { Text } = Typography;

interface BranchFilterToolbarProps {
  search: string;
  onlyHidden: boolean;
  loading: boolean;
  onSearchChange: (value: string) => void;
  onOnlyHiddenChange: (checked: boolean) => void;
  onRefresh: () => void;
}

export function BranchFilterToolbar({
  search,
  onlyHidden,
  loading,
  onSearchChange,
  onOnlyHiddenChange,
  onRefresh,
}: BranchFilterToolbarProps) {
  return (
    <ContentSurface padding="12px 16px" className="shadow-sm">
      <Row gutter={[16, 12]} justify="space-between" align="middle">
        <Col xs={24} md={16}>
          <Space size="middle" wrap className="w-full">
            <Input
              aria-label="Tìm kiếm chi nhánh"
              placeholder="Tìm tên chi nhánh, mã code, địa chỉ city..."
              prefix={<AppIcon icon={Search} size="sm" className="text-slate-400" />}
              allowClear
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full sm:w-80"
            />

            <Tooltip title="Chuyển sang chế độ chỉ xem các chi nhánh đã bị vô hiệu hóa">
              <Space align="center" className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <Text className="text-xs font-medium">Chỉ hiện mục đã ẩn</Text>
                <Switch
                  aria-label="Chỉ hiện mục đã ẩn"
                  size="small"
                  checked={onlyHidden}
                  onChange={onOnlyHiddenChange}
                />
              </Space>
            </Tooltip>

            <Button icon={<AppIcon icon={RefreshCw} size="sm" />} onClick={onRefresh} loading={loading}>
              Làm mới
            </Button>
          </Space>
        </Col>
      </Row>
    </ContentSurface>
  );
}
