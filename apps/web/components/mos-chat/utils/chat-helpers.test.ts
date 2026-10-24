import { describe, it, expect } from 'vitest';
import {
  isUserMentionedInText,
  extractMentionedStaff,
  cleanTextForUrgentVoiceAnnouncement,
  buildMaiUrgentVoiceAnnouncement,
  isStaffInConversationMembers,
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

    it('does NOT falsely match other people when tagging a full name like @Nguyễn Quang Khải', () => {
      const userQuangKhai = { id: 43, displayName: 'Nguyễn Quang Khải' };
      const userThiHoa = { id: 99, displayName: 'Nguyễn Thị Hoa' };
      const userVanLong = { id: 100, displayName: 'Nguyễn Văn Long' };
      const userTamNguyen = { id: 4, displayName: 'Tâm Nguyễn' };

      const text = '@Nguyễn Quang Khải hình như mOS Chat đã chạy khá ổn trên iPhone rồi nhé.';
      expect(isUserMentionedInText(text, userQuangKhai)).toBe(true);
      expect(isUserMentionedInText(text, userThiHoa)).toBe(false);
      expect(isUserMentionedInText(text, userVanLong)).toBe(false);
      expect(isUserMentionedInText(text, userTamNguyen)).toBe(false);
    });

    it('allows mentioning by given name without matching common surnames', () => {
      const userQuangKhai = { id: 43, displayName: 'Nguyễn Quang Khải' };
      expect(isUserMentionedInText('Alo @Khải ơi', userQuangKhai)).toBe(true);
      expect(isUserMentionedInText('Alo @Quang Khải ơi', userQuangKhai)).toBe(true);
    });
  });

  describe('extractMentionedStaff', () => {
    const staffDirectory = [
      { id: 1, displayName: 'Danny Do', username: 'danny.do@wingslashes.com' },
      { id: 4, displayName: 'Tâm Nguyễn', username: 'tam.nguyen@wingslashes.com' },
      { id: 43, displayName: 'Nguyễn Quang Khải', username: 'user45103@wingslashes.com' },
      { id: 99, displayName: 'Nguyễn Thị Hoa', username: 'hoa.nguyen@wingslashes.com' },
      { id: 105, displayName: 'Hà Booker', username: 'ha.telesale@wingslashes.com' },
    ];

    it('extracts exactly the mentioned staff without false positive surname matches', () => {
      const text = '@Nguyễn Quang Khải hình như mOS Chat đã chạy khá ổn trên iPhone rồi nhé.';
      const mentioned = extractMentionedStaff(text, staffDirectory);
      expect(mentioned).toHaveLength(1);
      expect(mentioned[0].id).toBe(43);
      expect(mentioned[0].displayName).toBe('Nguyễn Quang Khải');
    });

    it('extracts multiple unique mentioned colleagues', () => {
      const text = 'Chào @Danny Do và @Hà Booker nhé!';
      const mentioned = extractMentionedStaff(text, staffDirectory);
      expect(mentioned).toHaveLength(2);
      expect(mentioned.map((m) => m.id)).toEqual([1, 105]);
    });

    it('ignores special tags like @All or @MAI', () => {
      const text = '@all kiểm tra đơn hàng, @mai tóm tắt giúp';
      const mentioned = extractMentionedStaff(text, staffDirectory);
      expect(mentioned).toHaveLength(0);
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
      expect(result).toBe(
        'Tâm Nguyễn vừa gửi tin nhắn khẩn cấp trong nhóm 4-cô-gái-hăng-hái: 0901406091 cho anh 30K nhen'
      );
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
      expect(result).toBe(
        'Tâm Nguyễn vừa gửi tin nhắn khẩn cấp: 0901406091 cho anh 30K nhen. Ghi chú: Khách đang đợi tại quầy'
      );
    });
  });

  describe('isStaffInConversationMembers (Dual-Account Invariant MOS-BUG-143)', () => {
    const coreTeamConversation = {
      id: 'space-core-team',
      name: 'core-team',
      type: 'space' as const,
      memberIds: [1, 4, 14, 15, 21, 43], // Notice: 43 is Khải's legacy ID, 21 is Hân's legacy ID
      memberNicknames: { '6': 'K' },
    };

    const mockStaffDirectory = [
      { id: 1, displayName: 'Danny Do', username: 'danny.do@wingslashes.com' },
      { id: 4, displayName: 'Tâm Nguyễn', username: 'tam.nguyen@wingslashes.com' },
      { id: 6, displayName: 'Nguyễn Quang Khải', username: 'khai.nguyen@wingslashes.com' }, // Active Google account
      { id: 43, displayName: 'Nguyễn Quang Khải', username: 'user45103@wingslashes.com', legacyStaffId: 45103 }, // Legacy account
      { id: 13, displayName: 'Bảo Hân', username: 'bao.han@wingslashes.com' }, // Active Google account
      { id: 21, displayName: 'Bảo Hân', username: 'user45104@wingslashes.com', legacyStaffId: 45104 }, // Legacy account
      { id: 99, displayName: 'Nguyễn Thị Hoa', username: 'hoa.nguyen@wingslashes.com' }, // Outsider
    ];

    it('returns true when staff ID directly exists in memberIds', () => {
      const staffDanny = { id: 1, displayName: 'Danny Do' };
      expect(isStaffInConversationMembers(staffDanny, coreTeamConversation, mockStaffDirectory)).toBe(true);
    });

    it('returns true for dual-account staff (e.g. Khải ID 6) when alternate record (ID 43) is in memberIds', () => {
      const staffKhaiActive = { id: 6, displayName: 'Nguyễn Quang Khải', username: 'khai.nguyen@wingslashes.com' };
      // Even though ID 6 is NOT directly in memberIds [1, 4, 14, 15, 21, 43], Khải is recognized via ID 43!
      expect(isStaffInConversationMembers(staffKhaiActive, coreTeamConversation, mockStaffDirectory)).toBe(true);
    });

    it('returns true for dual-account staff (e.g. Bảo Hân ID 13) when legacy record (ID 21) is in memberIds', () => {
      const staffHanActive = { id: 13, displayName: 'Bảo Hân', username: 'bao.han@wingslashes.com' };
      expect(isStaffInConversationMembers(staffHanActive, coreTeamConversation, mockStaffDirectory)).toBe(true);
    });

    it('returns true when staff has a nickname in the space', () => {
      const staffKhai = { id: 6, displayName: 'Khải' };
      expect(isStaffInConversationMembers(staffKhai, coreTeamConversation, mockStaffDirectory)).toBe(true);
    });

    it('returns false for true non-members who are not in the space under any account', () => {
      const staffOutsider = { id: 99, displayName: 'Nguyễn Thị Hoa', username: 'hoa.nguyen@wingslashes.com' };
      expect(isStaffInConversationMembers(staffOutsider, coreTeamConversation, mockStaffDirectory)).toBe(false);
    });

    it('returns true for all staff in 1-on-1 Direct Messages (DM)', () => {
      const dmConversation = {
        id: 'dm-1-99',
        type: 'dm' as const,
        participantStaffId: 99,
      };
      const staffOutsider = { id: 99, displayName: 'Nguyễn Thị Hoa' };
      expect(isStaffInConversationMembers(staffOutsider, dmConversation, mockStaffDirectory)).toBe(true);
    });
  });
});
