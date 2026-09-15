'use client';

import React from 'react';
import { Modal, Form, Select, Input, FormInstance } from 'antd';

interface ActionTicketModalProps {
  open: boolean;
  form: FormInstance;
  onCancel: () => void;
  onOk: () => void;
}

export const ActionTicketModal: React.FC<ActionTicketModalProps> = ({ open, form, onCancel, onOk }) => {
  return (
    <Modal
      title="Cập Nhật Tiến Độ Khắc Phục Lỗi Vi Phạm"
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText="Cập Nhật"
      destroyOnHidden
      getContainer={() => document.body}
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item name="status" label="Trạng Thái Xử Lý:">
          <Select
            getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
            options={[
              { value: 'OPEN', label: 'MỚI PHÁT HIỆN' },
              { value: 'IN_PROGRESS', label: 'ĐANG XỬ LÝ' },
              { value: 'RESOLVED', label: 'ĐÃ KHẮC PHỤC' },
              { value: 'VERIFIED', label: 'ĐÃ XÁC NHẬN QA' },
            ]}
          />
        </Form.Item>
        <Form.Item name="resolutionNotes" label="Ghi Chú Tiến Độ Khắc Phục:">
          <Input.TextArea rows={3} placeholder="Nhập ghi chú chi tiết biện pháp đã khắc phục..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};
