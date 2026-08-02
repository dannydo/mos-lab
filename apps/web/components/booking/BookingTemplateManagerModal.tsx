'use client';

import React, { useState } from 'react';
import { Modal, Table, Button, Tag, Input, Select, Form, Popconfirm, message, Space, Card, Tooltip } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SettingOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { BookingConfirmationTemplate, BOOKING_TEMPLATE_TAGS } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { useTheme } from '../../context/ThemeContext';

const { TextArea } = Input;

interface BookingTemplateManagerModalProps {
  open: boolean;
  onClose: () => void;
  templates: BookingConfirmationTemplate[];
  onTemplatesUpdated: (templates: BookingConfirmationTemplate[]) => void;
}

const TYPE_OPTIONS = [
  { value: 'no_tech', label: '1. Không chọn Chuyên viên (Khung thường)' },
  { value: 'has_tech', label: '2. Có chọn Chuyên viên (Khung thường)' },
  { value: 'late_slot', label: '3. Khung 20:00 giờ (Không chọn CV)' },
  { value: 'has_tech_late_slot', label: '4. Có chọn Chuyên viên khung 20:00' },
  { value: 'custom', label: 'Mẫu tùy chọn (Không tự động chọn)' },
];

export const BookingTemplateManagerModal: React.FC<BookingTemplateManagerModalProps> = ({
  open,
  onClose,
  templates,
  onTemplatesUpdated,
}) => {
  const { themeMode } = useTheme();
  const [editingTemplate, setEditingTemplate] = useState<BookingConfirmationTemplate | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    form.setFieldsValue({
      title: '',
      type: 'custom',
      content: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (record: BookingConfirmationTemplate) => {
    setEditingTemplate(record);
    form.setFieldsValue({
      title: record.title,
      type: record.type,
      content: record.content,
    });
    setIsFormOpen(true);
  };

  const handleSaveForm = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload: BookingConfirmationTemplate = {
        id: editingTemplate ? editingTemplate.id : `tpl_booking_${Date.now()}`,
        title: values.title.trim(),
        type: values.type,
        content: values.content,
        isDefault: editingTemplate ? editingTemplate.isDefault : false,
      };

      const res = await apiClient.sms.saveBookingTemplate(payload);
      if (res.success && res.templates) {
        onTemplatesUpdated(res.templates);
        message.success(
          editingTemplate ? 'Đã cập nhật mẫu tin nhắn thành công!' : 'Đã tạo mẫu tin nhắn mới thành công!'
        );
        setIsFormOpen(false);
        setEditingTemplate(null);
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      console.error('[TemplateManager] Save failed:', err);
      message.error('Có lỗi xảy ra khi lưu mẫu tin nhắn.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const res = await apiClient.sms.deleteBookingTemplate(id);
      if (res.success && res.templates) {
        onTemplatesUpdated(res.templates);
        message.success('Đã xóa mẫu tin nhắn thành công!');
      }
    } catch (err) {
      console.error('[TemplateManager] Delete failed:', err);
      message.error('Không thể xóa mẫu tin nhắn.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDefaults = async () => {
    setLoading(true);
    try {
      const res = await apiClient.sms.resetBookingTemplates();
      if (res.success && res.templates) {
        onTemplatesUpdated(res.templates);
        message.success('Đã khôi phục 4 mẫu tin nhắn mặc định của hệ thống!');
      }
    } catch (err) {
      console.error('[TemplateManager] Reset failed:', err);
      message.error('Khôi phục mẫu mặc định thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const renderTypeTag = (type: string) => {
    switch (type) {
      case 'no_tech':
        return <Tag color="blue">Không chọn CV</Tag>;
      case 'has_tech':
        return <Tag color="cyan">Có chọn CV</Tag>;
      case 'late_slot':
        return <Tag color="orange">Khung 20:00</Tag>;
      case 'has_tech_late_slot':
        return <Tag color="purple">Có CV + Khung 20:00</Tag>;
      default:
        return <Tag color="default">Mẫu tùy chọn</Tag>;
    }
  };

  const columns = [
    {
      title: 'Tên mẫu tin nhắn',
      dataIndex: 'title',
      key: 'title',
      width: 220,
      render: (text: string, record: BookingConfirmationTemplate) => (
        <Space direction="vertical" size={2}>
          <span style={{ fontWeight: '600' }}>{text}</span>
          {record.isDefault && (
            <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircleOutlined /> Hệ thống mặc định
            </span>
          )}
        </Space>
      ),
    },
    {
      title: 'Điều kiện tự động chọn',
      dataIndex: 'type',
      key: 'type',
      width: 180,
      render: (type: string) => renderTypeTag(type),
    },
    {
      title: 'Nội dung xem trước',
      dataIndex: 'content',
      key: 'content',
      render: (content: string) => (
        <div
          style={{
            maxHeight: '60px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'pre-line',
            fontSize: '12px',
            color: themeMode === 'dark' ? '#cbd5e1' : '#475569',
            fontFamily: 'monospace',
          }}
        >
          {content}
        </div>
      ),
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 110,
      align: 'center' as const,
      render: (_: any, record: BookingConfirmationTemplate) => (
        <Space size="small">
          <Tooltip title="Chỉnh sửa mẫu">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#d97706' }} />}
              onClick={() => handleOpenEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa mẫu tin nhắn"
            description="Bạn có chắc chắn muốn xóa mẫu tin nhắn này không?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa mẫu">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#D4A84B' }}>
          <SettingOutlined />
          <span>QUẢN LÝ MẪU TIN NHẮN XÁC NHẬN ĐẶT LỊCH</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
      ]}
      width={840}
      styles={{
        body: {
          background: themeMode === 'dark' ? '#141414' : '#f9fafb',
          padding: '20px',
        },
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Actions header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            onClick={handleOpenCreate}
          >
            Thêm Mẫu Mới
          </Button>

          <Popconfirm
            title="Khôi phục 4 mẫu mặc định ban đầu?"
            description="Thao tác này sẽ đặt lại danh sách mẫu về ban đầu của hệ thống."
            onConfirm={handleResetDefaults}
            okText="Khôi phục"
            cancelText="Hủy"
          >
            <Button icon={<ReloadOutlined />}>Khôi phục mẫu mặc định</Button>
          </Popconfirm>
        </div>

        {/* Table of templates */}
        <Table
          dataSource={templates}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="small"
          bordered
        />

        {/* Edit / Create Form Card */}
        {isFormOpen && (
          <Card
            title={
              <span style={{ color: '#D4A84B', fontWeight: 'bold' }}>
                {editingTemplate ? 'CHỈNH SỬA MẪU TIN NHẮN' : 'TẠO MẪU TIN NHẮN MỚI'}
              </span>
            }
            style={{
              backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
              marginTop: '10px',
            }}
          >
            <Form form={form} layout="vertical">
              <Form.Item
                name="title"
                label="Tên tiêu đề mẫu"
                rules={[{ required: true, message: 'Vui lòng nhập tên tiêu đề mẫu' }]}
              >
                <Input placeholder="Ví dụ: Lịch hẹn khách VIP..." />
              </Form.Item>

              <Form.Item
                name="type"
                label="Quy tắc tự động kích hoạt mẫu"
                rules={[{ required: true, message: 'Vui lòng chọn điều kiện' }]}
              >
                <Select options={TYPE_OPTIONS} />
              </Form.Item>

              <Form.Item label="Chèn nhanh thẻ biến động">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {BOOKING_TEMPLATE_TAGS.map((tagDef) => (
                    <Button
                      key={tagDef.tag}
                      size="small"
                      type="dashed"
                      onClick={() => {
                        const current = form.getFieldValue('content') || '';
                        form.setFieldValue('content', current + tagDef.tag);
                      }}
                      style={{
                        fontSize: '12px',
                        borderColor: themeMode === 'dark' ? '#334155' : '#cbd5e1',
                        color: themeMode === 'dark' ? '#fbbf24' : '#d97706',
                      }}
                    >
                      + {tagDef.label}
                    </Button>
                  ))}
                </div>
              </Form.Item>

              <Form.Item
                name="content"
                label="Nội dung mẫu tin nhắn"
                rules={[{ required: true, message: 'Vui lòng nhập nội dung mẫu tin nhắn' }]}
              >
                <TextArea rows={6} style={{ fontFamily: 'monospace', fontSize: '13px' }} />
              </Form.Item>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <Button onClick={() => setIsFormOpen(false)}>Hủy</Button>
                <Button type="primary" loading={loading} onClick={handleSaveForm}>
                  Lưu Mẫu Tin Nhắn
                </Button>
              </div>
            </Form>
          </Card>
        )}
      </div>
    </Modal>
  );
};
