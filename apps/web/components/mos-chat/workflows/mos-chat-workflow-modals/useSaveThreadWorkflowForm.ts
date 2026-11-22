'use client';

import { useEffect, useState } from 'react';
import type {
  MosChatWorkflowCategory,
  MosChatWorkflowTargetHook,
  MosChatWorkflowTemplate,
  SaveThreadAsWorkflowTemplateResponse,
} from '@mos-lab/shared';
import { chatApi } from '../../../../lib/api/chat.api';
import type { SaveThreadWorkflowMode } from './workflowModalTypes';
import {
  DEFAULT_NEW_WORKFLOW_NAME,
  DEFAULT_TRIGGER_TEMPLATE_CODE,
  extractWorkflowErrorMessage,
} from './workflowModalUtils';

export interface UseSaveThreadWorkflowFormParams {
  conversationId: string;
  messageId?: string | null;
  defaultName?: string;
  existingTemplates: MosChatWorkflowTemplate[];
  onClose: () => void;
  onSaved: (res: SaveThreadAsWorkflowTemplateResponse) => void;
}

export function useSaveThreadWorkflowForm({
  conversationId,
  messageId,
  defaultName,
  existingTemplates,
  onClose,
  onSaved,
}: UseSaveThreadWorkflowFormParams) {
  const [mode, setMode] = useState<SaveThreadWorkflowMode>('NEW_FROM_THREAD');
  const [selectedExistingCode, setSelectedExistingCode] = useState<string>(
    existingTemplates[0]?.code || DEFAULT_TRIGGER_TEMPLATE_CODE
  );
  const [name, setName] = useState(defaultName || DEFAULT_NEW_WORKFLOW_NAME);
  const [category, setCategory] = useState<MosChatWorkflowCategory>('OPERATIONS');
  const [targetHook, setTargetHook] = useState<MosChatWorkflowTargetHook>('NONE');
  const [upgradeInstruction, setUpgradeInstruction] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (defaultName) {
      setName(defaultName);
    }
  }, [defaultName]);

  const handleSave = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const targetTpl = existingTemplates.find((t) => t.code === selectedExistingCode);
      const res = await chatApi.chat.saveThreadAsWorkflowTemplate({
        conversationId,
        messageId,
        code: mode === 'UPGRADE_EXISTING' ? selectedExistingCode : undefined,
        name: mode === 'UPGRADE_EXISTING' ? targetTpl?.name || name : name,
        category,
        targetSystemHook: targetHook,
        upgradeInstruction: upgradeInstruction.trim() || undefined,
      });
      onSaved(res);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(extractWorkflowErrorMessage(err, 'Không thể đóng gói quy trình.'));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    mode,
    setMode,
    selectedExistingCode,
    setSelectedExistingCode,
    name,
    setName,
    category,
    setCategory,
    targetHook,
    setTargetHook,
    upgradeInstruction,
    setUpgradeInstruction,
    submitting,
    errorMsg,
    handleSave,
  };
}
