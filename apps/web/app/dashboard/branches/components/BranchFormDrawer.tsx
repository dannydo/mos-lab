'use client';

import React from 'react';
import { Button, Input, Row, Col, Form, Select, Space, InputNumber, Divider } from 'antd';
import type { FormInstance } from 'antd';
import { AdaptiveDrawer } from '../../../../components/ui';
import type { CrmBranch } from '@mos-lab/shared';

const { TextArea } = Input;

interface BranchFormDrawerProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  branch: CrmBranch | null;
  form: FormInstance;
  submitting: boolean;
  onSubmit: () => void;
}

export function BranchFormDrawer({ open, onClose, mode, branch, form, submitting, onSubmit }: BranchFormDrawerProps) {
  return (
    <AdaptiveDrawer
      intent="form"
      title={mode === 'create' ? 'Thêm Chi Nhánh Mới' : `Chỉnh Sửa Chi Nhánh: ${branch?.name}`}
      open={open}
      onClose={onClose}
      width={540}
      extra={
        <Space>
          <Button onClick={onClose}>Hủy</Button>
          <Button
            type="primary"
            loading={submitting}
            onClick={onSubmit}
            className="bg-emerald-600 hover:bg-emerald-500 border-none text-white"
          >
            Lưu Chi Nhánh
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" requiredMark="optional">
        <Row gutter={16}>
          <Col span={10}>
            <Form.Item
              name="code"
              label="Mã Chi Nhánh (Code)"
              rules={[
                { required: true, message: 'Vui lòng nhập mã chi nhánh' },
                { pattern: /^[A-Za-z0-9_-]+$/, message: 'Mã chỉ gồm chữ cái, số, gạch dưới' },
              ]}
            >
              <Input placeholder="VD: Q1, Q3, DT..." className="uppercase" />
            </Form.Item>
          </Col>
          <Col span={14}>
            <Form.Item
              name="storeType"
              label="Loại Hình Chi Nhánh"
              rules={[{ required: true, message: 'Chọn loại chi nhánh' }]}
            >
              <Select
                options={[
                  { value: 'SALON', label: 'Salon Làm Đẹp' },
                  { value: 'ACADEMY', label: 'Học Viện Đào Tạo' },
                  { value: 'OFFICE', label: 'Văn Phòng Vận Hành' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="name"
          label="Tên Chi Nhánh (Tiếng Việt)"
          rules={[{ required: true, message: 'Vui lòng nhập tên chi nhánh' }]}
        >
          <Input placeholder="VD: Wingslashes Quận 1 - Đề Thám" />
        </Form.Item>

        <Form.Item name="nameEn" label="Tên Chi Nhánh (Tiếng Anh)">
          <Input placeholder="VD: Wingslashes District 1 - De Tham" />
        </Form.Item>

        <Divider className="my-3" />

        <Form.Item
          name="addressWeb"
          label="Địa Chỉ Chi Nhánh (Website)"
          help="Địa chỉ hiển thị trên Website cho khách hàng tra cứu"
        >
          <Input placeholder="VD: 159 - 159A Đề Thám, P. Cô Giang, Quận 1, TP. HCM" />
        </Form.Item>

        <Form.Item
          name="addressSms"
          label="Địa Chỉ Rút Gọn (Gửi Tin Nhắn SMS)"
          help="Định dạng địa chỉ ngắn gọn đính kèm trong tin nhắn SMS hẹn lịch"
        >
          <Input placeholder="VD: 159 Đề Thám, Q.1, HCM" />
        </Form.Item>

        <Form.Item
          name="addressMap"
          label="Đường Dẫn Bản Đồ (Google Maps URL)"
          help="Link Google Maps điều hướng cho khách"
        >
          <Input placeholder="https://maps.google.com/..." />
        </Form.Item>

        <Row gutter={16}>
          <Col span={16}>
            <Form.Item name="addressCity" label="Thành Phố / Tỉnh">
              <Input placeholder="VD: TP. Hồ Chí Minh" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="sortOrder" label="Thứ Tự Sắp Xếp">
              <InputNumber min={0} max={9999} className="w-full" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="notes" label="Ghi Chú Vận Hành">
          <TextArea rows={3} placeholder="Ghi chú nội bộ về chi nhánh..." />
        </Form.Item>
      </Form>
    </AdaptiveDrawer>
  );
}
