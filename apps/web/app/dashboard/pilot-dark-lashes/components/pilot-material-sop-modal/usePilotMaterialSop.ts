'use client';

import { useCallback, useEffect, useState } from 'react';
import { Form, message } from 'antd';
import type {
  PilotGlueRodStandardItem,
  PilotMaterialSopDocument,
  PilotSanitizationItem,
  PilotSolutionNormItem,
  SavePilotMaterialSopRequest,
} from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import {
  DEFAULT_ENDORSE_NOTE,
  DEFAULT_EXPERT_REVIEWER,
  DEFAULT_SANITIZATION_CHECKLIST_TEXT,
  buildUpdatedGlueRodStandards,
  buildUpdatedSanitizationProcedures,
  buildUpdatedSolutionNorms,
  getApiErrorMessage,
  isFormValidationError,
  type EndorseFormValues,
  type GlueRodFormValues,
  type MaterialSopTabKey,
  type SanitizationFormValues,
  type SolutionNormFormValues,
} from './pilot-material-sop-helpers';

export function usePilotMaterialSop(open: boolean) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [activeTab, setActiveTab] = useState<MaterialSopTabKey>('solutions');
  const [doc, setDoc] = useState<PilotMaterialSopDocument | null>(null);

  // Sub-modal states
  const [normEditModalOpen, setNormEditModalOpen] = useState(false);
  const [editingNorm, setEditingNorm] = useState<PilotSolutionNormItem | null>(null);
  const [normForm] = Form.useForm<SolutionNormFormValues>();

  const [glueRodModalOpen, setGlueRodModalOpen] = useState(false);
  const [editingGlueRod, setEditingGlueRod] = useState<PilotGlueRodStandardItem | null>(null);
  const [glueRodForm] = Form.useForm<GlueRodFormValues>();

  const [sanitModalOpen, setSanitModalOpen] = useState(false);
  const [editingSanit, setEditingSanit] = useState<PilotSanitizationItem | null>(null);
  const [sanitForm] = Form.useForm<SanitizationFormValues>();

  const [endorseModalOpen, setEndorseModalOpen] = useState(false);
  const [endorseForm] = Form.useForm<EndorseFormValues>();

  const fetchDoc = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.pilot.getMaterialSop({ pilotCode: 'DARK_LASHES' });
      setDoc(res);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, 'Không thể tải tài liệu SOP Hạng mục 3.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchDoc();
    }
  }, [open, fetchDoc]);

  const handleSaveDraft = async () => {
    if (!doc) return;
    try {
      setSaving(true);
      const payload: SavePilotMaterialSopRequest = {
        pilotCode: doc.pilotCode,
        overallStatus: doc.overallStatus,
        isPublished: doc.isPublished,
        expertReviewer: doc.expertReviewer,
        projectOwner: doc.projectOwner,
        approvalNote: doc.approvalNote,
        solutionNorms: doc.solutionNorms,
        glueRodStandards: doc.glueRodStandards,
        sanitizationProcedures: doc.sanitizationProcedures,
      };
      const updated = await apiClient.pilot.saveMaterialSop(payload);
      setDoc(updated);
      message.success('Đã lưu bản dự thảo SOP Hạng mục 3 thành công!');
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, 'Lỗi khi lưu dự thảo.'));
    } finally {
      setSaving(false);
    }
  };

  // Phần 1: Định mức Thuốc & Dung dịch
  const handleOpenEditNorm = (norm: PilotSolutionNormItem) => {
    setEditingNorm(norm);
    normForm.resetFields();
    normForm.setFieldsValue({
      materialName: norm.materialName,
      materialId: norm.materialId,
      unit: norm.unit,
      costPerUnit: norm.costPerUnit,
      standardDosagePerSession: norm.standardDosagePerSession,
      usageInstructions: norm.usageInstructions,
      technicalNotes: norm.technicalNotes,
      status: norm.status,
    });
    setNormEditModalOpen(true);
  };

  const handleOpenAddNorm = () => {
    setEditingNorm(null);
    normForm.resetFields();
    normForm.setFieldsValue({
      unit: 'ml',
      costPerUnit: 30000,
      standardDosagePerSession: 0.8,
      status: 'PENDING_REVIEW',
    });
    setNormEditModalOpen(true);
  };

  const handleSaveNorm = async () => {
    try {
      const values = await normForm.validateFields();
      if (!doc) return;

      const updatedNorms = buildUpdatedSolutionNorms(doc.solutionNorms, editingNorm, values);
      const updated = await apiClient.pilot.saveMaterialSop({
        solutionNorms: updatedNorms,
      });
      setDoc(updated);
      setNormEditModalOpen(false);
      message.success('Đã cập nhật định mức thuốc uốn & dung dịch!');
    } catch (err: unknown) {
      if (isFormValidationError(err)) return;
      message.error(getApiErrorMessage(err, 'Lỗi khi lưu định mức.'));
    }
  };

  const handleDeleteNorm = async (id: string) => {
    if (!doc) return;
    try {
      const updatedNorms = doc.solutionNorms.filter((n) => n.id !== id);
      const updated = await apiClient.pilot.saveMaterialSop({
        solutionNorms: updatedNorms,
      });
      setDoc(updated);
      message.success('Đã xóa định mức khỏi danh mục.');
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, 'Không thể xóa định mức.'));
    }
  };

  // Phần 2: Quy chuẩn Keo định hình & Trục silicon
  const handleOpenEditGlueRod = (item: PilotGlueRodStandardItem) => {
    setEditingGlueRod(item);
    glueRodForm.resetFields();
    glueRodForm.setFieldsValue({
      category: item.category,
      title: item.title,
      materialRef: item.materialRef,
      selectionCriteria: item.selectionCriteria,
      standardOperation: item.standardOperation,
      technicalNotes: item.technicalNotes,
      commonMistakesToAvoid: item.commonMistakesToAvoid,
      illustrationImageUrl: item.illustrationImageUrl,
      status: item.status,
    });
    setGlueRodModalOpen(true);
  };

  const handleOpenAddGlueRod = () => {
    setEditingGlueRod(null);
    glueRodForm.resetFields();
    glueRodForm.setFieldsValue({
      category: 'SILICON_ROD',
      status: 'PENDING_REVIEW',
    });
    setGlueRodModalOpen(true);
  };

  const handleSaveGlueRod = async () => {
    try {
      const values = await glueRodForm.validateFields();
      if (!doc) return;

      const updatedList = buildUpdatedGlueRodStandards(doc.glueRodStandards, editingGlueRod, values);
      const updated = await apiClient.pilot.saveMaterialSop({
        glueRodStandards: updatedList,
      });
      setDoc(updated);
      setGlueRodModalOpen(false);
      message.success('Đã lưu quy chuẩn keo & trục silicon!');
    } catch (err: unknown) {
      if (isFormValidationError(err)) return;
      message.error(getApiErrorMessage(err, 'Lỗi khi lưu quy chuẩn.'));
    }
  };

  const handleDeleteGlueRod = async (id: string) => {
    if (!doc) return;
    try {
      const updatedList = doc.glueRodStandards.filter((g) => g.id !== id);
      const updated = await apiClient.pilot.saveMaterialSop({
        glueRodStandards: updatedList,
      });
      setDoc(updated);
      message.success('Đã xóa quy chuẩn.');
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, 'Không thể xóa quy chuẩn.'));
    }
  };

  // Phần 3: Quy trình Khử khuẩn & Vệ sinh dụng cụ
  const handleOpenEditSanit = (item: PilotSanitizationItem) => {
    setEditingSanit(item);
    sanitForm.resetFields();
    sanitForm.setFieldsValue({
      toolName: item.toolName,
      classification: item.classification,
      procedure: item.procedure,
      criticalSafetyPoint: item.criticalSafetyPoint,
      checklistStepsText: (item.checklistSteps || []).join('\n'),
      status: item.status,
    });
    setSanitModalOpen(true);
  };

  const handleOpenAddSanit = () => {
    setEditingSanit(null);
    sanitForm.resetFields();
    sanitForm.setFieldsValue({
      classification: 'REUSABLE',
      status: 'PENDING_REVIEW',
      checklistStepsText: DEFAULT_SANITIZATION_CHECKLIST_TEXT,
    });
    setSanitModalOpen(true);
  };

  const handleSaveSanit = async () => {
    try {
      const values = await sanitForm.validateFields();
      if (!doc) return;

      const updatedList = buildUpdatedSanitizationProcedures(doc.sanitizationProcedures, editingSanit, values);
      const updated = await apiClient.pilot.saveMaterialSop({
        sanitizationProcedures: updatedList,
      });
      setDoc(updated);
      setSanitModalOpen(false);
      message.success('Đã lưu quy trình vệ sinh & khử khuẩn!');
    } catch (err: unknown) {
      if (isFormValidationError(err)) return;
      message.error(getApiErrorMessage(err, 'Lỗi khi lưu quy trình khử khuẩn.'));
    }
  };

  const handleDeleteSanit = async (id: string) => {
    if (!doc) return;
    try {
      const updatedList = doc.sanitizationProcedures.filter((p) => p.id !== id);
      const updated = await apiClient.pilot.saveMaterialSop({
        sanitizationProcedures: updatedList,
      });
      setDoc(updated);
      message.success('Đã xóa quy trình.');
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, 'Không thể xóa quy trình.'));
    }
  };

  // Phần 4: Thẩm định chuyên môn & Trình duyệt Scale
  const handleOpenEndorse = () => {
    endorseForm.resetFields();
    endorseForm.setFieldsValue({
      reviewerName: doc?.expertReviewer || DEFAULT_EXPERT_REVIEWER,
      note: DEFAULT_ENDORSE_NOTE,
    });
    setEndorseModalOpen(true);
  };

  const handleConfirmEndorse = async () => {
    try {
      setReviewing(true);
      const values = await endorseForm.validateFields();
      const updated = await apiClient.pilot.reviewMaterialSop({
        decision: 'EXPERT_ENDORSE',
        reviewerName: values.reviewerName,
        note: values.note,
      });
      setDoc(updated);
      setEndorseModalOpen(false);
      message.success('Cô Giang Đàm đã xác nhận thẩm định chuyên môn thành công!');
    } catch (err: unknown) {
      if (isFormValidationError(err)) return;
      message.error(getApiErrorMessage(err, 'Lỗi khi xác nhận thẩm định.'));
    } finally {
      setReviewing(false);
    }
  };

  return {
    loading,
    saving,
    reviewing,
    activeTab,
    setActiveTab,
    doc,
    normEditModalOpen,
    setNormEditModalOpen,
    editingNorm,
    normForm,
    glueRodModalOpen,
    setGlueRodModalOpen,
    editingGlueRod,
    glueRodForm,
    sanitModalOpen,
    setSanitModalOpen,
    editingSanit,
    sanitForm,
    endorseModalOpen,
    setEndorseModalOpen,
    endorseForm,
    handleSaveDraft,
    handleOpenEditNorm,
    handleOpenAddNorm,
    handleSaveNorm,
    handleDeleteNorm,
    handleOpenEditGlueRod,
    handleOpenAddGlueRod,
    handleSaveGlueRod,
    handleDeleteGlueRod,
    handleOpenEditSanit,
    handleOpenAddSanit,
    handleSaveSanit,
    handleDeleteSanit,
    handleOpenEndorse,
    handleConfirmEndorse,
  };
}
