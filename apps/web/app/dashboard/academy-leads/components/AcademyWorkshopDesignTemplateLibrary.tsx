'use client';

import React from 'react';
import { Alert, Button, Form, Input, Pagination, Popconfirm, Space, message, theme } from 'antd';
import { ArchiveRestore, Images, LibraryBig, PencilLine, Save, Sparkles, Trash2 } from 'lucide-react';
import {
  type AcademyWorkshopDetail,
  type AcademyWorkshopDesignTemplate,
  type SaveAcademyWorkshopDesignTemplateRequest,
  type UpdateAcademyWorkshopDesignTemplateRequest,
  type AcademyWorkshopDesignDifficultyLevel,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import {
  AdaptiveDrawer,
  AppIcon,
  EntityForm,
  EntityFormDrawer,
  EntityFormField,
  IconButton,
  IconText,
  SearchField,
  StatePanel,
} from '../../../../components/ui';
import { useAcademyWorkshopDesignTemplates } from './useAcademyWorkshopDesignTemplates';
import { WorkshopImage, WorkshopImageGallery } from './AcademyWorkshopImageGallery';

type TemplateFormValues = SaveAcademyWorkshopDesignTemplateRequest;
type SaveTarget = 'new' | 'existing';

function templateFormValues(template: AcademyWorkshopDesignTemplate | null = null): TemplateFormValues {
  return { title: template?.title || '', description: template?.description || null };
}

function difficultyMeta(level: AcademyWorkshopDesignDifficultyLevel) {
  switch (level) {
    case 'BASIC':
      return { label: 'Cơ bản', stars: 1, className: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    case 'ADVANCED':
      return { label: 'Nâng cao', stars: 2, className: 'text-sky-600 bg-sky-50 border-sky-200' };
    case 'MASTER':
      return { label: 'Chuyên sâu', stars: 3, className: 'text-purple-600 bg-purple-50 border-purple-200' };
    default:
      return { label: 'Cơ bản', stars: 1, className: 'text-gray-600 bg-gray-50 border-gray-200' };
  }
}

function formatVnd(value: number) {
  return `${Math.max(0, Math.round(Number(value) || 0)).toLocaleString('vi-VN')} đ`;
}

function templateUpdateRequest(
  template: AcademyWorkshopDesignTemplate,
  values: TemplateFormValues
): UpdateAcademyWorkshopDesignTemplateRequest {
  return {
    title: values.title.trim(),
    description: values.description?.trim() || null,
    items: template.items.map((item) => ({
      name: item.name,
      description: item.description,
      difficultyLevel: item.difficultyLevel,
      priceVnd: Math.max(0, Math.round(item.priceVnd)),
      images: item.images.map((image) => ({ imageUrl: image.imageUrl, altText: image.altText })),
    })),
  };
}

function TemplatePreview({ template }: { template: AcademyWorkshopDesignTemplate }) {
  const images = template.items.flatMap((item) => item.images);
  const cover = images[0];
  if (!images.length) {
    return (
      <div className="flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
        <span className="flex flex-col items-center gap-2 text-center text-xs font-semibold">
          <AppIcon icon={Images} />
          Chưa có ảnh mẫu
        </span>
      </div>
    );
  }
  return (
    <div className="relative h-24 w-36 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900">
      <WorkshopImageGallery items={images.map((img) => img.imageUrl)}>
        <WorkshopImage
          src={cover.imageUrl}
          alt={cover.altText || template.title}
          className="h-full w-full object-cover"
          wrapperClassName="!h-full !w-full"
        />
      </WorkshopImageGallery>
      {images.length > 1 ? (
        <span className="pointer-events-none absolute bottom-1.5 right-1.5 z-1 rounded-md bg-white/90 px-1.5 py-0.5 text-xs font-extrabold text-slate-800 shadow-xs dark:bg-slate-800/90 dark:text-slate-200">
          +{images.length - 1}
        </span>
      ) : null}
    </div>
  );
}

export default function AcademyWorkshopDesignTemplateLibrary({
  open,
  workshop,
  canEdit,
  saveRequestId = 0,
  onClose,
  onApplied,
  onWorkshopUpdated,
}: {
  open: boolean;
  workshop: AcademyWorkshopDetail;
  canEdit: boolean;
  saveRequestId?: number;
  onClose: () => void;
  onApplied?: (workshop: AcademyWorkshopDetail) => void;
  onWorkshopUpdated?: (workshop: AcademyWorkshopDetail) => void;
}) {
  const { token } = theme.useToken();
  const [form] = Form.useForm<TemplateFormValues>();
  const [saveForm] = Form.useForm<TemplateFormValues>();
  const [editingTemplate, setEditingTemplate] = React.useState<AcademyWorkshopDesignTemplate | null>(null);
  const [saveDrawerOpen, setSaveDrawerOpen] = React.useState(false);
  const [saveTarget, setSaveTarget] = React.useState<SaveTarget>('new');
  const [selectedOverwriteTemplateId, setSelectedOverwriteTemplateId] = React.useState<number | null>(
    workshop.designTemplate?.id || null
  );
  const [saving, setSaving] = React.useState(false);
  const [applyingTemplateId, setApplyingTemplateId] = React.useState<number | null>(null);
  const [refreshingTemplateId, setRefreshingTemplateId] = React.useState<number | null>(null);
  const templates = useAcademyWorkshopDesignTemplates(open);

  React.useEffect(() => {
    if (saveRequestId > 0) {
      setSaveTarget(workshop.designTemplate ? 'existing' : 'new');
      setSelectedOverwriteTemplateId(workshop.designTemplate?.id || null);
      saveForm.setFieldsValue(templateFormValues(workshop.designTemplate));
      setSaveDrawerOpen(true);
    }
  }, [saveForm, saveRequestId, workshop.designTemplate]);

  const openEdit = React.useCallback(
    (template: AcademyWorkshopDesignTemplate) => {
      setEditingTemplate(template);
      form.setFieldsValue(templateFormValues(template));
    },
    [form]
  );

  const closeEdit = React.useCallback(() => {
    setEditingTemplate(null);
    form.resetFields();
  }, [form]);

  const closeSaveDrawer = React.useCallback(() => {
    setSaveDrawerOpen(false);
    saveForm.resetFields();
  }, [saveForm]);

  const saveEdit = React.useCallback(
    async (values: TemplateFormValues) => {
      if (!editingTemplate) return;
      setSaving(true);
      try {
        await templates.updateTemplate(editingTemplate.id, templateUpdateRequest(editingTemplate, values));
        message.success('Đã cập nhật mẫu thiết kế mi.');
        closeEdit();
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể cập nhật mẫu thiết kế mi.');
      } finally {
        setSaving(false);
      }
    },
    [closeEdit, editingTemplate, templates]
  );

  const deleteTemplate = React.useCallback(
    async (template: AcademyWorkshopDesignTemplate) => {
      setSaving(true);
      try {
        await templates.deleteTemplate(template.id);
        message.success('Đã xóa mẫu thiết kế mi.');
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể xóa mẫu thiết kế mi.');
      } finally {
        setSaving(false);
      }
    },
    [templates]
  );

  const applyTemplate = React.useCallback(
    async (template: AcademyWorkshopDesignTemplate) => {
      setApplyingTemplateId(template.id);
      try {
        const updated = await apiClient.academySales.workshops.applyDesignTemplate(workshop.id, template.id);
        onApplied?.(updated);
        message.success(`Đã áp dụng bộ sưu tập "${template.title}" vào workshop.`);
        onClose();
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể áp dụng bộ sưu tập mẫu mi.');
      } finally {
        setApplyingTemplateId(null);
      }
    },
    [onApplied, onClose, workshop.id]
  );

  const refreshTemplate = React.useCallback(
    async (template: AcademyWorkshopDesignTemplate) => {
      setRefreshingTemplateId(template.id);
      try {
        const refreshed = await apiClient.academySales.workshops.refreshDesignTemplateFromWorkshop(
          workshop.id,
          template.id
        );
        await templates.refresh();
        if (workshop.designTemplate?.id === template.id) {
          onWorkshopUpdated?.({ ...workshop, designTemplate: refreshed });
        }
        message.success(`Đã cập nhật nội dung cho mẫu "${template.title}".`);
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể cập nhật mẫu từ workshop hiện tại.');
      } finally {
        setRefreshingTemplateId(null);
      }
    },
    [onWorkshopUpdated, templates, workshop]
  );

  const submitSaveFromWorkshop = React.useCallback(
    async (values: TemplateFormValues) => {
      setSaving(true);
      try {
        if (saveTarget === 'existing' && selectedOverwriteTemplateId) {
          const refreshed = await apiClient.academySales.workshops.refreshDesignTemplateFromWorkshop(
            workshop.id,
            selectedOverwriteTemplateId
          );
          await templates.refresh();
          onWorkshopUpdated?.({ ...workshop, designTemplate: refreshed });
          message.success('Đã lưu đè nội dung mẫu thiết kế mi.');
        } else {
          const created = await apiClient.academySales.workshops.saveDesignAsTemplate(workshop.id, {
            title: values.title.trim(),
            description: values.description?.trim() || null,
          });
          await templates.refresh();
          onWorkshopUpdated?.({ ...workshop, designTemplate: created });
          message.success('Đã lưu mẫu thiết kế mi thành bộ sưu tập mới.');
        }
        closeSaveDrawer();
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể lưu mẫu thiết kế mi.');
      } finally {
        setSaving(false);
      }
    },
    [closeSaveDrawer, onWorkshopUpdated, saveTarget, selectedOverwriteTemplateId, templates, workshop]
  );

  return (
    <>
      <AdaptiveDrawer
        open={open}
        onClose={onClose}
        title={
          <div className="flex items-center gap-2">
            <AppIcon icon={LibraryBig} className="text-pink-500" />
            <span>Thư Viện Mẫu Thiết Kế Mi</span>
          </div>
        }
        width={780}
        extra={
          canEdit && workshop.designs?.length ? (
            <Button
              type="primary"
              icon={<AppIcon icon={Save} />}
              onClick={() => {
                setSaveTarget('new');
                saveForm.setFieldsValue({ title: '', description: null });
                setSaveDrawerOpen(true);
              }}
            >
              Lưu từ workshop hiện tại
            </Button>
          ) : null
        }
      >
        <div className="space-y-4">
          <SearchField
            placeholder="Tìm kiếm mẫu thiết kế mi theo tên..."
            value={templates.search}
            onChange={(e) => templates.setSearch(e.target.value)}
            className="w-full"
          />

          {templates.error ? <Alert type="error" showIcon message={templates.error} /> : null}

          {templates.data.length === 0 && !templates.loading ? (
            <StatePanel
              kind="empty"
              title="Chưa có mẫu thiết kế mi nào"
              description="Hãy lưu các mẫu thiết kế mi từ workshop hiện tại hoặc tạo mẫu mới trong thư viện."
            />
          ) : null}

          <div className="space-y-4">
            {templates.data.map((tpl) => {
              const isCurrent = workshop.designTemplate?.id === tpl.id;
              return (
                <div
                  key={tpl.id}
                  className={`rounded-2xl border bg-white p-5 transition-all shadow-sm dark:bg-gray-900 ${
                    isCurrent ? 'border-pink-500 ring-2 ring-pink-500/20' : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-4">
                      <TemplatePreview template={tpl} />
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-base text-gray-900 dark:text-gray-100 m-0">{tpl.title}</h4>
                          {isCurrent ? (
                            <span className="rounded-full bg-pink-100 px-2.5 py-0.5 text-xs font-bold text-pink-700 dark:bg-pink-950/60 dark:text-pink-300">
                              Đang áp dụng
                            </span>
                          ) : null}
                        </div>
                        {tpl.description ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 m-0">{tpl.description}</p>
                        ) : null}
                        <div className="text-xs text-gray-400">
                          {tpl.items.length} mẫu thiết kế mi · Cập nhật{' '}
                          {new Date(tpl.updatedAt).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                      {canEdit ? (
                        <>
                          <Button
                            size="small"
                            type="primary"
                            icon={<AppIcon icon={Sparkles} />}
                            loading={applyingTemplateId === tpl.id}
                            onClick={() => applyTemplate(tpl)}
                          >
                            Áp dụng
                          </Button>
                          {workshop.designs?.length ? (
                            <Popconfirm
                              title="Cập nhật mẫu từ workshop hiện tại?"
                              description="Nội dung của bộ mẫu này trong thư viện sẽ được thay thế bằng danh sách mẫu mi hiện tại của workshop."
                              onConfirm={() => refreshTemplate(tpl)}
                              okText="Cập nhật"
                              cancelText="Hủy"
                            >
                              <IconButton
                                icon={ArchiveRestore}
                                label="Cập nhật lại từ workshop này"
                                disabled={refreshingTemplateId === tpl.id}
                              />
                            </Popconfirm>
                          ) : null}
                          <IconButton icon={PencilLine} label="Chỉnh sửa thông tin mẫu" onClick={() => openEdit(tpl)} />
                          <Popconfirm
                            title="Xóa mẫu thiết kế mi này?"
                            description="Hành động này sẽ xóa mẫu khỏi thư viện. Các workshop đã áp dụng trước đó sẽ không bị ảnh hưởng."
                            onConfirm={() => deleteTemplate(tpl)}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                          >
                            <IconButton icon={Trash2} label="Xóa mẫu" tone="danger" />
                          </Popconfirm>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {tpl.items.length > 0 ? (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {tpl.items.map((item) => {
                          const meta = difficultyMeta(item.difficultyLevel);
                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs dark:bg-gray-800/60"
                            >
                              <div className="flex items-center gap-2 truncate pr-2">
                                <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                                  {item.name}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[10px] font-medium border ${meta.className}`}
                                >
                                  {'⭐'.repeat(meta.stars)} {meta.label}
                                </span>
                              </div>
                              {item.priceVnd > 0 ? (
                                <span className="shrink-0 font-medium text-amber-600 dark:text-amber-400">
                                  +{formatVnd(item.priceVnd)}
                                </span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {templates.total > templates.pageSize ? (
            <div className="flex justify-end pt-4">
              <Pagination
                current={templates.page}
                pageSize={templates.pageSize}
                total={templates.total}
                onChange={templates.setPagination}
                showSizeChanger
              />
            </div>
          ) : null}
        </div>
      </AdaptiveDrawer>

      {/* Edit template metadata drawer */}
      <EntityFormDrawer open={Boolean(editingTemplate)} title="Chỉnh sửa thông tin Mẫu thiết kế mi" onClose={closeEdit}>
        <EntityForm form={form} onFinish={saveEdit} layout="vertical">
          <EntityFormField
            name="title"
            label="Tên bộ mẫu thiết kế mi"
            rules={[{ required: true, message: 'Vui lòng nhập tên bộ mẫu' }]}
          >
            <Input placeholder="Ví dụ: Bộ sưu tập Mi Thiết Kế Xu Hướng Mùa Hè" maxLength={180} />
          </EntityFormField>
          <EntityFormField name="description" label="Mô tả">
            <Input.TextArea
              rows={3}
              placeholder="Mô tả phong cách, kỹ thuật hoặc ghi chú cho bộ mẫu..."
              maxLength={2000}
            />
          </EntityFormField>
          <div className="flex justify-end gap-2 pt-4">
            <Button onClick={closeEdit}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              Lưu thay đổi
            </Button>
          </div>
        </EntityForm>
      </EntityFormDrawer>

      {/* Save from workshop drawer */}
      <EntityFormDrawer open={saveDrawerOpen} title="Lưu mẫu thiết kế mi từ Workshop" onClose={closeSaveDrawer}>
        <EntityForm form={saveForm} onFinish={submitSaveFromWorkshop} layout="vertical">
          {workshop.designTemplate ? (
            <div className="mb-4 space-y-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Phương thức lưu</label>
              <div className="flex gap-2">
                <Button
                  type={saveTarget === 'existing' ? 'primary' : 'default'}
                  onClick={() => setSaveTarget('existing')}
                >
                  Cập nhật đè mẫu hiện tại
                </Button>
                <Button type={saveTarget === 'new' ? 'primary' : 'default'} onClick={() => setSaveTarget('new')}>
                  Tạo thành bộ sưu tập mới
                </Button>
              </div>
            </div>
          ) : null}

          {saveTarget === 'new' ? (
            <>
              <EntityFormField
                name="title"
                label="Tên bộ sưu tập mẫu mới"
                rules={[{ required: true, message: 'Vui lòng nhập tên bộ sưu tập' }]}
              >
                <Input placeholder="Ví dụ: Bộ sưu tập Mi Thiết Kế Xu Hướng 2026" maxLength={180} />
              </EntityFormField>
              <EntityFormField name="description" label="Mô tả">
                <Input.TextArea rows={3} placeholder="Mô tả chi tiết về bộ mẫu..." maxLength={2000} />
              </EntityFormField>
            </>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-400">
              Toàn bộ {workshop.designs?.length || 0} mẫu thiết kế mi hiện tại của workshop sẽ được ghi đè vào bộ sưu
              tập: <strong>{workshop.designTemplate?.title}</strong>.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button onClick={closeSaveDrawer}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              {saveTarget === 'existing' ? 'Xác nhận cập nhật đè' : 'Lưu bộ sưu tập mới'}
            </Button>
          </div>
        </EntityForm>
      </EntityFormDrawer>
    </>
  );
}
