'use client';

import { Button, Input, type FormInstance } from 'antd';
import { CirclePlus, Save } from 'lucide-react';
import { AdaptiveModal, AdaptiveOverlayFooter, AppIcon, EntityForm, EntityFormField } from '~/components/ui';
import type { QuizFormValues } from './quiz-manager-utils';

export interface QuizEditorModalProps {
  open: boolean;
  editingQuiz: boolean;
  templateMode: boolean;
  submitting: boolean;
  form: FormInstance<QuizFormValues>;
  onSubmit: (values: QuizFormValues) => void;
  onCancel: () => void;
}

export function QuizEditorModal({
  open,
  editingQuiz,
  templateMode,
  submitting,
  form,
  onSubmit,
  onCancel,
}: QuizEditorModalProps) {
  return (
    <AdaptiveModal
      open={open}
      title={
        editingQuiz
          ? templateMode
            ? 'Sửa thông tin mẫu'
            : 'Sửa thông tin game'
          : templateMode
            ? 'Tạo mẫu câu hỏi mới'
            : 'Tạo bộ câu hỏi mới'
      }
      intent="confirm"
      footer={
        <AdaptiveOverlayFooter>
          <Button onClick={onCancel}>Hủy</Button>
          <Button
            type="primary"
            icon={<AppIcon icon={editingQuiz ? Save : CirclePlus} />}
            loading={submitting}
            onClick={() => form.submit()}
          >
            {editingQuiz ? 'Lưu thay đổi' : templateMode ? 'Tạo mẫu' : 'Tạo bộ câu hỏi'}
          </Button>
        </AdaptiveOverlayFooter>
      }
      onCancel={onCancel}
      destroyOnHidden
    >
      <EntityForm form={form} columns={1} onFinish={onSubmit}>
        <EntityFormField
          name="title"
          label={templateMode ? 'Tên mẫu' : 'Tên game'}
          rules={[{ required: true, message: templateMode ? 'Nhập tên mẫu.' : 'Nhập tên game.' }, { max: 180 }]}
        >
          <Input
            autoFocus
            placeholder={templateMode ? 'Ví dụ: Kiến thức nối mi căn bản' : 'Ví dụ: Academy Challenge'}
            maxLength={180}
            showCount
          />
        </EntityFormField>
        <EntityFormField name="description" label="Mô tả" fullWidth>
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="Mục tiêu hoặc ghi chú cho Host…" />
        </EntityFormField>
      </EntityForm>
    </AdaptiveModal>
  );
}
