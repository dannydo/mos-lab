'use client';

import React from 'react';
import { message } from 'antd';
import type { AcademyTalentAssessment, AcademyWorkshopParticipant } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { buildTalentSessions, talentAssessmentRequest, talentWorkshopView } from '../lead-manager/lead-manager.helpers';
import type {
  AcademyTalentAssessmentView,
  AcademyTalentDraft,
  AcademyTalentLead,
} from './academy-talent-workshop.types';

export function useAcademyWorkshopTalentAssessment(selectedParticipant: AcademyWorkshopParticipant | null) {
  const [talentLead, setTalentLead] = React.useState<AcademyTalentLead | null>(null);
  const [talentParticipantId, setTalentParticipantId] = React.useState<number | null>(null);
  const [talentOpen, setTalentOpen] = React.useState(false);
  const [talentAssessments, setTalentAssessments] = React.useState<AcademyTalentAssessment[]>([]);
  const [talentAssessmentId, setTalentAssessmentId] = React.useState<number | null>(null);
  const [talentLoading, setTalentLoading] = React.useState(false);
  const [talentSaving, setTalentSaving] = React.useState(false);
  const talentLoadVersionRef = React.useRef(0);
  const talentAssessmentIdRef = React.useRef<number | null>(null);

  const closeTalentAssessment = React.useCallback(() => {
    talentLoadVersionRef.current += 1;
    setTalentOpen(false);
    setTalentLead(null);
    setTalentParticipantId(null);
    setTalentAssessments([]);
    setTalentLoading(false);
    talentAssessmentIdRef.current = null;
    setTalentAssessmentId(null);
  }, []);

  const openTalentAssessment = React.useCallback(
    async (participantOverride?: AcademyWorkshopParticipant) => {
      const participant = participantOverride || selectedParticipant;
      if (!participant) return;
      const version = ++talentLoadVersionRef.current;
      setTalentOpen(true);
      setTalentLoading(true);
      setTalentLead(null);
      setTalentParticipantId(participant.id);
      setTalentAssessments([]);
      talentAssessmentIdRef.current = null;
      setTalentAssessmentId(null);
      try {
        const [lead, response] = await Promise.all([
          apiClient.academySales.getLead(participant.lead.id),
          apiClient.academySales.listTalentAssessments(participant.lead.id),
        ]);
        if (version !== talentLoadVersionRef.current) return;
        setTalentLead(lead);
        setTalentAssessments(response.data);
        const requestedAssessmentId = participant.talent?.assessmentId;
        const nextAssessmentId =
          requestedAssessmentId && response.data.some((assessment) => assessment.id === requestedAssessmentId)
            ? requestedAssessmentId
            : null;
        talentAssessmentIdRef.current = nextAssessmentId;
        setTalentAssessmentId(nextAssessmentId);
      } catch (cause: any) {
        if (version !== talentLoadVersionRef.current) return;
        closeTalentAssessment();
        message.error(cause?.response?.data?.message || 'Không thể tải phiên Tố Chất.');
      } finally {
        if (version === talentLoadVersionRef.current) setTalentLoading(false);
      }
    },
    [closeTalentAssessment, selectedParticipant]
  );

  const selectedTalentAssessment = React.useMemo(
    () => talentAssessments.find((assessment) => assessment.id === talentAssessmentId) ?? null,
    [talentAssessmentId, talentAssessments]
  );
  const selectedTalentView = React.useMemo<AcademyTalentAssessmentView | null>(
    () => (selectedTalentAssessment ? talentWorkshopView(selectedTalentAssessment, talentAssessments) : null),
    [selectedTalentAssessment, talentAssessments]
  );
  const talentSessions = React.useMemo(() => buildTalentSessions(talentAssessments), [talentAssessments]);

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
      if (!talentLead || !talentParticipantId) throw new Error('Chưa chọn học viên workshop.');
      setTalentSaving(true);
      try {
        const dto = talentAssessmentRequest(draft);
        const activeAssessmentId = talentAssessmentIdRef.current;
        const response = activeAssessmentId
          ? await apiClient.academySales.updateTalentAssessment(activeAssessmentId, dto)
          : await apiClient.academySales.createTalentAssessment(talentLead.id, {
              ...dto,
              workshopParticipantId: talentParticipantId,
            });
        return upsertTalentAssessment(response.data);
      } finally {
        setTalentSaving(false);
      }
    },
    [talentLead, talentParticipantId, upsertTalentAssessment]
  );

  const previewTalentQuote = React.useCallback(
    async (draft: AcademyTalentDraft) => {
      if (!talentLead) throw new Error('Chưa chọn học viên workshop.');
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

  return {
    talentLead,
    talentParticipantId,
    talentOpen,
    talentAssessments,
    talentAssessmentId,
    talentLoading,
    talentSaving,
    selectedTalentView,
    talentSessions,
    openTalentAssessment,
    closeTalentAssessment,
    saveTalentDraft,
    previewTalentQuote,
    issueTalentInvoice,
    recordTalentPayment,
    selectTalentSession,
    startNewTalentSession,
  };
}
