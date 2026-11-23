'use client';

import React from 'react';
import { Badge, Button, Card, Checkbox, Col, Form, Input, Row, Select, Space, Tooltip, Typography } from 'antd';
import type { FormInstance } from 'antd';
import { Info, KeyRound, Palette, ShieldCheck } from 'lucide-react';
import type { Role } from '@mos-lab/shared';
import { AdaptiveModal, AppIcon } from '~/components/ui';
import { PRESET_COLORS, ROLE_PERMISSION_FIELDS } from './staffPageConstants';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

export interface RoleFormModalProps {
  open: boolean;
  roleForm: FormInstance;
  editingRole: Role | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: SafeAny) => void | Promise<void>;
}

export function RoleFormModal({ open, roleForm, editingRole, submitting, onCancel, onSubmit }: RoleFormModalProps) {
  return (
    <AdaptiveModal
      intent="form"
      title={
        <Text className="text-lg font-bold text-[var(--color-primary)]">
          {editingRole ? `Cấu hình nhóm quyền: ${editingRole.name}` : 'Thêm Nhóm Quyền / Vai Trò Mới'}
        </Text>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnHidden
    >
      <Form form={roleForm} layout="vertical" onFinish={onSubmit} className="mt-5">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="key"
              label={
                <Space>
                  <Text className="text-[var(--mos-text)]">Mã định danh (Key)</Text>
                  <Tooltip title="Chuỗi định danh dạng viết liền không dấu, dùng để xác định vai trò trong hệ thống (ví dụ: ccc-leader, marketing)">
                    <AppIcon icon={Info} size={14} className="text-slate-500 dark:text-slate-400" />
                  </Tooltip>
                </Space>
              }
              rules={[
                { required: true, message: 'Vui lòng nhập mã định danh!' },
                {
                  pattern: /^[a-z0-9-_]+$/,
                  message: 'Mã định danh chỉ gồm chữ thường viết liền, gạch ngang, gạch dưới!',
                },
              ]}
            >
              <Input
                placeholder="ví dụ: admin-assistant"
                disabled={!!editingRole}
                prefix={<AppIcon icon={KeyRound} size={14} className="text-slate-500 dark:text-slate-400" />}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="name"
              label={<Text className="text-[var(--mos-text)]">Tên hiển thị</Text>}
              rules={[{ required: true, message: 'Vui lòng nhập tên vai trò!' }]}
            >
              <Input placeholder="ví dụ: Trợ lý Admin" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="color"
              label={
                <Space>
                  <Text className="text-[var(--mos-text)]">Màu sắc hiển thị (Tag color)</Text>
                  <AppIcon icon={Palette} size={14} className="text-slate-500 dark:text-slate-400" />
                </Space>
              }
              rules={[{ required: true, message: 'Vui lòng chọn màu hiển thị!' }]}
            >
              <Select
                placeholder="Chọn màu tag"
                options={PRESET_COLORS.map((colorOption) => ({
                  value: colorOption.value,
                  label: <Badge color={colorOption.value} text={colorOption.label} />,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label={<Text className="text-[var(--mos-text)]">Mô tả vai trò</Text>}>
          <TextArea rows={2} placeholder="Nhiệm vụ, phạm vi công việc của nhóm quyền..." />
        </Form.Item>

        <Card
          title={
            <Space>
              <AppIcon icon={ShieldCheck} size={16} className="text-[var(--color-primary)]" />
              <Text className="text-sm font-bold">Phân Quyền Hệ Thống (Permissions)</Text>
            </Space>
          }
          size="small"
          className="mb-5 border border-[var(--mos-border-secondary)] bg-[var(--mos-bg-container)]"
        >
          <Row gutter={[16, 16]}>
            {ROLE_PERMISSION_FIELDS.map((permission) => (
              <Col span={24} key={permission.name}>
                <Form.Item name={permission.name} valuePropName="checked" className="mb-1">
                  <Checkbox disabled={permission.disableForAdmin && editingRole?.key === 'admin'}>
                    <Text className="font-medium">{permission.title}</Text>
                    <Paragraph type="secondary" className="m-0 text-xs">
                      {permission.description}
                    </Paragraph>
                  </Checkbox>
                </Form.Item>
              </Col>
            ))}
          </Row>
        </Card>

        <div className="flex justify-end gap-3">
          <Button onClick={onCancel}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={submitting} className="font-semibold">
            {editingRole ? 'Lưu thay đổi' : 'Tạo vai trò mới'}
          </Button>
        </div>
      </Form>
    </AdaptiveModal>
  );
}
