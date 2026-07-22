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
import { UserOutlined, InfoCircleOutlined, LockOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { Staff, Role } from '@mos-lab/shared';

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
                  {roles.map((r) => (
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
                  optionFilterProp="children"
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
              <Form.Item name="phone" label={<Text style={{ color: token.colorText }}>Số điện thoại</Text>}>
                <Input placeholder="0901234567" prefix={<PhoneOutlined style={{ color: '#888' }} />} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="joinedAt" label={<Text style={{ color: token.colorText }}>Ngày vào làm</Text>}>
                <DatePicker style={{ width: '100%' }} placeholder="Chọn ngày" format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="birthDate" label={<Text style={{ color: token.colorText }}>Ngày sinh</Text>}>
                <DatePicker style={{ width: '100%' }} placeholder="Chọn ngày" format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="gender" label={<Text style={{ color: token.colorText }}>Giới tính</Text>}>
                <Select placeholder="Chọn giới tính">
                  <Option value="Male">Nam</Option>
                  <Option value="Female">Nữ</Option>
                  <Option value="Other">Khác</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {currentUser?.role === 'admin' && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="baseSalary"
                    label={<Text style={{ color: token.colorText }}>Lương cứng (Base Salary)</Text>}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="Ví dụ: 5,500,000"
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
                      addonAfter="đ"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="hourlyWage"
                    label={<Text style={{ color: token.colorText }}>Lương giờ (Hourly Wage)</Text>}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="Ví dụ: 30,000"
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
                      addonAfter="đ/h"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="seniorityOffset"
                    label={<Text style={{ color: token.colorText }}>Thâm niên cộng thêm (tháng)</Text>}
                  >
                    <InputNumber style={{ width: '100%' }} placeholder="Ví dụ: 12" min={0} addonAfter="tháng" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="address" label={<Text style={{ color: token.colorText }}>Địa chỉ thường trú</Text>}>
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
              <Form.Item name="notes" label={<Text style={{ color: token.colorText }}>Ghi chú nhân sự</Text>}>
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
            fontWeight: '600',
          }}
        >
          {editingStaff ? 'Lưu thay đổi' : 'Tạo mới nhân viên'}
        </Button>
      </div>
    </div>
  );
}
