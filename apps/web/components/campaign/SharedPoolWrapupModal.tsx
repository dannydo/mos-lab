'use client';

import React, { useState } from 'react';
import { Modal, Form, Select, Input, InputNumber, DatePicker, Button, Space, message, Tag } from 'antd';
import { PhoneOutlined, CheckCircleOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { UpdateSharedPoolStatusDto } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';

interface SharedPoolWrapupModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  campaignId: number;
  customer: any | null;
}

export const SharedPoolWrapupModal: React.FC<SharedPoolWrapupModalProps> = ({
  open,
  onCancel,
  onSuccess,
  campaignId,
  customer,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [selectedResult, setSelectedResult] = useState<string>('THINKING');

  if (!customer) return null;

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const dto: UpdateSharedPoolStatusDto = {
        customerId: customer.id || customer.legacyUserId,
        callResult: values.callResult,
        note: values.note ? String(values.note).trim() : undefined,
        durationSec: values.durationSec ? Number(values.durationSec) : 0,
        callbackDate: values.callbackDate ? values.callbackDate.toISOString() : undefined,
        isBooked: values.callResult === 'BOOKED',
      };

      const res = await apiClient.campaigns.updateSharedPoolStatus(campaignId, dto);
      message.success(res.message || 'Ghi nhận kết quả cuộc gọi thành công!');
      form.resetFields();
      onSuccess();
    } catch (err: any) {
      console.error('Call wrapup error:', err);
      message.error(err?.response?.data?.message || 'Không thể ghi nhận kết quả');
    } finally {
      setSubmitting(false);
    }
  };

  const callResultOptions = [
    { value: 'BOOKED', label: '🎉 Đặt lịch hẹn thành công (BOOKED)' },
    { value: 'THINKING', label: '🤔 Đang suy nghĩ / Cân nhắc (Tái sinh sau vài ngày)' },
    { value: 'CALLBACK', label: '📅 Hẹn gọi lại vào ngày cụ thể' },
    { value: 'NO_ANSWER', label: '📴 Không nghe máy (Tự động vào chu kỳ tái sinh)' },
    { value: 'BUSY', label: '⏳ Bận máy / Đang bận (Tự động vào chu kỳ tái sinh)' },
    { value: 'ERROR', label: '📡 Lỗi liên lạc / Sóng yếu (Tự động vào chu kỳ tái sinh)' },
    { value: 'NO_NEED', label: '🚫 Không có nhu cầu (Loại khỏi Pool)' },
    { value: 'REJECTED', label: '❌ Từ chối thẳng thừng (Loại khỏi Pool)' },
    { value: 'WRONG_NUMBER', label: '⚠️ Sai số / Nhầm máy (Loại khỏi Pool)' },
  ];

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <PhoneOutlined className="text-purple-600 text-lg" />
          <span className="font-bold text-base">Báo Cáo Cuộc Gọi & Cập Nhật Shared Pool</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
      width={560}
    >
      <div className="mb-4 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 flex items-center justify-between">
        <div>
          <div className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <UserOutlined className="text-purple-500" />
            <span>{customer.customerName || `Khách hàng #${customer.legacyUserId}`}</span>
          </div>
          <div className="text-xs text-purple-600 dark:text-purple-400 font-mono mt-0.5">
            {customer.customerPhone || 'Không có số'}
          </div>
        </div>
        <Tag color="purple" className="font-semibold text-xs m-0">
          Batch #{customer.batchNumber || 1}
        </Tag>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          callResult: 'THINKING',
          durationSec: 60,
        }}
      >
        <Form.Item
          name="callResult"
          label={<span className="font-semibold text-xs uppercase tracking-wide">Kết quả cuộc gọi</span>}
          rules={[{ required: true, message: 'Vui lòng chọn kết quả cuộc gọi' }]}
        >
          <Select
            size="large"
            options={callResultOptions}
            onChange={(val) => setSelectedResult(val)}
            className="w-full"
          />
        </Form.Item>

        {selectedResult === 'CALLBACK' && (
          <Form.Item
            name="callbackDate"
            label={<span className="font-semibold text-xs uppercase tracking-wide">Ngày hẹn gọi lại</span>}
            rules={[{ required: true, message: 'Vui lòng chọn ngày giờ hẹn gọi lại' }]}
          >
            <DatePicker
              showTime
              format="DD/MM/YYYY HH:mm"
              className="w-full"
              placeholder="Chọn ngày giờ hẹn gọi lại..."
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Form.Item
            name="durationSec"
            label={<span className="font-semibold text-xs uppercase tracking-wide">Thời lượng (giây)</span>}
          >
            <InputNumber min={0} max={7200} placeholder="Giây" style={{ width: '100%' }} />
          </Form.Item>
        </div>

        <Form.Item
          name="note"
          label={<span className="font-semibold text-xs uppercase tracking-wide">Ghi chú cuộc gọi</span>}
        >
          <Input.TextArea
            rows={3}
            placeholder="Nội dung trao đổi, mong muốn khách hàng, lý do chưa chốt..."
          />
        </Form.Item>

        <div className="pt-2 border-t flex justify-end gap-2">
          <Button onClick={onCancel} disabled={submitting}>
            Hủy
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            icon={<CheckCircleOutlined />}
            className="bg-purple-600 hover:bg-purple-500 font-semibold text-white"
          >
            Lưu kết quả & Nhả Pool
          </Button>
        </div>
      </Form>
    </Modal>
  );
};
