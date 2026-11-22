import type {
  CreateMosChatWorkflowInstanceResponse,
  MosChatStaffMember,
  MosChatWorkflowTemplate,
  SaveThreadAsWorkflowTemplateResponse,
} from '@mos-lab/shared';

export interface MosChatTriggerWorkflowModalProps {
  open: boolean;
  isDark: boolean;
  conversationId: string;
  templates: MosChatWorkflowTemplate[];
  staffDirectory: MosChatStaffMember[];
  initialTemplateCode?: string;
  onClose: () => void;
  onCreated: (res: CreateMosChatWorkflowInstanceResponse) => void;
}

export interface MosChatSaveThreadWorkflowModalProps {
  open: boolean;
  isDark: boolean;
  conversationId: string;
  messageId?: string | null;
  defaultName?: string;
  existingTemplates: MosChatWorkflowTemplate[];
  onClose: () => void;
  onSaved: (res: SaveThreadAsWorkflowTemplateResponse) => void;
}

export type SaveThreadWorkflowMode = 'NEW_FROM_THREAD' | 'UPGRADE_EXISTING';

export interface ParsedInventoryAuditRow {
  materialName: string;
  actualQty: number;
}

export interface StepActorOverride {
  actorStaffId?: number;
  actorName?: string;
}
