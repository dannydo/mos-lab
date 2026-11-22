'use client';

import React from 'react';
import { Button, DatePicker, Form, Input, Select } from 'antd';
import type { FormInstance } from 'antd';
import { AdaptiveModal } from '~/components/ui';
import { INSPECTION_STORE_OPTIONS } from './constants';
import type { ScheduleInspectionFormValues, TicketSubtaskItem } from './types';

const { TextArea } = Input;

export interface ScheduleInspectionModalProps {
  open: boolean;
  onClose: () => void;
  form: FormInstance<ScheduleInspectionFormValues>;
  activeSubtask: TicketSubtaskItem | null;
  scheduling: boolean;
  onSubmit: (values: ScheduleInspectionFormValues) => void;
}

export function ScheduleInspectionModal({
  open,
  onClose,
  form,
  activeSubtask,
  scheduling,
  onSubmit,
}: ScheduleInspectionModalProps) {
  return (
    <AdaptiveModal
      title="📅 Giai Đoạn 1: CSKH Đặt Lịch Hẹn Đón Khách Đến Shop Soi Mi 0đ"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={500}
      intent="form"
    >
      <Form form={form} layout="vertical" onFinish={onSubmit} className="mt-4">
        <div className="text-xs text-slate-600 dark:text-slate-300 mb-3 bg-slate-50 dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800">
          📌 Vấn đề: <strong>{activeSubtask?.issueSummary}</strong>
        </div>

        <Form.Item
          name="inspectionStoreName"
          label="Chi Nhánh Store Hẹn Khách Đến"
          rules={[{ required: true, message: 'Vui lòng chọn chi nhánh store' }]}
        >
          <Select options={INSPECTION_STORE_OPTIONS} />
        </Form.Item>

        <Form.Item
          name="inspectionAppointmentDate"
          label="Thời Gian Hẹn Đón Khách Đến Shop"
          rules={[{ required: true, message: 'Vui lòng chọn ngày giờ hẹn' }]}
        >
          <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" placeholder="Chọn ngày giờ hẹn đón khách" />
        </Form.Item>

        <Form.Item name="note" label="Ghi chú dặn dò tiếp đón (Không bắt buộc)">
          <TextArea rows={2} placeholder="Nhập ghi chú cho Lễ Tân / Trưởng Tiệm tiếp đón..." />
        </Form.Item>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={scheduling}>
            Xác Nhận Đặt Lịch Hẹn Đón Khách
          </Button>
        </div>
      </Form>
    </AdaptiveModal>
  );
}
