'use client';

import { Button, Input, Select, type FormInstance } from 'antd';
import { QrCode } from 'lucide-react';
import type { AcademyWorkshopResourcesResponse } from '@mos-lab/shared';
import { AdaptiveModal, AdaptiveOverlayFooter, AppIcon, EntityForm, EntityFormField } from '~/components/ui';
import type { AcademyWorkshopWalkInForm } from './participant-overlay-types';

export interface WalkInParticipantModalProps {
  open: boolean;
  busy: boolean;
  form: FormInstance<AcademyWorkshopWalkInForm>;
  resources: AcademyWorkshopResourcesResponse;
  onClose: () => void;
  onCreateWalkIn: (values: AcademyWorkshopWalkInForm) => void;
}

export function WalkInParticipantModal({
  open,
  busy,
  form,
  resources,
  onClose,
  onCreateWalkIn,
}: WalkInParticipantModalProps) {
  return (
    <AdaptiveModal
      open={open}
      title="Tạo học viên walk-in"
      intent="confirm"
      footer={
        <AdaptiveOverlayFooter>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" icon={<AppIcon icon={QrCode} />} loading={busy} onClick={() => form.submit()}>
            Tạo & cấp QR
          </Button>
        </AdaptiveOverlayFooter>
      }
      onCancel={onClose}
      destroyOnHidden
    >
      <EntityForm form={form} columns={2} onFinish={onCreateWalkIn}>
        <EntityFormField
          name="name"
          label="Họ tên"
          fullWidth
          rules={[{ required: true, message: 'Nhập họ tên học viên.' }]}
        >
          <Input autoFocus placeholder="Họ và tên" />
        </EntityFormField>
        <EntityFormField name="phone" label="Số điện thoại">
          <Input inputMode="tel" placeholder="Số điện thoại" />
        </EntityFormField>
        <EntityFormField name="email" label="Email">
          <Input type="email" placeholder="Email" />
        </EntityFormField>
        <EntityFormField name="primaryInstructorId" label="Giáo viên chính" fullWidth>
          <Select
            allowClear
            placeholder="Chọn giáo viên (không bắt buộc)"
            options={resources.instructors.map((item) => ({ value: item.id, label: item.displayName }))}
          />
        </EntityFormField>
      </EntityForm>
    </AdaptiveModal>
  );
}
