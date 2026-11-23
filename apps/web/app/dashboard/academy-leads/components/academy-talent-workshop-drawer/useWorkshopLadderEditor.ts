'use client';

import React from 'react';
import { message } from 'antd';
import {
  ACADEMY_TALENT_STRANDS_5_MIN_MAX,
  type AcademyTalentAssessmentQuote,
  type AcademyTalentLadderConfiguration,
  type UpdateAcademyTalentLadderConfigurationRequest,
} from '@mos-lab/shared';
import type { AcademyTalentDraft, AcademyTalentLead } from '../academy-talent-workshop.types';
import { clampInteger, createLadderTierKey, normalizeDraft } from './workshop-drawer-utils';

export interface UseWorkshopLadderEditorOptions {
  canEditLadder: boolean;
  ladderConfiguration: AcademyTalentLadderConfiguration | null;
  onSaveLadderConfiguration?: (
    input: UpdateAcademyTalentLadderConfigurationRequest
  ) => Promise<AcademyTalentLadderConfiguration>;
  onPreviewQuote?: (draft: AcademyTalentDraft) => Promise<AcademyTalentAssessmentQuote>;
  lead: AcademyTalentLead | null;
  isIssued: boolean;
  draft: AcademyTalentDraft;
  setPreviewQuote: React.Dispatch<React.SetStateAction<AcademyTalentAssessmentQuote | null>>;
  setPreviewError: React.Dispatch<React.SetStateAction<boolean>>;
  setQuoteDirty: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useWorkshopLadderEditor({
  canEditLadder,
  ladderConfiguration,
  onSaveLadderConfiguration,
  onPreviewQuote,
  lead,
  isIssued,
  draft,
  setPreviewQuote,
  setPreviewError,
  setQuoteDirty,
}: UseWorkshopLadderEditorOptions) {
  const [editMode, setEditMode] = React.useState(false);
  const [ladderConfigurationDraft, setLadderConfigurationDraft] = React.useState<
    UpdateAcademyTalentLadderConfigurationRequest['tiers'] | null
  >(null);
  const [courseConfigurationOpen, setCourseConfigurationOpen] = React.useState(false);
  const [savingLadderConfiguration, setSavingLadderConfiguration] = React.useState(false);

  const closeGlobalEditor = React.useCallback(() => {
    setLadderConfigurationDraft(null);
    setCourseConfigurationOpen(false);
    setEditMode(false);
  }, []);

  const openLadderTierEditor = React.useCallback(
    (_tierKey: string, openFromGlobalControl = false) => {
      if (!canEditLadder || (!editMode && !openFromGlobalControl) || !onSaveLadderConfiguration) return;
      if (!ladderConfiguration) return;
      setLadderConfigurationDraft(
        ladderConfiguration.tiers.map((tier) => ({
          key: tier.key,
          title: tier.title,
          strands: tier.strands,
          scholarshipPercent: tier.scholarshipPercent,
          sampleRewardPercent: tier.sampleRewardPercent,
          kitRewardPercent: tier.kitRewardPercent,
          bubbleHeightPercent: tier.bubbleHeightPercent,
        }))
      );
    },
    [canEditLadder, editMode, ladderConfiguration, onSaveLadderConfiguration]
  );

  const updateLadderConfigurationDraft = React.useCallback(
    (tierKey: string, patch: Partial<UpdateAcademyTalentLadderConfigurationRequest['tiers'][number]>) => {
      setLadderConfigurationDraft(
        (current) => current?.map((tier) => (tier.key === tierKey ? { ...tier, ...patch } : tier)) || current
      );
    },
    []
  );

  const addLadderConfigurationTier = React.useCallback(() => {
    setLadderConfigurationDraft((current) => {
      if (!current || current.length >= 10) return current;
      const highestStrands = Math.max(0, ...current.map((tier) => tier.strands));
      if (highestStrands >= ACADEMY_TALENT_STRANDS_5_MIN_MAX) return current;
      const highestBubble = Math.max(20, ...current.map((tier) => tier.bubbleHeightPercent));
      return [
        ...current,
        {
          key: createLadderTierKey(),
          title: `Mốc ${current.length + 1}`,
          strands: highestStrands + 1,
          scholarshipPercent: 0,
          sampleRewardPercent: 0,
          kitRewardPercent: 0,
          bubbleHeightPercent: Math.min(80, highestBubble + 8),
        },
      ];
    });
  }, []);

  const deleteLadderConfigurationTier = React.useCallback((tierKey: string) => {
    setLadderConfigurationDraft((current) => {
      if (!current || current.length <= 1) return current;
      return current.filter((tier) => tier.key !== tierKey);
    });
  }, []);

  const saveLadderConfiguration = React.useCallback(async () => {
    if (!ladderConfigurationDraft || !onSaveLadderConfiguration) return;
    const tiers = ladderConfigurationDraft.map((tier) => ({
      ...tier,
      title: tier.title.trim(),
      strands: clampInteger(tier.strands, 1, ACADEMY_TALENT_STRANDS_5_MIN_MAX),
      scholarshipPercent: clampInteger(tier.scholarshipPercent, 0, 100),
      sampleRewardPercent: clampInteger(tier.sampleRewardPercent, 0, 100),
      kitRewardPercent: clampInteger(tier.kitRewardPercent, 0, 100),
      bubbleHeightPercent: clampInteger(tier.bubbleHeightPercent, 0, 80),
    }));
    if (tiers.some((tier) => !tier.title)) {
      message.warning('Mỗi bubble phải có tên trước khi lưu.');
      return;
    }
    const uniqueStrands = new Set(tiers.map((tier) => tier.strands));
    if (uniqueStrands.size !== tiers.length) {
      message.warning('Mỗi mốc cần có số sợi riêng, không được trùng nhau.');
      return;
    }
    setSavingLadderConfiguration(true);
    try {
      await onSaveLadderConfiguration({ tiers });
      closeGlobalEditor();
      message.success('Đã lưu bảng quyền lợi cho toàn bộ Academy.');
      // The global percentage is financial policy, not decorative text. Refresh
      // the current unsaved quote so the result cards immediately agree with
      // the bubble the admin has just configured.
      if (onPreviewQuote && lead && !isIssued) {
        try {
          const refreshedQuote = await onPreviewQuote(normalizeDraft(draft));
          setPreviewQuote(refreshedQuote);
          setPreviewError(false);
          setQuoteDirty(true);
        } catch {
          message.warning('Cấu hình đã lưu; báo giá hiện tại sẽ cập nhật ở lần thay đổi điểm tiếp theo.');
        }
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || error?.message || 'Không thể lưu cấu hình bubble.');
    } finally {
      setSavingLadderConfiguration(false);
    }
  }, [
    closeGlobalEditor,
    draft,
    isIssued,
    ladderConfigurationDraft,
    lead,
    onPreviewQuote,
    onSaveLadderConfiguration,
    setPreviewError,
    setPreviewQuote,
    setQuoteDirty,
  ]);

  const toggleGlobalEditMode = React.useCallback(
    (step: 1 | 2) => {
      if (editMode) {
        closeGlobalEditor();
        return;
      }
      setLadderConfigurationDraft(null);
      setEditMode(true);
      if (step === 2) {
        setCourseConfigurationOpen(true);
        return;
      }
      setCourseConfigurationOpen(false);
      openLadderTierEditor('', true);
    },
    [closeGlobalEditor, editMode, openLadderTierEditor]
  );

  return {
    editMode,
    ladderConfigurationDraft,
    setLadderConfigurationDraft,
    courseConfigurationOpen,
    savingLadderConfiguration,
    closeGlobalEditor,
    openLadderTierEditor,
    updateLadderConfigurationDraft,
    addLadderConfigurationTier,
    deleteLadderConfigurationTier,
    saveLadderConfiguration,
    toggleGlobalEditMode,
  };
}
