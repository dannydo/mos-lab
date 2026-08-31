import React from 'react';
import dayjs from 'dayjs';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Button, Input } from 'antd';
import { Menu, RefreshCw, Search } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { HeaderLeftToolbar } from '../../layout/HeaderLeftToolbar';
import { UI_CATALOG_ITEMS } from '../../design-system/catalog.manifest';
import { resolveCanonicalColumnTitle } from '../../../hooks/useTableConfig';
import { getIconComponent } from '../../campaign/TouchpointIconPicker';
import { getSelectedMenuKey, getSidebarGroups } from '../../../config/sidebar.config';
import { BK_DONE_LEADERBOARD_LABELS } from '../../../app/dashboard/bk/components/BkDoneTab';
import {
  ContentSurface,
  CollapsibleSearchField,
  AppIcon,
  DataSection,
  DataTable,
  EntityForm,
  EntityFormField,
  EntityFormDrawer,
  FeaturePage,
  FeatureToolbar,
  HeaderActionIndicator,
  HeaderIconButton,
  IconButton,
  MetricGrid,
  PageToolbar,
  ResourceListPage,
  ReportPage,
  ReportPeriodNavigator,
  ResponsiveFormField,
  ResponsiveFormGrid,
  SearchField,
  STANDARD_PAGE_SIZE_OPTIONS,
  StandardPagination,
  StatePanel,
  TableSettingsTrigger,
  ToolbarToggle,
} from '../index';

function setViewport(width: number, height = 900) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  window.dispatchEvent(new Event('resize'));
}

describe('UI primitives', () => {
  it('keeps the typed catalog manifest free of duplicate or unverifiable public entries', () => {
    const ids = UI_CATALOG_ITEMS.map((item) => item.id);
    const exports = UI_CATALOG_ITEMS.map((item) => item.exportName);

    expect(new Set(ids).size).toBe(ids.length);
    expect(UI_CATALOG_ITEMS.every((item) => item.filePath.endsWith('.tsx') && item.statusText.length > 0)).toBe(true);
    expect(exports).toContain('AppIcon');
    expect(exports).toContain('SearchField');
    expect(exports).toContain('CollapsibleSearchField');
  });

  it('lets a product-owned canonical header replace stale saved column copy', () => {
    const canonicalTitles = { expiryDate: 'HSD', stt: null } as const;

    expect(resolveCanonicalColumnTitle('expiryDate', 'HSD', 'Hạn Sử Dụng (HSD)', canonicalTitles)).toBe('HSD');
    expect(resolveCanonicalColumnTitle('stt', 'Số thứ tự', 'STT', canonicalTitles)).toBe('Số thứ tự');
    expect(resolveCanonicalColumnTitle('name', 'Khách hàng', 'Tên khách', canonicalTitles)).toBe('Tên khách');
  });

  it('keeps BK Done leaderboard headers concise and business-specific', () => {
    expect(BK_DONE_LEADERBOARD_LABELS).toEqual({
      booker: 'Booker',
      done: 'Done',
      missed: 'Missed',
      doneBonus: 'Thưởng Done',
      rankBonus: 'Thưởng Hạng',
      missedBonus: 'Thưởng/Phạt Missed',
      totalDoneBonus: '∑ Thưởng Done',
    });
  });

  it('renders the standard campaign touchpoint icons without a deferred icon loader', () => {
    const { container, rerender } = render(<>{getIconComponent('Handshake')}</>);
    expect(container.querySelector('svg')).toBeInTheDocument();

    rerender(<>{getIconComponent('SmileOutlined')}</>);
    expect(container.querySelector('svg')).toBeInTheDocument();

    rerender(<>{getIconComponent('Kiss')}</>);
    expect(container).toHaveTextContent('😚');

    rerender(<>{getIconComponent('🤝')}</>);
    expect(container).toHaveTextContent('🤝');
  });

  it('renders a density-aware Lucide app icon with the right accessibility contract', () => {
    render(<AppIcon icon={Search} size="action" />);

    const icon = document.querySelector('.mos-app-icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon).toHaveAttribute('stroke-width', '2');
  });

  it('gives every static customer and NYC submenu entry a semantic AppIcon', () => {
    const crmGroup = getSidebarGroups('admin').find((group) => group.groupKey === 'grp-crm');
    const customers = crmGroup?.items.find((item) => item.key === 'customers-parent')?.children ?? [];
    const nyc = crmGroup?.items.find((item) => item.key === 'nyc-parent')?.children ?? [];
    const requiredItems = [
      ...customers.filter((item) => ['customers-all', 'my-customers', 'referrals'].includes(item.key)),
      ...nyc.filter((item) => ['nyc-main', 'nyc-campaigns-mgmt'].includes(item.key)),
    ];

    expect(requiredItems).toHaveLength(5);

    const { container } = render(
      <>
        {requiredItems.map((item) => (
          <React.Fragment key={item.key}>{item.icon}</React.Fragment>
        ))}
      </>
    );
    expect(container.querySelectorAll('.mos-app-icon')).toHaveLength(5);
  });

  it('keeps sensitive menu access configuration exclusive to Super Admin', () => {
    const systemGroup = getSidebarGroups('admin').find((group) => group.groupKey === 'grp-system');
    const staffMenu = systemGroup?.items.find((item) => item.key === 'staff');
    const superAdminGroup = getSidebarGroups('super_admin').find((group) => group.groupKey === 'grp-system');
    const superAdminStaffMenu = superAdminGroup?.items.find((item) => item.key === 'staff');

    expect(staffMenu?.path).toBeUndefined();
    expect(staffMenu?.children?.map((item) => item.key)).toEqual(['staff-directory', 'teams']);
    expect(staffMenu?.children?.find((item) => item.key === 'teams')?.path).toBe('/dashboard/staff/teams');
    expect(staffMenu?.children?.find((item) => item.key === 'menu-access')).toBeUndefined();
    expect(superAdminStaffMenu?.children?.map((item) => item.key)).toEqual(['staff-directory', 'teams', 'menu-access']);
    expect(superAdminStaffMenu?.children?.find((item) => item.key === 'menu-access')?.path).toBe(
      '/dashboard/staff/menu-access'
    );
  });

  it('filters restricted leaves while preserving the visible menu hierarchy and role guards', () => {
    const groups = getSidebarGroups('telesales', [], true, {}, [], true, {
      'academy-lead-manager': false,
      'customers-all': true,
    });
    const academyGroup = groups.find((group) => group.groupKey === 'grp-academy');
    const crmGroup = groups.find((group) => group.groupKey === 'grp-crm');
    const academyChildren = academyGroup?.items.find((item) => item.key === 'academy')?.children ?? [];
    const customerChildren = crmGroup?.items.find((item) => item.key === 'customers-parent')?.children ?? [];

    expect(academyChildren.some((item) => item.key === 'academy-lead-manager')).toBe(false);
    expect(academyChildren.some((item) => item.key === 'academy-customers')).toBe(true);
    // A visibility policy never grants the baseline Admin-only menu.
    expect(customerChildren.some((item) => item.key === 'customers-all')).toBe(false);
  });

  it('gives telesales their customer workspace and LoCa campaign entry', () => {
    const crmGroup = getSidebarGroups('telesales').find((group) => group.groupKey === 'grp-crm');
    const customerChildren = crmGroup?.items.find((item) => item.key === 'customers-parent')?.children ?? [];

    expect(customerChildren.some((item) => item.key === 'my-customers')).toBe(true);
    expect(crmGroup?.items.some((item) => item.key === 'loca' && item.path === '/dashboard/loca')).toBe(true);
  });

  it('hides dynamic children together when their menu category is restricted', () => {
    const groups = getSidebarGroups(
      'telesales',
      [{ slug: 'summer', name: 'Summer Campaign', status: 'ACTIVE' }],
      true,
      {},
      [{ slug: 'academy-summer', name: 'Academy Summer' }],
      true,
      {},
      { crm: false, academy: false }
    );
    const crmGroup = groups.find((group) => group.groupKey === 'grp-crm');
    const academyGroup = groups.find((group) => group.groupKey === 'grp-academy');

    expect(crmGroup?.items.some((item) => item.key === 'nyc-parent')).toBe(false);
    expect(academyGroup).toBeUndefined();
  });

  it('keeps Academy as a role-gated dedicated sidebar section', () => {
    const groups = getSidebarGroups('telesales', [], true, {}, [], true);
    const academyGroup = groups.find((group) => group.groupKey === 'grp-academy');
    const crmGroup = groups.find((group) => group.groupKey === 'grp-crm');
    const academy = academyGroup?.items.find((item) => item.key === 'academy');

    expect(academyGroup?.groupTitle).toBe('ACADEMY');
    expect(crmGroup?.items.some((item) => item.key === 'post-hub')).toBe(false);
    expect(academyGroup?.items.map((item) => item.key)).toEqual(['academy', 'post-hub']);
    expect(academyGroup?.items.find((item) => item.key === 'post-hub')).toMatchObject({
      label: 'Chiến Thần',
      path: '/dashboard/post-hub',
    });
    expect(academy?.label).toBe('Academy');
    expect(academy?.path).toBeUndefined();
    expect(academy?.children).toHaveLength(6);
    expect(academy?.children?.[0]).toMatchObject({
      key: 'academy-customers',
      label: 'Học viên',
      path: '/dashboard/academy-leads',
    });
    expect(academy?.children?.[1]).toMatchObject({
      key: 'academy-lead-manager',
      label: 'Lead Manager',
      path: '/dashboard/academy-leads/lead-manager',
    });
    expect(academy?.children?.[2]).toMatchObject({
      key: 'academy-campaigns',
      label: 'Chiến dịch',
      path: '/dashboard/academy-leads/campaigns',
    });
    expect(academy?.children?.[3]).toMatchObject({
      key: 'academy-workshops',
      label: 'Workshop OS',
      path: '/dashboard/academy-leads/workshops',
    });
    expect(academy?.children?.[4]).toMatchObject({
      key: 'academy-courses',
      label: 'Khóa học',
      path: '/dashboard/academy-leads/courses',
    });
    expect(academy?.children?.[5]).toMatchObject({
      key: 'academy-payment-management',
      label: 'Thu học phí',
      path: '/dashboard/academy-leads/payments',
    });
    expect(getSelectedMenuKey('/dashboard/academy-leads')).toBe('academy-customers');
    expect(getSelectedMenuKey('/dashboard/academy-leads/lead-manager')).toBe('academy-lead-manager');
    expect(getSelectedMenuKey('/dashboard/academy-leads/campaigns')).toBe('academy-campaigns');
    expect(getSelectedMenuKey('/dashboard/academy-leads/workshops')).toBe('academy-workshops');
    expect(getSelectedMenuKey('/dashboard/post-hub')).toBe('post-hub');
    expect(getSelectedMenuKey('/dashboard/academy-leads/courses')).toBe('academy-courses');
    expect(
      getSidebarGroups('cc')
        .flatMap((group) => group.items)
        .some((item) => item.key === 'academy')
    ).toBe(false);
  });

  it('uses the Lucide adapter for the standard list search submit action', () => {
    render(<SearchField placeholder="Tìm khách hàng" searchButtonLabel="Tìm khách hàng" />);

    expect(screen.getByPlaceholderText('Tìm khách hàng')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tìm khách hàng' })).toBeInTheDocument();
    expect(document.querySelector('.mos-search-field .mos-app-icon')).toBeInTheDocument();
  });

  it('supports instant filtering without introducing a redundant submit action', () => {
    render(<SearchField behavior="filter" placeholder="Lọc tư vấn viên" />);

    expect(screen.getByPlaceholderText('Lọc tư vấn viên')).toBeInTheDocument();
    expect(document.querySelector('.mos-search-field .ant-input-search-button')).not.toBeInTheDocument();
  });

  it('keeps a compact search in one icon action until it is needed', async () => {
    const onExpandedChange = vi.fn();
    render(
      <CollapsibleSearchField behavior="filter" placeholder="Tìm khách hàng" onExpandedChange={onExpandedChange} />
    );

    expect(screen.queryByPlaceholderText('Tìm khách hàng')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mở tìm kiếm' }));

    const input = screen.getByPlaceholderText('Tìm khách hàng');
    expect(input).toBeInTheDocument();
    await waitFor(() => expect(input).toHaveFocus());
    expect(onExpandedChange).toHaveBeenCalledWith(true);
  });

  it('returns an empty collapsible search to its compact state after blur', () => {
    const onExpandedChange = vi.fn();
    render(
      <CollapsibleSearchField behavior="filter" placeholder="Tìm khách hàng" onExpandedChange={onExpandedChange} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mở tìm kiếm' }));
    fireEvent.blur(screen.getByPlaceholderText('Tìm khách hàng'), { relatedTarget: document.body });

    expect(screen.queryByPlaceholderText('Tìm khách hàng')).not.toBeInTheDocument();
    expect(onExpandedChange).toHaveBeenLastCalledWith(false);
  });

  it('renders the public pagination control with the shared density class and size selector', () => {
    render(<StandardPagination current={1} pageSize={10} total={70} onChange={vi.fn()} />);

    expect(document.querySelector('.standard-pagination')).toBeInTheDocument();
    expect(document.querySelector('.standard-pagination .ant-pagination-options-size-changer')).toBeInTheDocument();
    expect(STANDARD_PAGE_SIZE_OPTIONS).toEqual(['10', '20', '50', '100']);
  });

  it('keeps an icon-only action named and wrapped for density-based alignment', () => {
    const onClick = vi.fn();

    render(<IconButton label="Làm mới dữ liệu" icon={RefreshCw} onClick={onClick} />);

    const action = screen.getByRole('button', { name: 'Làm mới dữ liệu' });
    expect(action).toHaveClass('mos-icon-button');
    expect(action.querySelector('.ant-btn-icon .mos-icon-button__icon > svg')).toBeInTheDocument();

    fireEvent.click(action);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('uses the shared Lucide settings trigger for table configuration actions', () => {
    render(<TableSettingsTrigger title="Cấu hình CC" data-ui="cc-settings-trigger" />);

    const action = screen.getByRole('button', { name: 'Cấu hình CC' });
    expect(action).toHaveClass('table-toolbar-settings-trigger');
    expect(action.querySelector('.ant-btn-icon > .mos-app-icon')).toBeInTheDocument();
  });

  it('keeps the shared toolbar switch semantic and controlled', () => {
    const onChange = vi.fn();

    render(
      <ToolbarToggle label="Tự động làm mới" checked onChange={onChange} aria-label="Bật hoặc tắt tự động làm mới" />
    );

    const control = screen.getByRole('switch', { name: 'Bật hoặc tắt tự động làm mới' });
    expect(control).toHaveAttribute('aria-checked', 'true');
    expect(control.querySelector('.toolbar-toggle-control-track')).toBeInTheDocument();

    fireEvent.click(control);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('uses one accessible period navigator contract for month, week and day reports', () => {
    const onModeChange = vi.fn();

    render(
      <ReportPeriodNavigator
        mode="month"
        value={dayjs('2026-08-16')}
        label="Tháng 08/2026"
        onModeChange={onModeChange}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
      />
    );

    expect(screen.getByRole('group', { name: 'Điều hướng kỳ báo cáo' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio', { name: /Theo (Tháng|Tuần|Ngày)/ })).toHaveLength(6);

    fireEvent.click(screen.getAllByRole('radio', { name: 'Theo Ngày' })[0]);
    expect(onModeChange).toHaveBeenCalledWith('day');
  });

  it('uses a touch-safe bottom sheet to choose a reporting month on a short mobile landscape viewport', () => {
    setViewport(932, 430);
    const onValueChange = vi.fn();

    render(
      <ReportPeriodNavigator
        mode="month"
        value={dayjs('2026-05-16')}
        label="Tháng 05/2026"
        onModeChange={vi.fn()}
        onNext={vi.fn()}
        onPrevious={vi.fn()}
        onValueChange={onValueChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Chọn khoảng thời gian Tháng 05/2026' }));
    expect(screen.getByText('Chọn tháng')).toBeInTheDocument();
    expect(document.querySelectorAll('.report-period-mobile-month-option')).toHaveLength(12);

    fireEvent.click(screen.getByRole('button', { name: 'Tháng 11 năm 2026' }));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0][0].format('YYYY-MM-DD')).toBe('2026-11-16');
  });

  it('renders one named semantic header action with a Lucide icon', () => {
    const onClick = vi.fn();

    render(<HeaderIconButton action="navigation" label="Mở điều hướng" icon={Menu} onClick={onClick} />);

    const action = screen.getByRole('button', { name: 'Mở điều hướng' });
    expect(action).toHaveAttribute('data-header-action', 'navigation');
    expect(action).toHaveClass('mos-header-action');
    expect(action.querySelector('.mos-header-action__icon > svg')).toBeInTheDocument();

    fireEvent.click(action);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('uses an in-action numeric count for active CV scheduling', () => {
    render(<HeaderLeftToolbar onOpenCvDrawer={vi.fn()} workingCvCount={16} />);

    expect(
      screen.getByRole('button', { name: 'Lịch CV và hàng chờ tua real-time, 16 CV đang làm việc' })
    ).toBeInTheDocument();
    const count = document.querySelector('.mos-header-action-indicator--count .mos-header-action-indicator__count');
    expect(count).toHaveTextContent('16');
    expect(count).toHaveAttribute('aria-hidden', 'true');
    expect(count?.parentElement).not.toHaveAttribute('count');
    expect(document.querySelector('.mos-header-action-indicator__status')).not.toBeInTheDocument();
  });

  it('renders a reusable numeric header counter inside its action', () => {
    render(
      <HeaderActionIndicator variant="count" count={3}>
        <HeaderIconButton action="pending-allocation" label="Ba đợt data chờ xác nhận" icon={Menu} />
      </HeaderActionIndicator>
    );

    expect(
      document.querySelector('.mos-header-action-indicator--count .mos-header-action-indicator__count')
    ).toHaveTextContent('3');
  });

  it('caps a header counter visually while retaining the complete accessible label on its action', () => {
    render(
      <HeaderActionIndicator variant="count" count={101}>
        <HeaderIconButton action="pending-allocation" label="101 đợt data chờ xác nhận" icon={Menu} />
      </HeaderActionIndicator>
    );

    expect(document.querySelector('.mos-header-action-indicator__count')).toHaveTextContent('99+');
    expect(screen.getByRole('button', { name: '101 đợt data chờ xác nhận' })).toBeInTheDocument();
  });

  it('renders a themed content surface', () => {
    render(<ContentSurface>Customer content</ContentSurface>);

    expect(screen.getByText('Customer content')).toBeInTheDocument();
  });

  it('keeps toolbar primary content and actions accessible', () => {
    render(<PageToolbar primary={<input aria-label="Tìm khách hàng" />} actions={<Button>Thêm lịch</Button>} />);

    expect(screen.getByRole('textbox', { name: 'Tìm khách hàng' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm lịch' })).toBeInTheDocument();
  });

  it('renders stable loading, empty, and error states', () => {
    const { rerender } = render(<StatePanel kind="loading" title="Đang tải khách hàng" />);
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();

    rerender(
      <StatePanel
        kind="empty"
        title="Chưa có khách hàng"
        description="Tạo khách hàng đầu tiên để bắt đầu."
        extra={<button type="button">Tạo khách hàng</button>}
      />
    );
    expect(screen.getByText('Chưa có khách hàng')).toBeInTheDocument();
    expect(screen.getByText('Tạo khách hàng đầu tiên để bắt đầu.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tạo khách hàng' })).toBeInTheDocument();

    rerender(<StatePanel kind="error" title="Không tải được khách hàng" />);
    expect(screen.getByText('Không tải được khách hàng')).toBeInTheDocument();
  });

  it('uses a record card renderer on phone-sized viewports without duplicating table state', () => {
    setViewport(390);
    render(
      <DataTable
        dataSource={[{ key: 'customer-1', name: 'Nguyễn An' }]}
        columns={[{ title: 'Khách', dataIndex: 'name', key: 'name', width: 160 }]}
        rowKey="key"
        pagination={false}
        mobileRenderer={(record) => <span>Mobile: {record.name}</span>}
      />
    );

    expect(screen.getByText('Mobile: Nguyễn An')).toBeInTheDocument();
  });

  it('renders only the controlled current page when mobile cards receive a full client-side dataset', () => {
    setViewport(390);
    const records = Array.from({ length: 25 }, (_, index) => ({
      key: `customer-${index + 1}`,
      name: `Customer ${index + 1}`,
    }));

    render(
      <DataTable
        dataSource={records}
        columns={[{ title: 'Khách', dataIndex: 'name', key: 'name', width: 160 }]}
        rowKey="key"
        pagination={{ current: 2, pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} customers` }}
        mobileRenderer={(record) => <span>Mobile: {record.name}</span>}
      />
    );

    expect(screen.getByText('Mobile: Customer 11')).toBeInTheDocument();
    expect(screen.getByText('Mobile: Customer 20')).toBeInTheDocument();
    expect(screen.queryByText('Mobile: Customer 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Mobile: Customer 21')).not.toBeInTheDocument();
    expect(screen.getByText('25 customers')).toBeInTheDocument();
    expect(document.querySelector('.responsive-mobile-pagination .standard-pagination')).toBeInTheDocument();
  });

  it('keeps form fields in the shared responsive grid contract', () => {
    render(
      <ResponsiveFormGrid columns={3}>
        <ResponsiveFormField>Field 1</ResponsiveFormField>
        <ResponsiveFormField fullWidth>Field 2</ResponsiveFormField>
      </ResponsiveFormGrid>
    );

    expect(document.querySelector('[data-columns="3"]')).toBeInTheDocument();
    expect(document.querySelector('.responsive-form-field-full')).toBeInTheDocument();
  });

  it('assembles a feature page from the canonical header, toolbar, and data section', () => {
    render(
      <FeaturePage
        title="Khách hàng"
        subtitle="Tra cứu và phân bổ"
        toolbar={{ primary: <input aria-label="Tìm khách" />, actions: <Button>Tạo khách</Button> }}
      >
        <DataSection title="Danh sách khách" state="empty" stateTitle="Chưa có khách hàng" />
      </FeaturePage>
    );

    expect(screen.getByRole('heading', { name: 'Khách hàng' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Tìm khách' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tạo khách' })).toBeInTheDocument();
    expect(screen.getByText('Chưa có khách hàng')).toBeInTheDocument();
  });

  it('renders KPI cards from a data-only metric grid', () => {
    render(
      <MetricGrid
        columns={5}
        items={[
          { key: 'revenue', title: 'Doanh thu', value: '12.500.000 đ' },
          { key: 'orders', title: 'Đơn hoàn thành', value: 24 },
        ]}
      />
    );

    expect(screen.getByLabelText('Chỉ số tổng quan')).toHaveAttribute('data-columns', '5');
    expect(screen.getByText('Doanh thu')).toBeInTheDocument();
    expect(screen.getByText('12.500.000 đ')).toBeInTheDocument();
  });

  it('keeps entity forms on the shared grid without hand-built field wrappers', () => {
    render(
      <EntityForm columns={2}>
        <EntityFormField name="name" label="Tên khách">
          <Input aria-label="Tên khách" />
        </EntityFormField>
        <EntityFormField name="note" label="Ghi chú" fullWidth>
          <Input aria-label="Ghi chú" />
        </EntityFormField>
      </EntityForm>
    );

    expect(screen.getByRole('textbox', { name: 'Tên khách' })).toBeInTheDocument();
    expect(document.querySelector('.entity-form')).toBeInTheDocument();
    expect(document.querySelector('.entity-form .responsive-form-field-full')).toBeInTheDocument();
  });

  it('keeps a CRUD form inside the adaptive drawer and its shared footer', () => {
    render(
      <EntityFormDrawer title="Sửa khách hàng" open onClose={vi.fn()} footer={<Button>Lưu khách hàng</Button>}>
        <EntityForm>
          <EntityFormField name="name" label="Tên khách">
            <Input aria-label="Tên khách" />
          </EntityFormField>
        </EntityForm>
      </EntityFormDrawer>
    );

    expect(screen.getByText('Sửa khách hàng')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu khách hàng' })).toBeInTheDocument();
    expect(document.querySelector('.entity-form-drawer-content .entity-form')).toBeInTheDocument();
    expect(document.querySelector('.responsive-overlay-footer')).toBeInTheDocument();
  });

  it('assembles a default list page from data and controlled table props', () => {
    render(
      <ResourceListPage
        title="Khách hàng"
        metrics={{ items: [{ key: 'all', title: 'Tổng khách', value: 1 }] }}
        table={{
          dataSource: [{ key: 'customer-1', name: 'Nguyễn An' }],
          columns: [{ title: 'Khách hàng', dataIndex: 'name', key: 'name' }],
          rowKey: 'key',
          pagination: false,
        }}
      />
    );

    expect(screen.getByRole('heading', { name: 'Khách hàng' })).toBeInTheDocument();
    expect(screen.getByText('Tổng khách')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn An')).toBeInTheDocument();
  });

  it('uses the shared period navigator in the report-page assembly', () => {
    const { container } = render(
      <ReportPage
        title="Báo cáo CC"
        period={{
          mode: 'month',
          value: dayjs('2026-08-01'),
          label: 'Tháng 08/2026',
          onModeChange: vi.fn(),
          onPrevious: vi.fn(),
          onNext: vi.fn(),
        }}
        metrics={{ items: [{ key: 'tip', title: 'Tổng tip', value: 4_200_000, format: 'vnd' }] }}
      >
        <DataSection title="Bảng xếp hạng" state="empty" />
      </ReportPage>
    );

    expect(screen.getByRole('heading', { name: 'Báo cáo CC' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Điều hướng kỳ báo cáo' })).toBeInTheDocument();
    expect(screen.getByText('4.200.000 đ')).toBeInTheDocument();
    expect(container.querySelectorAll('.report-period-navigator-icon > svg').length).toBeGreaterThan(0);
  });

  it('moves feature filters into one accessible drawer on phone-sized viewports', () => {
    setViewport(390);
    render(
      <FeatureToolbar
        primary={<input aria-label="Tìm khách qua mobile" />}
        filters={<button type="button">Chi nhánh</button>}
        filterTitle="Lọc khách hàng"
      />
    );

    expect(screen.getByRole('button', { name: 'Mở bộ lọc' })).toBeInTheDocument();
    expect(document.querySelector('.toolbar-filter-disclosure-icon > svg')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Chi nhánh' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mở bộ lọc' }));
    expect(screen.getByRole('button', { name: 'Chi nhánh' })).toBeInTheDocument();
    expect(screen.getByText('Lọc khách hàng')).toBeInTheDocument();
  });
});
