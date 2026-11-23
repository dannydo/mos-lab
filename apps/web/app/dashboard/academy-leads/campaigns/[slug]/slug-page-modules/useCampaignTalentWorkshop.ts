'use client';

import React from 'react';
import { message } from 'antd';
import type { AcademyCourse, AcademyTalentAssessment } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { useAcademyTalentLadderConfiguration } from '../../../components/useAcademyTalentLadderConfiguration';
import { academyTalentCourseSelectionRules } from '../../../components/academy-talent-workshop.adapter';
import type {
  AcademyTalentAssessmentView,
  AcademyTalentDraft,
  AcademyTalentLead,
} from '../../../components/academy-talent-workshop.types';
import { talentAssessmentRequest, talentSessionNumber, talentWorkshopView } from '../academy-campaign-detail.helpers';

type UseCampaignTalentWorkshopOptions = {
  enabled: boolean;
  courses: AcademyCourse[];
};

function readTalentErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return fallback;
}

export function useCampaignTalentWorkshop({ enabled, courses }: UseCampaignTalentWorkshopOptions) {
  const [talentLead, setTalentLead] = React.useState<AcademyTalentLead | null>(null);
  const [talentOpen, setTalentOpen] = React.useState(false);
  const [talentAssessments, setTalentAssessments] = React.useState<AcademyTalentAssessment[]>([]);
  const [talentAssessmentId, setTalentAssessmentId] = React.useState<number | null>(null);
  const [talentLoading, setTalentLoading] = React.useState(false);
  const [talentSaving, setTalentSaving] = React.useState(false);
  const talentLoadVersionRef = React.useRef(0);
  const talentAssessmentIdRef = React.useRef<number | null>(null);

  const talentLadder = useAcademyTalentLadderConfiguration(enabled);

  const closeTalentWorkshop = React.useCallback(() => {
    talentLoadVersionRef.current += 1;
    setTalentOpen(false);
    setTalentLead(null);
    setTalentAssessments([]);
    talentAssessmentIdRef.current = null;
    setTalentAssessmentId(null);
  }, []);

  const openTalentWorkshop = React.useCallback(async (lead: AcademyTalentLead) => {
    const version = ++talentLoadVersionRef.current;
    setTalentLead(lead);
    setTalentOpen(true);
    setTalentLoading(true);
    setTalentAssessments([]);
    talentAssessmentIdRef.current = null;
    setTalentAssessmentId(null);
    try {
      const response = await apiClient.academySales.listTalentAssessments(lead.id);
      if (version !== talentLoadVersionRef.current) return;
      setTalentAssessments(response.data);
      talentAssessmentIdRef.current = response.latest?.id ?? null;
      setTalentAssessmentId(response.latest?.id ?? null);
    } catch (loadError) {
      if (version !== talentLoadVersionRef.current) return;
      message.error(readTalentErrorMessage(loadError, 'Không thể tải các lần test Tố Chất.'));
    } finally {
      if (version === talentLoadVersionRef.current) setTalentLoading(false);
    }
  }, []);

  const selectedTalentAssessment = React.useMemo(
    () => talentAssessments.find((item) => item.id === talentAssessmentId) ?? null,
    [talentAssessmentId, talentAssessments]
  );

  const selectedTalentView = React.useMemo<AcademyTalentAssessmentView | null>(
    () => (selectedTalentAssessment ? talentWorkshopView(selectedTalentAssessment, talentAssessments) : null),
    [selectedTalentAssessment, talentAssessments]
  );

  const talentSessions = React.useMemo(
    () =>
      talentAssessments.map((item) => ({
        id: item.id,
        sessionNumber: talentSessionNumber(item, talentAssessments),
        status: item.status,
        updatedAt: item.updatedAt,
        invoiceNumber: item.invoice?.documentNumber ?? null,
      })),
    [talentAssessments]
  );

  const upsertTalentAssessment = React.useCallback(
    (assessment: AcademyTalentAssessment) => {
      const next = talentAssessments.some((item) => item.id === assessment.id)
        ? talentAssessments.map((item) => (item.id === assessment.id ? assessment : item))
        : [assessment, ...talentAssessments];
      setTalentAssessments(next);
      talentAssessmentIdRef.current = assessment.id;
      setTalentAssessmentId(assessment.id);
      return talentWorkshopView(assessment, next);
    },
    [talentAssessments]
  );

  const saveTalentDraft = React.useCallback(
    async (draft: AcademyTalentDraft) => {
      if (!talentLead) throw new Error('Chưa chọn học viên Academy cho workshop.');
      setTalentSaving(true);
      try {
        const dto = talentAssessmentRequest(draft);
        const activeAssessmentId = talentAssessmentIdRef.current;
        const response = activeAssessmentId
          ? await apiClient.academySales.updateTalentAssessment(activeAssessmentId, dto)
          : await apiClient.academySales.createTalentAssessment(talentLead.id, dto);
        return upsertTalentAssessment(response.data);
      } finally {
        setTalentSaving(false);
      }
    },
    [talentLead, upsertTalentAssessment]
  );

  const previewTalentQuote = React.useCallback(
    async (draft: AcademyTalentDraft) => {
      if (!talentLead) throw new Error('Chưa chọn học viên Academy cho workshop.');
      const response = await apiClient.academySales.previewTalentAssessmentQuote(talentLead.id, {
        assessmentId: talentAssessmentIdRef.current ?? undefined,
        eyeScore: draft.eyeScore,
        handScore: draft.handScore,
        strands5Min: draft.strands5Min,
        errorSkin: draft.errors.skin,
        errorRoot: draft.errors.root,
        errorStickies: draft.errors.stickies,
        errorDirection: draft.errors.direction,
        selectedCourseIds: draft.selectedCourseIds,
        selectedSampleCourseIds: draft.selectedSampleCourseIds,
        selectedKitCourseIds: draft.selectedKitCourseIds,
        selectedInstructorIdsByCourse: draft.selectedInstructorIdsByCourse,
        paymentMode: draft.paymentMode,
        ...(draft.depositVnd === null ? {} : { depositVnd: draft.depositVnd }),
      });
      return response.data;
    },
    [talentLead]
  );

  const issueTalentInvoice = React.useCallback(
    async (draft: AcademyTalentDraft) => {
      if (selectedTalentAssessment?.payment.status === 'PAID') {
        setTalentSaving(true);
        try {
          const response = await apiClient.academySales.printTalentAssessmentInvoice(selectedTalentAssessment.id);
          return upsertTalentAssessment(response.data);
        } finally {
          setTalentSaving(false);
        }
      }

      const saved = await saveTalentDraft(draft);
      setTalentSaving(true);
      try {
        const response = await apiClient.academySales.printTalentAssessmentInvoice(saved.id);
        return upsertTalentAssessment(response.data);
      } finally {
        setTalentSaving(false);
      }
    },
    [saveTalentDraft, selectedTalentAssessment, upsertTalentAssessment]
  );

  const recordTalentPayment = React.useCallback(
    async (assessmentId: number, input: Parameters<typeof apiClient.academySales.recordTalentAssessmentPayment>[1]) => {
      setTalentSaving(true);
      try {
        const response = await apiClient.academySales.recordTalentAssessmentPayment(assessmentId, input);
        return upsertTalentAssessment(response.data);
      } finally {
        setTalentSaving(false);
      }
    },
    [upsertTalentAssessment]
  );

  const selectTalentSession = React.useCallback(
    async (assessmentId: number) => {
      const assessment = talentAssessments.find((item) => item.id === assessmentId);
      if (!assessment) throw new Error('Không tìm thấy lần test đã chọn.');
      talentAssessmentIdRef.current = assessmentId;
      setTalentAssessmentId(assessmentId);
      return talentWorkshopView(assessment, talentAssessments);
    },
    [talentAssessments]
  );

  const startNewTalentSession = React.useCallback(() => {
    talentAssessmentIdRef.current = null;
  }, []);

  const talentCourseRules = React.useMemo(() => academyTalentCourseSelectionRules(courses), [courses]);

  return {
    talentLead,
    talentOpen,
    talentLoading,
    talentSaving,
    selectedTalentView,
    talentSessions,
    talentCourseRules,
    talentLadder,
    openTalentWorkshop,
    closeTalentWorkshop,
    saveTalentDraft,
    previewTalentQuote,
    issueTalentInvoice,
    recordTalentPayment,
    selectTalentSession,
    startNewTalentSession,
  };
}
