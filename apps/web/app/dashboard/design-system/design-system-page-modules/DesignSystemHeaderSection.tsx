'use client';

import React from 'react';
import { Button, Col, Row, Select, Space } from 'antd';
import { AlertCircle, CheckCircle2, LayoutGrid, Network, Palette, ShieldCheck, Zap } from 'lucide-react';
import type { CoreThemeMode } from '@mos-lab/shared';
import { AppIcon, PageHeader, StatCard, StatusTag } from '~/components/ui';
import type { AvailableThemeItem } from '~/context/ThemeContext';
import type { CatalogAuditStats } from './designSystemPageTypes';

export interface DesignSystemHeaderSectionProps {
  coreThemeId: string;
  availableCoreThemes: ReadonlyArray<AvailableThemeItem>;
  onCoreThemeChange: (themeId: string) => void;
  canManageThemes: boolean;
  onOpenStudio: () => void;
  onNavigateArchitecture: () => void;
  themeMode: CoreThemeMode;
  onToggleTheme: () => void;
  auditStats: CatalogAuditStats;
}

export function DesignSystemHeaderSection({
  coreThemeId,
  availableCoreThemes,
  onCoreThemeChange,
  canManageThemes,
  onOpenStudio,
  onNavigateArchitecture,
  themeMode,
  onToggleTheme,
  auditStats,
}: DesignSystemHeaderSectionProps) {
  return (
    <>
      <PageHeader
        title={
          <Space align="center" size="middle">
            <AppIcon icon={Palette} size={20} className="text-amber-500" />
            <span>Hệ Thống Thiết Kế (Design System &amp; UI Components Audit)</span>
            <StatusTag status="gold" label="Admin Only" icon={<AppIcon icon={ShieldCheck} size={12} />} />
          </Space>
        }
        subtitle="Catalog UI, ready kits và trạng thái kiểm duyệt của hệ thống"
        extra={
          <Space wrap>
            <Select
              aria-label="Core theme"
              value={coreThemeId}
              options={availableCoreThemes.map(({ id, label }) => ({ value: id, label }))}
              onChange={onCoreThemeChange}
            />
            {canManageThemes && (
              <Button icon={<AppIcon icon={Palette} size={14} className="text-amber-500" />} onClick={onOpenStudio}>
                Theme Studio (Tự sửa / Dán màu)
              </Button>
            )}
            <Button icon={<AppIcon icon={Network} size={14} />} onClick={onNavigateArchitecture}>
              Xem Sơ Đồ Graphify
            </Button>
            <Button
              type="primary"
              icon={<AppIcon icon={themeMode === 'dark' ? Zap : Palette} size={14} />}
              onClick={onToggleTheme}
            >
              Đổi Mode: {themeMode === 'dark' ? 'Dark' : 'Light'}
            </Button>
          </Space>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8} lg={6}>
          <StatCard
            title="∑ Components trong inventory"
            value={`${auditStats.totalCount} Components`}
            icon={<AppIcon icon={LayoutGrid} size={18} className="text-blue-500" />}
            subValue="Catalog UI đã audit"
          />
        </Col>
        <Col xs={24} sm={8} lg={6}>
          <StatCard
            title="Foundation sẵn sàng"
            value={`${auditStats.foundationCount} Components`}
            icon={<AppIcon icon={CheckCircle2} size={18} className="text-emerald-500" />}
            subValue="Đã có public contract"
          />
        </Col>
        <Col xs={24} sm={8} lg={6}>
          <StatCard
            title="Đang migration"
            value={`${auditStats.migratingCount} Components`}
            icon={<AppIcon icon={AlertCircle} size={18} className="text-amber-500" />}
            subValue="Chưa áp dụng đồng đều"
          />
        </Col>
        <Col xs={24} sm={24} lg={6}>
          <StatCard
            title="Tỷ Lệ Foundation"
            value={`${auditStats.foundationPercent}%`}
            icon={<AppIcon icon={ShieldCheck} size={18} className="text-purple-500" />}
            subValue="Không thay cho mức độ adoption"
          />
        </Col>
      </Row>
    </>
  );
}
