'use client';

import React from 'react';
import { Alert, Button, Checkbox, Form, Input, Popconfirm, Select, Space, message, theme } from 'antd';
import { LibraryBig, PencilLine, Plus, Save, Trash2, UtensilsCrossed, WandSparkles } from 'lucide-react';
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
import AcademyWorkshopMenuTemplateLibrary from './AcademyWorkshopMenuTemplateLibrary';
import AcademyWorkshopSelectionDeadline from './AcademyWorkshopSelectionDeadline';
import { useAcademyWorkshopMenuTemplates } from './useAcademyWorkshopMenuTemplates';
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
  const [templateLibraryOpen, setTemplateLibraryOpen] = React.useState(false);
  const [templateId, setTemplateId] = React.useState<number | null>(workshop.menuTemplate?.id || null);
  const [templateSaveRequestId, setTemplateSaveRequestId] = React.useState(0);
  const [templateSaving, setTemplateSaving] = React.useState(false);
  const [menuAgendaSaving, setMenuAgendaSaving] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const templates = useAcademyWorkshopMenuTemplates(true);

  React.useEffect(() => setTemplateId(workshop.menuTemplate?.id || null), [workshop.menuTemplate?.id]);

  const selectableTemplates = React.useMemo(() => {
    if (!workshop.menuTemplate || templates.data.some((template) => template.id === workshop.menuTemplate?.id)) {
      return templates.data;
    }
    return [workshop.menuTemplate, ...templates.data];
  }, [templates.data, workshop.menuTemplate]);
  const selectedTemplate = React.useMemo(
    () => selectableTemplates.find((template) => template.id === templateId) || workshop.menuTemplate,
    [selectableTemplates, templateId, workshop.menuTemplate]
  );
  const isCurrentTemplate = templateId === (workshop.menuTemplate?.id || null);
  const selectedTemplateCounts = React.useMemo(
    () =>
      Object.fromEntries(
        ACADEMY_WORKSHOP_MENU_CATEGORIES.map((category) => [
          category,
          selectedTemplate?.items.filter((item) => item.category === category).length || 0,
        ])
      ) as Record<AcademyWorkshopMenuCategory, number>,
    [selectedTemplate]
  );
  const menuAgendaItem = React.useMemo(
    () => workshop.agenda.find((item) => item.id === workshop.menuAgendaItemId) || null,
    [workshop.agenda, workshop.menuAgendaItemId]
  );

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

  const applyTemplate = React.useCallback(async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    try {
      const updated = await apiClient.academySales.workshops.applyMenuTemplate(workshop.id, selectedTemplate.id);
      onUpdated(updated);
      setTemplateId(selectedTemplate.id);
      message.success(`Đã áp dụng mẫu “${selectedTemplate.title}”.`);
    } catch (cause: any) {
      message.error(cause?.response?.data?.message || 'Không thể áp dụng mẫu thực đơn.');
    } finally {
      setSaving(false);
    }
  }, [onUpdated, selectedTemplate, workshop.id]);

  const saveAsNewTemplate = React.useCallback(() => {
    if (!workshop.menuItems.length) {
      message.warning('Thêm ít nhất một món trước khi lưu mẫu.');
      return;
    }
    setTemplateLibraryOpen(true);
    setTemplateSaveRequestId((current) => current + 1);
  }, [workshop.menuItems.length]);

  const updateCurrentTemplate = React.useCallback(async () => {
    if (!selectedTemplate || !isCurrentTemplate) return;
    setTemplateSaving(true);
    try {
      await templates.syncTemplateFromWorkshop(workshop.id, selectedTemplate.id);
      message.success(`Đã cập nhật “${selectedTemplate.title}” bằng thực đơn hiện tại.`);
    } catch (cause) {
      message.error(templates.mutationMessage(cause, 'Không thể cập nhật mẫu thực đơn.'));
    } finally {
      setTemplateSaving(false);
    }
  }, [isCurrentTemplate, selectedTemplate, templates.mutationMessage, templates.syncTemplateFromWorkshop, workshop.id]);

  const setMenuAgendaItem = React.useCallback(
    async (agendaItemId?: number) => {
      setMenuAgendaSaving(true);
      try {
        const updated = await apiClient.academySales.workshops.setMenuAgendaItem(workshop.id, {
          agendaItemId: agendaItemId || null,
        });
        onUpdated(updated);
        message.success(agendaItemId ? 'Đã gắn thực đơn với mục Agenda.' : 'Đã bỏ mốc phục vụ thực đơn khỏi Agenda.');
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể cập nhật mốc phục vụ thực đơn.');
      } finally {
        setMenuAgendaSaving(false);
      }
    },
    [onUpdated, workshop.id]
  );

  return (
    <>
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
            Thực đơn workshop
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
          <section
            className="academy-workshop-template-panel"
            style={{ borderColor: token.colorBorderSecondary }}
            aria-label="Chọn mẫu thực đơn cho workshop"
          >
            <div className="academy-workshop-template-panel__header">
              <div className="academy-workshop-template-panel__title">
                <h3 className="m-0 text-sm font-semibold">Mẫu thực đơn</h3>
                {isCurrentTemplate && selectedTemplate ? (
                  <StatusTag status="success" label="Đang áp dụng" className="!mb-0" />
                ) : null}
              </div>
              <Button type="text" size="small" onClick={() => setTemplateLibraryOpen(true)} disabled={saving}>
                <IconText icon={<AppIcon icon={LibraryBig} />}>Thư viện mẫu</IconText>
              </Button>
            </div>

            <div className="academy-workshop-template-panel__selection">
              <div className="academy-workshop-template-panel__field">
                <label className="sr-only" htmlFor="workshop-menu-template">
                  Chọn mẫu thực đơn
                </label>
                <Select
                  id="workshop-menu-template"
                  value={templateId || undefined}
                  className="w-full"
                  loading={templates.loading}
                  disabled={!canEdit || saving || templates.loading}
                  placeholder={templates.error ? 'Không thể tải mẫu thực đơn' : 'Chọn một mẫu thực đơn'}
                  options={selectableTemplates.map((template) => ({ value: template.id, label: template.title }))}
                  onChange={setTemplateId}
                />
              </div>
              <div className="academy-workshop-template-panel__action">
                {!canEdit && !selectedTemplate ? (
                  <span
                    className="academy-workshop-template-panel__action-hint"
                    style={{ color: token.colorTextSecondary }}
                  >
                    Chọn mẫu để tiếp tục
                  </span>
                ) : (
                  <Space wrap size={8}>
                    {canEdit && isCurrentTemplate && selectedTemplate ? (
                      <Popconfirm
                        title={`Cập nhật mẫu “${selectedTemplate.title}”?`}
                        description="Thực đơn hiện tại sẽ thay thế nội dung mẫu. Các workshop khác đã áp dụng mẫu vẫn giữ dữ liệu riêng."
                        okText="Cập nhật mẫu"
                        cancelText="Hủy"
                        okButtonProps={{ loading: templateSaving }}
                        onConfirm={() => void updateCurrentTemplate()}
                        disabled={saving || templateSaving}
                      >
                        <Button disabled={saving || templateSaving} loading={templateSaving}>
                          <IconText icon={<AppIcon icon={Save} />}>Cập nhật mẫu</IconText>
                        </Button>
                      </Popconfirm>
                    ) : null}
                    {canEdit && selectedTemplate && !isCurrentTemplate ? (
                      <Popconfirm
                        title="Áp dụng mẫu thực đơn này?"
                        description="Thực đơn hiện tại sẽ được thay bằng bản sao từ mẫu đã chọn. Lựa chọn đã lưu của học viên vẫn được giữ để đối soát."
                        okText="Áp dụng"
                        cancelText="Hủy"
                        onConfirm={() => void applyTemplate()}
                        disabled={saving || templateSaving}
                      >
                        <Button type="primary" disabled={saving || templateSaving} loading={saving}>
                          <IconText icon={<AppIcon icon={WandSparkles} />}>Áp dụng mẫu</IconText>
                        </Button>
                      </Popconfirm>
                    ) : null}
                    {canEdit ? (
                      <Button
                        onClick={saveAsNewTemplate}
                        disabled={!workshop.menuItems.length || saving || templateSaving}
                      >
                        <IconText icon={<AppIcon icon={Save} />}>Lưu mẫu mới</IconText>
                      </Button>
                    ) : null}
                  </Space>
                )}
              </div>
            </div>

            <div
              className="academy-workshop-template-panel__details"
              style={{ color: templates.error ? token.colorError : token.colorTextSecondary }}
              role={templates.error ? 'alert' : undefined}
            >
              <span>
                {templates.error ||
                  selectedTemplate?.description ||
                  'Chọn một mẫu từ thư viện để áp dụng cho workshop.'}
              </span>
              {selectedTemplate ? (
                <span className="academy-workshop-template-panel__metadata tabular-nums">
                  {ACADEMY_WORKSHOP_MENU_CATEGORIES.map((category) => (
                    <IconText key={category} icon={<AppIcon icon={UtensilsCrossed} size="sm" />} tabular>
                      {ACADEMY_WORKSHOP_MENU_CATEGORY_LABELS[category]}: {selectedTemplateCounts[category]}
                    </IconText>
                  ))}
                </span>
              ) : null}
            </div>
          </section>
          <AcademyWorkshopSelectionDeadline
            workshop={workshop}
            canEdit={canEdit}
            onUpdated={onUpdated}
            selectionType="menu"
          />
          <section
            className="rounded-xl border p-3"
            style={{ borderColor: token.colorBorderSecondary, background: token.colorFillQuaternary }}
            aria-label="Mốc phục vụ thực đơn trong Agenda"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="m-0 text-sm font-semibold">Phục vụ tại Agenda</h3>
                <p className="mb-0 mt-1 text-xs leading-5 opacity-65">
                  Chọn mục Agenda nơi Host phục vụ thực đơn. Bạn cũng có thể gắn trực tiếp từ từng hàng Agenda.
                </p>
              </div>
              {menuAgendaItem ? <StatusTag status="processing" label={menuAgendaItem.title} className="!mb-0" /> : null}
            </div>
            {workshop.agenda.length ? (
              <div className="mt-3 max-w-xl">
                <label className="sr-only" htmlFor="workshop-menu-agenda-item">
                  Chọn mục Agenda phục vụ thực đơn
                </label>
                <Select
                  id="workshop-menu-agenda-item"
                  className="w-full"
                  allowClear
                  value={workshop.menuAgendaItemId || undefined}
                  placeholder="Chọn mục Agenda để phục vụ thực đơn"
                  disabled={!canEdit || saving || templateSaving || menuAgendaSaving}
                  options={workshop.agenda.map((item) => ({
                    value: item.id,
                    label: `${item.sortOrder}. ${item.title} · ${Math.round(item.plannedDurationSeconds / 60)} phút`,
                  }))}
                  onChange={(agendaItemId) => void setMenuAgendaItem(agendaItemId)}
                />
              </div>
            ) : (
              <Alert
                className="mt-3"
                type="warning"
                showIcon
                message="Chưa có mục Agenda"
                description="Thêm mục Agenda trước, rồi chọn mốc phục vụ thực đơn tại đây hoặc gắn trực tiếp trên từng mục."
              />
            )}
          </section>
          <Alert
            type="info"
            showIcon
            message="Học viên chọn một món ở mỗi nhóm khi đăng ký"
            description="Lựa chọn được lưu theo từng học viên trong tab Roster để Academy tổng hợp và gửi đúng nhà hàng phục vụ workshop."
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
      <AcademyWorkshopMenuTemplateLibrary
        open={templateLibraryOpen}
        workshop={workshop}
        canEdit={canEdit}
        saveRequestId={templateSaveRequestId}
        onClose={() => setTemplateLibraryOpen(false)}
        onApplied={onUpdated}
      />
    </>
  );
}
