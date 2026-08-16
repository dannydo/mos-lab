'use client';

import React, { useState } from 'react';
import { Input, Form, message, Alert, Space, Select } from 'antd';
import { UndoOutlined } from '@ant-design/icons';
import { apiClient } from '../../../../lib/api-client';
import { SafeAny } from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';
import { AdaptiveModal } from '../../../../components/ui';

interface UndoReasonModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batchId: string | null;
  customerCount?: number;
}

const PRESET_UNDO_REASONS = [
  'Phân bổ nhầm Booker',
  'Phân bổ sai số lượng data',
  'Bộ lọc phân bổ chưa đúng điều kiện',
  'Yêu cầu hoàn tác từ Quản lý',
];

export const UndoReasonModal: React.FC<UndoReasonModalProps> = ({
  visible,
  onClose,
  onSuccess,
  batchId,
  customerCount,
}) => {
  const { themeMode } = useTheme();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!batchId) return;

    try {
      const values = await form.validateFields();
      const reason = values.presetReason === 'CUSTOM' ? values.customReason : values.presetReason;

      if (!reason || !reason.trim()) {
        message.error('Vui lòng nhập lý do hoàn tác!');
        return;
      }

      setLoading(true);
      const res = await apiClient.customers.undoAssignment(batchId, reason.trim());

      if (res.success) {
        message.success(`Đã hoàn tác thành công ${res.revertedCount}/${res.totalCount} khách hàng về Booker cũ!`);
        form.resetFields();
        onSuccess();
        onClose();
      }
    } catch (error: SafeAny) {
      console.error('Undo assignment error:', error);
      const errMsg = error?.response?.data?.message || 'Không thể thực hiện hoàn tác.';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const presetReasonVal = Form.useWatch('presetReason', form);

  return (
    <AdaptiveModal
      intent="confirm"
      className="customer-undo-overlay"
      title={
        <Space>
          <UndoOutlined style={{ color: '#ff4d4f' }} />
          <span>Xác nhận Hoàn tác Đợt Phân Bổ</span>
        </Space>
      }
      open={visible}
      onOk={handleSubmit}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      okText="Xác nhận Hoàn tác"
      cancelText="Hủy"
      confirmLoading={loading}
      okButtonProps={{ danger: true }}
      styles={{
        body: {
          padding: '20px 24px',
          background: themeMode === 'dark' ? '#141414' : '#fff',
        },
      }}
    >
      <Alert
        message={`Bạn đang chọn hoàn tác đợt phân bổ (${customerCount || ''} khách hàng). Dữ liệu sẽ được khôi phục về trạng thái Booker cũ.`}
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical" initialValues={{ presetReason: PRESET_UNDO_REASONS[0] }}>
        <Form.Item
          name="presetReason"
          label="Lý do hoàn tác (Bắt buộc)"
          rules={[{ required: true, message: 'Vui lòng chọn hoặc nhập lý do hoàn tác!' }]}
        >
          <Select placeholder="Chọn lý do...">
            {PRESET_UNDO_REASONS.map((r) => (
              <Select.Option key={r} value={r}>
                {r}
              </Select.Option>
            ))}
            <Select.Option value="CUSTOM">Khác (Tự nhập lý do...)</Select.Option>
          </Select>
        </Form.Item>

        {presetReasonVal === 'CUSTOM' && (
          <Form.Item
            name="customReason"
            label="Lý do cụ thể"
            rules={[{ required: true, message: 'Vui lòng nhập lý do cụ thể!' }]}
          >
            <Input.TextArea rows={3} placeholder="Nhập lý do hoàn tác chi tiết..." maxLength={200} showCount />
          </Form.Item>
        )}
      </Form>
    </AdaptiveModal>
  );
};
