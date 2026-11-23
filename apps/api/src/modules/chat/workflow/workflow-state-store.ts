import type { FastifyInstance } from 'fastify';
import type { MosChatWorkflowInstance, MosChatWorkflowTemplate, SafeAny } from '@mos-lab/shared';
import { ensureChatRelationalTables } from '../chat-repository.service.js';

const CHAT_WORKFLOW_TEMPLATES_CONFIG_KEY = 'MOS_CHAT_WORKFLOW_TEMPLATES_V1';
const CHAT_WORKFLOW_INSTANCES_CONFIG_KEY = 'MOS_CHAT_WORKFLOW_INSTANCES_V1';

let memoryWorkflowCache: {
  templates: MosChatWorkflowTemplate[];
  instances: MosChatWorkflowInstance[];
  loadedAt: number;
} | null = null;

export function buildDefaultWorkflowTemplates(): MosChatWorkflowTemplate[] {
  const nowIso = new Date().toISOString();
  return [
    {
      id: 'wf-tpl-cash-advance',
      code: 'WF_CASH_ADVANCE',
      name: 'Quy trình Tạm ứng & Thanh toán Nội bộ',
      description:
        'Nhân sự yêu cầu tạm ứng -> Quản lý duyệt -> CEO duyệt -> Kế toán chuyển khoản & đính kèm UNC -> Người yêu cầu xác nhận -> Tự động ghi sổ Báo cáo Thu Chi (CrmCashFlowEntry).',
      category: 'FINANCE',
      targetSystemHook: 'CASHFLOW_ENTRY',
      version: 1,
      isActive: true,
      createdBy: 'Danny (Super Admin)',
      createdAt: nowIso,
      updatedAt: nowIso,
      steps: [
        {
          id: 'step-1-request',
          index: 0,
          title: 'Khởi tạo yêu cầu tạm ứng',
          description: 'Nhập số tiền, lý do tạm ứng và thông tin tài khoản nhận.',
          stepType: 'REQUEST',
          actorRole: 'REQUESTER',
          actionButtonLabel: 'Gửi yêu cầu',
        },
        {
          id: 'step-2-manager',
          index: 1,
          title: 'Quản lý trực tiếp phê duyệt',
          description: 'Xác nhận tính hợp lệ của khoản tạm ứng trong bộ phận.',
          stepType: 'APPROVAL',
          actorRole: 'MANAGER',
          actionButtonLabel: 'Quản lý Duyệt',
        },
        {
          id: 'step-3-ceo',
          index: 2,
          title: 'CEO phê duyệt hạn mức chi',
          description: 'CEO (hoặc người được ủy quyền) duyệt giải ngân.',
          stepType: 'APPROVAL',
          actorRole: 'CEO',
          actionButtonLabel: 'CEO Duyệt chi',
        },
        {
          id: 'step-4-accountant',
          index: 3,
          title: 'Kế toán chuyển khoản & gửi ảnh UNC',
          description: 'Thực hiện chuyển khoản và đính kèm ảnh chụp màn hình giao dịch.',
          stepType: 'EXECUTION_PROOF',
          actorRole: 'ACCOUNTANT',
          requireAttachment: true,
          actionButtonLabel: 'Đã chuyển & Đính kèm UNC',
        },
        {
          id: 'step-5-confirm',
          index: 4,
          title: 'Người yêu cầu xác nhận đã nhận tiền',
          description: 'Xác nhận tiền đã nổi trong tài khoản để hệ thống tự động lên báo cáo kế toán.',
          stepType: 'CONFIRMATION',
          actorRole: 'REQUESTER',
          actionButtonLabel: 'Xác nhận đã nhận tiền',
        },
      ],
    },
    {
      id: 'wf-tpl-inventory-audit',
      code: 'WF_INVENTORY_AUDIT',
      name: 'Quy trình Kiểm kho & Đối soát Hệ thống',
      description:
        'Kiểm đếm vật tư thực tế -> Tự động đối chiếu tồn kho mOS Kho (stock_inventory) -> Báo cáo chênh lệch -> Quản lý/CEO duyệt cân bằng kho.',
      category: 'INVENTORY',
      targetSystemHook: 'STOCK_INVENTORY',
      version: 1,
      isActive: true,
      createdBy: 'Danny (Super Admin)',
      createdAt: nowIso,
      updatedAt: nowIso,
      steps: [
        {
          id: 'step-1-count',
          index: 0,
          title: 'Báo cáo kiểm đếm thực tế & Đối soát tự động',
          description: 'Ghi nhận số lượng kiểm thực tế và đối chiếu tự động với tồn kho hệ thống.',
          stepType: 'INVENTORY_CHECK',
          actorRole: 'WAREHOUSE',
          actionButtonLabel: 'Gửi báo cáo kiểm kho',
        },
        {
          id: 'step-2-approve-reconcile',
          index: 1,
          title: 'Phê duyệt báo cáo & Cân bằng tồn kho',
          description: 'Xác nhận chênh lệch và tự động đồng bộ số liệu thực tế vào mOS Kho.',
          stepType: 'APPROVAL',
          actorRole: 'CEO',
          actionButtonLabel: 'Duyệt & Đồng bộ mOS Kho',
        },
      ],
    },
  ];
}

export async function loadWorkflowState(fastify: FastifyInstance): Promise<{
  templates: MosChatWorkflowTemplate[];
  instances: MosChatWorkflowInstance[];
}> {
  const now = Date.now();
  if (memoryWorkflowCache && now - memoryWorkflowCache.loadedAt < 5_000) {
    return {
      templates: memoryWorkflowCache.templates,
      instances: memoryWorkflowCache.instances,
    };
  }

  const ready = await ensureChatRelationalTables(fastify);
  const crm = (fastify as SafeAny)?.prisma?.crm;

  let templates: MosChatWorkflowTemplate[] = [];
  let instances: MosChatWorkflowInstance[] = [];

  if (ready && crm?.crmChatWorkflowTemplate && crm?.crmChatWorkflowInstance) {
    try {
      const [tplRows, instRows] = await Promise.all([
        crm.crmChatWorkflowTemplate.findMany({ orderBy: { updatedAt: 'desc' } }),
        crm.crmChatWorkflowInstance.findMany({ orderBy: { updatedAt: 'desc' } }),
      ]);

      templates = tplRows.map((r: SafeAny) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        description: r.description,
        category: r.category,
        targetSystemHook: r.targetSystemHook,
        steps: Array.isArray(r.stepsJson) ? r.stepsJson : [],
        version: Number(r.version || 1),
        isActive: Boolean(r.isActive),
        sourceConversationId: r.sourceConversationId,
        sourceMessageId: r.sourceMessageId,
        createdBy: r.createdBy,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
        updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
      }));

      instances = instRows.map((r: SafeAny) => {
        const formData = (r.formDataJson || {}) as Record<string, unknown>;
        return {
          id: r.id,
          templateId: r.templateId,
          templateCode: r.templateCode,
          templateName: String(formData.__templateName || r.title),
          category: (formData.__category as SafeAny) || 'OPERATIONS',
          targetSystemHook: (formData.__targetSystemHook as SafeAny) || 'NONE',
          title: r.title,
          conversationId: r.conversationId,
          messageId: r.messageId,
          status: r.status,
          currentStepIndex: Number(r.currentStepIndex || 0),
          initiatorStaffId: r.initiatorStaffId,
          initiatorName: r.initiatorName,
          steps: Array.isArray(r.stepsJson) ? r.stepsJson : [],
          stepLogs: Array.isArray(r.stepLogsJson) ? r.stepLogsJson : [],
          formData,
          syncedRecordType: r.syncedRecordType,
          syncedRecordId: r.syncedRecordId,
          syncedSummary: (formData.__syncedSummary as string) || null,
          createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
          updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
        };
      });
    } catch {
      // non-blocking relational read fallback
    }
  }

  // Fallback or seed from crmConfig if relational tables were empty
  if (templates.length === 0 && crm?.crmConfig) {
    try {
      const tplConfig = await crm.crmConfig.findUnique({
        where: { key: CHAT_WORKFLOW_TEMPLATES_CONFIG_KEY },
      });
      if (tplConfig?.value) {
        const parsed = JSON.parse(tplConfig.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          templates = parsed;
        }
      }
    } catch {
      // non-blocking config read fallback
    }
  }

  if (instances.length === 0 && crm?.crmConfig) {
    try {
      const instConfig = await crm.crmConfig.findUnique({
        where: { key: CHAT_WORKFLOW_INSTANCES_CONFIG_KEY },
      });
      if (instConfig?.value) {
        const parsed = JSON.parse(instConfig.value);
        if (Array.isArray(parsed)) {
          instances = parsed;
        }
      }
    } catch {
      // non-blocking config read fallback
    }
  }

  if (templates.length === 0) {
    templates = buildDefaultWorkflowTemplates();
    await saveWorkflowTemplates(fastify, templates);
  }

  memoryWorkflowCache = {
    templates,
    instances,
    loadedAt: now,
  };

  return { templates, instances };
}

export async function saveWorkflowTemplates(
  fastify: FastifyInstance,
  templates: MosChatWorkflowTemplate[]
): Promise<void> {
  if (memoryWorkflowCache) {
    memoryWorkflowCache.templates = templates;
    memoryWorkflowCache.loadedAt = Date.now();
  }
  const crm = (fastify as SafeAny)?.prisma?.crm;
  if (!crm) return;

  try {
    if (crm.crmConfig) {
      await crm.crmConfig.upsert({
        where: { key: CHAT_WORKFLOW_TEMPLATES_CONFIG_KEY },
        create: { key: CHAT_WORKFLOW_TEMPLATES_CONFIG_KEY, value: JSON.stringify(templates) },
        update: { value: JSON.stringify(templates) },
      });
    }
    const ready = await ensureChatRelationalTables(fastify);
    if (ready && crm.crmChatWorkflowTemplate) {
      for (const tpl of templates) {
        await crm.crmChatWorkflowTemplate.upsert({
          where: { code: tpl.code },
          create: {
            id: tpl.id,
            code: tpl.code,
            name: tpl.name,
            description: tpl.description ?? null,
            category: tpl.category,
            targetSystemHook: tpl.targetSystemHook,
            stepsJson: tpl.steps as SafeAny,
            version: tpl.version || 1,
            isActive: Boolean(tpl.isActive),
            sourceConversationId: tpl.sourceConversationId ?? null,
            sourceMessageId: tpl.sourceMessageId ?? null,
            createdBy: tpl.createdBy ?? null,
          },
          update: {
            name: tpl.name,
            description: tpl.description ?? null,
            category: tpl.category,
            targetSystemHook: tpl.targetSystemHook,
            stepsJson: tpl.steps as SafeAny,
            version: tpl.version || 1,
            isActive: Boolean(tpl.isActive),
            sourceConversationId: tpl.sourceConversationId ?? null,
            sourceMessageId: tpl.sourceMessageId ?? null,
          },
        });
      }
    }
  } catch (err) {
    fastify.log?.warn?.({ err }, 'saveWorkflowTemplates warning');
  }
}

export async function saveWorkflowInstances(
  fastify: FastifyInstance,
  instances: MosChatWorkflowInstance[]
): Promise<void> {
  if (memoryWorkflowCache) {
    memoryWorkflowCache.instances = instances;
    memoryWorkflowCache.loadedAt = Date.now();
  }
  const crm = (fastify as SafeAny)?.prisma?.crm;
  if (!crm) return;

  try {
    if (crm.crmConfig) {
      await crm.crmConfig.upsert({
        where: { key: CHAT_WORKFLOW_INSTANCES_CONFIG_KEY },
        create: { key: CHAT_WORKFLOW_INSTANCES_CONFIG_KEY, value: JSON.stringify(instances) },
        update: { value: JSON.stringify(instances) },
      });
    }
    const ready = await ensureChatRelationalTables(fastify);
    if (ready && crm.crmChatWorkflowInstance) {
      for (const inst of instances) {
        const enrichedFormData = {
          ...inst.formData,
          __templateName: inst.templateName,
          __category: inst.category,
          __targetSystemHook: inst.targetSystemHook,
          __syncedSummary: inst.syncedSummary ?? null,
        };
        await crm.crmChatWorkflowInstance.upsert({
          where: { id: inst.id },
          create: {
            id: inst.id,
            templateId: inst.templateId,
            templateCode: inst.templateCode,
            title: inst.title,
            conversationId: inst.conversationId,
            messageId: inst.messageId,
            status: inst.status,
            currentStepIndex: inst.currentStepIndex,
            initiatorStaffId: inst.initiatorStaffId ?? null,
            initiatorName: inst.initiatorName,
            stepsJson: inst.steps as SafeAny,
            stepLogsJson: inst.stepLogs as SafeAny,
            formDataJson: enrichedFormData as SafeAny,
            syncedRecordType: inst.syncedRecordType ?? null,
            syncedRecordId: inst.syncedRecordId ?? null,
          },
          update: {
            title: inst.title,
            status: inst.status,
            currentStepIndex: inst.currentStepIndex,
            stepsJson: inst.steps as SafeAny,
            stepLogsJson: inst.stepLogs as SafeAny,
            formDataJson: enrichedFormData as SafeAny,
            syncedRecordType: inst.syncedRecordType ?? null,
            syncedRecordId: inst.syncedRecordId ?? null,
          },
        });
      }
    }
  } catch (err) {
    fastify.log?.warn?.({ err }, 'saveWorkflowInstances warning');
  }
}
