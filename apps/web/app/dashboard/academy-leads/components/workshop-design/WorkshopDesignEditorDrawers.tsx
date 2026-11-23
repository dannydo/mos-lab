'use client';

import { Button, Checkbox, type FormInstance, Input, InputNumber, Select } from 'antd';
import type { AcademyWorkshopDesignItem, AcademyWorkshopDesignItemImage } from '@mos-lab/shared';
import { EntityForm, EntityFormDrawer, EntityFormField } from '../../../../../components/ui';
import AcademyWorkshopServerImageUpload from '../AcademyWorkshopServerImageUpload';
import type { DesignFormValues, ImageFormValues } from './workshop-design-utils';

interface WorkshopDesignEditorDrawersProps {
  workshopId: number;
  form: FormInstance<DesignFormValues>;
  imageForm: FormInstance<ImageFormValues>;
  editorOpen: boolean;
  editingItem: AcademyWorkshopDesignItem | null;
  imageEditorOpen: boolean;
  imageTarget: {
    designItem: AcademyWorkshopDesignItem;
    image: AcademyWorkshopDesignItemImage | null;
  } | null;
  saving: boolean;
  onSaveItem: (values: DesignFormValues) => void;
  onCloseEditor: () => void;
  onSaveImage: (values: ImageFormValues) => void;
  onCloseImageEditor: () => void;
}

export function WorkshopDesignEditorDrawers({
  workshopId,
  form,
  imageForm,
  editorOpen,
  editingItem,
  imageEditorOpen,
  imageTarget,
  saving,
  onSaveItem,
  onCloseEditor,
  onSaveImage,
  onCloseImageEditor,
}: WorkshopDesignEditorDrawersProps) {
  return (
    <>
      {/* Create / Edit Design Item Drawer */}
      <EntityFormDrawer
        open={editorOpen}
        title={editingItem ? 'Chỉnh sửa Mẫu thiết kế mi' : 'Thêm Mẫu thiết kế mi mới'}
        onClose={onCloseEditor}
      >
        <EntityForm form={form} onFinish={onSaveItem} layout="vertical">
          <EntityFormField
            name="name"
            label="Tên mẫu thiết kế mi"
            rules={[{ required: true, message: 'Vui lòng nhập tên mẫu mi' }]}
          >
            <Input placeholder="Ví dụ: Katun Fox Đuôi Cáo" maxLength={180} />
          </EntityFormField>

          <EntityFormField
            name="difficultyLevel"
            label="Mức độ khó của mẫu"
            rules={[{ required: true, message: 'Vui lòng chọn mức độ khó' }]}
          >
            <Select
              options={[
                { value: 'BASIC', label: '⭐ BASIC - Cơ bản (Dễ luyện tập, phân tách mi chuẩn)' },
                { value: 'ADVANCED', label: '⭐⭐ ADVANCED - Nâng cao (Đòi hỏi form dáng, gom ngọn/tạo trụ)' },
                { value: 'MASTER', label: '⭐⭐⭐ MASTER - Chuyên sâu (Thiết kế gai anime, mix tầng mi đỉnh cao)' },
              ]}
            />
          </EntityFormField>

          <EntityFormField
            name="priceVnd"
            label="Phụ thu học phí (VNĐ)"
            rules={[{ required: true, message: 'Vui lòng nhập phụ thu (0 nếu miễn phí)' }]}
          >
            <InputNumber<number>
              min={0}
              step={10000}
              className="w-full"
              formatter={(val) => `${val || 0}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(val) => (val ? Number(val.replace(/\$\s?|(,*)/g, '')) : 0)}
              addonAfter="đ"
            />
          </EntityFormField>

          <EntityFormField name="isAvailable" valuePropName="checked">
            <Checkbox>Cho phép học viên chọn mẫu thiết kế này</Checkbox>
          </EntityFormField>

          <EntityFormField name="description" label="Mô tả kỹ thuật & phong cách">
            <Input.TextArea
              rows={4}
              placeholder="Mô tả đặc điểm form dáng, kỹ thuật nối mi, số sợi/chùm hoặc loại keo phù hợp..."
              maxLength={2000}
            />
          </EntityFormField>

          <div className="flex justify-end gap-2 pt-4">
            <Button onClick={onCloseEditor}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              {editingItem ? 'Cập nhật' : 'Thêm mẫu'}
            </Button>
          </div>
        </EntityForm>
      </EntityFormDrawer>

      {/* Image Upload / Edit Drawer */}
      <EntityFormDrawer
        open={imageEditorOpen}
        title={imageTarget?.image ? 'Chỉnh sửa ảnh mẫu mi' : 'Thêm ảnh mẫu mi'}
        onClose={onCloseImageEditor}
      >
        <EntityForm form={imageForm} onFinish={onSaveImage} layout="vertical">
          <AcademyWorkshopServerImageUpload
            workshopId={workshopId}
            area="design"
            value={imageForm.getFieldValue('imageUrl')}
            onChange={(url) => imageForm.setFieldValue('imageUrl', url)}
          />

          <EntityFormField
            name="imageUrl"
            label="Đường dẫn ảnh"
            rules={[{ required: true, message: 'Vui lòng tải lên ảnh hoặc nhập URL' }]}
          >
            <Input placeholder="https://..." maxLength={512} />
          </EntityFormField>

          <EntityFormField name="altText" label="Mô tả ảnh / Chú thích">
            <Input placeholder="Ví dụ: Góc chụp cận cảnh mi Katun đuôi cáo" maxLength={180} />
          </EntityFormField>

          <div className="flex justify-end gap-2 pt-4">
            <Button onClick={onCloseImageEditor}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              {imageTarget?.image ? 'Lưu thay đổi' : 'Thêm ảnh'}
            </Button>
          </div>
        </EntityForm>
      </EntityFormDrawer>
    </>
  );
}
