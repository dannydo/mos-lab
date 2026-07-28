'use client';

import React, { useState } from 'react';
import { Modal, Form, Select, Input, Alert, Tag, message } from 'antd';
import { WarningOutlined, CloseCircleOutlined, UserOutlined } from '@ant-design/icons';
import { useTheme } from '../../context/ThemeContext';
import { apiClient } from '../../lib/api-client';

export interface CancelBookingModalProps {
  open: boolean;
  booking: {
    id: number;
    orderKey?: string;
    dateCreated?: string;
    bookingDate?: string;
    createdStaffId?: number | null;
    createdStaffName?: string | null;
    customerName?: string;
  } | null;
  currentStaffId?: number | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const CANCEL_REASON_OPTIONS = [
  { value: 'KH_DOI_HUY', label: 'Khách báo bận / Đổi kế hoạch' },
  { value: 'KH_KHONG_NGHE', label: 'Khách không nghe máy / Không thể liên lạc' },
  { value: 'TRUNG_LICH', label: 'Trùng lịch hẹn khác của khách' },
  { value: 'SAI_CHI_NHANH_DICH_VU', label: 'Khách đổi ý / Chọn nhầm chi nhánh hoặc dịch vụ' },
  { value: 'BOOKER_TAO_NHAM', label: 'Booker tạo nhầm đơn / Đơn trùng lặp' },
  { value: 'HUY_GIUM_DONG_NGHIEP', label: 'Booker khác nhờ hủy giúp' },
  { value: 'LY_DO_KHAC', label: 'Lý do khác...' },
];

export const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  open,
  booking,
  currentStaffId,
  onCancel,
  onSuccess,
}) => {
  const { themeMode } = useTheme();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const originalStaffId = booking?.createdStaffId ? Number(booking.createdStaffId) : null;
  const isCrossAction = Boolean(
    originalStaffId && currentStaffId && Number(originalStaffId) !== Number(currentStaffId)
  );

  const handleFinish = async (values: { reasonCategory: string; reasonNote?: string }) => {
    if (!booking) return;
    setLoading(true);
    try {
      await apiClient.bookingAudit.cancelBooking(booking.id, {
        reasonCategory: values.reasonCategory,
        reasonNote: values.reasonNote,
      });

      if (isCrossAction) {
        message.warning(
          `Đã hủy lịch hẹn và lưu nhận diện Hủy chéo đơn do ${booking.createdStaffName || 'đồng nghiệp'} tạo.`
        );
      } else {
        message.success('Đã hủy lịch hẹn thành công.');
      }

      form.resetFields();
      onSuccess();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể hủy lịch hẹn. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const isDark = themeMode === 'dark';

  return (
    <Modal
      open={open}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isDark ? '#f87171' : '#dc2626' }}>
          <CloseCircleOutlined style={{ fontSize: '20px' }} />
          <span>Xác nhận Hủy Lịch Hẹn {booking?.orderKey ? `(${booking.orderKey})` : ''}</span>
        </div>
      }
      okText="Xác nhận Hủy Lịch"
      cancelText="Hủy bỏ"
      okButtonProps={{ danger: true, loading }}
      onOk={() => form.submit()}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      destroyOnClose
      width={540}
    >
      <div style={{ marginTop: '12px', marginBottom: '16px' }}>
        {booking?.customerName && (
          <div style={{ marginBottom: '8px', fontSize: '14px', color: isDark ? '#cbd5e1' : '#475569' }}>
            Khách hàng: <strong style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>{booking.customerName}</strong>
          </div>
        )}

        {/* Original Creator Info Tag */}
        {booking?.createdStaffName && (
          <div style={{ marginBottom: '12px' }}>
            <Tag icon={<UserOutlined />} color="blue">
              Booker tạo đơn ban đầu: <strong>{booking.createdStaffName}</strong>
            </Tag>
          </div>
        )}

        {/* Cross Action Warning Banner */}
        {isCrossAction && (
          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined style={{ fontSize: '18px' }} />}
            message="Cảnh báo Can Thiệp Chéo Đơn Đồng Nghiệp"
            description={
              <div>
                Lịch hẹn này do Booker <strong>{booking?.createdStaffName || `ID #${originalStaffId}`}</strong> tạo ban
                đầu.
                <br />
                Hành động hủy đơn này sẽ được <strong>lưu vết Qui trách nhiệm (Cross Action Log)</strong> để Quản lý
                truy xuất. Vui lòng chọn và nhập lý do rõ ràng.
              </div>
            }
            style={{
              marginBottom: '16px',
              borderRadius: '8px',
              border: '1px solid #f59e0b',
              background: isDark ? '#2d1f05' : '#fffbeb',
            }}
          />
        )}

        <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ reasonCategory: 'KH_DOI_HUY' }}>
          <Form.Item
            name="reasonCategory"
            label={<span style={{ fontWeight: '600' }}>Vui lòng chọn Lý do Hủy Lịch *</span>}
            rules={[{ required: true, message: 'Vui lòng chọn lý do hủy' }]}
          >
            <Select options={CANCEL_REASON_OPTIONS} placeholder="Chọn lý do hủy..." size="large" />
          </Form.Item>

          <Form.Item
            name="reasonNote"
            label={<span style={{ fontWeight: '600' }}>Ghi chú / Lý do chi tiết bổ sung</span>}
          >
            <Input.TextArea
              rows={3}
              placeholder="Nhập thêm lý do cụ thể (vd: Khách báo đi công tác, nhờ Booker A gọi lại tuần sau...)"
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};
