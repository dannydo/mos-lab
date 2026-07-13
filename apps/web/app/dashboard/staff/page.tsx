'use client';

import '../../suppress-warnings';
import React, { useEffect, useState, useCallback } from 'react';
import {
  Table,
  Button,
  Input,
  Modal,
  Form,
  Select,
  DatePicker,
  Switch,
  Tag,
  Card,
  Descriptions,
  Divider,
  Drawer,
  Space,
  Typography,
  message,
  theme,
  Row,
  Col,
  Avatar,
  Badge,
  Tooltip,
  Popconfirm,
  Checkbox,
  Tabs
} from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  EyeOutlined,
  MailOutlined,
  PhoneOutlined,
  CalendarOutlined,
  SolutionOutlined,
  InfoCircleOutlined,
  LockOutlined,
  EnvironmentOutlined,
  KeyOutlined,
  BgColorsOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../../../context/ThemeContext';
import api from '../../../lib/api';
import { Staff } from '@mos-lab/shared';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface Role {
  key: string;
  name: string;
  color: string;
  viewKPI: boolean;
  viewTeamKPI: boolean;
  manageStaff: boolean;
  isSystem: boolean;
  description?: string;
  createdAt: string;
}

const PRESET_COLORS = [
  { value: 'red', label: 'Red (Admin)' },
  { value: 'purple', label: 'Purple (Manager)' },
  { value: 'blue', label: 'Blue (Operations)' },
  { value: 'cyan', label: 'Cyan (Customer Care)' },
  { value: 'gold', label: 'Gold (Leader)' },
  { value: 'orange', label: 'Orange (Sales)' },
  { value: 'green', label: 'Green' },
  { value: 'pink', label: 'Pink' },
  { value: 'geekblue', label: 'Geek Blue' },
  { value: 'magenta', label: 'Magenta' },
  { value: 'lime', label: 'Lime' }
];

export default function StaffPage() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  const [activeTab, setActiveTab] = useState<string>('staff');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [legacyStaffList, setLegacyStaffList] = useState<{ id: number; name: string; phone?: string | null; email?: string | null }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const saved = localStorage.getItem('mos_staff_pageSize');
    if (saved) {
      setPageSize(Number(saved));
    }
  }, []);

  const fetchLegacyStaff = useCallback(async () => {
    try {
      const res = await api.get('/staff/legacy');
      setLegacyStaffList(res.data);
    } catch (err) {
      console.error('Fetch legacy staff error:', err);
    }
  }, []);

  useEffect(() => {
    fetchLegacyStaff();
  }, [fetchLegacyStaff]);

  useEffect(() => {
    const stored = localStorage.getItem('mos_user');
    if (stored) {
      setCurrentUser(JSON.parse(stored));
    }
  }, []);

  // Staff Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Staff Add/Edit Modal state
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [staffForm] = Form.useForm();
  const [staffSubmitting, setStaffSubmitting] = useState(false);

  // Staff Detail Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  // Role Add/Edit Modal state
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleForm] = Form.useForm();
  const [roleSubmitting, setRoleSubmitting] = useState(false);

  // Fetch roles list
  const fetchRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const res = await api.get('/roles');
      setRoles(res.data);
    } catch (err: any) {
      console.error('Fetch roles error:', err);
      message.error('Không thể tải danh sách vai trò');
    } finally {
      setRolesLoading(false);
    }
  }, []);

  // Fetch staff list
  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (filterRole !== 'all') params.role = filterRole;
      if (filterStatus !== 'all') params.isActive = filterStatus;

      const res = await api.get('/staff', { params });
      setStaffList(res.data);
    } catch (err: any) {
      console.error('Fetch staff error:', err);
      message.error(err.response?.data?.message || 'Không thể tải danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterRole, filterStatus]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    if (activeTab === 'staff') {
      fetchStaff();
    }
  }, [activeTab, fetchStaff]);

  // Open Staff Modal for Create or Edit
  const openStaffModal = (staff: Staff | null = null) => {
    setEditingStaff(staff);
    if (staff) {
      staffForm.setFieldsValue({
        username: staff.username,
        displayName: staff.displayName,
        role: staff.role,
        isActive: staff.isActive,
        email: staff.email,
        phone: staff.phone,
        joinedAt: staff.joinedAt ? dayjs(staff.joinedAt) : null,
        birthDate: staff.birthDate ? dayjs(staff.birthDate) : null,
        gender: staff.gender,
        address: staff.address,
        emergencyContact: staff.emergencyContact,
        emergencyPhone: staff.emergencyPhone,
        notes: staff.notes,
        password: '',
        legacyStaffId: staff.legacyStaffId || null
      });
    } else {
      staffForm.resetFields();
      staffForm.setFieldsValue({
        role: roles[0]?.key || 'telesales',
        isActive: true,
        gender: 'Other',
        legacyStaffId: null
      });
    }
    setIsStaffModalOpen(true);
  };

  // Submit Staff Modal
  const handleStaffSubmit = async (values: any) => {
    setStaffSubmitting(true);
    try {
      const payload = {
        ...values,
        joinedAt: values.joinedAt ? values.joinedAt.format('YYYY-MM-DD') : null,
        birthDate: values.birthDate ? values.birthDate.format('YYYY-MM-DD') : null,
      };

      if (editingStaff && !payload.password) {
        delete payload.password;
      }

      if (editingStaff) {
        await api.put(`/staff/${editingStaff.id}`, payload);
        message.success(`Cập nhật nhân viên ${payload.displayName} thành công`);
      } else {
        await api.post('/staff', payload);
        message.success(`Tạo nhân viên ${payload.displayName} thành công`);
      }

      setIsStaffModalOpen(false);
      fetchStaff();
    } catch (err: any) {
      console.error('Submit staff error:', err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng kiểm tra lại thông tin');
    } finally {
      setStaffSubmitting(false);
    }
  };

  // Toggle Active/Inactive Switch
  const handleToggleActive = async (staff: Staff, checked: boolean) => {
    try {
      await api.put(`/staff/${staff.id}`, { isActive: checked });
      message.success(`Đã ${checked ? 'kích hoạt' : 'vô hiệu hóa'} tài khoản ${staff.displayName}`);
      fetchStaff();
    } catch (err: any) {
      console.error('Toggle status error:', err);
      message.error(err.response?.data?.message || 'Không thể cập nhật trạng thái');
    }
  };

  // Delete staff member
  const handleDeleteStaff = async (id: number) => {
    try {
      const res = await api.delete(`/staff/${id}`);
      message.success(res.data.message || 'Xóa nhân viên thành công');
      fetchStaff();
    } catch (err: any) {
      console.error('Delete staff error:', err);
      message.error(err.response?.data?.message || 'Không thể xóa nhân viên');
    }
  };

  // Impersonate user (Login as)
  const handleImpersonate = async (userId: number, displayName: string) => {
    try {
      const currentToken = localStorage.getItem('mos_token');
      const currentUserStr = localStorage.getItem('mos_user');

      const res = await api.post('/auth/impersonate', { userId });
      const { token, user } = res.data;

      if (currentToken && currentUserStr) {
        localStorage.setItem('mos_original_token', currentToken);
        localStorage.setItem('mos_original_user', currentUserStr);
      }

      localStorage.setItem('mos_token', token);
      localStorage.setItem('mos_user', JSON.stringify(user));

      message.success(`Đang đăng nhập giả lập dưới quyền ${displayName}`);
      window.location.href = '/dashboard/customers';
    } catch (err: any) {
      console.error('Impersonate error:', err);
      const errMsg = err.response?.data?.message || 'Đăng nhập giả lập thất bại';
      message.error(errMsg);
    }
  };

  // Open Staff Details Drawer
  const openStaffDetails = (staff: Staff) => {
    setSelectedStaff(staff);
    setIsDrawerOpen(true);
  };

  // Open Role Modal for Create or Edit
  const openRoleModal = (role: Role | null = null) => {
    setEditingRole(role);
    if (role) {
      roleForm.setFieldsValue({
        key: role.key,
        name: role.name,
        color: role.color,
        viewKPI: role.viewKPI,
        viewTeamKPI: role.viewTeamKPI,
        manageStaff: role.manageStaff,
        description: role.description
      });
    } else {
      roleForm.resetFields();
      roleForm.setFieldsValue({
        color: 'default',
        viewKPI: false,
        viewTeamKPI: false,
        manageStaff: false
      });
    }
    setIsRoleModalOpen(true);
  };

  // Submit Role Modal
  const handleRoleSubmit = async (values: any) => {
    setRoleSubmitting(true);
    try {
      if (editingRole) {
        await api.put(`/roles/${editingRole.key}`, values);
        message.success(`Cập nhật vai trò "${values.name}" thành công`);
      } else {
        await api.post('/roles', values);
        message.success(`Tạo vai trò "${values.name}" thành công`);
      }
      setIsRoleModalOpen(false);
      fetchRoles();
      fetchStaff(); // refresh staff to reflect any role tag name updates
    } catch (err: any) {
      console.error('Submit role error:', err);
      message.error(err.response?.data?.message || 'Không thể lưu vai trò. Vui lòng kiểm tra lại.');
    } finally {
      setRoleSubmitting(false);
    }
  };

  // Delete Role
  const handleDeleteRole = async (key: string) => {
    try {
      const res = await api.delete(`/roles/${key}`);
      message.success(res.data.message || 'Xóa vai trò thành công');
      fetchRoles();
    } catch (err: any) {
      console.error('Delete role error:', err);
      message.error(err.response?.data?.message || 'Không thể xóa vai trò này');
    }
  };

  // Table columns for Staff Directory
  const staffColumns = [
    {
      title: 'Nhân viên',
      key: 'name',
      render: (_: any, record: Staff) => {
        const initials = record.displayName
          ? record.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
          : '??';
        const isOnline = !!(record.lastActiveAt && dayjs().diff(dayjs(record.lastActiveAt), 'minute') < 5);
        return (
          <Space>
            <Badge dot={isOnline} status="success" offset={[-2, 28]}>
              <Avatar 
                src={record.avatarUrl || undefined}
                icon={!record.avatarUrl ? <UserOutlined /> : undefined}
                style={{ 
                  backgroundColor: token.colorPrimary, 
                  color: '#000',
                  fontWeight: '600'
                }}
              >
                {initials}
              </Avatar>
            </Badge>
            <div>
              <Text style={{ fontWeight: 600, display: 'block', color: token.colorText }}>
                {record.displayName}
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.username}
              </Text>
            </div>
          </Space>
        );
      }
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      render: (roleKey: string) => {
        const matched = roles.find(r => r.key === roleKey);
        return (
          <Tag color={matched?.color || 'default'} style={{ fontWeight: '500', borderRadius: '4px' }}>
            {matched?.name || roleKey}
          </Tag>
        );
      }
    },
    {
      title: 'Liên hệ',
      key: 'contact',
      render: (_: any, record: Staff) => (
        <div style={{ fontSize: '13px' }}>
          {record.phone ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PhoneOutlined style={{ color: '#888' }} />
              <Text>{record.phone}</Text>
            </div>
          ) : null}
          {record.email ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <MailOutlined style={{ color: '#888' }} />
              <Text type="secondary" style={{ fontSize: '12px' }}>{record.email}</Text>
            </div>
          ) : (
            record.phone ? null : <Text type="secondary" italic style={{ fontSize: '12px' }}>Chưa cập nhật</Text>
          )}
        </div>
      )
    },
    {
      title: 'Ngày vào làm',
      dataIndex: 'joinedAt',
      key: 'joinedAt',
      render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY') : <Text type="secondary" italic style={{ fontSize: '12px' }}>Chưa thiết lập</Text>
    },
    {
      title: 'Đăng nhập cuối',
      key: 'lastLogin',
      render: (_: any, record: Staff) => {
        if (!record.lastLoginAt) {
          return (
            <Text type="secondary" italic style={{ fontSize: '12px' }}>
              Chưa đăng nhập
            </Text>
          );
        }

        const lastLogin = dayjs(record.lastLoginAt);
        const lastActive = record.lastActiveAt ? dayjs(record.lastActiveAt) : null;
        const now = dayjs();
        
        let lastLoginStr = '';
        if (lastLogin.isSame(now, 'day')) {
          lastLoginStr = `Hôm nay ${lastLogin.format('HH:mm')}`;
        } else if (lastLogin.isSame(now.subtract(1, 'day'), 'day')) {
          lastLoginStr = `Hôm qua ${lastLogin.format('HH:mm')}`;
        } else {
          lastLoginStr = lastLogin.format('DD/MM/YYYY HH:mm');
        }

        // Relative time for active status
        const isOnline = !!(lastActive && now.diff(lastActive, 'minute') < 5);
        let activeStatusText = '';
        if (isOnline) {
          activeStatusText = 'Đang hoạt động';
        } else if (lastActive) {
          const diffMin = now.diff(lastActive, 'minute');
          if (diffMin < 60) {
            activeStatusText = `${diffMin} phút trước`;
          } else {
            const diffHr = now.diff(lastActive, 'hour');
            if (diffHr < 24) {
              activeStatusText = `${diffHr} giờ trước`;
            } else {
              const diffDay = now.diff(lastActive, 'day');
              activeStatusText = `${diffDay} ngày trước`;
            }
          }
        }

        return (
          <div style={{ fontSize: '13px' }}>
            <div style={{ fontWeight: '500', color: token.colorText }}>
              {lastLoginStr}
            </div>
            {isOnline ? (
              <Tag color="success" style={{ fontSize: '10px', marginTop: '4px', height: '18px', lineHeight: '16px' }}>
                Online
              </Tag>
            ) : activeStatusText ? (
              <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: '2px' }}>
                Hoạt động: {activeStatusText}
              </Text>
            ) : null}
          </div>
        );
      }
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 150,
      render: (_: any, record: Staff) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
          <Switch
            checked={record.isActive}
            onChange={(checked) => handleToggleActive(record, checked)}
            size="small"
          />
          <Badge status={record.isActive ? 'success' : 'default'} text={record.isActive ? 'Active' : 'Locked'} />
        </div>
      )
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 180,
      render: (_: any, record: Staff) => {
        const isAdmin = currentUser?.role === 'admin';
        const isTargetAdmin = record.role === 'admin';
        const canImpersonate = isAdmin && !isTargetAdmin && record.isActive;

        return (
          <Space size="middle">
            {canImpersonate && (
              <Tooltip title={`Đăng nhập dưới quyền ${record.displayName}`}>
                <Button
                  type="text"
                  icon={<KeyOutlined style={{ color: '#52c41a' }} />}
                  onClick={() => handleImpersonate(record.id, record.displayName)}
                />
              </Tooltip>
            )}
            <Tooltip title="Xem thông tin chi tiết">
              <Button
                type="text"
                icon={<EyeOutlined style={{ color: '#D4A84B' }} />}
                onClick={() => openStaffDetails(record)}
              />
            </Tooltip>
            <Tooltip title="Chỉnh sửa">
              <Button
                type="text"
                icon={<EditOutlined style={{ color: '#1890ff' }} />}
                onClick={() => openStaffModal(record)}
              />
            </Tooltip>
            <Tooltip title="Xóa nhân viên">
              <Popconfirm
                title="Xóa nhân viên"
                description={`Bạn có chắc chắn muốn xóa nhân viên "${record.displayName}"?`}
                onConfirm={() => handleDeleteStaff(record.id)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Button
                  type="text"
                  icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />}
                />
              </Popconfirm>
            </Tooltip>
          </Space>
        );
      }
    }
  ];

  // Table columns for Roles Management
  const roleColumns = [
    {
      title: 'Vai trò',
      key: 'role',
      render: (_: any, record: Role) => (
        <Space>
          <Tag color={record.color} style={{ fontWeight: '600', padding: '4px 8px', borderRadius: '4px' }}>
            {record.name}
          </Tag>
          {record.isSystem && (
            <Tooltip title="Vai trò mặc định của hệ thống, không thể xóa">
              <Badge status="processing" text="Hệ thống" style={{ fontSize: '11px', color: '#888' }} />
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: 'Mã (Key)',
      dataIndex: 'key',
      key: 'key',
      render: (key: string) => <code style={{ fontSize: '12px', background: themeMode === 'dark' ? '#222' : '#f5f5f5', padding: '2px 6px', borderRadius: '4px' }}>{key}</code>
    },
    {
      title: 'Quyền hạn (Permissions)',
      key: 'permissions',
      render: (_: any, record: Role) => (
        <Space wrap size={[4, 8]}>
          {record.viewKPI && <Tag color="blue" bordered={false}>Xem KPI cá nhân</Tag>}
          {record.viewTeamKPI && <Tag color="purple" bordered={false}>Xem KPI nhóm</Tag>}
          {record.manageStaff && <Tag color="red" bordered={false}>Quản lý nhân sự</Tag>}
          {!record.viewKPI && !record.viewTeamKPI && !record.manageStaff && (
            <Text type="secondary" italic style={{ fontSize: '12px' }}>Không có quyền đặc biệt</Text>
          )}
        </Space>
      )
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string) => desc || <Text type="secondary" italic style={{ fontSize: '12px' }}>Không có mô tả</Text>
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      render: (_: any, record: Role) => (
        <Space size="middle">
          <Tooltip title="Chỉnh sửa vai trò & quyền">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#1890ff' }} />}
              onClick={() => openRoleModal(record)}
            />
          </Tooltip>
          <Tooltip title={record.isSystem ? "Không thể xóa vai trò mặc định của hệ thống" : "Xóa vai trò"}>
            <Popconfirm
              title="Xóa vai trò"
              description={`Bạn có chắc chắn muốn xóa vai trò "${record.name}"?`}
              onConfirm={() => handleDeleteRole(record.key)}
              disabled={record.isSystem}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                danger
                disabled={record.isSystem}
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '4px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <Title level={3} style={{ color: '#D4A84B', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SolutionOutlined /> Quản Lý Nhân Sự & Vai Trò (HR)
          </Title>
          <Text type="secondary">
            Cấu hình nhân sự, quản lý nhóm quyền, liên kết Google Auth và cập nhật thông tin nội bộ.
          </Text>
        </div>
        <div>
          {activeTab === 'staff' ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openStaffModal(null)}
              style={{
                background: '#D4A84B',
                borderColor: '#D4A84B',
                color: '#000',
                fontWeight: '600',
                borderRadius: '6px'
              }}
            >
              Thêm Nhân Viên
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openRoleModal(null)}
              style={{
                background: '#D4A84B',
                borderColor: '#D4A84B',
                color: '#000',
                fontWeight: '600',
                borderRadius: '6px'
              }}
            >
              Thêm Vai Trò
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key)}
        items={[
          {
            key: 'staff',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserOutlined />
                Danh sách nhân sự
              </span>
            ),
            children: (
              <>
                {/* Search & Filters */}
                <Card
                  style={{
                    marginBottom: '20px',
                    background: themeMode === 'dark' ? '#141414' : token.colorBgContainer,
                    border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#f0f0f0'}`,
                    borderRadius: '8px'
                  }}
                >
                  <Row gutter={16}>
                    <Col xs={24} sm={8} md={10}>
                      <Input
                        placeholder="Tìm theo tên hoặc email/username đăng nhập..."
                        prefix={<SearchOutlined style={{ color: '#888' }} />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        allowClear
                        style={{ width: '100%' }}
                      />
                    </Col>
                    <Col xs={12} sm={8} md={6}>
                      <Select
                        style={{ width: '100%' }}
                        placeholder="Lọc theo vai trò"
                        value={filterRole}
                        onChange={(val) => setFilterRole(val)}
                      >
                        <Option value="all">Tất cả vai trò</Option>
                        {roles.map((r) => (
                          <Option key={r.key} value={r.key}>{r.name}</Option>
                        ))}
                      </Select>
                    </Col>
                    <Col xs={12} sm={8} md={6}>
                      <Select
                        style={{ width: '100%' }}
                        placeholder="Lọc theo trạng thái"
                        value={filterStatus}
                        onChange={(val) => setFilterStatus(val)}
                      >
                        <Option value="all">Tất cả trạng thái</Option>
                        <Option value="true">Đang hoạt động (Active)</Option>
                        <Option value="false">Đã khóa (Locked)</Option>
                      </Select>
                    </Col>
                    <Col xs={24} sm={24} md={2} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button 
                        onClick={() => {
                          setSearchQuery('');
                          setFilterRole('all');
                          setFilterStatus('all');
                        }}
                        style={{ width: '100%' }}
                      >
                        Clear
                      </Button>
                    </Col>
                  </Row>
                </Card>

                {/* Staff Table */}
                <Table
                  dataSource={staffList}
                  columns={staffColumns}
                  rowKey="id"
                  loading={loading}
                  pagination={{
                    current: currentPage,
                    pageSize: pageSize,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    onChange: (page, size) => {
                      setCurrentPage(page);
                      setPageSize(size);
                      localStorage.setItem('mos_staff_pageSize', String(size));
                    }
                  }}
                  style={{
                    background: themeMode === 'dark' ? '#141414' : '#fff'
                  }}
                  className="antd-custom-table"
                />
              </>
            )
          },
          {
            key: 'roles',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyOutlined />
                Vai trò hệ thống & Quyền
              </span>
            ),
            children: (
              <Table
                dataSource={roles}
                columns={roleColumns}
                rowKey="key"
                loading={rolesLoading}
                pagination={false}
                style={{
                  background: themeMode === 'dark' ? '#141414' : '#fff'
                }}
                className="antd-custom-table"
              />
            )
          }
        ]}
      />

      {/* Staff Add/Edit Modal */}
      <Modal
        title={
          <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#D4A84B' }}>
            {editingStaff ? `Chỉnh sửa nhân viên: ${editingStaff.displayName}` : 'Thêm Nhân Viên Mới'}
          </Text>
        }
        open={isStaffModalOpen}
        onCancel={() => setIsStaffModalOpen(false)}
        footer={null}
        width={700}
        destroyOnHidden
        style={{
          background: themeMode === 'dark' ? '#141414' : '#fff'
        }}
      >
        <Form
          form={staffForm}
          layout="vertical"
          onFinish={handleStaffSubmit}
          style={{ marginTop: '20px' }}
          autoComplete="off"
        >
          <StaffTabsContent 
            themeMode={themeMode}
            token={token}
            editingStaff={editingStaff}
            submitting={staffSubmitting}
            form={staffForm}
            roles={roles}
            onCancel={() => setIsStaffModalOpen(false)}
            legacyStaffList={legacyStaffList}
          />
        </Form>
      </Modal>

      {/* Role Add/Edit Modal */}
      <Modal
        title={
          <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#D4A84B' }}>
            {editingRole ? `Cấu hình nhóm quyền: ${editingRole.name}` : 'Thêm Nhóm Quyền / Vai Trò Mới'}
          </Text>
        }
        open={isRoleModalOpen}
        onCancel={() => setIsRoleModalOpen(false)}
        footer={null}
        width={600}
        destroyOnHidden
        style={{
          background: themeMode === 'dark' ? '#141414' : '#fff'
        }}
      >
        <Form
          form={roleForm}
          layout="vertical"
          onFinish={handleRoleSubmit}
          style={{ marginTop: '20px' }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="key"
                label={
                  <Space>
                    <Text style={{ color: token.colorText }}>Mã định danh (Key)</Text>
                    <Tooltip title="Chuỗi định danh dạng viết liền không dấu, dùng để xác định vai trò trong hệ thống (ví dụ: ccc-leader, marketing)">
                      <InfoCircleOutlined style={{ color: '#888' }} />
                    </Tooltip>
                  </Space>
                }
                rules={[
                  { required: true, message: 'Vui lòng nhập mã định danh!' },
                  { pattern: /^[a-z0-9-_]+$/, message: 'Mã định danh chỉ gồm chữ thường viết liền, gạch ngang, gạch dưới!' }
                ]}
              >
                <Input placeholder="ví dụ: admin-assistant" disabled={!!editingRole} prefix={<KeyOutlined style={{ color: '#888' }} />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label={<Text style={{ color: token.colorText }}>Tên hiển thị</Text>}
                rules={[{ required: true, message: 'Vui lòng nhập tên vai trò!' }]}
              >
                <Input placeholder="ví dụ: Trợ lý Admin" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="color"
                label={
                  <Space>
                    <Text style={{ color: token.colorText }}>Màu sắc hiển thị (Tag color)</Text>
                    <BgColorsOutlined style={{ color: '#888' }} />
                  </Space>
                }
                rules={[{ required: true, message: 'Vui lòng chọn màu hiển thị!' }]}
              >
                <Select placeholder="Chọn màu tag">
                  {PRESET_COLORS.map((c) => (
                    <Option key={c.value} value={c.value}>
                      <Badge color={c.value} text={c.label} />
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label={<Text style={{ color: token.colorText }}>Mô tả vai trò</Text>}
          >
            <TextArea rows={2} placeholder="Nhiệm vụ, phạm vi công việc của nhóm quyền..." />
          </Form.Item>

          <Card
            title={
              <Space>
                <SafetyCertificateOutlined style={{ color: '#D4A84B' }} />
                <Text style={{ fontSize: '14px', fontWeight: 'bold' }}>Phân Quyền Hệ Thống (Permissions)</Text>
              </Space>
            }
            size="small"
            style={{
              background: themeMode === 'dark' ? '#1c1c1c' : '#fafafa',
              border: `1px solid ${themeMode === 'dark' ? '#2d2d2d' : '#e8e8e8'}`,
              marginBottom: '20px'
            }}
          >
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Form.Item name="viewKPI" valuePropName="checked" style={{ marginBottom: 4 }}>
                  <Checkbox disabled={editingRole?.key === 'admin'}>
                    <Text style={{ fontWeight: 500 }}>Xem báo cáo KPI cá nhân (`viewKPI`)</Text>
                    <Paragraph type="secondary" style={{ fontSize: '12px', margin: 0 }}>Cho phép xem hiệu suất kế hoạch cuộc gọi, lịch hẹn của riêng tài khoản này.</Paragraph>
                  </Checkbox>
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="viewTeamKPI" valuePropName="checked" style={{ marginBottom: 4 }}>
                  <Checkbox disabled={editingRole?.key === 'admin'}>
                    <Text style={{ fontWeight: 500 }}>Xem báo cáo KPI Nhóm (`viewTeamKPI`)</Text>
                    <Paragraph type="secondary" style={{ fontSize: '12px', margin: 0 }}>Cho phép xem bảng xếp hạng (leaderboard) và hiệu suất KPI của cả đội nhóm.</Paragraph>
                  </Checkbox>
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="manageStaff" valuePropName="checked" style={{ marginBottom: 4 }}>
                  <Checkbox disabled={editingRole?.key === 'admin'}>
                    <Text style={{ fontWeight: 500 }}>Quản lý Nhân sự & Vai trò (`manageStaff`)</Text>
                    <Paragraph type="secondary" style={{ fontSize: '12px', margin: 0 }}>Toàn quyền truy cập tab quản trị, thêm/sửa/xóa nhân viên, cấu hình nhóm quyền.</Paragraph>
                  </Checkbox>
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button onClick={() => setIsRoleModalOpen(false)}>Hủy</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={roleSubmitting}
              style={{
                background: '#D4A84B',
                borderColor: '#D4A84B',
                color: '#000',
                fontWeight: '600'
              }}
            >
              {editingRole ? 'Lưu thay đổi' : 'Tạo vai trò mới'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Staff Detail Drawer (HR Card) */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <SolutionOutlined style={{ color: '#D4A84B', fontSize: '20px' }} />
            <Text style={{ fontSize: '16px', fontWeight: 'bold', color: token.colorText }}>Hồ Sơ Nhân Sự Chi Tiết</Text>
          </div>
        }
        placement="right"
        width={550}
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        styles={{
          body: {
            background: themeMode === 'dark' ? '#141414' : '#fafafa',
            color: token.colorText,
            padding: '24px'
          },
          header: {
            background: themeMode === 'dark' ? '#1d1d1d' : '#fff',
            borderBottom: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#f0f0f0'}`
          }
        }}
      >
        {selectedStaff && (
          <div>
            {/* Header profile summary */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
              <Avatar
                size={80}
                src={selectedStaff.avatarUrl || undefined}
                icon={!selectedStaff.avatarUrl ? <UserOutlined /> : undefined}
                style={{
                  backgroundColor: token.colorPrimary,
                  color: '#000',
                  fontSize: '32px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(212, 168, 75, 0.25)'
                }}
              >
                {selectedStaff.displayName
                  ? selectedStaff.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                  : '??'}
              </Avatar>
              <div>
                <Title level={4} style={{ margin: 0, color: token.colorText }}>
                  {selectedStaff.displayName}
                </Title>
                <Paragraph type="secondary" style={{ margin: '4px 0 8px 0', fontSize: '14px' }}>
                  @{selectedStaff.username}
                </Paragraph>
                <Space>
                  <Tag color={roles.find(r => r.key === selectedStaff.role)?.color || 'default'}>
                    {roles.find(r => r.key === selectedStaff.role)?.name || selectedStaff.role}
                  </Tag>
                  <Tag color={selectedStaff.isActive ? 'success' : 'error'}>
                    {selectedStaff.isActive ? 'Đang hoạt động' : 'Tài khoản khóa'}
                  </Tag>
                </Space>
              </div>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            {/* General Info */}
            <Descriptions title={<Text style={{ color: '#D4A84B', fontSize: '15px', fontWeight: 'bold' }}>Thông tin cơ bản</Text>} column={1} bordered size="small" style={{ marginBottom: '24px' }}>
              <Descriptions.Item label="ID nhân sự">{selectedStaff.id}</Descriptions.Item>
              <Descriptions.Item label="Họ và tên">{selectedStaff.displayName}</Descriptions.Item>
              <Descriptions.Item label="Tên đăng nhập (Username)">
                <Space>
                  <Text>{selectedStaff.username}</Text>
                  <Tooltip title="Đây là tài khoản hoặc tiền tố email để đăng nhập qua Google Auth">
                    <InfoCircleOutlined style={{ color: '#888', cursor: 'pointer' }} />
                  </Tooltip>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Email liên hệ">{selectedStaff.email || <Text type="secondary" italic>Chưa khai báo</Text>}</Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">{selectedStaff.phone || <Text type="secondary" italic>Chưa khai báo</Text>}</Descriptions.Item>
              <Descriptions.Item label="Tài khoản Wings Lashes">
                {selectedStaff.legacyStaffId ? (
                  <Text style={{ fontWeight: '500', color: token.colorPrimary }}>
                    {legacyStaffList.find(s => s.id === selectedStaff.legacyStaffId)?.name || `ID: ${selectedStaff.legacyStaffId}`}
                  </Text>
                ) : (
                  <Text type="secondary" italic>Chưa liên kết (Tự động đối khớp bằng tên)</Text>
                )}
              </Descriptions.Item>
            </Descriptions>

            {/* HR specific data */}
            <Descriptions title={<Text style={{ color: '#D4A84B', fontSize: '15px', fontWeight: 'bold' }}>Thông tin nhân sự & Công việc</Text>} column={1} bordered size="small" style={{ marginBottom: '24px' }}>
              <Descriptions.Item label="Ngày bắt đầu làm việc">
                {selectedStaff.joinedAt ? (
                  <Space>
                    <CalendarOutlined style={{ color: '#888' }} />
                    <Text>{dayjs(selectedStaff.joinedAt).format('DD [tháng] MM, YYYY')}</Text>
                  </Space>
                ) : (
                  <Text type="secondary" italic>Chưa thiết lập</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">
                {selectedStaff.birthDate ? dayjs(selectedStaff.birthDate).format('DD/MM/YYYY') : <Text type="secondary" italic>Chưa thiết lập</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Giới tính">
                {selectedStaff.gender === 'Male' ? 'Nam' : selectedStaff.gender === 'Female' ? 'Nữ' : 'Khác'}
              </Descriptions.Item>
              <Descriptions.Item label="Địa chỉ">
                {selectedStaff.address ? (
                  <span style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <EnvironmentOutlined style={{ color: '#888', marginTop: '3px' }} />
                    <span>{selectedStaff.address}</span>
                  </span>
                ) : (
                  <Text type="secondary" italic>Chưa cập nhật</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo tài khoản">
                {dayjs(selectedStaff.createdAt).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
            </Descriptions>

            {/* Emergency Contact */}
            <Descriptions title={<Text style={{ color: '#D4A84B', fontSize: '15px', fontWeight: 'bold' }}>Liên hệ khẩn cấp</Text>} column={1} bordered size="small" style={{ marginBottom: '24px' }}>
              <Descriptions.Item label="Người liên hệ">
                {selectedStaff.emergencyContact || <Text type="secondary" italic>Chưa khai báo</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại liên hệ">
                {selectedStaff.emergencyPhone || <Text type="secondary" italic>Chưa khai báo</Text>}
              </Descriptions.Item>
            </Descriptions>

            {/* Notes */}
            {selectedStaff.notes && (
              <Card 
                title={<Text style={{ color: '#D4A84B', fontSize: '14px', fontWeight: 'bold' }}>Ghi chú nội bộ</Text>} 
                size="small"
                style={{ 
                  background: themeMode === 'dark' ? '#1c1c1c' : '#fff',
                  border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#e8e8e8'}`
                }}
              >
                <Text style={{ whiteSpace: 'pre-wrap' }}>{selectedStaff.notes}</Text>
              </Card>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}

// Subcomponent for organization tabs inside Add/Edit Modal
function StaffTabsContent({ 
  themeMode, 
  token, 
  editingStaff, 
  submitting, 
  form, 
  roles,
  onCancel,
  legacyStaffList
}: { 
  themeMode: string; 
  token: any; 
  editingStaff: Staff | null; 
  submitting: boolean; 
  form: any; 
  roles: Role[];
  onCancel: () => void;
  legacyStaffList: { id: number; name: string; phone?: string | null; email?: string | null }[];
}) {
  const [activeTab, setActiveTab] = useState('account');

  return (
    <div>
      {/* Custom simple visual tab headers */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#f0f0f0'}`, marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('account')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'account' ? '2px solid #D4A84B' : 'none',
            color: activeTab === 'account' ? '#D4A84B' : token.colorTextDescription,
            fontWeight: activeTab === 'account' ? 'bold' : 'normal',
            cursor: 'pointer'
          }}
        >
          Thông tin tài khoản
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'profile' ? '2px solid #D4A84B' : 'none',
            color: activeTab === 'profile' ? '#D4A84B' : token.colorTextDescription,
            fontWeight: activeTab === 'profile' ? 'bold' : 'normal',
            cursor: 'pointer'
          }}
        >
          Hồ sơ nhân sự (HR)
        </button>
      </div>

      {activeTab === 'account' ? (
        <div>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label={
                  <Space>
                    <Text style={{ color: token.colorText }}>Tên đăng nhập (Email / Prefix)</Text>
                    <Tooltip title="Nhập email Google của nhân viên (ví dụ: nguyenvan@gmail.com) hoặc phần tên trước dấu @ (ví dụ: nguyenvan) để liên kết Google Auth">
                      <InfoCircleOutlined style={{ color: '#888' }} />
                    </Tooltip>
                  </Space>
                }
                rules={[
                  { required: true, message: 'Vui lòng nhập tên đăng nhập!' },
                  { min: 3, message: 'Tên đăng nhập tối thiểu phải có 3 ký tự!' }
                ]}
              >
                <Input 
                  placeholder="nguyenvan@gmail.com hoặc nguyenvan" 
                  prefix={<UserOutlined style={{ color: '#888' }} />}
                  autoComplete="new-username"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="displayName"
                label={<Text style={{ color: token.colorText }}>Tên hiển thị</Text>}
                rules={[{ required: true, message: 'Vui lòng nhập tên hiển thị!' }]}
              >
                <Input placeholder="Nguyễn Văn A" autoComplete="off" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="role"
                label={<Text style={{ color: token.colorText }}>Vai trò hệ thống</Text>}
                rules={[{ required: true, message: 'Vui lòng chọn vai trò!' }]}
              >
                <Select placeholder="Chọn vai trò">
                  {roles.map((r) => (
                    <Option key={r.key} value={r.key}>{r.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="password"
                label={
                  <Space>
                    <Text style={{ color: token.colorText }}>Mật khẩu đăng nhập</Text>
                    <Tooltip title={editingStaff ? "Để trống nếu không muốn thay đổi mật khẩu đăng nhập trực tiếp" : "Mật khẩu cho đăng nhập thủ công bằng tài khoản. Không bắt buộc nếu chỉ dùng Google Auth."}>
                      <InfoCircleOutlined style={{ color: '#888' }} />
                    </Tooltip>
                  </Space>
                }
              >
                <Input.Password 
                  placeholder={editingStaff ? "Nhập mật khẩu mới để reset" : "Nhập mật khẩu tài khoản"} 
                  prefix={<LockOutlined style={{ color: '#888' }} />}
                  autoComplete="new-password"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="isActive"
                label={<Text style={{ color: token.colorText }}>Trạng thái tài khoản</Text>}
                valuePropName="checked"
                extra="Nhân viên được phép đăng nhập vào hệ thống CRM khi trạng thái hoạt động."
              >
                <Switch checkedChildren="Hoạt động" unCheckedChildren="Tạm khóa" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="legacyStaffId"
                label={
                  <Space>
                    <Text style={{ color: token.colorText }}>Liên kết Tài khoản Wings Lashes (Legacy)</Text>
                    <Tooltip title="Chọn tài khoản Wings Lashes để liên kết danh nghĩa Booker/KTV khi đặt lịch và thống kê doanh thu.">
                      <InfoCircleOutlined style={{ color: '#888' }} />
                    </Tooltip>
                  </Space>
                }
              >
                <Select placeholder="Chọn tài khoản Wings Lashes liên kết" allowClear showSearch optionFilterProp="children">
                  {legacyStaffList.map((item) => (
                    <Option key={item.id} value={item.id}>
                      {item.name} {item.phone ? ` - ${item.phone}` : ''} {item.email ? ` - ${item.email}` : ''} (ID: {item.id})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </div>
      ) : (
        <div>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label={<Text style={{ color: token.colorText }}>Email liên hệ</Text>}
                rules={[{ type: 'email', message: 'Định dạng email không hợp lệ!' }]}
              >
                <Input placeholder="email@domain.com" prefix={<MailOutlined style={{ color: '#888' }} />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label={<Text style={{ color: token.colorText }}>Số điện thoại</Text>}
              >
                <Input placeholder="0901234567" prefix={<PhoneOutlined style={{ color: '#888' }} />} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="joinedAt"
                label={<Text style={{ color: token.colorText }}>Ngày vào làm</Text>}
              >
                <DatePicker style={{ width: '100%' }} placeholder="Chọn ngày" format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="birthDate"
                label={<Text style={{ color: token.colorText }}>Ngày sinh</Text>}
              >
                <DatePicker style={{ width: '100%' }} placeholder="Chọn ngày" format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="gender"
                label={<Text style={{ color: token.colorText }}>Giới tính</Text>}
              >
                <Select placeholder="Chọn giới tính">
                  <Option value="Male">Nam</Option>
                  <Option value="Female">Nữ</Option>
                  <Option value="Other">Khác</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="address"
                label={<Text style={{ color: token.colorText }}>Địa chỉ thường trú</Text>}
              >
                <Input placeholder="Số nhà, Tên đường, Quận/Huyện, Tỉnh/TP" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="emergencyContact"
                label={<Text style={{ color: token.colorText }}>Người liên hệ khẩn cấp</Text>}
              >
                <Input placeholder="Tên người thân / mối quan hệ" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="emergencyPhone"
                label={<Text style={{ color: token.colorText }}>SĐT liên hệ khẩn cấp</Text>}
              >
                <Input placeholder="Số điện thoại liên hệ" prefix={<PhoneOutlined style={{ color: '#888' }} />} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="notes"
                label={<Text style={{ color: token.colorText }}>Ghi chú nhân sự</Text>}
              >
                <TextArea rows={3} placeholder="Ghi chú về năng lực, đãi ngộ, thông tin hợp đồng,..." />
              </Form.Item>
            </Col>
          </Row>
        </div>
      )}

      <Divider style={{ margin: '24px 0 16px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <Button onClick={onCancel}>Hủy bỏ</Button>
        <Button
          type="primary"
          htmlType="submit"
          loading={submitting}
          style={{
            background: '#D4A84B',
            borderColor: '#D4A84B',
            color: '#000',
            fontWeight: '600'
          }}
        >
          {editingStaff ? 'Lưu thay đổi' : 'Tạo mới nhân viên'}
        </Button>
      </div>
    </div>
  );
}
