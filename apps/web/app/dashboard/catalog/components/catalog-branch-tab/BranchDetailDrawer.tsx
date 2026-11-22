'use client';

import React from 'react';
import { Button, Col, Form, Input, Row, Select, Space, Switch, Tabs } from 'antd';
import type { FormInstance } from 'antd';
import { Store, Users } from 'lucide-react';
import type { BranchStaffInfo, CrmBranch } from '@mos-lab/shared';
import { AdaptiveDrawer, AppIcon, DataTable } from '~/components/ui';
import { BRANCH_STAFF_COLUMNS } from './branchColumns';
import {
  BRANCH_TYPE_SELECT_OPTIONS,
  type BranchDrawerMode,
  type BranchDrawerTabKey,
  type BranchFormValues,
} from './branchHelpers';

const { TextArea } = Input;

interface BranchDetailDrawerProps {
  open: boolean;
  mode: BranchDrawerMode;
  selectedBranch: CrmBranch | null;
  detailLoading: boolean;
  submitting: boolean;
  activeTab: BranchDrawerTabKey;
  form: FormInstance<BranchFormValues>;
  onTabChange: (tab: BranchDrawerTabKey) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function BranchDetailDrawer({
  open,
  mode,
  selectedBranch,
  detailLoading,
  submitting,
  activeTab,
  form,
  onTabChange,
  onClose,
  onSubmit,
}: BranchDetailDrawerProps) {
  const drawerTitle =
    mode === 'create'
      ? 'Thêm Chi Nhánh Mới'
      : mode === 'edit'
        ? `Chỉnh Sửa Chi Nhánh: ${selectedBranch?.name ?? ''}`
        : `Chi Tiết Chi Nhánh: ${selectedBranch?.name ?? ''}`;

  const staffCount = selectedBranch?.staffList?.length || selectedBranch?.staffCount || 0;

  return (
    <AdaptiveDrawer
      intent="form"
      title={
        <Space>
          <AppIcon icon={Store} size="sm" className="text-blue-500" />
          <span>{drawerTitle}</span>
        </Space>
      }
      width={720}
      onClose={onClose}
      open={open}
      destroyOnHidden
      extra={
        mode !== 'view' && (
          <Space>
            <Button onClick={onClose}>Hủy</Button>
            <Button type="primary" loading={submitting} onClick={onSubmit} className="bg-blue-600">
              Lưu Chi Nhánh
            </Button>
          </Space>
        )
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={(key) => onTabChange(key as BranchDrawerTabKey)}
        items={[
          {
            key: 'info',
            label: (
              <Space>
                <AppIcon icon={Store} size="sm" />
                <span>Thông tin Master</span>
              </Space>
            ),
            children: (
              <Form form={form} layout="vertical" disabled={mode === 'view'} className="py-2">
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="code"
                      label="Mã Chi Nhánh (Code)"
                      rules={[
                        { required: true, message: 'Vui lòng nhập mã chi nhánh' },
                        { pattern: /^[a-zA-Z0-9_-]+$/, message: 'Mã không chứa khoảng trắng hoặc ký tự đặc biệt' },
                      ]}
                    >
                      <Input placeholder="Ví dụ: DETHAM, PXL, ESTELLA" className="uppercase" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="name"
                      label="Tên Chi Nhánh (Tiếng Việt)"
                      rules={[{ required: true, message: 'Vui lòng nhập tên chi nhánh' }]}
                    >
                      <Input placeholder="Ví dụ: Đề Thám, Estella Place" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item name="nameEn" label="Tên Chi Nhánh (Tiếng Anh)">
                      <Input placeholder="Ví dụ: De Tham Branch, Estella Place" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="storeType"
                      label="Loại Hình Chi Nhánh"
                      rules={[{ required: true, message: 'Chọn loại chi nhánh' }]}
                    >
                      <Select
                        options={BRANCH_TYPE_SELECT_OPTIONS}
                        getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="addressCity"
                  label="Tỉnh / Thành Phố / Quận / Phường (Địa chỉ đầy đủ)"
                  help="Địa chỉ hành chính chính thức của chi nhánh"
                >
                  <Input placeholder="Ví dụ: 159 - 159A Đề Thám, P. Cô Giang, Quận 1, TP. Hồ Chí Minh" />
                </Form.Item>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="addressSms"
                      label="Địa Chỉ Ngắn Gửi SMS"
                      help="Text ngắn gọn đính kèm tin nhắn SMS hẹn khách"
                    >
                      <Input placeholder="Ví dụ: 159A De Tham" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="addressWeb" label="Địa Chỉ Hiển Thị Trên Website / App">
                      <Input placeholder="Ví dụ: 159 - 159A Đề Thám, Quận 1" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="addressMap" label="Liên Kết Google Maps / Địa Chỉ Bản Đồ">
                  <Input placeholder="Ví dụ: Chi nhanh 3: De Tham, Quận 1 hoặc URL Google Maps" />
                </Form.Item>

                <Form.Item name="notes" label="Ghi Chú Vận Hành">
                  <TextArea rows={3} placeholder="Ghi chú nội bộ về diện tích, số ghế mi, bãi xe..." />
                </Form.Item>

                <Form.Item name="isActive" valuePropName="checked" label="Trạng Thái Hoạt Động">
                  <Switch checkedChildren="Đang hoạt động" unCheckedChildren="Đã vô hiệu hóa" />
                </Form.Item>
              </Form>
            ),
          },
          {
            key: 'staff',
            label: (
              <Space>
                <AppIcon icon={Users} size="sm" />
                <span>Nhân Sự Sở Tại ({staffCount})</span>
              </Space>
            ),
            children: (
              <div className="py-2">
                <DataTable<BranchStaffInfo>
                  rowKey="id"
                  loading={detailLoading}
                  dataSource={selectedBranch?.staffList || []}
                  pagination={false}
                  size="small"
                  columns={BRANCH_STAFF_COLUMNS}
                  scroll={{ x: 'max-content' }}
                  locale={{ emptyText: 'Chưa có nhân sự gắn liền với chi nhánh này' }}
                />
              </div>
            ),
          },
        ]}
      />
    </AdaptiveDrawer>
  );
}
