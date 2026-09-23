'use client';

import React from 'react';
import { Alert, Button, Checkbox, Form, Input, InputNumber, Popconfirm, Select, Space, message, theme } from 'antd';
import { LibraryBig, PencilLine, Plus, Save, Sparkles, Trash2, WandSparkles, Eye } from 'lucide-react';
import {
  type AcademyWorkshopDetail,
  type AcademyWorkshopDesignItem,
  type AcademyWorkshopDesignItemImage,
  type AcademyWorkshopParticipant,
  type CreateAcademyWorkshopDesignItemRequest,
  type CreateAcademyWorkshopDesignItemImageRequest,
  type AcademyWorkshopDesignDifficultyLevel,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import AcademyWorkshopServerImageUpload from './AcademyWorkshopServerImageUpload';
import AcademyWorkshopDesignTemplateLibrary from './AcademyWorkshopDesignTemplateLibrary';
import AcademyWorkshopDesignPrepModal from './AcademyWorkshopDesignPrepModal';
import AcademyWorkshopSelectionDeadline from './AcademyWorkshopSelectionDeadline';
import AcademyWorkshopSectionTitle from './AcademyWorkshopSectionTitle';
import AcademyWorkshopTemplateBar from './AcademyWorkshopTemplateBar';
import { useAcademyWorkshopDesignTemplates } from './useAcademyWorkshopDesignTemplates';
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

type DesignFormValues = CreateAcademyWorkshopDesignItemRequest;
type ImageFormValues = CreateAcademyWorkshopDesignItemImageRequest;

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

function designFormValues(item?: AcademyWorkshopDesignItem): DesignFormValues {
  return {
    name: item?.name || '',
    description: item?.description || null,
    difficultyLevel: item?.difficultyLevel || 'BASIC',
    priceVnd: item?.priceVnd ?? 0,
    isAvailable: item?.isAvailable ?? true,
  };
}

function designRequest(values: DesignFormValues): CreateAcademyWorkshopDesignItemRequest {
  return {
    name: values.name.trim(),
    description: values.description?.trim() || null,
    difficultyLevel: values.difficultyLevel || 'BASIC',
    priceVnd: Math.max(0, Math.round(Number(values.priceVnd) || 0)),
    isAvailable: Boolean(values.isAvailable),
  };
}

function sortDesigns(items: AcademyWorkshopDesignItem[]) {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id);
}

function formatVnd(value: number) {
  return `${Math.max(0, Math.round(Number(value) || 0)).toLocaleString('vi-VN')} đ`;
}

function imageFormValues(item?: AcademyWorkshopDesignItemImage): ImageFormValues {
  return { imageUrl: item?.imageUrl || '', altText: item?.altText || null };
}

function imageRequest(values: ImageFormValues): CreateAcademyWorkshopDesignItemImageRequest {
  return { imageUrl: values.imageUrl.trim(), altText: values.altText?.trim() || null };
}

function sortImages(images: AcademyWorkshopDesignItemImage[]) {
  return [...images].sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id);
}

export default function AcademyWorkshopDesignManager({
  workshop,
  participants,
  canEdit,
  onUpdated,
}: {
  workshop: AcademyWorkshopDetail;
  participants?: AcademyWorkshopParticipant[];
  canEdit: boolean;
  onUpdated: (workshop: AcademyWorkshopDetail) => void;
}) {
  const { token } = theme.useToken();
  const [form] = Form.useForm<DesignFormValues>();
  const [imageForm] = Form.useForm<ImageFormValues>();
  const [editingItem, setEditingItem] = React.useState<AcademyWorkshopDesignItem | null>(null);
  const [imageTarget, setImageTarget] = React.useState<{
    designItem: AcademyWorkshopDesignItem;
    image: AcademyWorkshopDesignItemImage | null;
  } | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [imageEditorOpen, setImageEditorOpen] = React.useState(false);
  const [prepModalOpen, setPrepModalOpen] = React.useState(false);
  const [templateLibraryOpen, setTemplateLibraryOpen] = React.useState(false);
  const [templateSaveRequestId, setTemplateSaveRequestId] = React.useState(0);
  const [templateId, setTemplateId] = React.useState<number | null>(workshop.designTemplate?.id || null);
  const [saving, setSaving] = React.useState(false);
  const [templateSaving, setTemplateSaving] = React.useState(false);
  const templates = useAcademyWorkshopDesignTemplates(true);

  React.useEffect(() => setTemplateId(workshop.designTemplate?.id || null), [workshop.designTemplate?.id]);

  const selectableTemplates = React.useMemo(() => {
    if (!workshop.designTemplate || templates.data.some((template) => template.id === workshop.designTemplate?.id)) {
      return templates.data;
    }
    return [workshop.designTemplate, ...templates.data];
  }, [templates.data, workshop.designTemplate]);

  const selectedTemplate = React.useMemo(
    () => selectableTemplates.find((template) => template.id === templateId) || workshop.designTemplate,
    [selectableTemplates, templateId, workshop.designTemplate]
  );
  const isCurrentTemplate = templateId === (workshop.designTemplate?.id || null);
  const selectedTemplateItemCount = React.useMemo(() => selectedTemplate?.items.length || 0, [selectedTemplate]);

  const linkedAgendaItem = React.useMemo(
    () => workshop.agenda?.find((item) => item.id === workshop.designAgendaItemId),
    [workshop.agenda, workshop.designAgendaItemId]
  );

  const openCreate = React.useCallback(() => {
    setEditingItem(null);
    form.setFieldsValue(designFormValues());
    setEditorOpen(true);
  }, [form]);

  const openEdit = React.useCallback(
    (item: AcademyWorkshopDesignItem) => {
      setEditingItem(item);
      form.setFieldsValue(designFormValues(item));
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
    (designItem: AcademyWorkshopDesignItem) => {
      setImageTarget({ designItem, image: null });
      imageForm.setFieldsValue(imageFormValues());
      setImageEditorOpen(true);
    },
    [imageForm]
  );

  const openEditImage = React.useCallback(
    (designItem: AcademyWorkshopDesignItem, image: AcademyWorkshopDesignItemImage) => {
      setImageTarget({ designItem, image });
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
    async (values: DesignFormValues) => {
      setSaving(true);
      try {
        const request = designRequest(values);
        const item = editingItem
          ? await apiClient.academySales.workshops.updateDesignItem(workshop.id, editingItem.id, request)
          : await apiClient.academySales.workshops.createDesignItem(workshop.id, request);
        const designs = editingItem
          ? (workshop.designs || []).map((current) => (current.id === item.id ? item : current))
          : [...(workshop.designs || []), item];
        onUpdated({ ...workshop, designs: sortDesigns(designs) });
        closeEditor();
        message.success(editingItem ? 'Đã cập nhật mẫu thiết kế mi.' : 'Đã thêm mẫu thiết kế mi.');
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể lưu mẫu thiết kế mi.');
      } finally {
        setSaving(false);
      }
    },
    [closeEditor, editingItem, onUpdated, workshop]
  );

  const deleteItem = React.useCallback(
    async (item: AcademyWorkshopDesignItem) => {
      setSaving(true);
      try {
        await apiClient.academySales.workshops.deleteDesignItem(workshop.id, item.id);
        onUpdated({
          ...workshop,
          designs: (workshop.designs || []).filter((current) => current.id !== item.id),
        });
        message.success('Đã xóa mẫu thiết kế mi. Lựa chọn của học viên vẫn được giữ để đối soát.');
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể xóa mẫu thiết kế mi.');
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
          ? await apiClient.academySales.workshops.updateDesignItemImage(
              workshop.id,
              imageTarget.designItem.id,
              imageTarget.image.id,
              request
            )
          : await apiClient.academySales.workshops.createDesignItemImage(
              workshop.id,
              imageTarget.designItem.id,
              request
            );
        onUpdated({
          ...workshop,
          designs: (workshop.designs || []).map((current) => {
            if (current.id !== imageTarget.designItem.id) return current;
            const images = imageTarget.image
              ? current.images.map((img) => (img.id === image.id ? image : img))
              : [...current.images, image];
            return { ...current, images: sortImages(images) };
          }),
        });
        closeImageEditor();
        message.success(imageTarget.image ? 'Đã cập nhật ảnh mẫu mi.' : 'Đã thêm ảnh mẫu mi.');
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể lưu ảnh.');
      } finally {
        setSaving(false);
      }
    },
    [closeImageEditor, imageTarget, onUpdated, workshop]
  );

  const deleteImage = React.useCallback(
    async (designItem: AcademyWorkshopDesignItem, image: AcademyWorkshopDesignItemImage) => {
      setSaving(true);
      try {
        await apiClient.academySales.workshops.deleteDesignItemImage(workshop.id, designItem.id, image.id);
        onUpdated({
          ...workshop,
          designs: (workshop.designs || []).map((current) =>
            current.id === designItem.id
              ? { ...current, images: current.images.filter((img) => img.id !== image.id) }
              : current
          ),
        });
        message.success('Đã xóa ảnh mẫu thiết kế mi.');
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể xóa ảnh.');
      } finally {
        setSaving(false);
      }
    },
    [onUpdated, workshop]
  );

  const applySelectedTemplate = React.useCallback(async () => {
    if (!templateId) return;
    setTemplateSaving(true);
    try {
      const updated = await apiClient.academySales.workshops.applyDesignTemplate(workshop.id, templateId);
      onUpdated(updated);
      message.success('Đã áp dụng bộ sưu tập mẫu thiết kế mi vào workshop.');
    } catch (cause: any) {
      message.error(cause?.response?.data?.message || 'Không thể áp dụng bộ sưu tập mẫu mi.');
    } finally {
      setTemplateSaving(false);
    }
  }, [onUpdated, templateId, workshop.id]);

  const refreshCurrentTemplate = React.useCallback(async () => {
    if (!workshop.designTemplate) return;
    setTemplateSaving(true);
    try {
      const template = await apiClient.academySales.workshops.refreshDesignTemplateFromWorkshop(
        workshop.id,
        workshop.designTemplate.id
      );
      await templates.refresh();
      onUpdated({ ...workshop, designTemplate: template });
      message.success('Đã cập nhật bộ sưu tập trong thư viện từ danh sách mẫu hiện tại.');
    } catch (cause: any) {
      message.error(cause?.response?.data?.message || 'Không thể cập nhật bộ sưu tập.');
    } finally {
      setTemplateSaving(false);
    }
  }, [onUpdated, templates, workshop]);

  return (
    <div className="space-y-6">
      {/* Template selection & quick actions bar */}
      <AcademyWorkshopTemplateBar
        title="Mẫu thiết kế mi"
        ariaLabel="Chọn mẫu thiết kế mi cho workshop"
        templates={selectableTemplates}
        selectedTemplateId={templateId}
        isCurrentTemplate={isCurrentTemplate}
        selectedTemplateTitle={selectedTemplate?.title}
        selectedTemplateDescription={selectedTemplate?.description}
        canEdit={canEdit}
        loading={templates.loading}
        templateSaving={templateSaving}
        error={templates.error}
        saveAsNewDisabled={!workshop.designs?.length}
        metadata={
          selectedTemplate ? (
            <IconText icon={<AppIcon icon={Sparkles} size="sm" />} tabular>
              {selectedTemplateItemCount} mẫu thiết kế mi
            </IconText>
          ) : null
        }
        onSelectTemplate={setTemplateId}
        onOpenLibrary={() => setTemplateLibraryOpen(true)}
        onApplyTemplate={applySelectedTemplate}
        onUpdateCurrentTemplate={refreshCurrentTemplate}
        onSaveAsNewTemplate={() => setTemplateSaveRequestId((current) => current + 1)}
      />

      {/* Deadline & Agenda Link Info */}
      <AcademyWorkshopSelectionDeadline
        workshop={workshop}
        canEdit={canEdit}
        onUpdated={onUpdated}
        selectionType="design"
      />

      {/* Agenda item link indicator */}
      {linkedAgendaItem ? (
        <div className="flex items-center justify-between rounded-xl border border-pink-100 bg-pink-50/50 p-3 text-xs dark:border-pink-900/40 dark:bg-pink-950/20">
          <div className="flex items-center gap-2">
            <AppIcon icon={Sparkles} className="text-pink-500 h-4 w-4 shrink-0" />
            <span className="text-gray-700 dark:text-gray-300">
              Đang liên kết với mốc lịch trình:{' '}
              <strong className="text-gray-900 dark:text-gray-100">{linkedAgendaItem.title}</strong> (Học viên sẽ thấy
              phần chọn mẫu mi tại mốc này trên cổng trực tuyến).
            </span>
          </div>
          <span className="font-semibold text-pink-600 dark:text-pink-400">Đã kích hoạt</span>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400">
          <span>
            ⚠️ Chưa có mốc lịch trình nào gắn chọn mẫu mi. Hãy sang tab <strong>Lịch trình</strong> và bấm nút{' '}
            <strong>&quot;Mẫu mi&quot;</strong> tại phần thực hành để kích hoạt cho học viên đăng ký.
          </span>
        </div>
      )}

      {/* Main List Section */}
      <DataSection
        title={
          <AcademyWorkshopSectionTitle
            icon={Eye}
            title="Danh Sách Mẫu Thiết Kế Mi Thực Hành"
            badge={<StatusTag status="processing" label={`${workshop.designs?.length || 0} mẫu thiết kế`} />}
          />
        }
        extra={
          <div className="flex items-center gap-2">
            {participants?.length ? (
              <Button icon={<AppIcon icon={Sparkles} />} onClick={() => setPrepModalOpen(true)}>
                Tổng hợp mẫu mi
              </Button>
            ) : null}
            {canEdit ? (
              <Button type="primary" icon={<AppIcon icon={Plus} />} onClick={openCreate}>
                Thêm mẫu thiết kế
              </Button>
            ) : null}
          </div>
        }
      >
        {!workshop.designs?.length ? (
          <StatePanel
            kind="empty"
            title="Chưa có mẫu thiết kế mi nào"
            description="Hãy thêm các mẫu mi (Classic, Katun, Wetlook, Anime...) hoặc áp dụng bộ sưu tập từ thư viện để học viên đăng ký thực hành."
            extra={
              canEdit ? (
                <Space>
                  <Button type="primary" icon={<AppIcon icon={Plus} />} onClick={openCreate}>
                    Thêm mẫu thiết kế
                  </Button>
                  <Button icon={<AppIcon icon={LibraryBig} />} onClick={() => setTemplateLibraryOpen(true)}>
                    Mở thư viện mẫu
                  </Button>
                </Space>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workshop.designs.map((design) => {
              const meta = difficultyMeta(design.difficultyLevel);
              return (
                <div
                  key={design.id}
                  className="flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-base text-gray-900 dark:text-gray-100 m-0">{design.name}</h4>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${meta.className}`}
                          >
                            {'⭐'.repeat(meta.stars)} {meta.label}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          {design.priceVnd > 0 ? (
                            <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                              Phụ thu: +{formatVnd(design.priceVnd)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                              Miễn phí / Đã bao gồm
                            </span>
                          )}
                          <StatusTag
                            status={design.isAvailable ? 'success' : 'default'}
                            label={design.isAvailable ? 'Khả dụng' : 'Tạm ngưng'}
                          />
                        </div>
                      </div>

                      {canEdit ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <IconButton icon={PencilLine} label="Sửa thông tin" onClick={() => openEdit(design)} />
                          <Popconfirm
                            title="Xóa mẫu thiết kế mi này?"
                            description="Lựa chọn của học viên đã chọn mẫu này vẫn được giữ lại để đối soát."
                            onConfirm={() => deleteItem(design)}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                          >
                            <IconButton icon={Trash2} label="Xóa mẫu" tone="danger" />
                          </Popconfirm>
                        </div>
                      ) : null}
                    </div>

                    {design.description ? (
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed m-0">
                        {design.description}
                      </p>
                    ) : null}

                    {/* Image gallery */}
                    <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Hình ảnh mẫu dáng ({design.images.length})</span>
                        {canEdit ? (
                          <Button
                            type="link"
                            size="small"
                            className="p-0 h-auto text-xs"
                            icon={<AppIcon icon={Plus} className="h-3 w-3" />}
                            onClick={() => openCreateImage(design)}
                          >
                            Thêm ảnh
                          </Button>
                        ) : null}
                      </div>

                      {design.images.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {design.images.map((img) => (
                            <div
                              key={img.id}
                              className="group relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
                            >
                              <img
                                src={img.imageUrl}
                                alt={img.altText || design.name}
                                className="h-full w-full object-cover"
                              />
                              {canEdit ? (
                                <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                  <IconButton
                                    icon={PencilLine}
                                    label="Chỉnh sửa ảnh"
                                    className="text-white hover:text-white"
                                    onClick={() => openEditImage(design, img)}
                                  />
                                  <Popconfirm
                                    title="Xóa ảnh này?"
                                    onConfirm={() => deleteImage(design, img)}
                                    okText="Xóa"
                                    cancelText="Hủy"
                                  >
                                    <IconButton icon={Trash2} label="Xóa ảnh" tone="danger" className="text-red-400" />
                                  </Popconfirm>
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs italic text-gray-400">Chưa có ảnh minh họa cho mẫu này</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DataSection>

      {/* Create / Edit Design Item Drawer */}
      <EntityFormDrawer
        open={editorOpen}
        title={editingItem ? 'Chỉnh sửa Mẫu thiết kế mi' : 'Thêm Mẫu thiết kế mi mới'}
        onClose={closeEditor}
      >
        <EntityForm form={form} onFinish={saveItem} layout="vertical">
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
            <Button onClick={closeEditor}>Hủy</Button>
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
        onClose={closeImageEditor}
      >
        <EntityForm form={imageForm} onFinish={saveImage} layout="vertical">
          <AcademyWorkshopServerImageUpload
            workshopId={workshop.id}
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
            <Button onClick={closeImageEditor}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              {imageTarget?.image ? 'Lưu thay đổi' : 'Thêm ảnh'}
            </Button>
          </div>
        </EntityForm>
      </EntityFormDrawer>

      {/* Modals & Library */}
      <AcademyWorkshopDesignTemplateLibrary
        open={templateLibraryOpen}
        workshop={workshop}
        canEdit={canEdit}
        saveRequestId={templateSaveRequestId}
        onClose={() => setTemplateLibraryOpen(false)}
        onApplied={(updated) => onUpdated(updated)}
        onWorkshopUpdated={(updated) => onUpdated(updated)}
      />

      {prepModalOpen && participants ? (
        <AcademyWorkshopDesignPrepModal
          open={prepModalOpen}
          workshop={workshop}
          participants={participants}
          onClose={() => setPrepModalOpen(false)}
        />
      ) : null}
    </div>
  );
}
