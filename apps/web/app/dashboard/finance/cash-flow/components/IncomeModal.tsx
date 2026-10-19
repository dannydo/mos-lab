'use client';

import React from 'react';
import { Button, Col, DatePicker, Form, Input, InputNumber, Row, Select } from 'antd';
import type { FormInstance } from 'antd';
import { AdaptiveModal } from '../../../../../components/ui';

interface IncomeModalProps {
  open: boolean;
  onCancel: () => void;
  form: FormInstance;
  onFinish: (values: any) => Promise<void>;
}

export function IncomeModal({ open, onCancel, form, onFinish }: IncomeModalProps) {
  return (
    <AdaptiveModal
      intent="form"
      title="Thêm Kế Hoạch Thu Tiền Mới"
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          status: 'PENDING',
        }}
      >
        <Form.Item name="title" label="Tên khoản thu" rules={[{ required: true, message: 'Nhập tên khoản thu' }]}>
          <Input placeholder="Ví dụ: Thu học phí Workshop K12, Doanh thu dự kiến salon..." />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="category" label="Danh mục thu" rules={[{ required: true, message: 'Chọn danh mục thu' }]}>
              <Select
                options={[
                  { value: 'REVENUE_SERVICE', label: 'Doanh thu Dịch vụ' },
                  { value: 'REVENUE_PRODUCT', label: 'Bán lẻ Sản phẩm' },
                  { value: 'REVENUE_ACADEMY', label: 'Học phí Academy' },
                  { value: 'REVENUE_OTHER', label: 'Thu nhập khác' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="amount" label="Số tiền thu" rules={[{ required: true, message: 'Nhập số tiền thu' }]}>
              <InputNumber
                className="w-full"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                addonAfter="VNĐ"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="expectedDate" label="Ngày dự kiến thu" rules={[{ required: true }]}>
              <DatePicker className="w-full" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="storeId" label="Chi nhánh thu">
              <Select
                allowClear
                placeholder="Toàn hệ thống"
                options={[
                  { value: 1, label: 'Chi nhánh Đề Thám' },
                  { value: 2, label: 'Chi nhánh Phan Xích Long' },
                  { value: 3, label: 'Chi nhánh Lê Văn Sỹ' },
                  { value: 4, label: 'Chi nhánh Huỳnh Thúc Kháng' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="Ghi chú">
          <Input.TextArea rows={2} placeholder="Nhập thêm ghi chú thu tiền..." />
        </Form.Item>

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onCancel}>Đóng</Button>
          <Button type="primary" className="bg-emerald-600 hover:bg-emerald-500 border-none" htmlType="submit">
            Lưu kế hoạch thu
          </Button>
        </div>
      </Form>
    </AdaptiveModal>
  );
}
