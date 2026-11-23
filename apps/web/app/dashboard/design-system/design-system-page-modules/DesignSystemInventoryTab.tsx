'use client';

import React from 'react';
import { Button, Col, Row, Segmented, Select, Space, Typography } from 'antd';
import { AlertCircle, AlertTriangle, CheckCircle2, Code2, Eye, LayoutGrid, XCircle } from 'lucide-react';
import type { CoreThemeMode, DensityProfile, DesktopDensity, ResponsiveTier } from '@mos-lab/shared';
import type { CatalogStatus, UiCatalogItem } from '~/components/design-system/catalog.manifest';
import { AppIcon, DensityContainer, SectionCard, StatusTag } from '~/components/ui';
import { DESKTOP_DENSITY_SELECT_OPTIONS, getCategoryBadgeInfo } from './designSystemPageUtils';

const { Paragraph, Text } = Typography;

export interface DesignSystemInventoryTabProps {
  totalCount: number;
  foundationCount: number;
  migratingCount: number;
  auditFilter: string;
  onAuditFilterChange: (value: string) => void;
  desktopDensity: DesktopDensity;
  effectiveDensity: DensityProfile;
  onDesktopDensityChange: (density: DesktopDensity) => void;
  responsiveTier: ResponsiveTier;
  themeMode: CoreThemeMode;
  groupedCategories: Record<string, UiCatalogItem[]>;
  onOpenDemoModal: (componentId: string) => void;
}

function CatalogStatusBadge({ status, statusText }: { status: CatalogStatus; statusText: string }) {
  if (status === 'FOUNDATION') {
    return (
      <span className="inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold leading-none text-emerald-700 shadow-xs dark:text-emerald-400">
        <AppIcon icon={CheckCircle2} size={13} className="shrink-0 text-emerald-500" />
        <span className="leading-none">{statusText}</span>
      </span>
    );
  }
  if (status === 'MIGRATING') {
    return (
      <span className="inline-flex items-center justify-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold leading-none text-amber-700 shadow-xs dark:text-amber-400">
        <AppIcon icon={AlertCircle} size={13} className="shrink-0 text-amber-500" />
        <span className="leading-none">{statusText}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center gap-1.5 rounded-full border border-rose-500/50 bg-rose-500/15 px-2.5 py-1 text-xs font-semibold leading-none text-rose-700 shadow-xs dark:text-rose-400">
      <AppIcon icon={XCircle} size={13} className="shrink-0 text-rose-500" />
      <span className="leading-none">{statusText}</span>
    </span>
  );
}

export function DesignSystemInventoryTab({
  totalCount,
  foundationCount,
  migratingCount,
  auditFilter,
  onAuditFilterChange,
  desktopDensity,
  effectiveDensity,
  onDesktopDensityChange,
  responsiveTier,
  themeMode,
  groupedCategories,
  onOpenDemoModal,
}: DesignSystemInventoryTabProps) {
  return (
    <div className="space-y-6 pt-2">
      <SectionCard
        title="Lọc Theo Trạng Thái Kiểm Duyệt UI (Audit Status Filter)"
        extra={
          <Segmented
            value={auditFilter}
            onChange={(val) => onAuditFilterChange(val as string)}
            options={[
              {
                label: (
                  <Space size={4}>
                    <AppIcon icon={LayoutGrid} size={14} />
                    <span className="tabular-nums">Tất cả ({totalCount})</span>
                  </Space>
                ),
                value: 'ALL',
              },
              {
                label: (
                  <Space size={4}>
                    <AppIcon icon={CheckCircle2} size={14} className="text-emerald-500" />
                    <span className="tabular-nums">Foundation ({foundationCount})</span>
                  </Space>
                ),
                value: 'FOUNDATION',
              },
              {
                label: (
                  <Space size={4}>
                    <AppIcon icon={AlertTriangle} size={14} className="text-amber-500" />
                    <span className="tabular-nums">Đang migration ({migratingCount})</span>
                  </Space>
                ),
                value: 'MIGRATING',
              },
            ]}
          />
        }
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Text strong>Mật độ desktop (lưu lựa chọn của bạn): </Text>
            <Select<DesktopDensity>
              value={desktopDensity}
              onChange={onDesktopDensityChange}
              disabled={responsiveTier === 'mobile'}
              className="mt-1 w-full"
              options={DESKTOP_DENSITY_SELECT_OPTIONS}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Text strong>Profile đang áp dụng: </Text>
            <div className="mt-1 flex items-center gap-2">
              <StatusTag
                status={effectiveDensity === 'mobileCompact' ? 'processing' : 'gold'}
                label={
                  effectiveDensity === 'mobileCompact' ? 'MOBILE COMPACT — 44 / 20' : effectiveDensity.toUpperCase()
                }
              />
              <Text type="secondary" className="text-xs">
                {responsiveTier === 'mobile'
                  ? 'Mobile luôn giữ vùng chạm 44px.'
                  : 'Lựa chọn không đổi theo độ phân giải.'}
              </Text>
            </div>
          </Col>
          <Col xs={24} sm={24} md={8}>
            <Text strong>Trạng thái Theme: </Text>
            <div className="mt-1 flex items-center gap-2">
              <StatusTag
                status={themeMode === 'dark' ? 'gold' : 'processing'}
                label={`${themeMode.toUpperCase()} MODE`}
              />
              <Text type="secondary" className="text-xs">
                (Đồng bộ toàn bộ ứng dụng)
              </Text>
            </div>
          </Col>
        </Row>
      </SectionCard>

      <DensityContainer density={effectiveDensity} className="space-y-6">
        {Object.keys(groupedCategories).map((catName) => {
          const categoryItems = groupedCategories[catName];
          const categoryBadge = getCategoryBadgeInfo(catName);

          return (
            <SectionCard
              key={catName}
              title={
                <Space align="center">
                  <span className="text-lg font-bold text-amber-500">{catName}</span>
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-xs font-semibold leading-none text-white tabular-nums">
                    {categoryItems.length}
                  </span>
                </Space>
              }
            >
              <Row gutter={[16, 16]}>
                {categoryItems.map((item) => (
                  <Col xs={24} sm={12} lg={8} key={item.id}>
                    <div
                      className={`flex h-full flex-col justify-between rounded-xl border bg-slate-50 p-3 shadow-xs transition-all hover:border-amber-500 dark:bg-gray-900 ${
                        item.status === 'MIGRATING' ? 'border-amber-500' : 'border-[var(--mos-border-color)]'
                      }`}
                    >
                      <div>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <Text strong className="text-base text-amber-500">
                            &lt;{item.name} /&gt;
                          </Text>
                          <CatalogStatusBadge status={item.status} statusText={item.statusText} />
                        </div>

                        <div className="mb-2 flex items-center gap-1 text-xs text-slate-400">
                          <AppIcon icon={Code2} size={13} className="shrink-0" />
                          <span className="truncate">{item.filePath}</span>
                        </div>

                        <Paragraph
                          className="mb-3 text-xs text-secondary"
                          ellipsis={{ rows: 2, expandable: true, symbol: 'Xem thêm' }}
                        >
                          {item.auditNotes}
                        </Paragraph>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-700/20 pt-2">
                        <StatusTag
                          status={categoryBadge.status}
                          label={categoryBadge.label}
                          bordered={false}
                          className="rounded-md px-2.5 py-1 text-xs"
                        />
                        {item.demoType && (
                          <Button
                            size="small"
                            type="dashed"
                            icon={<AppIcon icon={Eye} size={13} />}
                            onClick={() => onOpenDemoModal(item.id)}
                          >
                            Thử Demo
                          </Button>
                        )}
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            </SectionCard>
          );
        })}
      </DensityContainer>
    </div>
  );
}
