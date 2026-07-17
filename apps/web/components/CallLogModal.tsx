'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Input, DatePicker, Button, Space, message, Divider, theme } from 'antd';
import {
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { apiClient } from '../lib/api-client';
import { CALL_RESULT_LABELS, CALL_OUTCOME_LABELS } from '@mos-lab/shared';
import { useTheme } from '../context/ThemeContext';

const { TextArea } = Input;

interface CallLogModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  planId?: number | null;
  legacyUserId: number;
  customerName: string;
}

export default function CallLogModal({
  visible,
  onCancel,
  onSuccess,
  planId,
  legacyUserId,
  customerName,
}: CallLogModalProps) {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [callResult, setCallResult] = useState<string>('ANSWERED');
  const [outcome, setOutcome] = useState<string>('PENDING');

  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({
        callResult: 'ANSWERED',
        outcome: 'PENDING',
      });
      setCallResult('ANSWERED');
      setOutcome('PENDING');
    }
  }, [visible, form]);

  const handleQuickAction = async (actionType: 'NO_ANSWER' | 'CALL_BACK' | 'BOOKED' | 'RENEWED') => {
    setLoading(true);
    try {
      const data: SafeAny = {
        planId: planId || undefined,
        legacyUserId,
        callType: 'OUTBOUND' as const,
      };

      if (actionType === 'NO_ANSWER') {
        data.callResult = 'NO_ANSWER';
        data.outcome = 'PENDING';
        data.note = 'Gọi nhỡ - Không trả lời';
      } else if (actionType === 'CALL_BACK') {
        data.callResult = 'ANSWERED';
        data.outcome = 'CALL_BACK';
        data.note = 'Hẹn gọi lại sau';
        // Suggest callback tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        data.callbackDate = tomorrow.toISOString().split('T')[0];
      } else if (actionType === 'BOOKED') {
        data.callResult = 'ANSWERED';
        data.outcome = 'BOOKED';
        data.note = 'Đã book lịch hẹn mới';
      } else if (actionType === 'RENEWED') {
        data.callResult = 'ANSWERED';
        data.outcome = 'RENEWED';
        data.note = 'Đã gia hạn/mua combo mới';
      }

      await apiClient.calls.create(data);
      message.success('Ghi nhận cuộc gọi nhanh thành công!');
      onSuccess();
    } catch (error) {
      console.error('Quick call log error:', error);
      message.error('Không thể ghi nhận cuộc gọi.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async (values: SafeAny) => {
    setLoading(true);
    try {
      const data = {
        planId: planId || undefined,
        legacyUserId,
        callType: 'OUTBOUND' as const,
        callResult: values.callResult,
        outcome: values.outcome,
        note: values.note,
        callbackDate: values.callbackDate ? values.callbackDate.format('YYYY-MM-DD') : null,
      };

      await apiClient.calls.create(data);
      message.success('Ghi nhận lịch sử cuộc gọi thành công!');
      onSuccess();
    } catch (error) {
      console.error('Save call log error:', error);
      message.error('Không thể ghi nhận cuộc gọi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ color: token.colorPrimary, fontSize: '18px', fontWeight: 'bold' }}>
          <PhoneOutlined /> Ghi Nhận Cuộc Gọi: <span style={{ color: token.colorText }}>{customerName}</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={550}
      style={{ top: 80 }}
    >
      <div className="mb-6 mt-4">
        <div style={{ color: token.colorTextDescription, marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
          GHI NHANH (1-CLICK):
        </div>
        <Space wrap>
          <Button
            danger
            icon={<CloseCircleOutlined />}
            onClick={() => handleQuickAction('NO_ANSWER')}
            loading={loading}
          >
            Gọi Nhỡ (No Ans)
          </Button>
          <Button
            style={{ color: '#FAAD14', borderColor: '#FAAD14' }}
            ghost
            icon={<CalendarOutlined />}
            onClick={() => handleQuickAction('CALL_BACK')}
            loading={loading}
          >
            Hẹn Gọi Lại (Call Bk)
          </Button>
          <Button
            type="primary"
            style={{ background: '#52C41A', borderColor: '#52C41A', color: '#fff' }}
            icon={<CheckCircleOutlined />}
            onClick={() => handleQuickAction('BOOKED')}
            loading={loading}
          >
            Đã Book Lịch (Booked)
          </Button>
        </Space>
      </div>

      <Divider style={{ borderColor: token.colorBorderSecondary, margin: '15px 0' }} />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{
          callResult: 'ANSWERED',
          outcome: 'PENDING',
        }}
      >
        <Form.Item
          name="callResult"
          label={<span style={{ color: token.colorTextSecondary }}>Kết quả cuộc gọi</span>}
          rules={[{ required: true }]}
        >
          <Select
            onChange={(val) => {
              setCallResult(val);
              if (val !== 'ANSWERED') {
                form.setFieldsValue({ outcome: 'PENDING' });
                setOutcome('PENDING');
              }
            }}
            options={Object.entries(CALL_RESULT_LABELS).map(([k, v]) => ({ value: k, label: v }))}
          />
        </Form.Item>

        {callResult === 'ANSWERED' && (
          <Form.Item
            name="outcome"
            label={<span style={{ color: token.colorTextSecondary }}>Kết quả chi tiết</span>}
            rules={[{ required: true }]}
          >
            <Select
              onChange={(val) => setOutcome(val)}
              options={Object.entries(CALL_OUTCOME_LABELS)
                .filter(([k]) => k !== 'RENEWED')
                .map(([k, v]) => ({ value: k, label: v }))}
            />
          </Form.Item>
        )}

        {callResult === 'ANSWERED' && outcome === 'CALL_BACK' && (
          <Form.Item
            name="callbackDate"
            label={<span style={{ color: token.colorTextSecondary }}>Ngày hẹn gọi lại</span>}
            rules={[{ required: true, message: 'Vui lòng chọn ngày hẹn gọi lại' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
          </Form.Item>
        )}

        <Form.Item name="note" label={<span style={{ color: token.colorTextSecondary }}>Ghi chú cuộc gọi</span>}>
          <TextArea rows={4} placeholder="Nhập ghi chú chi tiết về cuộc hội thoại..." />
        </Form.Item>

        <Form.Item className="mb-0 text-right">
          <Space>
            <Button onClick={onCancel}>Hủy</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{ background: token.colorPrimary, borderColor: token.colorPrimary, color: '#000' }}
            >
              Lưu Nhật Ký
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
