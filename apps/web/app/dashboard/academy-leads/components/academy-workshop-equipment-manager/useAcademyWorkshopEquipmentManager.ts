'use client';

import React from 'react';
import { Form, message } from 'antd';
import type {
  AcademyWorkshopDetail,
  AcademyWorkshopEquipmentPackage,
  AcademyWorkshopEquipmentPackageImage,
} from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { useAcademyWorkshopEquipmentTemplates } from '../useAcademyWorkshopEquipmentTemplates';
import {
  equipmentFormValues,
  equipmentRequest,
  imageFormValues,
  imageRequest,
  sortEquipment,
  sortImages,
  type EquipmentFormValues,
  type EquipmentImageTarget,
  type ImageFormValues,
} from './equipment-manager-utils';

export function useAcademyWorkshopEquipmentManager({
  workshop,
  onUpdated,
}: {
  workshop: AcademyWorkshopDetail;
  onUpdated: (workshop: AcademyWorkshopDetail) => void;
}) {
  const [form] = Form.useForm<EquipmentFormValues>();
  const [imageForm] = Form.useForm<ImageFormValues>();
  const [editingItem, setEditingItem] = React.useState<AcademyWorkshopEquipmentPackage | null>(null);
  const [imageTarget, setImageTarget] = React.useState<EquipmentImageTarget | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [imageEditorOpen, setImageEditorOpen] = React.useState(false);
  const [prepModalOpen, setPrepModalOpen] = React.useState(false);
  const [templateLibraryOpen, setTemplateLibraryOpen] = React.useState(false);
  const [templateSaveRequestId, setTemplateSaveRequestId] = React.useState(0);
  const [templateId, setTemplateId] = React.useState<number | null>(workshop.equipmentTemplate?.id || null);
  const [saving, setSaving] = React.useState(false);
  const [templateSaving, setTemplateSaving] = React.useState(false);
  const templates = useAcademyWorkshopEquipmentTemplates(true);

  React.useEffect(() => setTemplateId(workshop.equipmentTemplate?.id || null), [workshop.equipmentTemplate?.id]);

  const selectableTemplates = React.useMemo(() => {
    if (
      !workshop.equipmentTemplate ||
      templates.data.some((template) => template.id === workshop.equipmentTemplate?.id)
    ) {
      return templates.data;
    }
    return [workshop.equipmentTemplate, ...templates.data];
  }, [templates.data, workshop.equipmentTemplate]);

  const selectedTemplate = React.useMemo(
    () => selectableTemplates.find((template) => template.id === templateId) || workshop.equipmentTemplate,
    [selectableTemplates, templateId, workshop.equipmentTemplate]
  );

  const isCurrentTemplate = templateId === (workshop.equipmentTemplate?.id || null);

  const selectedTemplateItemCount = React.useMemo(
    () =>
      selectedTemplate?.packages.reduce(
        (total, equipmentPackage) => total + equipmentPackage.includedItems.length,
        0
      ) || 0,
    [selectedTemplate]
  );

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

  const setAsIncludedPackage = React.useCallback(
    async (item: AcademyWorkshopEquipmentPackage) => {
      setSaving(true);
      try {
        const updated = await apiClient.academySales.workshops.updateEquipmentPackage(workshop.id, item.id, {
          isIncludedInFee: true,
        });
        const equipmentPackages = workshop.equipmentPackages.map((current) =>
          current.id === item.id ? updated : { ...current, isIncludedInFee: false }
        );
        onUpdated({ ...workshop, equipmentPackages: sortEquipment(equipmentPackages) });
        message.success(`Đã đặt “${item.name}” làm gói quà tặng kèm trong học phí.`);
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể cập nhật gói tặng kèm.');
      } finally {
        setSaving(false);
      }
    },
    [onUpdated, workshop]
  );

  const saveItem = React.useCallback(
    async (values: EquipmentFormValues) => {
      setSaving(true);
      try {
        const request = equipmentRequest(values);
        const item = editingItem
          ? await apiClient.academySales.workshops.updateEquipmentPackage(workshop.id, editingItem.id, request)
          : await apiClient.academySales.workshops.createEquipmentPackage(workshop.id, request);
        let equipmentPackages = editingItem
          ? workshop.equipmentPackages.map((current) => (current.id === item.id ? item : current))
          : [...workshop.equipmentPackages, item];
        if (request.isIncludedInFee) {
          equipmentPackages = equipmentPackages.map((current) =>
            current.id === item.id ? current : { ...current, isIncludedInFee: false }
          );
        }
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

  const applyTemplate = React.useCallback(async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    try {
      const updated = await apiClient.academySales.workshops.applyEquipmentTemplate(workshop.id, selectedTemplate.id);
      onUpdated(updated);
      setTemplateId(selectedTemplate.id);
      message.success(`Đã áp dụng mẫu “${selectedTemplate.title}”.`);
    } catch (cause: any) {
      message.error(cause?.response?.data?.message || 'Không thể áp dụng mẫu bộ dụng cụ.');
    } finally {
      setSaving(false);
    }
  }, [onUpdated, selectedTemplate, workshop.id]);

  const saveAsNewTemplate = React.useCallback(() => {
    if (!workshop.equipmentPackages.length) {
      message.warning('Thêm ít nhất một bộ dụng cụ trước khi lưu mẫu.');
      return;
    }
    setTemplateLibraryOpen(true);
    setTemplateSaveRequestId((current) => current + 1);
  }, [workshop.equipmentPackages.length]);

  const updateCurrentTemplate = React.useCallback(async () => {
    if (!selectedTemplate || !isCurrentTemplate) return;
    setTemplateSaving(true);
    try {
      await templates.syncTemplateFromWorkshop(workshop.id, selectedTemplate.id);
      message.success(`Đã cập nhật “${selectedTemplate.title}” bằng bộ dụng cụ hiện tại.`);
    } catch (cause) {
      message.error(templates.mutationMessage(cause, 'Không thể cập nhật mẫu bộ dụng cụ.'));
    } finally {
      setTemplateSaving(false);
    }
  }, [isCurrentTemplate, selectedTemplate, templates.mutationMessage, templates.syncTemplateFromWorkshop, workshop.id]);

  return {
    form,
    imageForm,
    editingItem,
    imageTarget,
    editorOpen,
    imageEditorOpen,
    prepModalOpen,
    setPrepModalOpen,
    templateLibraryOpen,
    setTemplateLibraryOpen,
    templateSaveRequestId,
    templateId,
    setTemplateId,
    saving,
    templateSaving,
    templates,
    selectableTemplates,
    selectedTemplate,
    isCurrentTemplate,
    selectedTemplateItemCount,
    openCreate,
    openEdit,
    closeEditor,
    openCreateImage,
    openEditImage,
    closeImageEditor,
    setAsIncludedPackage,
    saveItem,
    deleteItem,
    saveImage,
    deleteImage,
    applyTemplate,
    saveAsNewTemplate,
    updateCurrentTemplate,
  };
}
