'use client';

import React, { useState } from 'react';
import { Button, Input, Select, Space, Tag, Typography, message } from 'antd';
import { CopyOutlined, FileTextOutlined, FormOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { DataSection } from '../ui/DataSection';
import { DataTable } from '../ui/DataTable';
import { EntityForm, EntityFormField } from '../ui/EntityForm';
import { EntityFormDrawer } from '../ui/EntityFormDrawer';
import { FeatureToolbar } from '../ui/FeatureToolbar';
import { MetricGrid } from '../ui/MetricGrid';
import { ReportPeriodNavigator } from '../ui/ReportPeriodNavigator';
import type { ReportPeriodMode } from '../ui/ReportPeriodNavigator';
import { SectionCard } from '../ui/SectionCard';
import { DensityStandards } from './DensityStandards';

const { Paragraph, Text } = Typography;

const listRecipe = `import { ResourceListPage } from '~/components/ui';

<ResourceListPage<CustomerRow>
  title="Khách hàng"
  subtitle="Tra cứu và phân bổ"
  headerActions={<Button type="primary">Tạo khách</Button>}
  toolbar={{
    primary: <Input.Search placeholder="Tên, SĐT khách hàng" />,
    filters: <Select options={branchOptions} />,
    actions: <Button>Xuất file</Button>,
    activeFilterCount,
  }}
  metrics={{ items: customerMetrics }}
  table={{
    rowKey: 'id', columns, dataSource: response.data, loading,
    pagination: { current: page, pageSize, total, onChange },
    columnPriority, mobileRenderer: CustomerMobileCard,
  }}
/>`;

const reportRecipe = `import { ReportPage, DataSection, DataTable } from '~/components/ui';

<ReportPage
  title="CC Leaderboard"
  subtitle="Theo dõi hiệu suất, thưởng và thu nhập"
  period={period.navigatorProps}
  filters={<BranchAndStaffFilters value={filters} onChange={setFilters} />}
  activeFilterCount={activeFilterCount}
  metrics={{ items: reportMetrics }}
>
  <DataSection title="Bảng xếp hạng" state={loading ? 'loading' : undefined}>
    <DataTable {...leaderboardTableProps} />
  </DataSection>
</ReportPage>`;

const formRecipe = `import { EntityForm, EntityFormDrawer, EntityFormField } from '~/components/ui';

<EntityFormDrawer open={open} onClose={close} title="Tạo khách" footer={footer}>
  <EntityForm id="customer-form" form={form} onFinish={save} columns={2}>
    <EntityFormField name="name" label="Tên khách" rules={[{ required: true }]}>
      <Input />
    </EntityFormField>
    <EntityFormField name="branchId" label="Chi nhánh">
      <Select options={branchOptions} showSearch filterOption={vietnameseSearchFilter} />
    </EntityFormField>
    <EntityFormField name="note" label="Ghi chú" fullWidth>
      <Input.TextArea rows={3} />
    </EntityFormField>
  </EntityForm>
</EntityFormDrawer>`;

interface KitCardProps {
  title: string;
  when: string;
  components: readonly string[];
  recipe: string;
  children: React.ReactNode;
}

function KitCard({ title, when, components, recipe, children }: KitCardProps) {
  const [messageApi, contextHolder] = message.useMessage();

  const copyRecipe = async () => {
    if (!navigator.clipboard) {
      messageApi.warning('Trình duyệt chưa cho phép sao chép tự động. Bạn có thể sao chép trực tiếp đoạn mã bên dưới.');
      return;
    }

    await navigator.clipboard.writeText(recipe);
    messageApi.success('Đã sao chép recipe');
  };

  return (
    <SectionCard
      title={title}
      extra={
        <Button size="small" icon={<CopyOutlined />} onClick={() => void copyRecipe()}>
          Sao chép recipe
        </Button>
      }
    >
      {contextHolder}
      <div className="ready-kits-card">
        <div>
          <Text strong>Dùng khi nào</Text>
          <Paragraph className="mb-2">{when}</Paragraph>
          <Space wrap size={[4, 4]}>
            {components.map((component) => (
              <Tag key={component}>{component}</Tag>
            ))}
          </Space>
        </div>

        <div className="ready-kits-preview">{children}</div>

        <pre className="ready-kits-code" aria-label={`Recipe ${title}`}>
          <code>{recipe}</code>
        </pre>
      </div>
    </SectionCard>
  );
}

export function ReadyKitsTab() {
  const [formOpen, setFormOpen] = useState(false);
  const [periodMode, setPeriodMode] = useState<ReportPeriodMode>('month');
  const [periodValue, setPeriodValue] = useState<Dayjs>(() => dayjs('2026-08-01'));

  const movePeriod = (direction: -1 | 1) => {
    const unit = periodMode === 'day' ? 'day' : periodMode === 'week' ? 'week' : 'month';
    setPeriodValue((current) => current.add(direction, unit));
  };
  const periodLabel =
    periodMode === 'month'
      ? `Tháng ${periodValue.format('MM/YYYY')}`
      : periodMode === 'week'
        ? `Tuần của ${periodValue.format('DD/MM/YYYY')}`
        : periodValue.format('DD/MM/YYYY');

  return (
    <div className="space-y-6 pt-2">
      <SectionCard title="Ready Kits — chỉ truyền dữ liệu và callbacks">
        <div className="ready-kits-intro">
          <FileTextOutlined aria-hidden />
          <div>
            <Text strong>Không tạo UI library thứ hai.</Text>
            <Paragraph className="mb-0">
              Mỗi kit đã lắp từ Ant Design + mOS primitives, responsive và theme-safe. Agent chọn kit, truyền data,
              callback và slot nội dung; không dựng lại card, toolbar, table hoặc overlay theo từng page.
            </Paragraph>
          </div>
        </div>
      </SectionCard>

      <DensityStandards />

      <KitCard
        title="1. CRUD / danh sách vận hành"
        when="Mặc định cho khách hàng, lịch hẹn, catalog, phân bổ và mọi màn danh sách có tìm kiếm, lọc, KPI và bảng."
        components={['ResourceListPage', 'FeatureToolbar', 'MetricGrid', 'DataSection', 'DataTable']}
        recipe={listRecipe}
      >
        <FeatureToolbar
          primary={<Input.Search aria-label="Demo tìm khách hàng" placeholder="Tìm khách hàng" />}
          filters={
            <Select
              aria-label="Demo chọn chi nhánh"
              className="min-w-36"
              defaultValue="all"
              options={[
                { value: 'all', label: 'Tất cả tiệm' },
                { value: 'p1', label: 'Phan Xích Long' },
              ]}
            />
          }
          actions={<Button>Tải lại</Button>}
        />
        <MetricGrid
          columns={3}
          items={[
            { key: 'customers', title: 'Tổng khách', value: 1_248 },
            { key: 'new', title: 'Khách mới', value: 42 },
            { key: 'booked', title: 'Đã đặt lịch', value: 86 },
          ]}
        />
        <DataSection title="Danh sách khách" bodyPadding={0}>
          <DataTable
            rowKey="id"
            pagination={false}
            dataSource={[{ id: 'c1', customer: 'Nguyễn An', status: 'Đã đặt lịch' }]}
            columns={[
              { title: 'Khách hàng', dataIndex: 'customer', key: 'customer' },
              { title: 'Trạng thái', dataIndex: 'status', key: 'status' },
            ]}
          />
        </DataSection>
      </KitCard>

      <KitCard
        title="2. Báo cáo / leaderboard"
        when="Dùng cho CC, CV, Booker và KPI: kỳ báo cáo là control chính; lọc chuyển thành một drawer trên mobile."
        components={['ReportPage', 'ReportPeriodNavigator', 'FeatureToolbar', 'MetricGrid', 'DataSection']}
        recipe={reportRecipe}
      >
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
              aria-label="Demo lọc tư vấn viên"
              className="min-w-36"
              defaultValue="all"
              options={[
                { value: 'all', label: 'Tất cả CC' },
                { value: 'cc1', label: 'Diễm Hương' },
              ]}
            />
          }
          activeFilterCount={0}
        />
        <DataSection title="Bảng xếp hạng" state="empty" stateTitle="Ví dụ StatePanel khi chưa có dữ liệu" />
      </KitCard>

      <KitCard
        title="3. Create / edit form"
        when="Mặc định cho form CRUD. Phone mở full-screen, field tự chia grid, footer hành động luôn còn nhìn thấy."
        components={['EntityFormDrawer', 'EntityForm', 'EntityFormField', 'AdaptiveOverlayFooter']}
        recipe={formRecipe}
      >
        <Button type="primary" icon={<FormOutlined />} onClick={() => setFormOpen(true)}>
          Mở form chuẩn
        </Button>
        <EntityFormDrawer
          open={formOpen}
          onClose={() => setFormOpen(false)}
          title="Tạo khách hàng"
          footer={
            <>
              <Button onClick={() => setFormOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" form="ready-kit-form">
                Lưu demo
              </Button>
            </>
          }
        >
          <EntityForm id="ready-kit-form" columns={2} onFinish={() => setFormOpen(false)}>
            <EntityFormField name="name" label="Tên khách" rules={[{ required: true }]}>
              <Input />
            </EntityFormField>
            <EntityFormField name="branch" label="Chi nhánh">
              <Select
                options={[
                  { value: 'p1', label: 'Phan Xích Long' },
                  { value: 'q1', label: 'Quận 1' },
                ]}
              />
            </EntityFormField>
            <EntityFormField name="note" label="Ghi chú" fullWidth>
              <Input.TextArea rows={3} />
            </EntityFormField>
          </EntityForm>
        </EntityFormDrawer>
      </KitCard>

      <SectionCard title="Luật dùng chung cho agent">
        <ul className="ready-kits-rules">
          <li>Chọn `ResourceListPage` cho list/CRUD và `ReportPage` cho reporting trước khi tự compose primitive.</li>
          <li>
            Chỉ truyền data, callbacks, columns và slots; không tạo CSS card/table/toolbar/overlay riêng cho page.
          </li>
          <li>
            Không hard-code size control hoặc icon: dùng mOS primitives để tự nhận Compact, Standard, Comfortable hoặc
            Mobile Compact.
          </li>
          <li>Dùng `DataSection` cho loading, empty và error; pagination luôn là controlled state của feature.</li>
          <li>Select có tìm kiếm phải dùng `vietnameseSearchFilter`; dữ liệu đi qua shared type và `apiClient`.</li>
        </ul>
      </SectionCard>
    </div>
  );
}

export default ReadyKitsTab;
