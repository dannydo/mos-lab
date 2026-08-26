'use client';

import React from 'react';
import { Button, DatePicker, Form, Input, InputNumber, Select, Space, Switch, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { PencilLine, Save } from 'lucide-react';
import {
  removeVietnameseTones,
  type AcademyStaffOption,
  type AcademyWorkshopDetail,
  type UpdateAcademyWorkshopRequest,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import {
  AppIcon,
  EntityForm,
  EntityFormDrawer,
  EntityFormField,
  IconButton,
  IconText,
} from '../../../../components/ui';

type AcademyWorkshopEditFormValues = {
  name: string;
  slug: string;
  description?: string | null;
  startsAt: Dayjs;
  endsAt: Dayjs;
  location: string;
  capacity: number;
  feeVnd: number;
  feeDueAt?: Dayjs | null;
  assignedStaffIds: number[];
  showInSidebar: boolean;
};

function toFormValues(workshop: AcademyWorkshopDetail): AcademyWorkshopEditFormValues {
  return {
    name: workshop.name,
    slug: workshop.slug,
    description: workshop.description,
    startsAt: dayjs(workshop.startsAt),
    endsAt: dayjs(workshop.endsAt),
    location: workshop.location,
    capacity: workshop.capacity,
    feeVnd: workshop.feeVnd,
    feeDueAt: workshop.feeDueAt ? dayjs(workshop.feeDueAt) : null,
    assignedStaffIds: workshop.assignedStaffIds,
    showInSidebar: workshop.showInSidebar,
  };
}

function toUpdateRequest(values: AcademyWorkshopEditFormValues): UpdateAcademyWorkshopRequest {
  return {
    name: values.name.trim(),
    slug: values.slug.trim(),
    description: values.description?.trim() || null,
    startsAt: values.startsAt.toISOString(),
    endsAt: values.endsAt.toISOString(),
    location: values.location.trim(),
    capacity: Math.round(values.capacity),
    feeVnd: Math.round(values.feeVnd || 0),
    feeDueAt: values.feeDueAt?.toISOString() || null,
    assignedStaffIds: values.assignedStaffIds,
    showInSidebar: Boolean(values.showInSidebar),
  };
}

export default function AcademyWorkshopEditButton({
  workshop,
  staffOptions,
  canEdit,
  iconOnly = false,
  onUpdated,
}: {
  workshop: AcademyWorkshopDetail;
  staffOptions: AcademyStaffOption[];
  canEdit: boolean;
  iconOnly?: boolean;
  onUpdated: (updated: AcademyWorkshopDetail) => void;
}) {
  const [form] = Form.useForm<AcademyWorkshopEditFormValues>();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const openEditor = React.useCallback(() => {
    form.setFieldsValue(toFormValues(workshop));
    setOpen(true);
  }, [form, workshop]);

  const closeEditor = React.useCallback(() => {
    if (saving) return;
    setOpen(false);
    form.resetFields();
  }, [form, saving]);

  const save = React.useCallback(
    async (values: AcademyWorkshopEditFormValues) => {
      setSaving(true);
      try {
        const updated = await apiClient.academySales.workshops.update(workshop.id, toUpdateRequest(values));
        onUpdated(updated);
        setOpen(false);
        form.resetFields();
        message.success('Đã cập nhật workshop.');
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể cập nhật workshop.');
      } finally {
        setSaving(false);
      }
    },
    [form, onUpdated, workshop.id]
  );

  if (!canEdit) return null;

  return (
    <>
      {iconOnly ? (
        <IconButton label="Chỉnh sửa workshop" icon={PencilLine} onClick={openEditor} />
      ) : (
        <Button onClick={openEditor}>
          <IconText icon={<AppIcon icon={PencilLine} />}>Chỉnh sửa</IconText>
        </Button>
      )}
      <EntityFormDrawer
        open={open}
        title="Chỉnh sửa workshop"
        onClose={closeEditor}
        destroyOnHidden
        footer={
          <Space className="w-full justify-end" wrap>
            <Button onClick={closeEditor} disabled={saving}>
              Hủy
            </Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}>
              <IconText icon={<AppIcon icon={Save} />}>Lưu thay đổi</IconText>
            </Button>
          </Space>
        }
      >
        <EntityForm<AcademyWorkshopEditFormValues> form={form} columns={2} onFinish={save} disabled={saving}>
          <EntityFormField
            name="name"
            label="Tên workshop"
            rules={[
              { required: true, whitespace: true, message: 'Nhập tên workshop.' },
              { max: 150, message: 'Tên workshop tối đa 150 ký tự.' },
            ]}
          >
            <Input autoFocus placeholder="Workshop Làm Chủ" />
          </EntityFormField>
          <EntityFormField
            name="slug"
            label="Đường dẫn (slug)"
            extra="Chỉ đổi khi bạn muốn thay URL của workspace."
            rules={[{ required: true, whitespace: true, message: 'Nhập đường dẫn workshop.' }]}
          >
            <Input placeholder="workshop-lam-chu" />
          </EntityFormField>
          <EntityFormField
            name="startsAt"
            label="Bắt đầu"
            rules={[{ required: true, message: 'Chọn thời gian bắt đầu.' }]}
          >
            <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" />
          </EntityFormField>
          <EntityFormField
            name="endsAt"
            label="Kết thúc"
            dependencies={['startsAt']}
            rules={[
              { required: true, message: 'Chọn thời gian kết thúc.' },
              {
                validator: async (_rule, value?: Dayjs) => {
                  const startsAt = form.getFieldValue('startsAt');
                  if (value && startsAt && !value.isAfter(startsAt)) {
                    throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu.');
                  }
                },
              },
            ]}
          >
            <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" />
          </EntityFormField>
          <EntityFormField
            name="location"
            label="Địa điểm"
            rules={[
              { required: true, whitespace: true, message: 'Nhập địa điểm workshop.' },
              { max: 255, message: 'Địa điểm tối đa 255 ký tự.' },
            ]}
          >
            <Input placeholder="Wings Academy" />
          </EntityFormField>
          <EntityFormField name="capacity" label="Sức chứa tối đa" rules={[{ required: true }]}>
            <InputNumber min={1} max={100} precision={0} className="w-full" />
          </EntityFormField>
          <EntityFormField name="feeVnd" label="Phí tham dự">
            <InputNumber
              min={0}
              precision={0}
              step={100000}
              className="w-full"
              formatter={(value) => `${Math.round(Number(value || 0)).toLocaleString('vi-VN')} đ`}
            />
          </EntityFormField>
          <EntityFormField name="feeDueAt" label="Hạn đóng phí">
            <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" />
          </EntityFormField>
          <EntityFormField name="assignedStaffIds" label="Staff vận hành" fullWidth>
            <Select
              mode="multiple"
              allowClear
              showSearch
              placeholder="Chọn staff phụ trách"
              options={staffOptions.map((staff) => ({ value: staff.id, label: staff.displayName }))}
              filterOption={(input, option) =>
                removeVietnameseTones(String(option?.label || '')).includes(removeVietnameseTones(input))
              }
            />
          </EntityFormField>
          <EntityFormField name="showInSidebar" label="Hiển thị ở menu nhanh" valuePropName="checked">
            <Switch />
          </EntityFormField>
          <EntityFormField name="description" label="Mô tả" fullWidth>
            <Input.TextArea rows={4} placeholder="Mục tiêu, đối tượng và thông tin vận hành…" />
          </EntityFormField>
        </EntityForm>
      </EntityFormDrawer>
    </>
  );
}
