'use client';

import { useEffect, useState } from 'react';
import type {
  CreateMosChatWorkflowInstanceResponse,
  MosChatStaffMember,
  MosChatWorkflowTemplate,
} from '@mos-lab/shared';
import { chatApi } from '../../../../lib/api/chat.api';
import {
  buildStepActorOverrides,
  buildTriggerWorkflowFormData,
  DEFAULT_INVENTORY_AUDIT_TEXT,
  DEFAULT_TRIGGER_TEMPLATE_CODE,
  DEFAULT_WORKFLOW_AMOUNT,
  DEFAULT_WORKFLOW_WAREHOUSE,
  extractWorkflowErrorMessage,
  resolveDefaultWorkflowTitle,
} from './workflowModalUtils';

export interface UseTriggerWorkflowFormParams {
  open: boolean;
  conversationId: string;
  templates: MosChatWorkflowTemplate[];
  staffDirectory: MosChatStaffMember[];
  initialTemplateCode?: string;
  onClose: () => void;
  onCreated: (res: CreateMosChatWorkflowInstanceResponse) => void;
}

export function useTriggerWorkflowForm({
  open,
  conversationId,
  templates,
  staffDirectory,
  initialTemplateCode,
  onClose,
  onCreated,
}: UseTriggerWorkflowFormParams) {
  const [selectedCode, setSelectedCode] = useState<string>(initialTemplateCode || DEFAULT_TRIGGER_TEMPLATE_CODE);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<string>(DEFAULT_WORKFLOW_AMOUNT);
  const [reason, setReason] = useState('');
  const [bankInfo, setBankInfo] = useState('');
  const [warehouse, setWarehouse] = useState(DEFAULT_WORKFLOW_WAREHOUSE);
  const [inventoryText, setInventoryText] = useState(DEFAULT_INVENTORY_AUDIT_TEXT);
  const [stepActors, setStepActors] = useState<Record<number, number | ''>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open && initialTemplateCode) {
      setSelectedCode(initialTemplateCode);
    }
  }, [open, initialTemplateCode]);

  const activeTemplate = templates.find((t) => t.code === selectedCode) || templates[0] || null;

  useEffect(() => {
    if (!activeTemplate) return;
    setTitle(resolveDefaultWorkflowTitle(activeTemplate));
    setStepActors({});
  }, [activeTemplate]);

  const handleStepActorChange = (stepIndex: number, staffIdValue: string) => {
    setStepActors((prev) => ({
      ...prev,
      [stepIndex]: staffIdValue ? Number(staffIdValue) : '',
    }));
  };

  const handleSubmit = async () => {
    if (!activeTemplate) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const formData = buildTriggerWorkflowFormData({
        template: activeTemplate,
        title,
        amount,
        reason,
        bankInfo,
        warehouse,
        inventoryText,
      });
      const stepActorOverrides = buildStepActorOverrides(stepActors, staffDirectory);

      const res = await chatApi.chat.createWorkflowInstance({
        conversationId,
        templateCode: activeTemplate.code,
        title: title.trim() || activeTemplate.name,
        formData,
        stepActorOverrides,
      });
      onCreated(res);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(extractWorkflowErrorMessage(err, 'Không thể phát thẻ quy trình.'));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    selectedCode,
    setSelectedCode,
    title,
    setTitle,
    amount,
    setAmount,
    reason,
    setReason,
    bankInfo,
    setBankInfo,
    warehouse,
    setWarehouse,
    inventoryText,
    setInventoryText,
    stepActors,
    handleStepActorChange,
    submitting,
    errorMsg,
    activeTemplate,
    handleSubmit,
  };
}
