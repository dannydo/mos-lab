import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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
            memberIds: [10, 20, 99],
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
                thread: [
                  {
                    id: 'r1',
                    senderId: '20',
                    senderName: 'Hương CC',
                    senderRole: 'CC',
                    text: 'Dạ để em điều phối thêm khách ca chiều!',
                    timeLabel: '10:02',
                    createdAt: new Date().toISOString(),
                    reactions: { '👍': 1 },
                  },
                ],
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
        staffDirectory: [{ id: 10, username: 'mai_cv', role: 'CV', displayName: 'Chuyên Viên Mai' }],
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
      sendThreadReply: vi.fn().mockResolvedValue({
        success: true,
        reply: {
          id: 'r2',
          senderId: 'me',
          senderName: 'Tôi',
          senderRole: 'admin',
          text: 'Phản hồi trong subthread',
          timeLabel: '10:06',
          createdAt: new Date().toISOString(),
        },
      }),
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

  it('searches colleagues in staff directory directly from main search bar and allows starting DM', async () => {
    render(
      <MosChatProvider currentUser={{ id: 99, name: 'Danny Do', role: 'super_admin' }}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Shop Operations')).toBeTruthy();
    });

    // Type "Mai" into search bar
    const searchInput = screen.getByPlaceholderText('Tìm kiếm đồng nghiệp, kênh, tin nhắn...');
    fireEvent.change(searchInput, { target: { value: 'Mai' } });

    // Should display matching colleague section
    await waitFor(() => {
      expect(screen.getByText(/Đồng nghiệp \(1\)/i)).toBeTruthy();
      expect(screen.getByText('Chuyên Viên Mai')).toBeTruthy();
    });

    // Clicking on colleague starts DM
    fireEvent.click(screen.getByText('Chuyên Viên Mai'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nhắn tin/i)).toBeTruthy();
    });
  });

  it('opens colleague directory modal when tapping new DM button', async () => {
    render(
      <MosChatProvider currentUser={{ id: 99, name: 'Danny Do', role: 'super_admin' }}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Shop Operations')).toBeTruthy();
    });

    // Tap new DM button
    const newDmBtn = screen.getByLabelText('Soạn tin nhắn DM mới');
    fireEvent.click(newDmBtn);

    // Modal opens
    await waitFor(() => {
      expect(screen.getByText('Tin nhắn trực tiếp mới')).toBeTruthy();
      expect(screen.getByText('Chuyên Viên Mai')).toBeTruthy();
    });
  });

  it('supports double-tap to heart on replies inside subthread', async () => {
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
      expect(screen.getByText('Chào cả nhà, hôm nay lịch dặm mi kín chỗ rồi nha!')).toBeTruthy();
    });

    // Click on thread button (1 câu trả lời trong luồng)
    const threadBtn = screen.getByText(/câu trả lời trong luồng/i);
    fireEvent.click(threadBtn);

    // Verify inside thread sheet
    await waitFor(() => {
      expect(screen.getByText('Dạ để em điều phối thêm khách ca chiều!')).toBeTruthy();
      expect(screen.getByPlaceholderText('Trả lời trong luồng...')).toBeTruthy();
    });

    // Double-tap on reply
    const replyText = screen.getByText('Dạ để em điều phối thêm khách ca chiều!');
    const replyContainer = replyText.closest('.relative') as HTMLElement;
    expect(replyContainer).toBeTruthy();

    // First tap
    fireEvent.touchEnd(replyContainer);
    // Second tap within 280ms
    fireEvent.touchEnd(replyContainer);

    // Should call reactToMessage with ❤️ and reply id 'r1'
    const { apiClient } = await import('../../../lib/api-client');
    expect(apiClient.chat.reactToMessage).toHaveBeenCalledWith('m1', 'space-cc', '❤️', 'r1');
  });

  it('supports double-tap to heart on parent message inside subthread', async () => {
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
      expect(screen.getByText(/câu trả lời trong luồng/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByText(/câu trả lời trong luồng/i));

    await waitFor(() => {
      expect(screen.getByText('Dạ để em điều phối thêm khách ca chiều!')).toBeTruthy();
    });

    // Parent message card in thread sheet
    const parentMsg = screen.getAllByText('Chào cả nhà, hôm nay lịch dặm mi kín chỗ rồi nha!')[0];
    const parentCard = parentMsg.closest('.bg-slate-900') as HTMLElement;
    expect(parentCard).toBeTruthy();

    // First tap
    fireEvent.touchEnd(parentCard);
    // Second tap within 280ms
    fireEvent.touchEnd(parentCard);

    // Should call reactToMessage with ❤️ on parent message 'm1'
    const { apiClient } = await import('../../../lib/api-client');
    expect(apiClient.chat.reactToMessage).toHaveBeenCalledWith('m1', 'space-cc', '❤️', undefined);
  });

  it('supports swiping horizontally to reply to message in main chat', async () => {
    render(
      <MosChatProvider currentUser={{ id: 99, name: 'Danny Do', role: 'super_admin' }}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Shop Operations')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Shop Operations'));

    await waitFor(() => {
      expect(screen.getByText('Chào cả nhà, hôm nay lịch dặm mi kín chỗ rồi nha!')).toBeTruthy();
    });

    const msgEl = screen.getByText('Chào cả nhà, hôm nay lịch dặm mi kín chỗ rồi nha!');
    const msgContainer = msgEl.closest('.relative') as HTMLElement;
    expect(msgContainer).toBeTruthy();

    // Swipe right gesture (startX: 50, moveX: 110, deltaX = 60 >= 35)
    fireEvent.touchStart(msgContainer, { touches: [{ clientX: 50, clientY: 100 }] });
    fireEvent.touchMove(msgContainer, { touches: [{ clientX: 110, clientY: 105 }] });
    fireEvent.touchEnd(msgContainer);

    // Replying preview banner should appear in composer
    await waitFor(() => {
      expect(screen.getByText(/Trả lời Chuyên Viên Mai:/)).toBeTruthy();
    });
  });

  it('supports swiping to quote on reply inside subthread', async () => {
    render(
      <MosChatProvider currentUser={{ id: 99, name: 'Danny Do', role: 'super_admin' }}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Shop Operations')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Shop Operations'));

    await waitFor(() => {
      expect(screen.getByText(/câu trả lời trong luồng/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByText(/câu trả lời trong luồng/i));

    await waitFor(() => {
      expect(screen.getByText('Dạ để em điều phối thêm khách ca chiều!')).toBeTruthy();
    });

    const replyEl = screen.getByText('Dạ để em điều phối thêm khách ca chiều!');
    const replyContainer = replyEl.closest('.relative') as HTMLElement;
    expect(replyContainer).toBeTruthy();

    // Swipe left gesture (startX: 200, moveX: 140, deltaX = -60, absX = 60 >= 35)
    fireEvent.touchStart(replyContainer, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchMove(replyContainer, { touches: [{ clientX: 140, clientY: 104 }] });
    fireEvent.touchEnd(replyContainer);

    // Quoting banner in subthread should appear
    await waitFor(() => {
      expect(screen.getByText(/Trả lời Hương CC:/)).toBeTruthy();
    });
  });

  it('supports swiping to quote on parent message inside subthread', async () => {
    render(
      <MosChatProvider currentUser={{ id: 99, name: 'Danny Do', role: 'super_admin' }}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Shop Operations')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Shop Operations'));

    await waitFor(() => {
      expect(screen.getByText(/câu trả lời trong luồng/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByText(/câu trả lời trong luồng/i));

    await waitFor(() => {
      expect(screen.getByText('Chào cả nhà, hôm nay lịch dặm mi kín chỗ rồi nha!')).toBeTruthy();
    });

    const parentEl = screen.getByText('Chào cả nhà, hôm nay lịch dặm mi kín chỗ rồi nha!');
    const parentContainer = parentEl.closest('.relative') as HTMLElement;
    expect(parentContainer).toBeTruthy();

    // Swipe right on parent card (startX: 50, moveX: 110, deltaX = 60 >= 35)
    fireEvent.touchStart(parentContainer, { touches: [{ clientX: 50, clientY: 100 }] });
    fireEvent.touchMove(parentContainer, { touches: [{ clientX: 110, clientY: 104 }] });
    fireEvent.touchEnd(parentContainer);

    // Quoting banner in subthread should appear
    await waitFor(() => {
      expect(screen.getByText(/Trả lời Chuyên Viên Mai:/)).toBeTruthy();
    });
  });

  it('shows mention autocomplete on iPhone when typing @ in composer and allows selecting staff', async () => {
    render(
      <MosChatProvider currentUser={{ id: 99, name: 'Danny Do', role: 'super_admin' }}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Shop Operations')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Shop Operations'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nhắn tin trong #Shop Operations/i)).toBeTruthy();
    });

    const textarea = screen.getByPlaceholderText(/Nhắn tin trong #Shop Operations/i);

    // Type @ in composer
    fireEvent.change(textarea, { target: { value: '@' } });

    // Autocomplete dropdown should be visible
    await waitFor(() => {
      expect(screen.getByRole('listbox', { name: 'Danh sách gợi ý nhắc tên' })).toBeTruthy();
    });

    const listbox = screen.getByRole('listbox', { name: 'Danh sách gợi ý nhắc tên' });
    expect(listbox).toBeTruthy();

    const candidate = within(listbox).getByText('Chuyên Viên Mai');
    expect(candidate).toBeTruthy();

    // Tap on Chuyên Viên Mai to autocomplete
    fireEvent.click(candidate);

    // Textarea value should be updated
    expect((textarea as HTMLTextAreaElement).value).toBe('@Chuyên Viên Mai ');
  });
});
