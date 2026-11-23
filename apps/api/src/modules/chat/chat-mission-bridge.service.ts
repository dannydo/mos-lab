import type { FastifyInstance } from 'fastify';
import type {
  ActionMosChatMissionRequest,
  CreateMosChatMissionRequest,
  MosChatConversation,
  MosChatMessage,
  MosChatStaffMember,
  MosChatTaskItem,
  MosChatThreadReply,
  ShareMosChatMissionRequest,
} from '@mos-lab/shared';
import type { JwtUserPayload } from '../../middlewares/auth.js';
import { executeMissionActionFromChat, syncChatReplyToMission } from './mission-bridge/mission-bridge-actions.js';
import { createMissionFromChat } from './mission-bridge/mission-bridge-create.js';
import { getSharedMissionPreview, shareMissionToChat } from './mission-bridge/mission-bridge-share.js';
import {
  buildMissionArtifactPreview,
  buildMissionSummaryFromReport,
  inferMissionExecutionTrack,
} from './mission-bridge/mission-bridge-summary.js';
import { syncLinkedMissionsIntoChatState } from './mission-bridge/mission-bridge-sync.js';

export { buildMissionArtifactPreview, buildMissionSummaryFromReport, inferMissionExecutionTrack };

export class ChatMissionBridgeService {
  static syncLinkedMissionsIntoChatState(
    fastify: FastifyInstance,
    conversations: MosChatConversation[],
    tasks: MosChatTaskItem[]
  ): Promise<boolean> {
    return syncLinkedMissionsIntoChatState(fastify, conversations, tasks);
  }

  static createMissionFromChat(
    fastify: FastifyInstance,
    user: JwtUserPayload,
    body: CreateMosChatMissionRequest,
    conversations: MosChatConversation[],
    tasks: MosChatTaskItem[],
    staffDirectory: MosChatStaffMember[],
    mosChatMediaRootPath: string
  ) {
    return createMissionFromChat(fastify, user, body, conversations, tasks, staffDirectory, mosChatMediaRootPath);
  }

  static syncChatReplyToMission(
    fastify: FastifyInstance,
    user: JwtUserPayload,
    msg: MosChatMessage,
    replyItem: MosChatThreadReply,
    mosChatMediaRootPath: string
  ): Promise<void> {
    return syncChatReplyToMission(fastify, user, msg, replyItem, mosChatMediaRootPath);
  }

  static executeMissionActionFromChat(
    fastify: FastifyInstance,
    user: JwtUserPayload,
    reportId: number,
    body: ActionMosChatMissionRequest,
    conversations: MosChatConversation[],
    tasks: MosChatTaskItem[]
  ) {
    return executeMissionActionFromChat(fastify, user, reportId, body, conversations, tasks);
  }

  static shareMissionToChat(
    fastify: FastifyInstance,
    user: JwtUserPayload,
    body: ShareMosChatMissionRequest,
    conversations: MosChatConversation[],
    staffDirectory: MosChatStaffMember[]
  ) {
    return shareMissionToChat(fastify, user, body, conversations, staffDirectory);
  }

  static getSharedMissionPreview(
    fastify: FastifyInstance,
    user: JwtUserPayload,
    reportId: number,
    conversations: MosChatConversation[],
    tasks: MosChatTaskItem[],
    staffDirectory: MosChatStaffMember[]
  ) {
    return getSharedMissionPreview(fastify, user, reportId, conversations, tasks, staffDirectory);
  }
}
