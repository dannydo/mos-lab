'use client';

import React from 'react';
import { Form, Input, Select, DatePicker, Card, Space, Switch, Button } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useTheme } from '../../../context/ThemeContext';
import { AdaptiveModal, ResponsiveFormGrid } from '../../ui';

interface EditCustomerModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
  confirmLoading: boolean;
  form: SafeAny;
}

export const EditCustomerModal: React.FC<EditCustomerModalProps> = ({ open, onCancel, onOk, confirmLoading, form }) => {
  const { themeMode } = useTheme();

  return (
    <AdaptiveModal
      intent="form"
      className="customer-edit-overlay"
      title={
        <span style={{ color: themeMode === 'dark' ? '#fff' : '#1f2937', fontWeight: 'bold', fontSize: '16px' }}>
          ✏️ Sửa Thông Tin Khách Hàng
        </span>
      }
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={confirmLoading}
      okText="Lưu thay đổi"
      cancelText="Hủy"
      styles={{
        body: {
          paddingTop: '16px',
          backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
        },
        content: {
          backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
          color: themeMode === 'dark' ? '#fff' : '#1f2937',
        },
        header: {
          backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
          borderBottom: `1px solid ${themeMode === 'dark' ? '#334155' : '#e5e7eb'}`,
          paddingBottom: '8px',
        },
      }}
    >
      <Form form={form} layout="vertical" style={{ marginTop: '8px' }}>
        <Form.Item
          name="name"
          label={<span style={{ color: themeMode === 'dark' ? '#fff' : '#4b5563' }}>Họ và Tên</span>}
          rules={[{ required: true, message: 'Vui lòng nhập họ và tên khách hàng' }]}
        >
          <Input
            style={{
              backgroundColor: themeMode === 'dark' ? '#0f172a' : '#ffffff',
              color: themeMode === 'dark' ? '#fff' : '#1f2937',
              borderColor: themeMode === 'dark' ? '#334155' : '#d9d9d9',
            }}
          />
        </Form.Item>

        <Form.Item
          name="isForeign"
          label={<span style={{ color: themeMode === 'dark' ? '#fff' : '#4b5563' }}>Phân loại Quốc tịch</span>}
          valuePropName="checked"
        >
          <Switch checkedChildren="🌐 Khách nước ngoài" unCheckedChildren="🇻🇳 Khách Việt Nam" />
        </Form.Item>

        <ResponsiveFormGrid columns={2}>
          <Form.Item
            name="gender"
            label={<span style={{ color: themeMode === 'dark' ? '#fff' : '#4b5563' }}>Giới tính</span>}
          >
            <Select
              allowClear
              style={{ width: '100%' }}
              styles={{ popup: { root: { backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff' } } }}
              options={[
                { value: 'Male', label: 'Nam' },
                { value: 'Female', label: 'Nữ' },
                { value: 'Other', label: 'Khác' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="dob"
            label={<span style={{ color: themeMode === 'dark' ? '#fff' : '#4b5563' }}>Ngày sinh</span>}
          >
            <DatePicker
              format="DD/MM/YYYY"
              style={{
                width: '100%',
                backgroundColor: themeMode === 'dark' ? '#0f172a' : '#ffffff',
                borderColor: themeMode === 'dark' ? '#334155' : '#d9d9d9',
              }}
              placeholder="Chọn ngày sinh"
            />
          </Form.Item>
        </ResponsiveFormGrid>

        <Form.Item
          name="email"
          label={<span style={{ color: themeMode === 'dark' ? '#fff' : '#4b5563' }}>Email</span>}
          rules={[{ type: 'email', message: 'Email không hợp lệ' }]}
        >
          <Input
            placeholder="example@domain.com"
            style={{
              backgroundColor: themeMode === 'dark' ? '#0f172a' : '#ffffff',
              color: themeMode === 'dark' ? '#fff' : '#1f2937',
              borderColor: themeMode === 'dark' ? '#334155' : '#d9d9d9',
            }}
          />
        </Form.Item>

        <Card
          size="small"
          title={
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: themeMode === 'dark' ? '#fff' : '#374151' }}>
              📞 Danh sách số điện thoại
            </span>
          }
          style={{
            backgroundColor: themeMode === 'dark' ? '#0f172a' : '#f9fafb',
            borderColor: themeMode === 'dark' ? '#334155' : '#e5e7eb',
          }}
        >
          <Form.List name="phones">
            {(fields, { add, remove }) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', width: '100%', alignItems: 'center' }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'phone_number']}
                      rules={[
                        { required: true, message: 'Số điện thoại không được để trống' },
                        { pattern: /^[0-9+()-\s]*$/, message: 'Số điện thoại không hợp lệ' },
                      ]}
                      style={{ marginBottom: 0, width: '220px' }}
                    >
                      <Input
                        placeholder="Số điện thoại"
                        style={{
                          backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
                          color: themeMode === 'dark' ? '#fff' : '#1f2937',
                          borderColor: themeMode === 'dark' ? '#334155' : '#d9d9d9',
                        }}
                      />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'is_active']}
                      valuePropName="checked"
                      style={{ marginBottom: 0 }}
                    >
                      <Switch checkedChildren="Hoạt động" unCheckedChildren="Khóa" style={{ minWidth: '100px' }} />
                    </Form.Item>

                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      aria-label="Xóa số điện thoại"
                      onClick={() => remove(name)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    />
                  </Space>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add({ phone_number: '', is_active: true })}
                  block
                  icon={<PlusOutlined />}
                  style={{
                    color: '#D4A84B',
                    borderColor: '#D4A84B',
                    marginTop: '8px',
                  }}
                >
                  Thêm số điện thoại mới
                </Button>
              </div>
            )}
          </Form.List>
        </Card>
      </Form>
    </AdaptiveModal>
  );
};
