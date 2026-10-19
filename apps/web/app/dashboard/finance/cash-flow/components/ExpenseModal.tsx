'use client';

import React from 'react';
import { Button, Col, DatePicker, Form, Input, InputNumber, Row, Select, Switch } from 'antd';
import type { FormInstance } from 'antd';
import { AdaptiveModal } from '../../../../../components/ui';
import type { CashFlowEntry } from '@mos-lab/shared';

interface ExpenseModalProps {
  open: boolean;
  onCancel: () => void;
  form: FormInstance;
  onFinish: (values: any) => Promise<void>;
}

export function ExpenseModal({ open, onCancel, form, onFinish }: ExpenseModalProps) {
  const expenseAmount = Form.useWatch('amount', form) || 0;
  const expenseHasVat = Form.useWatch('hasVat', form) || false;
  const expenseVatRate = Form.useWatch('vatRate', form) || 0;
  const computedVatAmount =
    expenseHasVat && expenseVatRate > 0 ? Math.round(expenseAmount * (expenseVatRate / 100)) : 0;
  const computedTotalAmount = expenseAmount + computedVatAmount;

  return (
    <AdaptiveModal
      intent="form"
      title="Thêm Kế Hoạch Chi Tiêu Mới"
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
          priority: 'MEDIUM',
          status: 'PENDING',
          hasVat: false,
          vatRate: 10,
        }}
      >
        <Form.Item
          name="title"
          label="Tên khoản chi"
          rules={[{ required: true, message: 'Vui lòng nhập tên khoản chi' }]}
        >
          <Input placeholder="Ví dụ: Tiền thuê mặt bằng Đề Thám, Lương nhân sự đợt 1..." />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="category"
              label="Danh mục chi"
              rules={[{ required: true, message: 'Vui lòng chọn danh mục' }]}
            >
              <Select
                options={[
                  { value: 'SALARY', label: 'Lương & Thù lao' },
                  { value: 'RENT', label: 'Thuê mặt bằng' },
                  { value: 'SUPPLIER_MATERIAL', label: 'Vật tư & Nhà cung cấp' },
                  { value: 'TAX', label: 'Thuế (TNDN & GTGT)' },
                  { value: 'TRANSACTION_FEE', label: 'Phí giao dịch / POS' },
                  { value: 'OPEX', label: 'Chi phí vận hành' },
                  { value: 'OTHER', label: 'Khác' },
                ]}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item name="priority" label="Mức độ ưu tiên (Triage Priority)" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'CRITICAL', label: 'Bắt buộc / Khẩn cấp (Lương, mặt bằng)' },
                  { value: 'HIGH', label: 'Thiết yếu / Ưu tiên cao (Vật tư)' },
                  { value: 'MEDIUM', label: 'Bình thường' },
                  { value: 'LOW', label: 'Có thể hoãn (Decor, nâng cấp)' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="amount"
              label="Số tiền (Trước VAT)"
              rules={[{ required: true, message: 'Nhập số tiền trước VAT' }]}
            >
              <InputNumber
                className="w-full"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                addonAfter="VNĐ"
              />
            </Form.Item>
          </Col>

          <Col span={6}>
            <Form.Item name="hasVat" label="Có VAT?" valuePropName="checked">
              <Switch checkedChildren="Có VAT" unCheckedChildren="Ko VAT" />
            </Form.Item>
          </Col>

          <Col span={6}>
            <Form.Item name="vatRate" label="Thuế suất %">
              <Select
                disabled={!expenseHasVat}
                options={[
                  { value: 0, label: '0%' },
                  { value: 5, label: '5%' },
                  { value: 8, label: '8%' },
                  { value: 10, label: '10%' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Realtime Computation Preview */}
        <div className="p-3 mb-4 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs tabular-nums space-y-1">
          <div className="flex justify-between">
            <span className="text-neutral-500">Tiền gốc:</span>
            <span>{Number(expenseAmount || 0).toLocaleString('vi-VN')} VNĐ</span>
          </div>
          {expenseHasVat && (
            <div className="flex justify-between text-blue-500 font-medium">
              <span>Tiền thuế VAT ({expenseVatRate}%):</span>
              <span>+{computedVatAmount.toLocaleString('vi-VN')} VNĐ</span>
            </div>
          )}
          <div className="pt-1 border-t border-neutral-300 dark:border-neutral-700 flex justify-between font-bold text-sm text-rose-500">
            <span>Tổng thanh toán sau thuế:</span>
            <span>{computedTotalAmount.toLocaleString('vi-VN')} VNĐ</span>
          </div>
        </div>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="expectedDate" label="Ngày dự kiến chi" rules={[{ required: true }]}>
              <DatePicker className="w-full" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="dueDate" label="Ngày đến hạn">
              <DatePicker className="w-full" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="storeId" label="Chi nhánh áp dụng">
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
          <Col span={12}>
            <Form.Item name="paymentMethod" label="Phương thức thanh toán">
              <Select
                options={[
                  { value: 'BANK_TRANSFER', label: 'Chuyển khoản ngân hàng' },
                  { value: 'CASH', label: 'Tiền mặt' },
                  { value: 'CARD', label: 'Cà thẻ POS' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="Ghi chú chi tiết">
          <Input.TextArea rows={2} placeholder="Nhập thêm ghi chú, số hóa đơn chứng từ..." />
        </Form.Item>

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onCancel}>Đóng</Button>
          <Button type="primary" danger htmlType="submit">
            Lưu kế hoạch chi
          </Button>
        </div>
      </Form>
    </AdaptiveModal>
  );
}
