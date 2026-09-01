'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, Input, Button, Tag, Space, Typography, Avatar, Divider, DatePicker, message } from 'antd';
import {
  PhoneOutlined,
  UserOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  Appointment,
  MissedReasonCategory,
  MissedResponsibility,
  MissedFollowUpStatus,
  SaveMissedLogInput,
} from '@mos-lab/shared';
import dayjs from 'dayjs';
import { apiClient } from '../../../../lib/api-client';
import { useTheme } from '../../../../context/ThemeContext';

const { Text, Title } = Typography;
const { TextArea } = Input;

export const REASON_OPTIONS: Array<{ value: MissedReasonCategory; label: string; desc: string }> = [
  { value: 'KH_DOI_HUY_LICH', label: 'Khách đổi/hủy lịch', desc: 'Khách chủ động báo bận, đổi lịch hoặc hủy ca' },
  {
    value: 'GOI_KHONG_NGHE',
    label: 'Gọi không nghe máy / Thuê bao',
    desc: 'CRM/Booker gọi xác nhận nhưng không liên lạc được',
  },
  { value: 'TIEM_QUATAI', label: 'Tiệm quá tải / Hết ghế', desc: 'Khách đến đúng hẹn nhưng cửa hàng không còn CV/ghế' },
  {
    value: 'BOOKER_LATHUONG',
    label: 'Booker tư vấn sai / Đặt nhầm',
    desc: 'Booker xếp sai giờ, nhầm dịch vụ hoặc tư vấn chưa chuẩn',
  },
  { value: 'KTV_BAN_LOI', label: 'CV bận / Phục vụ chậm', desc: 'CV làm trễ ca trước dẫn đến khách sau bị lỡ' },
  { value: 'KH_QUEN_LICH', label: 'Khách quên lịch', desc: 'Khách quên giờ hẹn và không đến' },
  { value: 'LY_DO_KHAC', label: 'Lý do khác', desc: 'Các lý do đặc thù khác' },
];

export const RESP_OPTIONS: Array<{ value: MissedResponsibility; label: string }> = [
  { value: 'CUSTOMER', label: 'Khách hàng' },
  { value: 'BOOKER', label: 'Booker (Telesales)' },
  { value: 'CC', label: 'Tư vấn viên (CC)' },
  { value: 'TECHNICIAN', label: 'Chuyên viên (CV)' },
  { value: 'STORE_SYSTEM', label: 'Hệ thống / Cửa hàng' },
];

export const FOLLOWUP_OPTIONS: Array<{ value: MissedFollowUpStatus; label: string; color: string }> = [
  { value: 'PENDING', label: 'Chưa xử lý', color: 'red' },
  { value: 'CONTACTED', label: 'Đã gọi chăm sóc (Hẹn gọi lại)', color: 'blue' },
  { value: 'RESCHEDULED', label: 'Đã hẹn lại lịch thành công', color: 'green' },
  { value: 'UNREACHABLE', label: 'Không thể liên hệ', color: 'orange' },
  { value: 'CANCELLED', label: 'Khách hủy hẳn', color: 'default' },
];

export interface MissedReasonModalProps {
  visible: boolean;
  appointment: Appointment | null;
  onCancel: () => void;
  onSuccess?: (status?: MissedFollowUpStatus) => void;
  makeCall?: (phone: string, name: string, id: number, avatar?: string) => void;
  onOpenReschedule?: (appointment: Appointment) => void;
}

export default function MissedReasonModal({
  visible,
  appointment,
  onCancel,
  onSuccess,
  makeCall,
  onOpenReschedule,
}: MissedReasonModalProps) {
  const { themeMode } = useTheme();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const selectedFollowUpStatus = Form.useWatch('followUpStatus', form);

  const prevVisibleRef = React.useRef(false);

  useEffect(() => {
    if (visible && appointment) {
      const log = appointment.missedLog;
      form.setFieldsValue({
        reasonCategory: log?.reasonCategory || 'KH_DOI_HUY_LICH',
        responsibility: log?.responsibility || 'CUSTOMER',
        note: log?.note || '',
        followUpStatus: log?.followUpStatus || 'PENDING',
        callbackDate: log?.callbackDate ? dayjs(log.callbackDate) : null,
      });
    } else if (!visible && prevVisibleRef.current) {
      form.resetFields();
    }
    prevVisibleRef.current = visible;
  }, [visible, appointment, form]);

  if (!appointment) return null;

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const input: SaveMissedLogInput = {
        orderId: appointment.id,
        reasonCategory: values.reasonCategory,
        responsibility: values.responsibility,
        note: values.note,
        followUpStatus: values.followUpStatus,
        callbackDate: values.callbackDate ? values.callbackDate.format('YYYY-MM-DD') : null,
      };

      await apiClient.customers.saveMissedLog(input);
      message.success('Đã lưu lý do & qui trách nhiệm Missed thành công!');
      window.dispatchEvent(new CustomEvent('mos-booking-updated'));
      window.dispatchEvent(new CustomEvent('mos-customer-updated'));
      window.dispatchEvent(new CustomEvent('mos-data-updated', { detail: { type: 'missed-reason' } }));
      if (onSuccess) {
        onSuccess(values.followUpStatus);
      }
      onCancel();
    } catch (err) {
      message.error('Không thể lưu thông tin lý do missed.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentLog = appointment.missedLog;

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      title={
        <div className="flex items-center gap-2 text-base font-semibold">
          <ExclamationCircleOutlined className="text-red-500" />
          <span>Ghi Lý do Missed & Qui Trách Nhiệm</span>
          <Tag color="red" className="ml-2 font-mono">
            Đơn #{appointment.id}
          </Tag>
        </div>
      }
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Hủy bỏ
        </Button>,
        <Button key="submit" type="primary" loading={submitting} onClick={handleSubmit} danger>
          Lưu Lý Do & Trách Nhiệm
        </Button>,
      ]}
      width={600}
      centered
      destroyOnHidden
    >
      <div className="py-2">
        {/* Customer & Booking Summary Header */}
        <div
          className={`p-3 rounded-lg border mb-4 flex items-center justify-between flex-wrap gap-3 ${
            themeMode === 'dark' ? 'bg-[#1f1f1f] border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <Avatar
              src={appointment.customerAvatar}
              icon={<UserOutlined />}
              size={42}
              className="bg-amber-500 text-white shrink-0"
            />
            <div>
              <div className="font-semibold text-sm">{appointment.customerName}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span>SĐT: {appointment.customerPhone || 'Chưa có'}</span>
                <span>•</span>
                <span>Chi nhánh: {appointment.branchName || 'Chi nhánh 1'}</span>
              </div>
            </div>
          </div>

          <Space size={8}>
            {appointment.customerPhone && makeCall && (
              <Button
                type="primary"
                icon={<PhoneOutlined />}
                size="small"
                className="bg-emerald-600 hover:bg-emerald-500 border-none"
                onClick={() =>
                  makeCall(
                    appointment.customerPhone,
                    appointment.customerName,
                    appointment.customerId,
                    appointment.customerAvatar || undefined
                  )
                }
              >
                Gọi OmiCall
              </Button>
            )}

            {onOpenReschedule && (
              <Button
                icon={<ReloadOutlined />}
                size="small"
                onClick={() => {
                  onCancel();
                  onOpenReschedule(appointment);
                }}
              >
                Hẹn lại lịch
              </Button>
            )}
          </Space>
        </div>

        {/* Appointment Details Row */}
        <div className="text-xs text-slate-500 dark:text-slate-400 grid grid-cols-2 gap-2 mb-4 px-1">
          <div>
            <span className="font-medium text-slate-700 dark:text-slate-300">Giờ hẹn ban đầu: </span>
            <span className="tabular-nums font-semibold">
              {appointment.bookingDateStart ? dayjs(appointment.bookingDateStart).format('HH:mm - DD/MM/YYYY') : '-'}
            </span>
          </div>
          <div>
            <span className="font-medium text-slate-700 dark:text-slate-300">Booker tạo hẹn: </span>
            <span className="font-semibold">{appointment.bookerName || '-'}</span>
          </div>
          <div>
            <span className="font-medium text-slate-700 dark:text-slate-300">Dịch vụ đã đặt: </span>
            <span className="font-semibold">{appointment.serviceName || 'Dịch vụ nối mi'}</span>
          </div>
          <div>
            <span className="font-medium text-slate-700 dark:text-slate-300">Tư vấn viên (CC): </span>
            <span className="font-semibold">{appointment.ccInName || '-'}</span>
          </div>
        </div>

        <Divider className="my-3" />

        {/* Form Inputs */}
        <Form form={form} layout="vertical" initialValues={{ followUpStatus: 'PENDING' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Form.Item
              name="reasonCategory"
              label={<span className="font-medium">1. Danh mục Lý do Missed</span>}
              rules={[{ required: true, message: 'Vui lòng chọn danh mục lý do' }]}
            >
              <Select
                placeholder="Chọn lý do chính..."
                options={REASON_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
              />
            </Form.Item>

            <Form.Item
              name="responsibility"
              label={<span className="font-medium">2. Qui Trách Nhiệm Cho AI/Phòng Ban</span>}
              rules={[{ required: true, message: 'Vui lòng chọn đối tượng chịu trách nhiệm' }]}
            >
              <Select
                placeholder="Chọn phòng ban/đối tượng..."
                options={RESP_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="followUpStatus"
            label={<span className="font-medium">3. Trạng thái Xử lý Follow-up</span>}
            rules={[{ required: true, message: 'Vui lòng chọn trạng thái follow-up' }]}
          >
            <Select
              options={FOLLOWUP_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
            />
          </Form.Item>

          {selectedFollowUpStatus === 'CONTACTED' && (
            <Form.Item
              name="callbackDate"
              label={
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  📅 Ngày hẹn gọi lại chăm sóc (Tự tạo Daily Plan)
                </span>
              }
              rules={[{ required: true, message: 'Vui lòng chọn ngày hẹn gọi lại' }]}
              help="Hệ thống sẽ tự động tạo Lịch nhắc việc trong CRM Daily Plan của Booker/CC vào ngày này."
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày gọi lại..." />
            </Form.Item>
          )}

          <Form.Item name="note" label={<span className="font-medium">4. Ghi chú diễn giải chi tiết</span>}>
            <TextArea
              rows={3}
              placeholder="Ghi rõ tình huống cụ thể (Ví dụ: Khách báo bận đi công tác đột xuất, Booker đã gọi lại hỗ trợ dời lịch sang tuần sau...)"
              maxLength={500}
              showCount
              style={{ paddingBottom: '20px' }}
            />
          </Form.Item>
        </Form>

        {currentLog?.createdBy && (
          <div className="text-xs text-slate-400 text-right mt-1">
            Ghi nhận gần nhất bởi:{' '}
            <span className="font-medium text-slate-600 dark:text-slate-300">{currentLog.createdBy}</span> vào{' '}
            {currentLog.updatedAt ? dayjs(currentLog.updatedAt).format('HH:mm DD/MM/YYYY') : '-'}
          </div>
        )}
      </div>
    </Modal>
  );
}
