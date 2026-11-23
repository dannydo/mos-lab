import type { FastifyInstance } from 'fastify';
import type {
  ActionMosChatWorkflowInstanceRequest,
  CreateMosChatWorkflowInstanceRequest,
  MosChatMessage,
  MosChatTaskItem,
  MosChatThreadReply,
  MosChatWorkflowInstance,
  MosChatWorkflowStepLog,
  SafeAny,
  SaveThreadAsWorkflowTemplateRequest,
} from '@mos-lab/shared';
import { requireAuth, type JwtUserPayload } from '../../../middlewares/auth.js';
import {
  computeInventoryReconciliation,
  executeWorkflowSystemHook,
  loadWorkflowState,
  saveOrUpgradeWorkflowFromThread,
  saveWorkflowInstances,
} from '../chat-workflow.service.js';
import { sanitizeChatAttachments } from '../chat-file.service.js';
import { isDannyOrSuperAdminUser, resolveUserStaffId, resolveUserPrefKey } from '../chat-access.service.js';
import {
  formatTimeLabel,
  getRoleDisplayLabel,
  getInitials,
  formatConversationForUser,
} from '../chat-format.service.js';
import { loadStaffDirectoryCached } from '../chat-staff-directory.service.js';
import { loadChatState, saveConversations, saveTasks } from '../chat-state-store.js';

export async function registerChatWorkflowRoutes(fastify: FastifyInstance) {
  // ================= DYNAMIC WORKFLOW ENGINE ENDPOINTS =================

  // GET /api/chat/workflows
  fastify.get(
    '/chat/workflows',
    {
      preHandler: [requireAuth],
    },
    async (_request, reply) => {
      try {
        const wfState = await loadWorkflowState(fastify);
        return {
          success: true,
          templates: wfState.templates,
          instances: wfState.instances,
        };
      } catch (err: SafeAny) {
        fastify.log.error('GET /chat/workflows error:', err);
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', message: 'Không thể tải danh sách quy trình.' });
      }
    }
  );

  // POST /api/chat/workflows/instances (Super Admin Only: Trigger a Workflow Card in a Conversation)
  fastify.post(
    '/chat/workflows/instances',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        if (!isDannyOrSuperAdminUser(user)) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Chỉ Super Admin mới có quyền khởi tạo Quy trình (Workflow) trên mOS Chat.',
          });
        }

        const body = (request.body || {}) as CreateMosChatWorkflowInstanceRequest;
        if (!body.conversationId || !body.templateCode) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Thiếu mã cuộc trò chuyện hoặc mã mẫu quy trình.',
          });
        }

        const [{ conversations, tasks, userPrefsByUserKey }, staffDirectory, wfState] = await Promise.all([
          loadChatState(fastify),
          loadStaffDirectoryCached(fastify),
          loadWorkflowState(fastify),
        ]);

        const conv = conversations.find((c) => c.id === body.conversationId);
        if (!conv) {
          return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy phòng chat.' });
        }

        const template = wfState.templates.find((t) => t.code === body.templateCode) || wfState.templates[0];
        if (!template) {
          return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy mẫu quy trình.' });
        }

        const senderStaffId = resolveUserStaffId(user, staffDirectory);
        const senderStaff = staffDirectory.find((s) => s.id === senderStaffId);
        const senderName =
          senderStaff?.displayName || (user as SafeAny)?.fullName || user?.username || 'Danny (Super Admin)';
        const roleInfo = getRoleDisplayLabel(senderStaff?.role || user?.role);

        const now = new Date();
        const nowIso = now.toISOString();
        const instanceId = `wf-inst-${Date.now()}`;
        const messageId = `msg-wf-${Date.now()}`;

        const formData: Record<string, unknown> = {
          ...(body.formData || {}),
        };

        if (template.targetSystemHook === 'STOCK_INVENTORY') {
          const warehouse = String(formData.warehouse || 'detham');
          const rawItems = Array.isArray(formData.inventoryItems) ? (formData.inventoryItems as SafeAny[]) : undefined;
          formData.inventoryItems = await computeInventoryReconciliation(fastify, warehouse, rawItems);
          formData.warehouse = warehouse;
        }

        const steps = template.steps.map((s, idx) => {
          const override = body.stepActorOverrides?.[idx];
          return {
            ...s,
            index: idx,
            actorStaffId: override?.actorStaffId ?? s.actorStaffId ?? (idx === 0 ? senderStaffId : null),
            actorName: override?.actorName ?? s.actorName ?? (idx === 0 ? senderName : null),
            actorRole: override?.actorRole ?? s.actorRole,
          };
        });

        // Step 0 is completed immediately upon submitting the workflow request card; advance to Step 1 if available
        const nextStepIndex = steps.length > 1 ? 1 : 0;
        const stepLogs: MosChatWorkflowStepLog[] = steps.map((s, idx) => ({
          stepIndex: idx,
          stepId: s.id,
          stepTitle: s.title,
          status: idx === 0 && steps.length > 1 ? 'COMPLETED' : 'PENDING',
          actorStaffId: idx === 0 ? senderStaffId : (s.actorStaffId ?? null),
          actorName: idx === 0 ? senderName : (s.actorName ?? null),
          actorRole: s.actorRole,
          note: idx === 0 ? String(formData.reason || formData.notes || 'Khởi tạo quy trình') : null,
          actedAt: idx === 0 && steps.length > 1 ? nowIso : null,
        }));

        const instance: MosChatWorkflowInstance = {
          id: instanceId,
          templateId: template.id,
          templateCode: template.code,
          templateName: template.name,
          category: template.category,
          targetSystemHook: template.targetSystemHook,
          title: (body.title || template.name).trim(),
          conversationId: conv.id,
          messageId,
          status: 'IN_PROGRESS',
          currentStepIndex: nextStepIndex,
          initiatorStaffId: senderStaffId,
          initiatorName: senderName,
          steps,
          stepLogs,
          formData,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        const activeStep = steps[nextStepIndex];
        let createdTask: MosChatTaskItem | null = null;
        if (activeStep) {
          createdTask = {
            id: `task-wf-${Date.now()}`,
            conversationId: conv.id,
            conversationName: conv.name,
            sourceMessageId: messageId,
            sourceAuthorName: senderName,
            title: `[Quy trình: ${instance.title}] Bước ${nextStepIndex + 1}: ${activeStep.title}`,
            assigneeId: activeStep.actorStaffId ?? undefined,
            assigneeName: activeStep.actorName || activeStep.actorRole || 'Quản lý / Người duyệt',
            creatorName: senderName,
            priority: 'URGENT',
            remindAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
            deadline: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
            done: false,
            fired: false,
            createdAt: nowIso,
          };
          tasks.unshift(createdTask);
        }

        const newMessage: MosChatMessage = {
          id: messageId,
          conversationId: conv.id,
          senderId: senderStaffId,
          senderName,
          senderRole: roleInfo.label,
          senderAvatar: senderStaff?.avatarUrl || getInitials(senderName, user?.username),
          roleColor: roleInfo.color,
          text: `⚡ **[Quy trình: ${template.name}]** ${instance.title}`,
          timeLabel: formatTimeLabel(now),
          createdAt: nowIso,
          taskId: createdTask?.id ?? null,
          workflowInstanceId: instance.id,
          workflow: instance,
          thread: [],
        };

        conv.messages.push(newMessage);
        conv.updatedAt = nowIso;

        const nextInstances = [instance, ...wfState.instances];
        await Promise.all([
          saveWorkflowInstances(fastify, nextInstances),
          saveConversations(fastify, conversations),
          saveTasks(fastify, tasks),
        ]);

        const userPrefKey = resolveUserPrefKey(user, staffDirectory);
        const formattedConv = formatConversationForUser(
          conv,
          user,
          staffDirectory,
          userPrefsByUserKey[userPrefKey],
          userPrefsByUserKey
        );

        return {
          success: true,
          workflow: instance,
          message: newMessage,
          conversation: formattedConv,
          task: createdTask,
        };
      } catch (err: SafeAny) {
        fastify.log.error('POST /chat/workflows/instances error:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể khởi tạo quy trình.' });
      }
    }
  );

  // POST /api/chat/workflows/instances/:instanceId/action (Advance / Approve / Reject / Confirm Workflow Step)
  fastify.post(
    '/chat/workflows/instances/:instanceId/action',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const { instanceId } = request.params as { instanceId: string };
        const body = (request.body || {}) as ActionMosChatWorkflowInstanceRequest;

        const [{ conversations, tasks, userPrefsByUserKey }, staffDirectory, wfState] = await Promise.all([
          loadChatState(fastify),
          loadStaffDirectoryCached(fastify),
          loadWorkflowState(fastify),
        ]);

        const instance = wfState.instances.find((i) => i.id === instanceId);
        if (!instance) {
          return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy phiên quy trình.' });
        }

        const actorStaffId = resolveUserStaffId(user, staffDirectory);
        const actorStaff = staffDirectory.find((s) => s.id === actorStaffId);
        const actorName = actorStaff?.displayName || (user as SafeAny)?.fullName || user?.username || 'Nhân sự';
        const roleInfo = getRoleDisplayLabel(actorStaff?.role || user?.role);

        const currentStep = instance.steps[instance.currentStepIndex];
        const isSuperAdmin = isDannyOrSuperAdminUser(user);
        const isAssignedStepActor =
          Boolean(currentStep?.actorStaffId && Number(currentStep.actorStaffId) === actorStaffId) ||
          Boolean(currentStep?.actorRole === 'REQUESTER' && Number(instance.initiatorStaffId) === actorStaffId) ||
          Boolean(
            currentStep?.actorName && currentStep.actorName.trim().toLowerCase() === actorName.trim().toLowerCase()
          );

        if (!isSuperAdmin && !isAssignedStepActor) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Chỉ người phụ trách bước hiện tại hoặc Super Admin mới có quyền xác nhận bước này.',
          });
        }

        if (
          body.action !== 'REJECT' &&
          currentStep?.requireAttachment &&
          (!body.attachments || body.attachments.length === 0)
        ) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Bước này bắt buộc phải đính kèm ảnh chụp màn hình / chứng từ (UNC).',
          });
        }

        const now = new Date();
        const nowIso = now.toISOString();
        const sanitizedAttachments = sanitizeChatAttachments(body.attachments);

        if (body.payload && typeof body.payload === 'object') {
          instance.formData = {
            ...instance.formData,
            ...body.payload,
          };
        }

        // Record current step completion or rejection
        const logEntry = instance.stepLogs[instance.currentStepIndex] || {
          stepIndex: instance.currentStepIndex,
          stepId: currentStep?.id || `step-${instance.currentStepIndex + 1}`,
          stepTitle: currentStep?.title || `Bước ${instance.currentStepIndex + 1}`,
          status: 'PENDING',
        };
        logEntry.status = body.action === 'REJECT' ? 'REJECTED' : body.action === 'APPROVE' ? 'APPROVED' : 'COMPLETED';
        logEntry.actorStaffId = actorStaffId;
        logEntry.actorName = actorName;
        logEntry.actorRole = roleInfo.label;
        logEntry.note = body.note?.trim() || null;
        if (sanitizedAttachments.length > 0) {
          logEntry.attachments = sanitizedAttachments;
        }
        logEntry.actedAt = nowIso;
        instance.stepLogs[instance.currentStepIndex] = logEntry;

        let statusText = '';
        if (body.action === 'REJECT') {
          instance.status = 'REJECTED';
          statusText = `❌ **${actorName}** đã từ chối tại bước **"${currentStep?.title}"**${body.note ? `: "${body.note}"` : '.'}`;
        } else if (instance.currentStepIndex + 1 < instance.steps.length) {
          instance.currentStepIndex += 1;
          const nextStep = instance.steps[instance.currentStepIndex];
          statusText = `✅ **${actorName}** đã hoàn tất bước **"${currentStep?.title}"**${body.note ? ` (${body.note})` : ''}. Chuyển sang bước ${instance.currentStepIndex + 1}: **${nextStep.title}**.`;
        } else {
          instance.status = 'COMPLETED';
          const hookRes = await executeWorkflowSystemHook(fastify, instance, actorStaffId, actorName);
          instance.syncedRecordType = hookRes.syncedRecordType;
          instance.syncedRecordId = hookRes.syncedRecordId;
          instance.syncedSummary = hookRes.syncedSummary;
          statusText = `🎉 **${actorName}** đã xác nhận hoàn tất bước cuối **"${currentStep?.title}"**!\n📊 **Đồng bộ hệ thống**: ${hookRes.syncedSummary || 'Đã lưu trữ toàn bộ hồ sơ quy trình.'}`;
        }

        instance.updatedAt = nowIso;

        // Post audit trail reply into the message's thread and update linked task
        const conv = conversations.find((c) => c.id === instance.conversationId);
        let targetMsg: MosChatMessage | null = null;
        let threadReply: MosChatThreadReply | null = null;
        let updatedTask: MosChatTaskItem | null = null;

        if (conv) {
          targetMsg = conv.messages.find((m) => m.id === instance.messageId) || null;
          if (targetMsg) {
            targetMsg.workflow = instance;
            threadReply = {
              id: `reply-wf-${Date.now()}`,
              senderId: actorStaffId,
              senderName: actorName,
              senderRole: roleInfo.label,
              senderAvatar: actorStaff?.avatarUrl || getInitials(actorName, user?.username),
              roleColor: roleInfo.color,
              text: statusText,
              timeLabel: formatTimeLabel(now),
              createdAt: nowIso,
              attachments: sanitizedAttachments.length > 0 ? sanitizedAttachments : undefined,
            };
            targetMsg.thread = [...(targetMsg.thread || []), threadReply];
          }
          conv.updatedAt = nowIso;
        }

        const linkedTask = tasks.find((t) => t.sourceMessageId === instance.messageId && !t.done);
        if (linkedTask) {
          if (instance.status === 'COMPLETED' || instance.status === 'REJECTED') {
            linkedTask.done = true;
            linkedTask.updatedAt = nowIso;
          } else {
            const nextStep = instance.steps[instance.currentStepIndex];
            if (nextStep) {
              linkedTask.title = `[Quy trình: ${instance.title}] Bước ${instance.currentStepIndex + 1}: ${nextStep.title}`;
              linkedTask.assigneeId = nextStep.actorStaffId ?? undefined;
              linkedTask.assigneeName = nextStep.actorName || nextStep.actorRole || linkedTask.assigneeName;
              linkedTask.remindAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
              linkedTask.fired = false;
              linkedTask.updatedAt = nowIso;
            }
          }
          updatedTask = linkedTask;
        }

        await Promise.all([
          saveWorkflowInstances(fastify, wfState.instances),
          saveConversations(fastify, conversations),
          saveTasks(fastify, tasks),
        ]);

        const userPrefKey = resolveUserPrefKey(user, staffDirectory);
        const formattedConv = conv
          ? formatConversationForUser(conv, user, staffDirectory, userPrefsByUserKey[userPrefKey], userPrefsByUserKey)
          : null;

        return {
          success: true,
          workflow: instance,
          message: targetMsg,
          conversation: formattedConv,
          task: updatedTask,
          threadReply,
        };
      } catch (err: SafeAny) {
        fastify.log.error('POST /chat/workflows/instances/:instanceId/action error:', err);
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', message: 'Không thể cập nhật bước quy trình.' });
      }
    }
  );

  // POST /api/chat/workflows/templates/from-thread (Super Admin Only: Package Ad-hoc Thread -> Reusable Workflow or Upgrade Workflow via Chat)
  fastify.post(
    '/chat/workflows/templates/from-thread',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        if (!isDannyOrSuperAdminUser(user)) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Chỉ Super Admin mới có quyền đóng gói hoặc nâng cấp Quy trình (Workflow).',
          });
        }

        const body = (request.body || {}) as SaveThreadAsWorkflowTemplateRequest;
        if (!body.name || !body.name.trim()) {
          return reply.status(400).send({ error: 'Bad Request', message: 'Vui lòng nhập tên quy trình.' });
        }

        const [{ conversations }, staffDirectory, wfState] = await Promise.all([
          loadChatState(fastify),
          loadStaffDirectoryCached(fastify),
          loadWorkflowState(fastify),
        ]);

        const senderStaffId = resolveUserStaffId(user, staffDirectory);
        const senderStaff = staffDirectory.find((s) => s.id === senderStaffId);
        const creatorName =
          senderStaff?.displayName || (user as SafeAny)?.fullName || user?.username || 'Danny (Super Admin)';
        const roleInfo = getRoleDisplayLabel(senderStaff?.role || user?.role);

        const conv = conversations.find((c) => c.id === body.conversationId);
        const rootMsg = body.messageId ? conv?.messages.find((m) => m.id === body.messageId) : null;
        const threadContextMessages: Array<{ senderName: string; senderRole?: string; text: string }> = [];

        if (rootMsg) {
          threadContextMessages.push({
            senderName: rootMsg.senderName,
            senderRole: rootMsg.senderRole,
            text: rootMsg.text,
          });
          for (const r of rootMsg.thread || []) {
            threadContextMessages.push({
              senderName: r.senderName,
              senderRole: r.senderRole,
              text: r.text,
            });
          }
        }

        const template = await saveOrUpgradeWorkflowFromThread(
          fastify,
          body,
          creatorName,
          threadContextMessages,
          wfState.templates
        );

        let systemReply: MosChatThreadReply | null = null;
        if (conv && rootMsg) {
          const now = new Date();
          systemReply = {
            id: `reply-wf-tpl-${Date.now()}`,
            senderId: senderStaffId,
            senderName: creatorName,
            senderRole: roleInfo.label,
            senderAvatar: senderStaff?.avatarUrl || getInitials(creatorName, user?.username),
            roleColor: roleInfo.color,
            text: `✨ **Đã chuẩn hóa thành Quy trình Hệ thống**: **${template.name}** (\`${template.code}\` · v${template.version})\nCác bước tự động: ${template.steps.map((s, i) => `(${i + 1}) ${s.title}`).join(' → ')}`,
            timeLabel: formatTimeLabel(now),
            createdAt: now.toISOString(),
          };
          rootMsg.thread = [...(rootMsg.thread || []), systemReply];
          conv.updatedAt = now.toISOString();
          await saveConversations(fastify, conversations, {
            touchedConversation: conv,
            touchedReply: {
              conversationId: conv.id,
              parentMessageId: rootMsg.id,
              reply: systemReply,
            },
          });
        }

        return {
          success: true,
          template,
          systemReply,
        };
      } catch (err: SafeAny) {
        fastify.log.error('POST /chat/workflows/templates/from-thread error:', err);
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', message: 'Không thể lưu quy trình từ luồng chat.' });
      }
    }
  );
}
