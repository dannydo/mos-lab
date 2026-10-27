import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MosChatProvider } from '../context/MosChatContext';
import { MosChatMobileApp } from '../mobile/MosChatMobileApp';
import { apiClient } from '../../../lib/api-client';

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
                attachments: [{ id: 'att-1', url: '/uploads/sample-1.jpg', name: 'Mẫu mi 1' }],
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
                    attachments: [{ id: 'att-2', url: '/uploads/sample-2.jpg', name: 'Mẫu mi 2' }],
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
      createTask: vi.fn().mockImplementation(async (payload: any) => ({
        success: true,
        task: {
          id: 'task-new-1',
          conversationId: payload.conversationId,
          title: payload.title,
          assigneeId: payload.assigneeId,
          assigneeName: payload.assigneeName,
          done: false,
          createdAt: new Date().toISOString(),
        },
      })),
      updateTask: vi.fn().mockResolvedValue({ success: true }),
      deleteTask: vi.fn().mockResolvedValue({ success: true }),
      createMission: vi.fn().mockResolvedValue({
        success: true,
        mission: {
          reportId: 555,
          key: 'MOS-555',
          missionKey: 'MOS-555',
          missionCode: 'MOS-555',
          requestType: 'FEATURE',
          title: 'Kiểm kê khay mi lụa 0.07 CC',
          status: 'READY_TO_START',
          clarificationStatus: 'RESOLVED',
          stage: 'GATE_1_IMPLEMENTATION',
          stepIndex: 1,
          humanBadge: 'Cổng 1',
          stageLabel: 'Cổng 1',
          humanSummary: 'Mission tạo từ task chat',
          humanStatusSummary: 'Sẵn sàng khởi động',
        },
      }),
      missionAction: vi.fn().mockResolvedValue({
        success: true,
        mission: {
          reportId: 138,
          key: 'MOS-FEAT-138',
          missionKey: 'MOS-FEAT-138',
          stage: 'GATE_2_COMMIT_REVIEW',
          status: 'AWAITING_DANNY_COMMIT_REVIEW',
          canSuperAdminApproveCommit: true,
          humanStatusSummary: 'Đã sẵn sàng duyệt commit',
        },
      }),
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
      editMessage: vi.fn().mockResolvedValue({ success: true }),
      uploadImage: vi.fn().mockImplementation(async ({ fileName }: { fileName: string }) => ({
        success: true,
        attachment: {
          id: `att-${fileName.replace(/[^a-zA-Z0-9]/g, '')}`,
          url: `/uploads/${fileName}`,
          name: fileName,
          mimeType: 'image/jpeg',
          sizeBytes: 2048,
        },
      })),
    },
    ai: {
      sendMessage: vi.fn().mockResolvedValue({
        sessionId: 'sess-1',
        session: { id: 'sess-1' },
        message: {
          id: 'msg-ai-res-1',
          role: 'model',
          content: 'Chào anh Danny, em là MAI! Em có thể giúp gì cho anh hôm nay?',
          thinking: 'Đang tra cứu lịch dặm mi của tiệm...',
          suggestedActions: [
            {
              type: 'APPLY_FILTER',
              label: 'Lọc khách cần chăm sóc',
              payload: { filter: 'vip' },
            },
          ],
        },
      }),
      listSessions: vi.fn().mockResolvedValue({ sessions: [] }),
      createSession: vi.fn().mockResolvedValue({ session: { id: 'sess-1' } }),
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

  it('allows editing a message on iPhone via action sheet and edit modal (MOS-FEAT-144)', async () => {
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

    // Trigger action sheet via context menu
    fireEvent.contextMenu(msgContainer);

    // Reaction and action sheet should open with "Chỉnh sửa tin nhắn"
    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa tin nhắn')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Chỉnh sửa tin nhắn'));

    // Edit modal should be open
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Chỉnh sửa tin nhắn' })).toBeTruthy();
    });

    const editTextarea = screen.getByPlaceholderText('Nhập nội dung chỉnh sửa...');
    expect((editTextarea as HTMLTextAreaElement).value).toBe('Chào cả nhà, hôm nay lịch dặm mi kín chỗ rồi nha!');

    // Change text and click Lưu
    fireEvent.change(editTextarea, {
      target: { value: 'Chào cả nhà, hôm nay lịch dặm mi kín chỗ rồi nha! [CẬP NHẬT]' },
    });

    const saveBtn = screen.getByRole('button', { name: /Lưu/i });
    fireEvent.click(saveBtn);

    // Should call editMessage and display updated text
    await waitFor(() => {
      expect(apiClient.chat.editMessage).toHaveBeenCalledWith(
        'm1',
        expect.objectContaining({
          conversationId: 'space-cc',
          text: 'Chào cả nhà, hôm nay lịch dặm mi kín chỗ rồi nha! [CẬP NHẬT]',
        })
      );
    });
  });

  it('allows deleting a message on iPhone via action sheet and renders soft-deleted indicator (MOS-BUG-149)', async () => {
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

    // Trigger action sheet via context menu
    fireEvent.contextMenu(msgContainer);

    // Reaction and action sheet should open with "Xóa tin nhắn"
    await waitFor(() => {
      expect(screen.getByText('Xóa tin nhắn')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Xóa tin nhắn'));

    // Should call deleteMessage and display soft deleted message banner
    await waitFor(() => {
      expect(apiClient.chat.deleteMessage).toHaveBeenCalledWith('m1', { conversationId: 'space-cc' });
      expect(screen.getByText(/Tin nhắn này đã bị xoá/i)).toBeTruthy();
    });
  });

  it('opens Messenger-style image gallery when tapping an image in a thread and allows sliding between images (MOS-FEAT-145)', async () => {
    render(
      <MosChatProvider currentUser={{ id: 99, name: 'Danny Do', role: 'super_admin' }}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Shop Operations')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Shop Operations'));

    // Open subthread
    await waitFor(() => {
      expect(screen.getByText(/câu trả lời trong luồng/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByText(/câu trả lời trong luồng/i));

    // Images from parent and replies should be visible in thread
    await waitFor(() => {
      expect(screen.getByAltText('Mẫu mi 1')).toBeTruthy();
      expect(screen.getByAltText('Mẫu mi 2')).toBeTruthy();
    });

    // Tap on image 'Mẫu mi 1'
    fireEvent.click(screen.getByAltText('Mẫu mi 1'));

    // Messenger-style gallery dialog should open
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Xem hình ảnh đính kèm' })).toBeTruthy();
    });

    const galleryModal = screen.getByRole('dialog', { name: 'Xem hình ảnh đính kèm' });

    // Shows 1 / 2 counter and author of image 1
    expect(within(galleryModal).getByText('1 / 2')).toBeTruthy();
    expect(within(galleryModal).getByText('Chuyên Viên Mai')).toBeTruthy();

    // Tap next chevron to slide to image 2
    const nextBtn = within(galleryModal).getByRole('button', { name: 'Xem hình tiếp theo' });
    fireEvent.click(nextBtn);

    // Counter updates to 2 / 2 and author to Hương CC
    expect(within(galleryModal).getByText('2 / 2')).toBeTruthy();
    expect(within(galleryModal).getByText('Hương CC')).toBeTruthy();

    // Close gallery
    const closeBtn = within(galleryModal).getByRole('button', { name: 'Đóng xem hình' });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Xem hình ảnh đính kèm' })).toBeNull();
    });
  });

  it('supports selecting multiple images on iPhone, previewing thumbnails with delete buttons, and batch sending in main room (MOS-FEAT-146)', async () => {
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

    // 1. Check file input has multiple and supports heic/heif
    const fileInput = screen.getByLabelText('Tải nhiều ảnh đính kèm') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    expect(fileInput.multiple).toBe(true);
    expect(fileInput.accept).toContain('.heic');

    // 2. Select 3 files (including iPhone HEIC)
    const file1 = new File(['content1'], 'photo1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['content2'], 'photo2.jpg', { type: 'image/jpeg' });
    const file3 = new File(['content3'], 'photo3.heic', { type: 'image/heic' });

    fireEvent.change(fileInput, {
      target: { files: [file1, file2, file3] },
    });

    // 3. Wait for all 3 images to be uploaded and shown in preview
    await waitFor(() => {
      expect(apiClient.chat.uploadImage).toHaveBeenCalledTimes(3);
    });

    await waitFor(() => {
      expect(screen.getByAltText('photo1.jpg')).toBeTruthy();
      expect(screen.getByAltText('photo2.jpg')).toBeTruthy();
      expect(screen.getByAltText('photo3.heic')).toBeTruthy();
    });

    // 4. Remove image 2
    const removeBtn2 = screen.getByLabelText('Xóa ảnh 2');
    fireEvent.click(removeBtn2);

    await waitFor(() => {
      expect(screen.queryByAltText('photo2.jpg')).toBeNull();
      expect(screen.getByAltText('photo1.jpg')).toBeTruthy();
      expect(screen.getByAltText('photo3.heic')).toBeTruthy();
    });

    // 5. Type a message caption
    const textarea = screen.getByPlaceholderText(/Nhắn tin trong #Shop Operations/i);
    fireEvent.change(textarea, { target: { value: 'Bộ mi Katun hoàn thành' } });

    // 6. Send the message with attachments
    const sendBtn = screen.getByRole('button', { name: 'Gửi tin nhắn' });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(apiClient.chat.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Bộ mi Katun hoàn thành',
          attachments: expect.arrayContaining([
            expect.objectContaining({ name: 'photo1.jpg' }),
            expect.objectContaining({ name: 'photo3.heic' }),
          ]),
        })
      );
    });

    // 7. Preview and text should be cleared
    await waitFor(() => {
      expect(screen.queryByAltText('photo1.jpg')).toBeNull();
      expect(screen.queryByAltText('photo3.heic')).toBeNull();
    });
  });

  it('supports selecting multiple images, previewing, and batch sending in subthread sheet (MOS-FEAT-146)', async () => {
    render(
      <MosChatProvider currentUser={{ id: 99, name: 'Danny Do', role: 'super_admin' }}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Shop Operations')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Shop Operations'));

    // Open subthread
    await waitFor(() => {
      expect(screen.getByText(/câu trả lời trong luồng/i)).toBeTruthy();
    });
    fireEvent.click(screen.getByText(/câu trả lời trong luồng/i));

    // Check thread file input
    await waitFor(() => {
      expect(screen.getByLabelText('Tải nhiều ảnh đính kèm trong luồng')).toBeTruthy();
    });
    const threadFileInput = screen.getByLabelText('Tải nhiều ảnh đính kèm trong luồng') as HTMLInputElement;
    expect(threadFileInput.multiple).toBe(true);

    // Select 2 files in thread
    const tFile1 = new File(['t1'], 'thread-a.jpg', { type: 'image/jpeg' });
    const tFile2 = new File(['t2'], 'thread-b.png', { type: 'image/png' });

    fireEvent.change(threadFileInput, {
      target: { files: [tFile1, tFile2] },
    });

    await waitFor(() => {
      expect(apiClient.chat.uploadImage).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByAltText('thread-a.jpg')).toBeTruthy();
      expect(screen.getByAltText('thread-b.png')).toBeTruthy();
    });

    // Send thread reply with multiple images
    const threadSendBtn = screen.getByRole('button', { name: 'Gửi phản hồi luồng' });
    fireEvent.click(threadSendBtn);

    await waitFor(() => {
      expect(apiClient.chat.sendThreadReply).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: expect.arrayContaining([
            expect.objectContaining({ name: 'thread-a.jpg' }),
            expect.objectContaining({ name: 'thread-b.png' }),
          ]),
        })
      );
    });

    // Preview should be cleared after send
    await waitFor(() => {
      expect(screen.queryByAltText('thread-a.jpg')).toBeNull();
      expect(screen.queryByAltText('thread-b.png')).toBeNull();
    });
  });

  it('allows creating a task/reminder for oneself on iPhone via action sheet (MOS-FEAT-149)', async () => {
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

    // Open action sheet (+)
    const plusBtn = screen.getByRole('button', { name: 'Tác vụ đính kèm' });
    fireEvent.click(plusBtn);

    // Tap "Giao việc & Hạn chót"
    await waitFor(() => {
      expect(screen.getByText('Giao việc & Hạn chót')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Giao việc & Hạn chót'));

    // Verify modal appears
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Nhập chi tiết công việc cần giao...')).toBeTruthy();
    });

    // Enter title
    const titleInput = screen.getByPlaceholderText('Nhập chi tiết công việc cần giao...');
    fireEvent.change(titleInput, { target: { value: 'Hello hello task test' } });

    // Submit task without picking someone (defaults to self Danny Do)
    const submitBtn = screen.getByRole('button', { name: 'Tạo công việc' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiClient.chat.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'space-cc',
          title: 'Hello hello task test',
          assigneeName: expect.stringMatching(/Danny Do/i),
        })
      );
    });
  });

  it('allows selecting deadline preset and custom date on iPhone task modal (MOS-BUG-157)', async () => {
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

    // Open action sheet (+)
    const plusBtn = screen.getByRole('button', { name: 'Tác vụ đính kèm' });
    fireEvent.click(plusBtn);

    // Tap "Giao việc & Hạn chót"
    await waitFor(() => {
      expect(screen.getByText('Giao việc & Hạn chót')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Giao việc & Hạn chót'));

    // Verify modal appears
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Nhập chi tiết công việc cần giao...')).toBeTruthy();
    });

    // Enter title
    const titleInput = screen.getByPlaceholderText('Nhập chi tiết công việc cần giao...');
    fireEvent.change(titleInput, { target: { value: 'Task with deadline preset' } });

    // Tap preset "17:30 hôm nay"
    const presetBtn = screen.getByText('17:30 hôm nay');
    expect(presetBtn).toBeInTheDocument();
    fireEvent.click(presetBtn);

    // Verify deadline display is updated with clear button
    await waitFor(() => {
      expect(screen.getByLabelText('Xóa hạn chót')).toBeInTheDocument();
    });

    // Submit task
    const submitBtn = screen.getByRole('button', { name: 'Tạo công việc' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiClient.chat.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'space-cc',
          title: 'Task with deadline preset',
          dueAt: expect.any(String),
        })
      );
    });
  });

  it('opens Task Detail Bottom Sheet when tapping on task card without toggling done (MOS-FEAT-150)', async () => {
    render(
      <MosChatProvider currentUser={{ id: 99, name: 'Danny Do', role: 'super_admin' }}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    // Click on Kho Công việc in inbox
    const tasksPill = screen.getByLabelText('Kho Công việc & Nhắc hẹn (Tasks)');
    fireEvent.click(tasksPill);

    await waitFor(() => {
      expect(screen.getByText('Kho Công Việc & Nhắc Hẹn')).toBeTruthy();
      expect(screen.getByText('Kiểm kê khay mi lụa 0.07 CC')).toBeTruthy();
    });

    // Tap on the task card body (not the checkbox)
    const taskCard = screen.getByRole('button', {
      name: /Mở chi tiết công việc: Kiểm kê khay mi lụa 0.07 CC/i,
    });
    fireEvent.click(taskCard);

    // Verify bottom sheet opened
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Chi tiết công việc mOS' })).toBeTruthy();
      expect(screen.getByText('Đang thực hiện')).toBeTruthy();
      expect(screen.getByText('Giao bởi')).toBeTruthy();
      expect(screen.getByText('Người nhận')).toBeTruthy();
      expect(screen.getByText('Hạn hoàn thành (Deadline)')).toBeTruthy();
    });

    // Verify task is NOT toggled done by tapping card
    expect(apiClient.chat.updateTask).not.toHaveBeenCalled();
  });

  it('allows toggling task done strictly via checkbox button without opening bottom sheet (MOS-FEAT-150)', async () => {
    render(
      <MosChatProvider currentUser={{ id: 99, name: 'Danny Do', role: 'super_admin' }}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    const tasksPill = screen.getByLabelText('Kho Công việc & Nhắc hẹn (Tasks)');
    fireEvent.click(tasksPill);

    await waitFor(() => {
      expect(screen.getByText('Kiểm kê khay mi lụa 0.07 CC')).toBeTruthy();
    });

    // Find checkbox button
    const checkboxBtn = screen.getByRole('button', { name: 'Đánh dấu hoàn thành' });
    fireEvent.click(checkboxBtn);

    // Verify updateTask was called to toggle done
    await waitFor(() => {
      expect(apiClient.chat.updateTask).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ done: true })
      );
    });

    // Verify bottom sheet is NOT open
    expect(screen.queryByRole('dialog', { name: 'Chi tiết công việc mOS' })).toBeNull();
  });

  it('supports real-time search, scope pills, and status pills on iPhone (MOS-FEAT-150)', async () => {
    render(
      <MosChatProvider currentUser={{ id: 99, name: 'Danny Do', role: 'super_admin' }}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    const tasksPill = screen.getByLabelText('Kho Công việc & Nhắc hẹn (Tasks)');
    fireEvent.click(tasksPill);

    await waitFor(() => {
      expect(screen.getByText('Kho Công Việc & Nhắc Hẹn')).toBeTruthy();
    });

    // Check search input exists
    const searchInput = screen.getByPlaceholderText('Tìm theo tên việc, mã #TASK, người nhận...');
    expect(searchInput).toBeTruthy();

    // Type query that matches nothing
    fireEvent.change(searchInput, { target: { value: 'XYZNONEXISTENT' } });
    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy công việc nào khớp từ khóa')).toBeTruthy();
    });

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });
    await waitFor(() => {
      expect(screen.getByText('Kiểm kê khay mi lụa 0.07 CC')).toBeTruthy();
    });

    // Check status pill 'Đã xong'
    const completedPill = screen.getByRole('button', { name: /Đã xong/i });
    fireEvent.click(completedPill);

    await waitFor(() => {
      expect(completedPill.className).toContain('bg-emerald-500/20');
    });
  });

  it('allows Super Admin Danny to dispatch task to mOS Mission via detail sheet (MOS-FEAT-150)', async () => {
    render(
      <MosChatProvider
        currentUser={{
          id: 1,
          name: 'Danny Do',
          role: 'super_admin',
          username: 'admin',
          email: 'danny.do@wingslashes.com',
        }}
      >
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    const tasksPill = screen.getByLabelText('Kho Công việc & Nhắc hẹn (Tasks)');
    fireEvent.click(tasksPill);

    await waitFor(() => {
      expect(screen.getByText('Kiểm kê khay mi lụa 0.07 CC')).toBeTruthy();
    });

    // Open detail sheet
    const taskCard = screen.getByRole('button', {
      name: /Mở chi tiết công việc: Kiểm kê khay mi lụa 0.07 CC/i,
    });
    fireEvent.click(taskCard);

    // Verify Super Admin button exists
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Chuyển vào mOS Mission \(Super Admin Danny\)/i })).toBeTruthy();
    });

    // Click dispatch mission button
    fireEvent.click(screen.getByRole('button', { name: /Chuyển vào mOS Mission \(Super Admin Danny\)/i }));

    // Verify Mission modal opened
    await waitFor(() => {
      expect(screen.getByText('Chuyển vào mOS Mission (Gate 1)')).toBeTruthy();
    });

    // Confirm dispatch
    const confirmBtn = screen.getByRole('button', { name: 'Chuyển Mission' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(apiClient.chat.createMission).toHaveBeenCalled();
    });
  });

  it('allows negotiating task deadline via detail sheet (MOS-FEAT-150)', async () => {
    render(
      <MosChatProvider currentUser={{ id: 99, name: 'Danny Do', role: 'super_admin' }}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    const tasksPill = screen.getByLabelText('Kho Công việc & Nhắc hẹn (Tasks)');
    fireEvent.click(tasksPill);

    await waitFor(() => {
      expect(screen.getByText('Kiểm kê khay mi lụa 0.07 CC')).toBeTruthy();
    });

    // Open detail sheet
    const taskCard = screen.getByRole('button', {
      name: /Mở chi tiết công việc: Kiểm kê khay mi lụa 0.07 CC/i,
    });
    fireEvent.click(taskCard);

    // Click "Xin dời hạn"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Xin dời hạn/i })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: /Xin dời hạn/i }));

    // Verify negotiate modal opened
    await waitFor(() => {
      expect(screen.getByText('Thương lượng dời hạn chót')).toBeTruthy();
    });

    // Fill reason
    const reasonInput = screen.getByPlaceholderText(/VD: Em đang ưu tiên hỗ trợ khách/i);
    fireEvent.change(reasonInput, { target: { value: 'Xin dời 2 tiếng vì bận việc gấp' } });

    // Submit negotiation
    const submitBtn = screen.getByRole('button', { name: 'Gửi đề xuất dời hạn' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiClient.chat.updateTask).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          negotiationNote: 'Xin dời 2 tiếng vì bận việc gấp',
        })
      );
    });
  });

  it('allows editing task details via detail sheet (MOS-FEAT-150)', async () => {
    render(
      <MosChatProvider currentUser={{ id: 99, name: 'Danny Do', role: 'super_admin' }}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    const tasksPill = screen.getByLabelText('Kho Công việc & Nhắc hẹn (Tasks)');
    fireEvent.click(tasksPill);

    await waitFor(() => {
      expect(screen.getByText('Kiểm kê khay mi lụa 0.07 CC')).toBeTruthy();
    });

    // Open detail sheet
    const taskCard = screen.getByRole('button', {
      name: /Mở chi tiết công việc: Kiểm kê khay mi lụa 0.07 CC/i,
    });
    fireEvent.click(taskCard);

    // Click "Chỉnh sửa"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Chỉnh sửa/i })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: /Chỉnh sửa/i }));

    // Verify edit modal opened
    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa công việc')).toBeTruthy();
    });

    // Edit title
    const titleInput = screen.getByPlaceholderText('Nhập chi tiết công việc...');
    fireEvent.change(titleInput, { target: { value: 'Kiểm kê khay mi lụa 0.07 CC (Đã cập nhật)' } });

    // Save
    const saveBtn = screen.getByRole('button', { name: 'Lưu thay đổi' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiClient.chat.updateTask).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          title: 'Kiểm kê khay mi lụa 0.07 CC (Đã cập nhật)',
        })
      );
    });
  });

  it('shows Gate 2 Duyệt Commit button in task detail sheet and triggers action (MOS-FEAT-150)', async () => {
    // Override bootstrap to return a task with mission in Gate 2
    (apiClient.chat.bootstrap as any).mockResolvedValueOnce({
      unreadCount: 0,
      conversations: [
        {
          id: 'space-cc',
          name: 'Shop Operations',
          type: 'SPACE',
          unreadCount: 0,
          lastMessageText: 'Tin nhắn mới',
          lastMessageTime: '10:00',
          members: [{ id: 1, name: 'Danny Do', role: 'admin' }],
        },
      ],
      messagesByConv: {
        'space-cc': [],
      },
      tasks: [
        {
          id: 't-mission-138',
          conversationId: 'space-cc',
          conversationName: 'Shop Operations',
          title: 'Triển khai Gate Control trên iPhone',
          assigneeName: 'Chuyên Viên Mai',
          creatorName: 'Danny Do',
          priority: 'HIGH',
          dueAt: new Date(Date.now() + 3600000).toISOString(),
          done: false,
          createdAt: new Date().toISOString(),
          missionId: 138,
          missionKey: 'MOS-FEAT-138',
          mission: {
            reportId: 138,
            key: 'MOS-FEAT-138',
            missionKey: 'MOS-FEAT-138',
            missionCode: 'MOS-FEAT-138',
            requestType: 'FEATURE',
            title: 'Triển khai Gate Control trên iPhone',
            status: 'AWAITING_DANNY_COMMIT_REVIEW',
            stage: 'GATE_2_COMMIT_REVIEW',
            stepIndex: 2,
            humanBadge: 'Chờ duyệt commit',
            stageLabel: 'Cổng 2',
            humanStatusSummary: 'Đã code xong, đang chờ Danny duyệt commit Cổng 2',
            canSuperAdminApproveCommit: true,
            superAdminActions: {
              canApproveCommit: true,
              executionPhase: 'AWAITING_COMMIT_REVIEW',
            },
          },
        },
      ],
      staffDirectory: [],
      userPrefs: { pinnedIds: [] },
    });

    render(
      <MosChatProvider
        currentUser={{
          id: 1,
          name: 'Danny Do',
          role: 'super_admin',
          username: 'admin',
          email: 'danny.do@wingslashes.com',
        }}
      >
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    const tasksPill = screen.getByLabelText('Kho Công việc & Nhắc hẹn (Tasks)');
    fireEvent.click(tasksPill);

    await waitFor(() => {
      expect(screen.getByText('Triển khai Gate Control trên iPhone')).toBeTruthy();
      expect(screen.getByText('#MOS-FEAT-138')).toBeTruthy();
      expect(screen.getByText('Duyệt Commit')).toBeTruthy();
    });

    // Open detail sheet
    const taskCard = screen.getByRole('button', {
      name: /Mở chi tiết công việc: Triển khai Gate Control trên iPhone/i,
    });
    fireEvent.click(taskCard);

    // Verify detail sheet shows Gate 2 action button
    await waitFor(() => {
      expect(screen.getByText(/✅ Duyệt Commit \(Cổng 2\)/i)).toBeTruthy();
      expect(screen.getByText(/Đã code xong, đang chờ Danny duyệt commit Cổng 2/i)).toBeTruthy();
    });

    // Click Duyệt Commit
    const approveCommitBtn = screen.getByRole('button', { name: /✅ Duyệt Commit \(Cổng 2\)/i });
    fireEvent.click(approveCommitBtn);

    await waitFor(() => {
      expect(apiClient.chat.missionAction).toHaveBeenCalledWith(
        138,
        expect.objectContaining({
          action: 'APPROVE_COMMIT',
        })
      );
    });
  });

  it('allows creating Main Task directly inside subthread on iPhone via Header and sending confirmation reply', async () => {
    (apiClient.chat.createTask as any).mockResolvedValue({
      success: true,
      task: {
        id: 'task-new-1',
        conversationId: 'space-cc',
        conversationName: 'Shop Operations',
        sourceMessageId: 'm1',
        title: 'Chuẩn bị phòng dặm mi ca chiều',
        assigneeName: 'Danny Do',
        assigneeId: 99,
        creatorName: 'Danny Do',
        priority: 'NORMAL',
        done: false,
        createdAt: new Date().toISOString(),
      },
    });

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

    // Wait for subthread view
    await waitFor(() => {
      expect(screen.getByText('+ Việc')).toBeTruthy();
    });

    // Click + Việc button on header
    fireEvent.click(screen.getByText('+ Việc'));

    // Verify task creation modal opens
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(screen.getByText('Giao việc cho Main Task')).toBeTruthy();
    });

    // Type task title
    const textarea = screen.getByPlaceholderText(/Nhập chi tiết công việc cần giao.../i);
    fireEvent.change(textarea, { target: { value: 'Chuẩn bị phòng dặm mi ca chiều' } });

    // Confirm creation
    const okBtn = screen.getByRole('button', { name: /Tạo công việc/i });
    fireEvent.click(okBtn);

    await waitFor(() => {
      expect(apiClient.chat.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'space-cc',
          title: 'Chuẩn bị phòng dặm mi ca chiều',
          sourceMessageId: 'm1',
        })
      );
      expect(apiClient.chat.sendThreadReply).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'space-cc',
          messageId: 'm1',
          text: expect.stringContaining('📌 Đã giao việc cho Main Task: "Chuẩn bị phòng dặm mi ca chiều"'),
        })
      );
    });
  });

  it('displays pinned message banner in mobile chat room and toggles pinned tab (MOS-BUG-151)', async () => {
    vi.mocked(apiClient.chat.bootstrap).mockResolvedValueOnce({
      conversations: [
        {
          id: 'space-pinned',
          type: 'space',
          name: 'Kênh Thông Báo',
          subtitle: 'Kênh nội bộ',
          color: '#d4a72c',
          memberCount: 10,
          memberIds: [10, 99],
          unreadCount: 0,
          updatedAt: new Date().toISOString(),
          messages: [
            {
              id: 'm-pinned-1',
              conversationId: 'space-pinned',
              senderId: '1',
              senderName: 'Danny Do',
              senderRole: 'admin',
              text: 'Nội quy và thông báo quan trọng của salon',
              timeLabel: '09:00',
              createdAt: new Date().toISOString(),
              pinned: true,
            },
            {
              id: 'm-regular',
              conversationId: 'space-pinned',
              senderId: '10',
              senderName: 'Chuyên Viên Mai',
              senderRole: 'CV',
              text: 'Chào buổi sáng cả nhà!',
              timeLabel: '09:05',
              createdAt: new Date().toISOString(),
              pinned: false,
            },
          ],
        },
      ],
      tasks: [],
      staffDirectory: [{ id: 10, username: 'mai_cv', role: 'CV', displayName: 'Chuyên Viên Mai' }],
      userPrefs: { pinnedIds: [] },
    } as any);

    render(
      <MosChatProvider currentUser={{ id: 99, name: 'Danny Do', role: 'super_admin' }}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Kênh Thông Báo')).toBeTruthy();
    });

    // Tap into room
    fireEvent.click(screen.getByText('Kênh Thông Báo'));

    // Verify pinned message banner is displayed at the top of mobile stream
    await waitFor(() => {
      expect(screen.getByLabelText(/Đi đến tin nhắn đã ghim: Danny Do/i)).toBeTruthy();
      expect(screen.getByRole('button', { name: /Xem tất cả tin ghim/i })).toBeTruthy();
    });

    // Tap on header pin button to open Pinned tab
    const pinHeaderBtn = screen.getByLabelText('Xem tin nhắn đã ghim');
    fireEvent.click(pinHeaderBtn);

    // Verify Pinned Messages tab is displayed
    await waitFor(() => {
      expect(screen.getByText('Tin nhắn đã ghim')).toBeTruthy();
      expect(screen.getByText('Nội quy và thông báo quan trọng của salon')).toBeTruthy();
      expect(screen.getByRole('button', { name: /Đi đến tin nhắn/i })).toBeTruthy();
    });

    // Test search inside pinned tab
    const searchInput = screen.getByPlaceholderText(/Tìm kiếm trong tin nhắn ghim/i);
    fireEvent.change(searchInput, { target: { value: 'Nội quy' } });
    expect(screen.getByText('Nội quy và thông báo quan trọng của salon')).toBeTruthy();

    fireEvent.change(searchInput, { target: { value: 'Không có kết quả nào' } });
    expect(screen.getByText('Không tìm thấy tin nhắn ghim phù hợp')).toBeTruthy();

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });

    // Test navigation back to chat
    const backToChatBtn = screen.getByRole('button', { name: /Trò chuyện/i });
    fireEvent.click(backToChatBtn);

    // Verify back to chat stream
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nhắn tin/i)).toBeTruthy();
    });
  });

  it('allows unpinning message from mobile pinned banner (MOS-BUG-151)', async () => {
    vi.mocked(apiClient.chat.bootstrap).mockResolvedValueOnce({
      conversations: [
        {
          id: 'space-pinned-2',
          type: 'space',
          name: 'Kênh Test Ghim',
          subtitle: 'Kênh test',
          color: '#d4a72c',
          memberCount: 5,
          memberIds: [99],
          unreadCount: 0,
          updatedAt: new Date().toISOString(),
          messages: [
            {
              id: 'm-pinned-test',
              conversationId: 'space-pinned-2',
              senderId: '1',
              senderName: 'Danny Do',
              senderRole: 'admin',
              text: 'Tin nhắn cần bỏ ghim',
              timeLabel: '09:00',
              createdAt: new Date().toISOString(),
              pinned: true,
            },
          ],
        },
      ],
      tasks: [],
      staffDirectory: [],
      userPrefs: { pinnedIds: [] },
    } as any);

    render(
      <MosChatProvider currentUser={{ id: 99, name: 'Danny Do', role: 'super_admin' }}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Kênh Test Ghim')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Kênh Test Ghim'));

    await waitFor(() => {
      expect(screen.getByLabelText(/Đi đến tin nhắn đã ghim: Danny Do/i)).toBeTruthy();
    });

    // Unpin from banner
    const unpinBtn = screen.getByRole('button', { name: /Bỏ ghim tin nhắn/i });
    fireEvent.click(unpinBtn);

    await waitFor(() => {
      expect(apiClient.chat.togglePinMessage).toHaveBeenCalledWith('m-pinned-test', 'space-pinned-2');
    });
  });

  it('renders AI Copilot (🤖 MAI) on mobile inbox, supports quick prompts and sends message to AI (MOS-BUG-153)', async () => {
    render(
      <MosChatProvider currentUser={{ id: 99, name: 'Danny Do', role: 'super_admin' }}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    // 1. Verify MAI is pinned in inbox
    await waitFor(() => {
      expect(screen.getByText('🤖 MAI')).toBeTruthy();
      expect(screen.getByText(/tích hợp trực tiếp vào/i)).toBeTruthy();
    });

    // 2. Open AI Copilot room
    fireEvent.click(screen.getByText('🤖 MAI'));

    // 3. Verify AI Welcome Card and quick prompts are visible
    await waitFor(() => {
      expect(screen.getByText('Trợ lý mOS AI (MAI)')).toBeTruthy();
      expect(screen.getByText('Giải thích nhóm khách (Buckets)')).toBeTruthy();
    });

    // 4. Click a quick prompt chip
    fireEvent.click(screen.getByText('Giải thích nhóm khách (Buckets)'));

    // 5. Verify apiClient.ai.sendMessage was called with the corresponding prompt
    await waitFor(() => {
      expect(apiClient.ai.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Giải thích các nhóm khách hàng COMBO_LIVE'),
        })
      );
    });

    // 6. Verify AI reply, reasoning badge, and action button are rendered
    await waitFor(() => {
      expect(screen.getByText(/Chào anh Danny/i)).toBeTruthy();
      expect(screen.getByText('Lọc khách cần chăm sóc')).toBeTruthy();
      expect(screen.getByText(/Quá trình suy luận của MAI/i)).toBeTruthy();
    });
  });

  it('allows opening AI Copilot directly from mobile action sheet and new DM modal (MOS-BUG-153)', async () => {
    render(
      <MosChatProvider currentUser={{ id: 99, name: 'Danny Do', role: 'super_admin' }}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    // 1. Test opening AI from New DM modal in inbox
    await waitFor(() => {
      expect(screen.getByLabelText('Soạn tin nhắn DM mới')).toBeTruthy();
    });

    fireEvent.click(screen.getByLabelText('Soạn tin nhắn DM mới'));

    await waitFor(() => {
      expect(screen.getByText(/Trợ lý AI · Tra cứu dữ liệu/i)).toBeTruthy();
    });

    // Click the MAI item inside modal
    fireEvent.click(screen.getByText(/Trợ lý AI · Tra cứu dữ liệu/i));

    // Verify navigating to AI Copilot room
    await waitFor(() => {
      expect(screen.getByText('Trợ lý mOS AI (MAI)')).toBeTruthy();
    });

    // Back to inbox
    fireEvent.click(screen.getByLabelText('Quay lại danh sách hội thoại'));

    await waitFor(() => {
      expect(screen.getByText('Shop Operations')).toBeTruthy();
    });

    // 2. Navigate to a regular room and open AI from action sheet
    fireEvent.click(screen.getByText('Shop Operations'));

    await waitFor(() => {
      expect(screen.getByLabelText('Tác vụ đính kèm')).toBeTruthy();
    });

    // Open action sheet
    fireEvent.click(screen.getByLabelText('Tác vụ đính kèm'));

    await waitFor(() => {
      expect(screen.getByText('Trợ lý Wings AI')).toBeTruthy();
    });

    // Tap AI Copilot in Action Sheet
    fireEvent.click(screen.getByText('Trợ lý Wings AI'));

    // Verify navigating to AI Copilot room
    await waitFor(() => {
      expect(screen.getByText('Trợ lý mOS AI (MAI)')).toBeTruthy();
    });
  });
});
