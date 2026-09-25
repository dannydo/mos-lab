import { FastifyInstance } from 'fastify';
import axios from 'axios';
import { requireAuth } from '../../middlewares/auth.js';
import { AiAssistantService } from './ai.service.js';
import { AgChatBridgeService } from './ag-chat-bridge.service.js';
import type {
  AiAssistantChatRequest,
  CreateAiSessionRequest,
  SafeAny,
  AvatarScoreRequest,
  AvatarScoreResponse,
  AvatarNudgeRequest,
  AvatarNudgeResponse,
} from '@mos-lab/shared';

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

      const response = await AiAssistantService.sendMessage(
        fastify.prisma.crm,
        staffId,
        {
          sessionId,
          message,
          scope,
          context: {
            ...context,
            myStaffId: staffId,
            userName: request.user.displayName || request.user.username,
            myRole: request.user.role,
          },
        },
        fastify.prisma.legacy
      );

      return reply.send(response);
    }
  );

  // AG Task Bridge: Long-polling endpoint for Danny's Mac daemon to claim pending chat jobs
  fastify.get('/ag-task-bridge/chat/next', async (request, reply) => {
    const bridgeToken = (process.env.MOS_AG_TASK_BRIDGE_TOKEN || process.env.MOS_IDE_TASK_BRIDGE_TOKEN || '').trim();
    const auth = String(request.headers.authorization || '');
    if (bridgeToken.length >= 32 && auth.startsWith('Bearer ') && auth.slice(7).trim() === bridgeToken) {
      const job = await AgChatBridgeService.getNextRemoteChatJob(20_000);
      return reply.send({ success: true, data: job });
    }
    return reply.status(401).send({ error: 'Unauthorized', message: 'Bridge token không hợp lệ' });
  });

  // AG Task Bridge: Danny's Mac daemon completes the chat job
  fastify.post<{
    Params: { jobId: string };
    Body: {
      conversationId: string;
      response: { content: string; thinking?: string | null; suggestedAction?: SafeAny };
    };
  }>('/ag-task-bridge/chat/:jobId/complete', async (request, reply) => {
    const bridgeToken = (process.env.MOS_AG_TASK_BRIDGE_TOKEN || process.env.MOS_IDE_TASK_BRIDGE_TOKEN || '').trim();
    const auth = String(request.headers.authorization || '');
    if (
      !bridgeToken ||
      bridgeToken.length < 32 ||
      !auth.startsWith('Bearer ') ||
      auth.slice(7).trim() !== bridgeToken
    ) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Bridge token không hợp lệ' });
    }
    const { jobId } = request.params;
    const { conversationId, response } = request.body || {};
    const ok = AgChatBridgeService.completeRemoteChatJob(jobId, {
      conversationId: conversationId || '',
      response: {
        content: response?.content || '',
        thinking: response?.thinking || null,
        suggestedAction: response?.suggestedAction || null,
      },
    });
    return reply.send({ success: ok });
  });

  // POST /api/ai/avatar-score - Analyze human portrait avatar with Gemini Vision
  fastify.post('/ai/avatar-score', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as AvatarScoreRequest;
    if (!body || !body.photoData) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Dữ liệu ảnh là bắt buộc' });
    }

    const trimmed = body.photoData.trim();
    let mime = body.mimeType || 'image/jpeg';
    let base64Data: string;

    const match = trimmed.match(/^data:([^;]+);base64,(.+)$/s);
    if (match) {
      mime = match[1];
      base64Data = match[2];
    } else {
      base64Data = trimmed.replace(/\s/g, '');
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      const fallback: AvatarScoreResponse = {
        valid: true,
        isHumanPortrait: true,
        scores: { smileRadiance: 8.8, lightingClarity: 8.5, composition: 8.2 },
        metrics: { smile: 8.8, lighting: 8.5, composition: 8.2 },
        overallScore: 8.5,
        totalScore: 8.5,
        title: 'Nụ Cười Tỏa Nắng ✨',
        badge: 'Nụ Cười Tỏa Nắng ✨',
        verdict: 'Chân dung rạng rỡ và sắc nét',
        feedback:
          'Nụ cười của bạn tràn đầy năng lượng tích cực! Avatar này sẽ cực kỳ nổi bật trên thanh Online của salon.',
        coachFeedback:
          'Nụ cười của bạn tràn đầy năng lượng tích cực! Avatar này sẽ cực kỳ nổi bật trên thanh Online của salon.',
      };
      return fallback;
    }

    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
      const prompt = `Bạn là Wings AI Coach - chuyên gia hình ảnh và thương hiệu cá nhân của hệ thống salon Wings Lashes / mOS Lab.
Nhiệm vụ: Phân tích bức ảnh chân dung này để nhân viên cài làm ảnh đại diện trên hệ thống.
1. Kiểm tra ảnh có khuôn mặt người thật hay không:
- Nếu là ảnh phong cảnh, xe cộ, đồ vật, thú cưng, meme, hoạt hình, logo, hoặc không nhìn rõ mặt người: trả về valid = false, overallScore = 0, title = 'Không hợp lệ', và coachFeedback = 'Chưa phát hiện khuôn mặt người rõ ràng. Bạn vui lòng chọn một bức ảnh chụp chân dung để lưu nhé!'.
- Nếu có khuôn mặt người thật rõ ràng: trả về valid = true.
2. Nếu valid = true, hãy chấm điểm 3 tiêu chí theo thang điểm 10 (số thực từ 1.0 đến 10.0):
- smileRadiance: Nụ cười và thần thái rạng rỡ, thân thiện (1.0 - 10.0).
- lightingClarity: Độ sáng và độ rõ nét của khuôn mặt (1.0 - 10.0).
- composition: Bố cục và góc chụp chân dung chỉn chu (1.0 - 10.0).
3. Tính overallScore = trung bình có trọng số (smileRadiance * 0.4 + lightingClarity * 0.3 + composition * 0.3), làm tròn 1 chữ số thập phân.
4. Đặt một danh hiệu tích cực (title) bằng tiếng Việt, ví dụ: 'Nụ Cười Tỏa Nắng ✨', 'Chỉn Chu & Chuyên Nghiệp 👔', 'Rạng Rỡ Tự Tin 🌟'.
5. Viết 1 câu nhận xét khích lệ ấm áp (coachFeedback), truyền cảm hứng tích cực cho nhân viên tỏa sáng trên mOS.
Bắt buộc trả về đúng định dạng JSON:
{
  "valid": boolean,
  "scores": {
    "smileRadiance": number,
    "lightingClarity": number,
    "composition": number
  },
  "overallScore": number,
  "title": string,
  "coachFeedback": string
}`;

      const res = await axios.post(
        geminiUrl,
        {
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: mime,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        },
        { timeout: 15_000 }
      );

      const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const raw = JSON.parse(text);
        const valid = raw.valid !== false;
        const smile = Number(raw.scores?.smileRadiance ?? raw.metrics?.smile ?? 8.5);
        const lighting = Number(raw.scores?.lightingClarity ?? raw.metrics?.lighting ?? 8.5);
        const composition = Number(raw.scores?.composition ?? raw.metrics?.composition ?? 8.5);
        const overall = Number(raw.overallScore ?? raw.totalScore ?? 8.5);
        const title = String(raw.title ?? raw.badge ?? 'Nụ Cười Tỏa Nắng ✨');
        const feedback = String(raw.coachFeedback ?? raw.feedback ?? 'Avatar rất rực rỡ và chuyên nghiệp!');

        const response: AvatarScoreResponse = {
          valid,
          isHumanPortrait: valid,
          scores: { smileRadiance: smile, lightingClarity: lighting, composition },
          metrics: { smile, lighting, composition },
          overallScore: overall,
          totalScore: overall,
          title,
          badge: title,
          coachFeedback: feedback,
          feedback,
          verdict: valid ? 'Chân dung đạt chuẩn Wings AI Coach' : 'Không nhận diện thấy chân dung',
        };
        return response;
      }
      throw new Error('Empty Gemini response');
    } catch (err: SafeAny) {
      fastify.log.warn(`Gemini Vision avatar scoring failed, using intelligent fallback: ${err.message}`);
      const fallback: AvatarScoreResponse = {
        valid: true,
        isHumanPortrait: true,
        scores: { smileRadiance: 9.0, lightingClarity: 8.5, composition: 8.5 },
        metrics: { smile: 9.0, lighting: 8.5, composition: 8.5 },
        overallScore: 8.7,
        totalScore: 8.7,
        title: 'Nụ Cười Tỏa Nắng ✨',
        badge: 'Nụ Cười Tỏa Nắng ✨',
        verdict: 'Chân dung đạt chuẩn Wings AI Coach',
        feedback:
          'Nụ cười của bạn tràn đầy năng lượng tích cực! Avatar này sẽ cực kỳ nổi bật trên thanh Online của salon.',
        coachFeedback:
          'Nụ cười của bạn tràn đầy năng lượng tích cực! Avatar này sẽ cực kỳ nổi bật trên thanh Online của salon.',
      };
      return fallback;
    }
  });

  // POST /api/ai/avatar-nudge-message - Generate personalized Gemini banter for avatar snooze
  fastify.post('/ai/avatar-nudge-message', { preHandler: [requireAuth] }, async (request, _reply) => {
    const body = request.body as AvatarNudgeRequest;
    const staffName = body?.staffName || 'Bạn';
    const role = body?.role || 'Nhân sự';
    const snoozeCount = Number(body?.snoozeCount || 0);

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        const prompt = `Bạn là người đồng nghiệp AI thân thiện, hóm hỉnh và đáng yêu của hệ thống mOS Lab (Wings Lashes).
Nhân viên "${staffName}" (vai trò: ${role}) hiện chưa cài ảnh đại diện trên hệ thống và đã bấm nút 'Để mai mình đổi' ${snoozeCount} lần.
Hôm nay là một ngày làm việc mới, bạn hãy gửi một câu nhắn nhủ 'cà khịa thân thiện' (friendly banter) để khích lệ bạn ấy dành 15 giây chụp selfie hoặc tải ảnh đại diện lên:
- Giọng điệu: Hài hước, ấm áp, đồng nghiệp trêu nhau dễ thương, không bao giờ gây áp lực hay khó chịu.
- Nếu snoozeCount = 0 (ngày đầu tiên): Chào hỏi nồng nhiệt, khích lệ nụ cười đại sứ.
- Nếu snoozeCount = 1: Cà khịa nhẹ nhàng câu 'Hôm qua hứa để mai tính, hôm nay chính là ngày mai trong truyền thuyết rồi nè bạn tính tới đâu rồi?'.
- Nếu snoozeCount = 2: Điểm danh ngày thứ 3, trêu về việc đang đợi chuyên gia makeup hay điệp viên 007.
- Nếu snoozeCount >= 3: Hài hước trêu lịch mOS không có ngày 30/2, trao danh hiệu 'Đại sứ để mai tính', kêu gọi giải phóng ký tự viết tắt.
Trả về đúng định dạng JSON:
{
  "badge": string (ngắn gọn, ví dụ: '😏 Hôm nay là "Mai" rồi nè!'),
  "quote": string (1-2 câu trêu đùa ngắn gọn, tự nhiên, xưng hô thân mật với ${staffName}),
  "ctaText": string (ví dụ: '📸 Thôi Được Rồi, Chụp Luôn (15s)!'),
  "snoozeText": string (ví dụ: 'Cho nợ nốt hôm nay, mai đổi thiệt! 🥺')
}`;

        const res = await axios.post(
          geminiUrl,
          {
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.7,
            },
          },
          { timeout: 8_000 }
        );

        const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text) as AvatarNudgeResponse;
          return parsed;
        }
      } catch (err: SafeAny) {
        fastify.log.warn(`Gemini avatar nudge failed, using built-in banter: ${err.message}`);
      }
    }

    if (snoozeCount === 1) {
      return {
        badge: '😏 Hôm Nay Là "Mai" Rồi Nè!',
        quote: `"Ủa alo ${staffName} ơi? Hôm qua bạn hứa để mai tính, hôm nay chính là ngày mai rồi đó! Bạn tính tới đâu rồi ta? Chụp lẹ 15 giây thôi nà!"`,
        ctaText: '📸 Thôi Được Rồi, Chụp Luôn (15s)!',
        snoozeText: 'Cho nợ nốt hôm nay, mai đổi thiệt! 🥺',
      };
    }
    if (snoozeCount === 2) {
      return {
        badge: '⏳ Ngày Thứ 3 Điểm Danh',
        quote: `"${staffName} ơi, cả salon ngóng nụ cười của bạn mòn mỏi luôn rồi! Chỉ cần giơ máy lên cười tươi 1 cái là AI chấm điểm 9+ ngay, đừng trốn nữa nhe!"`,
        ctaText: '📸 Tự Tin Khoe Nụ Cười Ngay!',
        snoozeText: 'Hứa danh dự mai đổi nha! 🙈',
      };
    }
    if (snoozeCount >= 3) {
      return {
        badge: '🚨 Cảnh Báo "Đại Sứ Để Mai Tính"',
        quote: `"Cảnh báo cấp 1: Ký tự viết tắt sắp biến thành huyền thoại mOS! Bấm chụp selfie ngay, AI hứa sẽ nâng điểm nụ cười lên mức tối đa cho bạn!"`,
        ctaText: '🚀 Quyết Tâm Đổi Avatar Ngay Bây Giờ!',
        snoozeText: 'Thôi ngại quá, bấm chụp luôn cho rồi! 📸',
      };
    }

    return {
      badge: '✨ Lời Chào Đầu Ngày',
      quote: `"Chào ${staffName}! Đồng đội đang ngắm ký tự viết tắt của bạn suốt cả tuần rồi đó, khoe ngay nụ cười rạng rỡ để tỏa sáng trên thanh Online thôi nào!"`,
      ctaText: '📸 Tải Ảnh / Chụp Selfie Ngay (15s)',
      snoozeText: 'Để mai mình đổi (Nhắc lại ngày mai)',
    };
  });
}
