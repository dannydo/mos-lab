'use client';

import React from 'react';
import { Button, Form, Input, InputNumber } from 'antd';
import type { FormInstance } from 'antd';
import { AdaptiveModal } from '../../../../../components/ui';
import type { CashAccount } from '@mos-lab/shared';

interface AccountModalProps {
  open: boolean;
  onCancel: () => void;
  account: CashAccount | null;
  form: FormInstance;
  onFinish: (values: any) => Promise<void>;
}

export function AccountModal({ open, onCancel, account, form, onFinish }: AccountModalProps) {
  return (
    <AdaptiveModal
      intent="form"
      title={`Cập Nhật Quỹ: ${account?.name || ''}`}
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="currentBalance"
          label="Số dư tiền thực tế hiện tại"
          rules={[{ required: true, message: 'Vui lòng nhập số dư hiện tại' }]}
        >
          <InputNumber
            className="w-full"
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
            addonAfter="VNĐ"
          />
        </Form.Item>

        <Form.Item
          name="minSafetyThreshold"
          label="Ngưỡng an toàn tối thiểu (Min Safety Threshold)"
          rules={[{ required: true, message: 'Vui lòng nhập ngưỡng an toàn' }]}
          extra="Khi số dư dự báo rơi xuống dưới mức này, hệ thống sẽ kích hoạt cảnh báo nguy cơ thiếu tiền."
        >
          <InputNumber
            className="w-full"
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
            addonAfter="VNĐ"
          />
        </Form.Item>

        <Form.Item name="notes" label="Ghi chú quản lý">
          <Input.TextArea rows={2} />
        </Form.Item>

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onCancel}>Hủy</Button>
          <Button type="primary" htmlType="submit">
            Lưu cập nhật
          </Button>
        </div>
      </Form>
    </AdaptiveModal>
  );
}
