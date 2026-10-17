import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, DatePicker, Radio, Button, Space, message, Tag } from 'antd';
import dayjs from 'dayjs';
import { apiClient } from '../../../lib/api-client';
import { CustomerElsaReservation } from '@mos-lab/shared';

interface ElsaReservationModalProps {
  open: boolean;
  onClose: () => void;
  customerId: number;
  customerName: string;
  currentReservation?: CustomerElsaReservation | null;
  onSuccess: () => void;
  themeMode: 'light' | 'dark';
}

const PRESET_REASONS = [
  'Đi công tác xa / nước ngoài',
  'Sanh đẻ / Nghỉ thai sản',
  'Khách quen diện đặc biệt PXL',
  'Kiêng mi tạm thời / Mắt nhạy cảm',
  'Đi du lịch dài ngày',
];

export const ElsaReservationModal: React.FC<ElsaReservationModalProps> = ({
  open,
  onClose,
  customerId,
  customerName,
  currentReservation,
  onSuccess,
  themeMode,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [reservationType, setReservationType] = useState<'FIXED_TERM' | 'INDEFINITE'>('FIXED_TERM');

  const isEditing = Boolean(currentReservation && currentReservation.status === 'ACTIVE');

  useEffect(() => {
    if (open) {
      if (currentReservation && currentReservation.status === 'ACTIVE') {
        const type = currentReservation.reservationType || 'FIXED_TERM';
        setReservationType(type);
        form.setFieldsValue({
          reason: currentReservation.reason,
          reservationType: type,
          endDate: currentReservation.endDate ? dayjs(currentReservation.endDate) : null,
          reminderDate: currentReservation.reminderDate ? dayjs(currentReservation.reminderDate) : null,
          reminderNote: currentReservation.reminderNote || '',
        });
      } else {
        setReservationType('FIXED_TERM');
        form.setFieldsValue({
          reason: '',
          reservationType: 'FIXED_TERM',
          endDate: dayjs().add(3, 'month'),
          reminderDate: dayjs().add(1, 'month'),
          reminderNote: '',
        });
      }
    } else {
      form.resetFields();
    }
  }, [open, currentReservation, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload = {
        reason: values.reason.trim(),
        reservationType: values.reservationType,
        endDate: values.reservationType === 'FIXED_TERM' && values.endDate ? values.endDate.format('YYYY-MM-DD') : null,
        reminderDate: values.reminderDate.format('YYYY-MM-DD'),
        reminderNote: values.reminderNote ? values.reminderNote.trim() : null,
      };

      if (isEditing) {
        await apiClient.customers.updateElsa(customerId, payload);
        message.success('Đã cập nhật thông tin bảo lưu Combo Elsa');
      } else {
        await apiClient.customers.reserveElsa(customerId, payload);
        message.success('Đã đưa khách hàng vào tệp Combo Elsa thành công');
      }

      onSuccess();
      onClose();
    } catch (err: SafeAny) {
      if (err?.errorFields) return; // Validation error
      console.error('Elsa reservation error:', err);
      message.error(err?.response?.data?.message || 'Có lỗi xảy ra khi lưu bảo lưu Combo Elsa');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset: string) => {
    form.setFieldsValue({ reason: preset });
    if (preset.includes('PXL')) {
      form.setFieldsValue({ reservationType: 'INDEFINITE' });
      setReservationType('INDEFINITE');
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText={isEditing ? 'Cập nhật' : 'Xác nhận bảo lưu Elsa'}
      cancelText="Hủy"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>❄️</span>
          <span>
            {isEditing ? 'Chỉnh sửa bảo lưu Combo Elsa' : 'Bảo lưu Combo (Combo Elsa)'} — <strong>{customerName}</strong>
          </span>
        </div>
      }
      width={560}
      destroyOnClose
    >
      <div
        style={{
          marginBottom: '16px',
          padding: '10px 12px',
          borderRadius: '6px',
          background: themeMode === 'dark' ? 'rgba(2, 132, 199, 0.15)' : '#e0f2fe',
          border: '1px solid #38bdf8',
          fontSize: '13px',
          color: themeMode === 'dark' ? '#bae6fd' : '#0369a1',
          lineHeight: '1.5',
        }}
      >
        Khách hàng bảo lưu Combo Elsa sẽ được tách riêng khỏi các tệp Single / Combo Live. Bắt buộc có{' '}
        <strong>ngày nhắc chăm sóc</strong> để đội ngũ telesales/chăm sóc khách hàng chủ động thăm hỏi.
      </div>

      <Form form={form} layout="vertical" initialValues={{ reservationType: 'FIXED_TERM' }}>
        <Form.Item
          label="Lý do bảo lưu"
          name="reason"
          rules={[{ required: true, message: 'Vui lòng nhập lý do bảo lưu combo' }]}
        >
          <Input.TextArea
            rows={2}
            placeholder="Ví dụ: Chị Mai đi công tác đến cuối năm, hỗ trợ 25D/lần; Cô Giáng Hương diện PXL..."
          />
        </Form.Item>

        <div style={{ marginBottom: '16px', marginTop: '-8px' }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>Gợi ý nhanh lý do:</div>
          <Space wrap size={[4, 6]}>
            {PRESET_REASONS.map((preset) => (
              <Tag
                key={preset}
                style={{ cursor: 'pointer', borderRadius: '4px' }}
                onClick={() => handleSelectPreset(preset)}
              >
                {preset}
              </Tag>
            ))}
          </Space>
        </div>

        <Form.Item label="Hình thức bảo lưu" name="reservationType" rules={[{ required: true }]}>
          <Radio.Group onChange={(e) => setReservationType(e.target.value)}>
            <Radio value="FIXED_TERM">Có thời hạn</Radio>
            <Radio value="INDEFINITE">Vô thời hạn (Diện PXL / Đặc biệt)</Radio>
          </Radio.Group>
        </Form.Item>

        {reservationType === 'FIXED_TERM' && (
          <Form.Item
            label="Hạn bảo lưu đến ngày"
            name="endDate"
            rules={[{ required: true, message: 'Vui lòng chọn ngày kết thúc bảo lưu' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              placeholder="Chọn ngày hết hạn bảo lưu"
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>
        )}

        <Form.Item
          label={
            <span>
              <strong>Ngày nhắc chăm sóc</strong> <span style={{ color: '#ef4444' }}>*</span> (Hệ thống sẽ tạo lịch nhắc thăm hỏi)
            </span>
          }
          name="reminderDate"
          rules={[{ required: true, message: 'Vui lòng chọn ngày nhắc chăm sóc đặc biệt' }]}
        >
          <DatePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            placeholder="Chọn ngày telesales/chăm sóc cần gọi thăm hỏi"
          />
        </Form.Item>

        <Form.Item label="Ghi chú dặn dò khi chăm sóc (Reminder note)" name="reminderNote">
          <Input.TextArea
            rows={2}
            placeholder="Ví dụ: Hỏi thăm tình hình công tác, nếu về dặm thêm áp dụng giá 25D..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
