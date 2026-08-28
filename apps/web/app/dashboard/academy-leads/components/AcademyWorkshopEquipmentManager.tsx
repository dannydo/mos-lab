'use client';

import React from 'react';
import { Alert, Button, Checkbox, Form, Input, InputNumber, Popconfirm, Space, message, theme } from 'antd';
import { PackageCheck, PencilLine, Plus, Save, Trash2, Wrench } from 'lucide-react';
import {
  type AcademyWorkshopDetail,
  type AcademyWorkshopEquipmentPackage,
  type AcademyWorkshopEquipmentPackageImage,
  type CreateAcademyWorkshopEquipmentPackageRequest,
  type CreateAcademyWorkshopEquipmentPackageImageRequest,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import AcademyWorkshopServerImageUpload from './AcademyWorkshopServerImageUpload';
import {
  AppIcon,
  DataSection,
  EntityForm,
  EntityFormDrawer,
  EntityFormField,
  IconButton,
  IconText,
  StatePanel,
  StatusTag,
} from '../../../../components/ui';

type EquipmentFormValues = Omit<CreateAcademyWorkshopEquipmentPackageRequest, 'includedItems'> & {
  includedItemsText: string;
};

type ImageFormValues = CreateAcademyWorkshopEquipmentPackageImageRequest;

function equipmentFormValues(item?: AcademyWorkshopEquipmentPackage): EquipmentFormValues {
  return {
    name: item?.name || '',
    description: item?.description || null,
    includedItemsText: item?.includedItems.join('\n') || '',
    priceVnd: item?.priceVnd ?? 0,
    isAvailable: item?.isAvailable ?? true,
  };
}

function itemLines(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function equipmentRequest(values: EquipmentFormValues): CreateAcademyWorkshopEquipmentPackageRequest {
  return {
    name: values.name.trim(),
    description: values.description?.trim() || null,
    includedItems: itemLines(values.includedItemsText),
    priceVnd: Math.max(0, Math.round(Number(values.priceVnd) || 0)),
    isAvailable: Boolean(values.isAvailable),
  };
}

function sortEquipment(items: AcademyWorkshopEquipmentPackage[]) {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id);
}

function formatVnd(value: number) {
  return `${Math.max(0, Math.round(Number(value) || 0)).toLocaleString('vi-VN')} đ`;
}

function imageFormValues(item?: AcademyWorkshopEquipmentPackageImage): ImageFormValues {
  return { imageUrl: item?.imageUrl || '', altText: item?.altText || null };
}

function imageRequest(values: ImageFormValues): CreateAcademyWorkshopEquipmentPackageImageRequest {
  return { imageUrl: values.imageUrl.trim(), altText: values.altText?.trim() || null };
}

function sortImages(images: AcademyWorkshopEquipmentPackageImage[]) {
  return [...images].sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id);
}

export default function AcademyWorkshopEquipmentManager({
  workshop,
  canEdit,
  onUpdated,
}: {
  workshop: AcademyWorkshopDetail;
  canEdit: boolean;
  onUpdated: (workshop: AcademyWorkshopDetail) => void;
}) {
  const { token } = theme.useToken();
  const [form] = Form.useForm<EquipmentFormValues>();
  const [imageForm] = Form.useForm<ImageFormValues>();
  const [editingItem, setEditingItem] = React.useState<AcademyWorkshopEquipmentPackage | null>(null);
  const [imageTarget, setImageTarget] = React.useState<{
    equipmentPackage: AcademyWorkshopEquipmentPackage;
    image: AcademyWorkshopEquipmentPackageImage | null;
  } | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [imageEditorOpen, setImageEditorOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const openCreate = React.useCallback(() => {
    setEditingItem(null);
    form.setFieldsValue(equipmentFormValues());
    setEditorOpen(true);
  }, [form]);

  const openEdit = React.useCallback(
    (item: AcademyWorkshopEquipmentPackage) => {
      setEditingItem(item);
      form.setFieldsValue(equipmentFormValues(item));
      setEditorOpen(true);
    },
    [form]
  );

  const closeEditor = React.useCallback(() => {
    setEditorOpen(false);
    setEditingItem(null);
    form.resetFields();
  }, [form]);

  const openCreateImage = React.useCallback(
    (equipmentPackage: AcademyWorkshopEquipmentPackage) => {
      setImageTarget({ equipmentPackage, image: null });
      imageForm.setFieldsValue(imageFormValues());
      setImageEditorOpen(true);
    },
    [imageForm]
  );

  const openEditImage = React.useCallback(
    (equipmentPackage: AcademyWorkshopEquipmentPackage, image: AcademyWorkshopEquipmentPackageImage) => {
      setImageTarget({ equipmentPackage, image });
      imageForm.setFieldsValue(imageFormValues(image));
      setImageEditorOpen(true);
    },
    [imageForm]
  );

  const closeImageEditor = React.useCallback(() => {
    setImageEditorOpen(false);
    setImageTarget(null);
    imageForm.resetFields();
  }, [imageForm]);

  const saveItem = React.useCallback(
    async (values: EquipmentFormValues) => {
      setSaving(true);
      try {
        const request = equipmentRequest(values);
        const item = editingItem
          ? await apiClient.academySales.workshops.updateEquipmentPackage(workshop.id, editingItem.id, request)
          : await apiClient.academySales.workshops.createEquipmentPackage(workshop.id, request);
        const equipmentPackages = editingItem
          ? workshop.equipmentPackages.map((current) => (current.id === item.id ? item : current))
          : [...workshop.equipmentPackages, item];
        onUpdated({ ...workshop, equipmentPackages: sortEquipment(equipmentPackages) });
        closeEditor();
        message.success(editingItem ? 'Đã cập nhật bộ dụng cụ.' : 'Đã thêm bộ dụng cụ.');
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể lưu bộ dụng cụ.');
      } finally {
        setSaving(false);
      }
    },
    [closeEditor, editingItem, onUpdated, workshop]
  );

  const deleteItem = React.useCallback(
    async (item: AcademyWorkshopEquipmentPackage) => {
      setSaving(true);
      try {
        await apiClient.academySales.workshops.deleteEquipmentPackage(workshop.id, item.id);
        onUpdated({
          ...workshop,
          equipmentPackages: workshop.equipmentPackages.filter((current) => current.id !== item.id),
        });
        message.success('Đã xóa bộ dụng cụ. Lựa chọn và giá đã chốt của học viên vẫn được giữ để đối soát.');
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể xóa bộ dụng cụ.');
      } finally {
        setSaving(false);
      }
    },
    [onUpdated, workshop]
  );

  const saveImage = React.useCallback(
    async (values: ImageFormValues) => {
      if (!imageTarget) return;
      setSaving(true);
      try {
        const request = imageRequest(values);
        const image = imageTarget.image
          ? await apiClient.academySales.workshops.updateEquipmentPackageImage(
              workshop.id,
              imageTarget.equipmentPackage.id,
              imageTarget.image.id,
              request
            )
          : await apiClient.academySales.workshops.createEquipmentPackageImage(
              workshop.id,
              imageTarget.equipmentPackage.id,
              request
            );
        onUpdated({
          ...workshop,
          equipmentPackages: workshop.equipmentPackages.map((equipmentPackage) =>
            equipmentPackage.id !== imageTarget.equipmentPackage.id
              ? equipmentPackage
              : {
                  ...equipmentPackage,
                  images: sortImages(
                    imageTarget.image
                      ? equipmentPackage.images.map((current) => (current.id === image.id ? image : current))
                      : [...equipmentPackage.images, image]
                  ),
                }
          ),
        });
        closeImageEditor();
        message.success(imageTarget.image ? 'Đã cập nhật ảnh bộ dụng cụ.' : 'Đã thêm ảnh bộ dụng cụ.');
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể lưu ảnh bộ dụng cụ.');
      } finally {
        setSaving(false);
      }
    },
    [closeImageEditor, imageTarget, onUpdated, workshop]
  );

  const deleteImage = React.useCallback(
    async (equipmentPackage: AcademyWorkshopEquipmentPackage, image: AcademyWorkshopEquipmentPackageImage) => {
      setSaving(true);
      try {
        await apiClient.academySales.workshops.deleteEquipmentPackageImage(workshop.id, equipmentPackage.id, image.id);
        onUpdated({
          ...workshop,
          equipmentPackages: workshop.equipmentPackages.map((current) =>
            current.id === equipmentPackage.id
              ? { ...current, images: current.images.filter((candidate) => candidate.id !== image.id) }
              : current
          ),
        });
        message.success('Đã xóa ảnh bộ dụng cụ.');
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể xóa ảnh bộ dụng cụ.');
      } finally {
        setSaving(false);
      }
    },
    [onUpdated, workshop]
  );

  return (
    <DataSection
      title={
        <IconText
          icon={
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: token.colorPrimaryBg, color: token.colorPrimary }}
            >
              <AppIcon icon={PackageCheck} size="sm" />
            </span>
          }
        >
          Bộ dụng cụ thực hành
        </IconText>
      }
      extra={
        canEdit ? (
          <Button type="primary" loading={saving} onClick={openCreate}>
            <IconText icon={<AppIcon icon={Plus} />}>Thêm bộ dụng cụ</IconText>
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <Alert
          type="info"
          showIcon
          message="Học viên chọn đúng một bộ dụng cụ khi đăng ký"
          description="Tên gói, danh sách dụng cụ và phụ thu được chốt cùng đơn đăng ký. Bạn có thể chỉnh sửa hoặc ẩn từng gói trước khi gửi link public."
        />
        {workshop.equipmentPackages.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {sortEquipment(workshop.equipmentPackages).map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border p-4"
                style={{ borderColor: token.colorBorderSecondary, opacity: item.isAvailable ? 1 : 0.58 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="m-0 text-base font-extrabold">{item.name}</h3>
                      {!item.isAvailable ? <StatusTag status="default" label="Tạm ẩn" /> : null}
                    </div>
                    {item.description ? (
                      <p className="mb-0 mt-1 text-sm leading-6 opacity-70">{item.description}</p>
                    ) : null}
                  </div>
                  {canEdit ? (
                    <div className="flex shrink-0 gap-1">
                      <IconButton label={`Sửa ${item.name}`} icon={PencilLine} onClick={() => openEdit(item)} />
                      <Popconfirm
                        title={`Xóa “${item.name}”?`}
                        description="Học viên sẽ không thể chọn gói này nữa. Đơn đã đăng ký vẫn giữ nguyên giá đã chốt."
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => void deleteItem(item)}
                      >
                        <IconButton tone="danger" label={`Xóa ${item.name}`} icon={Trash2} disabled={saving} />
                      </Popconfirm>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 border-t pt-3" style={{ borderColor: token.colorBorderSecondary }}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-wide opacity-55">Thư viện ảnh</span>
                    {canEdit ? (
                      <Button type="link" size="small" className="!px-0" onClick={() => openCreateImage(item)}>
                        <IconText icon={<AppIcon icon={Plus} size="sm" />}>Thêm ảnh</IconText>
                      </Button>
                    ) : null}
                  </div>
                  {item.images.length ? (
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {sortImages(item.images).map((image) => (
                        <figure
                          key={image.id}
                          className="group relative m-0 aspect-square overflow-hidden rounded-xl bg-slate-100"
                        >
                          <img
                            src={image.imageUrl}
                            alt={image.altText || item.name}
                            className="h-full w-full object-cover"
                          />
                          {canEdit ? (
                            <div className="absolute inset-x-1.5 bottom-1.5 flex justify-end gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                              <IconButton
                                label={`Sửa ảnh ${item.name}`}
                                icon={PencilLine}
                                onClick={() => openEditImage(item, image)}
                              />
                              <Popconfirm
                                title="Xóa ảnh này?"
                                description="Ảnh sẽ không còn hiển thị cho học viên."
                                okText="Xóa"
                                cancelText="Hủy"
                                okButtonProps={{ danger: true }}
                                onConfirm={() => void deleteImage(item, image)}
                              >
                                <IconButton
                                  tone="danger"
                                  label={`Xóa ảnh ${item.name}`}
                                  icon={Trash2}
                                  disabled={saving}
                                />
                              </Popconfirm>
                            </div>
                          ) : null}
                        </figure>
                      ))}
                    </div>
                  ) : (
                    <p className="mb-0 mt-2 text-sm opacity-55">
                      Chưa có ảnh. Thêm ảnh để học viên xem gallery trước khi chọn.
                    </p>
                  )}
                </div>

                <div
                  className="mt-4 flex items-center justify-between gap-3 border-t pt-3"
                  style={{ borderColor: token.colorBorderSecondary }}
                >
                  <span className="text-xs font-bold uppercase tracking-wide opacity-55">Phụ thu dụng cụ</span>
                  <span className="tabular-nums text-lg font-extrabold" style={{ color: token.colorPrimary }}>
                    {formatVnd(item.priceVnd)}
                  </span>
                </div>
                <ul className="mb-0 mt-3 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
                  {item.includedItems.map((includedItem) => (
                    <li key={includedItem} className="flex min-w-0 items-start gap-2 text-sm leading-5">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: token.colorPrimary }}
                        aria-hidden="true"
                      />
                      <span>{includedItem}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        ) : (
          <StatePanel
            kind="empty"
            surface={false}
            title="Chưa có bộ dụng cụ"
            description="Thêm các lựa chọn để học viên chọn một bộ trước phần thực hành có hướng dẫn."
            extra={canEdit ? <Button onClick={openCreate}>Thêm bộ đầu tiên</Button> : undefined}
          />
        )}
      </div>

      <EntityFormDrawer
        open={editorOpen}
        title={editingItem ? 'Chỉnh sửa bộ dụng cụ' : 'Thêm bộ dụng cụ'}
        onClose={closeEditor}
        destroyOnHidden
        footer={
          <Space className="w-full justify-end" wrap>
            <Button onClick={closeEditor} disabled={saving}>
              Hủy
            </Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}>
              <IconText icon={<AppIcon icon={Save} />}>Lưu bộ dụng cụ</IconText>
            </Button>
          </Space>
        }
      >
        <EntityForm<EquipmentFormValues> form={form} columns={1} onFinish={saveItem} disabled={saving}>
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
        </EntityForm>
      </EntityFormDrawer>

      <EntityFormDrawer
        open={imageEditorOpen}
        title={imageTarget?.image ? 'Chỉnh sửa ảnh bộ dụng cụ' : 'Thêm ảnh bộ dụng cụ'}
        onClose={closeImageEditor}
        destroyOnHidden
        footer={
          <Space className="w-full justify-end" wrap>
            <Button onClick={closeImageEditor} disabled={saving}>
              Hủy
            </Button>
            <Button type="primary" loading={saving} onClick={() => imageForm.submit()}>
              <IconText icon={<AppIcon icon={Save} />}>Lưu ảnh</IconText>
            </Button>
          </Space>
        }
      >
        <EntityForm<ImageFormValues> form={imageForm} columns={1} onFinish={saveImage} disabled={saving}>
          <EntityFormField
            name="imageUrl"
            label="Ảnh bộ dụng cụ"
            extra="Ảnh được tải lên Academy Media. Học viên có thể vuốt hoặc bấm để xem gallery."
            rules={[{ required: true, message: 'Tải lên một ảnh bộ dụng cụ.' }]}
          >
            <AcademyWorkshopServerImageUpload workshopId={workshop.id} area="equipment" disabled={saving} />
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
    </DataSection>
  );
}
