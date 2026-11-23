'use client';

import React from 'react';
import { Form, Input, Select, Typography } from 'antd';
import { AdaptiveModal } from '~/components/ui';
import { SMS_TEMPLATE_CATEGORY_OPTIONS } from './smsModalTypes';

const { Text } = Typography;

export interface SmsSaveTemplateModalProps {
  open: boolean;
  isDark: boolean;
  title: string;
  category: string;
  messageBody: string;
  saving: boolean;
  onChangeTitle: (value: string) => void;
  onChangeCategory: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export const SmsSaveTemplateModal: React.FC<SmsSaveTemplateModalProps> = ({
  open,
  isDark,
  title,
  category,
  messageBody,
  saving,
  onChangeTitle,
  onChangeCategory,
  onSubmit,
  onClose,
}) => (
  <AdaptiveModal
    intent="confirm"
    open={open}
    onCancel={onClose}
    title="Lưu mẫu tin nhắn SMS mới"
    onOk={onSubmit}
    confirmLoading={saving}
    okText="Lưu Mẫu"
    cancelText="Hủy"
    destroyOnHidden
    wrapClassName={isDark ? 'dark-theme' : 'light-theme'}
  >
    <Form layout="vertical" className="pt-2">
      <Form.Item label="Tên Mẫu Template" required>
        <Input
          value={title}
          onChange={(e) => onChangeTitle(e.target.value)}
          placeholder="VD: Reminder 17 - Tri ân khách cũ"
        />
      </Form.Item>

      <Form.Item label="Danh mục (Category)">
        <Select
          value={category}
          onChange={(val) => onChangeCategory(val)}
          options={[...SMS_TEMPLATE_CATEGORY_OPTIONS]}
        />
      </Form.Item>

      <div
        className={`p-3 rounded border text-xs ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
        }`}
      >
        <Text type="secondary">Nội dung template sẽ lưu:</Text>
        <div className="font-mono mt-1 whitespace-pre-wrap">{messageBody}</div>
      </div>
    </Form>
  </AdaptiveModal>
);
