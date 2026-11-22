'use client';

import React from 'react';
import { Button, Checkbox, Form, Input, Space } from 'antd';
import type { FormInstance } from 'antd';
import type { CommentFormValues, ResolveTicketFormValues } from './types';

const { TextArea } = Input;

export interface TicketActionSectionProps {
  status?: string;
  isResolving: boolean;
  submitting: boolean;
  commentForm: FormInstance<CommentFormValues>;
  resolveForm: FormInstance<ResolveTicketFormValues>;
  onStartResolve: () => void;
  onCancelResolve: () => void;
  onAddComment: (values: CommentFormValues) => void;
  onResolve: (values: ResolveTicketFormValues) => void;
}

export function TicketActionSection({
  status,
  isResolving,
  submitting,
  commentForm,
  resolveForm,
  onStartResolve,
  onCancelResolve,
  onAddComment,
  onResolve,
}: TicketActionSectionProps) {
  if (status === 'CLOSED' || status === 'RESOLVED') {
    return null;
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
      {!isResolving ? (
        <Form form={commentForm} onFinish={onAddComment} layout="vertical">
          <Form.Item name="content" rules={[{ required: true, message: 'Nhập nội dung trao đổi' }]}>
            <TextArea rows={3} placeholder="Nhập trao đổi mới..." />
          </Form.Item>
          <div className="flex justify-between items-center">
            <Form.Item name="isInternal" valuePropName="checked" noStyle>
              <Checkbox>Ghi chú nội bộ</Checkbox>
            </Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Gửi
              </Button>
              <Button danger onClick={onStartResolve}>
                Đóng Ticket
              </Button>
            </Space>
          </div>
        </Form>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
          <h5 className="text-base font-semibold text-amber-700 dark:text-amber-400 mb-4 m-0">Hoàn tất xử lý Ticket</h5>
          <Form form={resolveForm} onFinish={onResolve} layout="vertical">
            <Form.Item
              name="actionPlan"
              label="Hướng giải quyết"
              rules={[{ required: true, message: 'Vui lòng nhập hướng giải quyết' }]}
            >
              <TextArea rows={2} placeholder="Mô tả hướng xử lý..." />
            </Form.Item>
            <Form.Item
              name="resolutionNote"
              label="Ghi chú kết quả"
              rules={[{ required: true, message: 'Vui lòng nhập ghi chú kết quả' }]}
            >
              <TextArea rows={2} placeholder="Ghi chú kết quả sau khi xử lý..." />
            </Form.Item>
            <div className="flex justify-end gap-2">
              <Button onClick={onCancelResolve}>Hủy</Button>
              <Button type="primary" danger htmlType="submit" loading={submitting}>
                Xác nhận Đóng
              </Button>
            </div>
          </Form>
        </div>
      )}
    </div>
  );
}
