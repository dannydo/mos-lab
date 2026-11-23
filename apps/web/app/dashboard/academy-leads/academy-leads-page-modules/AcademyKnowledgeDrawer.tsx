'use client';

import { Button, Input, InputNumber, Select, Space } from 'antd';
import type { FormInstance } from 'antd';
import type { UpsertAcademyPlaybookRequest } from '@mos-lab/shared';
import { EntityForm, EntityFormDrawer, EntityFormField } from '~/components/ui';
import type { CourseFormValues, KnowledgeEditor } from './academy-leads-utils';

export interface AcademyKnowledgeDrawerProps {
  editor: KnowledgeEditor;
  saving: boolean;
  playbookForm: FormInstance<UpsertAcademyPlaybookRequest>;
  courseForm: FormInstance<CourseFormValues>;
  onClose: () => void;
  onSavePlaybook: (values: UpsertAcademyPlaybookRequest) => Promise<void>;
  onSaveCourse: (values: CourseFormValues) => Promise<void>;
}

export function AcademyKnowledgeDrawer({
  editor,
  saving,
  playbookForm,
  courseForm,
  onClose,
  onSavePlaybook,
  onSaveCourse,
}: AcademyKnowledgeDrawerProps) {
  return (
    <EntityFormDrawer
      open={Boolean(editor)}
      onClose={onClose}
      title={
        editor?.kind === 'course'
          ? `${editor.record ? 'Sửa' : 'Thêm'} khóa học`
          : `${editor?.record ? 'Sửa' : 'Thêm'} playbook`
      }
      footer={
        <Space>
          <Button onClick={onClose}>Hủy</Button>
          <Button
            type="primary"
            loading={saving}
            onClick={() => (editor?.kind === 'course' ? courseForm.submit() : playbookForm.submit())}
          >
            Lưu
          </Button>
        </Space>
      }
    >
      {editor?.kind === 'playbook' ? (
        <EntityForm form={playbookForm} onFinish={onSavePlaybook} columns={1}>
          <EntityFormField label="Tiêu đề" name="title" rules={[{ required: true }]}>
            <Input />
          </EntityFormField>
          <EntityFormField label="Danh mục" name="category" rules={[{ required: true }]}>
            <Input placeholder="Mở đầu, xử lý từ chối…" />
          </EntityFormField>
          <EntityFormField label="Mô tả" name="description">
            <Input.TextArea rows={2} />
          </EntityFormField>
          <EntityFormField label="Nội dung" name="content" rules={[{ required: true }]}>
            <Input.TextArea rows={10} />
          </EntityFormField>
          <EntityFormField label="Thứ tự" name="sortOrder">
            <InputNumber min={0} className="w-full" />
          </EntityFormField>
          <EntityFormField label="Hiển thị" name="isActive">
            <Select
              options={[
                { value: true, label: 'Đang dùng' },
                { value: false, label: 'Ẩn' },
              ]}
            />
          </EntityFormField>
        </EntityForm>
      ) : editor?.kind === 'course' ? (
        <EntityForm form={courseForm} onFinish={onSaveCourse} columns={2}>
          <EntityFormField label="Mã khóa" name="code" rules={[{ required: true }]}>
            <Input />
          </EntityFormField>
          <EntityFormField label="Tên khóa" name="name" rules={[{ required: true }]}>
            <Input />
          </EntityFormField>
          <EntityFormField label="Tag" name="tag">
            <Input />
          </EntityFormField>
          <EntityFormField label="Kit" name="kitName">
            <Input />
          </EntityFormField>
          <EntityFormField label="Giá niêm yết (VNĐ)" name="listPriceVnd" rules={[{ required: true }]}>
            <InputNumber min={0} className="w-full" />
          </EntityFormField>
          <EntityFormField label="Giá ưu đãi (VNĐ)" name="promoPriceVnd" rules={[{ required: true }]}>
            <InputNumber min={0} className="w-full" />
          </EntityFormField>
          <EntityFormField fullWidth label="Mô tả" name="description">
            <Input.TextArea rows={2} />
          </EntityFormField>
          <EntityFormField fullWidth label="Link kit" name="kitUrl">
            <Input />
          </EntityFormField>
          <EntityFormField fullWidth label="Giáo trình (JSON array)" name="syllabusText">
            <Input.TextArea rows={8} spellCheck={false} />
          </EntityFormField>
          <EntityFormField label="Thứ tự" name="sortOrder">
            <InputNumber min={0} className="w-full" />
          </EntityFormField>
          <EntityFormField label="Hiển thị" name="isActive">
            <Select
              options={[
                { value: true, label: 'Đang dùng' },
                { value: false, label: 'Ẩn' },
              ]}
            />
          </EntityFormField>
        </EntityForm>
      ) : null}
    </EntityFormDrawer>
  );
}
