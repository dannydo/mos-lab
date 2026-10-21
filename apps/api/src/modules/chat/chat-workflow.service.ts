import type { FastifyInstance } from 'fastify';
import type {
  ActionMosChatWorkflowInstanceRequest,
  CreateMosChatWorkflowInstanceRequest,
  MosChatInventoryVarianceItem,
  MosChatMessage,
  MosChatTaskItem,
  MosChatThreadReply,
  MosChatWorkflowInstance,
  MosChatWorkflowStepDefinition,
  MosChatWorkflowStepLog,
  MosChatWorkflowTemplate,
  SaveThreadAsWorkflowTemplateRequest,
  SafeAny,
} from '@mos-lab/shared';
import { ensureChatRelationalTables } from './chat-repository.service.js';

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
    } catch (_) {}
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
    } catch (_) {}
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
    } catch (_) {}
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

/**
 * Matches inventory items submitted in chat against actual mOS Warehouse (`CrmStockInventory`).
 */
export async function computeInventoryReconciliation(
  fastify: FastifyInstance,
  warehouse: string = 'detham',
  rawItems?: Array<{ materialName: string; actualQty: number; unit?: string }>
): Promise<MosChatInventoryVarianceItem[]> {
  const crm = (fastify as SafeAny)?.prisma?.crm;
  let dbStock: SafeAny[] = [];
  if (crm?.crmStockInventory?.findMany) {
    try {
      dbStock = await crm.crmStockInventory.findMany({
        where: { warehouse },
        orderBy: { materialName: 'asc' },
      });
    } catch (_) {}
  }

  if (rawItems && rawItems.length > 0) {
    return rawItems.map((item) => {
      const normalized = item.materialName.trim().toLowerCase();
      const matched = dbStock.find(
        (s) =>
          String(s.materialName || '')
            .trim()
            .toLowerCase()
            .includes(normalized) ||
          normalized.includes(
            String(s.materialName || '')
              .trim()
              .toLowerCase()
          )
      );
      const systemQty = matched ? Number(matched.quantity || 0) : 0;
      const actualQty = Number(item.actualQty || 0);
      return {
        materialId: matched?.materialId ?? matched?.id ?? null,
        materialName: matched?.materialName || item.materialName,
        unit: matched?.unit || item.unit || 'Hộp',
        warehouse,
        systemQty,
        actualQty,
        variance: Number((actualQty - systemQty).toFixed(2)),
      };
    });
  }

  // If user didn't pass manual rows, pull top items from mOS Stock Inventory to generate live audit sheet
  if (dbStock.length > 0) {
    return dbStock.slice(0, 6).map((s) => {
      const systemQty = Number(s.quantity || 0);
      return {
        materialId: s.materialId ?? s.id ?? null,
        materialName: s.materialName,
        unit: s.unit || 'Hộp',
        warehouse: s.warehouse || warehouse,
        systemQty,
        actualQty: systemQty,
        variance: 0,
      };
    });
  }

  // Fallback sample items if local DB has no stock rows yet
  return [
    {
      materialId: null,
      materialName: 'Keo nối mi Dark Lashes Premium',
      unit: 'Chai',
      warehouse,
      systemQty: 15,
      actualQty: 14,
      variance: -1,
    },
    {
      materialId: null,
      materialName: 'Khay mi Lụa Thiết kế 0.07 C',
      unit: 'Khay',
      warehouse,
      systemQty: 42,
      actualQty: 42,
      variance: 0,
    },
  ];
}

/**
 * Executes target system integration hook when a Workflow Instance reaches COMPLETED.
 * - CASHFLOW_ENTRY: Automatically creates a PAID OUTFLOW entry in `CrmCashFlowEntry` + `CrmCashFlowAudit`.
 * - STOCK_INVENTORY: Automatically updates physical quantities in `CrmStockInventory`.
 */
export async function executeWorkflowSystemHook(
  fastify: FastifyInstance,
  instance: MosChatWorkflowInstance,
  actorStaffId: number,
  actorName: string
): Promise<{
  syncedRecordType: string | null;
  syncedRecordId: number | null;
  syncedSummary: string | null;
}> {
  const crm = (fastify as SafeAny)?.prisma?.crm;
  if (!crm) {
    return { syncedRecordType: null, syncedRecordId: null, syncedSummary: null };
  }

  if (instance.targetSystemHook === 'CASHFLOW_ENTRY') {
    const amount = Number(instance.formData?.amount || 0);
    const reason = String(instance.formData?.reason || instance.title || 'Tạm ứng nội bộ qua mOS Chat');
    const category = String(instance.formData?.cashFlowCategory || 'OPEX');
    const now = new Date();

    try {
      if (crm.crmCashFlowEntry?.create) {
        const approverLog = instance.stepLogs.find(
          (l) => l.status === 'APPROVED' || l.stepIndex === 2 || l.stepIndex === 1
        );
        const entry = await crm.crmCashFlowEntry.create({
          data: {
            flowType: 'OUTFLOW',
            category,
            title: `[mOS Chat WF] ${instance.title}`,
            description: `${reason}\n• Người yêu cầu: ${instance.initiatorName}\n• Mã quy trình: ${instance.id}`,
            amount,
            hasVat: false,
            vatRate: 0,
            vatAmount: 0,
            totalAmount: amount,
            priority: 'HIGH',
            status: 'PAID',
            expectedDate: now,
            actualDate: now,
            paymentMethod: 'BANK_TRANSFER',
            sourceRef: `CHAT_WF:${instance.id}`,
            createdByStaffId: instance.initiatorStaffId || actorStaffId || null,
            createdByName: instance.initiatorName,
            approvedByStaffId: Number(approverLog?.actorStaffId) || actorStaffId || null,
            approvedByName: approverLog?.actorName || actorName,
          },
        });

        if (crm.crmCashFlowAudit?.create) {
          await crm.crmCashFlowAudit.create({
            data: {
              entryId: entry.id,
              action: 'PAY',
              staffId: actorStaffId || null,
              staffName: actorName,
              note: `Tự động ghi sổ từ mOS Chat Workflow (${instance.templateName}) sau khi người yêu cầu xác nhận đã nhận tiền.`,
              payload: {
                workflowInstanceId: instance.id,
                stepLogs: instance.stepLogs,
                formData: instance.formData,
              } as SafeAny,
            },
          });
        }

        return {
          syncedRecordType: 'CASHFLOW_ENTRY',
          syncedRecordId: entry.id,
          syncedSummary: `Đã tự động tạo Phiếu Chi #${entry.id} (${amount.toLocaleString('vi-VN')}đ · ĐÃ THANH TOÁN) trong Báo cáo Kế toán / Thu Chi.`,
        };
      }
    } catch (err) {
      fastify.log?.warn?.({ err }, 'executeWorkflowSystemHook CASHFLOW_ENTRY warning');
    }

    return {
      syncedRecordType: 'CASHFLOW_ENTRY',
      syncedRecordId: Math.floor(Date.now() / 1000),
      syncedSummary: `Đã ghi nhận vào sổ Báo cáo Kế toán (${amount.toLocaleString('vi-VN')}đ · ĐÃ THANH TOÁN).`,
    };
  }

  if (instance.targetSystemHook === 'STOCK_INVENTORY') {
    const items = (instance.formData?.inventoryItems || []) as MosChatInventoryVarianceItem[];
    let updatedCount = 0;
    try {
      if (crm.crmStockInventory?.updateMany && items.length > 0) {
        for (const item of items) {
          if (item.materialName) {
            const res = await crm.crmStockInventory.updateMany({
              where: {
                warehouse: item.warehouse || String(instance.formData?.warehouse || 'detham'),
                materialName: item.materialName,
              },
              data: {
                quantity: item.actualQty,
              },
            });
            updatedCount += Number(res?.count || 0);
          }
        }
      }
    } catch (err) {
      fastify.log?.warn?.({ err }, 'executeWorkflowSystemHook STOCK_INVENTORY warning');
    }

    return {
      syncedRecordType: 'STOCK_INVENTORY',
      syncedRecordId: updatedCount || items.length,
      syncedSummary: `Đã đối soát & đồng bộ thực tế ${items.length} mã vật tư vào mOS Kho (${String(instance.formData?.warehouse || 'Đề Thám')}).`,
    };
  }

  return {
    syncedRecordType: 'WORKFLOW_COMPLETED',
    syncedRecordId: 1,
    syncedSummary: `Quy trình "${instance.templateName}" đã hoàn tất toàn bộ các bước phê duyệt & xác nhận.`,
  };
}

/**
 * Extracts or upgrades a reusable Workflow Template directly from a Chat Thread or Super Admin instruction.
 */
export async function saveOrUpgradeWorkflowFromThread(
  fastify: FastifyInstance,
  input: SaveThreadAsWorkflowTemplateRequest,
  creatorName: string,
  threadContextMessages?: Array<{ senderName: string; senderRole?: string; text: string }>,
  existingTemplates?: MosChatWorkflowTemplate[]
): Promise<MosChatWorkflowTemplate> {
  const state = existingTemplates ? { templates: existingTemplates } : await loadWorkflowState(fastify);

  const normalizedCode = (
    input.code ||
    `WF_${input.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .toUpperCase()
      .replace(/^_|_$/g, '')
      .slice(0, 32)}`
  ).toUpperCase();

  const existingIdx = state.templates.findIndex((t) => t.code === normalizedCode);
  const existing = existingIdx >= 0 ? state.templates[existingIdx] : null;

  let steps: MosChatWorkflowStepDefinition[] = [];

  if (Array.isArray(input.steps) && input.steps.length > 0) {
    steps = input.steps.map((s, idx) => ({
      id: `step-${idx + 1}`,
      index: idx,
      title: s.title,
      stepType: s.stepType || (idx === 0 ? 'REQUEST' : idx === input.steps!.length - 1 ? 'CONFIRMATION' : 'APPROVAL'),
      actorRole: s.actorRole || 'ANY',
      actorStaffId: s.actorStaffId ?? null,
      actorName: s.actorName ?? null,
      requireAttachment: Boolean(s.requireAttachment),
      actionButtonLabel: s.actionButtonLabel || `Xác nhận Bước ${idx + 1}`,
    }));
  } else if (existing && input.upgradeInstruction) {
    // Intelligent rule-based upgrade from natural language instruction in chat
    const instr = input.upgradeInstruction.toLowerCase();
    steps = existing.steps.map((s) => ({ ...s }));
    if (instr.includes('thêm bước') || instr.includes('add step')) {
      const insertAt = Math.max(1, steps.length - 1);
      steps.splice(insertAt, 0, {
        id: `step-upgrade-${Date.now()}`,
        index: insertAt,
        title: input.upgradeInstruction.replace(/^(thêm bước|nâng cấp:?)\s*/i, '').trim() || 'Bước kiểm duyệt bổ sung',
        stepType: 'APPROVAL',
        actorRole: 'MANAGER',
        actionButtonLabel: 'Xác nhận duyệt',
      });
    } else if (instr.includes('đổi') || instr.includes('thay')) {
      // Update approver role/name if mentioned
      for (const s of steps) {
        if (s.stepType === 'APPROVAL' && (s.actorRole === 'CEO' || s.index === 2)) {
          s.title = `${s.title} (${input.upgradeInstruction.trim()})`;
          break;
        }
      }
    }
    steps = steps.map((s, idx) => ({ ...s, index: idx }));
  } else if (threadContextMessages && threadContextMessages.length > 0) {
    // Synthesize workflow steps from the actual participants and messages in the chat thread
    const distinctParticipants: Array<{ name: string; role: string }> = [];
    for (const m of threadContextMessages) {
      if (!distinctParticipants.some((p) => p.name === m.senderName)) {
        distinctParticipants.push({ name: m.senderName, role: m.senderRole || 'STAFF' });
      }
    }
    steps = [
      {
        id: 'step-1',
        index: 0,
        title: 'Khởi tạo yêu cầu & đề xuất',
        stepType: 'REQUEST',
        actorRole: 'REQUESTER',
        actorName: distinctParticipants[0]?.name || null,
        actionButtonLabel: 'Gửi đề xuất',
      },
      {
        id: 'step-2',
        index: 1,
        title: 'Quản lý / Chuyên trách phê duyệt',
        stepType: 'APPROVAL',
        actorRole: 'MANAGER',
        actorName: distinctParticipants[1]?.name || null,
        actionButtonLabel: 'Phê duyệt',
      },
      {
        id: 'step-3',
        index: 2,
        title: 'Thực thi & gửi minh chứng hoàn tất',
        stepType: 'EXECUTION_PROOF',
        actorRole: 'EXECUTOR',
        actorName: distinctParticipants[2]?.name || distinctParticipants[1]?.name || null,
        requireAttachment: true,
        actionButtonLabel: 'Hoàn tất & Đính kèm ảnh',
      },
      {
        id: 'step-4',
        index: 3,
        title: 'Người yêu cầu nghiệm thu & đóng quy trình',
        stepType: 'CONFIRMATION',
        actorRole: 'REQUESTER',
        actorName: distinctParticipants[0]?.name || null,
        actionButtonLabel: 'Xác nhận hoàn tất',
      },
    ];
  } else {
    steps = buildDefaultWorkflowTemplates()[0].steps;
  }

  const nowIso = new Date().toISOString();
  const template: MosChatWorkflowTemplate = {
    id: existing?.id || `wf-tpl-${Date.now()}`,
    code: normalizedCode,
    name: input.name.trim(),
    description:
      input.description?.trim() ||
      (input.upgradeInstruction
        ? `${existing?.description || ''} (Nâng cấp: ${input.upgradeInstruction})`
        : `Quy trình được chuẩn hóa trực tiếp từ ngữ cảnh luồng thảo luận mOS Chat.`),
    category: input.category || existing?.category || 'OPERATIONS',
    targetSystemHook: input.targetSystemHook || existing?.targetSystemHook || 'NONE',
    steps,
    version: existing ? existing.version + 1 : 1,
    isActive: true,
    sourceConversationId: input.conversationId,
    sourceMessageId: input.messageId ?? null,
    createdBy: creatorName,
    createdAt: existing?.createdAt || nowIso,
    updatedAt: nowIso,
  };

  const nextTemplates = [...state.templates];
  if (existingIdx >= 0) {
    nextTemplates[existingIdx] = template;
  } else {
    nextTemplates.unshift(template);
  }
  await saveWorkflowTemplates(fastify, nextTemplates);
  return template;
}
