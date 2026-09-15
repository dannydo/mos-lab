'use client';

import React from 'react';
import { Modal, Form, Input, InputNumber, Select, Row, Col, FormInstance } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { SafeAny } from '@mos-lab/shared';

interface EditItemModalProps {
  open: boolean;
  editingItem: SafeAny | null;
  activeTemplate: SafeAny | null;
  form: FormInstance;
  onCancel: () => void;
  onOk: () => void;
}

export const EditItemModal: React.FC<EditItemModalProps> = ({
  open,
  editingItem,
  activeTemplate,
  form,
  onCancel,
  onOk,
}) => {
  return (
    <Modal
      title={
        <span className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-200">
          {editingItem ? <EditOutlined className="text-blue-500" /> : <PlusOutlined className="text-emerald-500" />}
          {editingItem ? 'Chỉnh Sửa Tiêu Chí Kiểm Tra' : 'Thêm Tiêu Chí Kiểm Tra Mới'}
        </span>
      }
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText={editingItem ? 'Cập Nhật' : 'Thêm Mới'}
      cancelText="Hủy"
      width={580}
      destroyOnHidden
      getContainer={() => document.body}
    >
      <Form form={form} layout="vertical" className="mt-3 space-y-2">
        <Form.Item
          name="sectionId"
          label="Thuộc Nhóm / Khu Vực Tiêu Chí:"
          rules={[{ required: true, message: 'Vui lòng chọn nhóm tiêu chí' }]}
        >
          <Select
            placeholder="Chọn nhóm tiêu chí..."
            getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
            options={
              activeTemplate?.sections?.map((s: SafeAny) => ({
                value: s.id,
                label: s.title,
              })) || []
            }
          />
        </Form.Item>

        <Row gutter={12}>
          <Col span={16}>
            <Form.Item
              name="title"
              label="Tên Tiêu Chí (Tên ngắn):"
              rules={[{ required: true, message: 'Vui lòng nhập tên tiêu chí' }]}
            >
              <Input placeholder="Ví dụ: Cửa kính, Sàn nhà, Máy hút bụi..." />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="area" label="Khu Vực Tag (Không bắt buộc):">
              <Input placeholder="Ví dụ: LOBBY, TOILET..." />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="standardRequirement" label="Mô Tả Yêu Cầu Chuẩn Quy Định:">
          <Input.TextArea
            rows={3}
            placeholder="Nhập yêu cầu tiêu chuẩn chi tiết (ví dụ: Sạch bóng không có vệt vân tay, lau chùi 2 tiếng/lần)..."
          />
        </Form.Item>

        <Row gutter={12}>
          <Col span={14}>
            <Form.Item name="severity" label="Mức Độ Nghiêm Trọng (Severity):">
              <Select
                getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
                options={[
                  { value: 'CRITICAL', label: '🔴 CRITICAL (Nghiêm Trọng)' },
                  { value: 'HIGH', label: '🟠 HIGH (Mức Độ Cao)' },
                  { value: 'MID', label: '🟡 MID (Trung Bình)' },
                  { value: 'LOW', label: '🔵 LOW (Mức Thấp)' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item name="unitQty" label="Số Lượng Quy Định (SL):">
              <InputNumber min={1} max={99} className="w-full" placeholder="SL: 1" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};
