'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import {
  DEFAULT_TELESALE_CONFIG_VERSION,
  TelesaleCompetencyConfigVersion,
  TelesaleConfigPreviewResult,
  TelesaleConfigValidationResult,
  TelesalePillarAKpiConfig,
  TelesaleTier,
  TelesaleTierPromotionRule,
} from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import {
  calculatePillarsSum,
  cloneConfigVersion,
  LevelTargetNumericField,
  PillarWeightKey,
  updateLevelTargetList,
} from './telesaleConfigHelpers';

export function useTelesaleConfigState(currentMonth: string) {
  const [versions, setVersions] = useState<TelesaleCompetencyConfigVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [currentConfig, setCurrentConfig] = useState<TelesaleCompetencyConfigVersion>(DEFAULT_TELESALE_CONFIG_VERSION);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);

  const [validationResult, setValidationResult] = useState<TelesaleConfigValidationResult | null>(null);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState<boolean>(false);

  const [previewResult, setPreviewResult] = useState<TelesaleConfigPreviewResult | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [publishEffectiveMonth, setPublishEffectiveMonth] = useState<string>(currentMonth);

  const fetchVersions = useCallback(
    async (selectId?: string) => {
      setLoading(true);
      try {
        const list = await apiClient.telesaleCompetency.listConfigVersions();
        setVersions(list);
        if (list.length > 0) {
          const nextId =
            selectId ||
            (selectedVersionId && list.some((v) => v.versionId === selectedVersionId)
              ? selectedVersionId
              : list[0].versionId);
          setSelectedVersionId(nextId);
          const active = list.find((v) => v.versionId === nextId) || list[0];
          setCurrentConfig(cloneConfigVersion(active));
        }
      } catch (err: any) {
        message.error(err?.message || 'Không thể tải danh sách phiên bản cấu hình');
      } finally {
        setLoading(false);
      }
    },
    [selectedVersionId]
  );

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleSelectVersion = useCallback(
    (versionId: string) => {
      setSelectedVersionId(versionId);
      const found = versions.find((v) => v.versionId === versionId);
      if (found) {
        setCurrentConfig(cloneConfigVersion(found));
        setValidationResult(null);
      }
    },
    [versions]
  );

  const isDraft = currentConfig.status === 'DRAFT';

  const pillarsSum = useMemo(() => calculatePillarsSum(currentConfig.pillarsWeight), [currentConfig.pillarsWeight]);

  const handleCreateDraft = useCallback(
    async (cloneCurrent = false) => {
      setSaving(true);
      try {
        const payload: Partial<TelesaleCompetencyConfigVersion> = cloneCurrent
          ? {
              ...currentConfig,
              name: `${currentConfig.name} (Bản nháp mới)`,
              effectiveDate: dayjs().add(1, 'month').format('YYYY-MM'),
            }
          : {
              name: `Khung Năng Lực Dự Thảo ${dayjs().format('MM/YYYY')}`,
              effectiveDate: dayjs().add(1, 'month').format('YYYY-MM'),
            };

        const newDraft = await apiClient.telesaleCompetency.createDraftVersion(payload);
        message.success(`Đã tạo bản nháp "${newDraft.name}" thành công!`);
        await fetchVersions(newDraft.versionId);
      } catch (err: any) {
        message.error(err?.message || 'Lỗi tạo bản nháp');
      } finally {
        setSaving(false);
      }
    },
    [currentConfig, fetchVersions]
  );

  const handleSaveDraft = useCallback(async () => {
    if (!isDraft) return;
    setSaving(true);
    try {
      const updated = await apiClient.telesaleCompetency.updateDraftVersion(currentConfig.versionId, currentConfig);
      message.success('Đã lưu các thay đổi của bản nháp thành công!');
      setCurrentConfig(cloneConfigVersion(updated));
      await fetchVersions(updated.versionId);
    } catch (err: any) {
      message.error(err?.message || 'Lỗi lưu bản nháp');
    } finally {
      setSaving(false);
    }
  }, [currentConfig, fetchVersions, isDraft]);

  const handleDeleteDraftConfirm = useCallback(async () => {
    if (!isDraft) return;
    try {
      await apiClient.telesaleCompetency.deleteDraftVersion(currentConfig.versionId);
      message.success('Đã xóa bản nháp thành công');
      setIsDeleteModalOpen(false);
      await fetchVersions();
    } catch (err: any) {
      message.error(err?.message || 'Lỗi xóa bản nháp');
    }
  }, [currentConfig.versionId, fetchVersions, isDraft]);

  const handleValidate = useCallback(async () => {
    try {
      const result = await apiClient.telesaleCompetency.validateConfigVersion(currentConfig.versionId);
      setValidationResult(result);
      setIsValidationModalOpen(true);
    } catch (err: any) {
      message.error(err?.message || 'Lỗi kiểm tra tính hợp lệ');
    }
  }, [currentConfig.versionId]);

  const handlePreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const result = await apiClient.telesaleCompetency.previewCalculation(currentConfig.versionId, currentMonth);
      setPreviewResult(result);
      setIsPreviewModalOpen(true);
    } catch (err: any) {
      message.error(err?.message || 'Lỗi xem trước kết quả tính điểm');
    } finally {
      setPreviewLoading(false);
    }
  }, [currentConfig.versionId, currentMonth]);

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    try {
      const published = await apiClient.telesaleCompetency.publishConfigVersion(
        currentConfig.versionId,
        publishEffectiveMonth
      );
      message.success(`Đã ban hành chính thức phiên bản "${published.name}" áp dụng từ kỳ ${published.effectiveDate}!`);
      setIsPublishModalOpen(false);
      await fetchVersions(published.versionId);
    } catch (err: any) {
      message.error(err?.message || 'Lỗi ban hành cấu hình');
    } finally {
      setPublishing(false);
    }
  }, [currentConfig.versionId, fetchVersions, publishEffectiveMonth]);

  const openPublishModal = useCallback(() => {
    setPublishEffectiveMonth(currentConfig.effectiveDate || currentMonth);
    setIsPublishModalOpen(true);
  }, [currentConfig.effectiveDate, currentMonth]);

  const updatePillarWeight = useCallback((key: PillarWeightKey, value: number) => {
    setCurrentConfig((prev) => ({
      ...prev,
      pillarsWeight: { ...prev.pillarsWeight, [key]: value },
    }));
  }, []);

  const updatePillarAConfig = useCallback((updater: (prev: TelesalePillarAKpiConfig) => TelesalePillarAKpiConfig) => {
    setCurrentConfig((prev) => ({
      ...prev,
      pillarAConfig: updater(prev.pillarAConfig),
    }));
  }, []);

  const updateLevelTarget = useCallback((index: number, field: LevelTargetNumericField, value: number) => {
    setCurrentConfig((prev) => ({
      ...prev,
      levelTargets: updateLevelTargetList(prev.levelTargets, index, field, value),
    }));
  }, []);

  const updateTierRule = useCallback((tierKey: TelesaleTier, patch: Partial<TelesaleTierPromotionRule>) => {
    setCurrentConfig((prev) => ({
      ...prev,
      tierRules: {
        ...prev.tierRules,
        [tierKey]: { ...prev.tierRules[tierKey], ...patch },
      },
    }));
  }, []);

  return {
    versions,
    selectedVersionId,
    currentConfig,
    setCurrentConfig,
    loading,
    saving,
    publishing,
    isDraft,
    pillarsSum,
    validationResult,
    isValidationModalOpen,
    setIsValidationModalOpen,
    previewResult,
    isPreviewModalOpen,
    setIsPreviewModalOpen,
    previewLoading,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isPublishModalOpen,
    setIsPublishModalOpen,
    publishEffectiveMonth,
    setPublishEffectiveMonth,
    handleSelectVersion,
    handleCreateDraft,
    handleSaveDraft,
    handleDeleteDraftConfirm,
    handleValidate,
    handlePreview,
    handlePublish,
    openPublishModal,
    updatePillarWeight,
    updatePillarAConfig,
    updateLevelTarget,
    updateTierRule,
  };
}
