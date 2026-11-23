'use client';

import { useMemo, useState } from 'react';
import { Form, message } from 'antd';
import type { PilotSession } from '@mos-lab/shared';
import {
  buildIncidentCode,
  DEFAULT_EXPERT_APPROVAL_NOTE,
  INCIDENT_TYPE_LABEL_MAP,
  INITIAL_SAFETY_ATTACHMENTS,
  INITIAL_SAFETY_CONTROL_POINTS,
  INITIAL_SENSITIVE_CASES,
  INITIAL_STAGE_RULES,
  splitLinesToArray,
} from './safety-risk-data';
import type {
  AttachmentFormValues,
  FollowUpMilestone,
  IncidentFormValues,
  IncidentReport,
  PilotSafetyStats,
  SafetyAttachment,
  SafetyControlPoint,
  SafetyRiskTabKey,
  SafetyStageRule,
  SensitiveCaseFormValues,
  SensitiveReactionCase,
  StageRuleFormValues,
} from './safety-risk-types';

export function usePilotSafetyRiskSop(sessions: PilotSession[]) {
  const [activeTab, setActiveTab] = useState<SafetyRiskTabKey>('overview');
  const [isExpertApproved, setIsExpertApproved] = useState<boolean>(false);
  const [expertNote] = useState<string>(DEFAULT_EXPERT_APPROVAL_NOTE);

  const [stageRules, setStageRules] = useState<SafetyStageRule[]>(INITIAL_STAGE_RULES);
  const [controlPoints, setControlPoints] = useState<SafetyControlPoint[]>(INITIAL_SAFETY_CONTROL_POINTS);
  const [attachments, setAttachments] = useState<SafetyAttachment[]>(INITIAL_SAFETY_ATTACHMENTS);
  const [sensitiveCases, setSensitiveCases] = useState<SensitiveReactionCase[]>(INITIAL_SENSITIVE_CASES);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);

  const [isAddIncidentModalOpen, setIsAddIncidentModalOpen] = useState(false);
  const [isAddAttachmentModalOpen, setIsAddAttachmentModalOpen] = useState(false);
  const [isEditStageModalOpen, setIsEditStageModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<SafetyStageRule | null>(null);
  const [isEditCaseModalOpen, setIsEditCaseModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<SensitiveReactionCase | null>(null);
  const [selectedIncidentDetail, setSelectedIncidentDetail] = useState<IncidentReport | null>(null);

  const [incidentForm] = Form.useForm<IncidentFormValues>();
  const [attachmentForm] = Form.useForm<AttachmentFormValues>();
  const [stageForm] = Form.useForm<StageRuleFormValues>();
  const [caseForm] = Form.useForm<SensitiveCaseFormValues>();

  const pilotStats: PilotSafetyStats = useMemo(() => {
    const totalPilotSessions = sessions.length > 0 ? sessions.length : 17;
    const zeroIncidents = incidents.length === 0;
    const safetyRate =
      totalPilotSessions > 0 ? ((totalPilotSessions - incidents.length) / totalPilotSessions) * 100 : 100;
    return {
      totalPilotSessions,
      incidentsCount: incidents.length,
      safetyRate: safetyRate.toFixed(1),
      zeroIncidents,
    };
  }, [sessions, incidents]);

  const handleToggleControlPoint = (id: string) => {
    setControlPoints((prev) => prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)));
  };

  const handleOpenCreateIncidentModal = () => {
    incidentForm.resetFields();
    incidentForm.setFieldsValue({
      incidentTime: new Date().toLocaleString('vi-VN'),
      technicianName: 'Cô Đẫm (KTV)',
      incidentType: 'STINGING_MILD',
      status: 'INVESTIGATING',
    });
    setIsAddIncidentModalOpen(true);
  };

  const handleCreateIncident = (values: IncidentFormValues) => {
    const newCode = buildIncidentCode(incidents.length + 1);
    const newIncident: IncidentReport = {
      id: `inc-${Date.now()}`,
      code: newCode,
      incidentTime: values.incidentTime || new Date().toLocaleString('vi-VN'),
      sessionId: values.sessionId ? Number(values.sessionId) : undefined,
      sessionCode: values.sessionId ? `Ca #${values.sessionId}` : undefined,
      customerName: values.customerName,
      customerPhone: values.customerPhone || 'Không cung cấp',
      technicianName: values.technicianName || 'Cô Đẫm (KTV)',
      incidentType: values.incidentType,
      incidentTypeLabel: INCIDENT_TYPE_LABEL_MAP[values.incidentType],
      description: values.description,
      immediateAction: values.immediateAction,
      status: values.status || 'INVESTIGATING',
      followUp24h: values.followUp24h
        ? {
            recordedAt: new Date().toLocaleDateString('vi-VN'),
            condition: values.followUp24h,
            note: 'Ghi nhận sau 24h',
          }
        : undefined,
      compensationNote: values.compensationNote,
    };

    setIncidents((prev) => [newIncident, ...prev]);
    message.success(`Đã lập biên bản sự cố ${newCode} thành công.`);
    setIsAddIncidentModalOpen(false);
    incidentForm.resetFields();
  };

  const handleUpdateFollowUp = (incidentId: string, milestone: FollowUpMilestone, text: string) => {
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id !== incidentId) return inc;
        const nowStr = new Date().toLocaleDateString('vi-VN');
        if (milestone === '24h') {
          return { ...inc, followUp24h: { recordedAt: nowStr, condition: text, note: 'Khách phản hồi êm mắt' } };
        }
        if (milestone === '48h') {
          return { ...inc, followUp48h: { recordedAt: nowStr, condition: text, note: 'Mắt ổn định hoàn toàn' } };
        }
        return {
          ...inc,
          followUp72h: { recordedAt: nowStr, condition: text, note: 'Đóng ca chăm sóc' },
          status: 'RESOLVED',
        };
      })
    );
    message.success(`Đã cập nhật theo dõi sau ${milestone} cho biên bản sự cố.`);
  };

  const handleAddAttachment = (values: AttachmentFormValues) => {
    const newAttachment: SafetyAttachment = {
      id: `att-${Date.now()}`,
      name: values.name,
      category: values.category || 'Tài liệu SOP',
      format: values.format || 'PDF',
      uploadDate: new Date().toISOString().split('T')[0],
      uploadedBy: values.uploadedBy || 'Cô Giang Đàm',
      description: values.description || '',
    };
    setAttachments((prev) => [newAttachment, ...prev]);
    message.success('Đã đính kèm tài liệu hướng dẫn thành công.');
    setIsAddAttachmentModalOpen(false);
    attachmentForm.resetFields();
  };

  const handleOpenEditStageModal = (stage: SafetyStageRule) => {
    setEditingStage(stage);
    stageForm.setFieldsValue({
      title: stage.title,
      description: stage.description,
      actions: stage.actions.join('\n'),
      warningNote: stage.warningNote,
    });
    setIsEditStageModalOpen(true);
  };

  const handleCloseEditStageModal = () => {
    setIsEditStageModalOpen(false);
    setEditingStage(null);
  };

  const handleSaveStageRule = (values: StageRuleFormValues) => {
    if (!editingStage) return;
    setStageRules((prev) =>
      prev.map((st) =>
        st.id === editingStage.id
          ? {
              ...st,
              title: values.title,
              description: values.description,
              actions: splitLinesToArray(values.actions),
              warningNote: values.warningNote,
            }
          : st
      )
    );
    message.success(`Đã cập nhật quy tắc cho ${editingStage.stageName}.`);
    handleCloseEditStageModal();
  };

  const handleOpenEditCaseModal = (reactionCase: SensitiveReactionCase) => {
    setEditingCase(reactionCase);
    caseForm.setFieldsValue({
      name: reactionCase.name,
      recognitionSigns: reactionCase.recognitionSigns.join('\n'),
      preventionMeasures: reactionCase.preventionMeasures.join('\n'),
      clinicalTreatment: reactionCase.clinicalTreatment.join('\n'),
    });
    setIsEditCaseModalOpen(true);
  };

  const handleCloseEditCaseModal = () => {
    setIsEditCaseModalOpen(false);
    setEditingCase(null);
  };

  const handleSaveSensitiveCase = (values: SensitiveCaseFormValues) => {
    if (!editingCase) return;
    setSensitiveCases((prev) =>
      prev.map((c) =>
        c.id === editingCase.id
          ? {
              ...c,
              name: values.name,
              recognitionSigns: splitLinesToArray(values.recognitionSigns),
              preventionMeasures: splitLinesToArray(values.preventionMeasures),
              clinicalTreatment: splitLinesToArray(values.clinicalTreatment),
              expertConfirmed: true,
            }
          : c
      )
    );
    message.success(`Đã cập nhật tình huống ${editingCase.name}.`);
    handleCloseEditCaseModal();
  };

  const handleToggleExpertApproval = () => {
    const nextApproved = !isExpertApproved;
    setIsExpertApproved(nextApproved);
    message.info(
      nextApproved
        ? 'Đã chuyển sang trạng thái: ĐÃ THẨM ĐỊNH CHUYÊN MÔN BỞI CÔ GIANG ĐÀM'
        : 'Đã chuyển về trạng thái: CHỜ CÔ GIANG ĐÀM THẨM ĐỊNH'
    );
  };

  const handleConfirmExpertApproval = () => {
    setIsExpertApproved(true);
    message.success('Đã xác nhận thẩm định chuyên môn của Cô Giang Đàm!');
  };

  const handlePrintSop = () => {
    window.print();
  };

  return {
    activeTab,
    setActiveTab,
    isExpertApproved,
    expertNote,
    stageRules,
    controlPoints,
    attachments,
    sensitiveCases,
    incidents,
    pilotStats,
    isAddIncidentModalOpen,
    setIsAddIncidentModalOpen,
    isAddAttachmentModalOpen,
    setIsAddAttachmentModalOpen,
    isEditStageModalOpen,
    editingStage,
    isEditCaseModalOpen,
    editingCase,
    selectedIncidentDetail,
    setSelectedIncidentDetail,
    incidentForm,
    attachmentForm,
    stageForm,
    caseForm,
    handleToggleControlPoint,
    handleOpenCreateIncidentModal,
    handleCreateIncident,
    handleUpdateFollowUp,
    handleAddAttachment,
    handleOpenEditStageModal,
    handleCloseEditStageModal,
    handleSaveStageRule,
    handleOpenEditCaseModal,
    handleCloseEditCaseModal,
    handleSaveSensitiveCase,
    handleToggleExpertApproval,
    handleConfirmExpertApproval,
    handlePrintSop,
  };
}
