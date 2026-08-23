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
  SyncOutlined,
  CheckOutlined,
  StopOutlined,
  CloseOutlined,
  BranchesOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../../../context/ThemeContext';
import { isAdminOrSuperAdminRole, isSuperAdminRole, Staff, Role, vietnameseSearchFilter } from '@mos-lab/shared';
import { useStaffData } from './hooks/useStaffData';
import { getStaffColumns, getRoleColumns } from './components/StaffColumns';
import { StaffDirectoryToolbar } from './components/StaffDirectoryToolbar';
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
    activeCount,
    lockedCount,
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
    // Bulk Selection States & Handlers
    selectedRowKeys,
    setSelectedRowKeys,
    selectedBulkRole,
    setSelectedBulkRole,
    bulkSubmitting,
    handleClearSelection,
    handleBulkUpdateRole,
    handleBulkToggleActive,
    // Merge Staff Modal States & Handlers
    isMergeModalOpen,
    setIsMergeModalOpen,
    targetMergeStaffId,
    setTargetMergeStaffId,
    mergeSubmitting,
    handleOpenMergeModal,
    handleConfirmMerge,
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
    syncing,
    handleSyncLegacyStaff,
  } = useStaffData({
    staffForm,
    roleForm,
    onSuccess: (msg) => message.success(msg),
    onError: (msg) => message.error(msg),
  });
  const canManageStaff = isAdminOrSuperAdminRole(currentUser?.role);
  const isSuperAdmin = isSuperAdminRole(currentUser?.role);
  const assignableRoles = roles.filter((role) => role.key !== 'super_admin' || isSuperAdmin);

  // Table columns for Staff Directory
  const staffColumns = getStaffColumns({
    currentPage,
    pageSize,
    roles,
    token,
    handleToggleActive,
    handleImpersonate,
    openStaffDetails,
    openStaffModal,
    handleDeleteStaff,
    currentUser,
    onRoleClick: (roleKey) => {
      setCurrentPage(1);
      setFilterRole(roleKey);
    },
  });

  // Table columns for Roles Management
  const roleColumns = getRoleColumns({
    themeMode,
    openRoleModal,
    handleDeleteRole,
    canManageSuperAdmin: isSuperAdmin,
  });

  const handleSearchQueryChange = (value: string) => {
    setCurrentPage(1);
    setSearchQuery(value);
  };

  const handleFilterRoleChange = (value: string) => {
    setCurrentPage(1);
    setFilterRole(value);
  };

  const handleClearDirectoryFilters = () => {
    setCurrentPage(1);
    setSearchQuery('');
    setFilterRole('all');
    setFilterStatus('all');
  };

  return (
    <div className="responsive-page responsive-workspace staff-page" style={{ padding: '4px' }}>
      {/* Page Header */}
      <div className="staff-page-header">
        <div className="staff-page-header-copy">
          <Title level={3} style={{ color: '#D4A84B', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SolutionOutlined /> Quản Lý Nhân Sự & Vai Trò (HR)
          </Title>
          <Text type="secondary">
            Cấu hình nhân sự, quản lý nhóm quyền, liên kết Google Auth và cập nhật thông tin nội bộ.
          </Text>
        </div>
        <div className="staff-page-header-actions">
          {activeTab !== 'roles' ? (
            <Space wrap>
              {canManageStaff && (
                <Button
                  icon={<SyncOutlined />}
                  onClick={handleSyncLegacyStaff}
                  loading={syncing}
                  style={{
                    borderRadius: '6px',
                    fontWeight: '500',
                  }}
                >
                  Đồng bộ Wings Lashes
                </Button>
              )}
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
            </Space>
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
            key: 'staff-active',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserOutlined style={{ color: '#10b981' }} />
                Danh sách nhân sự (Active)
                <Badge count={activeCount} overflowCount={999} style={{ backgroundColor: '#10b981' }} />
              </span>
            ),
            children: (
              <>
                <StaffDirectoryToolbar
                  roles={roles}
                  searchQuery={searchQuery}
                  filterRole={filterRole}
                  onSearchQueryChange={handleSearchQueryChange}
                  onFilterRoleChange={handleFilterRoleChange}
                  onClear={handleClearDirectoryFilters}
                />

                {/* Staff Table */}
                <Table
                  dataSource={staffList}
                  columns={staffColumns}
                  rowKey="id"
                  loading={loading}
                  rowSelection={
                    canManageStaff
                      ? {
                          selectedRowKeys,
                          onChange: (keys) => setSelectedRowKeys(keys),
                        }
                      : undefined
                  }
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
                  className="antd-custom-table staff-directory-table"
                />
              </>
            ),
          },
          {
            key: 'staff-locked',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LockOutlined style={{ color: '#ef4444' }} />
                Tài khoản đã khóa (Locked)
                <Badge count={lockedCount} overflowCount={999} style={{ backgroundColor: '#ef4444' }} />
              </span>
            ),
            children: (
              <>
                <StaffDirectoryToolbar
                  roles={roles}
                  searchQuery={searchQuery}
                  filterRole={filterRole}
                  onSearchQueryChange={handleSearchQueryChange}
                  onFilterRoleChange={handleFilterRoleChange}
                  onClear={handleClearDirectoryFilters}
                />

                {/* Staff Table */}
                <Table
                  dataSource={staffList}
                  columns={staffColumns}
                  rowKey="id"
                  loading={loading}
                  rowSelection={
                    canManageStaff
                      ? {
                          selectedRowKeys,
                          onChange: (keys) => setSelectedRowKeys(keys),
                        }
                      : undefined
                  }
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
                  className="antd-custom-table staff-directory-table"
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

      {/* Floating Action Bar for Bulk Selection */}
      {canManageStaff && selectedRowKeys.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '28px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1050,
            background: themeMode === 'dark' ? 'rgba(20, 20, 20, 0.92)' : 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(16px) saturate(180%)',
            border: themeMode === 'dark' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow:
              themeMode === 'dark'
                ? '0 20px 35px -10px rgba(0,0,0,0.7), 0 0 1px 1px rgba(255,255,255,0.1)'
                : '0 20px 35px -10px rgba(0,0,0,0.15), 0 4px 6px -2px rgba(0,0,0,0.05)',
            borderRadius: '14px',
            padding: '10px 18px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '14px',
            whiteSpace: 'nowrap',
            maxWidth: '95vw',
            overflowX: 'auto',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Cluster 1: Selected Counter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, whiteSpace: 'nowrap' }}>
            <Badge
              count={selectedRowKeys.length}
              overflowCount={999}
              style={{ backgroundColor: '#D4A84B', color: '#000', fontWeight: 'bold' }}
            />
            <Text
              style={{
                color: themeMode === 'dark' ? '#f1f5f9' : '#0f172a',
                fontWeight: 600,
                fontSize: '14px',
                whiteSpace: 'nowrap',
              }}
            >
              Đã chọn <strong style={{ color: '#D4A84B' }}>{selectedRowKeys.length}</strong> nhân viên
            </Text>
          </div>

          <Divider
            type="vertical"
            style={{
              height: '24px',
              margin: '0 2px',
              flexShrink: 0,
              borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.15)' : '#cbd5e1',
            }}
          />

          {/* Cluster 2: Role Adjustment */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, whiteSpace: 'nowrap' }}>
            <Select
              placeholder="Chọn vai trò mới..."
              value={selectedBulkRole}
              onChange={(val) => setSelectedBulkRole(val)}
              style={{ width: '190px' }}
              allowClear
            >
              {assignableRoles.map((r) => (
                <Option key={r.key} value={r.key}>
                  {r.name}
                </Option>
              ))}
            </Select>

            <Button
              type="primary"
              loading={bulkSubmitting}
              disabled={!selectedBulkRole}
              onClick={() => handleBulkUpdateRole()}
              style={{
                background: selectedBulkRole ? '#D4A84B' : undefined,
                borderColor: selectedBulkRole ? '#D4A84B' : undefined,
                color: selectedBulkRole ? '#000' : undefined,
                fontWeight: '600',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              Đổi vai trò
            </Button>
          </div>

          <Divider
            type="vertical"
            style={{
              height: '24px',
              margin: '0 2px',
              flexShrink: 0,
              borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.15)' : '#cbd5e1',
            }}
          />

          {/* Cluster 3: Status & Merge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, whiteSpace: 'nowrap' }}>
            <Button
              loading={bulkSubmitting}
              onClick={() => handleBulkToggleActive(true)}
              icon={<CheckOutlined style={{ color: '#10b981' }} />}
              style={{ borderRadius: '6px', whiteSpace: 'nowrap' }}
            >
              Kích hoạt
            </Button>
            <Button
              loading={bulkSubmitting}
              onClick={() => handleBulkToggleActive(false)}
              danger
              icon={<StopOutlined />}
              style={{ borderRadius: '6px', whiteSpace: 'nowrap' }}
            >
              Khóa tài khoản
            </Button>
            {selectedRowKeys.length >= 2 && (
              <Button
                type="primary"
                icon={<BranchesOutlined />}
                onClick={handleOpenMergeModal}
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                  borderColor: 'transparent',
                  color: '#ffffff',
                  fontWeight: '600',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                Gộp trùng lặp
              </Button>
            )}
          </div>

          <Divider
            type="vertical"
            style={{
              height: '24px',
              margin: '0 2px',
              flexShrink: 0,
              borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.15)' : '#cbd5e1',
            }}
          />

          {/* Cluster 4: Clear Selection */}
          <Button
            onClick={handleClearSelection}
            type="text"
            danger
            icon={<CloseOutlined />}
            style={{ fontWeight: 500, flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            Bỏ chọn
          </Button>
        </div>
      )}

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
            currentUser={currentUser}
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
              <Col span={24}>
                <Form.Item name="omicallAutoInit" valuePropName="checked" style={{ marginBottom: 4 }}>
                  <Checkbox>
                    <Text style={{ fontWeight: 500 }}>Tự động nhận cuộc gọi OmiCall (`omicallAutoInit`)</Text>
                    <Paragraph type="secondary" style={{ fontSize: '12px', margin: 0 }}>
                      Tự động khởi chạy OmiCall SDK và đăng ký SIP khi đăng nhập để sẵn sàng nhận cuộc gọi đến.
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
                src={
                  selectedStaff.avatarUrl
                    ? selectedStaff.avatarUrl.replace(
                        /^https?:\/\/(s|api)\.wingslashes\.com/,
                        'https://cdn.wingslashes.com'
                      )
                    : undefined
                }
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
              <Descriptions.Item label="Thâm niên làm việc">
                {selectedStaff.joinedAt ? (
                  <Space direction="vertical" size={0}>
                    <Text style={{ fontWeight: '500', fontVariantNumeric: 'tabular-nums' }}>
                      {(() => {
                        const offset = selectedStaff.seniorityOffset || 0;
                        const start = dayjs(selectedStaff.joinedAt);
                        const now = dayjs();
                        const totalMonths = now.diff(start, 'month') + offset;
                        if (totalMonths <= 0) {
                          return `${now.diff(start, 'day')} ngày`;
                        }
                        const years = Math.floor(totalMonths / 12);
                        const months = totalMonths % 12;
                        return years > 0 ? `${years} năm ${months} tháng` : `${months} tháng`;
                      })()}
                    </Text>
                    {canManageStaff &&
                      selectedStaff.seniorityOffset !== undefined &&
                      selectedStaff.seniorityOffset !== null &&
                      selectedStaff.seniorityOffset > 0 && (
                        <Text type="secondary" style={{ fontSize: '11px', fontStyle: 'italic' }}>
                          (đã cộng thêm {selectedStaff.seniorityOffset} tháng thỏa thuận)
                        </Text>
                      )}
                  </Space>
                ) : (
                  <Text type="secondary" italic>
                    Chưa xác định
                  </Text>
                )}
              </Descriptions.Item>
              {canManageStaff && (
                <>
                  <Descriptions.Item label="Lương cứng (Base Salary)">
                    {selectedStaff.baseSalary !== undefined && selectedStaff.baseSalary !== null ? (
                      <Text style={{ fontWeight: '500', fontVariantNumeric: 'tabular-nums' }}>
                        {Math.round(selectedStaff.baseSalary).toLocaleString('vi-VN')} đ
                      </Text>
                    ) : (
                      <Text type="secondary" italic>
                        Chưa thiết lập
                      </Text>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Lương giờ (Hourly Wage)">
                    {selectedStaff.hourlyWage !== undefined && selectedStaff.hourlyWage !== null ? (
                      <Text style={{ fontWeight: '500', fontVariantNumeric: 'tabular-nums' }}>
                        {Math.round(selectedStaff.hourlyWage).toLocaleString('vi-VN')} đ/h
                      </Text>
                    ) : (
                      <Text type="secondary" italic>
                        Chưa thiết lập
                      </Text>
                    )}
                  </Descriptions.Item>
                </>
              )}
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

      {/* Merge Staff Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8b5cf6' }}>
            <BranchesOutlined style={{ fontSize: '20px' }} />
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>Gộp Nhân Viên Trùng Lặp</span>
          </div>
        }
        open={isMergeModalOpen}
        onCancel={() => setIsMergeModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsMergeModalOpen(false)}>
            Hủy bỏ
          </Button>,
          <Popconfirm
            key="confirm"
            title="Xác nhận gộp tài khoản nhân viên?"
            description="Tất cả lịch sử cuộc gọi, KPI và phân công khách hàng từ tài khoản phụ sẽ chuyển sang tài khoản chính. Các tài khoản phụ trùng lặp sẽ bị XÓA VĨNH VIỄN."
            onConfirm={handleConfirmMerge}
            okText="Đồng ý Gộp"
            cancelText="Hủy"
            okButtonProps={{ danger: true, loading: mergeSubmitting }}
          >
            <Button
              type="primary"
              loading={mergeSubmitting}
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                borderColor: 'transparent',
                fontWeight: '600',
              }}
            >
              Xác Nhận Gộp ({selectedRowKeys.length} tài khoản)
            </Button>
          </Popconfirm>,
        ]}
        width={650}
      >
        <div style={{ marginTop: '16px' }}>
          <Paragraph type="secondary">
            Bạn đang chọn <strong>{selectedRowKeys.length} nhân viên</strong> để gộp dữ liệu. Vui lòng chọn 1 nhân viên
            làm <strong style={{ color: '#8b5cf6' }}>Tài khoản chính (Target)</strong> để giữ lại:
          </Paragraph>

          <Card
            size="small"
            style={{
              background: themeMode === 'dark' ? '#1f1f1f' : '#f8fafc',
              border: `1px solid ${themeMode === 'dark' ? '#333333' : '#e2e8f0'}`,
              marginBottom: '16px',
            }}
          >
            <Select
              style={{ width: '100%' }}
              placeholder="Chọn tài khoản chính giữ lại..."
              value={targetMergeStaffId}
              onChange={(val) => setTargetMergeStaffId(val)}
              showSearch
              filterOption={vietnameseSearchFilter}
            >
              {staffList
                .filter((s) => selectedRowKeys.includes(s.id))
                .map((s) => (
                  <Option key={s.id} value={s.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        <strong>{s.displayName}</strong> ({s.username})
                      </span>
                      <Tag color="purple">ID: {s.id}</Tag>
                    </div>
                  </Option>
                ))}
            </Select>
          </Card>

          {targetMergeStaffId && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                background: themeMode === 'dark' ? '#1c1917' : '#f0fdf4',
                border: `1px solid ${themeMode === 'dark' ? '#44403c' : '#bbf7d0'}`,
              }}
            >
              <Text style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: '#10b981' }}>
                ✓ Tài khoản chính giữ lại: {staffList.find((s) => s.id === targetMergeStaffId)?.displayName} (ID:{' '}
                {targetMergeStaffId})
              </Text>
              <Text type="secondary" style={{ fontSize: '13px', display: 'block' }}>
                ✕ Tài khoản phụ bị gộp & xóa:{' '}
                {staffList
                  .filter((s) => selectedRowKeys.includes(s.id) && s.id !== targetMergeStaffId)
                  .map((s) => s.displayName)
                  .join(', ')}
              </Text>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
