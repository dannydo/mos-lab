import type {
  ActionMosChatMissionRequest,
  ActionMosChatMissionResponse,
  CreateMosChatConversationRequest,
  CreateMosChatMessageRequest,
  CreateMosChatMissionRequest,
  CreateMosChatMissionResponse,
  CreateMosChatTaskRequest,
  CreateMosChatThreadReplyRequest,
  DeleteMosChatMessageRequest,
  EditMosChatMessageRequest,
  MosChatAccessConfig,
  MosChatBootstrapResponse,
  MosChatConversation,
  MosChatMessage,
  MosChatTaskItem,
  MosChatThreadReply,
  MosChatUserSidebarPrefs,
  SafeAny,
  UpdateMosChatAccessConfigRequest,
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
    ): Promise<{ success: boolean; unreadCount: number; userPrefs: MosChatUserSidebarPrefs }> => {
      const res = await api.post(`/chat/conversations/${encodeURIComponent(conversationId)}/read`);
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
    ): Promise<{ success: boolean; reply: MosChatThreadReply; message: MosChatMessage }> => {
      const res = await api.post('/chat/threads', payload);
      invalidateApiGetCache(['/chat/bootstrap']);
      return res.data;
    },
    reactToMessage: async (
      messageId: string,
      conversationId: string,
      emoji: string
    ): Promise<{
      success: boolean;
      reactions: Record<string, number>;
      reactionUsers?: Record<string, Array<number | string>>;
    }> => {
      const res = await api.post(`/chat/messages/${encodeURIComponent(messageId)}/reaction`, {
        conversationId,
        emoji,
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
    createTask: async (
      payload: CreateMosChatTaskRequest
    ): Promise<{ success: boolean; task: MosChatTaskItem; conversation: MosChatConversation }> => {
      const res = await api.post('/chat/tasks', payload);
      invalidateApiGetCache(['/chat/bootstrap']);
      return res.data;
    },
    updateTask: async (
      taskId: string,
      payload: { done?: boolean; snoozeSeconds?: number; triggerReminderNow?: boolean }
    ): Promise<{ success: boolean; task: MosChatTaskItem }> => {
      const res = await api.patch(`/chat/tasks/${encodeURIComponent(taskId)}`, payload);
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
  },
};
