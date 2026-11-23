'use client';

import { useState, useCallback, type Dispatch, type SetStateAction } from 'react';
import { Form, message } from 'antd';
import type { SafeAny } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import type { ItemStatusMap } from '../../types/qa-shop.types';

export interface UseQaTemplateCrudParams {
  activeTemplate: SafeAny | null;
  selectedBranch: string;
  setTemplates: Dispatch<SetStateAction<SafeAny[]>>;
  setItemStatuses: Dispatch<SetStateAction<ItemStatusMap>>;
}

/** Manage checklist item creation, editing, deletion, and template persistence. */
export function useQaTemplateCrud({
  activeTemplate,
  selectedBranch,
  setTemplates,
  setItemStatuses,
}: UseQaTemplateCrudParams) {
  const [crudForm] = Form.useForm();
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SafeAny | null>(null);
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);
  const [manageSearchText, setManageSearchText] = useState('');

  // Save updated template sections
  const persistTemplateChanges = useCallback(
    async (updatedSections: SafeAny[]) => {
      if (!activeTemplate) return;

      const newTemplate = {
        ...activeTemplate,
        sections: updatedSections,
        totalItemsCount: updatedSections.reduce((acc: number, s: SafeAny) => acc + (s.items?.length || 0), 0),
        updatedAt: new Date().toISOString(),
      };

      setTemplates((prev) => {
        if (!prev || prev.length === 0) return [newTemplate];
        const exists = prev.some((t) => t.branchCode === selectedBranch || t.id === newTemplate.id);
        if (!exists) return [...prev, newTemplate];
        return prev.map((t) => (t.branchCode === selectedBranch || t.id === newTemplate.id ? newTemplate : t));
      });

      setItemStatuses((prev) => {
        const next = { ...prev };
        updatedSections.forEach((sec: SafeAny) => {
          if (Array.isArray(sec.items)) {
            sec.items.forEach((itm: SafeAny) => {
              if (!next[itm.id]) {
                next[itm.id] = { result: 'PASS', note: '', photoUrl: '' };
              }
            });
          }
        });
        return next;
      });

      try {
        localStorage.setItem(`qa_custom_template_${selectedBranch}`, JSON.stringify(newTemplate));
      } catch (e) {
        console.warn('Failed to save template to localStorage', e);
      }

      try {
        await apiClient.qaShop.updateTemplate(selectedBranch, updatedSections);
      } catch (e) {
        console.warn('Backend API update template warning:', e);
      }
    },
    [activeTemplate, selectedBranch, setTemplates, setItemStatuses]
  );

  // Template CRUD Item Handlers
  const handleOpenItemModal = (item?: SafeAny, sectionId?: string) => {
    setEditingItem(item || null);
    setTargetSectionId(sectionId || activeTemplate?.sections?.[0]?.id || 'sec-1');
    if (item) {
      const foundSecId =
        sectionId ||
        activeTemplate?.sections?.find((s: SafeAny) => s.items?.some((i: SafeAny) => i.id === item.id))?.id;
      crudForm.setFieldsValue({
        sectionId: foundSecId,
        title: item.title || '',
        standardRequirement: item.standardRequirement || '',
        severity: item.severity || (item.isCritical ? 'CRITICAL' : 'MID'),
        unitQty: item.unitQty || item.weight || 1,
        area: item.area || '',
        isCritical: item.isCritical !== undefined ? item.isCritical : item.severity === 'CRITICAL',
      });
    } else {
      crudForm.resetFields();
      crudForm.setFieldsValue({
        sectionId: sectionId || activeTemplate?.sections?.[0]?.id,
        severity: 'MID',
        unitQty: 1,
        isCritical: false,
      });
    }
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async () => {
    try {
      const values = await crudForm.validateFields();
      if (!activeTemplate || !Array.isArray(activeTemplate.sections)) return;

      let sectionId = values.sectionId || targetSectionId || activeTemplate.sections[0]?.id;
      const currentSections = [...activeTemplate.sections];

      let secIndex = currentSections.findIndex((s) => s.id === sectionId);
      if (secIndex === -1) {
        const newSecId = `sec-custom-${Date.now()}`;
        const newSec = {
          id: newSecId,
          title: values.sectionTitle || 'Nhóm Mới Thêm',
          items: [],
        };
        currentSections.push(newSec);
        secIndex = currentSections.length - 1;
        sectionId = newSecId;
      }

      const isCriticalVal = typeof values.isCritical === 'boolean' ? values.isCritical : values.severity === 'CRITICAL';

      const newItemId = editingItem?.id || `itm-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newItemObj = {
        id: newItemId,
        code: editingItem?.code || `QA.${newItemId.slice(-4)}`,
        title: values.title,
        standardRequirement: values.standardRequirement || '',
        severity: values.severity,
        weight: values.unitQty || 1,
        unitQty: values.unitQty || 1,
        area: values.area || '',
        isCritical: isCriticalVal,
        requirePhotoOnFail: true,
      };

      if (editingItem) {
        const updatedSections = currentSections.map((sec) => ({
          ...sec,
          items: (sec.items || []).map((itm: SafeAny) => (itm.id === editingItem.id ? newItemObj : itm)),
        }));
        await persistTemplateChanges(updatedSections);
        message.success('Đã cập nhật thông tin tiêu chí thành công!');
      } else {
        const targetSec = currentSections[secIndex];
        const updatedItems = [...(targetSec.items || []), newItemObj];
        currentSections[secIndex] = { ...targetSec, items: updatedItems };

        await persistTemplateChanges(currentSections);
        message.success('Đã thêm tiêu chí kiểm tra mới thành công!');
      }

      setIsItemModalOpen(false);
    } catch (err) {
      console.error('Validation or save error:', err);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!activeTemplate || !Array.isArray(activeTemplate.sections)) return;

    const updatedSections = activeTemplate.sections.map((sec: SafeAny) => ({
      ...sec,
      items: (sec.items || []).filter((itm: SafeAny) => itm.id !== itemId),
    }));

    await persistTemplateChanges(updatedSections);
    message.success('Đã xóa tiêu chí kiểm tra!');
  };

  return {
    isManageModalOpen,
    setIsManageModalOpen,
    manageSearchText,
    setManageSearchText,
    isItemModalOpen,
    setIsItemModalOpen,
    editingItem,
    crudForm,
    handleOpenItemModal,
    handleSaveItem,
    handleDeleteItem,
  };
}
