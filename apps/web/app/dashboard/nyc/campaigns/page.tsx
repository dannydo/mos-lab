'use client';

import '../../../suppress-warnings';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Table,
  Button,
  Card,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Typography,
  Tooltip,
  Popconfirm,
  message,
  Row,
  Col,
  theme,
  Divider,
  InputNumber,
  Switch,
  Tabs,
} from 'antd';
import { GoogleSheetColorPicker } from '../../../../components/GoogleSheetColorPicker';
import {
  PlusOutlined,
  EditOutlined,
  StopOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  MinusCircleOutlined,
  SettingOutlined,
  EnvironmentOutlined,
  GiftOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { useTheme } from '../../../../context/ThemeContext';
import { apiClient } from '../../../../lib/api-client';
import { removeVietnameseTones } from '../../../../lib/utils/search';
import {
  Campaign,
  CampaignStatus,
  CampaignPromotionType,
  CreateCampaignDto,
  UpdateCampaignDto,
  CreateCampaignTouchpointDto,
  CreateCampaignPromotionDto,
} from '@mos-lab/shared';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function CampaignManagementPage() {
  const router = useRouter();
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState<boolean>(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  const [showInSidebar, setShowInSidebar] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_sidebar_show_custom_campaigns');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const handleToggleSidebar = (checked: boolean) => {
    setShowInSidebar(checked);
    localStorage.setItem('mos_sidebar_show_custom_campaigns', String(checked));
    window.dispatchEvent(new Event('mos_sidebar_toggle'));
  };

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [staffList, setStaffList] = useState<any[]>([]);

  useEffect(() => {
    apiClient.customers
      .getStaff({ role: 'booker' })
      .then((res: any) => {
        if (Array.isArray(res)) setStaffList(res);
        else if (res?.data && Array.isArray(res.data)) setStaffList(res.data);
      })
      .catch(() => {});
  }, []);

  // Load User Role & Username
  useEffect(() => {
    const storedUser = localStorage.getItem('mos_user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setUserRole(u.role || '');
        setUserName(u.username || u.email || '');
      } catch (_) {}
    }
  }, []);

  const isAdmin =
    ['admin', 'manager', 'oc', 'ls'].includes(userRole?.toLowerCase()) ||
    userName?.toLowerCase() === 'danhdo@gmail.com' ||
    userName?.toLowerCase() === 'admin';

  // Fetch Campaigns
  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'ALL' ? { status: statusFilter as CampaignStatus } : undefined;
      const res: any = await apiClient.campaigns.list(params);
      const list = Array.isArray(res) ? res : res?.items || res?.data || [];
      setCampaigns(list);
    } catch (err) {
      console.error('Fetch campaigns error:', err);
      message.error('Không thể tải danh sách chiến dịch');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Filtered campaigns by tone-insensitive search
  const filteredCampaigns = useMemo(() => {
    if (!searchQuery.trim()) return campaigns;
    const query = removeVietnameseTones(searchQuery.trim().toLowerCase());
    return campaigns.filter((c) => {
      const nameMatch = removeVietnameseTones((c.name || '').toLowerCase()).includes(query);
      const slugMatch = removeVietnameseTones((c.slug || '').toLowerCase()).includes(query);
      const descMatch = removeVietnameseTones((c.description || '').toLowerCase()).includes(query);
      return nameMatch || slugMatch || descMatch;
    });
  }, [campaigns, searchQuery]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingCampaign(null);
    setIsModalOpen(true);
    setTimeout(() => {
      form.resetFields();
      form.setFieldsValue({
        name: '',
        slug: '',
        description: '',
        dates: null,
        touchpoints: [
          { label: 'Chạm D1', key: 'TP_D1', daysMin: 1, daysMax: 1, color: '#1890ff', sortOrder: 1 },
          { label: 'Chạm D3', key: 'TP_D3', daysMin: 3, daysMax: 3, color: '#52c41a', sortOrder: 2 },
          { label: 'Chạm D7', key: 'TP_D7', daysMin: 7, daysMax: 7, color: '#fa8c16', sortOrder: 3 },
          { label: 'Chạm D14', key: 'TP_D14', daysMin: 14, daysMax: 14, color: '#722ed1', sortOrder: 4 },
          { label: 'Chạm D21', key: 'TP_D21', daysMin: 21, daysMax: 21, color: '#ff4d4f', sortOrder: 5 },
        ],
        promotions: [
          { name: 'Giảm 20% Dịch vụ Nối mi', type: 'PERCENT_DISCOUNT', value: 20, description: 'Ưu đãi chiến dịch' },
        ],
      });
    }, 50);
  };

  // Open Edit Modal
  const handleOpenEdit = async (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setIsModalOpen(true);
    try {
      const details: any = await apiClient.campaigns.getById(campaign.id);
      const dates =
        details.startDate && details.endDate
          ? [dayjs(details.startDate), dayjs(details.endDate)]
          : details.startDate
            ? [dayjs(details.startDate), null]
            : null;

      setTimeout(() => {
        form.resetFields();
        form.setFieldsValue({
          name: details.name,
          slug: details.slug,
          description: details.description,
          dates: dates,
          status: details.status,
          assignedStaffIds: details.assignedStaffIds || [],
          touchpoints: details.touchpoints || details.CampaignTouchpoint || [],
          promotions: details.promotions || details.CampaignPromotion || [],
        });
      }, 50);
    } catch (err) {
      console.error('Fetch campaign details error:', err);
      message.error('Không thể tải chi tiết chiến dịch để chỉnh sửa');
    }
  };

  // End Campaign
  const handleEndCampaign = async (campaign: Campaign) => {
    try {
      await apiClient.campaigns.endCampaign(campaign.id);
      message.success('Đã kết thúc chiến dịch thành công');
      fetchCampaigns();
    } catch (err) {
      console.error('End campaign error:', err);
      message.error('Không thể kết thúc chiến dịch');
    }
  };

  // Delete Campaign
  const handleDeleteCampaign = async (campaign: Campaign) => {
    try {
      await apiClient.campaigns.delete(campaign.id);
      message.success('Đã xóa chiến dịch thành công');
      fetchCampaigns();
    } catch (err) {
      console.error('Delete campaign error:', err);
      message.error('Không thể xóa chiến dịch');
    }
  };

  // Form Submit (Create / Edit)
  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const startDate = values.dates && values.dates[0] ? values.dates[0].format('YYYY-MM-DD') : undefined;
      const endDate = values.dates && values.dates[1] ? values.dates[1].format('YYYY-MM-DD') : undefined;

      const touchpoints: CreateCampaignTouchpointDto[] = (values.touchpoints || [])
        .filter((tp: any) => tp && (tp.label || tp.key))
        .map((tp: any, index: number) => ({
          key: tp.key || `TP_${index + 1}`,
          label: tp.label || `Chạm ${index + 1}`,
          daysMin: Number(tp.daysMin) || 0,
          daysMax:
            tp.daysMax !== undefined && tp.daysMax !== null && tp.daysMax !== ''
              ? Number(tp.daysMax)
              : Number(tp.daysMin) || 0,
          color: typeof tp.color === 'string' ? tp.color : '#1890ff',
          sortOrder: index + 1,
        }));

      const promotions: CreateCampaignPromotionDto[] = (values.promotions || [])
        .filter((p: any) => p && p.name && String(p.name).trim() !== '')
        .map((p: any) => ({
          name: String(p.name).trim(),
          code: p.code ? String(p.code).trim() : undefined,
          type: (p.type || 'PERCENT_DISCOUNT') as CampaignPromotionType,
          value: Number(p.value) || 0,
          description: p.description ? String(p.description).trim() : undefined,
        }));

      if (editingCampaign) {
        const updateDto: UpdateCampaignDto = {
          name: values.name,
          description: values.description,
          startDate,
          endDate,
          status: values.status,
          assignedStaffIds: values.assignedStaffIds || null,
          touchpoints,
          promotions,
        };
        await apiClient.campaigns.update(editingCampaign.id, updateDto);
        message.success('Đã cập nhật chiến dịch thành công');
      } else {
        const createDto: CreateCampaignDto = {
          name: values.name,
          slug: values.slug || undefined,
          description: values.description,
          startDate,
          endDate,
          assignedStaffIds: values.assignedStaffIds || null,
          touchpoints,
          promotions,
        };
        await apiClient.campaigns.create(createDto);
        message.success('Tạo chiến dịch mới thành công');
      }

      setIsModalOpen(false);
      fetchCampaigns();
    } catch (err: any) {
      console.error('Submit campaign error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Thao tác thất bại';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusTag = (status: CampaignStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Tag color="success">HOẠT ĐỘNG</Tag>;
      case 'ENDED':
        return <Tag color="default">ĐÃ KẾT THÚC</Tag>;
      case 'ARCHIVED':
        return <Tag color="warning">LƯU TRỮ</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Tên chiến dịch',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Campaign) => (
        <div>
          <div
            className="font-bold cursor-pointer hover:underline text-amber-600 dark:text-amber-400"
            onClick={() => router.push(`/dashboard/nyc/campaigns/${record.slug}`)}
          >
            {text}
          </div>
          <div className="text-xs text-gray-500 font-mono">slug: {record.slug}</div>
          {record.description && <div className="text-xs text-gray-400 line-clamp-1 mt-0.5">{record.description}</div>}
        </div>
      ),
    },
    {
      title: 'Thời gian',
      key: 'dates',
      render: (_: any, record: Campaign) => {
        const start = record.startDate ? dayjs(record.startDate).format('DD/MM/YYYY') : 'Tùy chỉnh';
        const end = record.endDate ? dayjs(record.endDate).format('DD/MM/YYYY') : 'Không giới hạn';
        return (
          <div className="text-xs tabular-nums">
            <div>
              <CalendarOutlined className="mr-1 text-gray-400" />
              {start} - {end}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: CampaignStatus) => renderStatusTag(status),
    },
    {
      title: 'Quyền truy cập',
      key: 'access',
      render: (_: any, record: Campaign) => {
        const count = record.assignedStaffIds?.length || 0;
        if (count === 0) {
          return <Tag color="blue">🌐 Công khai (Tất cả)</Tag>;
        }
        return (
          <Tooltip title={`Chỉ Admin và ${count} thành viên được gán mới có quyền xem`}>
            <Tag color="purple">🔒 Riêng tư ({count} thành viên)</Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'Tổng KH',
      key: 'totalCustomers',
      align: 'right' as const,
      render: (_: any, record: Campaign) => (
        <span className="tabular-nums font-semibold">{record._count?.customers ?? 0}</span>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center' as const,
      render: (_: any, record: Campaign) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết chiến dịch">
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/dashboard/nyc/campaigns/${record.slug}`)}
            >
              Chi tiết
            </Button>
          </Tooltip>
          {isAdmin && (
            <>
              <Tooltip title="Chỉnh sửa chiến dịch">
                <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(record)} />
              </Tooltip>
              {record.status === 'ACTIVE' && (
                <Popconfirm
                  title="Kết thúc chiến dịch?"
                  description="Chiến dịch sẽ chuyển sang trạng thái ENDED và ngưng phân bổ."
                  onConfirm={() => handleEndCampaign(record)}
                  okText="Kết thúc"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                >
                  <Tooltip title="Kết thúc chiến dịch">
                    <Button size="small" danger icon={<StopOutlined />} />
                  </Tooltip>
                </Popconfirm>
              )}
              <Popconfirm
                title="Xóa chiến dịch?"
                description="Bạn có chắc chắn muốn xóa hẳn chiến dịch này không?"
                onConfirm={() => handleDeleteCampaign(record)}
                okText="Xóa ngay"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Xóa chiến dịch">
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <Title
            level={2}
            style={{
              color: themeMode === 'dark' ? token.colorPrimary : '#87640a',
              margin: 0,
              fontWeight: 'bold',
            }}
          >
            <ClockCircleOutlined /> Quản lý Chiến dịch NYC
          </Title>
          <Text type="secondary">Thiết lập và theo dõi các chiến dịch chăm sóc khách hàng NYC đặc biệt.</Text>
        </div>
        <Space wrap size="middle">
          <div
            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg border text-xs font-semibold ${
              themeMode === 'dark' ? 'bg-white/[0.04] border-white/10' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <span className={themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
              Hiện link chiến dịch ở Sidebar:
            </span>
            <Switch
              checked={showInSidebar}
              onChange={handleToggleSidebar}
              size="small"
              style={{ backgroundColor: showInSidebar ? '#10b981' : undefined }}
            />
          </div>

          {isAdmin && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              style={{
                backgroundColor: themeMode === 'dark' ? '#D4A84B' : '#a07818',
                borderColor: themeMode === 'dark' ? '#D4A84B' : '#a07818',
                fontWeight: 'bold',
              }}
              onClick={handleOpenCreate}
            >
              Tạo chiến dịch mới
            </Button>
          )}
        </Space>
      </div>

      {/* Filter Bar */}
      <Card
        style={{
          background: themeMode === 'dark' ? '#111827' : '#ffffff',
          border: `1px solid ${token.colorBorderSecondary}`,
          marginBottom: '20px',
          borderRadius: '8px',
        }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Tìm kiếm chiến dịch (Tên, Slug, Mô tả)..."
              prefix={<SearchOutlined style={{ color: '#aaa' }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              style={{ width: '100%' }}
              options={[
                { value: 'ALL', label: 'Tất cả trạng thái' },
                { value: 'ACTIVE', label: 'Đang hoạt động (ACTIVE)' },
                { value: 'ENDED', label: 'Đã kết thúc (ENDED)' },
                { value: 'ARCHIVED', label: 'Lưu trữ (ARCHIVED)' },
              ]}
            />
          </Col>
          <Col xs={24} sm={24} md={8} className="text-right">
            <Text type="secondary" className="tabular-nums">
              Hiển thị <strong>{filteredCampaigns.length}</strong> chiến dịch
            </Text>
          </Col>
        </Row>
      </Card>

      {/* Campaign Cards / Table */}
      <Table
        columns={columns}
        dataSource={filteredCampaigns}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (t) => `Tổng số: ${t} chiến dịch`,
        }}
        className="antd-custom-table"
      />

      {/* Create / Edit Campaign Modal */}
      <Modal
        title={
          <div className="font-bold text-lg">
            {editingCampaign ? 'Chỉnh sửa chiến dịch NYC' : 'Tạo chiến dịch NYC mới'}
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={720}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onFinishFailed={(errorInfo) => {
            console.error('Campaign form validation failed:', errorInfo);
            message.error('Vui lòng kiểm tra lại các thông tin bắt buộc (Tên chiến dịch, Điểm chạm, Ưu đãi)');
          }}
          className="mt-4"
        >
          <Tabs
            defaultActiveKey="info"
            className="campaign-minimal-tabs"
            items={[
              {
                key: 'info',
                label: (
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <SettingOutlined className="text-slate-500" /> Thông tin
                  </span>
                ),
                children: (
                  <div className="pt-2 space-y-4">
                    <Row gutter={16}>
                      <Col span={14}>
                        <Form.Item
                          name="name"
                          label="Tên chiến dịch"
                          rules={[{ required: true, message: 'Vui lòng nhập tên chiến dịch' }]}
                        >
                          <Input placeholder="VD: Chiến dịch NYC Tri ân Tháng 8" />
                        </Form.Item>
                      </Col>
                      <Col span={10}>
                        <Form.Item
                          name="slug"
                          label="Slug (Đường dẫn)"
                          tooltip="Tùy chọn. Nếu để trống hệ thống sẽ tự sinh từ tên."
                        >
                          <Input placeholder="VD: tri-an-thang-8" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={14}>
                        <Form.Item name="dates" label="Thời gian diễn ra">
                          <RangePicker
                            style={{ width: '100%' }}
                            format="DD/MM/YYYY"
                            placeholder={['Ngày bắt đầu', 'Ngày kết thúc']}
                          />
                        </Form.Item>
                      </Col>
                      {editingCampaign && (
                        <Col span={10}>
                          <Form.Item name="status" label="Trạng thái">
                            <Select
                              options={[
                                { value: 'ACTIVE', label: 'ACTIVE (Hoạt động)' },
                                { value: 'ENDED', label: 'ENDED (Đã kết thúc)' },
                                { value: 'ARCHIVED', label: 'ARCHIVED (Lưu trữ)' },
                              ]}
                            />
                          </Form.Item>
                        </Col>
                      )}
                    </Row>

                    <Form.Item name="description" label="Mô tả chiến dịch">
                      <Input.TextArea rows={2} placeholder="Mô tả ngắn gọn về mục tiêu và quy định của chiến dịch..." />
                    </Form.Item>

                    <Form.Item
                      name="assignedStaffIds"
                      label={
                        <span className="inline-flex items-center gap-1.5">
                          <TeamOutlined className="text-blue-500" />
                          <span>Thành viên được phép truy cập (Team Booker)</span>
                        </span>
                      }
                      tooltip="Chọn các nhân sự thuộc Team Booker được phép xem và thao tác trên chiến dịch này. Nếu để trống, tất cả nhân sự đều xem được."
                    >
                      <Select
                        mode="multiple"
                        allowClear
                        placeholder="Chừa trống = Công Khai (Tất cả nhân sự xem được)"
                        style={{ width: '100%' }}
                        tagRender={(props) => {
                          const { label, closable, onClose } = props;
                          const cleanLabel = typeof label === 'string' ? label.split('(')[0].trim() : label;
                          return (
                            <Tag
                              color="blue"
                              closable={closable}
                              onClose={onClose}
                              style={{ marginRight: 4 }}
                              className="rounded-md font-medium text-xs py-0.5 px-2 inline-flex items-center gap-1"
                            >
                              <UserOutlined className="text-blue-500 text-xs" />
                              <span>{cleanLabel}</span>
                            </Tag>
                          );
                        }}
                        options={staffList.map((s) => ({
                          value: s.id,
                          label: `${s.displayName || s.username} (${s.username})`,
                        }))}
                      />
                    </Form.Item>
                  </div>
                ),
              },
              {
                key: 'touchpoints',
                label: (
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <EnvironmentOutlined className="text-rose-500 text-base" /> Điểm chạm
                  </span>
                ),
                children: (
                  <div className="pt-2">
                    <Form.List name="touchpoints">
                      {(fields, { add, remove }) => (
                        <div>
                          {fields.length > 0 && (
                            <div className="flex items-center gap-2 px-1 py-1.5 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                              <div className="flex-1">Tên điểm chạm</div>
                              <div className="w-20 text-center">Từ ngày</div>
                              <div className="w-20 text-center">Đến ngày</div>
                              <div className="w-[110px] text-center">Màu sắc</div>
                              <div className="w-8 text-center">Xóa</div>
                            </div>
                          )}
                          <div className="space-y-2">
                            {fields.map(({ key, name, ...restField }) => (
                              <div key={key} className="flex items-center gap-2 py-0.5">
                                <div className="flex-1">
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'label']}
                                    rules={[{ required: true, message: 'Nhập tên' }]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <Input placeholder="Tên chạm (VD: Chạm D1)" />
                                  </Form.Item>
                                </div>
                                <div className="w-20">
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'daysMin']}
                                    rules={[{ required: true, message: 'Nhập ngày' }]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <InputNumber min={0} placeholder="D+" style={{ width: '100%' }} />
                                  </Form.Item>
                                </div>
                                <div className="w-20">
                                  <Form.Item {...restField} name={[name, 'daysMax']} style={{ marginBottom: 0 }}>
                                    <InputNumber min={0} placeholder="D+" style={{ width: '100%' }} />
                                  </Form.Item>
                                </div>
                                <div className="w-[110px] flex justify-center">
                                  <Form.Item {...restField} name={[name, 'color']} style={{ marginBottom: 0 }}>
                                    <GoogleSheetColorPicker size="small" />
                                  </Form.Item>
                                </div>
                                <div className="w-8 flex justify-center">
                                  <Button
                                    type="text"
                                    danger
                                    icon={<MinusCircleOutlined />}
                                    onClick={() => remove(name)}
                                  />
                                </div>
                              </div>
                            ))}
                            <Button
                              type="dashed"
                              onClick={() => add({ color: '#3b82f6', daysMin: 1 })}
                              block
                              icon={<PlusOutlined />}
                              className="rounded-xl h-10 border-dashed mt-2"
                            >
                              Thêm điểm chạm mới
                            </Button>
                          </div>
                        </div>
                      )}
                    </Form.List>
                  </div>
                ),
              },
              {
                key: 'promotions',
                label: (
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <GiftOutlined className="text-amber-500 text-base" /> Ưu đãi
                  </span>
                ),
                children: (
                  <div className="pt-2">
                    <Form.List name="promotions">
                      {(fields, { add, remove }) => (
                        <div>
                          {fields.length > 0 && (
                            <div className="flex items-center gap-2 px-1 py-1.5 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                              <div className="flex-1">Tên ưu đãi</div>
                              <div className="w-36 text-left">Loại ưu đãi</div>
                              <div className="w-24 text-center">Giá trị</div>
                              <div className="w-28 text-left">Mã voucher</div>
                              <div className="w-8 text-center">Xóa</div>
                            </div>
                          )}
                          <div className="space-y-2">
                            {fields.map(({ key, name, ...restField }) => (
                              <div key={key} className="flex items-center gap-2 py-0.5">
                                <div className="flex-1">
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'name']}
                                    rules={[{ required: true, message: 'Nhập tên' }]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <Input placeholder="Tên ưu đãi (VD: Giảm 50%)" />
                                  </Form.Item>
                                </div>
                                <div className="w-36">
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'type']}
                                    rules={[{ required: true, message: 'Chọn loại' }]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <Select
                                      options={[
                                        { value: 'PERCENT_DISCOUNT', label: 'Giảm %' },
                                        { value: 'FIXED_DISCOUNT', label: 'Giảm số tiền' },
                                        { value: 'FREE_SERVICE', label: 'Tặng dịch vụ' },
                                        { value: 'FREE_PRODUCT', label: 'Tặng sản phẩm' },
                                      ]}
                                    />
                                  </Form.Item>
                                </div>
                                <div className="w-24">
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'value']}
                                    rules={[{ required: true, message: 'Nhập giá trị' }]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <InputNumber min={0} placeholder="Giá trị" style={{ width: '100%' }} />
                                  </Form.Item>
                                </div>
                                <div className="w-28">
                                  <Form.Item {...restField} name={[name, 'code']} style={{ marginBottom: 0 }}>
                                    <Input placeholder="Mã Code" />
                                  </Form.Item>
                                </div>
                                <div className="w-8 flex justify-center">
                                  <Button
                                    type="text"
                                    danger
                                    icon={<MinusCircleOutlined />}
                                    onClick={() => remove(name)}
                                  />
                                </div>
                              </div>
                            ))}
                            <Button
                              type="dashed"
                              onClick={() => add({ type: 'PERCENT_DISCOUNT', value: 50 })}
                              block
                              icon={<PlusOutlined />}
                              className="rounded-xl h-10 border-dashed mt-2"
                            >
                              Thêm ưu đãi mới
                            </Button>
                          </div>
                        </div>
                      )}
                    </Form.List>
                  </div>
                ),
              },
            ]}
          />

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" onClick={() => form.submit()} loading={submitting}>
              {editingCampaign ? 'Cập nhật chiến dịch' : 'Tạo chiến dịch'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
