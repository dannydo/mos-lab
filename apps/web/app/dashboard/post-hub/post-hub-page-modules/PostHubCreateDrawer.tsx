'use client';

import React from 'react';
import { Alert, Button, DatePicker, Input, Select, Space, type FormInstance } from 'antd';
import { Send } from 'lucide-react';
import { AppIcon, EntityForm, EntityFormDrawer, EntityFormField } from '~/components/ui';
import { type CreateSubmissionFormValues, NATIVE_CHANNEL_OPTIONS } from './postHubPageConstants';

interface PostHubCreateDrawerProps {
  open: boolean;
  saving: boolean;
  form: FormInstance<CreateSubmissionFormValues>;
  onClose: () => void;
  onSubmit: (values: CreateSubmissionFormValues) => void | Promise<void>;
}

/**
 * Drawer form allowing staff to submit a new social post directly into mOS Post Hub.
 */
export function PostHubCreateDrawer({ open, saving, form, onClose, onSubmit }: PostHubCreateDrawerProps) {
  return (
    <EntityFormDrawer
      open={open}
      onClose={onClose}
      title="Nộp bài đăng mOS"
      footer={
        <Space>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" loading={saving} icon={<AppIcon icon={Send} />} onClick={() => form.submit()}>
            Gửi duyệt
          </Button>
        </Space>
      }
    >
      <div className="flex flex-col gap-5">
        <Alert
          type="info"
          showIcon
          message="Bài đăng được ghi nhận cho chính tài khoản mOS của bạn"
          description="Chọn đúng ngày, giờ đăng (ICT). Bài sẽ vào hàng chờ; chỉ Hợp lệ mới được tính thưởng Daily."
        />
        <EntityForm form={form} onFinish={onSubmit} columns={1}>
          <EntityFormField
            fullWidth
            label="Link bài đăng"
            name="sourceUrl"
            rules={[
              { required: true, message: 'Nhập link Facebook hoặc TikTok' },
              { type: 'url', message: 'Link bài đăng chưa hợp lệ' },
            ]}
          >
            <Input placeholder="https://www.facebook.com/... hoặc https://www.tiktok.com/..." autoComplete="url" />
          </EntityFormField>
          <EntityFormField
            fullWidth
            label="Nơi đăng"
            name="channel"
            rules={[{ required: true, message: 'Chọn nơi đăng' }]}
          >
            <Select options={NATIVE_CHANNEL_OPTIONS} aria-label="Chọn nơi đăng" />
          </EntityFormField>
          <EntityFormField
            fullWidth
            label="Loại bài để tính thưởng"
            name="contentType"
            rules={[{ required: true, message: 'Chọn loại bài' }]}
          >
            <Select
              aria-label="Chọn loại bài đăng"
              options={[
                { value: 'RECRUITMENT_POST', label: 'Bài khác · tính theo hệ số bài khác' },
                { value: 'VIDEO', label: 'Video · tính theo hệ số Video' },
              ]}
            />
          </EntityFormField>
          <EntityFormField
            fullWidth
            label="Ngày, giờ đăng (ICT)"
            name="postedAt"
            rules={[{ required: true, message: 'Chọn ngày giờ đăng' }]}
          >
            <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" allowClear={false} />
          </EntityFormField>
        </EntityForm>
      </div>
    </EntityFormDrawer>
  );
}
