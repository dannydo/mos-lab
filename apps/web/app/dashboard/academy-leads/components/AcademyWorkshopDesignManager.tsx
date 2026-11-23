'use client';

import React from 'react';
import { Button, Form, Space, message } from 'antd';
import { Eye, LibraryBig, Plus, Sparkles } from 'lucide-react';
import type {
  AcademyWorkshopDesignItem,
  AcademyWorkshopDesignItemImage,
  AcademyWorkshopDetail,
  AcademyWorkshopParticipant,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { AppIcon, DataSection, IconText, StatePanel, StatusTag } from '../../../../components/ui';
import AcademyWorkshopDesignPrepModal from './AcademyWorkshopDesignPrepModal';
import AcademyWorkshopDesignTemplateLibrary from './AcademyWorkshopDesignTemplateLibrary';
import AcademyWorkshopSectionTitle from './AcademyWorkshopSectionTitle';
import AcademyWorkshopSelectionDeadline from './AcademyWorkshopSelectionDeadline';
import AcademyWorkshopTemplateBar from './AcademyWorkshopTemplateBar';
import { useAcademyWorkshopDesignTemplates } from './useAcademyWorkshopDesignTemplates';
import { WorkshopDesignEditorDrawers } from './workshop-design/WorkshopDesignEditorDrawers';
import { WorkshopDesignItemCard } from './workshop-design/WorkshopDesignItemCard';
import {
  designFormValues,
  designRequest,
  imageFormValues,
  imageRequest,
  sortDesigns,
  sortImages,
  type DesignFormValues,
  type ImageFormValues,
} from './workshop-design/workshop-design-utils';

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
            {workshop.designs.map((design) => (
              <WorkshopDesignItemCard
                key={design.id}
                design={design}
                canEdit={canEdit}
                onEditDesign={openEdit}
                onDeleteDesign={deleteItem}
                onCreateImage={openCreateImage}
                onEditImage={openEditImage}
                onDeleteImage={deleteImage}
              />
            ))}
          </div>
        )}
      </DataSection>

      <WorkshopDesignEditorDrawers
        workshopId={workshop.id}
        form={form}
        imageForm={imageForm}
        editorOpen={editorOpen}
        editingItem={editingItem}
        imageEditorOpen={imageEditorOpen}
        imageTarget={imageTarget}
        saving={saving}
        onSaveItem={saveItem}
        onCloseEditor={closeEditor}
        onSaveImage={saveImage}
        onCloseImageEditor={closeImageEditor}
      />

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
