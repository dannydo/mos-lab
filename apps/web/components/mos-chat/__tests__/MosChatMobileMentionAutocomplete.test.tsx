import React, { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  MosChatMobileMentionAutocomplete,
  getMentionQueryAtCursor,
  getRoleBadgeInfo,
} from '../mobile/MosChatMobileMentionAutocomplete';
import { MosChatProvider } from '../context/MosChatContext';
import { MosChatMobileApp } from '../mobile/MosChatMobileApp';

// Mock staff directory and addMemberToSpace
const mockAddMemberToSpace = vi.fn();

vi.mock('../context/MosChatContext', async () => {
  const actual = await vi.importActual<any>('../context/MosChatContext');
  return {
    ...actual,
    useMosChat: () => ({
      activeConversation: {
        id: 'conv-space-1',
        name: 'Shop Operations',
        type: 'space',
        memberIds: [1, 2, 3],
        memberNicknames: { '2': 'Hương Xinh' },
      },
      staffDirectory: [
        { id: 1, username: 'mai.cv', displayName: 'Chuyên Viên Mai', role: 'cv', isOnline: true },
        { id: 2, username: 'huong.cc', displayName: 'Hương CC', role: 'cc', isOnline: false },
        { id: 3, username: 'danny.do', displayName: 'Danny Do', role: 'super_admin', isOnline: true },
        { id: 4, username: 'ha.telesale', displayName: 'Hà Booker', role: 'telesales', isOnline: true },
      ],
      currentUser: { id: 3, name: 'Danny Do', role: 'super_admin' },
      sendMessage: vi.fn(),
      addMemberToSpace: mockAddMemberToSpace,
      activeThreadMsg: null,
      threadReplies: [],
      sendThreadReply: vi.fn(),
      reactToMessage: vi.fn(),
      deleteThreadReply: vi.fn(),
      setMobileView: vi.fn(),
    }),
  };
});

describe('MosChatMobileMentionAutocomplete', () => {
  describe('getMentionQueryAtCursor', () => {
    it('returns query when @ is at the beginning of string', () => {
      const result = getMentionQueryAtCursor('@mai', 4);
      expect(result).toEqual({ query: 'mai', atIndex: 0, cursorIndex: 4 });
    });

    it('returns query when @ is preceded by whitespace', () => {
      const result = getMentionQueryAtCursor('Xin chào @dan', 13);
      expect(result).toEqual({ query: 'dan', atIndex: 9, cursorIndex: 13 });
    });

    it('returns empty query right after typing @', () => {
      const result = getMentionQueryAtCursor('Alo @', 5);
      expect(result).toEqual({ query: '', atIndex: 4, cursorIndex: 5 });
    });

    it('returns null when @ is part of an email address', () => {
      const result = getMentionQueryAtCursor('danny@wingslashes.com', 21);
      expect(result).toBeNull();
    });

    it('returns null if query contains newline', () => {
      const result = getMentionQueryAtCursor('@mai\nchào', 9);
      expect(result).toBeNull();
    });

    it('returns null if query is too long (> 25 characters)', () => {
      const result = getMentionQueryAtCursor('@motdoanvanbanquadaikhongphailatenten', 36);
      expect(result).toBeNull();
    });
  });

  describe('getRoleBadgeInfo', () => {
    it('returns respectful Wings job titles', () => {
      expect(getRoleBadgeInfo('cv').label).toBe('Chuyên Viên (CV)');
      expect(getRoleBadgeInfo('ktv').label).toBe('Chuyên Viên (CV)');
      expect(getRoleBadgeInfo('technician').label).toBe('Chuyên Viên (CV)');
      expect(getRoleBadgeInfo('cc').label).toBe('Tư Vấn (CC)');
      expect(getRoleBadgeInfo('telesales').label).toBe('Telesales');
      expect(getRoleBadgeInfo('super_admin').label).toBe('Super Admin');
    });
  });

  describe('UI Autocomplete Dropdown Component', () => {
    it('renders candidate dropdown when typing @ and allows selecting user', () => {
      const onSelect = vi.fn();
      const textarea = document.createElement('textarea');
      textarea.value = 'Xin chào @';
      textarea.selectionEnd = 10;
      const ref = { current: textarea };

      render(<MosChatMobileMentionAutocomplete text="Xin chào @" onSelectMention={onSelect} textareaRef={ref} />);

      // Should render header and candidates
      expect(screen.getByRole('listbox', { name: 'Danh sách gợi ý nhắc tên' })).toBeTruthy();
      expect(screen.getByText('All (Tất cả mọi người)')).toBeTruthy();
      expect(screen.getByText('MAI (mOS AI Copilot)')).toBeTruthy();
      expect(screen.getByText('Chuyên Viên Mai')).toBeTruthy();

      // Tap on Chuyên Viên Mai
      fireEvent.click(screen.getByText('Chuyên Viên Mai'));

      // Should insert @Chuyên Viên Mai into text
      expect(onSelect).toHaveBeenCalledWith('Xin chào @Chuyên Viên Mai ');
    });

    it('filters candidates with Vietnamese tone-insensitive search', () => {
      const onSelect = vi.fn();
      const textarea = document.createElement('textarea');
      textarea.value = '@huon';
      textarea.selectionEnd = 5;
      const ref = { current: textarea };

      render(<MosChatMobileMentionAutocomplete text="@huon" onSelectMention={onSelect} textareaRef={ref} />);

      // Should match Hương Xinh (nickname for Hương CC)
      expect(screen.getAllByText(/Hương Xinh/).length).toBeGreaterThan(0);
      // Should not match Chuyên Viên Mai
      expect(screen.queryByText('Chuyên Viên Mai')).toBeNull();
    });

    it('allows closing dropdown by tapping the close (X) button', () => {
      const onSelect = vi.fn();
      const onClose = vi.fn();
      const textarea = document.createElement('textarea');
      textarea.value = '@dan';
      textarea.selectionEnd = 4;
      const ref = { current: textarea };

      render(
        <MosChatMobileMentionAutocomplete text="@dan" onSelectMention={onSelect} textareaRef={ref} onClose={onClose} />
      );

      expect(screen.getByText('Danny Do')).toBeTruthy();

      const closeBtn = screen.getByLabelText('Đóng gợi ý nhắc tên');
      fireEvent.click(closeBtn);

      expect(onClose).toHaveBeenCalled();
      expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('partitions outside-group members and requires invitation before tagging', async () => {
      mockAddMemberToSpace.mockReset();
      mockAddMemberToSpace.mockResolvedValue({ id: 'conv-space-1' });

      const onSelect = vi.fn();
      const textarea = document.createElement('textarea');
      textarea.value = '@ha';
      textarea.selectionEnd = 3;
      const ref = { current: textarea };

      render(<MosChatMobileMentionAutocomplete text="@ha" onSelectMention={onSelect} textareaRef={ref} />);

      // Should show outside-group section
      expect(screen.getByText(/Ngoài nhóm · Phải mời trước/)).toBeTruthy();
      expect(screen.getByText('Hà Booker')).toBeTruthy();
      expect(screen.getByText('Mời & Tag')).toBeTruthy();

      // Tap on outside-group member Hà Booker
      fireEvent.click(screen.getByText('Hà Booker'));

      // Should NOT insert tag immediately
      expect(onSelect).not.toHaveBeenCalled();

      // Should display confirmation dialog
      expect(screen.getByRole('dialog', { name: 'Xác nhận mời vào nhóm' })).toBeTruthy();
      expect(screen.getByText('Mời vào nhóm trước')).toBeTruthy();
      expect(screen.getByText(/Bạn cần mời vào nhóm trước để có thể nhắc tên/)).toBeTruthy();

      // Test cancel: click Hủy
      fireEvent.click(screen.getByText('Hủy'));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(onSelect).not.toHaveBeenCalled();
      expect(mockAddMemberToSpace).not.toHaveBeenCalled();

      // Re-click Hà Booker to open dialog again
      fireEvent.click(screen.getByText('Hà Booker'));
      expect(screen.getByRole('dialog')).toBeTruthy();

      // Confirm invitation: click Mời & Nhắc tên
      fireEvent.click(screen.getByText('Mời & Nhắc tên'));

      await waitFor(() => {
        expect(mockAddMemberToSpace).toHaveBeenCalledWith(4);
        expect(onSelect).toHaveBeenCalledWith('@Hà Booker ');
      });
    });
  });
});
