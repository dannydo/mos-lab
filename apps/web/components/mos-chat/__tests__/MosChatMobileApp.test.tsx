import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MosChatProvider } from '../context/MosChatContext';
import { MosChatMobileApp } from '../mobile/MosChatMobileApp';

// Mock apiClient.chat
vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    chat: {
      bootstrap: vi.fn().mockResolvedValue({
        conversations: [
          {
            id: 'space-cc',
            type: 'space',
            name: 'Shop Operations',
            subtitle: 'Kênh vận hành salon',
            color: '#d4a72c',
            memberCount: 15,
            unreadCount: 2,
            updatedAt: new Date().toISOString(),
            messages: [
              {
                id: 'm1',
                conversationId: 'space-cc',
                senderId: '10',
                senderName: 'Chuyên Viên Mai',
                senderRole: 'CV',
                text: 'Chào cả nhà, hôm nay lịch dặm mi kín chỗ rồi nha!',
                timeLabel: '10:00',
                createdAt: new Date().toISOString(),
                reactions: { '❤️': 3 },
              },
            ],
          },
        ],
        tasks: [
          {
            id: 't1',
            conversationId: 'space-cc',
            conversationName: 'Shop Operations',
            title: 'Kiểm kê khay mi lụa 0.07 CC',
            assigneeName: 'Chuyên Viên Mai',
            creatorName: 'Danny',
            priority: 'HIGH',
            dueAt: new Date(Date.now() + 3600000).toISOString(),
            remindAt: new Date().toISOString(),
            done: false,
            createdAt: new Date().toISOString(),
          },
        ],
        staffDirectory: [{ id: 10, username: 'mai_cv', role: 'CV', fullName: 'Chuyên Viên Mai' }],
        userPrefs: { pinnedIds: [] },
      }),
      markAsRead: vi.fn().mockResolvedValue({ success: true }),
      sendMessage: vi.fn().mockResolvedValue({
        success: true,
        message: {
          id: 'm2',
          conversationId: 'space-cc',
          senderId: 'me',
          senderName: 'Tôi',
          senderRole: 'admin',
          text: 'Tin nhắn gửi thử từ iPhone 12',
          timeLabel: '10:05',
          createdAt: new Date().toISOString(),
        },
      }),
      updateTask: vi.fn().mockResolvedValue({ success: true }),
      reactToMessage: vi.fn().mockResolvedValue({ success: true }),
      togglePinMessage: vi.fn().mockResolvedValue({ success: true }),
      deleteMessage: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

describe('MosChatMobileApp iPhone 12 Experience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders iPhone 12 inbox with conversation list, search bar, and filter chips', async () => {
    render(
      <MosChatProvider currentUser={{ id: 99, name: 'Danny Do', role: 'super_admin' }}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    // Verify app header
    expect(screen.getByText('mOS Chat')).toBeTruthy();
    expect(screen.getByText('Wings Enterprise Hub')).toBeTruthy();

    // Verify filter chips
    expect(screen.getByText('Tất cả')).toBeTruthy();
    expect(screen.getByText('Chưa đọc')).toBeTruthy();
    expect(screen.getByText('Kho Công việc')).toBeTruthy();

    // Verify conversation item rendered
    await waitFor(() => {
      expect(screen.getByText('Shop Operations')).toBeTruthy();
    });
  });

  it('navigates into chat room when tapping conversation and renders iMessage composer', async () => {
    render(
      <MosChatProvider currentUser={{ id: 99, name: 'Danny Do', role: 'super_admin' }}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Shop Operations')).toBeTruthy();
    });

    // Tap conversation
    fireEvent.click(screen.getByText('Shop Operations'));

    // Should now be in room view
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nhắn tin trong #Shop Operations/i)).toBeTruthy();
      expect(screen.getByText('Chào cả nhà, hôm nay lịch dặm mi kín chỗ rồi nha!')).toBeTruthy();
    });

    // Check [+] action sheet button exists
    expect(screen.getByLabelText('Tác vụ đính kèm')).toBeTruthy();

    // Type text into composer
    const textarea = screen.getByPlaceholderText(/Nhắn tin trong #Shop Operations/i);
    fireEvent.change(textarea, { target: { value: 'Tin nhắn gửi thử từ iPhone 12' } });

    // Send button appears when text is entered
    const sendButton = screen.getByLabelText('Gửi tin nhắn');
    expect(sendButton).toBeTruthy();
    fireEvent.click(sendButton);

    // Should return to inbox when tapping back
    const backButton = screen.getByLabelText('Quay lại danh sách hội thoại');
    fireEvent.click(backButton);

    await waitFor(() => {
      expect(screen.getByText('Wings Enterprise Hub')).toBeTruthy();
    });
  });

  it('allows toggling between Chat and Tasks view with full checklist functionality', async () => {
    render(
      <MosChatProvider currentUser={{ id: 99, name: 'Danny Do', role: 'super_admin' }}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    // Click on Kho Công việc in inbox
    const tasksPill = screen.getByLabelText('Kho Công việc & Nhắc hẹn (Tasks)');
    fireEvent.click(tasksPill);

    // Verifies Tasks tab is active
    await waitFor(() => {
      expect(screen.getByText('Kho Công Việc & Nhắc Hẹn')).toBeTruthy();
      expect(screen.getByText('Kiểm kê khay mi lụa 0.07 CC')).toBeTruthy();
    });

    // Back button returns to inbox
    const backButton = screen.getByLabelText('Quay lại danh sách hội thoại');
    fireEvent.click(backButton);

    await waitFor(() => {
      expect(screen.getByText('mOS Chat')).toBeTruthy();
    });
  });

  it('opens emoji and sticker sheet when tapping emoji button in composer and allows inserting emojis', async () => {
    render(
      <MosChatProvider currentUser={{ id: 99, name: 'Danny Do', role: 'super_admin' }}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Shop Operations')).toBeTruthy();
    });

    // Enter room
    fireEvent.click(screen.getByText('Shop Operations'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nhắn tin trong #Shop Operations/i)).toBeTruthy();
    });

    // Tap Emoji button
    const emojiBtn = screen.getByLabelText('Biểu cảm Emoji & Nhãn dán');
    expect(emojiBtn).toBeTruthy();
    fireEvent.click(emojiBtn);

    // Verifies Sticker & Emoji sheet is open
    await waitFor(() => {
      expect(screen.getByText('Biểu cảm & Nhãn dán')).toBeTruthy();
      expect(screen.getByText('Cảm xúc phổ biến')).toBeTruthy();
    });

    // Tap an emoji (e.g. ❤️)
    const heartEmoji = screen.getByRole('button', { name: '❤️' });
    fireEvent.click(heartEmoji);

    // Close sheet
    const closeSheetBtn = screen.getByLabelText('Đóng bảng biểu cảm');
    fireEvent.click(closeSheetBtn);

    // Textarea should contain the inserted emoji and send button is active
    const textarea = screen.getByPlaceholderText(/Nhắn tin trong #Shop Operations/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain('❤️');
    expect(screen.getByLabelText('Gửi tin nhắn')).toBeTruthy();
  });
});
