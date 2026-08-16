'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Badge, Button, Divider, Tag, Typography } from 'antd';
import {
  BarChartOutlined,
  CalendarOutlined,
  CustomerServiceOutlined,
  PhoneOutlined,
  ReloadOutlined,
  RightOutlined,
  ScheduleOutlined,
  ShopOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import type { DashboardBranchSnapshot, DashboardTodayResponse, RevenueHourlyResponse, Staff } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { formatVND } from '../../lib/format-utils';
import { ContentSurface, PageHeader, StatePanel, StatCard } from '../../components/ui';
import { useResponsiveTier } from '../../hooks/useResponsiveTier';

const { Text, Title } = Typography;

const BRANCH_NAMES: Record<string, string> = {
  detham: 'Đề Thám',
  pxl: 'Phan Xích Long',
  estella: 'Estella',
};

type CommandCenterSnapshot = {
  operations: DashboardTodayResponse;
  revenue: RevenueHourlyResponse;
};

type QuickAction = {
  key: string;
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
};

function branchRevenue(branch: DashboardBranchSnapshot) {
  return Math.round((branch.revLe || 0) + (branch.revCombo || 0) + (branch.revProduct || 0));
}

function getRoleLabel(role?: string) {
  switch ((role || '').toLowerCase()) {
    case 'admin':
      return 'Quản trị hệ thống';
    case 'manager':
      return 'Quản lý vận hành';
    case 'telesales':
    case 'booker':
      return 'Tư vấn viên';
    case 'cs':
      return 'Chăm sóc khách hàng';
    default:
      return 'Nhân sự vận hành';
  }
}

function getQuickActions(role?: string): QuickAction[] {
  const normalizedRole = (role || '').toLowerCase();
  const operationalActions: QuickAction[] = [
    {
      key: 'today',
      title: 'Vận hành hôm nay',
      description: 'Lịch mới, khách đến và tình trạng phục vụ theo chi nhánh.',
      href: '/dashboard/today',
      icon: <ScheduleOutlined />,
    },
    {
      key: 'calendar',
      title: 'Lịch điều phối',
      description: 'Xem lịch CV, ca làm và các khoảng trống cần xử lý.',
      href: '/dashboard/schedule-calendar',
      icon: <CalendarOutlined />,
    },
  ];

  if (normalizedRole === 'admin' || normalizedRole === 'manager') {
    return [
      ...operationalActions,
      {
        key: 'kpi',
        title: 'KPI & hiệu suất',
        description: 'So sánh thực hiện, leaderboard và drill-down chỉ số.',
        href: '/dashboard/kpi',
        icon: <BarChartOutlined />,
      },
      {
        key: 'staff',
        title: 'Nhân sự',
        description: 'Nhân sự, phân quyền và cấu hình đội ngũ.',
        href: '/dashboard/staff',
        icon: <TeamOutlined />,
      },
    ];
  }

  if (normalizedRole === 'telesales' || normalizedRole === 'booker') {
    return [
      {
        key: 'customers',
        title: 'Khách hàng của tôi',
        description: 'Danh sách ưu tiên gọi lại và follow-up trong ngày.',
        href: '/dashboard/customers?assignedStaffId=me',
        icon: <UsergroupAddOutlined />,
      },
      {
        key: 'calls',
        title: 'Cuộc gọi',
        description: 'Thực hiện và hoàn tất log cuộc gọi đang chờ.',
        href: '/dashboard/calls',
        icon: <PhoneOutlined />,
      },
      ...operationalActions,
    ];
  }

  return [
    ...operationalActions,
    {
      key: 'customers',
      title: 'Khách hàng',
      description: 'Tìm khách và mở hồ sơ phục vụ đúng ngữ cảnh.',
      href: '/dashboard/customers',
      icon: <UsergroupAddOutlined />,
    },
    {
      key: 'calls',
      title: 'Cuộc gọi',
      description: 'Xử lý queue và ghi nhận kết quả liên hệ.',
      href: '/dashboard/calls',
      icon: <PhoneOutlined />,
    },
  ];
}

export default function DashboardPage() {
  const router = useRouter();
  const responsiveTier = useResponsiveTier();
  const [snapshot, setSnapshot] = useState<CommandCenterSnapshot | null>(null);
  const [currentUser, setCurrentUser] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadSnapshot = useCallback(async (background = false) => {
    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const today = dayjs().format('YYYY-MM-DD');
      const [operations, revenue] = await Promise.all([
        apiClient.dashboard.getToday({ dateFrom: today, dateTo: today }),
        apiClient.dashboard.getRevenueHourly({ dateFrom: today, dateTo: today }),
      ]);
      setSnapshot({ operations, revenue });
      setLastUpdated(new Date());
      setError(null);
    } catch (loadError) {
      console.error('Command center snapshot failed to load:', loadError);
      setError('Không thể tải snapshot vận hành. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('mos_user');
      if (storedUser) setCurrentUser(JSON.parse(storedUser) as Staff);
    } catch {
      setCurrentUser(null);
    }
    void loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadSnapshot(true);
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [loadSnapshot]);

  const derived = useMemo(() => {
    if (!snapshot) return null;

    const branches = Object.entries(snapshot.operations.branchesData).map(([key, branch]) => ({
      key,
      name: BRANCH_NAMES[key] || key,
      branch,
      revenue: branchRevenue(branch),
      consultantsOnDuty: branch.cc.filter((staff) => staff.shift !== 'off').length,
      techniciansOnDuty: branch.cv.filter((staff) => !staff.isOff).length,
      availableTechnicians: branch.cv.filter((staff) => !staff.isOff && staff.status === 'available').length,
    }));
    const comingCustomers = branches.reduce((total, item) => total + item.branch.coming.length, 0);
    const onDutyStaff = branches.reduce((total, item) => total + item.consultantsOnDuty + item.techniciansOnDuty, 0);
    const availableTechnicians = branches.reduce((total, item) => total + item.availableTechnicians, 0);
    const newBookings =
      snapshot.operations.bookingsCombo.length +
      snapshot.operations.bookingsOc.length +
      snapshot.operations.bookingsOther.length;

    return { branches, comingCustomers, onDutyStaff, availableTechnicians, newBookings };
  }, [snapshot]);

  const quickActions = useMemo(() => getQuickActions(currentUser?.role), [currentUser?.role]);
  const displayName = currentUser?.displayName || currentUser?.username || 'bạn';
  const roleLabel = getRoleLabel(currentUser?.role);
  const isDesktop = ['desktop', 'fhd', 'wide', 'uhd'].includes(responsiveTier);
  const isLargeDesktop = ['fhd', 'wide', 'uhd'].includes(responsiveTier);
  const isTabletOrLarger = responsiveTier !== 'mobile';
  const metricsGridStyle: CSSProperties = {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: `repeat(${isDesktop ? 4 : isTabletOrLarger ? 2 : 1}, minmax(0, 1fr))`,
  };
  const mainGridStyle: CSSProperties = {
    display: 'grid',
    gap: 16,
    gridTemplateColumns: isDesktop ? 'minmax(0, 3fr) minmax(340px, 2fr)' : 'minmax(0, 1fr)',
  };
  const branchGridStyle: CSSProperties = {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: `repeat(${isLargeDesktop ? 3 : isTabletOrLarger ? 2 : 1}, minmax(0, 1fr))`,
  };
  const actionGridStyle: CSSProperties = {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: `repeat(${isLargeDesktop ? 4 : isTabletOrLarger ? 2 : 1}, minmax(0, 1fr))`,
  };
  const largeDesktopMetricsGridStyle: CSSProperties = {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  };

  if (loading && !snapshot) {
    return <StatePanel kind="loading" title="Đang tải Trung tâm vận hành" />;
  }

  if (!snapshot || !derived) {
    return (
      <StatePanel
        kind="error"
        title="Không thể mở Trung tâm vận hành"
        description={error || 'Snapshot chưa sẵn sàng.'}
        extra={
          <Button type="primary" icon={<ReloadOutlined />} onClick={() => void loadSnapshot()}>
            Thử lại
          </Button>
        }
      />
    );
  }

  return (
    <div className="responsive-page responsive-workspace dashboard-command-center space-y-4">
      <PageHeader
        title="Trung tâm vận hành"
        subtitle={`Chào ${displayName} · ${roleLabel}. Chỉ giữ các tín hiệu cần quyết định trong hôm nay.`}
        icon={<ShopOutlined />}
        tag={<Tag color="processing">Live snapshot</Tag>}
        extra={
          <>
            <span className="inline-flex min-h-9 items-center">
              <Badge
                status="processing"
                text={
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {lastUpdated ? `Cập nhật ${dayjs(lastUpdated).format('HH:mm')}` : 'Đang cập nhật'}
                  </span>
                }
              />
            </span>
            <Button
              icon={<ReloadOutlined spin={refreshing} />}
              loading={refreshing}
              onClick={() => void loadSnapshot(true)}
            >
              Làm mới
            </Button>
            <Button type="primary" icon={<ScheduleOutlined />} onClick={() => router.push('/dashboard/today')}>
              Mở vận hành
            </Button>
          </>
        }
      />

      {error && (
        <ContentSurface className="border-amber-300 dark:border-amber-900" padding="12px 16px">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Text className="text-sm text-amber-700 dark:text-amber-300">{error}</Text>
            <Button size="small" onClick={() => void loadSnapshot(true)}>
              Thử lại
            </Button>
          </div>
        </ContentSurface>
      )}

      <section aria-label="Các chỉ số vận hành hôm nay" style={metricsGridStyle}>
        <StatCard
          title="Doanh thu hoàn tất"
          value={formatVND(snapshot.revenue.summary.totalRevenue)}
          subValue={`${snapshot.revenue.summary.completedOrders} đơn hoàn tất`}
          icon={<BarChartOutlined />}
        />
        <StatCard
          title="Lịch mới tạo"
          value={derived.newBookings}
          subValue="Theo ngày tạo đơn"
          icon={<CalendarOutlined />}
        />
        <StatCard
          title="Khách dự kiến đến"
          value={derived.comingCustomers}
          subValue="Trong các chi nhánh đang hiển thị"
          icon={<CustomerServiceOutlined />}
        />
        <StatCard
          title="Nhân sự đang có lịch"
          value={derived.onDutyStaff}
          subValue={`${derived.availableTechnicians} KTV đang sẵn sàng`}
          icon={<TeamOutlined />}
        />
      </section>

      <div style={mainGridStyle}>
        <ContentSurface elevated>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <Title level={4} className="!mb-1">
                Điều phối theo chi nhánh
              </Title>
              <Text type="secondary" className="text-sm">
                Mở detail khi cần can thiệp; không dồn cả dashboard Today vào màn hình nhỏ.
              </Text>
            </div>
            <Tag color="blue">{derived.branches.length} chi nhánh</Tag>
          </div>

          <div style={branchGridStyle}>
            {derived.branches.map(
              ({ key, name, branch, revenue, consultantsOnDuty, techniciansOnDuty, availableTechnicians }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => router.push(`/dashboard/today?shopBranch=${encodeURIComponent(key)}`)}
                  className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-amber-400 hover:shadow-sm dark:border-slate-700 dark:hover:border-amber-500"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{name}</span>
                    <RightOutlined className="text-xs text-slate-400" />
                  </div>
                  <div className="mt-3 text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
                    {formatVND(revenue)}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>{branch.coming.length} khách đến</span>
                    <span>{consultantsOnDuty + techniciansOnDuty} nhân sự có lịch</span>
                    <span>{availableTechnicians} KTV sẵn sàng</span>
                  </div>
                </button>
              )
            )}
          </div>
        </ContentSurface>

        <ContentSurface elevated>
          <div className="mb-4">
            <Title level={4} className="!mb-1">
              Ưu tiên tiếp theo
            </Title>
            <Text type="secondary" className="text-sm">
              Từ snapshot hiện tại, không tự suy diễn business rules mới.
            </Text>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
              <div className="font-medium text-slate-900 dark:text-slate-100">Theo dõi khách sẽ đến</div>
              <Text type="secondary" className="text-sm">
                {derived.comingCustomers} khách đang nằm trong luồng phục vụ hôm nay.
              </Text>
              <Button type="link" className="!mt-1 !px-0" onClick={() => router.push('/dashboard/today')}>
                Xem luồng khách <RightOutlined />
              </Button>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
              <div className="font-medium text-slate-900 dark:text-slate-100">Hoàn tất lịch mới</div>
              <Text type="secondary" className="text-sm">
                {derived.newBookings} lịch được tạo trong ngày, cần follow-up theo đúng queue của từng vai trò.
              </Text>
              <Button type="link" className="!mt-1 !px-0" onClick={() => router.push('/dashboard/appointments')}>
                Mở lịch hẹn <RightOutlined />
              </Button>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
              <div className="font-medium text-slate-900 dark:text-slate-100">Điều phối năng lực</div>
              <Text type="secondary" className="text-sm">
                {derived.availableTechnicians} KTV đang ở trạng thái sẵn sàng trong snapshot hiện tại.
              </Text>
              <Button type="link" className="!mt-1 !px-0" onClick={() => router.push('/dashboard/schedule-calendar')}>
                Mở lịch điều phối <RightOutlined />
              </Button>
            </div>
          </div>
        </ContentSurface>
      </div>

      {isLargeDesktop && (
        <section aria-label="Ngữ cảnh vận hành mở rộng" style={mainGridStyle}>
          <ContentSurface>
            <div className="mb-4">
              <Title level={4} className="!mb-1">
                Cơ cấu doanh thu hôm nay
              </Title>
              <Text type="secondary" className="text-sm">
                Detail đầy đủ vẫn nằm ở dashboard Today; tại đây chỉ giữ breakdown để so sánh nhanh.
              </Text>
            </div>
            <div style={largeDesktopMetricsGridStyle}>
              {[
                ['Combo', snapshot.revenue.summary.comboRevenue],
                ['Dịch vụ lẻ', snapshot.revenue.summary.singleRevenue],
                ['Sản phẩm', snapshot.revenue.summary.productRevenue],
                ['Giá trị TB/đơn', snapshot.revenue.summary.aov],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                  <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
                  <div className="mt-1 text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {formatVND(Number(value))}
                  </div>
                </div>
              ))}
            </div>
          </ContentSurface>

          <ContentSurface>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <Title level={4} className="!mb-1">
                  Năng lực theo chi nhánh
                </Title>
                <Text type="secondary" className="text-sm">
                  Chỉ số ca trực hiện có, để chọn đúng chi nhánh cần mở trước.
                </Text>
              </div>
              <Tag color="cyan">Live</Tag>
            </div>
            <div className="space-y-2">
              {derived.branches.map(
                ({ key, name, consultantsOnDuty, techniciansOnDuty, availableTechnicians, branch }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => router.push(`/dashboard/today?shopBranch=${encodeURIComponent(key)}`)}
                    className="w-full items-center rounded-lg bg-slate-50 px-3 py-2 text-left text-sm transition hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800"
                    style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 1fr) auto auto auto', gap: 16 }}
                  >
                    <span className="font-medium text-slate-900 dark:text-slate-100">{name}</span>
                    <span className="tabular-nums text-slate-500 dark:text-slate-400">{consultantsOnDuty} CC</span>
                    <span className="tabular-nums text-slate-500 dark:text-slate-400">{techniciansOnDuty} KTV</span>
                    <span className="tabular-nums text-cyan-700 dark:text-cyan-300">
                      {availableTechnicians}/{branch.coming.length} sẵn sàng/khách đến
                    </span>
                  </button>
                )
              )}
            </div>
          </ContentSurface>
        </section>
      )}

      <ContentSurface>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <Title level={4} className="!mb-1">
              Đi tới công việc
            </Title>
            <Text type="secondary" className="text-sm">
              Lối tắt theo vai trò; desktop/FHD/4K giữ đủ context, mobile chỉ mở luồng hành động chính.
            </Text>
          </div>
        </div>
        <Divider className="!mt-0" />
        <div style={actionGridStyle}>
          {quickActions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => router.push(action.href)}
              className="group flex min-h-28 items-start gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-amber-400 hover:shadow-sm dark:border-slate-700 dark:hover:border-amber-500"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-lg text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                {action.icon}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                  {action.title}
                  <RightOutlined className="text-xs text-slate-400 transition group-hover:translate-x-0.5" />
                </span>
                <span className="mt-1 block text-sm leading-5 text-slate-500 dark:text-slate-400">
                  {action.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </ContentSurface>
    </div>
  );
}
