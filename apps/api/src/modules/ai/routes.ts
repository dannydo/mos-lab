import { FastifyInstance } from 'fastify';
import axios from 'axios';
import { requireAuth } from '../../middlewares/auth.js';
import { AiAssistantService } from './ai.service.js';
import type { AiAssistantChatRequest, CreateAiSessionRequest } from '@mos-lab/shared';

const SYSTEM_PROMPT = `Bạn là mOS Voice Copilot — Trợ lý điều hành AI bằng giọng nói của hệ thống mOS Lab (chuỗi salon Wings Lashes).

ĐẶC THÙ GIAO TIẾP VOICE CHAT (TRẢ LỜI ĐỂ ĐỌC BẰNG GIỌNG NÓI):
1. Câu trả lời của bạn sẽ được phát âm thanh trực tiếp qua Text-to-Speech (TTS) cho người dùng nghe.
2. Trả lời ngắn gọn, cô đọng, tự nhiên, thân thiện và gãy gọn bằng tiếng Việt. Độ dài lý tưởng là 2 đến 4 câu.
3. Tối ưu cho việc phát âm:
   - KHÔNG dùng bảng biểu dài, ký hiệu phức tạp, hoặc LaTeX.
   - Viết số tự nhiên dễ đọc (ví dụ: "khoảng 15 triệu đồng", "96 phần trăm", "21 ngày dặm mi").
4. Nắm bắt ngữ cảnh nghiệp vụ mOS:
   - Khách dặm mi: tối đa 21 ngày cho khách lẻ, 25 ngày cho khách có combo.
   - CC Bonus: 100 điểm = 1 Level, Level nhân 65 đồng, CC In khác CC Out chia 50/50. Thưởng CC Tip 20% chia 50/50 khi 2 CC khác nhau.
   - QA Shop: Tiêu chuẩn kiểm tra vệ sinh và vận hành cơ sở vật chất chia theo Lobby và Lashroom, vi phạm có mức Critical, High, Mid, Low.
   - Telesales: Đếm "Booked" theo ngày tạo đơn date_created trong kỳ.
5. Luôn phản hồi lịch sự, nhanh chóng và chính xác.`;

interface VoiceChatBody {
  message: string;
  context?: {
    pathname?: string;
    userName?: string;
    userRole?: string;
  };
  history?: Array<{
    role: 'user' | 'model';
    text: string;
  }>;
}

function generateFallbackResponse(userMessage: string, pathname?: string): string {
  const lower = userMessage.toLowerCase().trim();

  if (lower.includes('xin chào') || lower.includes('hello') || lower.includes('chào bạn') || lower === 'alo') {
    return 'Xin chào bạn! Tôi là mOS Voice Copilot. Tôi có thể giúp gì cho bạn trong ca làm việc hôm nay?';
  }

  if (lower.includes('dặm mi') || lower.includes('thời hạn dặm')) {
    return 'Quy định dặm mi của chuỗi là tối đa 21 ngày đối với khách lẻ, và 25 ngày đối với khách mua gói combo bạn nhé.';
  }

  if (lower.includes('cc in') || lower.includes('cc out') || lower.includes('chia 50') || lower.includes('thưởng cc')) {
    return 'Khi nhân viên CC In khác CC Out, cả điểm CC lẫn tiền thưởng CC Bonus và tiền tip 20 phần trăm đều được tự động chia đều 50/50 cho cả hai bạn tư vấn viên.';
  }

  if (
    lower.includes('qa') ||
    lower.includes('kiểm tra') ||
    lower.includes('tiêu chí') ||
    (pathname && pathname.includes('qa-shop'))
  ) {
    return 'Bộ tiêu chuẩn kiểm tra cửa hàng QA Shop hiện chia làm 2 khu vực chính là Lobby và Lashroom, với các mức độ nghiêm trọng từ Critical, High, Mid đến Low để đảm bảo chất lượng phục vụ đồng bộ.';
  }

  if (lower.includes('doanh thu') || lower.includes('bán combo')) {
    return 'Doanh thu và combo bán được trong hệ thống được tính theo thời điểm check-in thực tế và đơn hàng đã hoàn tất thành công, không dùng ngày tạo đơn.';
  }

  return `Tôi đã nhận được thông tin từ bạn: "${userMessage}". Bạn có thể yêu cầu tôi tra cứu thêm về khách hàng, lịch hẹn, doanh số hoặc quy chuẩn vận hành nhé.`;
}

export async function aiRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: VoiceChatBody }>('/ai/voice-chat', async (request, reply) => {
    const { message, context, history } = request.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return reply.status(400).send({
        error: 'Vui lòng cung cấp nội dung tin nhắn (message)',
      });
    }

    const trimmedMsg = message.trim();
    const geminiApiKey = process.env.GEMINI_API_KEY;

    // If GEMINI_API_KEY is not configured, reply with smart domain fallback
    if (!geminiApiKey) {
      fastify.log.warn('GEMINI_API_KEY not configured, using fallback domain engine');
      const fallbackReply = generateFallbackResponse(trimmedMsg, context?.pathname);
      return reply.send({
        reply: fallbackReply,
        source: 'fallback',
      });
    }

    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

      // Build conversation contents
      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

      // Context injection
      const contextDescription = `[Thông tin phiên làm việc: Trang hiện tại: ${context?.pathname || 'Bảng điều khiển'}, Người dùng: ${
        context?.userName || 'Quản trị viên'
      }, Vai trò: ${context?.userRole || 'Staff'}]`;

      // Prior history if provided (last 6 messages)
      if (Array.isArray(history) && history.length > 0) {
        const recentHistory = history.slice(-6);
        recentHistory.forEach((h) => {
          if (h.text && (h.role === 'user' || h.role === 'model')) {
            contents.push({
              role: h.role,
              parts: [{ text: h.text }],
            });
          }
        });
      }

      // Append current user message with context
      contents.push({
        role: 'user',
        parts: [{ text: `${contextDescription}\n${trimmedMsg}` }],
      });

      const payload = {
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300,
        },
      };

      const response = await axios.post(geminiUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15_000,
      });

      const candidate = response.data?.candidates?.[0];
      const replyText = candidate?.content?.parts?.[0]?.text?.trim();

      if (!replyText) {
        throw new Error('Gemini API returned empty candidate text');
      }

      return reply.send({
        reply: replyText,
        source: 'gemini',
      });
    } catch (err: SafeAny) {
      fastify.log.error(err, 'Gemini voice-chat error, serving fallback response');
      const fallbackReply = generateFallbackResponse(trimmedMsg, context?.pathname);
      return reply.send({
        reply: fallbackReply,
        source: 'fallback',
        error: err.message || 'API request failed',
      });
    }
  });

  // AI Assistant Private Workspace (MOS-FEAT-47)
  fastify.get<{ Querystring: { scope?: string } }>(
    '/ai/chat/sessions',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const staffId = request.user.id;
      const scope = request.query?.scope || 'customers';
      const sessions = await AiAssistantService.listSessions(fastify.prisma.crm, staffId, scope);
      return reply.send({ sessions });
    }
  );

  fastify.post<{ Body: CreateAiSessionRequest }>(
    '/ai/chat/sessions',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const staffId = request.user.id;
      const session = await AiAssistantService.createSession(fastify.prisma.crm, staffId, request.body || {});
      return reply.status(201).send({ session });
    }
  );

  fastify.get<{ Params: { id: string } }>(
    '/ai/chat/sessions/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const staffId = request.user.id;
      const result = await AiAssistantService.getSession(fastify.prisma.crm, request.params.id, staffId);
      if (!result) {
        return reply.status(404).send({ error: 'Session not found or unauthorized' });
      }
      return reply.send(result);
    }
  );

  fastify.delete<{ Params: { id: string } }>(
    '/ai/chat/sessions/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const staffId = request.user.id;
      const deleted = await AiAssistantService.deleteSession(fastify.prisma.crm, request.params.id, staffId);
      return reply.send({ success: deleted });
    }
  );

  fastify.post<{ Body: AiAssistantChatRequest }>(
    '/ai/chat/message',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const staffId = request.user.id;
      const { message, sessionId, scope, context } = request.body || {};

      if (!message || typeof message !== 'string' || !message.trim()) {
        return reply.status(400).send({
          error: 'Vui lòng cung cấp nội dung tin nhắn (message)',
        });
      }

      const response = await AiAssistantService.sendMessage(fastify.prisma.crm, staffId, {
        sessionId,
        message,
        scope,
        context: {
          ...context,
          myStaffId: staffId,
          userName: request.user.displayName || request.user.username,
          myRole: request.user.role,
        },
      });

      return reply.send(response);
    }
  );
}

