'use client';

import React from 'react';
import { message } from 'antd';
import { isAcademyBuomCourse, type AcademyCourse } from '@mos-lab/shared';
import type {
  AcademyTalentAssessmentView,
  AcademyTalentCourseSelectionRule,
  AcademyTalentDraft,
  AcademyTalentErrorKey,
  AcademyTalentLead,
  AcademyTalentMilestone,
  AcademyTalentPricing,
  AcademyTalentResult,
} from '../academy-talent-workshop.types';
import {
  isBuomUnlockedForMilestones,
  normalizeDraft,
  retainInstructorSelections,
  stripLockedBuomCourses,
  withDefaultDeposit,
} from './workshop-drawer-utils';

export interface UseWorkshopSessionActionsOptions {
  lead: AcademyTalentLead | null;
  draft: AcademyTalentDraft;
  setDraft: React.Dispatch<React.SetStateAction<AcademyTalentDraft>>;
  setView: React.Dispatch<React.SetStateAction<AcademyTalentAssessmentView | null>>;
  displayView: AcademyTalentAssessmentView | null | undefined;
  isIssued: boolean;
  nextSessionNumber: number;
  pricing: AcademyTalentPricing | null | undefined;
  result: AcademyTalentResult | null | undefined;
  milestones: AcademyTalentMilestone[];
  coursesById: Map<number, AcademyCourse>;
  buomUnlocked: boolean;
  courseSelectionRules: Record<number, AcademyTalentCourseSelectionRule>;
  setIsNewSession: React.Dispatch<React.SetStateAction<boolean>>;
  setStep: React.Dispatch<React.SetStateAction<1 | 2>>;
  setBusyAction: React.Dispatch<React.SetStateAction<'save' | 'invoice' | 'payment' | 'session' | null>>;
  setPrintView: React.Dispatch<React.SetStateAction<AcademyTalentAssessmentView | null>>;
  setPrintPreviewOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setPrintDocument: React.Dispatch<React.SetStateAction<'INVOICE' | 'FOLLOW_UP' | null>>;
  setInstructorMenuCourseId: React.Dispatch<React.SetStateAction<number | null>>;
  resetQuoteState: (dirty: boolean) => void;
  onSaveDraft: (draft: AcademyTalentDraft) => Promise<AcademyTalentAssessmentView>;
  onIssueInvoice: (draft: AcademyTalentDraft) => Promise<AcademyTalentAssessmentView>;
  onMarkInvoicePrinted?: (assessmentId: number) => Promise<void>;
  onSelectSession?: (assessmentId: number) => Promise<AcademyTalentAssessmentView>;
  onStartNewSession?: () => void;
  onSaved?: (assessment: AcademyTalentAssessmentView) => void | Promise<void>;
}

export function useWorkshopSessionActions({
  lead,
  draft,
  setDraft,
  setView,
  displayView,
  isIssued,
  nextSessionNumber,
  pricing,
  result,
  milestones,
  coursesById,
  buomUnlocked,
  courseSelectionRules,
  setIsNewSession,
  setStep,
  setBusyAction,
  setPrintView,
  setPrintPreviewOpen,
  setPrintDocument,
  setInstructorMenuCourseId,
  resetQuoteState,
  onSaveDraft,
  onIssueInvoice,
  onMarkInvoicePrinted,
  onSelectSession,
  onStartNewSession,
  onSaved,
}: UseWorkshopSessionActionsOptions) {
  const updateQuoteDraft = React.useCallback(
    (updater: (current: AcademyTalentDraft) => AcademyTalentDraft) => {
      resetQuoteState(true);
      setDraft((current) => {
        const next = updater(current);
        const unlocked = isBuomUnlockedForMilestones(milestones, next.strands5Min, next.errors);
        return stripLockedBuomCourses(next, coursesById, unlocked);
      });
    },
    [coursesById, milestones, resetQuoteState, setDraft]
  );

  const updateAssessmentOnlyDraft = React.useCallback(
    (updater: (current: AcademyTalentDraft) => AcademyTalentDraft) => {
      setDraft(updater);
    },
    [setDraft]
  );

  const persist = React.useCallback(
    async (nextDraft = draft) => {
      if (!lead) return null;
      setBusyAction('save');
      try {
        const saved = await onSaveDraft(normalizeDraft(nextDraft));
        setView(saved);
        setIsNewSession(false);
        setDraft(normalizeDraft(saved.draft));
        resetQuoteState(false);
        await onSaved?.(saved);
        return saved;
      } catch (error: any) {
        message.error(error?.response?.data?.message || error?.message || 'Không thể lưu đánh giá Tố Chất.');
        return null;
      } finally {
        setBusyAction(null);
      }
    },
    [draft, lead, onSaveDraft, onSaved, resetQuoteState, setBusyAction, setDraft, setIsNewSession, setView]
  );

  const saveAssessment = React.useCallback(async () => {
    const saved = await persist();
    if (saved) message.success('Đã lưu chấm điểm.');
  }, [persist]);

  const saveSelection = React.useCallback(async () => {
    await persist();
  }, [persist]);

  const setErrorCount = React.useCallback(
    (key: AcademyTalentErrorKey, delta: number) => {
      updateQuoteDraft((current) => ({
        ...current,
        errors: {
          ...current.errors,
          [key]: Math.max(0, current.errors[key] + delta),
        },
      }));
    },
    [updateQuoteDraft]
  );

  const setCourseSelected = React.useCallback(
    (courseId: number) => {
      const targetCourse = coursesById.get(courseId);
      if (isAcademyBuomCourse(targetCourse) && !buomUnlocked) {
        message.warning('Khóa Bướm chỉ mở khóa khi đạt bậc Thiên Thần Bóng Tối (35+ sợi, ≤ 5 lỗi).');
        return;
      }
      updateQuoteDraft((current) => {
        const selected = new Set(current.selectedCourseIds);
        const rule: AcademyTalentCourseSelectionRule = courseSelectionRules[courseId] || { kind: 'COURSE' };
        const isSelected = selected.has(courseId);

        if (isSelected) {
          selected.delete(courseId);
          return {
            ...current,
            selectedCourseIds: [...selected],
            selectedSampleCourseIds: current.selectedSampleCourseIds.filter((id) => id !== courseId),
            selectedKitCourseIds: current.selectedKitCourseIds.filter((id) => id !== courseId),
            selectedInstructorIdsByCourse: retainInstructorSelections(current.selectedInstructorIdsByCourse, selected),
            primaryCourseId: current.primaryCourseId === courseId ? null : current.primaryCourseId,
            paymentMode: selected.size ? current.paymentMode : 'THINKING',
          };
        }

        if (rule.kind === 'COMBO') {
          // Legacy sales flow treats a combo as the complete curriculum: it
          // intentionally replaces every individual course selection.
          selected.clear();
          selected.add(courseId);
          return {
            ...current,
            selectedCourseIds: [...selected],
            selectedSampleCourseIds: current.selectedSampleCourseIds.filter((id) => id === courseId),
            selectedKitCourseIds: current.selectedKitCourseIds.filter((id) => id === courseId),
            selectedInstructorIdsByCourse: retainInstructorSelections(current.selectedInstructorIdsByCourse, selected),
            primaryCourseId: courseId,
            paymentMode: current.paymentMode === 'THINKING' ? 'DEPOSIT' : current.paymentMode,
          };
        }

        // An individual course can be combined with other individual courses,
        // but it must first remove a previously selected full combo.
        for (const selectedId of selected) {
          if ((courseSelectionRules[selectedId] || { kind: 'COURSE' }).kind === 'COMBO') selected.delete(selectedId);
        }
        selected.add(courseId);
        return {
          ...current,
          selectedCourseIds: [...selected],
          selectedSampleCourseIds: current.selectedSampleCourseIds.filter((id) => selected.has(id)),
          selectedKitCourseIds: current.selectedKitCourseIds.filter((id) => selected.has(id)),
          selectedInstructorIdsByCourse: retainInstructorSelections(current.selectedInstructorIdsByCourse, selected),
          primaryCourseId:
            current.primaryCourseId && selected.has(current.primaryCourseId) ? current.primaryCourseId : courseId,
          paymentMode: current.paymentMode === 'THINKING' ? 'DEPOSIT' : current.paymentMode,
        };
      });
    },
    [buomUnlocked, courseSelectionRules, coursesById, updateQuoteDraft]
  );

  const setCourseAddOnSelected = React.useCallback(
    (courseId: number, kind: 'SAMPLE' | 'KIT') => {
      updateQuoteDraft((current) => {
        if (!current.selectedCourseIds.includes(courseId)) return current;
        const field = kind === 'SAMPLE' ? 'selectedSampleCourseIds' : 'selectedKitCourseIds';
        const selected = new Set(current[field]);
        if (selected.has(courseId)) selected.delete(courseId);
        else selected.add(courseId);
        return { ...current, [field]: [...selected] };
      });
    },
    [updateQuoteDraft]
  );

  const setCourseInstructor = React.useCallback(
    (courseId: number, instructorId: number) => {
      updateQuoteDraft((current) => {
        if (!current.selectedCourseIds.includes(courseId)) return current;
        return {
          ...current,
          selectedInstructorIdsByCourse: {
            ...current.selectedInstructorIdsByCourse,
            [String(courseId)]: instructorId,
          },
        };
      });
      setInstructorMenuCourseId(null);
    },
    [setInstructorMenuCourseId, updateQuoteDraft]
  );

  const openInvoicePreview = React.useCallback(() => {
    if (!lead) return;
    if (!draft.selectedCourseIds.length) {
      message.warning('Chọn ít nhất một khóa học trước khi xem phiếu.');
      return;
    }
    if (!result || !pricing) {
      message.info('Đang tính báo giá theo lựa chọn khóa học. Vui lòng thử lại sau giây lát.');
      return;
    }

    const now = new Date().toISOString();
    const previewDraft = withDefaultDeposit(draft, pricing.suggestedDepositVnd);
    const previewAssessment: AcademyTalentAssessmentView = displayView
      ? {
          ...displayView,
          draft: previewDraft,
          result,
          pricing,
        }
      : {
          id: 0,
          sessionNumber: nextSessionNumber,
          status: 'DRAFT',
          draft: previewDraft,
          result,
          pricing,
          invoice: null,
          payment: {
            status: 'UNPAID',
            totalPaidVnd: 0,
            remainingVnd: Math.max(0, pricing.finalTotalVnd),
            payments: [],
          },
          createdAt: now,
          updatedAt: now,
        };

    setPrintView(previewAssessment);
    setPrintPreviewOpen(true);
  }, [displayView, draft, lead, nextSessionNumber, pricing, result, setPrintPreviewOpen, setPrintView]);

  const issueInvoiceAndOpenPreview = React.useCallback(
    async (openNativeDialog = false) => {
      if (!lead) return;
      // An issued assessment already has an immutable server invoice.  Reprints
      // must not depend on a historical draft still containing course ids.
      if (!isIssued && !draft.selectedCourseIds.length) {
        message.warning('Chọn ít nhất một khóa học trước khi in phiếu.');
        return;
      }
      // Legacy drafts may contain selected courses but no payment choice. The
      // source flow treats the scholarship deposit as the default, so resolve it
      // before saving instead of letting the API reject the print request with
      // no visible document.
      const draftForInvoice = !isIssued ? withDefaultDeposit(draft, pricing?.suggestedDepositVnd) : draft;
      setBusyAction('invoice');
      try {
        if (draftForInvoice !== draft) {
          setDraft(draftForInvoice);
          message.info('Đã áp dụng cọc giữ suất học bổng mặc định để lập phiếu.');
        }
        const issued = await onIssueInvoice(normalizeDraft(draftForInvoice));
        setView(issued);
        setDraft(normalizeDraft(issued.draft));
        resetQuoteState(false);
        setPrintView(issued);
        await onSaved?.(issued);
        if (onMarkInvoicePrinted) await onMarkInvoicePrinted(issued.id);
        // Let the consultant inspect the immutable document before opening the
        // native printer. The print-only copy stays mounted for the print media
        // rule, while this preview is the visible operational hand-off.
        setPrintPreviewOpen(true);
        if (openNativeDialog) {
          setPrintDocument('INVOICE');
          window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
        }
      } catch (error: any) {
        message.error(error?.response?.data?.message || error?.message || 'Không thể tạo phiếu học phí.');
      } finally {
        setBusyAction(null);
      }
    },
    [
      draft,
      isIssued,
      lead,
      onIssueInvoice,
      onMarkInvoicePrinted,
      onSaved,
      pricing?.suggestedDepositVnd,
      resetQuoteState,
      setBusyAction,
      setDraft,
      setPrintDocument,
      setPrintPreviewOpen,
      setPrintView,
      setView,
    ]
  );

  const selectSession = React.useCallback(
    async (assessmentId: number) => {
      if (!onSelectSession || assessmentId === displayView?.id) return;
      setBusyAction('session');
      try {
        const selected = await onSelectSession(assessmentId);
        setView(selected);
        setIsNewSession(false);
        setDraft(normalizeDraft(selected.draft));
        setPrintView(selected.invoice ? selected : null);
        setPrintPreviewOpen(false);
        resetQuoteState(!selected.invoice);
        setStep(1);
      } catch (error: any) {
        message.error(error?.response?.data?.message || error?.message || 'Không thể mở lần test này.');
      } finally {
        setBusyAction(null);
      }
    },
    [
      displayView?.id,
      onSelectSession,
      resetQuoteState,
      setBusyAction,
      setDraft,
      setIsNewSession,
      setPrintPreviewOpen,
      setPrintView,
      setStep,
      setView,
    ]
  );

  const startNewSession = React.useCallback(() => {
    if (!onStartNewSession) return;
    onStartNewSession();
    setView(null);
    setIsNewSession(true);
    setDraft(normalizeDraft(null));
    setPrintView(null);
    setPrintPreviewOpen(false);
    resetQuoteState(false);
    setStep(1);
    message.info(`Đang soạn lần test #${nextSessionNumber}. Bấm Lưu để tạo phiên.`);
  }, [
    nextSessionNumber,
    onStartNewSession,
    resetQuoteState,
    setDraft,
    setIsNewSession,
    setPrintPreviewOpen,
    setPrintView,
    setStep,
    setView,
  ]);

  return {
    updateQuoteDraft,
    updateAssessmentOnlyDraft,
    saveAssessment,
    saveSelection,
    setErrorCount,
    setCourseSelected,
    setCourseAddOnSelected,
    setCourseInstructor,
    openInvoicePreview,
    issueInvoiceAndOpenPreview,
    selectSession,
    startNewSession,
  };
}
