# mOS UI Assembly Kit

Use this layer for all new operational UI. It is intentionally built on the
existing Ant Design + mOS token primitives; it is not a second component
library.

## Default choice

| Need                       | Use                                                   |
| -------------------------- | ----------------------------------------------------- |
| CRUD or searchable list    | `ResourceListPage`                                    |
| Report, leaderboard, KPI   | `ReportPage`                                          |
| Custom dashboard/workspace | `FeaturePage` + `MetricGrid` + `DataSection`          |
| Create/edit flow           | `EntityFormDrawer` + `EntityForm` + `EntityFormField` |

Import only from `~/components/ui`.

## CRUD/list page

```tsx
import { Button, Input, Select } from 'antd';
import { ResourceListPage } from '~/components/ui';

<ResourceListPage<CustomerRow>
  title="Khách hàng"
  subtitle="Tra cứu và phân bổ khách"
  headerActions={<Button type="primary">Tạo khách</Button>}
  toolbar={{
    primary: <Input.Search placeholder="Tên, SĐT khách hàng" />,
    filters: <Select aria-label="Chi nhánh" options={branchOptions} />,
    actions: <Button>Xuất file</Button>,
    activeFilterCount: branchId === 'ALL' ? 0 : 1,
  }}
  metrics={{
    items: [
      { key: 'total', title: 'Tổng khách', value: total },
      { key: 'new', title: 'Khách mới', value: newCustomers },
    ],
  }}
  table={{
    rowKey: 'id',
    columns,
    dataSource: response.data,
    loading,
    pagination: {
      current: query.page,
      pageSize: query.pageSize,
      total: response.total,
      onChange: (page, pageSize) => patchQuery({ page, pageSize }),
    },
    columnPriority: { customer: 'primary', branch: 'secondary', action: 'tertiary' },
    mobileRenderer: (record) => <CustomerMobileCard customer={record} />,
  }}
/>;
```

`pagination` stays controlled by the feature and must reset to page 1 after a
query/filter change. Persist page, size, and active tab in a feature hook, not
inside a component.

## Report page

```tsx
import { ReportPage, DataSection, DataTable } from '~/components/ui';

<ReportPage
  title="CC Leaderboard"
  subtitle="Theo dõi hiệu suất, thưởng và thu nhập của CC"
  period={period.navigatorProps}
  filters={<BranchAndStaffFilters value={filters} onChange={setFilters} />}
  activeFilterCount={activeFilterCount}
  metrics={{ items: reportMetrics }}
>
  <DataSection title="Bảng xếp hạng" state={loading ? 'loading' : undefined}>
    <DataTable {...leaderboardTableProps} />
  </DataSection>
</ReportPage>;
```

`ReportPage` always uses `ReportPeriodNavigator`. Week state must come from an
ISO (Monday-first) period hook. `FeatureToolbar` moves the supplied filters to
one accessible drawer on phones automatically.

## Create/edit form

```tsx
import { Button, Input, Select } from 'antd';
import { EntityForm, EntityFormDrawer, EntityFormField } from '~/components/ui';

<EntityFormDrawer
  open={open}
  onClose={close}
  title={editing ? 'Sửa khách hàng' : 'Tạo khách hàng'}
  footer={
    <>
      <Button onClick={close}>Hủy</Button>
      <Button type="primary" htmlType="submit" form="customer-form">
        Lưu
      </Button>
    </>
  }
>
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
</EntityFormDrawer>;
```

## Guardrails

- Never add a page-local card, table, toolbar, modal, or breakpoint system.
- Supply data, callbacks, Ant Design controls, and slot content; use `className`
  only for local layout, not colors or visual overrides.
- Use `DataSection` for every loading, empty, or error state.
- Use shared DTOs and `apiClient`; no raw API strings or duplicated business
  calculation in the UI.
- Select/search controls must use `vietnameseSearchFilter` from `@mos-lab/shared`.
