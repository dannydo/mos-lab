import { describe, it, expect } from 'vitest';
import {
  isUserMentionedInText,
  cleanTextForUrgentVoiceAnnouncement,
  buildMaiUrgentVoiceAnnouncement,
} from './chat-helpers';

describe('mOS Chat Urgent Voice Announcement Helpers (MOS-BUG-135)', () => {
  const userDanny = {
    id: 1,
    displayName: 'Danny Do',
    username: 'danny.do@wingslashes.com',
  };

  const userDamTi = {
    id: 4,
    displayName: 'Đẫm Ti',
    username: 'dam.ti@wingslashes.com',
  };

  describe('isUserMentionedInText', () => {
    it('detects direct mention by full displayName with accent or tone marks', () => {
      const text = '@Đẫm Ti 0901406091 cho anh 30K nhen';
      expect(isUserMentionedInText(text, userDamTi)).toBe(true);
      expect(isUserMentionedInText(text, userDanny)).toBe(false);
    });

    it('detects mention without accent marks', () => {
      const text = '@Dam Ti kiem tra gap don nay giup anh nhe';
      expect(isUserMentionedInText(text, userDamTi)).toBe(true);
      expect(isUserMentionedInText(text, userDanny)).toBe(false);
    });

    it('detects single word first name mention', () => {
      const text = 'Nho @Danny duyet gium em';
      expect(isUserMentionedInText(text, userDanny)).toBe(true);
      expect(isUserMentionedInText(text, userDamTi)).toBe(false);
    });

    it('detects nickname assigned in space', () => {
      const text = '@TiLash alo alo';
      const nicknames = { '4': 'TiLash' };
      expect(isUserMentionedInText(text, userDamTi, { nicknames })).toBe(true);
    });

    it('detects @All and @mọi người for all users', () => {
      expect(isUserMentionedInText('@all khẩn cấp mọi người ơi', userDanny)).toBe(true);
      expect(isUserMentionedInText('@mọi người kiểm tra đơn này', userDamTi)).toBe(true);
    });

    it('always targets recipient in 1-on-1 Direct Message (DM)', () => {
      expect(isUserMentionedInText('Đơn này gấp lắm!', userDanny, { isDirectMessage: true })).toBe(true);
    });
  });

  describe('cleanTextForUrgentVoiceAnnouncement', () => {
    it('strips leading mentions from message text', () => {
      const raw = '@Đẫm Ti 0901406091 cho anh 30K nhen';
      expect(cleanTextForUrgentVoiceAnnouncement(raw)).toBe('0901406091 cho anh 30K nhen');
    });

    it('cleans markdown tags and links', () => {
      const raw = '@Danny **Khẩn cấp:** Kiểm tra hóa đơn [HD-123](https://example.com)';
      expect(cleanTextForUrgentVoiceAnnouncement(raw)).toBe('Khẩn cấp: Kiểm tra hóa đơn HD-123');
    });

    it('truncates overly long messages cleanly', () => {
      const longText =
        'Đây là một tin nhắn rất dài ' + 'nội dung quan trọng '.repeat(15) + 'cần phải đọc tóm tắt ngắn gọn';
      const cleaned = cleanTextForUrgentVoiceAnnouncement(longText);
      expect(cleaned.length).toBeLessThanOrEqual(160);
      expect(cleaned.endsWith('...')).toBe(true);
    });
  });

  describe('buildMaiUrgentVoiceAnnouncement', () => {
    it('formats announcement for space conversation like iOS Siri', () => {
      const result = buildMaiUrgentVoiceAnnouncement({
        senderName: 'Tâm Nguyễn',
        conversationName: '4-cô-gái-hăng-hái',
        isSpace: true,
        messageText: '@Đẫm Ti 0901406091 cho anh 30K nhen',
      });
      expect(result).toBe('Tâm Nguyễn vừa gửi tin nhắn khẩn cấp trong nhóm 4-cô-gái-hăng-hái: 0901406091 cho anh 30K nhen');
    });

    it('formats announcement for direct message', () => {
      const result = buildMaiUrgentVoiceAnnouncement({
        senderName: 'Tâm Nguyễn',
        isSpace: false,
        messageText: '0901406091 cho anh 30K nhen',
      });
      expect(result).toBe('Tâm Nguyễn vừa gửi tin nhắn khẩn cấp: 0901406091 cho anh 30K nhen');
    });

    it('includes buzz note when provided', () => {
      const result = buildMaiUrgentVoiceAnnouncement({
        senderName: 'Tâm Nguyễn',
        messageText: '0901406091 cho anh 30K nhen',
        note: 'Khách đang đợi tại quầy',
      });
      expect(result).toBe('Tâm Nguyễn vừa gửi tin nhắn khẩn cấp: 0901406091 cho anh 30K nhen. Ghi chú: Khách đang đợi tại quầy');
    });
  });
});
