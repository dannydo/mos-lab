'use client';

import React, { useState } from 'react';
import { Modal, Form, Input, Radio, Switch, Space, message } from 'antd';
import { FormOutlined } from '@ant-design/icons';
import { useTheme } from '../../../context/ThemeContext';
import { apiClient } from '../../../lib/api-client';

interface CreateNoteModalProps {
  open: boolean;
  customerId: number | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export const CreateNoteModal: React.FC<CreateNoteModalProps> = ({ open, customerId, onCancel, onSuccess }) => {
  const { themeMode } = useTheme();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!customerId) return;
    try {
      const values = await form.validateFields();
      setLoading(true);

      await apiClient.customers.createNote(customerId, {
        note: values.note,
        noteFieldKey: values.noteFieldKey,
        isSticky: values.isSticky,
      });

      message.success('Thêm ghi chú thành công!');
      form.resetFields();
      onSuccess();
    } catch (err) {
      console.error('Failed to create customer note:', err);
      message.error((err as SafeAny).response?.data?.message || 'Không thể lưu ghi chú.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClick = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={
        <span style={{ color: themeMode === 'dark' ? '#fff' : '#1f2937', fontWeight: 'bold', fontSize: '16px' }}>
          <FormOutlined style={{ marginRight: '8px', color: '#D4A84B' }} />
          Thêm Ghi Chú Mới
        </span>
      }
      open={open}
      onCancel={handleCancelClick}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="Thêm ghi chú"
      cancelText="Hủy"
      width={500}
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
      <Form
        form={form}
        layout="vertical"
        initialValues={{ noteFieldKey: 'note', isSticky: false }}
        style={{ marginTop: '8px' }}
      >
        <Form.Item
          name="note"
          label={
            <span style={{ color: themeMode === 'dark' ? '#fff' : '#4b5563', fontWeight: '500' }}>
              Nội dung ghi chú
            </span>
          }
          rules={[{ required: true, message: 'Vui lòng nhập nội dung ghi chú' }]}
        >
          <Input.TextArea
            rows={4}
            placeholder="Nhập nội dung ghi chú ở đây..."
            style={{
              backgroundColor: themeMode === 'dark' ? '#0f172a' : '#ffffff',
              color: themeMode === 'dark' ? '#fff' : '#1f2937',
              borderColor: themeMode === 'dark' ? '#334155' : '#d9d9d9',
            }}
          />
        </Form.Item>

        <Form.Item
          name="noteFieldKey"
          label={
            <span style={{ color: themeMode === 'dark' ? '#fff' : '#4b5563', fontWeight: '500' }}>
              Phân loại ghi chú
            </span>
          }
          rules={[{ required: true }]}
        >
          <Radio.Group>
            <Space direction="vertical">
              <Radio value="note" style={{ color: themeMode === 'dark' ? '#e2e8f0' : '#1f2937' }}>
                CSKH / Telesales (Lưu vào tab CS)
              </Radio>
              <Radio value="order_note" style={{ color: themeMode === 'dark' ? '#e2e8f0' : '#1f2937' }}>
                CC / Check-in-out (Lưu vào tab CC)
              </Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Form.Item name="isSticky" valuePropName="checked" noStyle>
              <Switch />
            </Form.Item>
            <span style={{ color: themeMode === 'dark' ? '#fff' : '#1f2937', fontWeight: '500' }}>
              Quan trọng và ghim
            </span>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};
