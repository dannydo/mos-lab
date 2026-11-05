import { describe, it, expect } from 'vitest';
import {
  cleanQuotedText,
  formatQuotePayload,
  parseQuoteMeta,
  isStandardQuote,
  findSourceMessage,
} from '../utils/quoteUtils';

describe('quoteUtils - cleanQuotedText and formatQuotePayload (MOS-BUG-197)', () => {
  it('cleans plain single line message without alterations', () => {
    const raw = 'Option này chỉ áp dụng cho khách đang còn gói và mua gói mới';
    expect(cleanQuotedText(raw)).toBe(raw);
  });

  it('normalizes multi-line text into a single line without newlines', () => {
    const raw = `Dạ ví dụ gói 10-6 sẽ là
Mua 4 New + 6 Refill
Bình thường sẽ tặng: 3 New và 3 Refill
Tháng 11 sẽ đổi thành: 3 Gift cards và 3 Refill
@Danny Do @Đẫm Ti @Bảo Hân`;

    const cleaned = cleanQuotedText(raw);
    expect(cleaned).not.toContain('\n');
    expect(cleaned).toBe(
      'Dạ ví dụ gói 10-6 sẽ là Mua 4 New + 6 Refill Bình thường sẽ tặng: 3 New và 3 Refill Tháng 11 sẽ đổi thành: 3 Gift cards và 3 Refill @Danny Do @Đẫm Ti @Bảo Hân'
    );
  });

  it('strips leading quote block when replying to a message that already contains a quote', () => {
    const raw = `> Trích dẫn @Danny Do: 5M đang được ưu ái nhất 1.7M/ticket?

Dạ ví dụ gói 10-6 sẽ là
Mua 4 New + 6 Refill
Bình thường sẽ tặng: 3 New và 3 Refill
Tháng 11 sẽ đổi thành: 3 Gift cards và 3 Refill
@Danny Do @Đẫm Ti @Bảo Hân`;

    const cleaned = cleanQuotedText(raw);
    // Should NOT contain the old quote prefix or Danny Do's original text
    expect(cleaned).not.toContain('Trích dẫn @Danny Do');
    expect(cleaned).not.toContain('5M đang được ưu ái');
    expect(cleaned).not.toContain('\n');
    expect(cleaned).toBe(
      'Dạ ví dụ gói 10-6 sẽ là Mua 4 New + 6 Refill Bình thường sẽ tặng: 3 New và 3 Refill Tháng 11 sẽ đổi thành: 3 Gift cards và 3 Refill @Danny Do @Đẫm Ti @Bảo Hân'
    );
  });

  it('strips HTML blockquote when present', () => {
    const raw = `<blockquote>Trích dẫn @Danny Do: 5M</blockquote>

Nội dung phản hồi thực tế của nhân sự`;

    const cleaned = cleanQuotedText(raw);
    expect(cleaned).toBe('Nội dung phản hồi thực tế của nhân sự');
  });

  it('extracts quote content if the message only consists of a quote', () => {
    const raw = '> Trích dẫn @Danny Do: 5M đang được ưu ái nhất 1.7M/ticket?';
    expect(cleanQuotedText(raw)).toBe('5M đang được ưu ái nhất 1.7M/ticket?');
  });

  it('formatQuotePayload formats clean quote and preserves user reply cleanly without leaking quoted lines into body', () => {
    const sender = 'Nguyễn Quang Khải';
    const originalReply = `> Trích dẫn @Danny Do: 5M đang được ưu ái nhất 1.7M/ticket?

Dạ ví dụ gói 10-6 sẽ là
Mua 4 New + 6 Refill
Bình thường sẽ tặng: 3 New và 3 Refill`;

    const userReply = 'Option này chỉ áp dụng cho khách đang còn gói và mua gói mới';
    const payload = formatQuotePayload(sender, originalReply, userReply);

    // First line must be standard quote
    const lines = payload.split('\n');
    expect(lines[0]).toBe(
      '> Trích dẫn @Nguyễn Quang Khải: Dạ ví dụ gói 10-6 sẽ là Mua 4 New + 6 Refill Bình thường sẽ tặng: 3 New và 3 Refill'
    );
    expect(lines[1]).toBe('');
    expect(lines[2]).toBe(userReply);
    expect(lines).toHaveLength(3);
  });

  it('findSourceMessage finds original message even when original message has an existing quote', () => {
    const messages = [
      {
        id: 'msg-1',
        senderName: 'Danny Do',
        text: '5M đang được ưu ái nhất 1.7M/ticket?',
      },
      {
        id: 'msg-2',
        senderName: 'Nguyễn Quang Khải',
        text: `> Trích dẫn @Danny Do: 5M đang được ưu ái nhất 1.7M/ticket?\n\nDạ ví dụ gói 10-6 sẽ là\nMua 4 New + 6 Refill`,
      },
    ];

    // When quoting msg-2, content is "Dạ ví dụ gói 10-6 sẽ là Mua 4 New + 6 Refill"
    const meta = {
      senderName: 'Nguyễn Quang Khải',
      content: 'Dạ ví dụ gói 10-6 sẽ là Mua 4 New + 6 Refill',
    };

    const foundId = findSourceMessage(messages, meta);
    expect(foundId).toBe('msg-2');
  });

  it('parseQuoteMeta and isStandardQuote validate correct format', () => {
    const valid = '> Trích dẫn @Minh Thảo: Nội dung tin nhắn';
    expect(isStandardQuote(valid)).toBe(true);
    expect(parseQuoteMeta(valid)).toEqual({
      senderName: 'Minh Thảo',
      content: 'Nội dung tin nhắn',
    });

    const invalid = 'Tin nhắn bình thường không trích dẫn';
    expect(isStandardQuote(invalid)).toBe(false);
    expect(parseQuoteMeta(invalid)).toBeNull();
  });
});
