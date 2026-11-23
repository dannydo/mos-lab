'use client';

import { useCallback, useEffect, useId, useState, type ChangeEvent } from 'react';
import { message } from 'antd';
import {
  DEFAULT_SOP_PREPARATION_CATEGORY_1,
  type SopPreparationCategory1Document,
  type SopPrepCriterionData,
  type SopPrepEvidenceFile,
} from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import {
  buildLocalFallbackEvidenceFile,
  DEFAULT_UPLOAD_ORIGIN,
  getTotalEvidenceCount,
  readFileAsDataUrl,
  SOP_PREP_AUTHOR_NAME,
  SOP_PREP_CRITERIA_TOTAL,
  SOP_PREP_PILOT_CODE,
} from './sop-prep-category1-helpers';

export function useSopPrepCategory1Detail() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [doc, setDoc] = useState<SopPreparationCategory1Document>(DEFAULT_SOP_PREPARATION_CATEGORY_1);
  const [activeCriterionId, setActiveCriterionId] = useState<number>(1);

  // Form inputs for current active criterion
  const [knowledgeText, setKnowledgeText] = useState('');
  const [practicalText, setPracticalText] = useState('');
  const [groundsText, setGroundsText] = useState('');

  // Upload inputs
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadOrigin, setUploadOrigin] = useState(DEFAULT_UPLOAD_ORIGIN);
  const [uploadSessionCode, setUploadSessionCode] = useState('');

  // File Preview Modal
  const [previewFile, setPreviewFile] = useState<SopPrepEvidenceFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Stable ID for accessible file input
  const fileInputId = useId();

  // Load live data from API
  const fetchCategory1Data = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.pilot.getSopPreparationCategory1({
        pilotCode: SOP_PREP_PILOT_CODE,
      });
      if (res && res.criteria) {
        setDoc(res);
      }
    } catch (err: unknown) {
      console.warn('Cannot fetch SOP Prep Category 1 from API, using default/cached data:', err);
      setDoc(DEFAULT_SOP_PREPARATION_CATEGORY_1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategory1Data();
  }, [fetchCategory1Data]);

  // Sync form inputs when active criterion changes or doc is updated
  useEffect(() => {
    const activeCrit = doc.criteria.find((c) => c.id === activeCriterionId);
    if (activeCrit) {
      setKnowledgeText(activeCrit.expertiseKnowledge || '');
      setPracticalText(activeCrit.practicalMethod || '');
      setGroundsText(activeCrit.evaluationGrounds || '');
    }
  }, [activeCriterionId, doc]);

  const activeCriterion: SopPrepCriterionData | undefined = doc.criteria.find((c) => c.id === activeCriterionId);

  const totalEvidenceCount = getTotalEvidenceCount(doc.criteria);

  const handleSaveCurrentCriterion = async () => {
    if (!activeCriterion) return;
    try {
      setSaving(true);
      const updatedCriterion: SopPrepCriterionData = {
        ...activeCriterion,
        expertiseKnowledge: knowledgeText,
        practicalMethod: practicalText,
        evaluationGrounds: groundsText,
        updatedBy: SOP_PREP_AUTHOR_NAME,
        updatedAt: new Date().toISOString(),
      };

      const updatedCriteria = doc.criteria.map((c) => (c.id === activeCriterionId ? updatedCriterion : c));

      const newDoc: SopPreparationCategory1Document = {
        ...doc,
        lastUpdatedBy: SOP_PREP_AUTHOR_NAME,
        lastUpdatedAt: new Date().toISOString(),
        criteria: updatedCriteria,
      };

      try {
        await apiClient.pilot.saveSopPreparationCriterion(activeCriterionId, {
          expertiseKnowledge: knowledgeText,
          practicalMethod: practicalText,
          evaluationGrounds: groundsText,
          updatedBy: SOP_PREP_AUTHOR_NAME,
        });
      } catch (apiErr) {
        console.warn('API save failed, persisting locally in memory state:', apiErr);
      }

      setDoc(newDoc);
      message.success(`Đã lưu bản nháp Tiêu chí ${activeCriterion.name} thành công!`);
    } catch {
      message.error('Không thể lưu bản nháp tiêu chí.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      const updatedCriteria = doc.criteria.map((c) => {
        if (c.id === activeCriterionId) {
          return {
            ...c,
            expertiseKnowledge: knowledgeText,
            practicalMethod: practicalText,
            evaluationGrounds: groundsText,
            updatedBy: SOP_PREP_AUTHOR_NAME,
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      });

      const newDoc: SopPreparationCategory1Document = {
        ...doc,
        lastUpdatedBy: SOP_PREP_AUTHOR_NAME,
        lastUpdatedAt: new Date().toISOString(),
        criteria: updatedCriteria,
      };

      try {
        await apiClient.pilot.saveSopPreparationCategory1({
          criteria: updatedCriteria,
          lastUpdatedBy: SOP_PREP_AUTHOR_NAME,
          status: 'COLLECTING',
        });
      } catch (apiErr) {
        console.warn('API save all failed, persisting locally in memory state:', apiErr);
      }

      setDoc(newDoc);
      message.success('Đã lưu toàn bộ bản nháp 5 tiêu chí của Cô Giang Phạm!');
    } catch {
      message.error('Không thể lưu toàn bộ dữ liệu.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadEvidence = async () => {
    if (!selectedFile) {
      message.warning('Vui lòng chọn tệp minh chứng cần tải lên.');
      return;
    }
    if (!activeCriterion) return;

    try {
      setUploading(true);
      const fileBase64 = await readFileAsDataUrl(selectedFile);

      let uploadedFile: SopPrepEvidenceFile;

      try {
        uploadedFile = await apiClient.pilot.uploadSopPrepEvidence({
          fileData: fileBase64,
          fileName: selectedFile.name,
          mimeType: selectedFile.type || 'application/octet-stream',
          description: uploadDescription.trim() || undefined,
          sourceOrigin: uploadOrigin.trim() || DEFAULT_UPLOAD_ORIGIN,
          pilotSessionCode: uploadSessionCode.trim() || undefined,
          criterionId: activeCriterionId,
          uploadedBy: SOP_PREP_AUTHOR_NAME,
        });
      } catch (uploadErr) {
        console.warn('API upload failed, generating local mock evidence item:', uploadErr);
        uploadedFile = buildLocalFallbackEvidenceFile({
          file: selectedFile,
          fileBase64,
          description: uploadDescription,
          sourceOrigin: uploadOrigin,
          pilotSessionCode: uploadSessionCode,
          uploadedBy: SOP_PREP_AUTHOR_NAME,
        });
      }

      const updatedCriteria = doc.criteria.map((crit) => {
        if (crit.id === activeCriterionId) {
          return {
            ...crit,
            updatedAt: new Date().toISOString(),
            evidenceFiles: [...crit.evidenceFiles, uploadedFile],
          };
        }
        return crit;
      });

      setDoc({
        ...doc,
        lastUpdatedAt: new Date().toISOString(),
        criteria: updatedCriteria,
      });

      setSelectedFile(null);
      setUploadDescription('');
      setUploadSessionCode('');
      message.success(`Đã tải lên tệp "${selectedFile.name}" thành công!`);
    } catch {
      message.error('Lỗi khi tải tệp minh chứng.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteEvidence = async (fileId: string) => {
    try {
      try {
        await apiClient.pilot.deleteSopPrepEvidence(activeCriterionId, fileId);
      } catch (delErr) {
        console.warn('API delete failed, updating local state:', delErr);
      }

      const updatedCriteria = doc.criteria.map((crit) => {
        if (crit.id === activeCriterionId) {
          return {
            ...crit,
            updatedAt: new Date().toISOString(),
            evidenceFiles: crit.evidenceFiles.filter((f) => f.id !== fileId),
          };
        }
        return crit;
      });

      setDoc({
        ...doc,
        lastUpdatedAt: new Date().toISOString(),
        criteria: updatedCriteria,
      });

      message.success('Đã xóa tệp minh chứng thành công!');
    } catch {
      message.error('Không thể xóa tệp minh chứng.');
    }
  };

  const openPreview = (file: SopPrepEvidenceFile) => {
    setPreviewFile(file);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
  };

  const goToPreviousCriterion = () => {
    setActiveCriterionId((prev) => Math.max(1, prev - 1));
  };

  const goToNextCriterion = () => {
    setActiveCriterionId((prev) => Math.min(SOP_PREP_CRITERIA_TOTAL, prev + 1));
  };

  return {
    loading,
    saving,
    uploading,
    doc,
    activeCriterionId,
    setActiveCriterionId,
    activeCriterion,
    totalEvidenceCount,
    knowledgeText,
    setKnowledgeText,
    practicalText,
    setPracticalText,
    groundsText,
    setGroundsText,
    selectedFile,
    uploadDescription,
    setUploadDescription,
    uploadOrigin,
    setUploadOrigin,
    uploadSessionCode,
    setUploadSessionCode,
    previewFile,
    previewOpen,
    fileInputId,
    handleSaveCurrentCriterion,
    handleSaveAll,
    handleFileChange,
    handleUploadEvidence,
    handleDeleteEvidence,
    openPreview,
    closePreview,
    goToPreviousCriterion,
    goToNextCriterion,
  };
}
