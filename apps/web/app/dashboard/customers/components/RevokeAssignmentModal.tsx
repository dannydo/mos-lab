'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Select,
  Input,
  Form,
  message,
  Alert,
  Space,
  Typography,
  Tag,
  Segmented,
  Tooltip,
  theme,
  Spin,
} from 'antd';
import {
  WarningOutlined,
  UserSwitchOutlined,
  InboxOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { apiClient } from '../../../../lib/api-client';
import { SafeAny, Staff, RevokePreviewResponse, vietnameseSearchFilter } from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';

const { Text } = Typography;

interface RevokeAssignmentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customerIds: number[];
  staffList: Staff[];
  batchId?: string | null;
  parentBatchId?: string | null;
}

const PRESET_REASONS = [
  'Booker không tương tác chăm sóc',
  'Booker nghỉ việc / chuyển team',
  'Phân bổ nhầm data',
  'Yêu cầu thu hồi từ Quản lý',
];

export const RevokeAssignmentModal: React.FC<RevokeAssignmentModalProps> = ({
  visible,
  onClose,
  onSuccess,
  customerIds,
  staffList,
  batchId,
  parentBatchId,
}) => {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState<'POOL' | 'TRANSFER'>('POOL');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<RevokePreviewResponse | null>(null);

  useEffect(() => {
    if (visible && customerIds && customerIds.length > 0) {
      setPreviewLoading(true);
      apiClient.customers
        .revokePreview({ customerIds })
        .then((res) => setPreviewData(res))
        .catch((err) => console.error('Revoke preview error:', err))
        .finally(() => setPreviewLoading(false));
    } else {
      setPreviewData(null);
    }
  }, [visible, customerIds]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const reason = values.presetReason === 'CUSTOM' ? values.customReason : values.presetReason;

      if (!reason || !reason.trim()) {
        message.error('Vui lòng chọn hoặc nhập lý do thu hồi!');
        return;
      }

      setLoading(true);
      const res = await apiClient.customers.revoke({
        customerIds,
        reason: reason.trim(),
        targetStaffId: actionType === 'TRANSFER' ? values.targetStaffId : null,
        batchId: batchId || undefined,
        parentBatchId: parentBatchId || undefined,
      });

      if (res.success) {
        let msg =
          actionType === 'TRANSFER'
            ? `Đã chuyển ${res.revokedCount ?? customerIds.length} data sang Booker mới!`
            : `Đã thu hồi thành công ${res.revokedCount ?? customerIds.length} data về Pool tổng!`;
        if (res.skippedUnassignedCount && res.skippedUnassignedCount > 0) {
          msg += ` (Đã tự động bỏ qua ${res.skippedUnassignedCount} KH chưa từng phân bổ)`;
        }
        message.success(msg);
        form.resetFields();
        onSuccess();
        onClose();
      }
    } catch (error: SafeAny) {
      console.error('Revoke assignment error:', error);
      const errMsg = error?.response?.data?.message || 'Không thể thực hiện thu hồi.';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const presetReasonVal = Form.useWatch('presetReason', form);

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <WarningOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
          <span style={{ fontWeight: 600 }}>Thu hồi / Chuyển giao Data</span>
          <Tag color="volcano" style={{ borderRadius: '12px', fontWeight: 600 }}>
            {customerIds.length} KH
          </Tag>
        </div>
      }
      open={visible}
      onOk={handleSubmit}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      okText="Xác nhận"
      cancelText="Hủy"
      confirmLoading={loading}
      okButtonProps={{
        danger: actionType === 'POOL',
        style: { borderRadius: '6px', fontWeight: 600 },
      }}
      cancelButtonProps={{
        style: { borderRadius: '6px' },
      }}
      styles={{
        content: {
          borderRadius: '14px',
          overflow: 'hidden',
          padding: '24px',
        },
      }}
    >
      {previewLoading ? (
        <div style={{ padding: '16px', textAlign: 'center', marginBottom: 16 }}>
          <Spin size="small" /> <span style={{ marginLeft: 8 }}>Đang kiểm tra trạng thái phân bổ...</span>
        </div>
      ) : previewData ? (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderRadius: '10px',
            background: themeMode === 'dark' ? '#262626' : '#fffbe6',
            border: `1px solid ${themeMode === 'dark' ? '#434343' : '#ffe58f'}`,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6, color: '#d48806' }}>
            📊 Phân tích danh sách {previewData.totalCount} KH đã chọn:
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: 8 }}>
            <Tag color="green" style={{ borderRadius: 10 }}>
              Chưa phân bổ: <b>{previewData.unassignedCount} KH</b> (Tự động bỏ qua)
            </Tag>
            <Tag color="volcano" style={{ borderRadius: 10 }}>
              Đang có Booker: <b>{previewData.assignedCount} KH</b> (Sẽ thu hồi)
            </Tag>
          </div>
          {previewData.staffBreakdown.length > 0 && (
            <div style={{ fontSize: '12px', color: token.colorTextDescription }}>
              <b>Booker hiện tại:</b>{' '}
              {previewData.staffBreakdown.map((s) => (
                <Tag key={s.staffId} color="blue" style={{ marginTop: 4 }}>
                  {s.staffName}: {s.count} KH
                </Tag>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Alert
          message={
            <Text style={{ fontSize: '13px' }}>
              Hành động sẽ được ghi nhận vào <b>Nhật ký Phân bổ & Timeline</b> của {customerIds.length} khách hàng.
            </Text>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 20, borderRadius: '8px' }}
        />
      )}

      <Form form={form} layout="vertical" initialValues={{ presetReason: PRESET_REASONS[0] }}>
        <Form.Item label={<Text strong>Thao tác thu hồi</Text>} style={{ marginBottom: 16 }}>
          <Segmented
            block
            value={actionType}
            onChange={(val) => setActionType(val as 'POOL' | 'TRANSFER')}
            options={[
              {
                label: (
                  <Tooltip title="Đưa data về Pool chung để phân bổ lại sau">
                    <div
                      style={{
                        padding: '6px 0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <InboxOutlined style={{ fontSize: 15 }} />
                      <span>Thu hồi về Pool tổng</span>
                    </div>
                  </Tooltip>
                ),
                value: 'POOL',
              },
              {
                label: (
                  <Tooltip title="Chuyển giao trực tiếp data cho 1 Booker mới">
                    <div
                      style={{
                        padding: '6px 0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <UserSwitchOutlined style={{ fontSize: 15 }} />
                      <span>Chuyển cho Booker mới</span>
                    </div>
                  </Tooltip>
                ),
                value: 'TRANSFER',
              },
            ]}
            style={{ padding: 4 }}
          />
        </Form.Item>

        {actionType === 'TRANSFER' && (
          <Form.Item
            name="targetStaffId"
            label={<Text strong>Chọn Booker nhận mới</Text>}
            rules={[{ required: true, message: 'Vui lòng chọn Booker nhận mới!' }]}
          >
            <Select
              placeholder="Chọn Booker..."
              showSearch
              filterOption={vietnameseSearchFilter}
              style={{ borderRadius: '6px' }}
            >
              {staffList
                .filter((s) => ['telesales', 'booker'].includes(s.role?.toLowerCase() || ''))
                .map((staff) => (
                  <Select.Option key={staff.id} value={staff.id}>
                    {staff.displayName} (@{staff.username})
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
        )}

        <Form.Item
          name="presetReason"
          label={
            <Space size={4}>
              <Text strong>Lý do thu hồi (Bắt buộc)</Text>
              <Tooltip title="Ghi nhận lý do để kiểm toán & quản lý hiệu suất Booker">
                <InfoCircleOutlined style={{ color: token.colorTextDescription, fontSize: 13 }} />
              </Tooltip>
            </Space>
          }
          rules={[{ required: true, message: 'Vui lòng chọn hoặc nhập lý do thu hồi!' }]}
        >
          <Select placeholder="Chọn lý do thu hồi...">
            {PRESET_REASONS.map((r) => (
              <Select.Option key={r} value={r}>
                {r}
              </Select.Option>
            ))}
            <Select.Option value="CUSTOM">Khác (Nhập lý do riêng...)</Select.Option>
          </Select>
        </Form.Item>

        {/* Quick Reason Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16, marginTop: -8 }}>
          {PRESET_REASONS.map((r) => (
            <Tag
              key={r}
              color={form.getFieldValue('presetReason') === r ? 'gold' : 'default'}
              onClick={() => form.setFieldsValue({ presetReason: r })}
              style={{ cursor: 'pointer', borderRadius: '12px', padding: '2px 10px', fontSize: '12px' }}
            >
              {r}
            </Tag>
          ))}
        </div>

        {presetReasonVal === 'CUSTOM' && (
          <Form.Item
            name="customReason"
            label={<Text strong>Lý do cụ thể</Text>}
            rules={[{ required: true, message: 'Vui lòng nhập lý do cụ thể!' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Nhập lý do chi tiết..."
              maxLength={200}
              showCount
              style={{ borderRadius: '6px' }}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};
