'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Table,
  Card,
  Tag,
  Switch,
  Typography,
  Space,
  theme as antdTheme,
  Button,
  Input,
  Row,
  Col,
  message,
  Drawer,
  Form,
  InputNumber,
  Popconfirm,
  Tooltip,
  Tabs,
  Avatar,
  Select,
} from 'antd';

import {
  ShopOutlined,
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  UserOutlined,
  CheckCircleOutlined,
  StopOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  ShoppingOutlined,
  TeamOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../../../context/ThemeContext';
import { apiClient } from '../../../../lib/api-client';
import { StatCard, StatusTag } from '../../../../components/ui';
import type {
  CrmBranch,
  CreateBranchDto,
  UpdateBranchDto,
  BranchStats,
  BranchStaffInfo,
  BranchType,
} from '@mos-lab/shared';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function CatalogBranchTab() {
  const { themeMode } = useTheme();
  const { token } = antdTheme.useToken();

  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [branches, setBranches] = useState<CrmBranch[]>([]);
  const [stats, setStats] = useState<BranchStats | null>(null);

  // Filters & Controlled Pagination (Rule #24 & #25)
  const [search, setSearch] = useState<string>('');
  const [onlyHidden, setOnlyHidden] = useState<boolean>(false);
  const [page, setPage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('catalog_branch_page');
      if (saved) return Number(saved);
    }
    return 1;
  });
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('catalog_branch_pagesize');
      if (saved) return Number(saved);
    }
    return 20;
  });
  const [total, setTotal] = useState<number>(0);

  // Drawer / Form state
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedBranch, setSelectedBranch] = useState<CrmBranch | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<string>('info');

  const [form] = Form.useForm();

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await apiClient.catalog.branches.getStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch branch stats', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch branches list
  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.catalog.branches.list({
        page,
        pageSize,
        search: search.trim() || undefined,
        onlyHidden,
      });

      if (res.success) {
        setBranches(res.data);
        setTotal(res.meta.total);
      }
    } catch (err: any) {
      message.error(err.message || 'Lỗi tải danh sách chi nhánh');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, onlyHidden]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // Persist page state (Rule #24)
  const handleTableChange = (pagination: any) => {
    const newPage = pagination.current || 1;
    const newPageSize = pagination.pageSize || 20;
    setPage(newPage);
    setPageSize(newPageSize);
    if (typeof window !== 'undefined') {
      localStorage.setItem('catalog_branch_page', String(newPage));
      localStorage.setItem('catalog_branch_pagesize', String(newPageSize));
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleOnlyHiddenToggle = (checked: boolean) => {
    setOnlyHidden(checked);
    setPage(1);
  };

  // Open Create Drawer
  const handleOpenCreate = () => {
    form.resetFields();
    form.setFieldsValue({
      isActive: true,
      storeType: 'SALON',
      sortOrder: 0,
    });
    setSelectedBranch(null);
    setDrawerMode('create');
    setActiveDrawerTab('info');
    setDrawerVisible(true);
  };

  // Open Edit / View Drawer
  const handleOpenEditOrView = async (branch: CrmBranch, mode: 'edit' | 'view') => {
    try {
      setDetailLoading(true);
      setDrawerMode(mode);
      setActiveDrawerTab('info');
      setDrawerVisible(true);

      const res = await apiClient.catalog.branches.get(branch.id);
      if (res.success) {
        setSelectedBranch(res.data);
        form.setFieldsValue({
          code: res.data.code,
          name: res.data.name,
          nameEn: res.data.nameEn || '',
          storeType: res.data.storeType || 'SALON',
          addressMap: res.data.addressMap || '',
          addressSms: res.data.addressSms || '',
          addressWeb: res.data.addressWeb || '',
          addressCity: res.data.addressCity || '',
          sortOrder: res.data.sortOrder,
          isActive: res.data.isActive,
          notes: res.data.notes || '',
        });
      }
    } catch (err: any) {
      message.error(err.message || 'Lỗi tải chi tiết chi nhánh');
    } finally {
      setDetailLoading(false);
    }
  };

  // Submit Create / Edit
  const handleSubmitForm = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (drawerMode === 'create') {
        const dto: CreateBranchDto = {
          code: values.code,
          name: values.name,
          nameEn: values.nameEn || undefined,
          storeType: values.storeType || 'SALON',
          addressMap: values.addressMap || undefined,
          addressSms: values.addressSms || undefined,
          addressWeb: values.addressWeb || undefined,
          addressCity: values.addressCity || undefined,
          sortOrder: values.sortOrder || 0,
          isActive: values.isActive,
          notes: values.notes || undefined,
        };
        const res = await apiClient.catalog.branches.create(dto);
        message.success(res.message || 'Tạo chi nhánh thành công');
      } else if (drawerMode === 'edit' && selectedBranch) {
        const dto: UpdateBranchDto = {
          code: values.code,
          name: values.name,
          nameEn: values.nameEn || undefined,
          storeType: values.storeType || 'SALON',
          addressMap: values.addressMap || undefined,
          addressSms: values.addressSms || undefined,
          addressWeb: values.addressWeb || undefined,
          addressCity: values.addressCity || undefined,
          sortOrder: values.sortOrder,
          isActive: values.isActive,
          notes: values.notes || undefined,
        };
        const res = await apiClient.catalog.branches.update(selectedBranch.id, dto);
        message.success(res.message || 'Cập nhật chi nhánh thành công');
      }

      setDrawerVisible(false);
      fetchBranches();
      fetchStats();
    } catch (err: any) {
      if (err.errorFields) return; // Validation error
      message.error(err.message || 'Thao tác thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active (Soft-delete safety rule)
  const handleToggleActive = async (branch: CrmBranch) => {
    try {
      const res = await apiClient.catalog.branches.toggleActive(branch.id);
      message.success(res.message);
      fetchBranches();
      fetchStats();
    } catch (err: any) {
      message.error(err.message || 'Lỗi chuyển trạng thái');
    }
  };

  // Table Columns
  const columns = [
    {
      title: 'Mã & Tên Chi Nhánh',
      key: 'name',
      render: (_: any, record: CrmBranch) => (
        <Space direction="vertical" size={2}>
          <Space>
            <Tag color="blue" className="font-semibold tabular-nums">
              {record.code}
            </Tag>
            <Text
              strong
              className={`text-base cursor-pointer hover:text-blue-500 ${
                !record.isActive ? 'line-through text-slate-400' : ''
              }`}
              onClick={() => handleOpenEditOrView(record, 'view')}
            >
              {record.name}
            </Text>
          </Space>
          {record.nameEn && (
            <Text type="secondary" className="text-xs italic">
              (EN: {record.nameEn})
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Địa chỉ hiển thị Web / SMS',
      key: 'addresses',
      render: (_: any, record: CrmBranch) => (
        <div className="space-y-1 text-xs">
          {record.addressWeb && (
            <div>
              <Text type="secondary">Web: </Text>
              <Text>{record.addressWeb}</Text>
            </div>
          )}
          {record.addressSms && (
            <div>
              <Text type="secondary">SMS: </Text>
              <Tag color="cyan" className="font-mono text-[11px]">
                {record.addressSms}
              </Tag>
            </div>
          )}
          {!record.addressWeb && !record.addressSms && <Text type="secondary">-</Text>}
        </div>
      ),
    },
    {
      title: 'Tỉnh / Thành / Quận',
      dataIndex: 'addressCity',
      key: 'addressCity',
      render: (val: string | null) =>
        val ? (
          <Space size={4} className="text-xs">
            <EnvironmentOutlined className="text-rose-500" />
            <span>{val}</span>
          </Space>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Loại chi nhánh',
      dataIndex: 'storeType',
      key: 'storeType',
      render: (type: BranchType) => {
        if (type === 'ACADEMY') {
          return (
            <Tag color="blue" className="px-2.5 py-0.5 font-semibold text-xs">
              🎓 Học viện Đào tạo
            </Tag>
          );
        }
        if (type === 'OFFICE') {
          return (
            <Tag color="gold" className="px-2.5 py-0.5 font-semibold text-xs">
              🏢 Trụ sở / HQ
            </Tag>
          );
        }
        return (
          <Tag color="rose" className="px-2.5 py-0.5 font-semibold text-xs">
            🪷 Tiệm Nối Mi
          </Tag>
        );
      },
    },

    {
      title: 'Nhân sự sở tại',
      key: 'staffCount',
      align: 'center' as const,
      render: (_: any, record: CrmBranch) => (
        <Tooltip title="Số lượng KTV & CC làm việc sở tại chi nhánh này">
          <Tag color="purple" icon={<TeamOutlined />} className="px-2.5 py-0.5 font-semibold text-sm tabular-nums">
            {(record.staffCount || 0).toLocaleString('vi-VN')}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: 'Khách hàng thuộc CN',
      key: 'customerCount',
      align: 'center' as const,
      render: (_: any, record: CrmBranch) => (
        <Tooltip title="Tổng số khách hàng đăng ký / thường ghé chi nhánh này">
          <Tag color="cyan" icon={<UserOutlined />} className="px-2.5 py-0.5 font-semibold text-sm tabular-nums">
            {(record.customerCount || 0).toLocaleString('vi-VN')}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: 'Đơn hoàn tất',
      key: 'completedOrdersCount',
      align: 'center' as const,
      render: (_: any, record: CrmBranch) => (
        <Tooltip title="Tổng số đơn hàng đã hoàn tất tại chi nhánh">
          <Tag color="emerald" icon={<ShoppingOutlined />} className="px-2.5 py-0.5 font-semibold text-sm tabular-nums">
            {(record.completedOrdersCount || 0).toLocaleString('vi-VN')}
          </Tag>
        </Tooltip>
      ),
    },

    {
      title: 'Trạng thái',
      key: 'isActive',
      align: 'center' as const,
      render: (_: any, record: CrmBranch) => (
        <StatusTag status={record.isActive ? 'success' : 'default'} label={record.isActive ? 'Hoạt động' : 'Đã ẩn'} />
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: CrmBranch) => (
        <Space size="middle">
          <Tooltip title="Xem chi tiết & danh sách nhân sự">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined className="text-blue-500" />}
              onClick={() => handleOpenEditOrView(record, 'view')}
            />
          </Tooltip>

          <Tooltip title="Chỉnh sửa thông tin">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined className="text-amber-500" />}
              onClick={() => handleOpenEditOrView(record, 'edit')}
            />
          </Tooltip>

          <Tooltip title={record.isActive ? 'Ngắt hoạt động chi nhánh' : 'Kích hoạt lại chi nhánh'}>
            <Popconfirm
              title={record.isActive ? 'Vô hiệu hóa chi nhánh này?' : 'Kích hoạt lại chi nhánh này?'}
              description={
                record.isActive
                  ? 'Chi nhánh bị ẩn sẽ không thể đặt lịch mới nhưng bảo toàn dữ liệu báo cáo cũ.'
                  : 'Chi nhánh sẽ xuất hiện trở lại trong danh sách đặt lịch.'
              }
              onConfirm={() => handleToggleActive(record)}
              okText="Xác nhận"
              cancelText="Hủy"
              okButtonProps={{ danger: record.isActive }}
            >
              <Switch
                size="small"
                checked={record.isActive}
                loading={loading}
                className={record.isActive ? 'bg-emerald-500' : ''}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Stat Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={4.8} style={{ flex: '1 1 20%', maxWidth: '20%' }}>
          <StatCard
            title="TỔNG SỐ CHI NHÁNH"
            value={stats?.totalBranches || 0}
            icon={<ShopOutlined className="text-blue-500" />}
            loading={statsLoading}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4.8} style={{ flex: '1 1 20%', maxWidth: '20%' }}>
          <StatCard
            title="ĐANG HOẠT ĐỘNG"
            value={stats?.activeBranches || 0}
            icon={<CheckCircleOutlined className="text-emerald-500" />}
            loading={statsLoading}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4.8} style={{ flex: '1 1 20%', maxWidth: '20%' }}>
          <StatCard
            title="NHÂN SỰ SỞ TẠI"
            value={(stats?.totalStaff || 0).toLocaleString('vi-VN')}
            icon={<TeamOutlined className="text-purple-500" />}
            loading={statsLoading}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4.8} style={{ flex: '1 1 20%', maxWidth: '20%' }}>
          <StatCard
            title="KHÁCH HÀNG THUỘC CN"
            value={(stats?.totalCustomers || 0).toLocaleString('vi-VN')}
            icon={<UserOutlined className="text-cyan-500" />}
            loading={statsLoading}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4.8} style={{ flex: '1 1 20%', maxWidth: '20%' }}>
          <StatCard
            title="ĐƠN HOÀN TẤT CHI NHÁNH"
            value={(stats?.totalCompletedOrders || 0).toLocaleString('vi-VN')}
            icon={<ShoppingOutlined className="text-amber-500" />}
            loading={statsLoading}
          />
        </Col>
      </Row>

      {/* Toolbar Filter & Action */}
      <Card
        variant="outlined"
        style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        styles={{ body: { padding: '12px 16px' } }}
        className="shadow-sm rounded-xl"
      >
        <Row gutter={[16, 12]} justify="space-between" align="middle">
          <Col xs={24} md={16}>
            <Space size="middle" wrap className="w-full">
              <Input
                placeholder="Tìm tên chi nhánh, mã code, địa chỉ city..."
                prefix={<SearchOutlined className="text-slate-400" />}
                allowClear
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                style={{ width: 320 }}
              />

              {/* Rule #25: Exclusive hidden items filter switch */}
              <Tooltip title="Chuyển sang chế độ chỉ xem các chi nhánh đã bị vô hiệu hóa">
                <Space align="center" className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Text className="text-xs font-medium">Chỉ hiện mục đã ẩn</Text>
                  <Switch size="small" checked={onlyHidden} onChange={handleOnlyHiddenToggle} />
                </Space>
              </Tooltip>

              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  fetchBranches();
                  fetchStats();
                }}
                loading={loading}
              >
                Làm mới
              </Button>
            </Space>
          </Col>

          <Col xs={24} md={8} className="text-right">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreate}
              className="bg-blue-600 hover:bg-blue-500 shadow-md transition-all font-medium"
            >
              Thêm Chi Nhánh Mới
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card
        variant="outlined"
        style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        styles={{ body: { padding: 0 } }}
        className="shadow-sm rounded-xl overflow-hidden"
      >
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={branches}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (totalCount) => `Tổng cộng ${totalCount} chi nhánh`,
          }}
          onChange={handleTableChange}
          locale={{ emptyText: onlyHidden ? 'Không có chi nhánh nào bị ẩn' : 'Không tìm thấy chi nhánh nào' }}
        />
      </Card>

      {/* Drawer Detail / Create / Edit */}
      <Drawer
        title={
          <Space>
            <ShopOutlined className="text-blue-500" />
            <span>
              {drawerMode === 'create'
                ? 'Thêm Chi Nhánh Mới'
                : drawerMode === 'edit'
                  ? `Chỉnh Sửa Chi Nhánh: ${selectedBranch?.name}`
                  : `Chi Tiết Chi Nhánh: ${selectedBranch?.name}`}
            </span>
          </Space>
        }
        width={720}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        destroyOnClose
        extra={
          drawerMode !== 'view' && (
            <Space>
              <Button onClick={() => setDrawerVisible(false)}>Hủy</Button>
              <Button type="primary" loading={submitting} onClick={handleSubmitForm} className="bg-blue-600">
                Lưu Chi Nhánh
              </Button>
            </Space>
          )
        }
      >
        <Tabs
          activeKey={activeDrawerTab}
          onChange={setActiveDrawerTab}
          items={[
            {
              key: 'info',
              label: (
                <Space>
                  <ShopOutlined />
                  <span>Thông tin Master</span>
                </Space>
              ),
              children: (
                <Form form={form} layout="vertical" disabled={drawerMode === 'view'} className="py-2">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="code"
                        label="Mã Chi Nhánh (Code)"
                        rules={[
                          { required: true, message: 'Vui lòng nhập mã chi nhánh' },
                          { pattern: /^[a-zA-Z0-9_-]+$/, message: 'Mã không chứa khoảng trắng hoặc ký tự đặc biệt' },
                        ]}
                      >
                        <Input placeholder="Ví dụ: DETHAM, PXL, ESTELLA" style={{ textTransform: 'uppercase' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="name"
                        label="Tên Chi Nhánh (Tiếng Việt)"
                        rules={[{ required: true, message: 'Vui lòng nhập tên chi nhánh' }]}
                      >
                        <Input placeholder="Ví dụ: Đề Thám, Phan Xích Long" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="nameEn" label="Tên Chi Nhánh (Tiếng Anh)">
                        <Input placeholder="Ví dụ: De Tham Branch, Estella Place" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="storeType"
                        label="Loại Hình Chi Nhánh"
                        rules={[{ required: true, message: 'Chọn loại chi nhánh' }]}
                      >
                        <Select
                          options={[
                            { value: 'SALON', label: '🪷 Tiệm Nối Mi (Dịch vụ khách)' },
                            { value: 'ACADEMY', label: '🎓 Học viện Đào tạo' },
                            { value: 'OFFICE', label: '🏢 Trụ sở / Văn phòng HQ' },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    name="addressCity"
                    label="Tỉnh / Thành Phố / Quận / Phường (Địa chỉ đầy đủ)"
                    help="Địa chỉ hành chính chính thức của chi nhánh"
                  >
                    <Input placeholder="Ví dụ: 159 - 159A Đề Thám, P. Cô Giang, Quận 1, TP. Hồ Chí Minh" />
                  </Form.Item>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="addressSms"
                        label="Địa Chỉ Ngắn Gửi SMS"
                        help="Text ngắn gọn đính kèm tin nhắn SMS hẹn khách"
                      >
                        <Input placeholder="Ví dụ: 159A De Tham" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="addressWeb" label="Địa Chỉ Hiển Thị Trên Website / App">
                        <Input placeholder="Ví dụ: 159 - 159A Đề Thám, Quận 1" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item name="addressMap" label="Liên Kết Google Maps / Địa Chỉ Bản Đồ">
                    <Input placeholder="Ví dụ: Chi nhanh 3: De Tham, Quận 1 hoặc URL Google Maps" />
                  </Form.Item>

                  <Form.Item name="notes" label="Ghi Chú Vận Hành">
                    <TextArea rows={3} placeholder="Ghi chú nội bộ về diện tích, số ghế mi, bãi xe..." />
                  </Form.Item>

                  <Form.Item name="isActive" valuePropName="checked" label="Trạng Thái Hoạt Động">
                    <Switch checkedChildren="Đang hoạt động" unCheckedChildren="Đã vô hiệu hóa" />
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'staff',
              label: (
                <Space>
                  <TeamOutlined />
                  <span>Nhân Sự Sở Tại ({selectedBranch?.staffList?.length || selectedBranch?.staffCount || 0})</span>
                </Space>
              ),
              children: (
                <div className="py-2">
                  <Table
                    rowKey="id"
                    loading={detailLoading}
                    dataSource={selectedBranch?.staffList || []}
                    pagination={false}
                    size="small"
                    columns={[
                      {
                        title: 'Nhân viên',
                        key: 'displayName',
                        render: (_: any, s: BranchStaffInfo) => (
                          <Space>
                            <Avatar src={s.avatarUrl} icon={<UserOutlined />} size="small" />
                            <Text strong>{s.displayName}</Text>
                          </Space>
                        ),
                      },
                      {
                        title: 'Vai trò',
                        dataIndex: 'role',
                        key: 'role',
                        render: (role: string) => <Tag color={role === 'Chuyên viên' ? 'purple' : 'blue'}>{role}</Tag>,
                      },
                      {
                        title: 'Số điện thoại',
                        dataIndex: 'phone',
                        key: 'phone',
                        render: (p: string | null) => p || '-',
                      },
                      {
                        title: 'Trạng thái',
                        dataIndex: 'isActive',
                        key: 'isActive',
                        align: 'center' as const,
                        render: (active: boolean) => (
                          <StatusTag
                            status={active ? 'success' : 'default'}
                            label={active ? 'Đang làm' : 'Đã nghỉ/khóa'}
                          />
                        ),
                      },
                    ]}
                    locale={{ emptyText: 'Chưa có nhân sự gắn liền với chi nhánh này' }}
                  />
                </div>
              ),
            },
          ]}
        />
      </Drawer>
    </div>
  );
}
