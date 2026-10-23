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
  defaultCategory?: string;
}

export function IncomeModal({ open, onCancel, form, onFinish, defaultCategory }: IncomeModalProps) {
  const selectedCategory = Form.useWatch('category', form);

  return (
    <AdaptiveModal
      intent="form"
      title="Thêm Khoản Thu Dự Kiến"
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
          category: defaultCategory || 'REVENUE_ACADEMY',
        }}
      >
        <Form.Item
          name="category"
          label="Nguồn thu dự kiến"
          rules={[{ required: true, message: 'Chọn nguồn thu dự kiến' }]}
        >
          <Select
            options={[
              { value: 'REVENUE_ACADEMY', label: 'Wings Academy (Học phí / Đào tạo)' },
              { value: 'REVENUE_OTHER', label: 'Dự án khác (Đầu tư / Kinh doanh ngoài)' },
              { value: 'REVENUE_SERVICE', label: 'Wings Lashes - Dịch vụ (Bổ sung thủ công)' },
              { value: 'REVENUE_PRODUCT', label: 'Wings Lashes - Bán lẻ sản phẩm' },
            ]}
          />
        </Form.Item>

        {selectedCategory === 'REVENUE_OTHER' && (
          <Form.Item
            name="projectName"
            label="Tên dự án khác"
            rules={[{ required: true, message: 'Vui lòng nhập tên dự án' }]}
          >
            <Input placeholder="Ví dụ: Dự án Chuỗi Cà phê, Đầu tư mặt bằng mới, Kinh doanh đối tác..." />
          </Form.Item>
        )}

        <Form.Item
          name="title"
          label="Tên khoản thu"
          rules={[{ required: true, message: 'Nhập tên hoặc nội dung khoản thu' }]}
        >
          <Input
            placeholder={
              selectedCategory === 'REVENUE_ACADEMY'
                ? 'Ví dụ: Học phí khoá Master Mi K15, Workshop Chuyên sâu...'
                : selectedCategory === 'REVENUE_OTHER'
                  ? 'Ví dụ: Đợt thanh toán 1, Thu hoàn vốn, Doanh thu phân phối...'
                  : 'Ví dụ: Thu tiền hợp đồng, Đặt cọc gói dịch vụ...'
            }
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="amount"
              label="Số tiền thu dự kiến"
              rules={[{ required: true, message: 'Nhập số tiền thu' }]}
            >
              <InputNumber
                className="w-full"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                addonAfter="VNĐ"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="expectedDate" label="Ngày dự kiến thu" rules={[{ required: true, message: 'Chọn ngày dự kiến' }]}>
              <DatePicker className="w-full" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item name="storeId" label="Chi nhánh liên quan">
              <Select
                allowClear
                placeholder="Toàn hệ thống (Không phân bổ riêng chi nhánh)"
                options={[
                  { value: 6, label: 'Chi nhánh Đề Thám' },
                  { value: 16, label: 'Chi nhánh Estella Place' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="Ghi chú thêm">
          <Input.TextArea rows={2} placeholder="Nhập thêm chi tiết người đóng, lộ trình thanh toán (nếu có)..." />
        </Form.Item>

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onCancel}>Đóng</Button>
          <Button type="primary" className="bg-emerald-600 hover:bg-emerald-500 border-none" htmlType="submit">
            Lưu khoản thu dự kiến
          </Button>
        </div>
      </Form>
    </AdaptiveModal>
  );
}
