'use client';

import '../../suppress-warnings';
import React from 'react';
import {
  Table,
  Button,
  Input,
  Modal,
  Form,
  Select,
  Switch,
  Tag,
  Card,
  Descriptions,
  Divider,
  Drawer,
  Space,
  Typography,
  theme,
  Row,
  Col,
  Avatar,
  Badge,
  Tooltip,
  Popconfirm,
  Checkbox,
  Tabs,
  message,
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
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../../../context/ThemeContext';
import { Staff, Role } from '@mos-lab/shared';
import { useStaffData } from './hooks/useStaffData';
import { getStaffColumns, getRoleColumns } from './components/StaffColumns';
import StaffTabsContent from './components/StaffTabsContent';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

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
  { value: 'lime', label: 'Lime' },
];

export default function StaffPage() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const [staffForm] = Form.useForm();
  const [roleForm] = Form.useForm();

  const {
    activeTab,
    setActiveTab,
    staffList,
    currentUser,
    roles,
    loading,
    rolesLoading,
    legacyStaffList,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    searchQuery,
    setSearchQuery,
    filterRole,
    setFilterRole,
    filterStatus,
    setFilterStatus,
    isStaffModalOpen,
    setIsStaffModalOpen,
    editingStaff,
    staffSubmitting,
    isDrawerOpen,
    setIsDrawerOpen,
    selectedStaff,
    isRoleModalOpen,
    setIsRoleModalOpen,
    editingRole,
    roleSubmitting,
    // Methods
    openStaffModal,
    handleStaffSubmit,
    handleToggleActive,
    handleDeleteStaff,
    handleImpersonate,
    openStaffDetails,
    openRoleModal,
    handleRoleSubmit,
    handleDeleteRole,
  } = useStaffData({
    staffForm,
    roleForm,
    onSuccess: (msg) => message.success(msg),
    onError: (msg) => message.error(msg),
  });

  // Table columns for Staff Directory
  const staffColumns = getStaffColumns({
    roles,
    token,
    handleToggleActive,
    handleImpersonate,
    openStaffDetails,
    openStaffModal,
    handleDeleteStaff,
    currentUser,
  });

  // Table columns for Roles Management
  const roleColumns = getRoleColumns({
    themeMode,
    openRoleModal,
    handleDeleteRole,
  });

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
                borderRadius: '6px',
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
                borderRadius: '6px',
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
                    borderRadius: '8px',
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
                          <Option key={r.key} value={r.key}>
                            {r.name}
                          </Option>
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
                    },
                  }}
                  style={{
                    background: themeMode === 'dark' ? '#141414' : '#fff',
                  }}
                  className="antd-custom-table"
                />
              </>
            ),
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
                  background: themeMode === 'dark' ? '#141414' : '#fff',
                }}
                className="antd-custom-table"
              />
            ),
          },
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
          background: themeMode === 'dark' ? '#141414' : '#fff',
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
          background: themeMode === 'dark' ? '#141414' : '#fff',
        }}
      >
        <Form form={roleForm} layout="vertical" onFinish={handleRoleSubmit} style={{ marginTop: '20px' }}>
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
                  {
                    pattern: /^[a-z0-9-_]+$/,
                    message: 'Mã định danh chỉ gồm chữ thường viết liền, gạch ngang, gạch dưới!',
                  },
                ]}
              >
                <Input
                  placeholder="ví dụ: admin-assistant"
                  disabled={!!editingRole}
                  prefix={<KeyOutlined style={{ color: '#888' }} />}
                />
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

          <Form.Item name="description" label={<Text style={{ color: token.colorText }}>Mô tả vai trò</Text>}>
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
              marginBottom: '20px',
            }}
          >
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Form.Item name="viewKPI" valuePropName="checked" style={{ marginBottom: 4 }}>
                  <Checkbox disabled={editingRole?.key === 'admin'}>
                    <Text style={{ fontWeight: 500 }}>Xem báo cáo KPI cá nhân (`viewKPI`)</Text>
                    <Paragraph type="secondary" style={{ fontSize: '12px', margin: 0 }}>
                      Cho phép xem hiệu suất kế hoạch cuộc gọi, lịch hẹn của riêng tài khoản này.
                    </Paragraph>
                  </Checkbox>
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="viewTeamKPI" valuePropName="checked" style={{ marginBottom: 4 }}>
                  <Checkbox disabled={editingRole?.key === 'admin'}>
                    <Text style={{ fontWeight: 500 }}>Xem báo cáo KPI Nhóm (`viewTeamKPI`)</Text>
                    <Paragraph type="secondary" style={{ fontSize: '12px', margin: 0 }}>
                      Cho phép xem bảng xếp hạng (leaderboard) và hiệu suất KPI của cả đội nhóm.
                    </Paragraph>
                  </Checkbox>
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="manageStaff" valuePropName="checked" style={{ marginBottom: 4 }}>
                  <Checkbox disabled={editingRole?.key === 'admin'}>
                    <Text style={{ fontWeight: 500 }}>Quản lý Nhân sự & Vai trò (`manageStaff`)</Text>
                    <Paragraph type="secondary" style={{ fontSize: '12px', margin: 0 }}>
                      Toàn quyền truy cập tab quản trị, thêm/sửa/xóa nhân viên, cấu hình nhóm quyền.
                    </Paragraph>
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
                fontWeight: '600',
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
            padding: '24px',
          },
          header: {
            background: themeMode === 'dark' ? '#1d1d1d' : '#fff',
            borderBottom: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#f0f0f0'}`,
          },
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
                  boxShadow: '0 4px 12px rgba(212, 168, 75, 0.25)',
                }}
              >
                {selectedStaff.displayName
                  ? selectedStaff.displayName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
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
                  <Tag color={roles.find((r) => r.key === selectedStaff.role)?.color || 'default'}>
                    {roles.find((r) => r.key === selectedStaff.role)?.name || selectedStaff.role}
                  </Tag>
                  <Tag color={selectedStaff.isActive ? 'success' : 'error'}>
                    {selectedStaff.isActive ? 'Đang hoạt động' : 'Tài khoản khóa'}
                  </Tag>
                </Space>
              </div>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            {/* General Info */}
            <Descriptions
              title={<Text style={{ color: '#D4A84B', fontSize: '15px', fontWeight: 'bold' }}>Thông tin cơ bản</Text>}
              column={1}
              bordered
              size="small"
              style={{ marginBottom: '24px' }}
            >
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
              <Descriptions.Item label="Email liên hệ">
                {selectedStaff.email || (
                  <Text type="secondary" italic>
                    Chưa khai báo
                  </Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">
                {selectedStaff.phone || (
                  <Text type="secondary" italic>
                    Chưa khai báo
                  </Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Tài khoản Wings Lashes">
                {selectedStaff.legacyStaffId ? (
                  <Text style={{ fontWeight: '500', color: token.colorPrimary }}>
                    {legacyStaffList.find((s) => s.id === selectedStaff.legacyStaffId)?.name ||
                      `ID: ${selectedStaff.legacyStaffId}`}
                  </Text>
                ) : (
                  <Text type="secondary" italic>
                    Chưa liên kết (Tự động đối khớp bằng tên)
                  </Text>
                )}
              </Descriptions.Item>
            </Descriptions>

            {/* HR specific data */}
            <Descriptions
              title={
                <Text style={{ color: '#D4A84B', fontSize: '15px', fontWeight: 'bold' }}>
                  Thông tin nhân sự & Công việc
                </Text>
              }
              column={1}
              bordered
              size="small"
              style={{ marginBottom: '24px' }}
            >
              <Descriptions.Item label="Ngày bắt đầu làm việc">
                {selectedStaff.joinedAt ? (
                  <Space>
                    <CalendarOutlined style={{ color: '#888' }} />
                    <Text>{dayjs(selectedStaff.joinedAt).format('DD [tháng] MM, YYYY')}</Text>
                  </Space>
                ) : (
                  <Text type="secondary" italic>
                    Chưa thiết lập
                  </Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">
                {selectedStaff.birthDate ? (
                  dayjs(selectedStaff.birthDate).format('DD/MM/YYYY')
                ) : (
                  <Text type="secondary" italic>
                    Chưa thiết lập
                  </Text>
                )}
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
                  <Text type="secondary" italic>
                    Chưa cập nhật
                  </Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo tài khoản">
                {dayjs(selectedStaff.createdAt).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
            </Descriptions>

            {/* Emergency Contact */}
            <Descriptions
              title={<Text style={{ color: '#D4A84B', fontSize: '15px', fontWeight: 'bold' }}>Liên hệ khẩn cấp</Text>}
              column={1}
              bordered
              size="small"
              style={{ marginBottom: '24px' }}
            >
              <Descriptions.Item label="Người liên hệ">
                {selectedStaff.emergencyContact || (
                  <Text type="secondary" italic>
                    Chưa khai báo
                  </Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại liên hệ">
                {selectedStaff.emergencyPhone || (
                  <Text type="secondary" italic>
                    Chưa khai báo
                  </Text>
                )}
              </Descriptions.Item>
            </Descriptions>

            {/* Notes */}
            {selectedStaff.notes && (
              <Card
                title={<Text style={{ color: '#D4A84B', fontSize: '14px', fontWeight: 'bold' }}>Ghi chú nội bộ</Text>}
                size="small"
                style={{
                  background: themeMode === 'dark' ? '#1c1c1c' : '#fff',
                  border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#e8e8e8'}`,
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
