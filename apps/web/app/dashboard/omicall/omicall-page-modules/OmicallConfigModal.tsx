'use client';

import React from 'react';
import { Form, Input, type FormInstance } from 'antd';
import { AdaptiveModal } from '~/components/ui';
import type { OmicallConfigRow, OmicallExtensionFormValues } from './omicallPageTypes';

export interface OmicallConfigModalProps {
  open: boolean;
  selectedStaff: OmicallConfigRow | null;
  form: FormInstance<OmicallExtensionFormValues>;
  submitting: boolean;
  onCancel: () => void;
  onOk: () => void | Promise<void>;
}

export function OmicallConfigModal({ open, selectedStaff, form, submitting, onCancel, onOk }: OmicallConfigModalProps) {
  return (
    <AdaptiveModal
      intent="form"
      width={520}
      title={selectedStaff ? `Gán máy lẻ OmiCall cho: ${selectedStaff.displayName}` : ''}
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={submitting}
      okText="Ghi nhận"
      cancelText="Hủy"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" className="mt-5">
        <Form.Item
          name="extension"
          label="Mã máy lẻ (OmiCall Extension ID):"
          rules={[
            { required: true, message: 'Vui lòng nhập mã máy lẻ extension' },
            { pattern: /^[0-9]+$/, message: 'Mã máy lẻ phải là các chữ số' },
          ]}
        >
          <Input placeholder="Ví dụ: 101, 102, 103..." maxLength={10} />
        </Form.Item>

        <Form.Item
          name="sipPassword"
          label="Mật khẩu SIP WebRTC (SIP Password):"
          help="Chỉ điền khi muốn tạo mới hoặc cập nhật mật khẩu SIP thiết bị"
        >
          <Input.Password placeholder="Nhập mật khẩu máy nhánh WebRTC" />
        </Form.Item>

        <Form.Item
          name="phoneNumber"
          label="Số Hotline hiển thị (Outbound Caller ID):"
          rules={[{ pattern: /^[0-9]+$/, message: 'Số điện thoại không hợp lệ' }]}
        >
          <Input placeholder="Ví dụ: 02871012345" maxLength={20} />
        </Form.Item>
      </Form>
    </AdaptiveModal>
  );
}
