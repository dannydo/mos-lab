/**
 * quoteUtils.ts
 * Tiện ích xử lý trích dẫn (quote) trong mOS Chat:
 * - Parse metadata từ chuỗi quote format "> Trích dẫn @Tên: nội dung"
 * - cleanQuotedText: Làm sạch nội dung tin nhắn, bóc quote cũ & gộp newlines để không làm vỡ blockquote
 * - formatQuotePayload: Tạo payload trích dẫn chuẩn hóa không copy lại nội dung trả lời (MOS-BUG-197)
 * - Scroll-to-source: tìm message gốc qua text-match và scrollIntoView
 * - Flash highlight animation trên message gốc sau khi scroll
 */

import { removeVietnameseTones } from '@mos-lab/shared';

export interface QuoteMeta {
  senderName: string;
  content: string;
}

/**
 * Làm sạch nội dung tin nhắn trước khi trích dẫn:
 * 1. Loại bỏ các khối quote cũ (Markdown `> Trích dẫn @...` / HTML `<blockquote>...</blockquote>`)
 *    để không bị lồng quote hoặc copy lại nội dung trích dẫn cũ (MOS-BUG-197).
 * 2. Gộp các dòng (newlines) và khoảng trắng thừa thành khoảng trắng đơn trên một dòng
 *    để khối quote không bị ngắt dòng trong Markdown (tránh việc các dòng sau rơi ra ngoài
 *    thành nội dung trả lời bị copy lại).
 * 3. Nếu tin nhắn chỉ gồm quote cũ mà không có nội dung mới, trích xuất nội dung của quote đó.
 */
export function cleanQuotedText(rawText?: string | null): string {
  if (!rawText) return '';
  let text = rawText.trim();
  if (!text) return '';

  // 1. Loại bỏ các thẻ HTML <blockquote>...</blockquote>
  if (/<blockquote[\s\S]*?<\/blockquote>/i.test(text)) {
    const stripped = text.replace(/<blockquote[\s\S]*?<\/blockquote>/gi, '').trim();
    if (stripped) {
      text = stripped;
    } else {
      text = text.replace(/<\/?blockquote[^>]*>/gi, '').trim();
    }
  }

  // 2. Tách dòng và loại bỏ các dòng quote Markdown ở đầu (bắt đầu bằng '>')
  const lines = text.split('\n');
  let quoteLinesCount = 0;
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('>') || (quoteLinesCount > 0 && !trimmedLine)) {
      quoteLinesCount++;
    } else {
      break;
    }
  }

  if (quoteLinesCount > 0 && quoteLinesCount < lines.length) {
    text = lines.slice(quoteLinesCount).join('\n').trim();
  } else if (quoteLinesCount >= lines.length) {
    // Toàn bộ tin nhắn là quote, bóc bỏ dấu '>' và format 'Trích dẫn @Tên:' nếu có
    const combined = lines.map((l) => l.replace(/^>\s*/, '')).join(' ').trim();
    const meta = parseQuoteMeta(`> ${combined}`);
    text = meta?.content ? meta.content : combined;
  }

  // Nếu vẫn còn sót chuỗi "Trích dẫn @Tên: " ở đầu do copy dán thủ công, loại bỏ tiếp
  const manualQuotePrefix = text.match(/^(?:>\s*)?Trích dẫn @[^:]+:\s*([\s\S]+)$/);
  if (manualQuotePrefix && manualQuotePrefix[1]) {
    text = manualQuotePrefix[1];
  }

  // 3. Chuẩn hóa khoảng trắng và ngắt dòng thành khoảng trắng đơn trên một dòng
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Tạo payload trích dẫn chuẩn hóa cho mOS Chat:
 * - Trích xuất snippet sạch từ quotedText qua cleanQuotedText (không newlines, không nested quote)
 * - Nối với replyText của người dùng: `> Trích dẫn @${senderName}: ${snippet}\n\n${replyText}`
 */
export function formatQuotePayload(senderName: string, quotedText: string, replyText: string): string {
  const cleanSnippet = cleanQuotedText(quotedText);
  const trimmedReply = replyText.trim();
  if (!cleanSnippet) {
    return trimmedReply;
  }
  return `> Trích dẫn @${senderName.trim()}: ${cleanSnippet}\n\n${trimmedReply}`;
}

/**
 * Parse chuỗi quote sang { senderName, content }.
 * Hỗ trợ format: "> Trích dẫn @Tên: nội dung..."
 * Trả về null nếu không khớp format.
 */
export function parseQuoteMeta(raw: string): QuoteMeta | null {
  // Loại bỏ prefix "> " hoặc "> Trích dẫn @"
  const m = raw.match(/^>\s*Trích dẫn @([^:]+):\s*([\s\S]+)$/);
  if (!m) return null;
  return {
    senderName: m[1].trim(),
    content: m[2].trim(),
  };
}

/**
 * Kiểm tra quote string có phải format chuẩn của mOS Chat không.
 */
export function isStandardQuote(raw: string): boolean {
  return /^>\s*Trích dẫn @[^:]+:/.test(raw);
}

/**
 * Tìm message gốc bằng text-match:
 * - So sánh senderName (không phân biệt dấu/hoa thường)
 * - So sánh nội dung đã làm sạch của quote với message.text (hỗ trợ cả trường hợp message gốc có quote cũ)
 */
export function findSourceMessage(
  messages: Array<{ id: string; senderName?: string; text?: string | null }>,
  meta: QuoteMeta
): string | null {
  const normName = removeVietnameseTones(meta.senderName.toLowerCase()).trim();
  const cleanMetaContent = cleanQuotedText(meta.content);
  // Dùng 40 ký tự đầu của content để tránh false negative khi quote bị cắt
  const normContent = removeVietnameseTones((cleanMetaContent || meta.content).slice(0, 40).toLowerCase()).trim();

  for (const msg of messages) {
    if (!msg.senderName || !msg.text) continue;
    const msgName = removeVietnameseTones(msg.senderName.toLowerCase()).trim();
    if (!msgName.includes(normName) && !normName.includes(msgName)) continue;

    const cleanMsgText = cleanQuotedText(msg.text);
    const normCleanMsg = removeVietnameseTones((cleanMsgText || msg.text).toLowerCase()).trim();
    const normRawMsg = removeVietnameseTones(msg.text.toLowerCase()).trim();

    const targetSub = normContent.slice(0, 25);
    if (normCleanMsg.includes(targetSub) || normRawMsg.includes(targetSub)) {
      return msg.id;
    }
  }
  return null;
}

const FLASH_CLASS = 'mos-chat-quote-flash';

/**
 * Scroll tới message có data-message-id khớp trong container,
 * sau đó flash highlight 800ms.
 *
 * @param messageId   - id của message cần scroll đến
 * @param container   - HTMLElement chứa các message bubble (scroll container)
 */
export function scrollToMessageAndFlash(messageId: string, container?: HTMLElement | null): void {
  const root = container ?? document;
  const el = root.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`);
  if (!el) return;

  el.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Đảm bảo animation reset sạch trước khi thêm lại
  el.classList.remove(FLASH_CLASS);
  // Dùng requestAnimationFrame để đảm bảo browser xử lý removal trước
  requestAnimationFrame(() => {
    el.classList.add(FLASH_CLASS);
    setTimeout(() => el.classList.remove(FLASH_CLASS), 900);
  });
}
