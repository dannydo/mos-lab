import type {
  ActionMosChatMissionRequest,
  ActionMosChatMissionResponse,
  ActionMosChatWorkflowInstanceRequest,
  ActionMosChatWorkflowInstanceResponse,
  CreateMosChatConversationRequest,
  CreateMosChatMessageRequest,
  CreateMosChatMissionRequest,
  CreateMosChatMissionResponse,
  CreateMosChatTaskRequest,
  CreateMosChatThreadReplyRequest,
  CreateMosChatWorkflowInstanceRequest,
  CreateMosChatWorkflowInstanceResponse,
  DeleteMosChatMessageRequest,
  DeleteMosChatTaskResponse,
  EditMosChatMessageRequest,
  MarkConversationAsUnreadResponse,
  MarkThreadAsReadResponse,
  MosChatAccessConfig,
  MosChatBootstrapResponse,
  MosChatConversation,
  MosChatMessage,
  MosChatTaskItem,
  MosChatThreadReply,
  MosChatUserSidebarPrefs,
  MosChatWorkflowInstance,
  MosChatWorkflowTemplate,
  MoveMosChatThreadItemRequest,
  MoveMosChatThreadItemResponse,
  RestoreMosChatMessageRequest,
  SafeAny,
  SaveThreadAsWorkflowTemplateRequest,
  SaveThreadAsWorkflowTemplateResponse,
  TogglePinConversationResponse,
  UpdateMosChatAccessConfigRequest,
  UpdateMosChatNicknameRequest,
  UpdateMosChatTaskRequest,
  UploadMosChatImageRequest,
  UploadMosChatImageResponse,
} from '@mos-lab/shared';
import { api, dedupeApiGet, invalidateApiGetCache, ApiRequestOptions } from './base';

export const chatApi = {
  chat: {
    bootstrap: async (
      params?: { sinceVersion?: number },
      options?: ApiRequestOptions
    ): Promise<MosChatBootstrapResponse> => {
      const res = await dedupeApiGet<MosChatBootstrapResponse>(
        '/chat/bootstrap',
        params?.sinceVersion ? { sinceVersion: String(params.sinceVersion) } : undefined,
        2500,
        options
      );
      return res;
    },
    getAccessConfig: async (
      options?: ApiRequestOptions
    ): Promise<{ success: boolean; accessConfig: MosChatAccessConfig; canAccessChat: boolean }> => {
      return dedupeApiGet('/chat/access-config', undefined, 2500, options);
    },
    updateAccessConfig: async (
      payload: UpdateMosChatAccessConfigRequest
    ): Promise<{ success: boolean; accessConfig: MosChatAccessConfig }> => {
      const res = await api.put('/chat/access-config', payload);
      invalidateApiGetCache(['/chat/bootstrap', '/chat/access-config']);
      return res.data;
    },
    updateUserPrefs: async (
      payload: Partial<MosChatUserSidebarPrefs>
    ): Promise<{ success: boolean; userPrefs: MosChatUserSidebarPrefs }> => {
      const res = await api.put('/chat/user-prefs', payload);
      invalidateApiGetCache(['/chat/bootstrap']);
      return res.data;
    },
    markAsRead: async (
      conversationId: string
    ): Promise<{
      success: boolean;
      unreadCount: number;
      userPrefs: MosChatUserSidebarPrefs;
      conversation?: MosChatConversation;
    }> => {
      const res = await api.post(`/chat/conversations/${encodeURIComponent(conversationId)}/read`);
      invalidateApiGetCache(['/chat/bootstrap']);
      return res.data;
    },
    markThreadAsRead: async (conversationId: string, messageId: string): Promise<MarkThreadAsReadResponse> => {
      const res = await api.post(
        `/chat/conversations/${encodeURIComponent(conversationId)}/threads/${encodeURIComponent(messageId)}/read`
      );
      invalidateApiGetCache(['/chat/bootstrap']);
      return res.data;
    },
    markAsUnread: async (conversationId: string): Promise<MarkConversationAsUnreadResponse> => {
      const res = await api.post(`/chat/conversations/${encodeURIComponent(conversationId)}/unread`);
      invalidateApiGetCache(['/chat/bootstrap']);
      return res.data;
    },
    togglePinConversation: async (conversationId: string): Promise<TogglePinConversationResponse> => {
      const res = await api.post(`/chat/conversations/${encodeURIComponent(conversationId)}/pin`);
      invalidateApiGetCache(['/chat/bootstrap']);
      return res.data;
    },
    uploadImage: async (payload: UploadMosChatImageRequest): Promise<UploadMosChatImageResponse> => {
      const res = await api.post('/chat/upload-image', payload);
      return res.data;
    },
    sendMessage: async (
      payload: CreateMosChatMessageRequest
    ): Promise<{ success: boolean; message: MosChatMessage; conversation: MosChatConversation }> => {
      const res = await api.post('/chat/messages', payload);
      invalidateApiGetCache(['/chat/bootstrap']);
      return res.data;
    },
    sendThreadReply: async (
      payload: CreateMosChatThreadReplyRequest
    ): Promise<{
      success: boolean;
      reply: MosChatThreadReply;
      message: MosChatMessage;
      conversation?: MosChatConversation;
    }> => {
      const res = await api.post('/chat/threads', payload);
      invalidateApiGetCache(['/chat/bootstrap']);
      return res.data;
    },
    moveThreadItem: async (payload: MoveMosChatThreadItemRequest): Promise<MoveMosChatThreadItemResponse> => {
      const res = await api.post('/chat/threads/move', payload);
      invalidateApiGetCache(['/chat/bootstrap', '/bug-reports/inbox']);
      return res.data;
    },
    reactToMessage: async (
      messageId: string,
      conversationId: string,
      emoji: string,
      replyId?: string
    ): Promise<{
      success: boolean;
      reactions: Record<string, number>;
      reactionUsers?: Record<string, Array<number | string>>;
    }> => {
      const res = await api.post(`/chat/messages/${encodeURIComponent(messageId)}/reaction`, {
        conversationId,
        emoji,
        replyId,
      });
      invalidateApiGetCache(['/chat/bootstrap']);
      return res.data;
    },
    togglePinMessage: async (
      messageId: string,
      conversationId: string
    ): Promise<{ success: boolean; pinned: boolean }> => {
      const res = await api.post(`/chat/messages/${encodeURIComponent(messageId)}/pin`, {
        conversationId,
      });
      invalidateApiGetCache(['/chat/bootstrap']);
      return res.data;
    },
    editMessage: async (
      messageId: string,
      payload: EditMosChatMessageRequest
    ): Promise<{ success: boolean; message: MosChatMessage; target?: SafeAny }> => {
      const res = await api.put(`/chat/messages/${encodeURIComponent(messageId)}`, payload);
      invalidateApiGetCache(['/chat/bootstrap']);
      return res.data;
    },
    deleteMessage: async (
      messageId: string,
      payload: DeleteMosChatMessageRequest
    ): Promise<{ success: boolean; message: MosChatMessage; target?: SafeAny }> => {
      const res = await api.delete(`/chat/messages/${encodeURIComponent(messageId)}`, {
        data: payload,
        params: payload,
      });
      invalidateApiGetCache(['/chat/bootstrap']);
      return res.data;
    },
    restoreMessage: async (
      messageId: string,
      payload: RestoreMosChatMessageRequest
    ): Promise<{ success: boolean; message: MosChatMessage; target?: SafeAny }> => {
      const res = await api.post(`/chat/messages/${encodeURIComponent(messageId)}/restore`, payload);
      invalidateApiGetCache(['/chat/bootstrap']);
      return res.data;
    },
    createTask: async (
      payload: CreateMosChatTaskRequest
    ): Promise<{ success: boolean; task: MosChatTaskItem; conversation: MosChatConversation }> => {
      const res = await api.post('/chat/tasks', payload);
      invalidateApiGetCache(['/chat/bootstrap']);
      return res.data;
    },
    updateTask: async (
      taskId: string,
      payload: UpdateMosChatTaskRequest
    ): Promise<{ success: boolean; task: MosChatTaskItem }> => {
      const res = await api.patch(`/chat/tasks/${encodeURIComponent(taskId)}`, payload);
      invalidateApiGetCache(['/chat/bootstrap']);
      return res.data;
    },
    deleteTask: async (taskId: string): Promise<DeleteMosChatTaskResponse> => {
      const res = await api.delete(`/chat/tasks/${encodeURIComponent(taskId)}`);
      invalidateApiGetCache(['/chat/bootstrap']);
      return res.data;
    },
    createConversation: async (
      payload: CreateMosChatConversationRequest
    ): Promise<{ success: boolean; conversation: MosChatConversation }> => {
      const res = await api.post('/chat/conversations', payload);
      invalidateApiGetCache(['/chat/bootstrap']);
      return res.data;
    },
    addMember: async (
      conversationId: string,
      staffIdOrIds: number | number[]
    ): Promise<{ success: boolean; conversation: MosChatConversation }> => {
      const payload = Array.isArray(staffIdOrIds) ? { staffIds: staffIdOrIds } : { staffId: staffIdOrIds };
      const res = await api.post(`/chat/conversations/${encodeURIComponent(conversationId)}/members`, payload);
      invalidateApiGetCache(['/chat/bootstrap']);
      return res.data;
    },
    removeMember: async (
      conversationId: string,
      staffId: number
    ): Promise<{ success: boolean; conversation: MosChatConversation }> => {
      const res = await api.delete(
        `/chat/conversations/${encodeURIComponent(conversationId)}/members/${encodeURIComponent(String(staffId))}`
      );
      invalidateApiGetCache(['/chat/bootstrap']);
      return res.data;
    },
    updateNickname: async (
      conversationId: string,
      payload: UpdateMosChatNicknameRequest
    ): Promise<{
      success: boolean;
      conversation: MosChatConversation;
      memberNicknames: Record<string, string>;
    }> => {
      const res = await api.put(`/chat/conversations/${encodeURIComponent(conversationId)}/nickname`, payload);
      invalidateApiGetCache(['/chat/bootstrap']);
      return res.data;
    },
    createMission: async (payload: CreateMosChatMissionRequest): Promise<CreateMosChatMissionResponse> => {
      const res = await api.post('/chat/missions', payload);
      invalidateApiGetCache(['/chat/bootstrap', '/bug-reports/inbox']);
      return res.data;
    },
    missionAction: async (
      reportId: number,
      payload: ActionMosChatMissionRequest
    ): Promise<ActionMosChatMissionResponse> => {
      const res = await api.post(`/chat/missions/${encodeURIComponent(String(reportId))}/action`, payload);
      invalidateApiGetCache(['/chat/bootstrap', '/bug-reports/inbox']);
      return res.data;
    },
    listWorkflows: async (
      options?: ApiRequestOptions
    ): Promise<{ success: boolean; templates: MosChatWorkflowTemplate[]; instances: MosChatWorkflowInstance[] }> => {
      return dedupeApiGet('/chat/workflows', undefined, 2500, options);
    },
    createWorkflowInstance: async (
      payload: CreateMosChatWorkflowInstanceRequest
    ): Promise<CreateMosChatWorkflowInstanceResponse> => {
      const res = await api.post('/chat/workflows/instances', payload);
      invalidateApiGetCache(['/chat/bootstrap', '/chat/workflows']);
      return res.data;
    },
    actionWorkflowInstance: async (
      instanceId: string,
      payload: ActionMosChatWorkflowInstanceRequest
    ): Promise<ActionMosChatWorkflowInstanceResponse> => {
      const res = await api.post(`/chat/workflows/instances/${encodeURIComponent(instanceId)}/action`, payload);
      invalidateApiGetCache(['/chat/bootstrap', '/chat/workflows']);
      return res.data;
    },
    saveThreadAsWorkflowTemplate: async (
      payload: SaveThreadAsWorkflowTemplateRequest
    ): Promise<SaveThreadAsWorkflowTemplateResponse> => {
      const res = await api.post('/chat/workflows/templates/from-thread', payload);
      invalidateApiGetCache(['/chat/bootstrap', '/chat/workflows']);
      return res.data;
    },
  },
};
