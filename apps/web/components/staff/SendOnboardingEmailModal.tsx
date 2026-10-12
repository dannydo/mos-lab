'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Form,
  Input,
  Typography,
  Space,
  Tag,
  Alert,
  Tabs,
  Avatar,
  Table,
  Badge,
  message,
  theme,
} from 'antd';
import {
  MailOutlined,
  SendOutlined,
  UserOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  GoogleOutlined,
  MobileOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Staff, Role } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { useTheme } from '../../context/ThemeContext';

const { Text, Title, Paragraph } = Typography;

interface SendOnboardingEmailModalProps {
  open: boolean;
  onClose: () => void;
  staff: Staff | null;
  bulkStaffList?: Staff[];
  roles?: Role[];
  onSuccess: (msg: string) => void;
}

export function SendOnboardingEmailModal({
  open,
  onClose,
  staff,
  bulkStaffList = [],
  roles = [],
  onSuccess,
}: SendOnboardingEmailModalProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState('settings');

  const isBulk = bulkStaffList.length > 0;

  useEffect(() => {
    if (open) {
      setActiveTabKey('settings');
      if (staff && !isBulk) {
        form.setFieldsValue({
          email: staff.email || '',
        });
      }
    }
  }, [open, staff, isBulk, form]);

  const roleMap = React.useMemo(() => {
    const map = new Map<string, string>();
    roles.forEach((r) => map.set(r.key, r.name));
    return map;
  }, [roles]);

  const handleSendSingle = async () => {
    if (!staff) return;
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const targetEmail = values.email?.trim();
      const res = await apiClient.staff.sendOnboardingEmail(staff.id, {
        emailOverride: targetEmail,
      });

      if (res.success) {
        onSuccess(res.message || `Đã gửi email hướng dẫn đăng nhập tới ${targetEmail}`);
        onClose();
      } else {
        message.error(res.message || 'Gửi email thất bại');
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Lỗi gửi email');
      message.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendBulk = async () => {
    if (bulkStaffList.length === 0) return;
    try {
      setSubmitting(true);
      const staffIds = bulkStaffList.map((s) => s.id);
      const res = await apiClient.staff.bulkSendOnboardingEmail({ staffIds });

      if (res.success) {
        onSuccess(res.message || `Đã gửi thành công ${res.sentCount} email hướng dẫn`);
        onClose();
      } else {
        message.error(res.message || 'Lỗi gửi email hàng loạt');
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Lỗi gửi email hàng loạt');
      message.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const previewEmailValue = Form.useWatch('email', form) || staff?.email || 'nhanvien@wingslashes.com';
  const staffRoleName = staff ? roleMap.get(staff.role) || staff.role : '';

  // Count valid and missing emails in bulk list
  const validBulkEmails = bulkStaffList.filter((s) => s.email && s.email.includes('@'));
  const missingBulkEmails = bulkStaffList.filter((s) => !s.email || !s.email.includes('@'));

  return (
    <Modal
      open={open}
      onCancel={onClose}
      destroyOnClose
      width={680}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '8px',
              backgroundColor: 'rgba(6, 182, 212, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#06b6d4',
              fontSize: '18px',
            }}
          >
            <MailOutlined />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: token.colorText }}>
              {isBulk
                ? `Gửi Email Hướng Dẫn Đăng Nhập mOS (${bulkStaffList.length} Nhân Sự)`
                : `Gửi Email Hướng Dẫn Đăng Nhập mOS`}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 'normal', color: token.colorTextDescription }}>
              Hướng dẫn đăng nhập Google Sign-In 1 chạm theo chuẩn thương hiệu Wings Lashes
            </div>
          </div>
        </div>
      }
      footer={[
        <Button key="cancel" onClick={onClose} disabled={submitting}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<SendOutlined />}
          loading={submitting}
          onClick={isBulk ? handleSendBulk : handleSendSingle}
          disabled={isBulk && validBulkEmails.length === 0}
          style={{
            backgroundColor: '#06b6d4',
            borderColor: '#06b6d4',
            fontWeight: '600',
          }}
        >
          {isBulk ? `Gửi Ngay (${validBulkEmails.length} Email Hợp Lệ)` : 'Gửi Email Ngay'}
        </Button>,
      ]}
    >
      {!isBulk && staff ? (
        <Tabs
          activeKey={activeTabKey}
          onChange={setActiveTabKey}
          items={[
            {
              key: 'settings',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <SendOutlined /> Thông Tin Gửi
                </span>
              ),
              children: (
                <div style={{ paddingTop: '8px' }}>
                  {/* Staff Info Card */}
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      backgroundColor: themeMode === 'dark' ? '#1f293d' : '#f8fafc',
                      border: `1px solid ${token.colorBorderSecondary}`,
                      marginBottom: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Avatar
                        size={44}
                        src={staff.avatarUrl}
                        icon={<UserOutlined />}
                        style={{ backgroundColor: '#D4A84B', color: '#000', fontWeight: 'bold' }}
                      />
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '15px', color: token.colorText }}>
                          {staff.displayName}
                        </div>
                        <Space size={6} style={{ marginTop: '2px' }}>
                          <Tag color="cyan" style={{ fontSize: '11px', margin: 0, borderRadius: '4px' }}>
                            {staffRoleName}
                          </Tag>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Mã: {staff.staffCode || `ST-${staff.id}`}
                          </Text>
                        </Space>
                      </div>
                    </div>

                    {staff.lastOnboardingEmailSentAt ? (
                      <div style={{ textAlign: 'right' }}>
                        <Tag color="success" icon={<CheckCircleOutlined />} style={{ borderRadius: '4px' }}>
                          Đã gửi hướng dẫn
                        </Tag>
                        <div style={{ fontSize: '11px', color: token.colorTextDescription, marginTop: '2px' }}>
                          {dayjs(staff.lastOnboardingEmailSentAt).format('DD/MM/YYYY HH:mm')}
                        </div>
                      </div>
                    ) : (
                      <Tag color="default" style={{ borderRadius: '4px' }}>
                        Chưa gửi lần nào
                      </Tag>
                    )}
                  </div>

                  <Form form={form} layout="vertical">
                    <Form.Item
                      name="email"
                      label={
                        <span style={{ fontWeight: '600' }}>Địa chỉ Email nhận thư (Tài khoản Google Sign-In)</span>
                      }
                      rules={[
                        { required: true, message: 'Vui lòng nhập địa chỉ email nhận thư' },
                        { type: 'email', message: 'Địa chỉ email không đúng định dạng' },
                      ]}
                      extra={
                        <span style={{ fontSize: '12px', color: token.colorTextDescription }}>
                          💡 Nhân viên sẽ dùng địa chỉ email này để bấm <strong>Đăng nhập bằng Google</strong>. Nếu sửa
                          đổi, hệ thống sẽ tự động cập nhật email mới vào hồ sơ nhân sự.
                        </span>
                      }
                    >
                      <Input
                        prefix={<MailOutlined style={{ color: '#06b6d4' }} />}
                        placeholder="ví dụ: tennhanvien@gmail.com hoặc ten@wingslashes.com"
                        size="large"
                        style={{ borderRadius: '8px' }}
                      />
                    </Form.Item>
                  </Form>

                  <Alert
                    type="info"
                    showIcon
                    message="Quy trình đăng nhập 1 chạm"
                    description="Email sẽ hướng dẫn nhân viên truy cập https://lab.masteros.app/login, bấm 'Đăng nhập bằng Google' và chọn tài khoản Google tương ứng. Không cần nhập hoặc đổi mật khẩu thủ công."
                    style={{ borderRadius: '8px' }}
                  />
                </div>
              ),
            },
            {
              key: 'preview',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <EyeOutlined /> Xem Trước Email (Preview)
                </span>
              ),
              children: (
                <div
                  style={{
                    maxHeight: '440px',
                    overflowY: 'auto',
                    padding: '16px',
                    borderRadius: '10px',
                    backgroundColor: '#0b0f19',
                    border: '1px solid #1f2937',
                    marginTop: '8px',
                  }}
                >
                  {/* Email Preview Card */}
                  <div
                    style={{
                      maxWidth: '520px',
                      margin: '0 auto',
                      backgroundColor: '#111827',
                      borderRadius: '12px',
                      border: '1px solid #1f2937',
                      padding: '24px 20px',
                      color: '#e2e8f0',
                    }}
                  >
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #e6b85c 0%, #b88628 100%)',
                          color: '#0b0f19',
                          fontWeight: 'bold',
                          fontSize: '20px',
                          lineHeight: '44px',
                          margin: '0 auto 10px auto',
                        }}
                      >
                        W
                      </div>
                      <div style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '18px' }}>WINGS LASHES</div>
                      <div style={{ color: '#d4a84b', fontSize: '11px', fontWeight: '600', letterSpacing: '1px' }}>
                        HỆ THỐNG ĐIỀU HÀNH mOS LIVING LAB
                      </div>
                    </div>

                    <Paragraph style={{ color: '#f1f5f9', fontSize: '14px', marginBottom: '12px' }}>
                      Chào bạn <strong>{staff.displayName}</strong>,
                    </Paragraph>
                    <Paragraph style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '20px' }}>
                      Chào mừng bạn gia nhập hệ thống điều hành công việc <strong>mOS</strong>. Tài khoản của bạn đã sẵn
                      sàng với vai trò <strong>{staffRoleName}</strong>.
                    </Paragraph>

                    <div
                      style={{
                        backgroundColor: '#1a2234',
                        border: '1px solid #2d3748',
                        borderRadius: '8px',
                        padding: '14px 16px',
                        marginBottom: '18px',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#d4a84b', marginBottom: '10px' }}>
                        ✨ 3 BƯỚC ĐĂNG NHẬP NHANH BẰNG GOOGLE (1-CHẠM)
                      </div>
                      <div style={{ fontSize: '12px', color: '#e2e8f0', marginBottom: '8px' }}>
                        1. Nhấn nút truy cập mOS
                      </div>
                      <div style={{ fontSize: '12px', color: '#e2e8f0', marginBottom: '8px' }}>
                        2. Chọn <strong>&ldquo;Đăng nhập bằng Google&rdquo;</strong> (Google Sign-In)
                      </div>
                      <div style={{ fontSize: '12px', color: '#e2e8f0' }}>
                        3. Đăng nhập bằng email được cấp:{' '}
                        <span
                          style={{
                            color: '#e6b85c',
                            fontWeight: 'bold',
                            backgroundColor: '#0b0f19',
                            padding: '2px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          {previewEmailValue}
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '10px 24px',
                          background: 'linear-gradient(135deg, #e6b85c 0%, #b88628 100%)',
                          color: '#0b0f19',
                          fontWeight: 'bold',
                          borderRadius: '8px',
                          fontSize: '13px',
                        }}
                      >
                        🚀 ĐĂNG NHẬP VÀO mOS NGAY
                      </span>
                    </div>

                    <div
                      style={{
                        backgroundColor: '#131d2e',
                        borderLeft: '3px solid #38bdf8',
                        padding: '8px 12px',
                        fontSize: '11px',
                        color: '#cbd5e1',
                        borderRadius: '4px',
                      }}
                    >
                      📱 <strong>Mẹo thêm ra màn hình chính:</strong> Mở link trên Safari/Chrome &rarr; chọn{' '}
                      <em>&ldquo;Thêm vào Màn hình chính&rdquo;</em> để dùng tiện lợi như ứng dụng di động.
                    </div>
                  </div>
                </div>
              ),
            },
          ]}
        />
      ) : isBulk ? (
        <div style={{ paddingTop: '8px' }}>
          {missingBulkEmails.length > 0 && (
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              message={`Có ${missingBulkEmails.length} nhân viên chưa có email hợp lệ`}
              description="Những nhân viên này sẽ được bỏ qua trong đợt gửi. Bạn có thể cập nhật email cho họ trước khi gửi."
              style={{ marginBottom: '16px', borderRadius: '8px' }}
            />
          )}

          <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: '600' }}>Danh sách nhân viên nhận email:</Text>
            <Space size={8}>
              <Badge status="success" text={`${validBulkEmails.length} Email sẵn sàng`} />
              {missingBulkEmails.length > 0 && (
                <Badge status="error" text={`${missingBulkEmails.length} Thiếu email`} />
              )}
            </Space>
          </div>

          <Table
            dataSource={bulkStaffList}
            rowKey="id"
            pagination={{ pageSize: 5 }}
            size="small"
            columns={[
              {
                title: 'Nhân viên',
                dataIndex: 'displayName',
                key: 'displayName',
                render: (name: string, record: Staff) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Avatar size={24} src={record.avatarUrl} icon={<UserOutlined />} />
                    <span style={{ fontWeight: '600' }}>{name}</span>
                  </div>
                ),
              },
              {
                title: 'Vai trò',
                dataIndex: 'role',
                key: 'role',
                render: (r: string) => <Tag color="cyan">{roleMap.get(r) || r}</Tag>,
              },
              {
                title: 'Email nhận thư',
                dataIndex: 'email',
                key: 'email',
                render: (email: string | null) =>
                  email && email.includes('@') ? (
                    <Text style={{ fontSize: '13px' }}>{email}</Text>
                  ) : (
                    <Tag color="error">Chưa có email</Tag>
                  ),
              },
              {
                title: 'Lần gửi trước',
                dataIndex: 'lastOnboardingEmailSentAt',
                key: 'lastOnboardingEmailSentAt',
                render: (sentAt: string | null) =>
                  sentAt ? (
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      {dayjs(sentAt).format('DD/MM/YYYY HH:mm')}
                    </Text>
                  ) : (
                    <Text type="secondary" italic style={{ fontSize: '11px' }}>
                      Chưa gửi
                    </Text>
                  ),
              },
            ]}
          />
        </div>
      ) : null}
    </Modal>
  );
}
