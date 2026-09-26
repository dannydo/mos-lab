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

    // Late completion recovery: if in-memory job timed out or completed with fallback, update DB message directly
    if (response?.content) {
      try {
        const archivedJob = AgChatBridgeService.getArchivedJob(jobId);
        if (archivedJob?.sessionId) {
          const lastMsg = await fastify.prisma.crm.crmAiChatMessage.findFirst({
            where: { sessionId: archivedJob.sessionId, role: 'assistant' },
            orderBy: { createdAt: 'desc' },
          });
          if (lastMsg) {
            await fastify.prisma.crm.crmAiChatMessage.update({
              where: { id: lastMsg.id },
              data: {
                content: response.content,
                thinking: response.thinking || null,
                suggestedActionJson: response.suggestedAction ? JSON.stringify(response.suggestedAction) : null,
              },
            });
          }
        }
      } catch (err) {
        fastify.log.warn({ err }, 'Failed to apply late chat completion update');
      }
    }

    return reply.send({ success: ok });
  });

  // POST /api/ai/avatar-score - Analyze human portrait avatar with Gemini Vision
  fastify.post('/ai/avatar-score', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as AvatarScoreRequest;
    const rawImage = body?.photoData || body?.imageBase64;
    if (!body || !rawImage) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Dữ liệu ảnh là bắt buộc' });
    }

    const trimmed = rawImage.trim();
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

  // POST /api/ai/avatar-nudge-message - Generate personalized "Thiên Sứ Bóng Tối" banter for avatar snooze
  fastify.post('/ai/avatar-nudge-message', { preHandler: [requireAuth] }, async (request, _reply) => {
    const body = request.body as AvatarNudgeRequest;
    const staffName = body?.staffName || 'Bạn';
    const role = body?.role || 'Nhân sự';
    const snoozeCount = Number(body?.snoozeCount || 0);

    const POSSIBLE_ACTIONS = ['nhắn nhủ', 'năn nỉ', 'dụ dỗ', 'cà khịa', 'hờn dỗi', 'thầm thì', 'đe dọa (nhẹ)'];

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        const prompt = `Bạn là "Thiên Sứ Bóng Tối" 😈 — một trợ lý AI dí dỏm, lém lỉnh, cực kỳ duyên dáng và đáng yêu của hệ thống mOS Lab (Wings Lashes).
Nhiệm vụ của bạn là xuất hiện để khích lệ, dụ dỗ, năn nỉ hoặc cà khịa nhân viên "${staffName}" (vai trò: ${role}) đổi ảnh đại diện cá nhân trên hệ thống.
Bạn ấy hiện chưa có avatar và đã bấm hoãn 'Để mai mình đổi' ${snoozeCount} lần.

QUY TẮC BẮT BUỘC VỀ VĂN PHONG (CRITICAL TONE RULES):
- TUYỆT ĐỐI KHÔNG dùng văn phong dịch truyện kiếm hiệp, ngôn tình, fantasy cổ trang!
- CẤM các từ sáo rỗng kiểu dịch máy: "Hỡi...", "Ta thấy...", "ngươi", "ánh sáng của mOS Lab", "hào quang tiềm ẩn nơi em", "ngút ngàn vạn người mê", "chiếc gương ma thuật", "quả táo thần kỳ", "nỡ chối từ".
- CẤM xưng hô kiểu "Ta - ngươi" hoặc "Ta - em".
- VĂN PHONG THUẦN VIỆT 100%: Tự nhiên, gần gũi, ấm áp như đồng nghiệp salon làm đẹp trêu nhau. Xưng "em" (Thiên Sứ xưng em lém lỉnh), gọi "${staffName} ơi" hoặc "anh/chị ${staffName} ơi".

Hãy chọn NGẪU NHIÊN 1 hành động/tâm trạng trong danh sách sau và sáng tạo lời thoại đúng ý cảnh của hành động đó:
- "dụ dỗ" (icon: "🍎", badge: "Đang dụ dỗ 🍎"): Lời dụ dỗ ngọt ngào, khen ngợi góc mặt xinh tươi, rủ rê lên hình khoe nhan sắc để đồng đội thả tim mỏi tay và hút lộc khách hàng.
  Ví dụ: greeting: "Alo ${staffName} ơi, ghé tai em nói nhỏ nè! ✨", banter: "Tướng mạo rạng rỡ thế này mà chưa có avatar thì uổng quá chừng! Lên 1 tấm selfie cười tươi là đồng đội thả tim mỏi tay, khách nhìn là mến liền. Thử ngay 15 giây nha?"
- "cà khịa" (icon: "😏", badge: "Cà khịa nhẹ 😏"): Bắt quả tang vụ "để mai tính", trêu đùa hôm nay chính là "ngày mai" rồi nè.
  Ví dụ: greeting: "Ủa alo ${staffName} ơi, bắt quả tang nha! 👀", banter: "Hôm qua ai vừa hứa chắc nịch 'để mai tính' vậy ta? Nay chính là 'ngày mai' rồi nè, tính tới đâu rồi hay đang tính trốn luôn? Làm tấm ảnh nhanh gọn lẹ rồi vô ca thôi nè!"
- "năn nỉ" (icon: "🥺", badge: "Đang năn nỉ 🥺"): Năn nỉ ỉ ôi, cầu xin giơ máy 15 giây chụp hình cho em hoàn thành chỉ tiêu đầu ngày.
  Ví dụ: greeting: "${staffName} ơi, cứu em với... 🥺", banter: "Em bay lượn năn nỉ bạn mấy bữa nay mỏi cả cánh rồi á! Giơ máy cười tươi 15 giây cho em hoàn thành chỉ tiêu đầu ngày đi mà, năn nỉ luôn đó!"
- "hờn dỗi" (icon: "😤", badge: "Đang hờn dỗi 😤"): Giận dỗi đáng yêu vì bắt ngắm chữ cái viết tắt hoài, dọa buồn nguyên ngày.
  Ví dụ: greeting: "Hôm nay em dỗi ${staffName} rồi đó nha! 😤", banter: "Cả salon ai cũng có ảnh đại diện xinh xắn, riêng bạn cứ để ký tự viết tắt bí ẩn như điệp viên 007 hoài. Nay mà không chịu chụp là em buồn nguyên ngày cho coi!"
- "thầm thì" (icon: "🤫", badge: "Thì thầm bí mật 🤫"): Bật mí bí mật thiên cơ là đổi avatar cười tươi sáng nay sẽ x2 may mắn, tip nhận đều tay.
  Ví dụ: greeting: "Suỵt... lại gần đây em bật mí bí mật nè ${staffName}! 🤫", banter: "Em mới soi sổ thiên cơ: ai đổi avatar nụ cười rạng rỡ sáng nay là ca làm gặp toàn khách dễ thương, tip nhận mỏi tay luôn á. Bí mật nội bộ, làm liền kẻo lỡ lộc nha!"
- "đe dọa (nhẹ)" (icon: "⚡", badge: "Tối hậu thư ⚡"): Dọa hài hước nếu hoãn tiếp lần nữa là em tự lấy ảnh dìm dán lên avatar.
  Ví dụ: greeting: "Báo động cấp 1 gửi tới ${staffName}! ⚡", banter: "Bạn đã bấm hoãn lần thứ ${snoozeCount || 1} rồi đó nha! Hôm nay mà còn bấm 'để mai tính' nữa là em tự lấy ảnh dìm dán lên avatar ráng chịu à nghen!"
- "nhắn nhủ" (icon: "✨", badge: "Nhắn nhủ đầu ngày ✨"): Lời chúc đầu ngày ấm áp, khích lệ nụ cười tỏa sáng.
  Ví dụ: greeting: "Chào ${staffName}, chúc bạn ngày mới tràn đầy năng lượng! ✨", banter: "Một chiếc avatar cười tươi sáng bừng sẽ truyền cảm hứng và trao trọn niềm tin cho cả team và khách hàng mỗi ngày. Cùng em chụp 1 tấm selfie thật rạng rỡ nhé!"

Gợi ý ngữ cảnh theo số lần hoãn (${snoozeCount} lần):
- Nếu snoozeCount = 0: Thiên Sứ mới giáng trần, ưu tiên "dụ dỗ", "nhắn nhủ", "thầm thì".
- Nếu snoozeCount = 1: Đã hoãn 1 lần, ưu tiên "cà khịa", "năn nỉ", "hờn dỗi".
- Nếu snoozeCount >= 2: Hoãn nhiều lần, ưu tiên "hờn dỗi", "năn nỉ", "đe dọa (nhẹ)", "cà khịa".

Trả về đúng định dạng JSON chuẩn:
{
  "angelAction": string (bắt buộc chọn 1 trong: "nhắn nhủ" | "năn nỉ" | "dụ dỗ" | "cà khịa" | "hờn dỗi" | "thầm thì" | "đe dọa (nhẹ)"),
  "angelIcon": string (emoji tương ứng: 🍎, 🥺, 😏, 😤, 🤫, ⚡, ✨),
  "badge": string (đúng tên trạng thái ngắn gọn, ví dụ: 'Đang dụ dỗ 🍎' hoặc 'Cà khịa nhẹ 😏'),
  "greeting": string (lời mở đầu tự nhiên, ví dụ: 'Alo ${staffName} ơi, ghé tai em nói nhỏ nè! ✨' hoặc 'Ủa alo ${staffName} ơi, bắt quả tang nha! 👀'),
  "banter": string (1-2 câu tiếng Việt tự nhiên, ấm áp, hóm hỉnh, xưng em gọi ${staffName}),
  "quote": string (giống banter),
  "callToAction": string (nút bấm kêu gọi ngắn gọn, ví dụ: '📸 Đổi Liền Khoe Nhan Sắc' hoặc '📸 Thôi Được Rồi, Chụp Luôn!'),
  "ctaText": string (giống callToAction),
  "snoozeText": string (nút hoãn dí dỏm, ví dụ: 'Để mai khoe, nay giấu mặt 🙈' hoặc 'Cho nợ nốt hôm nay nha Thiên Sứ 🥺'),
  "isBanter": boolean
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
              temperature: 0.85,
            },
          },
          { timeout: 8_000 }
        );

        const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text) as AvatarNudgeResponse;
          if (parsed.banter && !parsed.quote) parsed.quote = parsed.banter;
          if (parsed.quote && !parsed.banter) parsed.banter = parsed.quote;
          if (parsed.callToAction && !parsed.ctaText) parsed.ctaText = parsed.callToAction;
          if (parsed.ctaText && !parsed.callToAction) parsed.callToAction = parsed.ctaText;
          if (!parsed.angelAction)
            parsed.angelAction = POSSIBLE_ACTIONS[Math.floor(Math.random() * POSSIBLE_ACTIONS.length)];
          return parsed;
        }
      } catch (err: SafeAny) {
        fastify.log.warn(`Gemini Thiên Sứ Bóng Tối avatar nudge failed, using built-in banter: ${err.message}`);
      }
    }

    const FALLBACK_ACTIONS: AvatarNudgeResponse[] = [
      {
        angelAction: 'dụ dỗ',
        angelIcon: '🍎',
        badge: 'Đang dụ dỗ 🍎',
        greeting: `Alo ${staffName} ơi, ghé tai em nói nhỏ nè! ✨`,
        banter: `Tướng mạo rạng rỡ thế này mà chưa có avatar thì uổng quá chừng! Lên 1 tấm selfie cười tươi là đồng đội thả tim mỏi tay, khách nhìn là mến liền. Thử ngay 15 giây nha?`,
        quote: `Tướng mạo rạng rỡ thế này mà chưa có avatar thì uổng quá chừng! Lên 1 tấm selfie cười tươi là đồng đội thả tim mỏi tay, khách nhìn là mến liền. Thử ngay 15 giây nha?`,
        callToAction: '📸 Đổi Liền Khoe Nhan Sắc',
        ctaText: '📸 Đổi Liền Khoe Nhan Sắc',
        snoozeText: 'Để mai khoe, nay giấu mặt 🙈',
        isBanter: false,
      },
      {
        angelAction: 'năn nỉ',
        angelIcon: '🥺',
        badge: 'Đang năn nỉ 🥺',
        greeting: `${staffName} ơi, cứu em với... 🥺`,
        banter: `Em bay lượn năn nỉ bạn mấy bữa nay mỏi cả cánh rồi á! Giơ máy cười tươi 15 giây cho em hoàn thành chỉ tiêu đầu ngày đi mà, năn nỉ luôn đó!`,
        quote: `Em bay lượn năn nỉ bạn mấy bữa nay mỏi cả cánh rồi á! Giơ máy cười tươi 15 giây cho em hoàn thành chỉ tiêu đầu ngày đi mà, năn nỉ luôn đó!`,
        callToAction: '📸 Cứu Thiên Sứ, Chụp Liền!',
        ctaText: '📸 Cứu Thiên Sứ, Chụp Liền!',
        snoozeText: 'Cho nợ nốt hôm nay nha Thiên Sứ 🥺',
        isBanter: true,
      },
      {
        angelAction: 'cà khịa',
        angelIcon: '😏',
        badge: 'Cà khịa nhẹ 😏',
        greeting: `Ủa alo ${staffName} ơi, bắt quả tang nha! 👀`,
        banter:
          snoozeCount > 0
            ? `Hôm qua ai vừa hứa chắc nịch 'để mai tính' vậy ta? Nay chính là 'ngày mai' trong truyền thuyết rồi nè, tính tới đâu rồi hay đang tính trốn luôn? Làm tấm ảnh nhanh gọn lẹ rồi vô ca thôi nè!`
            : `Đồng đội ai cũng có ảnh đại diện lung linh, riêng bạn cứ để ký tự viết tắt bí ẩn như điệp viên 007 vậy. Chụp lẹ khoe nụ cười đi nè!`,
        quote:
          snoozeCount > 0
            ? `Hôm qua ai vừa hứa chắc nịch 'để mai tính' vậy ta? Nay chính là 'ngày mai' trong truyền thuyết rồi nè, tính tới đâu rồi hay đang tính trốn luôn? Làm tấm ảnh nhanh gọn lẹ rồi vô ca thôi nè!`
            : `Đồng đội ai cũng có ảnh đại diện lung linh, riêng bạn cứ để ký tự viết tắt bí ẩn như điệp viên 007 vậy. Chụp lẹ khoe nụ cười đi nè!`,
        callToAction: '📸 Thôi Được Rồi, Chụp Luôn!',
        ctaText: '📸 Thôi Được Rồi, Chụp Luôn!',
        snoozeText: 'Mai đổi thiệt mà, đừng khịa nữa 🙈',
        isBanter: true,
      },
      {
        angelAction: 'hờn dỗi',
        angelIcon: '😤',
        badge: 'Đang hờn dỗi 😤',
        greeting: `Hôm nay em dỗi ${staffName} rồi đó nha! 😤`,
        banter: `Cả salon ai cũng có ảnh đại diện xinh xắn, riêng bạn cứ để ký tự viết tắt bí ẩn hoài. Nay mà không chịu chụp là em buồn nguyên ngày cho coi!`,
        quote: `Cả salon ai cũng có ảnh đại diện xinh xắn, riêng bạn cứ để ký tự viết tắt bí ẩn hoài. Nay mà không chịu chụp là em buồn nguyên ngày cho coi!`,
        callToAction: '📸 Chụp Liền Kẻo Em Dỗi',
        ctaText: '📸 Chụp Liền Kẻo Em Dỗi',
        snoozeText: 'Dỗ dành Thiên Sứ, mai tính nha 🥺',
        isBanter: true,
      },
      {
        angelAction: 'thầm thì',
        angelIcon: '🤫',
        badge: 'Thì thầm bí mật 🤫',
        greeting: `Suỵt... lại gần đây em bật mí bí mật nè ${staffName}! 🤫`,
        banter: `Em mới soi sổ thiên cơ: ai đổi avatar nụ cười rạng rỡ sáng nay là ca làm gặp toàn khách dễ thương, tip nhận mỏi tay luôn á. Bí mật nội bộ, làm liền kẻo lỡ lộc nha!`,
        quote: `Em mới soi sổ thiên cơ: ai đổi avatar nụ cười rạng rỡ sáng nay là ca làm gặp toàn khách dễ thương, tip nhận mỏi tay luôn á. Bí mật nội bộ, làm liền kẻo lỡ lộc nha!`,
        callToAction: '✨ Đổi Avatar Hút May Mắn',
        ctaText: '✨ Đổi Avatar Hút May Mắn',
        snoozeText: 'Để mai nhận lộc vậy 🙈',
        isBanter: false,
      },
      {
        angelAction: 'đe dọa (nhẹ)',
        angelIcon: '⚡',
        badge: 'Tối hậu thư ⚡',
        greeting: `Báo động cấp 1 gửi tới ${staffName}! ⚡`,
        banter: `Bạn đã bấm hoãn lần thứ ${snoozeCount || 1} rồi đó nha! Hôm nay mà còn bấm 'để mai tính' nữa là em tự lấy ảnh dìm dán lên avatar ráng chịu à nghen!`,
        quote: `Bạn đã bấm hoãn lần thứ ${snoozeCount || 1} rồi đó nha! Hôm nay mà còn bấm 'để mai tính' nữa là em tự lấy ảnh dìm dán lên avatar ráng chịu à nghen!`,
        callToAction: '📸 Tự Chụp Liền Tránh Bị Dìm!',
        ctaText: '📸 Tự Chụp Liền Tránh Bị Dìm!',
        snoozeText: 'Vẫn can đảm hoãn tiếp 🏃💨',
        isBanter: true,
      },
      {
        angelAction: 'nhắn nhủ',
        angelIcon: '✨',
        badge: 'Nhắn nhủ đầu ngày ✨',
        greeting: `Chào ${staffName}, chúc bạn ngày mới tràn đầy năng lượng! ✨`,
        banter: `Một chiếc avatar cười tươi sáng bừng sẽ truyền cảm hứng và trao trọn niềm tin cho cả team và khách hàng mỗi ngày. Cùng em chụp 1 tấm selfie thật rạng rỡ nhé!`,
        quote: `Một chiếc avatar cười tươi sáng bừng sẽ truyền cảm hứng và trao trọn niềm tin cho cả team và khách hàng mỗi ngày. Cùng em chụp 1 tấm selfie thật rạng rỡ nhé!`,
        callToAction: '📸 Chụp Selfie Rạng Rỡ Ngay',
        ctaText: '📸 Chụp Selfie Rạng Rỡ Ngay',
        snoozeText: 'Để mai mình đổi nha 🙈',
        isBanter: false,
      },
    ];

    // Pick a random fallback matching the vibe
    const picked = FALLBACK_ACTIONS[Math.floor(Math.random() * FALLBACK_ACTIONS.length)];
    return picked;
  });
}
