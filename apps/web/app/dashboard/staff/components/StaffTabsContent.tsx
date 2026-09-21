'use client';

import React, { useState } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  Switch,
  Row,
  Col,
  Typography,
  Space,
  Tooltip,
  Divider,
  Button,
  InputNumber,
} from 'antd';
import { UserOutlined, InfoCircleOutlined, LockOutlined, SolutionOutlined } from '@ant-design/icons';
import {
  isAdminOrSuperAdminRole,
  isHrOrAdminRole,
  isSuperAdminRole,
  Staff,
  Role,
  vietnameseSearchFilter,
} from '@mos-lab/shared';
import StaffHrFormFields from '~/components/staff/StaffHrFormFields';

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function StaffTabsContent({
  themeMode,
  token,
  editingStaff,
  submitting,
  roles,
  onCancel,
  legacyStaffList,
  currentUser,
}: {
  themeMode: string;
  token: SafeAny;
  editingStaff: Staff | null;
  submitting: boolean;
  roles: Role[];
  onCancel: () => void;
  legacyStaffList: { id: number; name: string; phone?: string | null; email?: string | null }[];
  currentUser: SafeAny;
}) {
  const [activeTab, setActiveTab] = useState('account');
  const form = Form.useFormInstance();
  const isAdmin = isAdminOrSuperAdminRole(currentUser?.role);
  const isHrOrAdmin = isHrOrAdminRole(currentUser?.role);
  const isSuperAdmin = isSuperAdminRole(currentUser?.role);
  const assignableRoles = roles.filter((role) => role.key !== 'super_admin' || isSuperAdmin);

  return (
    <div>
      {/* Custom simple visual tab headers */}
      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#f0f0f0'}`,
          marginBottom: '20px',
        }}
      >
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
            cursor: 'pointer',
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
            cursor: 'pointer',
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
                  { min: 3, message: 'Tên đăng nhập tối thiểu phải có 3 ký tự!' },
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
                  {assignableRoles.map((r) => (
                    <Option key={r.key} value={r.key}>
                      {r.name}
                    </Option>
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
                    <Tooltip
                      title={
                        editingStaff
                          ? 'Để trống nếu không muốn thay đổi mật khẩu đăng nhập trực tiếp'
                          : 'Mật khẩu cho đăng nhập thủ công bằng tài khoản. Không bắt buộc nếu chỉ dùng Google Auth.'
                      }
                    >
                      <InfoCircleOutlined style={{ color: '#888' }} />
                    </Tooltip>
                  </Space>
                }
              >
                <Input.Password
                  placeholder={editingStaff ? 'Nhập mật khẩu mới để reset' : 'Nhập mật khẩu tài khoản'}
                  prefix={<LockOutlined style={{ color: '#888' }} />}
                  autoComplete="new-password"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="isActive"
                label={<Text style={{ color: token.colorText }}>Trạng thái tài khoản</Text>}
                valuePropName="checked"
                extra="Cho phép đăng nhập vào hệ thống CRM khi trạng thái hoạt động."
              >
                <Switch checkedChildren="Hoạt động" unCheckedChildren="Tạm khóa" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="omicallAutoInit"
                label={<Text style={{ color: token.colorText }}>Tự động nhận cuộc gọi OmiCall</Text>}
                extra="Bật/Tắt tự động khởi chạy OmiCall khi đăng nhập hoặc theo mặc định vai trò."
              >
                <Select placeholder="Chọn trạng thái">
                  <Option value="inherit">Mặc định (Theo vai trò)</Option>
                  <Option value={true}>Bật tự động nhận cuộc gọi</Option>
                  <Option value={false}>Tắt tự động nhận cuộc gọi</Option>
                </Select>
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
                <Select
                  placeholder="Chọn tài khoản Wings Lashes liên kết"
                  allowClear
                  showSearch
                  filterOption={vietnameseSearchFilter}
                >
                  {legacyStaffList.map((item) => (
                    <Option key={item.id} value={item.id}>
                      {item.name} {item.phone ? ` - ${item.phone}` : ''} {item.email ? ` - ${item.email}` : ''} (ID:{' '}
                      {item.id})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </div>
      ) : (
        <StaffHrFormFields isHrOrAdmin={isHrOrAdmin} currentUser={currentUser} />
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
            fontWeight: '600',
          }}
        >
          {editingStaff ? 'Lưu thay đổi' : 'Tạo mới nhân viên'}
        </Button>
      </div>
    </div>
  );
}
