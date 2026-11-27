import axios from 'axios';
import type { AiChatContext } from '@mos-lab/shared';
import { buildDebugPromptForAg } from './ai-debug-mode.js';
import { generateAssistantFallback } from './ai-fallback.js';
import { extractThinkingAndAction, SYSTEM_PROMPT_ASSISTANT, type ParsedAiResponse } from './ai-prompt-and-parser.js';

export interface AgBridgeClient {
  isLocalAgAvailable(): Promise<boolean>;
  executeLocalAgPrompt(
    conversationId: string | undefined,
    prompt: string,
    title?: string,
    options?: { timeoutMs?: number; model?: string }
  ): Promise<{ conversationId: string; response: ParsedAiResponse } | null>;
  enqueueRemoteChatJob(
    conversationId: string | undefined,
    prompt: string,
    title: string,
    timeoutMs: number,
    sessionId: string,
    metadata: {
      scope?: string;
      targetChatConvId?: string;
      targetChatThreadId?: string;
      userName?: string;
      model?: string;
      debugMode?: boolean;
      executionTimeoutMs?: number;
    }
  ): Promise<{ conversationId: string; response: ParsedAiResponse; jobId?: string } | null>;
  markJobDelivered(jobId: string): void;
}

export interface EngineRunResult {
  parsedResponse: ParsedAiResponse;
  source: 'ag' | 'gemini' | 'fallback';
  agConversationId?: string;
}

export async function runAssistantEngines(params: {
  sessionId: string;
  staffId: number;
  trimmedMessage: string;
  scope: string;
  context?: AiChatContext;
  recentMessages: Array<{ role: string; content: string }>;
  liveCustomerText: string;
  liveStaffCareerText: string;
  liveGoogleWorkspaceText: string;
  liveRoomContextText?: string;
  agConversationId?: string;
  targetChatConvId?: string;
  targetChatThreadId?: string;
  debugMode?: boolean;
  modelId?: string;
  includeRecentHistory?: boolean;
  agBridge: AgBridgeClient;
}): Promise<EngineRunResult> {
  const {
    sessionId,
    staffId,
    trimmedMessage,
    scope,
    context,
    recentMessages,
    liveCustomerText,
    liveStaffCareerText,
    liveGoogleWorkspaceText,
    liveRoomContextText = '',
    agConversationId,
    targetChatConvId,
    targetChatThreadId,
    debugMode = false,
    modelId,
    includeRecentHistory = false,
    agBridge,
  } = params;

  let debugBridgeFailureReason = '';

  // 1. PRIMARY ENGINE: Route through Antigravity (AG) Desktop Bridge
  try {
    const agContextInfo = `[Ngữ cảnh màn hình: Trang=${context?.page || context?.pathname || 'customers'}, Bộ lọc hiện tại=${JSON.stringify(
      context?.currentFilter || {}
    )}, Số khách đang chọn=${context?.selectedCustomerCount || 0}]
[Người dùng: ${context?.userName || 'Danny'} (ID: ${staffId}, Role: ${context?.myRole || 'staff'})]`;

    const historyHint =
      includeRecentHistory && recentMessages.length > 1
        ? `\n[Lịch sử trao đổi gần nhất]:\n${recentMessages
            .slice(-5, -1)
            .map((m) => `${m.role === 'assistant' ? 'MAI' : 'User'}: ${m.content.slice(0, 500)}`)
            .join('\n')}\n`
        : '';

    const promptForAg = debugMode
      ? buildDebugPromptForAg({
          trimmedMessage,
          staffId,
          context,
          liveCustomerText,
          liveStaffCareerText,
          liveGoogleWorkspaceText,
          liveRoomContextText,
          recentMessages,
          includeRecentHistory,
        })
      : `${SYSTEM_PROMPT_ASSISTANT}

${liveCustomerText ? `${liveCustomerText}\n` : ''}${liveStaffCareerText ? `${liveStaffCareerText}\n` : ''}${liveGoogleWorkspaceText ? `${liveGoogleWorkspaceText}\n` : ''}${historyHint}${agContextInfo}

[Yêu cầu]:
${trimmedMessage}

Quy định phản hồi:
- BẠN LÀ TRỢ LÝ HỘI THOẠI TRÊN GIAO DIỆN WEB mOS CHAT (MAI). BẠN ĐÃ CÓ ĐẦY ĐỦ THÔNG TIN TRONG NGỮ CẢNH TRÊN.
- TUYỆT ĐỐI KHÔNG GỌI BẤT KỲ TOOL NÀO (KHÔNG GỌI read_file, run_command, search_code, edit_file).
- HÃY TRẢ LỜI NGAY TRỰC TIẾP TRONG LƯỢT ĐẦU TIÊN (Step 1) BẰNG VĂN BẢN VÀ THẺ <thinking>, <action> NẾU CÓ.
- Hãy suy luận và phân tích kỹ lưỡng. Đặt quá trình tư duy trong thẻ <thinking>...</thinking>.
- Nếu người dùng cần lọc tệp khách hàng, hãy đề xuất cấu hình bộ lọc cụ thể trong thẻ <action type="APPLY_FILTER" label="...">JSON_FILTER_PAYLOAD</action>.
- Trả lời bằng tiếng Việt thân thiện, súc tích và chuẩn xác.
- QUAN TRỌNG: Đây là phản hồi văn bản cho giao diện web mOS Chat / MAI, KHÔNG gọi lệnh speak âm thanh để tập trung phản hồi nhanh và chính xác nhất cho người dùng.`;

    const agTitle = debugMode
      ? `[mOS AG Debug - MAI] ${trimmedMessage.slice(0, 40)}`
      : `[mOS AI - MAI] ${trimmedMessage.slice(0, 40)}`;
    const localTimeoutMs = debugMode ? 420_000 : 240_000;
    const remoteTimeoutMs = debugMode ? 360_000 : 150_000;
    const isTestEnv =
      process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST) || Boolean(process.env.JEST_WORKER_ID);

    if ((!isTestEnv || debugMode) && (await agBridge.isLocalAgAvailable())) {
      const agResult = await agBridge.executeLocalAgPrompt(agConversationId, promptForAg, agTitle, {
        timeoutMs: localTimeoutMs,
        model: modelId,
      });
      if (agResult?.response?.content) {
        return {
          parsedResponse: agResult.response,
          source: 'ag',
          agConversationId: agResult.conversationId,
        };
      }
    } else if (!isTestEnv || debugMode) {
      // Try remote bridge queue (when API is running on VPS and Danny's Mac/Win daemon is polling)
      try {
        const agResult = await agBridge.enqueueRemoteChatJob(
          agConversationId,
          promptForAg,
          agTitle,
          remoteTimeoutMs,
          sessionId,
          {
            scope,
            targetChatConvId,
            targetChatThreadId,
            userName: context?.userName,
            model: modelId,
            debugMode,
            executionTimeoutMs: localTimeoutMs,
          }
        );
        if (agResult?.response?.content) {
          if (agResult.jobId) {
            agBridge.markJobDelivered(agResult.jobId);
          }
          return {
            parsedResponse: agResult.response,
            source: 'ag',
            agConversationId: agResult.conversationId,
          };
        }
      } catch (remoteErr) {
        debugBridgeFailureReason = remoteErr instanceof Error ? remoteErr.message : String(remoteErr);
      }
    }
  } catch (agErr) {
    debugBridgeFailureReason = agErr instanceof Error ? agErr.message : String(agErr);
  }

  // CRITICAL: Never fall back to Gemini 2.5 Flash or static fallback in AG Debug Mode
  // because Gemini cannot inspect local code or run tests and would fabricate answers.
  if (debugMode) {
    const detail = debugBridgeFailureReason ? ` (${debugBridgeFailureReason.slice(0, 180)})` : '';
    return {
      parsedResponse: {
        content:
          `⚠️ **Không thể chạy AG Debug Mode** vì cầu nối Antigravity (Win AG / Mac Bridge) hiện đang offline hoặc quá thời gian chờ${detail}.\n\n` +
          `Anh Danny vui lòng kiểm tra daemon \`ag-task-provisioner\` và Antigravity Language Server rồi thử lại nhé (chế độ Debug không fallback sang Gemini để tránh trả lời mò).`,
        thinking: null,
        suggestedAction: null,
        suggestedActions: [],
      },
      source: 'fallback',
      agConversationId,
    };
  }

  // 2. SECONDARY ENGINE FALLBACK: Gemini 2.5 Flash / Smart Domain Fallback
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

      for (const m of recentMessages) {
        const role = m.role === 'assistant' ? 'model' : 'user';
        contents.push({
          role,
          parts: [{ text: m.content }],
        });
      }

      const contextStr = `\n${liveCustomerText ? `${liveCustomerText}\n` : ''}${
        liveStaffCareerText ? `${liveStaffCareerText}\n` : ''
      }${liveGoogleWorkspaceText ? `${liveGoogleWorkspaceText}\n` : ''}[Ngữ cảnh màn hình: Trang=${
        context?.page || context?.pathname || 'customers'
      }, Bộ lọc hiện tại=${JSON.stringify(context?.currentFilter || {})}, Số khách đang chọn=${
        context?.selectedCustomerCount || 0
      }]`;

      if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
        contents[contents.length - 1].parts[0].text += contextStr;
      } else {
        contents.push({
          role: 'user',
          parts: [{ text: `${contextStr}\n${trimmedMessage}` }],
        });
      }

      const payload = {
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT_ASSISTANT }],
        },
        contents,
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 1024,
        },
      };

      const response = await axios.post(geminiUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15_000,
      });

      const replyRaw = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (replyRaw) {
        return {
          parsedResponse: extractThinkingAndAction(replyRaw),
          source: 'gemini',
          agConversationId,
        };
      }
    } catch {
      // Gemini request failed; fall through to deterministic domain fallback
    }
  }

  return {
    parsedResponse: generateAssistantFallback(trimmedMessage, context, liveStaffCareerText),
    source: 'fallback',
    agConversationId,
  };
}
