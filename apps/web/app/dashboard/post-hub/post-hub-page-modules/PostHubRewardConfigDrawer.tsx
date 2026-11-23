'use client';

import React from 'react';
import { Alert, Button, InputNumber, Space, type FormInstance } from 'antd';
import { CircleCheck } from 'lucide-react';
import { AppIcon, EntityForm, EntityFormDrawer, EntityFormField } from '~/components/ui';
import type { RewardConfigFormValues } from './postHubPageConstants';

interface PostHubRewardConfigDrawerProps {
  open: boolean;
  saving: boolean;
  form: FormInstance<RewardConfigFormValues>;
  onClose: () => void;
  onSubmit: (values: RewardConfigFormValues) => void | Promise<void>;
}

/**
 * Drawer form allowing admins and campaign managers to configure daily Post Hub reward rules.
 */
export function PostHubRewardConfigDrawer({ open, saving, form, onClose, onSubmit }: PostHubRewardConfigDrawerProps) {
  return (
    <EntityFormDrawer
      open={open}
      onClose={onClose}
      title="Cấu hình thưởng đăng bài"
      footer={
        <Space>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" loading={saving} icon={<AppIcon icon={CircleCheck} />} onClick={() => form.submit()}>
            Lưu cấu hình
          </Button>
        </Space>
      }
    >
      <div className="flex flex-col gap-5">
        <Alert
          type="info"
          showIcon
          message="Áp dụng theo thứ tự: cap Video → cap Bài khác → tính hệ số → mức hỗn hợp vượt ngưỡng"
          description="Để trống mức hỗn hợp vượt ngưỡng sẽ giữ trạng thái chưa xác định để quản lý tự cấu hình. Chỉ Admin hoặc Quản lý chiến dịch mới có thể lưu."
        />
        <EntityForm form={form} onFinish={onSubmit} columns={2}>
          <EntityFormField label="🍌 mỗi Video hợp lệ" name="videoPoints" rules={[{ required: true }]}>
            <InputNumber min={0} max={100000} precision={0} className="w-full" />
          </EntityFormField>
          <EntityFormField label="🍌 mỗi Bài khác hợp lệ" name="recruitmentPoints" rules={[{ required: true }]}>
            <InputNumber min={0} max={100000} precision={0} className="w-full" />
          </EntityFormField>
          <EntityFormField label="Cap Video khi số lượng >" name="videoCapThreshold" rules={[{ required: true }]}>
            <InputNumber min={0} max={100000} precision={0} className="w-full" />
          </EntityFormField>
          <EntityFormField label="🍌 cap Video" name="videoCapPoints" rules={[{ required: true }]}>
            <InputNumber min={0} max={100000} precision={0} className="w-full" />
          </EntityFormField>
          <EntityFormField
            label="Cap Bài khác khi số lượng >"
            name="recruitmentCapThreshold"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} max={100000} precision={0} className="w-full" />
          </EntityFormField>
          <EntityFormField label="🍌 cap Bài khác" name="recruitmentCapPoints" rules={[{ required: true }]}>
            <InputNumber min={0} max={100000} precision={0} className="w-full" />
          </EntityFormField>
          <EntityFormField label="Tổng tối đa tính theo hệ số" name="mixedEligibleTotal" rules={[{ required: true }]}>
            <InputNumber min={0} max={100000} precision={0} className="w-full" />
          </EntityFormField>
          <EntityFormField label="🍌 khi tổng hỗn hợp vượt ngưỡng" name="mixedOverflowPoints">
            <InputNumber min={0} max={100000} precision={0} placeholder="Để trống = cần cấu hình" className="w-full" />
          </EntityFormField>
        </EntityForm>
      </div>
    </EntityFormDrawer>
  );
}
