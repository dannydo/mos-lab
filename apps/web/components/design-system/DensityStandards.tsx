'use client';

import React, { useState } from 'react';
import { Badge, Button, Card, Segmented, Select, Space, Tag, Typography } from 'antd';
import { Monitor, Smartphone } from 'lucide-react';
import dayjs, { type Dayjs } from 'dayjs';
import type { DesktopDensity } from '@mos-lab/shared';
import { useTheme } from '../../context/ThemeContext';
import { useResponsiveTier } from '../../hooks/useResponsiveTier';
import { AppIcon } from '../ui/AppIcon';
import { FeatureToolbar } from '../ui/FeatureToolbar';
import { ReportPeriodNavigator, type ReportPeriodMode } from '../ui/ReportPeriodNavigator';
import { SectionCard } from '../ui/SectionCard';

const { Paragraph, Text } = Typography;

const DESKTOP_PROFILES: ReadonlyArray<{
  value: DesktopDensity;
  label: string;
  control: string;
  icon: string;
  rhythm: string;
  guidance: string;
}> = [
  {
    value: 'compact',
    label: 'Compact',
    control: '32 × 32',
    icon: '16 px',
    rhythm: '8 / 12 px · chữ 12 px',
    guidance: 'Nhiều dữ liệu, thao tác chuột chính xác, màn hình 4K.',
  },
  {
    value: 'standard',
    label: 'Standard',
    control: '36 × 36',
    icon: '18 px',
    rhythm: '12 / 16 px · chữ 14 px',
    guidance: 'Mặc định cân bằng cho phần lớn màn hình desktop.',
  },
  {
    value: 'comfortable',
    label: 'Comfortable',
    control: '44 × 44',
    icon: '20 px',
    rhythm: '16 / 24 px · chữ 15 px',
    guidance: 'Đọc xa hơn hoặc ưu tiên khả năng tiếp cận trên desktop.',
  },
];

function getPeriodLabel(mode: ReportPeriodMode, value: Dayjs) {
  if (mode === 'month') return `Tháng ${value.format('MM/YYYY')}`;
  if (mode === 'week') return `Tuần của ${value.format('DD/MM/YYYY')}`;
  return value.format('DD/MM/YYYY');
}

/**
 * A live density contract for agents and operators. It deliberately uses the
 * real report toolbar rather than a scaled phone mock, so the actual viewport
 * owns its responsive composition.
 */
export function DensityStandards() {
  const { desktopDensity, setDesktopDensity } = useTheme();
  const responsiveTier = useResponsiveTier();
  const isMobile = responsiveTier === 'mobile';
  const [periodMode, setPeriodMode] = useState<ReportPeriodMode>('month');
  const [periodValue, setPeriodValue] = useState<Dayjs>(() => dayjs('2026-08-01'));
  const periodLabel = getPeriodLabel(periodMode, periodValue);

  const movePeriod = (direction: -1 | 1) => {
    const unit = periodMode === 'day' ? 'day' : periodMode === 'week' ? 'week' : 'month';
    setPeriodValue((current) => current.add(direction, unit));
  };

  return (
    <SectionCard
      title="Chuẩn mật độ hiển thị"
      extra={
        <Tag
          color={isMobile ? 'blue' : 'gold'}
          icon={<AppIcon icon={isMobile ? Smartphone : Monitor} size="disclosure" />}
        >
          {isMobile
            ? 'Mobile Compact'
            : `Desktop ${DESKTOP_PROFILES.find((item) => item.value === desktopDensity)?.label}`}
        </Tag>
      }
    >
      <div className="space-y-4">
        <Paragraph className="mb-0">
          Mật độ là lựa chọn cá nhân, không phụ thuộc kích thước màn hình. Desktop lưu lựa chọn của bạn; mobile luôn
          dùng nhịp nội dung compact nhưng giữ vùng chạm tối thiểu <Text strong>44 × 44</Text> và icon{' '}
          <Text strong>20 px</Text>.
        </Paragraph>

        {isMobile ? (
          <Card size="small" variant="outlined">
            <Space direction="vertical" size={6} className="w-full">
              <Space wrap>
                <Tag color="blue">Mobile Compact</Tag>
                <Text strong>44 × 44</Text>
                <Text type="secondary">vùng chạm</Text>
                <Text strong>20 px</Text>
                <Text type="secondary">icon</Text>
              </Space>
              <Text type="secondary">
                Nội dung ưu tiên gọn: padding 12 px, gap 8 px, body 14 px và supporting text 12 px. Lựa chọn desktop của
                bạn vẫn được giữ nguyên khi quay lại màn hình lớn.
              </Text>
            </Space>
          </Card>
        ) : (
          <>
            <div>
              <Text strong>Áp dụng trên desktop</Text>
              <div className="mt-2">
                <Segmented<DesktopDensity>
                  aria-label="Chọn mật độ hiển thị desktop"
                  value={desktopDensity}
                  onChange={(value) => setDesktopDensity(value)}
                  options={DESKTOP_PROFILES.map((profile) => ({ value: profile.value, label: profile.label }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              {DESKTOP_PROFILES.map((profile) => {
                const isActive = desktopDensity === profile.value;

                return (
                  <Card key={profile.value} size="small" variant="outlined">
                    <Space direction="vertical" size={8} className="w-full">
                      <Space wrap className="w-full" align="center">
                        <Text strong>{profile.label}</Text>
                        {isActive && <Tag color="gold">Đang dùng</Tag>}
                      </Space>
                      <Space wrap size={[12, 4]}>
                        <span>
                          <Text strong>{profile.control}</Text> <Text type="secondary">control</Text>
                        </span>
                        <span>
                          <Text strong>{profile.icon}</Text> <Text type="secondary">icon</Text>
                        </span>
                      </Space>
                      <Text type="secondary">{profile.rhythm}</Text>
                      <Text type="secondary">{profile.guidance}</Text>
                      <Button
                        type={isActive ? 'primary' : 'default'}
                        size="small"
                        onClick={() => setDesktopDensity(profile.value)}
                      >
                        {isActive ? 'Đang áp dụng' : `Dùng ${profile.label}`}
                      </Button>
                    </Space>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        <Card size="small" variant="outlined" title="Xem bằng component thật">
          <FeatureToolbar
            primary={
              <ReportPeriodNavigator
                mode={periodMode}
                value={periodValue}
                label={periodLabel}
                onModeChange={setPeriodMode}
                onPrevious={() => movePeriod(-1)}
                onNext={() => movePeriod(1)}
                onValueChange={setPeriodValue}
              />
            }
            filters={
              <Select
                aria-label="Demo bộ lọc mật độ"
                defaultValue="all"
                options={[
                  { value: 'all', label: 'Tất cả tiệm' },
                  { value: 'p1', label: 'Phan Xích Long' },
                ]}
              />
            }
            filterTriggerLabel="Bộ lọc"
            activeFilterCount={1}
          />
          <div className="mt-3">
            <Badge
              status="processing"
              text={
                isMobile
                  ? 'Mobile chuyển bộ lọc vào drawer; không có control cảm ứng nào dưới 44 px.'
                  : `Toolbar đang dùng profile ${DESKTOP_PROFILES.find((item) => item.value === desktopDensity)?.label}.`
              }
            />
          </div>
        </Card>
      </div>
    </SectionCard>
  );
}

export default React.memo(DensityStandards);
