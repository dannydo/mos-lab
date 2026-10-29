/**
 * quoteUtils.ts
 * Tiện ích xử lý trích dẫn (quote) trong mOS Chat:
 * - Parse metadata từ chuỗi quote format "> Trích dẫn @Tên: nội dung"
 * - Scroll-to-source: tìm message gốc qua text-match và scrollIntoView
 * - Flash highlight animation trên message gốc sau khi scroll
 */

import { removeVietnameseTones } from '@mos-lab/shared';

export interface QuoteMeta {
  senderName: string;
  content: string;
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
 * - So sánh 30 ký tự đầu của nội dung quote với message.text
 */
export function findSourceMessage(
  messages: Array<{ id: string; senderName?: string; text?: string | null }>,
  meta: QuoteMeta
): string | null {
  const normName = removeVietnameseTones(meta.senderName.toLowerCase()).trim();
  // Dùng 40 ký tự đầu của content để tránh false negative khi quote bị cắt
  const normContent = removeVietnameseTones(meta.content.slice(0, 40).toLowerCase()).trim();

  for (const msg of messages) {
    if (!msg.senderName || !msg.text) continue;
    const msgName = removeVietnameseTones(msg.senderName.toLowerCase()).trim();
    if (!msgName.includes(normName) && !normName.includes(msgName)) continue;
    const msgText = removeVietnameseTones(msg.text.slice(0, 80).toLowerCase()).trim();
    if (msgText.includes(normContent.slice(0, 25))) return msg.id;
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
