import {
  isAllowedAgModelId,
  isCanonicalSuperAdminIdentity,
  isSuperAdminRole,
  type AiChatContext,
  type MosChatConversation,
  type MosChatMessage,
  type MosChatThreadReply,
} from '@mos-lab/shared';
import type { FastifyInstance } from 'fastify';
import { loadChatState } from '../../chat/chat-state-store.js';
import { SYSTEM_PROMPT_ASSISTANT } from './ai-prompt-and-parser.js';

const MAX_ROOM_CONTEXT_CHARS = 12_000;
const DEBUG_PREFIX_REGEX = /^\/(?:ag-)?debug(?:\s+([\s\S]*))?$/i;

export interface StrictSuperAdminCandidate {
  id?: number | string;
  username?: string | null;
  email?: string | null;
  role?: string | null;
}

export function isStrictSuperAdminUser(user?: StrictSuperAdminCandidate | null): boolean {
  if (!user) return false;
  return isSuperAdminRole(user.role) || isCanonicalSuperAdminIdentity({ username: user.username, email: user.email });
}

export function extractDebugSlashPrefix(message: string): {
  hasDebugPrefix: boolean;
  cleanedMessage: string;
} {
  const trimmed = String(message || '').trim();
  const match = trimmed.match(DEBUG_PREFIX_REGEX);
  if (!match) {
    return { hasDebugPrefix: false, cleanedMessage: trimmed };
  }
  const rest = (match[1] || '').trim();
  return {
    hasDebugPrefix: true,
    cleanedMessage: rest || 'Kiểm tra và debug ngữ cảnh hiện tại giúp tôi.',
  };
}

export type AiDebugValidationResult =
  | {
      ok: true;
      debugMode: boolean;
      modelId?: string;
      cleanedMessage: string;
    }
  | {
      ok: false;
      status: 400 | 403;
      error: string;
      message: string;
    };

export function validateAiDebugAndModelRequest(
  user: StrictSuperAdminCandidate | null | undefined,
  body: { message?: string; debugMode?: boolean; modelId?: string },
  liveModelIds?: ReadonlySet<string>
): AiDebugValidationResult {
  const { hasDebugPrefix, cleanedMessage } = extractDebugSlashPrefix(body.message || '');
  const wantsDebug = Boolean(body.debugMode) || hasDebugPrefix;
  const requestedModelId = typeof body.modelId === 'string' && body.modelId.trim() ? body.modelId.trim() : undefined;

  if ((wantsDebug || requestedModelId) && !isStrictSuperAdminUser(user)) {
    return {
      ok: false,
      status: 403,
      error: 'Forbidden',
      message: 'Chỉ Super Admin mới được bật chế độ AG Debug hoặc chọn model Antigravity cho @MAI.',
    };
  }

  if (requestedModelId && !isAllowedAgModelId(requestedModelId, liveModelIds)) {
    return {
      ok: false,
      status: 400,
      error: 'InvalidModel',
      message: 'Model Antigravity không hợp lệ hoặc không được hỗ trợ.',
    };
  }

  return {
    ok: true,
    debugMode: wantsDebug,
    modelId: requestedModelId,
    cleanedMessage,
  };
}

function formatMessageLineForDebug(item: {
  senderName?: string;
  senderRole?: string;
  timeLabel?: string;
  text?: string;
  customerCard?: { name?: string; meta?: string } | null;
  attachments?: Array<{ name?: string; url?: string; mimeType?: string }>;
  threadCount?: number;
}): string {
  const sender = `${item.senderName || 'Ẩn danh'}${item.senderRole ? ` (${item.senderRole})` : ''}`;
  const time = item.timeLabel ? `[${item.timeLabel}] ` : '';
  const parts: string[] = [];
  if (item.text?.trim()) parts.push(item.text.trim());
  if (item.customerCard?.name) {
    parts.push(`[Thẻ KH: ${item.customerCard.name}${item.customerCard.meta ? ` · ${item.customerCard.meta}` : ''}]`);
  }
  if (item.attachments && item.attachments.length > 0) {
    const files = item.attachments.map((a) => a.name || a.url || 'tệp').join(', ');
    parts.push(`[Đính kèm: ${files}]`);
  }
  if (item.threadCount && item.threadCount > 0) {
    parts.push(`(${item.threadCount} phản hồi trong luồng)`);
  }
  return `- ${time}${sender}: ${parts.join(' ') || '(trống)'}`;
}

export async function loadRecentRoomContextForDebug(params: {
  fastify?: FastifyInstance;
  targetChatConvId?: string;
  targetChatThreadId?: string;
}): Promise<string> {
  const { fastify, targetChatConvId, targetChatThreadId } = params;
  if (!fastify || !targetChatConvId) return '';

  try {
    const state = await loadChatState(fastify);
    const conv: MosChatConversation | undefined = state.conversations.find((c) => c.id === targetChatConvId);
    if (!conv) return '';

    const lines: string[] = [`Không gian: ${conv.name} (id=${conv.id}, type=${conv.type})`];

    if (targetChatThreadId) {
      const rootMsg: MosChatMessage | undefined = (conv.messages || []).find((m) => m.id === targetChatThreadId);
      if (rootMsg && !rootMsg.isDeleted) {
        lines.push('Tin nhắn gốc của luồng:');
        lines.push(
          formatMessageLineForDebug({
            senderName: rootMsg.senderName,
            senderRole: rootMsg.senderRole,
            timeLabel: rootMsg.timeLabel,
            text: rootMsg.text,
            customerCard: rootMsg.customerCard,
            attachments: rootMsg.attachments,
          })
        );
        const replies: MosChatThreadReply[] = (rootMsg.thread || []).filter((r) => !r.isDeleted).slice(-15);
        if (replies.length > 0) {
          lines.push('Các phản hồi gần nhất trong luồng:');
          for (const r of replies) {
            lines.push(
              formatMessageLineForDebug({
                senderName: r.senderName,
                senderRole: r.senderRole,
                timeLabel: r.timeLabel,
                text: r.text,
                customerCard: r.customerCard,
                attachments: r.attachments,
              })
            );
          }
        }
      }
    } else {
      const recentMsgs = (conv.messages || []).filter((m) => !m.isDeleted).slice(-15);
      if (recentMsgs.length > 0) {
        lines.push('Các tin nhắn gần nhất trong phòng chat:');
        for (const m of recentMsgs) {
          lines.push(
            formatMessageLineForDebug({
              senderName: m.senderName,
              senderRole: m.senderRole,
              timeLabel: m.timeLabel,
              text: m.text,
              customerCard: m.customerCard,
              attachments: m.attachments,
              threadCount: m.thread?.length || 0,
            })
          );
        }
      }
    }

    const body = lines.join('\n').slice(0, MAX_ROOM_CONTEXT_CHARS);
    return `<LIVE_CHAT_ROOM_CONTEXT>\n${body}\n</LIVE_CHAT_ROOM_CONTEXT>`;
  } catch {
    return '';
  }
}

export function buildDebugPromptForAg(params: {
  trimmedMessage: string;
  staffId: number;
  context?: AiChatContext;
  liveCustomerText: string;
  liveStaffCareerText: string;
  liveGoogleWorkspaceText: string;
  liveRoomContextText?: string;
  recentMessages?: Array<{ role: string; content: string }>;
  includeRecentHistory?: boolean;
}): string {
  const {
    trimmedMessage,
    staffId,
    context,
    liveCustomerText,
    liveStaffCareerText,
    liveGoogleWorkspaceText,
    liveRoomContextText,
    recentMessages,
    includeRecentHistory,
  } = params;

  const agContextInfo = `[Ngữ cảnh màn hình: Trang=${context?.page || context?.pathname || 'customers'}, Bộ lọc hiện tại=${JSON.stringify(
    context?.currentFilter || {}
  )}, Số khách đang chọn=${context?.selectedCustomerCount || 0}]
[Người dùng: ${context?.userName || 'Danny'} (ID: ${staffId}, Role: ${context?.myRole || 'super_admin'})]`;

  const historyBlock =
    includeRecentHistory && recentMessages && recentMessages.length > 1
      ? `<RECENT_CONVERSATION_HISTORY>\n${recentMessages
          .slice(-7, -1)
          .map((m) => `${m.role === 'assistant' ? 'MAI' : 'User'}: ${m.content.slice(0, 800)}`)
          .join('\n')}\n</RECENT_CONVERSATION_HISTORY>\n`
      : '';

  return `${SYSTEM_PROMPT_ASSISTANT}

${liveCustomerText ? `${liveCustomerText}\n` : ''}${liveStaffCareerText ? `${liveStaffCareerText}\n` : ''}${liveGoogleWorkspaceText ? `${liveGoogleWorkspaceText}\n` : ''}${liveRoomContextText ? `${liveRoomContextText}\n` : ''}${historyBlock}${agContextInfo}

[Yêu cầu AG Debug từ Super Admin]:
${trimmedMessage}

CHẾ ĐỘ ANTIGRAVITY DEBUG (CHỈ DÀNH CHO SUPER ADMIN DANNY):
- Bạn đang chạy trong chế độ AG Debug cho mOS Chat (@MAI) tại workspace repo \`/home/danny/projects/mos-lab\` (máy Win AG dev server: Web \`http://localhost:4100\`, API \`http://localhost:4101\`).
- ĐƯỢC PHÉP SỬ DỤNG TOOL: Bạn ĐƯỢC PHÉP gọi \`read_file\`, tìm kiếm/grep code, \`run_command\` chỉ đọc (\`git log/diff/status\`, kiểm tra code), chạy unit/integration test (\`vitest\`, \`tsx --test\`, \`typecheck\`), chạy Playwright / kiểm tra flow trên \`localhost:4100\` / \`localhost:4101\`, và truy vấn SQL chỉ đọc (\`SET STATEMENT max_statement_time=10 FOR SELECT ...\`).
- GIỚI HẠN AN TOÀN TUYỆT ĐỐI:
  1. KHÔNG chỉnh sửa, ghi đè, hoặc xóa file mã nguồn trong repo.
  2. KHÔNG chạy \`git commit\`, \`git push\`, \`git reset\`, hoặc các script deploy.
  3. KHÔNG ghi/sửa/xóa dữ liệu trên database production.
  4. KHÔNG gọi lệnh âm thanh \`/Users/dannydo/.gemini/antigravity/bin/speak\`.
- ĐỊNH DẠNG PHẢN HỒI: Trả lời bằng tiếng Việt súc tích, khoa học, rõ ràng để cả Super Admin Danny và nhân sự trong phòng chat cùng theo dõi được:
  * Tóm tắt nguyên nhân / kết quả kiểm tra
  * Đường dẫn file + dòng code liên quan (nếu có)
  * Bằng chứng test / log / flow thực tế đã chạy (chỉ báo cáo những gì thực sự chạy và quan sát được)
  * Đề xuất hướng xử lý tiếp theo (nếu cần sửa code, nhắc tạo mOS Mission để đi qua quy trình 3 cổng).
- Đặt quá trình suy luận trong thẻ <thinking>...</thinking> nếu hữu ích.`;
}
