import type { FastifyInstance } from 'fastify';
import { decodeAndValidateChatFile, sanitizeChatAttachments } from './chat-file.service.js';
import {
  canUserAccessConversation,
  canUserEditChatMessage,
  computeUnreadCountForUser,
  isDannyOrSuperAdminUser,
  isStaffMentionedInChatText,
} from './chat-access.service.js';
import {
  computeConversationReadReceipts,
  computeThreadReadReceiptsForMessage,
  computeUnreadThreadReplyCountForUser,
  filterAndFormatConversationsForUser,
  filterTasksForUser,
  formatConversationForUser,
  resolveConversationParticipantStaffIds,
} from './chat-format.service.js';
import { deduplicateTasks, moveChatThreadItemInMemory } from './chat-thread-task-helpers.js';
import { loadStaffDirectoryCached } from './chat-staff-directory.service.js';
import { loadChatState } from './chat-state-store.js';
import { registerChatBootstrapRoutes } from './routes/bootstrap.routes.js';
import { registerChatMediaAndTtsRoutes } from './routes/media-and-tts.routes.js';
import { registerChatMessageSendForwardRoutes } from './routes/messages-send-forward.routes.js';
import { registerChatThreadRoutes } from './routes/threads.routes.js';
import { registerChatMessageEngagementRoutes } from './routes/messages-engagement.routes.js';
import { registerChatMessageEditDeleteRoutes } from './routes/messages-edit-delete.routes.js';
import { registerChatTaskCreateRoutes } from './routes/tasks-create.routes.js';
import { registerChatTaskManageRoutes } from './routes/tasks-manage.routes.js';
import { registerChatConversationReadPinRoutes } from './routes/conversations-read-pin.routes.js';
import { registerChatConversationMemberConfigRoutes } from './routes/conversations-members-config.routes.js';
import { registerChatMissionRoutes } from './routes/missions.routes.js';
import { registerChatWorkflowRoutes } from './routes/workflows.routes.js';
import { registerChatRealtimeAndSearchRoutes } from './routes/realtime-and-search.routes.js';
import { registerChatVoiceCallRoutes } from './routes/voice-calls.routes.js';
import { registerChatPushAndWorkspaceRoutes } from './routes/push-and-workspace.routes.js';

export {
  decodeAndValidateChatFile,
  sanitizeChatAttachments,
  canUserAccessConversation,
  isDannyOrSuperAdminUser,
  canUserEditChatMessage,
  isStaffMentionedInChatText,
  computeUnreadCountForUser,
  formatConversationForUser,
  filterAndFormatConversationsForUser,
  filterTasksForUser,
  resolveConversationParticipantStaffIds,
  computeConversationReadReceipts,
  computeThreadReadReceiptsForMessage,
  computeUnreadThreadReplyCountForUser,
  deduplicateTasks,
  moveChatThreadItemInMemory,
  loadChatState,
  loadStaffDirectoryCached,
};

export async function mosChatRoutes(fastify: FastifyInstance) {
  await registerChatBootstrapRoutes(fastify);
  await registerChatMediaAndTtsRoutes(fastify);
  await registerChatMessageSendForwardRoutes(fastify);
  await registerChatThreadRoutes(fastify);
  await registerChatMessageEngagementRoutes(fastify);
  await registerChatMessageEditDeleteRoutes(fastify);
  await registerChatTaskCreateRoutes(fastify);
  await registerChatTaskManageRoutes(fastify);
  await registerChatConversationReadPinRoutes(fastify);
  await registerChatConversationMemberConfigRoutes(fastify);
  await registerChatMissionRoutes(fastify);
  await registerChatWorkflowRoutes(fastify);
  await registerChatRealtimeAndSearchRoutes(fastify);
  await registerChatVoiceCallRoutes(fastify);
  await registerChatPushAndWorkspaceRoutes(fastify);
}
