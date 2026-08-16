'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Tag,
  Result,
  Spin,
  Tooltip,
  Tabs,
  Row,
  Col,
  Table,
  Badge,
  Modal,
  Drawer,
  Input,
  Select,
  Switch,
  Divider,
  Segmented,
} from 'antd';
import {
  FullscreenOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  BgColorsOutlined,
  ClusterOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  FilterOutlined,
  TableOutlined,
  FormOutlined,
  PhoneOutlined,
  SoundOutlined,
  CodeOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  MobileOutlined,
  TabletOutlined,
  LaptopOutlined,
  DesktopOutlined,
  CheckCircleFilled,
  ExclamationCircleFilled,
  CloseCircleFilled,
} from '@ant-design/icons';
import { useTheme } from '../../../context/ThemeContext';
import { apiClient } from '../../../lib/api-client';
import ReadyKitsTab from '../../../components/design-system/ReadyKitsTab';
import {
  UI_CATALOG_ITEMS,
  type CatalogStatus,
  type UiCatalogItem,
} from '../../../components/design-system/catalog.manifest';
import {
  PageHeader,
  StatCard,
  SectionCard,
  StatusTag,
  IconText,
  DensityContainer,
  PageToolbar,
  ContentSurface,
  DataTable,
  ResponsiveFormGrid,
  ResponsiveFormField,
  AdaptiveDrawer,
  AdaptiveModal,
  AdaptiveOverlayFooter,
} from '../../../components/ui';
import { themeTokens, type DesktopDensity } from '@mos-lab/shared';
import { useRouter } from 'next/navigation';
import { useResponsiveTier } from '../../../hooks/useResponsiveTier';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text, Paragraph } = Typography;

interface ResponsiveDemoRecord {
  key: string;
  customer: string;
  status: string;
  nextAction: string;
}

const responsiveDemoColumns: ColumnsType<ResponsiveDemoRecord> = [
  { title: 'Khách hàng', dataIndex: 'customer', key: 'customer', width: 180 },
  { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 150 },
  { title: 'Thao tác tiếp', dataIndex: 'nextAction', key: 'nextAction', width: 180 },
];

const responsiveDemoRecords: ResponsiveDemoRecord[] = [
  { key: '1', customer: 'Nguyễn An', status: 'Cần gọi lại', nextAction: 'Gọi lúc 14:30' },
  { key: '2', customer: 'Trần Bình', status: 'Đã đặt lịch', nextAction: 'Xem hồ sơ' },
];

export default function DesignSystemPage() {
  const { themeMode, toggleTheme, desktopDensity, effectiveDensity, setDesktopDensity } = useTheme();
  const router = useRouter();
  const responsiveTier = useResponsiveTier();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ready-kits');

  const [auditFilter, setAuditFilter] = useState<string>('ALL');

  // Interactive Modals for Demo
  const [activeDemoModal, setActiveDemoModal] = useState<string | null>(null);
  const [adaptiveModalOpen, setAdaptiveModalOpen] = useState(false);
  const [adaptiveDrawerOpen, setAdaptiveDrawerOpen] = useState(false);

  // Tabular Nums Counter Test State
  const [counter, setCounter] = useState(123456);

  useEffect(() => {
    const timer = setInterval(() => {
      setCounter((prev) => prev + Math.floor(Math.random() * 5) + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await apiClient.auth.me();
        let rawUser = (res as any)?.user || res;
        if ((!rawUser || !rawUser.role) && typeof window !== 'undefined') {
          const stored = localStorage.getItem('mos_user');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              rawUser = parsed.user || parsed || rawUser;
            } catch (_) {}
          }
        }
        setUser(rawUser);
      } catch (err) {
        console.error('Auth check error:', err);
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('mos_user');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              setUser(parsed.user || parsed);
            } catch (_) {}
          }
        }
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Spin size="large" tip="Đang xác thực quyền Admin..." />
      </div>
    );
  }

  const roleStr = (user?.role || '').toLowerCase();
  const usernameStr = (user?.username || '').toLowerCase();
  const emailStr = (user?.email || '').toLowerCase();
  const isAdmin =
    roleStr === 'admin' ||
    usernameStr === 'admin' ||
    usernameStr === 'danhdo@gmail.com' ||
    emailStr === 'danhdo@gmail.com';

  if (!user || !isAdmin) {
    return (
      <div style={{ padding: '24px' }}>
        <Result
          status="403"
          title="Chỉ Dành Cho Quản Trị Viên (Admin)"
          subTitle={`Tài khoản hiện tại (${user?.displayName || user?.username || 'khách'}) chưa có quyền Admin để truy cập Hệ Thống Thiết Kế (Design System).`}
        />
      </div>
    );
  }

  const currentTokens = themeMode === 'dark' ? themeTokens.colors.dark : themeTokens.colors.light;

  // Catalog source: typed manifest, validated by check-ui-contract.
  const allComponentsList = UI_CATALOG_ITEMS;

  // Filtered Component List based on Audit Badge Filter
  const filteredComponents = allComponentsList.filter((item) => {
    if (auditFilter === 'ALL') return true;
    return item.status === auditFilter;
  });

  // Group filtered components by Category Name
  const groupedCategories = filteredComponents.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, UiCatalogItem[]>
  );

  const getStatusBadgeTag = (status: CatalogStatus, statusText: string) => {
    if (status === 'FOUNDATION') {
      return (
        <span
          className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold leading-none border shadow-xs"
          style={{
            backgroundColor: themeTokens.statusColors.verified.bg,
            borderColor: themeTokens.statusColors.verified.border,
            color: themeTokens.statusColors.verified.text,
          }}
        >
          <CheckCircleFilled style={{ color: themeTokens.statusColors.verified.main }} />
          <span className="leading-none">{statusText}</span>
        </span>
      );
    }
    if (status === 'MIGRATING') {
      return (
        <span
          className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold leading-none border shadow-xs"
          style={{
            backgroundColor: themeTokens.statusColors.needsImprovement.bg,
            borderColor: themeTokens.statusColors.needsImprovement.border,
            color: themeTokens.statusColors.needsImprovement.text,
          }}
        >
          <ExclamationCircleFilled style={{ color: themeTokens.statusColors.needsImprovement.main }} />
          <span className="leading-none">{statusText}</span>
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold leading-none border shadow-xs"
        style={{
          backgroundColor: themeTokens.statusColors.notSynced.bg,
          borderColor: themeTokens.statusColors.notSynced.border,
          color: themeTokens.statusColors.notSynced.text,
        }}
      >
        <CloseCircleFilled style={{ color: themeTokens.statusColors.notSynced.main }} />
        <span className="leading-none">{statusText}</span>
      </span>
    );
  };

  const getCategoryBadgeInfo = (catName: string) => {
    if (catName === 'Foundation') return { color: 'geekblue', label: 'Foundation' };
    if (catName === 'Page assemblies') return { color: 'gold', label: 'Assembly' };
    if (catName === 'Data') return { color: 'green', label: 'Data' };
    if (catName === 'Filters & period') return { color: 'cyan', label: 'Filters' };
    if (catName === 'Forms & overlays') return { color: 'purple', label: 'Overlay' };
    if (catName === 'Feedback & state') return { color: 'magenta', label: 'State' };
    return { color: 'default', label: 'Shell' };
  };

  return (
    <div className="space-y-4 p-2 sm:p-4">
      {/* Page Header */}
      <PageHeader
        title={
          <Space align="center" size="middle">
            <BgColorsOutlined className="text-xl text-amber-500" />
            <span>Hệ Thống Thiết Kế (Design System & UI Components Audit)</span>
            <Tag color="gold" icon={<SafetyCertificateOutlined />}>
              Admin Only
            </Tag>
          </Space>
        }
        subtitle="Catalog UI, ready kits và trạng thái kiểm duyệt của hệ thống"
        extra={
          <Space wrap>
            <Button icon={<ClusterOutlined />} onClick={() => router.push('/dashboard/architecture')}>
              Xem Sơ Đồ Graphify
            </Button>
            <Button
              type="primary"
              icon={themeMode === 'dark' ? <ThunderboltOutlined /> : <BgColorsOutlined />}
              onClick={toggleTheme}
            >
              Đổi Theme: {themeMode === 'dark' ? 'Dark' : 'Light'} Mode
            </Button>
          </Space>
        }
      />

      {/* Audit Stats Summary Bar */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8} lg={6}>
          <StatCard
            title="∑ Components trong inventory"
            value={`${allComponentsList.length} Components`}
            icon={<AppstoreOutlined className="text-blue-500" />}
            subValue="Catalog UI đã audit"
          />
        </Col>
        <Col xs={24} sm={8} lg={6}>
          <StatCard
            title="Foundation sẵn sàng"
            value={`${allComponentsList.filter((i) => i.status === 'FOUNDATION').length} Components`}
            icon={<CheckCircleOutlined className="text-emerald-500" />}
            subValue="Đã có public contract"
          />
        </Col>
        <Col xs={24} sm={8} lg={6}>
          <StatCard
            title="Đang migration"
            value={`${allComponentsList.filter((i) => i.status === 'MIGRATING').length} Components`}
            icon={<ExclamationCircleOutlined className="text-amber-500" />}
            subValue="Chưa áp dụng đồng đều"
          />
        </Col>
        <Col xs={24} sm={24} lg={6}>
          <StatCard
            title="Tỷ Lệ Foundation"
            value={`${Math.round((allComponentsList.filter((i) => i.status === 'FOUNDATION').length / allComponentsList.length) * 100)}%`}
            icon={<SafetyCertificateOutlined className="text-purple-500" />}
            subValue="Không thay cho mức độ adoption"
          />
        </Col>
      </Row>

      {/* Main Tabs Container */}
      <Card
        bordered={false}
        className="shadow-md rounded-xl"
        style={{
          background: currentTokens.bgContainer,
          border: `1px solid ${currentTokens.borderColor}`,
        }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          items={[
            {
              key: 'ready-kits',
              label: (
                <Space>
                  <AppstoreOutlined />
                  <span>Lắp ráp nhanh</span>
                </Space>
              ),
              children: <ReadyKitsTab />,
            },
            {
              key: 'all-components',
              label: (
                <Space>
                  <AppstoreOutlined />
                  <span>Inventory & Audit ({filteredComponents.length})</span>
                </Space>
              ),
              children: (
                <div className="space-y-6 pt-2">
                  {/* Audit Filter Controls Bar */}
                  <SectionCard
                    title="Lọc Theo Trạng Thái Kiểm Duyệt UI (Audit Status Filter)"
                    extra={
                      <Segmented
                        value={auditFilter}
                        onChange={(val) => setAuditFilter(val as string)}
                        options={[
                          {
                            label: (
                              <Space size={4}>
                                <AppstoreOutlined />
                                <span>Tất cả ({allComponentsList.length})</span>
                              </Space>
                            ),
                            value: 'ALL',
                          },
                          {
                            label: (
                              <Space size={4}>
                                <CheckCircleOutlined className="text-emerald-500" />
                                <span>
                                  Foundation ({allComponentsList.filter((i) => i.status === 'FOUNDATION').length})
                                </span>
                              </Space>
                            ),
                            value: 'FOUNDATION',
                          },
                          {
                            label: (
                              <Space size={4}>
                                <WarningOutlined className="text-amber-500" />
                                <span>
                                  Đang migration ({allComponentsList.filter((i) => i.status === 'MIGRATING').length})
                                </span>
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
                          onChange={setDesktopDensity}
                          disabled={responsiveTier === 'mobile'}
                          className="w-full mt-1"
                          options={[
                            { value: 'compact', label: 'Compact — 32px control / 16px icon' },
                            { value: 'standard', label: 'Standard — 36px control / 18px icon' },
                            { value: 'comfortable', label: 'Comfortable — 44px control / 20px icon' },
                          ]}
                        />
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Text strong>Profile đang áp dụng: </Text>
                        <div className="mt-1 flex items-center gap-2">
                          <Tag color={effectiveDensity === 'mobileCompact' ? 'blue' : 'gold'}>
                            {effectiveDensity === 'mobileCompact'
                              ? 'MOBILE COMPACT — 44 / 20'
                              : effectiveDensity.toUpperCase()}
                          </Tag>
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
                          <Tag color={themeMode === 'dark' ? 'gold' : 'blue'}>{themeMode.toUpperCase()} MODE</Tag>
                          <Text type="secondary" className="text-xs">
                            (Đồng bộ toàn bộ ứng dụng)
                          </Text>
                        </div>
                      </Col>
                    </Row>
                  </SectionCard>

                  {/* Component Showcase Grouped by Category */}
                  <DensityContainer density={effectiveDensity} className="space-y-6">
                    {Object.keys(groupedCategories).map((catName) => (
                      <SectionCard
                        key={catName}
                        title={
                          <Space align="center">
                            <span className="font-bold text-lg text-amber-500">{catName}</span>
                            <Badge count={groupedCategories[catName].length} style={{ backgroundColor: '#10b981' }} />
                          </Space>
                        }
                      >
                        <Row gutter={[16, 16]}>
                          {groupedCategories[catName].map((item) => (
                            <Col xs={24} sm={12} lg={8} key={item.id}>
                              <Card
                                size="small"
                                bordered
                                className="h-full rounded-xl shadow-xs transition-all hover:border-amber-500 flex flex-col justify-between"
                                style={{
                                  background: themeMode === 'dark' ? '#111827' : '#f8fafc',
                                  borderColor: item.status === 'MIGRATING' ? '#f59e0b' : currentTokens.borderColor,
                                }}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <Text strong className="text-base text-amber-500">
                                      &lt;{item.name} /&gt;
                                    </Text>
                                    {getStatusBadgeTag(item.status, item.statusText)}
                                  </div>

                                  <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                                    <CodeOutlined />
                                    <span className="truncate">{item.filePath}</span>
                                  </div>

                                  <Paragraph
                                    className="text-xs text-secondary mb-3"
                                    ellipsis={{ rows: 2, expandable: true, symbol: 'Xem thêm' }}
                                  >
                                    {item.auditNotes}
                                  </Paragraph>
                                </div>

                                <div className="pt-2 border-t border-slate-700/20 flex items-center justify-between">
                                  <Tag
                                    color={getCategoryBadgeInfo(item.category).color}
                                    className="inline-flex items-center justify-center leading-none px-2.5 py-1 text-xs font-semibold m-0 rounded-md border-0"
                                  >
                                    {getCategoryBadgeInfo(item.category).label}
                                  </Tag>
                                  {item.demoType && (
                                    <Button
                                      size="small"
                                      type="dashed"
                                      icon={<EyeOutlined />}
                                      onClick={() => setActiveDemoModal(item.id)}
                                    >
                                      Thử Demo
                                    </Button>
                                  )}
                                </div>
                              </Card>
                            </Col>
                          ))}
                        </Row>
                      </SectionCard>
                    ))}
                  </DensityContainer>
                </div>
              ),
            },
            {
              key: 'tokens',
              label: (
                <Space>
                  <BgColorsOutlined />
                  <span>Design Tokens Palette Engine</span>
                </Space>
              ),
              children: (
                <div className="space-y-6 pt-2">
                  {/* Colors Swatches */}
                  <SectionCard title="Bảng Màu Chuẩn (Single Source of Truth Theme Colors)">
                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={12} md={6}>
                        <div
                          className="p-4 rounded-xl shadow-sm text-center font-bold border"
                          style={{ background: currentTokens.primary, color: '#ffffff' }}
                        >
                          Primary Gold
                          <div className="text-xs opacity-90">{currentTokens.primary}</div>
                        </div>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <div
                          className="p-4 rounded-xl shadow-sm text-center font-bold border"
                          style={{ background: currentTokens.info, color: '#ffffff' }}
                        >
                          Info / Cyan
                          <div className="text-xs opacity-90">{currentTokens.info}</div>
                        </div>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <div
                          className="p-4 rounded-xl shadow-sm text-center font-bold border"
                          style={{ background: currentTokens.success, color: '#ffffff' }}
                        >
                          Success Green
                          <div className="text-xs opacity-90">{currentTokens.success}</div>
                        </div>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <div
                          className="p-4 rounded-xl shadow-sm text-center font-bold border"
                          style={{ background: currentTokens.error, color: '#ffffff' }}
                        >
                          Error Red
                          <div className="text-xs opacity-90">{currentTokens.error}</div>
                        </div>
                      </Col>
                    </Row>
                  </SectionCard>

                  {/* Tabular Nums Rule Live Test */}
                  <SectionCard title="Quy Tắc Định Dạng Số (Tabular-nums Jitter Prevention Rule)">
                    <Paragraph>
                      Tất cả các số đếm ngược, thời lượng, số đơn, doanh thu bắt buộc dùng `tabular-nums` để chữ số có
                      chiều rộng bằng nhau, ngăn nhảy giật giao diện khi cập nhật liên tục.
                    </Paragraph>
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                      <Text strong className="text-lg">
                        Đồng Hồ Đếm Tương Tác Live:
                      </Text>
                      <span
                        className="tabular-nums text-2xl font-bold text-amber-500"
                        style={themeTokens.typography.tabularNumsStyle}
                      >
                        {counter.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </SectionCard>

                  {/* Breakpoints & Density Tokens Grid */}
                  <SectionCard title="Responsive Breakpoints & Density Presets">
                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={12}>
                        <Text strong>Responsive Breakpoints Token:</Text>
                        <ul className="mt-2 space-y-1 text-sm">
                          <li>
                            <MobileOutlined className="text-blue-500 mr-1.5" /> <strong>phone</strong>:{' '}
                            {themeTokens.breakpoints.phone}px
                          </li>
                          <li>
                            <TabletOutlined className="text-cyan-500 mr-1.5" /> <strong>ipad</strong>:{' '}
                            {themeTokens.breakpoints.ipad}px
                          </li>
                          <li>
                            <LaptopOutlined className="text-purple-500 mr-1.5" /> <strong>laptop</strong>:{' '}
                            {themeTokens.breakpoints.laptop}px
                          </li>
                          <li>
                            <DesktopOutlined className="text-emerald-500 mr-1.5" /> <strong>desktop</strong>:{' '}
                            {themeTokens.breakpoints.desktop}px
                          </li>
                          <li>
                            <DesktopOutlined className="text-amber-500 mr-1.5" /> <strong>fourK</strong>:{' '}
                            {themeTokens.breakpoints.fourK}px
                          </li>
                        </ul>
                      </Col>
                      <Col xs={24} md={12}>
                        <Text strong>Display Density Contract:</Text>
                        <ul className="mt-2 space-y-1 text-sm">
                          <li>
                            <strong>Compact</strong>: control 32px, icon 16px, padding 8px 12px, gap 8px
                          </li>
                          <li>
                            <strong>Standard</strong>: control 36px, icon 18px, padding 12px 16px, gap 12px
                          </li>
                          <li>
                            <strong>Comfortable</strong>: control 44px, icon 20px, padding 16px 24px, gap 16px
                          </li>
                          <li>
                            <strong>Mobile Compact</strong>: content compact, nhưng control 44px và icon 20px
                          </li>
                        </ul>
                      </Col>
                    </Row>
                  </SectionCard>
                </div>
              ),
            },
            {
              key: 'responsive-foundation',
              label: (
                <Space>
                  <MobileOutlined />
                  <span>Responsive Foundation</span>
                </Space>
              ),
              children: (
                <div className="space-y-6 pt-2 responsive-page">
                  <SectionCard
                    title="Responsive contract đang chạy"
                    extra={<Tag color="gold">Tier hiện tại: {responsiveTier.toUpperCase()}</Tag>}
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
                          <li>iPhone 12: 390 × 844</li>
                          <li>iPad portrait: 768 × 1024</li>
                          <li>FHD: 1920 × 1080</li>
                          <li>4K: 3840 × 2160</li>
                        </ul>
                      </Col>
                    </Row>
                  </SectionCard>

                  <SectionCard title="Page toolbar và information priority">
                    <PageToolbar
                      primary={<Input.Search aria-label="Demo tìm khách hàng" placeholder="Tìm khách hàng" />}
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
                        <label className="block text-sm font-medium mb-1" htmlFor="demo-name">
                          Khách hàng
                        </label>
                        <Input id="demo-name" placeholder="Tên khách" />
                      </ResponsiveFormField>
                      <ResponsiveFormField>
                        <label className="block text-sm font-medium mb-1" htmlFor="demo-phone">
                          Số điện thoại
                        </label>
                        <Input id="demo-phone" placeholder="090…" />
                      </ResponsiveFormField>
                      <ResponsiveFormField fullWidth>
                        <label className="block text-sm font-medium mb-1" htmlFor="demo-note">
                          Ghi chú
                        </label>
                        <Input.TextArea id="demo-note" rows={3} placeholder="Mở rộng toàn hàng theo field intent" />
                      </ResponsiveFormField>
                    </ResponsiveFormGrid>
                    <Space wrap className="mt-4">
                      <Button onClick={() => setAdaptiveModalOpen(true)}>Mở form modal</Button>
                      <Button onClick={() => setAdaptiveDrawerOpen(true)}>Mở detail drawer</Button>
                    </Space>
                  </SectionCard>

                  <ContentSurface elevated>
                    <Text type="secondary">
                      Các demo này dùng chính primitives Phase 1. Rollout Phase 2–7 dùng các patterns này theo
                      archetype, không tự định nghĩa breakpoint mới.
                    </Text>
                  </ContentSurface>
                </div>
              ),
            },
            {
              key: 'graphify',
              label: (
                <Space>
                  <ClusterOutlined />
                  <span>Knowledge Graph Sync</span>
                </Space>
              ),
              children: (
                <div className="pt-2 text-center py-8">
                  <ClusterOutlined className="text-5xl text-blue-500 mb-4" />
                  <Title level={3}>Đồng Bộ Trực Tiếp Với Knowledge Graph (Graphify)</Title>
                  <Paragraph className="max-w-2xl mx-auto text-secondary">
                    Trang Design System này đã được tự động đăng ký thành Node `App Page: /dashboard/design-system` trên
                    sơ đồ Knowledge Graph. Đồ thị sẽ hiển thị đầy đủ các mối liên hệ kết nối giữa các UI Components,
                    Design Tokens và các trang ứng dụng khác.
                  </Paragraph>
                  <Button
                    type="primary"
                    size="large"
                    icon={<ClusterOutlined />}
                    onClick={() => router.push('/dashboard/architecture')}
                  >
                    Mở Sơ Đồ Kiến Trúc Knowledge Graph Ngay
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Demo Modal for Component Audits */}
      <Modal
        title={`Demo Test Component: <${activeDemoModal || ''} />`}
        open={!!activeDemoModal}
        onOk={() => setActiveDemoModal(null)}
        onCancel={() => setActiveDemoModal(null)}
      >
        <Paragraph>
          Đang xem trước tương tác của component <strong>&lt;{activeDemoModal} /&gt;</strong>. Component này đã được
          đồng bộ chuẩn hóa theo Design Tokens của ứng dụng.
        </Paragraph>
        <StatusTag status="success" label="Verified Component" />
      </Modal>

      <AdaptiveModal
        intent="form"
        title="Adaptive form modal"
        open={adaptiveModalOpen}
        onCancel={() => setAdaptiveModalOpen(false)}
        footer={null}
      >
        <ResponsiveFormGrid columns={2}>
          <ResponsiveFormField>
            <label className="block text-sm font-medium mb-1" htmlFor="modal-subject">
              Tiêu đề
            </label>
            <Input id="modal-subject" placeholder="Nội dung cần xử lý" />
          </ResponsiveFormField>
          <ResponsiveFormField>
            <label className="block text-sm font-medium mb-1" htmlFor="modal-owner">
              Người phụ trách
            </label>
            <Select id="modal-owner" className="w-full" options={[{ value: 'cc', label: 'Tư vấn viên' }]} />
          </ResponsiveFormField>
        </ResponsiveFormGrid>
        <AdaptiveOverlayFooter>
          <Button onClick={() => setAdaptiveModalOpen(false)}>Hủy</Button>
          <Button type="primary" onClick={() => setAdaptiveModalOpen(false)}>
            Lưu demo
          </Button>
        </AdaptiveOverlayFooter>
      </AdaptiveModal>

      <AdaptiveDrawer
        intent="detail"
        title="Adaptive detail drawer"
        open={adaptiveDrawerOpen}
        onClose={() => setAdaptiveDrawerOpen(false)}
      >
        <Paragraph>
          Phone dùng toàn màn hình; tablet và desktop dùng chiều rộng theo intent để nội dung vẫn đọc được.
        </Paragraph>
        <AdaptiveOverlayFooter>
          <Button onClick={() => setAdaptiveDrawerOpen(false)}>Đóng</Button>
        </AdaptiveOverlayFooter>
      </AdaptiveDrawer>
    </div>
  );
}
