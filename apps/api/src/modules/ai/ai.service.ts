import axios from 'axios';
import type {
  AiChatAction,
  AiChatContext,
  AiAssistantChatResponse,
  AiChatSession,
  AiChatMessage,
  SafeAny,
} from '@mos-lab/shared';

import type { PrismaClient as CrmPrismaClient } from '../../generated/crm-client/index.js';
import type { PrismaClient as LegacyPrismaClient } from '../../generated/legacy-client/index.js';
import { LiveCustomerContextService } from './live-customer-context.service.js';
import { AgChatBridgeService } from './ag-chat-bridge.service.js';

export const SYSTEM_PROMPT_ASSISTANT = `Bạn là mOS Copilot — Trợ lý AI Đa Nhiệm (Trò chuyện, Tư duy & Phân tích) của hệ thống điều hành mOS Lab (chuỗi salon Wings Lashes), hoạt động trong Không gian làm việc cá nhân (Private Workspace) của nhân sự.

MỤC TIÊU & TÁC VỤ CHÍNH:
1. Thấu hiểu cấu trúc dữ liệu khách hàng & hệ thống:
   - Các nhóm khách hàng (Buckets):
     * COMBO_LIVE: Khách hàng sở hữu gói combo dặm mi còn hiệu lực (chưa quá 25 ngày hoặc còn lượt dặm). Tệp khách trung thành cao, cần ưu tiên giữ chân và nhắc lịch dặm mi đúng hạn (ngày 14-20).
     * NOT_COMBO_LIVE: Khách dặm mi lẻ còn trong hạn 21 ngày nhưng chưa mua combo. Đây là đối tượng mục tiêu hàng đầu để tư vấn chuyển đổi sang gói Combo tiết kiệm.
     * COMBO_DEAD: Khách từng mua combo nhưng đã quá hạn dặm (>25 ngày) hoặc đã hết số lượt. Cần chiến dịch chăm sóc phục hồi (win-back).
     * SINGLE: Khách làm dịch vụ lẻ từng lần, không có gói dặm hoặc combo.
   - Các mốc ngày chưa ghé (NYC - Ngày Chưa Ghé):
     * NYC 30 (0 - 30 ngày): Khách mới làm gần đây.
     * NYC 60 (31 - 60 ngày): Khách có dấu hiệu sắp rớt chu kỳ dặm, cần gọi nhắc chăm sóc mi.
     * NYC 90 (61 - 90 ngày): Khách có nguy cơ rời bỏ cao.
     * NYC 180 (91 - 180 ngày), NYC 365 (181 - 365 ngày), NYC 365+ (>365 ngày): Khách không hoạt động lâu năm.
   - Các tiêu chí lọc dữ liệu:
     * activeTab (hoặc bucket): ALL, COMBO_LIVE, NOT_COMBO_LIVE, COMBO_DEAD, SINGLE
     * daysSinceLastVisitMin, daysSinceLastVisitMax: Khoảng ngày chưa ghé salon
     * totalSpentMin, totalSpentMax: Khoảng tổng chi tiêu (VNĐ)
     * totalVisitsMin, totalVisitsMax: Khoảng tổng số lần ghé
     * assignedStaffId: 'me' (chỉ tệp được giao cho tôi), 'all' (toàn bộ)
     * promoUsed: 'all' | 'yes' | 'no'
     * referralUsed: 'all' | 'yes' | 'no'

2. Quy trình tư duy & Phản biện logic (Reasoning):
   - Đặt quá trình suy luận, phân tích lý do, và bước tiếp cận logic bên trong thẻ <thinking>...</thinking>.
   - Khi người dùng cần tìm kiếm, phân loại hoặc yêu cầu lọc tệp khách, hãy chủ động phân tích các tiêu chí và đề xuất cấu hình bộ lọc cụ thể bên trong thẻ <action type="APPLY_FILTER" label="...">JSON_FILTER_PAYLOAD</action>.
   - Ví dụ thẻ action:
     <action type="APPLY_FILTER" label="Lọc khách NYC 60 (31-60 ngày) có chi tiêu > 1tr">{"activeTab": "NOT_COMBO_LIVE", "daysSinceLastVisitMin": 31, "daysSinceLastVisitMax": 60, "totalSpentMin": 1000000}</action>

3. Phong cách phản hồi:
   - Thân thiện, chuyên nghiệp, khách quan và hướng tới hiệu quả thực thi trong ca làm việc.
   - Giải thích rõ ràng các khái niệm, đưa ra góc nhìn phân tích hữu ích cho nhân sự trước khi họ ra quyết định.
   - Trả lời bằng tiếng Việt chuẩn mực.`;

export interface ParsedAiResponse {
  content: string;
  thinking: string | null;
  suggestedAction: AiChatAction | null;
}

export function extractThinkingAndAction(rawText: string): ParsedAiResponse {
  let content = rawText;
  let thinking: string | null = null;
  let suggestedAction: AiChatAction | null = null;

  // Extract <thinking>...</thinking>
  const thinkingMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/i);
  if (thinkingMatch) {
    thinking = thinkingMatch[1].trim();
    content = content.replace(/<thinking>[\s\S]*?<\/thinking>/i, '').trim();
  }

  // Extract <action type="..." label="...">...</action>
  const actionMatch = content.match(/<action(?:\s+type="([^"]*)")?(?:\s+label="([^"]*)")?>([\s\S]*?)<\/action>/i);
  if (actionMatch) {
    const type = (actionMatch[1]?.trim() || 'APPLY_FILTER') as AiChatAction['type'];
    const label = actionMatch[2]?.trim() || 'Áp dụng bộ lọc gợi ý';
    const payloadStr = actionMatch[3]?.trim() || '{}';
    try {
      const payload = JSON.parse(payloadStr);
      suggestedAction = {
        type,
        label,
        payload,
      };
    } catch {
      // ignore json parse error
    }
    content = content.replace(/<action[\s\S]*?<\/action>/i, '').trim();
  }

  return {
    content: content.trim(),
    thinking,
    suggestedAction,
  };
}

export function generateAssistantFallback(userMessage: string, context?: AiChatContext): ParsedAiResponse {
  const lower = userMessage.toLowerCase().trim();

  // 1. Greeting
  if (
    lower.includes('xin chào') ||
    lower.includes('hello') ||
    lower.includes('chào bạn') ||
    lower.includes('hi bạn') ||
    lower === 'alo' ||
    lower === 'chào'
  ) {
    return {
      thinking:
        'Nhận diện ý định chào hỏi. Giới thiệu vai trò Trợ lý AI Đa Nhiệm hoạt động trong Private Workspace của nhân sự, giải thích khả năng phân tích dữ liệu khách hàng và hỗ trợ áp dụng bộ lọc trực tiếp.',
      content:
        `Xin chào ${context?.userName || 'bạn'}! Tôi là **mOS Copilot** — Trợ lý AI Đa Nhiệm hỗ trợ trong Không gian làm việc cá nhân của bạn.\n\n` +
        'Tôi có thể hỗ trợ bạn:\n' +
        '- 📊 **Giải thích cấu trúc dữ liệu**: Ý nghĩa các nhóm khách (COMBO_LIVE, NOT_COMBO_LIVE, NYC 30/60/90).\n' +
        '- 🔍 **Phân tích & Lọc tệp khách**: Gợi ý tiêu chí lọc tối ưu và áp dụng trực tiếp vào bảng khách hàng của riêng bạn.\n' +
        '- 💡 **Tư vấn luồng CSKH**: Đề xuất quy trình gọi nhắc dặm mi và chiến lược chăm sóc khách hàng.\n\n' +
        'Bạn muốn tìm hiểu hoặc phân tích tệp khách nào hôm nay?',
      suggestedAction: null,
    };
  }

  // 2. Explain Buckets & System Classification
  if (
    lower.includes('bucket') ||
    lower.includes('phân loại') ||
    lower.includes('nhóm khách') ||
    lower.includes('combo_live') ||
    lower.includes('not_combo') ||
    lower.includes('combo dead') ||
    lower.includes('giải thích các nhóm')
  ) {
    return {
      thinking:
        'Phân tích yêu cầu tìm hiểu cấu trúc hệ thống: Giải thích 4 nhóm khách hàng cốt lõi của mOS (COMBO_LIVE, NOT_COMBO_LIVE, COMBO_DEAD, SINGLE) cùng chu kỳ dặm mi chuẩn (21 ngày khách lẻ, 25 ngày khách combo).',
      content:
        '### 📌 Cấu Trúc Phân Loại Khách Hàng (Buckets) Trong mOS\n\n' +
        'Hệ thống mOS phân loại khách hàng thành 4 nhóm chiến lược:\n\n' +
        '1. **`COMBO_LIVE` (Khách Combo Còn Hạn)**:\n' +
        '   - Khách sở hữu gói combo dặm mi còn hiệu lực (trong vòng 25 ngày hoặc còn lượt dặm).\n' +
        '   - **Mục tiêu**: Duy trì trải nghiệm VIP, nhắc hẹn dặm mi đúng kỳ (ngày 14-20) để khách không bị rụng quá nhiều mi.\n\n' +
        '2. **`NOT_COMBO_LIVE` (Khách Lẻ Còn Hạn Dặm)**:\n' +
        '   - Khách làm mi lẻ còn trong hạn dặm 21 ngày nhưng **chưa mua combo**.\n' +
        '   - **Cơ hội vàng**: Tệp khách có tỷ lệ chuyển đổi cao nhất để Telesales và CC tư vấn mua Combo tiết kiệm.\n\n' +
        '3. **`COMBO_DEAD` (Khách Combo Quá Hạn)**:\n' +
        '   - Khách từng có gói combo nhưng đã quá 25 ngày không ghé hoặc đã hết số lượt.\n' +
        '   - **Mục tiêu**: Kích hoạt chiến dịch Win-Back với ưu đãi tái nối mi mới.\n\n' +
        '4. **`SINGLE` (Khách Lẻ Độc Lập)**:\n' +
        '   - Khách làm dịch vụ lẻ thông thường không sử dụng chính sách dặm định kỳ.',
      suggestedAction: {
        type: 'APPLY_FILTER',
        label: 'Xem tệp khách NOT_COMBO_LIVE (Cơ hội bán Combo)',
        payload: {
          activeTab: 'NOT_COMBO_LIVE',
          daysSinceLastVisitMin: 1,
          daysSinceLastVisitMax: 21,
        },
      },
    };
  }

  // 3. Filter request: NYC 60 / Days without visit / Spending
  if (
    lower.includes('lọc') ||
    lower.includes('tìm khách') ||
    lower.includes('chưa ghé') ||
    lower.includes('nyc') ||
    lower.includes('chi tiêu') ||
    lower.includes('vip')
  ) {
    let daysMin: number | undefined = undefined;
    let daysMax: number | undefined = undefined;
    let tab = 'ALL';
    let spentMin: number | undefined = undefined;
    let label = 'Lọc tệp khách hàng theo đề xuất';

    if (lower.includes('60') || lower.includes('nyc 60') || lower.includes('31-60')) {
      daysMin = 31;
      daysMax = 60;
      tab = 'NOT_COMBO_LIVE';
      label = 'Lọc khách NYC 60 (31-60 ngày chưa ghé)';
    } else if (lower.includes('90') || lower.includes('nyc 90')) {
      daysMin = 61;
      daysMax = 90;
      label = 'Lọc khách NYC 90 (61-90 ngày có nguy cơ rời bỏ)';
    } else if (lower.includes('30') || lower.includes('nyc 30')) {
      daysMin = 0;
      daysMax = 30;
      label = 'Lọc khách NYC 30 (Mới làm trong 30 ngày)';
    } else if (lower.includes('180') || lower.includes('lâu năm')) {
      daysMin = 91;
      label = 'Lọc khách không ghé trên 90 ngày';
    }

    if (lower.includes('triệu') || lower.includes('tr') || lower.includes('vip') || lower.includes('chi tiêu cao')) {
      const matchNumber = lower.match(/(\d+)\s*(?:triệu|tr)/);
      if (matchNumber) {
        spentMin = parseInt(matchNumber[1], 10) * 1_000_000;
      } else {
        spentMin = 2_000_000;
      }
      label += ` & Chi tiêu ≥ ${(spentMin / 1_000_000).toLocaleString('vi-VN')}tr`;
    }

    const payload: Record<string, unknown> = {
      activeTab: tab,
      ...(daysMin !== undefined ? { daysSinceLastVisitMin: daysMin } : {}),
      ...(daysMax !== undefined ? { daysSinceLastVisitMax: daysMax } : {}),
      ...(spentMin !== undefined ? { totalSpentMin: spentMin } : {}),
    };

    return {
      thinking: `Phân tích yêu cầu lọc khách: Nhận diện tiêu chí số ngày chưa ghé [${daysMin ?? 'auto'} - ${
        daysMax ?? 'auto'
      }], mức chi tiêu [${spentMin ?? 'không giới hạn'}]. Đề xuất cấu hình bộ lọc áp dụng cục bộ vào bảng dữ liệu cá nhân của người dùng.`,
      content:
        `Tôi đã phân tích yêu cầu của bạn và thiết lập cấu hình bộ lọc tương ứng:\n\n` +
        `- **Nhóm khách (Tab)**: \`${tab}\`\n` +
        (daysMin !== undefined ? `- **Số ngày chưa ghé**: Từ **${daysMin}** đến **${daysMax ?? '∞'}** ngày\n` : '') +
        (spentMin !== undefined
          ? `- **Mức chi tiêu tối thiểu**: **${spentMin.toLocaleString('vi-VN')} đ** (Khách giá trị cao)\n`
          : '') +
        `\n💡 *Gợi ý thực thi*: Bạn có thể nhấn nút **"Áp dụng vào bảng hiện tại"** bên dưới. Bộ lọc sẽ chỉ hiển thị trên màn hình của bạn mà không làm ảnh hưởng đến dữ liệu hay phiên làm việc của các thành viên khác.`,
      suggestedAction: {
        type: 'APPLY_FILTER',
        label,
        payload,
      },
    };
  }

  // 4. Personal customer scope
  if (
    lower.includes('của tôi') ||
    lower.includes('tôi quản lý') ||
    lower.includes('cá nhân') ||
    lower.includes('được giao')
  ) {
    return {
      thinking:
        'Nhận diện yêu cầu truy vấn tệp khách hàng cá nhân. Tạo action cấu hình assignedStaffId: "me" để giới hạn dữ liệu trong phạm vi quản lý của người dùng.',
      content:
        `Để xem và quản lý tệp khách hàng được phân bổ trực tiếp cho tài khoản của bạn, bạn có thể áp dụng bộ lọc cá nhân.\n\n` +
        `Khi áp dụng, hệ thống sẽ lọc danh sách khách theo \`assignedStaffId: "me"\`. Bạn có thể kết hợp thêm tiêu chí ngày chưa ghé để ưu tiên gọi những khách sắp đến kỳ dặm mi trước.`,
      suggestedAction: {
        type: 'APPLY_FILTER',
        label: 'Xem tệp khách hàng được phân bổ cho tôi',
        payload: {
          activeTab: 'ALL',
          assignedStaffId: 'me',
        },
      },
    };
  }

  // 5. Workflow advice
  if (
    lower.includes('quy trình') ||
    lower.includes('workflow') ||
    lower.includes('kịch bản') ||
    lower.includes('chăm sóc')
  ) {
    return {
      thinking:
        'Người dùng cần tư vấn về quy trình CSKH và kịch bản chăm sóc khách dặm mi tối ưu. Cung cấp quy trình 3 mốc thời gian chuẩn của chuỗi Wings Lashes.',
      content:
        '### 🎯 Quy Trình Chăm Sóc Khách Hàng Chuẩn (CSKH Workflow)\n\n' +
        'Để tối ưu tỷ lệ giữ chân khách và tăng doanh số Combo, hãy áp dụng quy trình 3 điểm chạm:\n\n' +
        '1. **Điểm chạm 1 (Ngày thứ 3 sau làm mi)**:\n' +
        '   - Nhắn tin/gọi hỏi thăm cảm giác mi (có bị cộm, ngứa hay rụng bất thường không).\n' +
        '   - Hướng dẫn cách chải mi và kiêng nước trong 24 giờ đầu.\n\n' +
        '2. **Điểm chạm 2 (Ngày thứ 14 - 18)**:\n' +
        '   - Nhắc khách chuẩn bị đến lịch dặm mi để giữ form mi luôn dày đẹp.\n' +
        '   - Cảnh báo mốc 21 ngày đối với khách lẻ để không bị mất quyền lợi dặm giá ưu đãi.\n\n' +
        '3. **Điểm chạm 3 (Tại quầy khi khách ghé dặm)**:\n' +
        '   - Tư vấn viên CC In giới thiệu gói Combo dặm mi 3-5 lần để tiết kiệm chi phí đến 35%.',
      suggestedAction: {
        type: 'APPLY_FILTER',
        label: 'Lọc khách ngày thứ 14 - 20 (Đang cần nhắc dặm mi)',
        payload: {
          activeTab: 'ALL',
          daysSinceLastVisitMin: 14,
          daysSinceLastVisitMax: 20,
        },
      },
    };
  }

  // 6. Generic response
  return {
    thinking:
      'Tiếp nhận câu hỏi mở từ nhân sự. Phản hồi thông tin nghiệp vụ và đề xuất các hỗ trợ tiếp theo trong không gian làm việc.',
    content:
      `Tôi đã ghi nhận nội dung trao đổi của bạn: "${userMessage}".\n\n` +
      'Bạn có thể yêu cầu tôi hỗ trợ thêm:\n' +
      '- 🔎 Tìm kiếm và lọc tệp khách hàng theo ngày chưa ghé (NYC 30/60/90) hoặc chi tiêu.\n' +
      '- 📚 Giải thích quy chuẩn dặm mi (21 ngày khách lẻ, 25 ngày khách combo).\n' +
      '- 📊 Phân tích cơ hội chuyển đổi khách lẻ sang gói Combo dặm mi tiết kiệm.',
    suggestedAction: null,
  };
}

export class AiAssistantService {
  /**
   * List sessions for a staff member (strictly isolated by staffId)
   */
  static async listSessions(
    crm: CrmPrismaClient,
    staffId: number,
    scope: string = 'customers'
  ): Promise<AiChatSession[]> {
    const sessions = await crm.crmAiChatSession.findMany({
      where: {
        staffId,
        scope,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
      take: 50,
    });

    return sessions.map((s) => ({
      id: s.id,
      staffId: s.staffId,
      title: s.title,
      scope: s.scope,
      metadata: s.metadataJson ? JSON.parse(s.metadataJson) : null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      lastMessage: s.messages[0]?.content?.slice(0, 100) || undefined,
      messageCount: s._count.messages,
    }));
  }

  /**
   * Get single session with its messages (strictly verifies staffId)
   */
  static async getSession(
    crm: CrmPrismaClient,
    sessionId: string,
    staffId: number
  ): Promise<{
    session: AiChatSession;
    messages: AiChatMessage[];
  } | null> {
    const session = await crm.crmAiChatSession.findFirst({
      where: {
        id: sessionId,
        staffId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!session) return null;

    return {
      session: {
        id: session.id,
        staffId: session.staffId,
        title: session.title,
        scope: session.scope,
        metadata: session.metadataJson ? JSON.parse(session.metadataJson) : null,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      },
      messages: session.messages.map((m) => ({
        id: m.id,
        sessionId: m.sessionId,
        role: m.role as AiChatMessage['role'],
        content: m.content,
        thinking: m.thinking,
        suggestedAction: m.suggestedActionJson ? JSON.parse(m.suggestedActionJson) : null,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Create a new session for a staff member
   */
  static async createSession(
    crm: CrmPrismaClient,
    staffId: number,
    data: { title?: string; scope?: string; metadata?: Record<string, unknown> }
  ): Promise<AiChatSession> {
    const title = data.title?.trim() || 'Hội thoại mới';
    const scope = data.scope || 'customers';
    const metadataJson = data.metadata ? JSON.stringify(data.metadata) : null;

    const created = await crm.crmAiChatSession.create({
      data: {
        staffId,
        title,
        scope,
        metadataJson,
      },
    });

    return {
      id: created.id,
      staffId: created.staffId,
      title: created.title,
      scope: created.scope,
      metadata: data.metadata || null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      messages: [],
    };
  }

  /**
   * Delete session (strictly verifies staffId)
   */
  static async deleteSession(crm: CrmPrismaClient, sessionId: string, staffId: number): Promise<boolean> {
    const deleteResult = await crm.crmAiChatSession.deleteMany({
      where: {
        id: sessionId,
        staffId,
      },
    });
    return deleteResult.count > 0;
  }

  /**
   * Process a chat message:
   * 1. Ensure/resolve session owned by staffId
   * 2. Store user message
   * 3. Call LLM (Gemini with system prompt) or Smart Fallback
   * 4. Parse thinking & suggested actions
   * 5. Store assistant message
   * 6. Return response
   */
  static async sendMessage(
    crm: CrmPrismaClient,
    staffId: number,
    params: {
      sessionId?: string;
      message: string;
      scope?: string;
      context?: AiChatContext;
    },
    legacyPrisma?: LegacyPrismaClient
  ): Promise<AiAssistantChatResponse> {
    const { message, scope = 'customers', context } = params;
    const trimmedMessage = message.trim();

    // 1. Resolve or create session
    const sessionId = params.sessionId;
    let session = sessionId
      ? await crm.crmAiChatSession.findFirst({
          where: { id: sessionId, staffId },
        })
      : null;

    if (!session) {
      // Derive session title from first prompt (up to 40 chars)
      const sessionTitle = trimmedMessage.slice(0, 40) + (trimmedMessage.length > 40 ? '...' : '');
      session = await crm.crmAiChatSession.create({
        data: {
          staffId,
          title: sessionTitle,
          scope,
          metadataJson: context ? JSON.stringify(context) : null,
        },
      });
    }

    const sessionMetadata: Record<string, unknown> = session.metadataJson
      ? (() => {
          try {
            return JSON.parse(session.metadataJson);
          } catch {
            return {};
          }
        })()
      : {};
    let agConversationId =
      typeof sessionMetadata.agConversationId === 'string' ? sessionMetadata.agConversationId : undefined;

    // 2. Save user message to database
    await crm.crmAiChatMessage.create({
      data: {
        sessionId: session.id,
        role: 'user',
        content: trimmedMessage,
      },
    });

    // 3. Retrieve recent session history (up to last 10 messages)
    const recentMessages = await crm.crmAiChatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    // 4. Fetch live customer context from database for 100% data accuracy
    const liveCustomerText = await LiveCustomerContextService.getLiveCustomerSummary(legacyPrisma, crm, staffId);

    let parsedResponse: ParsedAiResponse | null = null;
    let source: 'ag' | 'gemini' | 'fallback' = 'fallback';

    // 5. PRIMARY ENGINE: Route through Antigravity (AG) Desktop Bridge
    try {
      const agContextInfo = `[Ngữ cảnh màn hình: Trang=${context?.page || context?.pathname || 'customers'}, Bộ lọc hiện tại=${JSON.stringify(
        context?.currentFilter || {}
      )}, Số khách đang chọn=${context?.selectedCustomerCount || 0}]
[Người dùng: ${context?.userName || 'Danny'} (ID: ${staffId}, Role: ${context?.myRole || 'staff'})]`;

      const promptForAg = `${SYSTEM_PROMPT_ASSISTANT}

${liveCustomerText ? `${liveCustomerText}\n` : ''}${agContextInfo}

[Yêu cầu]:
${trimmedMessage}

Quy định phản hồi:
- Hãy suy luận và phân tích kỹ lưỡng. Đặt quá trình tư duy trong thẻ <thinking>...</thinking>.
- Nếu người dùng cần lọc tệp khách hàng, hãy đề xuất cấu hình bộ lọc cụ thể trong thẻ <action type="APPLY_FILTER" label="...">JSON_FILTER_PAYLOAD</action>.
- Trả lời bằng tiếng Việt thân thiện, súc tích và chuẩn xác.
- QUAN TRỌNG: Đây là phản hồi văn bản cho giao diện web Copilot, KHÔNG gọi lệnh speak âm thanh để tập trung phản hồi nhanh và chính xác nhất cho người dùng.`;

      const agTitle = `[mOS Copilot] ${trimmedMessage.slice(0, 40)}`;

      if (await AgChatBridgeService.isLocalAgAvailable()) {
        const agResult = await AgChatBridgeService.executeLocalAgPrompt(agConversationId, promptForAg, agTitle);
        if (agResult?.response?.content) {
          parsedResponse = agResult.response;
          agConversationId = agResult.conversationId;
          source = 'ag';
        }
      } else {
        // Try remote bridge queue (when API is running on VPS and Danny's Mac daemon is polling)
        try {
          const agResult = await AgChatBridgeService.enqueueRemoteChatJob(
            agConversationId,
            promptForAg,
            agTitle,
            240_000,
            session.id
          );
          if (agResult?.response?.content) {
            parsedResponse = agResult.response;
            agConversationId = agResult.conversationId;
            source = 'ag';
          }
        } catch {
          // Remote bridge timed out or no agent connected; will fall back below
        }
      }
    } catch {
      // Antigravity bridge execution failed, proceed to fallback
    }

    // 6. SECONDARY ENGINE FALLBACK: Gemini 2.5 Flash / Smart Domain Fallback
    if (!parsedResponse) {
      const geminiApiKey = process.env.GEMINI_API_KEY;

      if (geminiApiKey) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

          const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

          // Build history
          for (const m of recentMessages) {
            const role = m.role === 'assistant' ? 'model' : 'user';
            contents.push({
              role,
              parts: [{ text: m.content }],
            });
          }

          // Add current context and live customer metrics
          const contextStr = `\n${liveCustomerText ? `${liveCustomerText}\n` : ''}[Ngữ cảnh màn hình: Trang=${
            context?.page || context?.pathname || 'customers'
          }, Bộ lọc hiện tại=${JSON.stringify(context?.currentFilter || {})}, Số khách đang chọn=${
            context?.selectedCustomerCount || 0
          }]`;

          contents[contents.length - 1].parts[0].text += contextStr;

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

          const response = await axios.post(payload as SafeAny, geminiUrl, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 20_000,
          });

          const replyRaw = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (replyRaw) {
            parsedResponse = extractThinkingAndAction(replyRaw);
            source = 'gemini';
          } else {
            throw new Error('Empty Gemini response');
          }
        } catch {
          parsedResponse = generateAssistantFallback(trimmedMessage, context);
          source = 'fallback';
        }
      } else {
        parsedResponse = generateAssistantFallback(trimmedMessage, context);
        source = 'fallback';
      }
    }

    // 7. Save assistant response to database
    const assistantMessageRecord = await crm.crmAiChatMessage.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: parsedResponse.content,
        thinking: parsedResponse.thinking,
        suggestedActionJson: parsedResponse.suggestedAction ? JSON.stringify(parsedResponse.suggestedAction) : null,
      },
    });

    // Touch session updatedAt and persist agConversationId
    const updatedMetadata = {
      ...sessionMetadata,
      ...(agConversationId ? { agConversationId } : {}),
      lastEngine: source,
    };

    await crm.crmAiChatSession.update({
      where: { id: session.id },
      data: {
        updatedAt: new Date(),
        metadataJson: JSON.stringify(updatedMetadata),
      },
    });

    return {
      sessionId: session.id,
      source,
      engine: source,
      session: {
        id: session.id,
        staffId: session.staffId,
        title: session.title,
        scope: session.scope,
        metadata: updatedMetadata,
        createdAt: session.createdAt.toISOString(),
        updatedAt: new Date().toISOString(),
      },
      message: {
        id: assistantMessageRecord.id,
        sessionId: assistantMessageRecord.sessionId,
        role: 'assistant',
        content: assistantMessageRecord.content,
        thinking: assistantMessageRecord.thinking,
        suggestedAction: parsedResponse.suggestedAction,
        source,
        createdAt: assistantMessageRecord.createdAt.toISOString(),
      },
    };
  }
}
