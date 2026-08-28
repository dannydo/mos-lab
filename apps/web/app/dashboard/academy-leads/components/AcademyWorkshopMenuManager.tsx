'use client';

import React from 'react';
import { Alert, Button, Checkbox, Form, Input, Popconfirm, Select, Space, message, theme } from 'antd';
import { PencilLine, Plus, Save, Trash2, UtensilsCrossed } from 'lucide-react';
import {
  ACADEMY_WORKSHOP_MENU_CATEGORIES,
  ACADEMY_WORKSHOP_MENU_CATEGORY_LABELS,
  type AcademyWorkshopDetail,
  type AcademyWorkshopMenuCategory,
  type AcademyWorkshopMenuItem,
  type CreateAcademyWorkshopMenuItemRequest,
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

type MenuFormValues = CreateAcademyWorkshopMenuItemRequest;

function menuFormValues(item?: AcademyWorkshopMenuItem): MenuFormValues {
  return {
    category: item?.category || 'JUICE',
    name: item?.name || '',
    description: item?.description || null,
    imageUrl: item?.imageUrl || '',
    isAvailable: item?.isAvailable ?? true,
  };
}

function menuItemRequest(values: MenuFormValues): CreateAcademyWorkshopMenuItemRequest {
  return {
    category: values.category,
    name: values.name.trim(),
    description: values.description?.trim() || null,
    imageUrl: values.imageUrl.trim(),
    isAvailable: Boolean(values.isAvailable),
  };
}

function sortMenu(items: AcademyWorkshopMenuItem[]) {
  return [...items].sort((left, right) => {
    const categoryDelta =
      ACADEMY_WORKSHOP_MENU_CATEGORIES.indexOf(left.category) -
      ACADEMY_WORKSHOP_MENU_CATEGORIES.indexOf(right.category);
    return categoryDelta || left.sortOrder - right.sortOrder || left.id - right.id;
  });
}

export default function AcademyWorkshopMenuManager({
  workshop,
  canEdit,
  onUpdated,
}: {
  workshop: AcademyWorkshopDetail;
  canEdit: boolean;
  onUpdated: (workshop: AcademyWorkshopDetail) => void;
}) {
  const { token } = theme.useToken();
  const [form] = Form.useForm<MenuFormValues>();
  const [editingItem, setEditingItem] = React.useState<AcademyWorkshopMenuItem | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const openCreate = React.useCallback(() => {
    setEditingItem(null);
    form.setFieldsValue(menuFormValues());
    setEditorOpen(true);
  }, [form]);

  const openEdit = React.useCallback(
    (item: AcademyWorkshopMenuItem) => {
      setEditingItem(item);
      form.setFieldsValue(menuFormValues(item));
      setEditorOpen(true);
    },
    [form]
  );

  const closeEditor = React.useCallback(() => {
    if (saving) return;
    setEditorOpen(false);
    setEditingItem(null);
    form.resetFields();
  }, [form, saving]);

  const saveItem = React.useCallback(
    async (values: MenuFormValues) => {
      setSaving(true);
      try {
        const request = menuItemRequest(values);
        const item = editingItem
          ? await apiClient.academySales.workshops.updateMenuItem(workshop.id, editingItem.id, request)
          : await apiClient.academySales.workshops.createMenuItem(workshop.id, request);
        const menuItems = editingItem
          ? workshop.menuItems.map((current) => (current.id === item.id ? item : current))
          : [...workshop.menuItems, item];
        onUpdated({ ...workshop, menuItems: sortMenu(menuItems) });
        closeEditor();
        message.success(editingItem ? 'Đã cập nhật món trong thực đơn.' : 'Đã thêm món vào thực đơn.');
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể lưu món ăn.');
      } finally {
        setSaving(false);
      }
    },
    [closeEditor, editingItem, onUpdated, workshop]
  );

  const deleteItem = React.useCallback(
    async (item: AcademyWorkshopMenuItem) => {
      setSaving(true);
      try {
        await apiClient.academySales.workshops.deleteMenuItem(workshop.id, item.id);
        onUpdated({ ...workshop, menuItems: workshop.menuItems.filter((current) => current.id !== item.id) });
        message.success('Đã xóa món khỏi thực đơn. Lựa chọn đã lưu của học viên vẫn được giữ để đối soát.');
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể xóa món ăn.');
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
              <AppIcon icon={UtensilsCrossed} size="sm" />
            </span>
          }
        >
          Thực đơn Việt Thái
        </IconText>
      }
      extra={
        canEdit ? (
          <Button type="primary" loading={saving} onClick={openCreate}>
            <IconText icon={<AppIcon icon={Plus} />}>Thêm món</IconText>
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <Alert
          type="info"
          showIcon
          message="Học viên chọn một món ở mỗi nhóm khi đăng ký"
          description="Lựa chọn được lưu theo từng học viên trong tab Roster để Academy tổng hợp và gửi nhà hàng Việt Thái."
        />
        {workshop.menuItems.length ? (
          <div className="grid gap-4 xl:grid-cols-3">
            {ACADEMY_WORKSHOP_MENU_CATEGORIES.map((category) => {
              const items = workshop.menuItems.filter((item) => item.category === category);
              return (
                <section
                  key={category}
                  className="rounded-2xl border p-4"
                  style={{ borderColor: token.colorBorderSecondary }}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="m-0 text-sm font-extrabold">{ACADEMY_WORKSHOP_MENU_CATEGORY_LABELS[category]}</h3>
                    <span className="tabular-nums text-xs opacity-55">{items.length} món</span>
                  </div>
                  {items.length ? (
                    <div className="space-y-2">
                      {items.map((item) => (
                        <article
                          key={item.id}
                          className="rounded-xl border px-3 py-2.5"
                          style={{ borderColor: token.colorBorderSecondary, opacity: item.isAvailable ? 1 : 0.58 }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 gap-2.5">
                              <img
                                src={item.imageUrl || undefined}
                                alt=""
                                className="h-12 w-12 shrink-0 rounded-lg object-cover"
                                aria-hidden="true"
                              />
                              <div className="min-w-0">
                                <div className="truncate text-sm font-bold">{item.name}</div>
                                {item.description ? (
                                  <p className="mb-0 mt-1 text-xs leading-5 opacity-65">{item.description}</p>
                                ) : null}
                              </div>
                            </div>
                            {canEdit ? (
                              <div className="flex shrink-0 gap-1">
                                <IconButton
                                  label={`Sửa ${item.name}`}
                                  icon={PencilLine}
                                  onClick={() => openEdit(item)}
                                />
                                <Popconfirm
                                  title={`Xóa “${item.name}”?`}
                                  description="Học viên sẽ không thể chọn món này nữa."
                                  okText="Xóa"
                                  cancelText="Hủy"
                                  okButtonProps={{ danger: true }}
                                  onConfirm={() => void deleteItem(item)}
                                >
                                  <IconButton
                                    tone="danger"
                                    label={`Xóa ${item.name}`}
                                    icon={Trash2}
                                    disabled={saving}
                                  />
                                </Popconfirm>
                              </div>
                            ) : null}
                          </div>
                          {!item.isAvailable ? <StatusTag className="mt-2" status="default" label="Tạm ẩn" /> : null}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="mb-0 text-sm opacity-55">Chưa có món trong nhóm này.</p>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <StatePanel
            kind="empty"
            surface={false}
            title="Chưa có thực đơn"
            description="Thêm nước ép, món chính và tráng miệng để học viên lựa chọn khi đăng ký."
            extra={canEdit ? <Button onClick={openCreate}>Thêm món đầu tiên</Button> : undefined}
          />
        )}
      </div>

      <EntityFormDrawer
        open={editorOpen}
        title={editingItem ? 'Chỉnh sửa món ăn' : 'Thêm món vào thực đơn'}
        onClose={closeEditor}
        destroyOnHidden
        footer={
          <Space className="w-full justify-end" wrap>
            <Button onClick={closeEditor} disabled={saving}>
              Hủy
            </Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}>
              <IconText icon={<AppIcon icon={Save} />}>Lưu món</IconText>
            </Button>
          </Space>
        }
      >
        <EntityForm<MenuFormValues> form={form} columns={1} onFinish={saveItem} disabled={saving}>
          <EntityFormField name="category" label="Nhóm món" rules={[{ required: true, message: 'Chọn nhóm món.' }]}>
            <Select<AcademyWorkshopMenuCategory>
              options={ACADEMY_WORKSHOP_MENU_CATEGORIES.map((category) => ({
                value: category,
                label: ACADEMY_WORKSHOP_MENU_CATEGORY_LABELS[category],
              }))}
            />
          </EntityFormField>
          <EntityFormField
            name="name"
            label="Tên món"
            rules={[
              { required: true, whitespace: true, message: 'Nhập tên món.' },
              { max: 180, message: 'Tên món tối đa 180 ký tự.' },
            ]}
          >
            <Input autoFocus placeholder="Ví dụ: Nước ép cam" />
          </EntityFormField>
          <EntityFormField
            name="imageUrl"
            label="Ảnh món"
            rules={[{ required: true, message: 'Mỗi món cần có ít nhất một ảnh.' }]}
          >
            <AcademyWorkshopServerImageUpload workshopId={workshop.id} area="menu" disabled={saving} />
          </EntityFormField>
          <EntityFormField name="description" label="Ghi chú (tùy chọn)">
            <Input.TextArea rows={3} maxLength={2000} placeholder="Ví dụ: Không đường, ít đá…" />
          </EntityFormField>
          <EntityFormField name="isAvailable" valuePropName="checked">
            <Checkbox>Đang phục vụ — hiển thị cho học viên chọn</Checkbox>
          </EntityFormField>
        </EntityForm>
      </EntityFormDrawer>
    </DataSection>
  );
}
