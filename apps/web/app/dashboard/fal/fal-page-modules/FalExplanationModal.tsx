'use client';

import React from 'react';
import { Button, Form, Input, Select, type FormInstance } from 'antd';
import { ShieldCheck } from 'lucide-react';
import { AdaptiveModal, AppIcon } from '~/components/ui';
import { FAL_EXPLANATION_CHANNELS, type FalCase, type FalLogExplanationFormValues } from './falPageTypes';

interface FalExplanationModalProps {
  open: boolean;
  selected: FalCase | null;
  form: FormInstance<FalLogExplanationFormValues>;
  onClose: () => void;
  onSubmit: (values: FalLogExplanationFormValues) => void | Promise<void>;
}

export function FalExplanationModal({ open, selected, form, onClose, onSubmit }: FalExplanationModalProps) {
  return (
    <AdaptiveModal
      intent="form"
      width={520}
      open={open}
      title={`Giải trình Log #${selected?.orderServiceId || ''}`}
      onCancel={onClose}
      footer={null}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit} initialValues={{ explanationChannel: 'manual' }}>
        <Form.Item name="explanationChannel" label="Kênh giải trình" rules={[{ required: true }]}>
          <Select options={FAL_EXPLANATION_CHANNELS.map((value) => ({ value }))} />
        </Form.Item>
        <Form.Item
          name="explanation"
          label="Nội dung giải trình"
          rules={[{ required: true, message: 'CC cần giải trình trước khi nhận điểm.' }]}
        >
          <Input.TextArea rows={5} placeholder="Khách đổi ý thế nào? CC đã xử lý ra sao?" />
        </Form.Item>
        <Button type="primary" htmlType="submit" icon={<AppIcon icon={ShieldCheck} size="action" />}>
          Gửi giải trình
        </Button>
      </Form>
    </AdaptiveModal>
  );
}
