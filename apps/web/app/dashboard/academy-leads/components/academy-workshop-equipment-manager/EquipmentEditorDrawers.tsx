'use client';

import { Button, Checkbox, type FormInstance, Input, InputNumber, Space } from 'antd';
import { Save, Wrench } from 'lucide-react';
import type { AcademyWorkshopEquipmentPackage } from '@mos-lab/shared';
import { AppIcon, EntityForm, EntityFormDrawer, EntityFormField, IconText } from '~/components/ui';
import AcademyWorkshopServerImageUpload from '../AcademyWorkshopServerImageUpload';
import {
  itemLines,
  type EquipmentFormValues,
  type EquipmentImageTarget,
  type ImageFormValues,
} from './equipment-manager-utils';

export interface EquipmentEditorDrawersProps {
  workshopId: number;
  form: FormInstance<EquipmentFormValues>;
  imageForm: FormInstance<ImageFormValues>;
  editorOpen: boolean;
  editingItem: AcademyWorkshopEquipmentPackage | null;
  imageEditorOpen: boolean;
  imageTarget: EquipmentImageTarget | null;
  saving: boolean;
  onSaveItem: (values: EquipmentFormValues) => Promise<void> | void;
  onCloseEditor: () => void;
  onSaveImage: (values: ImageFormValues) => Promise<void> | void;
  onCloseImageEditor: () => void;
}

export function EquipmentEditorDrawers({
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
}: EquipmentEditorDrawersProps) {
  return (
    <>
      <EntityFormDrawer
        open={editorOpen}
        title={editingItem ? 'Chỉnh sửa bộ dụng cụ' : 'Thêm bộ dụng cụ'}
        onClose={onCloseEditor}
        destroyOnHidden
        footer={
          <Space className="w-full justify-end" wrap>
            <Button onClick={onCloseEditor} disabled={saving}>
              Hủy
            </Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}>
              <IconText icon={<AppIcon icon={Save} />}>Lưu bộ dụng cụ</IconText>
            </Button>
          </Space>
        }
      >
        <EntityForm<EquipmentFormValues> form={form} columns={1} onFinish={onSaveItem} disabled={saving}>
          <EntityFormField
            name="name"
            label="Tên bộ dụng cụ"
            rules={[
              { required: true, whitespace: true, message: 'Nhập tên bộ dụng cụ.' },
              { max: 180, message: 'Tên bộ dụng cụ tối đa 180 ký tự.' },
            ]}
          >
            <Input autoFocus placeholder="Ví dụ: Combo Cao Cấp" prefix={<AppIcon icon={Wrench} size="sm" />} />
          </EntityFormField>
          <EntityFormField
            name="priceVnd"
            label="Phụ thu dụng cụ (VNĐ)"
            rules={[{ required: true, message: 'Nhập giá phụ thu.' }]}
          >
            <InputNumber<number>
              className="w-full"
              min={0}
              max={100000000}
              precision={0}
              addonAfter="đ"
              formatter={(value) =>
                value === undefined || value === null ? '' : Math.round(Number(value)).toLocaleString('vi-VN')
              }
              parser={(value) => Number(String(value || '').replace(/[^0-9]/g, ''))}
            />
          </EntityFormField>
          <EntityFormField
            name="includedItemsText"
            label="Dụng cụ đi kèm"
            extra="Mỗi dòng là một món. Danh sách này được lưu nguyên trạng cùng lựa chọn của học viên."
            rules={[
              { required: true, whitespace: true, message: 'Nhập ít nhất một dụng cụ.' },
              {
                validator: async (_, value) => {
                  const items = itemLines(String(value || ''));
                  if (!items.length) throw new Error('Nhập ít nhất một dụng cụ.');
                  if (items.length > 16) throw new Error('Tối đa 16 dụng cụ trong một bộ.');
                },
              },
            ]}
          >
            <Input.TextArea rows={7} maxLength={3000} placeholder={'Nhíp cao cấp\nKeo nối mi chuyên dụng\nMi nối'} />
          </EntityFormField>
          <EntityFormField name="description" label="Mô tả (tùy chọn)">
            <Input.TextArea rows={3} maxLength={2000} placeholder="Ví dụ: Phù hợp để luyện kỹ thuật sau workshop." />
          </EntityFormField>
          <EntityFormField name="isAvailable" valuePropName="checked">
            <Checkbox>Đang khả dụng — hiển thị cho học viên chọn</Checkbox>
          </EntityFormField>
          <EntityFormField
            name="isIncludedInFee"
            valuePropName="checked"
            extra="Nếu chọn, bộ dụng cụ này được tặng kèm trong gói học phí (0 đ phụ thu). Chọn bộ khác có giá cao hơn sẽ tính chênh lệch. Chỉ một bộ được làm gói tặng kèm."
          >
            <Checkbox>Gói tặng kèm (Đã bao gồm trong học phí workshop)</Checkbox>
          </EntityFormField>
        </EntityForm>
      </EntityFormDrawer>

      <EntityFormDrawer
        open={imageEditorOpen}
        title={imageTarget?.image ? 'Chỉnh sửa ảnh bộ dụng cụ' : 'Thêm ảnh bộ dụng cụ'}
        onClose={onCloseImageEditor}
        destroyOnHidden
        footer={
          <Space className="w-full justify-end" wrap>
            <Button onClick={onCloseImageEditor} disabled={saving}>
              Hủy
            </Button>
            <Button type="primary" loading={saving} onClick={() => imageForm.submit()}>
              <IconText icon={<AppIcon icon={Save} />}>Lưu ảnh</IconText>
            </Button>
          </Space>
        }
      >
        <EntityForm<ImageFormValues> form={imageForm} columns={1} onFinish={onSaveImage} disabled={saving}>
          <EntityFormField
            name="imageUrl"
            label="Ảnh bộ dụng cụ"
            extra="Ảnh được tải lên Academy Media. Học viên có thể vuốt hoặc bấm để xem gallery."
            rules={[{ required: true, message: 'Tải lên một ảnh bộ dụng cụ.' }]}
          >
            <AcademyWorkshopServerImageUpload workshopId={workshopId} area="equipment" disabled={saving} />
          </EntityFormField>
          <EntityFormField
            name="altText"
            label="Mô tả ảnh (tùy chọn)"
            rules={[{ max: 180, message: 'Mô tả tối đa 180 ký tự.' }]}
          >
            <Input.TextArea rows={3} maxLength={180} placeholder="Ví dụ: Cận cảnh bộ dụng cụ cao cấp" />
          </EntityFormField>
        </EntityForm>
      </EntityFormDrawer>
    </>
  );
}
