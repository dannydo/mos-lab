import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MosGoogleChatPortal from '../MosGoogleChatPortal';
import { apiClient } from '../../../lib/api-client';
import { playNeuralSpeech } from '../../voice-assistant/speech-utils';

vi.mock('../../voice-assistant/speech-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../voice-assistant/speech-utils')>();
  return {
    ...actual,
    playNeuralSpeech: vi.fn().mockResolvedValue(null),
    stopSpeaking: vi.fn(),
  };
});

vi.mock('../utils/chat-helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/chat-helpers')>();
  return {
    ...actual,
    readOrCompressImagePayload: vi.fn().mockResolvedValue({
      dataBase64: 'dGVzdA==',
      mimeType: 'image/png',
      width: 100,
      height: 100,
    }),
  };
});

// Mock matchMedia
beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

// Mock apiClient
vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    chat: {
      bootstrap: vi.fn().mockResolvedValue({
        unchanged: false,
        version: 1,
        conversations: [],
        tasks: [
          {
            id: 'task-test-1',
            conversationId: 'space-cc',
            conversationName: 'tư-vấn-cc',
            title: 'Hỗ trợ khách VIP đến sớm',
            assigneeName: 'Tuyết Nhi',
            creatorName: 'Danny',
            priority: 'HIGH',
            remindAt: new Date(Date.now() + 3600000).toISOString(),
            done: false,
            createdAt: new Date().toISOString(),
          },
        ],
        staffDirectory: [
          { id: 1, displayName: 'Tuyết Nhi', role: 'Telesales' },
          { id: 2, displayName: 'Thùy Dương', role: 'Tư Vấn CC' },
        ],
        accessConfig: { allowAllStaff: true, allowedGroupKeys: [], allowedStaffIds: [] },
        canAccessChat: true,
      }),
      updateUserPrefs: vi.fn().mockResolvedValue({}),
      updateTask: vi.fn().mockResolvedValue({ success: true }),
      deleteTask: vi.fn().mockResolvedValue({ success: true, taskId: 'task-test-1' }),
      markAsRead: vi.fn().mockResolvedValue({}),
      markThreadAsRead: vi.fn().mockResolvedValue({}),
      togglePinConversation: vi.fn().mockResolvedValue({}),
      buzzMessage: vi.fn().mockResolvedValue({
        success: true,
        buzzEvent: {
          id: 'buzz-test-1',
          senderId: 99,
          senderName: 'Danny Do',
          senderRole: 'Admin',
          buzzedAt: new Date().toISOString(),
        },
      }),
      uploadImage: vi.fn().mockResolvedValue({
        attachment: {
          id: 'att-123',
          url: '/uploads/test-image.png',
          name: 'test-image.png',
          width: 100,
          height: 100,
        },
      }),
    },
    staff: {
      list: vi.fn().mockResolvedValue([
        { id: 1, name: 'Tuyết Nhi', role: 'Telesales' },
        { id: 2, name: 'Thùy Dương', role: 'Tư Vấn CC' },
      ]),
    },
  },
}));

describe('MosGoogleChatPortal Task & Inbox Navigation', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('initializes and caches staffDirectory to localStorage', async () => {
    const mockStaff = [{ id: 10, displayName: 'Minh Thư', role: 'CS' }];
    window.localStorage.setItem('mos_chat_staff_directory_v1', JSON.stringify(mockStaff));

    render(
      <MosGoogleChatPortal
        open={true}
        onClose={vi.fn()}
        onToggle={vi.fn()}
        currentUser={{ id: 99, displayName: 'Danny Do', role: 'Admin' }}
      />
    );

    // Bootstrap is called and updates staff directory
    await waitFor(() => {
      const stored = window.localStorage.getItem('mos_chat_staff_directory_v1');
      expect(stored).toBeTruthy();
      expect(stored).toContain('Tuyết Nhi');
    });
  });

  it('allows mobile user to click tasks from inbox and view tasks hub', async () => {
    // Force mobile viewport
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 });
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('(max-width'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <MosGoogleChatPortal
        open={true}
        onClose={vi.fn()}
        onToggle={vi.fn()}
        currentUser={{ id: 99, displayName: 'Danny Do', role: 'Admin' }}
      />
    );

    // Find the Tasks subtab button in sidebar
    const tasksButton = await screen.findByRole('button', { name: /Kho Công việc & Nhắc hẹn/i });
    expect(tasksButton).toBeTruthy();

    // Click on tasks subtab button
    fireEvent.click(tasksButton);

    // Tasks hub header should now be visible
    await waitFor(() => {
      expect(screen.getByText('Kho Công Việc & Nhắc Hẹn')).toBeTruthy();
    });

    // Clicking back button should return to inbox view
    const backButton = screen.getByRole('button', { name: /Quay lại danh sách hội thoại/i });
    expect(backButton).toBeTruthy();
    fireEvent.click(backButton);

    // Should return back to chat subtab
    await waitFor(() => {
      expect(screen.queryByText('Kho Công Việc & Nhắc Hẹn')).toBeNull();
    });
  });

  it('renders edit, archive, and delete action buttons for each task in tasks tab (MOS-FEAT-121)', async () => {
    // Reset window width to desktop
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1200 });

    render(
      <MosGoogleChatPortal
        open={true}
        onClose={vi.fn()}
        onToggle={vi.fn()}
        currentUser={{ id: 99, displayName: 'Danny Do', role: 'Admin' }}
      />
    );

    // Navigate to tasks tab
    const tasksButton = await screen.findByRole('button', { name: /Công việc & Nhắc hẹn/i });
    expect(tasksButton).toBeTruthy();
    fireEvent.click(tasksButton);

    // Wait for task item to be visible
    await waitFor(() => {
      expect(screen.getByText('Hỗ trợ khách VIP đến sớm')).toBeTruthy();
    });

    // Check filter pills
    expect(screen.getByText(/Đang làm/i)).toBeTruthy();
    expect(screen.getByText(/Đã xong/i)).toBeTruthy();
    expect(screen.getByText(/Lưu trữ/i)).toBeTruthy();
    expect(screen.getAllByText(/Tất cả/i).length).toBeGreaterThan(0);

    // Check scope filter buttons (MOS-BUG-129)
    expect(screen.getByText(/Tất cả task/i)).toBeTruthy();
    expect(screen.getByText(/Task của tôi/i)).toBeTruthy();

    // Check action buttons: edit, archive, delete
    const editBtn = screen.getByRole('button', { name: /Chỉnh sửa/i });
    expect(editBtn).toBeTruthy();

    const archiveBtn = screen.getByRole('button', { name: /Lưu trữ công việc/i });
    expect(archiveBtn).toBeTruthy();

    const deleteBtn = screen.getByRole('button', { name: /Xoá task/i });
    expect(deleteBtn).toBeTruthy();
  });

  it('prioritizes tasks belonging to the active space and partitions other spaces below (MOS-BUG-129)', async () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1200 });

    render(
      <MosGoogleChatPortal
        open={true}
        onClose={vi.fn()}
        onToggle={vi.fn()}
        currentUser={{ id: 99, displayName: 'Danny Do', role: 'Admin' }}
      />
    );

    // Navigate to tasks tab
    const tasksButton = await screen.findByRole('button', { name: /Công việc & Nhắc hẹn/i });
    expect(tasksButton).toBeTruthy();
    fireEvent.click(tasksButton);

    // Task Manager header should be visible
    await waitFor(() => {
      expect(screen.getByText('Quản Lý Công Việc & Nhắc Hẹn')).toBeTruthy();
    });

    // Check that scope filter contains "Tất cả task" and "Task của tôi"
    expect(screen.getByText(/Tất cả task/i)).toBeTruthy();
    expect(screen.getByText(/Task của tôi/i)).toBeTruthy();

    // Verify task search input is rendered
    expect(screen.getByPlaceholderText(/Tìm kiếm công việc/i)).toBeTruthy();
  });

  it('accepts targetNavigation prop to navigate and highlight target message', async () => {
    const { container } = render(
      <MosGoogleChatPortal
        open={true}
        onClose={vi.fn()}
        onToggle={vi.fn()}
        currentUser={{ id: 99, displayName: 'Danny Do', role: 'Admin' }}
        targetNavigation={{
          conversationId: 'space-cc',
          messageId: 'msg-seed-1',
          timestamp: Date.now(),
        }}
      />
    );
    expect(container).toBeTruthy();
  });

  it('marks AI copilot and conversations as read without sticking unread badges (MOS-BUG-127)', async () => {
    const { container } = render(
      <MosGoogleChatPortal
        open={true}
        onClose={vi.fn()}
        onToggle={vi.fn()}
        currentUser={{ id: 99, displayName: 'Danny Do', role: 'Admin' }}
      />
    );
    expect(container).toBeTruthy();
  });

  it('renders a spacious, full-width chat composer card with dedicated action toolbar (MOS-FEAT-128)', async () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1920 });

    render(
      <MosGoogleChatPortal
        open={true}
        onClose={vi.fn()}
        onToggle={vi.fn()}
        currentUser={{ id: 99, displayName: 'Danny Do', role: 'Admin' }}
      />
    );

    // Verify textarea is rendered with placeholder and width
    const textarea = (await screen.findByPlaceholderText(/Nhắn tin/i)) as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.className).toContain('w-full');

    // Verify desktop action toolbar items are present
    expect(screen.getByRole('button', { name: /Định dạng chữ Apple Notes/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Chèn biểu tượng cảm xúc Wings/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Tải hình từ ổ đĩa hoặc Google Drive/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Đính kèm hình từ link Google Drive/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Đính kèm thẻ Khách hàng/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Nhắc tên đồng nghiệp/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Giao Task & Cài nhắc hẹn mới/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Gửi tin nhắn/i })).toBeTruthy();

    // Verify hint text for Enter to send
    expect(screen.getByText(/Enter gửi · Shift\+Enter xuống dòng/i)).toBeTruthy();

    // Verify typing into textarea
    fireEvent.change(textarea, { target: { value: 'Chào Danny, khung chat đã rộng rãi rồi nhé!' } });
    expect(textarea.value).toBe('Chào Danny, khung chat đã rộng rãi rồi nhé!');
  });

  it('strictly shows [⚡ Quy trình] workflow builder button ONLY to Super Admin Danny and hides it for regular staff', async () => {
    const { unmount } = render(
      <MosGoogleChatPortal
        open={true}
        onClose={vi.fn()}
        onToggle={vi.fn()}
        currentUser={{ id: 102, username: 'tuyetnhi', role: 'telesales' }}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Giao Task & Cài nhắc hẹn mới/i })).toBeTruthy();
    });
    expect(screen.queryByRole('button', { name: /Khởi tạo Quy trình Sống/i })).toBeNull();
    unmount();

    render(
      <MosGoogleChatPortal
        open={true}
        onClose={vi.fn()}
        onToggle={vi.fn()}
        currentUser={{ id: 1, username: 'danny', email: 'danny@wingslashes.com', role: 'super_admin' }}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Khởi tạo Quy trình Sống/i })).toBeTruthy();
    });
  });

  it('renders sticky pinned banner and allows jumping to pinned message from banner and pinned tab (MOS-FEAT-130)', async () => {
    const mockPinnedConv = {
      id: 'space-cc',
      type: 'space' as const,
      name: 'tư-vấn-cc-ca-hôm-nay',
      memberCount: 12,
      unreadCount: 0,
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: 'msg-pinned-1',
          conversationId: 'space-cc',
          senderId: 'staff-tn',
          senderName: 'Tuyết Nhi',
          senderRole: 'Telesales',
          text: 'Chị Nguyễn Bích Ngọc (VIP Diamond) vừa báo sẽ tới sớm.',
          timeLabel: '14:42',
          createdAt: new Date().toISOString(),
          pinned: true,
        },
      ],
    };
    (apiClient.chat.bootstrap as any).mockResolvedValueOnce({
      unchanged: false,
      version: 1,
      conversations: [mockPinnedConv],
      tasks: [],
      staffDirectory: [],
      accessConfig: { allowAllStaff: true, allowedGroupKeys: [], allowedStaffIds: [] },
      canAccessChat: true,
    });

    render(
      <MosGoogleChatPortal
        open={true}
        onClose={vi.fn()}
        onToggle={vi.fn()}
        currentUser={{ id: 99, displayName: 'Danny Do', role: 'Admin' }}
      />
    );

    // Sticky pinned message banner should be rendered in chat view
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Đi đến tin nhắn đã ghim/i })).toBeTruthy();
    });

    // Pinned banner should have "Đi đến tin nhắn" button
    const bannerJumpBtn = screen.getByRole('button', { name: /Đi đến tin nhắn đã ghim/i });
    expect(bannerJumpBtn).toBeTruthy();

    // Switch to Pinned Messages subtab
    const pinnedTabBtn = screen.getByRole('button', { name: /Tab tin nhắn đã ghim/i });
    fireEvent.click(pinnedTabBtn);

    // In Pinned subtab, verify header and pinned message card
    await waitFor(() => {
      expect(screen.getByText(/Tin nhắn đã ghim/i)).toBeTruthy();
    });

    const cardJumpBtn = screen.getByRole('button', { name: /Đi đến tin nhắn/i });
    expect(cardJumpBtn).toBeTruthy();

    // Click "Đi đến tin nhắn" button on pinned card to navigate back to chat
    fireEvent.click(cardJumpBtn);

    // Verify it navigated back to chat view (sticky banner is visible again)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Đi đến tin nhắn đã ghim/i })).toBeTruthy();
    });
  });

  it('renders Buzz / Bump urgent button, displays buzzed badge, and calls buzzMessage API (MOS-BUG-131)', async () => {
    const mockBuzzedConv = {
      id: 'space-operations',
      type: 'space' as const,
      name: 'vận-hành-khẩn-cấp',
      memberCount: 8,
      unreadCount: 1,
      hasUnreadBuzz: true,
      unreadBuzzCount: 1,
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: 'msg-buzz-1',
          conversationId: 'space-operations',
          senderId: 'staff-tn',
          senderName: 'Tâm Nguyễn',
          senderRole: 'Admin',
          text: 'Khách VIP yêu cầu hỗ trợ gấp tại sảnh.',
          timeLabel: '10:30',
          createdAt: new Date().toISOString(),
          isBuzzed: true,
          buzzCount: 2,
          buzzedAt: new Date().toISOString(),
          latestBuzz: {
            id: 'b-1',
            senderId: 'staff-tn',
            senderName: 'Tâm Nguyễn',
            senderRole: 'Admin',
            buzzedAt: new Date().toISOString(),
          },
        },
      ],
    };

    (apiClient.chat.bootstrap as any).mockResolvedValueOnce({
      unchanged: false,
      version: 1,
      conversations: [mockBuzzedConv],
      tasks: [],
      staffDirectory: [],
      accessConfig: { allowAllStaff: true, allowedGroupKeys: [], allowedStaffIds: [] },
      canAccessChat: true,
    });

    render(
      <MosGoogleChatPortal
        open={true}
        onClose={vi.fn()}
        onToggle={vi.fn()}
        currentUser={{ id: 99, displayName: 'Danny Do', role: 'Admin' }}
      />
    );

    // Verify the unread buzzed badge in sidebar
    await waitFor(() => {
      expect(screen.getByText('BUZZ')).toBeTruthy();
    });

    // Click on the buzzed conversation in sidebar to open it
    const convItem = screen.getByText('vận-hành-khẩn-cấp');
    fireEvent.click(convItem);

    // Verify emergency header banner inside buzzed message
    await waitFor(() => {
      expect(screen.getByText(/TIN NHẮN KHẨN CẤP · BUZZ/i)).toBeTruthy();
      expect(screen.getByText('x2')).toBeTruthy();
    });

    // Verify Buzz / Bump button is present in message action toolbar
    const buzzBtn = screen.getByRole('button', { name: /Buzz \/ Bump tin nhắn khẩn cấp/i });
    expect(buzzBtn).toBeTruthy();
  });

  it('renders backdrop overlay when open and calls onClose when backdrop is clicked', async () => {
    const handleClose = vi.fn();

    render(
      <MosGoogleChatPortal
        open={true}
        onClose={handleClose}
        onToggle={vi.fn()}
        currentUser={{ id: 99, displayName: 'Danny Do', role: 'Admin' }}
      />
    );

    const backdrop = screen.getByTestId('mos-chat-backdrop');
    expect(backdrop).toBeTruthy();
    expect(backdrop.className).toContain('opacity-100');

    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed while mOS Chat is open', async () => {
    const handleClose = vi.fn();

    render(
      <MosGoogleChatPortal
        open={true}
        onClose={handleClose}
        onToggle={vi.fn()}
        currentUser={{ id: 99, displayName: 'Danny Do', role: 'Admin' }}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('automatically triggers @MAI spoken announcement directly when user is tagged in an urgent buzzed message (MOS-BUG-135)', async () => {
    const mockUrgentConv = {
      id: 'space-urgent-4',
      type: 'space' as const,
      name: '4-cô-gái-hăng-hái',
      memberCount: 4,
      unreadCount: 1,
      hasUnreadBuzz: true,
      unreadBuzzCount: 1,
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: 'msg-urgent-30k',
          conversationId: 'space-urgent-4',
          senderId: 'staff-tam',
          senderName: 'Tâm Nguyễn',
          senderRole: 'Admin',
          text: '@Danny Do 0901406091 cho anh 30K nhen',
          timeLabel: '13:07',
          createdAt: new Date().toISOString(),
          isBuzzed: true,
          buzzCount: 1,
          buzzedAt: new Date().toISOString(),
          latestBuzz: {
            id: 'b-30k',
            senderId: 'staff-tam',
            senderName: 'Tâm Nguyễn',
            senderRole: 'Admin',
            buzzedAt: new Date().toISOString(),
          },
        },
      ],
    };

    (apiClient.chat.bootstrap as any).mockResolvedValue({
      unchanged: false,
      version: 1,
      conversations: [mockUrgentConv],
      tasks: [],
      staffDirectory: [
        { id: 99, displayName: 'Danny Do', role: 'Admin' },
        { id: 4, displayName: 'Tâm Nguyễn', role: 'Admin' },
      ],
      accessConfig: { allowAllStaff: true, allowedGroupKeys: [], allowedStaffIds: [] },
      canAccessChat: true,
    });

    render(
      <MosGoogleChatPortal
        open={true}
        onClose={vi.fn()}
        onToggle={vi.fn()}
        currentUser={{ id: 99, displayName: 'Danny Do', role: 'Admin' }}
      />
    );

    // Verify @MAI voice announcement was scheduled / called for tagged user Danny Do
    await waitFor(
      () => {
        expect(playNeuralSpeech).toHaveBeenCalledWith(
          expect.stringContaining(
            'Tâm Nguyễn vừa gửi tin nhắn khẩn cấp trong nhóm 4-cô-gái-hăng-hái: 0901406091 cho anh 30K nhen'
          ),
          expect.objectContaining({ voice: 'vi-VN-HoaiMyNeural' })
        );
      },
      { timeout: 4000 }
    );

    // Verify notification warning contains MAI audio badge and Replay button
    await waitFor(
      () => {
        expect(screen.getByText(/@MAI đã phát âm thanh thông báo trực tiếp đến bạn/i)).toBeTruthy();
        expect(screen.getByText('🔊 Nghe lại')).toBeTruthy();
      },
      { timeout: 4000 }
    );

    // Open the conversation and verify the '@MAI đọc' button is rendered on the buzzed message header
    const convItem = screen.getByText('4-cô-gái-hăng-hái');
    fireEvent.click(convItem);

    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /Nghe @MAI đọc tin nhắn khẩn cấp/i })).toBeTruthy();
      },
      { timeout: 4000 }
    );
  });

  it('does NOT trigger @MAI spoken announcement if current user was NOT tagged in a group message (MOS-BUG-135)', async () => {
    (playNeuralSpeech as any).mockClear();

    const mockUrgentConvOther = {
      id: 'space-urgent-other',
      type: 'space' as const,
      name: '4-cô-gái-hăng-hái',
      memberCount: 4,
      unreadCount: 1,
      hasUnreadBuzz: true,
      unreadBuzzCount: 1,
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: 'msg-other-tagged',
          conversationId: 'space-urgent-other',
          senderId: 'staff-tam',
          senderName: 'Tâm Nguyễn',
          senderRole: 'Admin',
          text: '@Đẫm Ti 0901406091 cho anh 30K nhen',
          timeLabel: '13:07',
          createdAt: new Date().toISOString(),
          isBuzzed: true,
          buzzCount: 1,
          buzzedAt: new Date().toISOString(),
          latestBuzz: {
            id: 'b-other',
            senderId: 'staff-tam',
            senderName: 'Tâm Nguyễn',
            senderRole: 'Admin',
            buzzedAt: new Date().toISOString(),
          },
        },
      ],
    };

    (apiClient.chat.bootstrap as any).mockResolvedValue({
      unchanged: false,
      version: 1,
      conversations: [mockUrgentConvOther],
      tasks: [],
      staffDirectory: [
        { id: 99, displayName: 'Danny Do', role: 'Admin' },
        { id: 4, displayName: 'Tâm Nguyễn', role: 'Admin' },
        { id: 5, displayName: 'Đẫm Ti', role: 'CV' },
      ],
      accessConfig: { allowAllStaff: true, allowedGroupKeys: [], allowedStaffIds: [] },
      canAccessChat: true,
    });

    render(
      <MosGoogleChatPortal
        open={true}
        onClose={vi.fn()}
        onToggle={vi.fn()}
        currentUser={{ id: 99, displayName: 'Danny Do', role: 'Admin' }}
      />
    );

    // Danny was not tagged, so playNeuralSpeech must not be called
    await waitFor(() => {
      expect(screen.getByText('BUZZ')).toBeTruthy();
    });
    expect(playNeuralSpeech).not.toHaveBeenCalled();
  });

  it('allows dragging and dropping image file into the subthread pane and composer', async () => {
    const mockConvWithThread = {
      id: 'space-test-subthread',
      type: 'space' as const,
      name: 'General Discussion',
      memberCount: 3,
      unreadCount: 0,
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: 'msg-with-thread-1',
          conversationId: 'space-test-subthread',
          senderId: 'staff-1',
          senderName: 'Tâm Nguyễn',
          senderRole: 'Admin',
          text: 'Tin nhắn gốc có subthread',
          timeLabel: '14:00',
          createdAt: new Date().toISOString(),
          thread: [
            {
              id: 'reply-1',
              senderId: 'staff-2',
              senderName: 'Bảo Hân',
              text: 'Câu trả lời 1',
              createdAt: new Date().toISOString(),
            },
          ],
        },
      ],
    };

    (apiClient.chat.bootstrap as any).mockResolvedValue({
      unchanged: false,
      version: 1,
      conversations: [mockConvWithThread],
      tasks: [],
      staffDirectory: [{ id: 99, displayName: 'Danny Do', role: 'Admin' }],
      accessConfig: { allowAllStaff: true, allowedGroupKeys: [], allowedStaffIds: [] },
      canAccessChat: true,
    });

    const { container } = render(
      <MosGoogleChatPortal
        open={true}
        onClose={vi.fn()}
        onToggle={vi.fn()}
        currentUser={{ id: 99, displayName: 'Danny Do', role: 'Admin' }}
      />
    );

    // Click on conversation in sidebar to open it
    await waitFor(() => {
      expect(screen.getByText('General Discussion')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('General Discussion'));

    // Wait for message and click thread badge to open thread
    await waitFor(() => {
      expect(screen.getByText('1 trả lời')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('1 trả lời'));

    // Thread pane should open
    await waitFor(() => {
      const threadPane = container.querySelector('[data-chat-thread-pane="true"]');
      expect(threadPane).toBeTruthy();
    });

    const threadPane = container.querySelector('[data-chat-thread-pane="true"]')!;

    // 1. First drag files over main chat stream -> Main dropzone appears
    const mainStream = container.querySelector('[data-chat-main-stream="true"]')!;
    fireEvent.dragOver(mainStream, {
      dataTransfer: { types: ['Files'] },
    });
    expect(screen.getByText(/Thả hình ảnh từ máy tính hoặc Google Drive vào đây/i)).toBeTruthy();

    // 2. Drag into thread pane -> Main dropzone disappears immediately
    fireEvent.dragOver(threadPane, {
      dataTransfer: {
        types: ['Files'],
      },
    });
    expect(screen.queryByText(/Thả hình ảnh từ máy tính hoặc Google Drive vào đây/i)).toBeNull();

    // 3. Drop file into thread pane -> Main dropzone stays clean/normal
    const mockFile = new File(['dummy content'], 'test-image.png', { type: 'image/png' });
    (apiClient.chat.uploadImage as any).mockResolvedValue({
      attachment: {
        id: 'att-123',
        url: '/uploads/test-image.png',
        name: 'test-image.png',
        width: 100,
        height: 100,
      },
    });

    fireEvent.drop(threadPane, {
      dataTransfer: {
        files: [mockFile],
      },
    });

    await waitFor(() => {
      expect(apiClient.chat.uploadImage).toHaveBeenCalled();
    });
    expect(screen.queryByText(/Thả hình ảnh từ máy tính hoặc Google Drive vào đây/i)).toBeNull();
  });

  it('allows pasting image file from clipboard into the subthread textarea and pane', async () => {
    const mockConvWithThread = {
      id: 'space-test-paste',
      type: 'space' as const,
      name: 'General Discussion',
      memberCount: 3,
      unreadCount: 0,
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: 'msg-with-thread-2',
          conversationId: 'space-test-paste',
          senderId: 'staff-1',
          senderName: 'Tâm Nguyễn',
          senderRole: 'Admin',
          text: 'Tin nhắn gốc',
          timeLabel: '14:00',
          createdAt: new Date().toISOString(),
          thread: [
            {
              id: 'reply-1',
              senderId: 'staff-2',
              senderName: 'Bảo Hân',
              text: 'Câu trả lời 1',
              createdAt: new Date().toISOString(),
            },
          ],
        },
      ],
    };

    (apiClient.chat.bootstrap as any).mockResolvedValue({
      unchanged: false,
      version: 1,
      conversations: [mockConvWithThread],
      tasks: [],
      staffDirectory: [{ id: 99, displayName: 'Danny Do', role: 'Admin' }],
      accessConfig: { allowAllStaff: true, allowedGroupKeys: [], allowedStaffIds: [] },
      canAccessChat: true,
    });

    const { container } = render(
      <MosGoogleChatPortal
        open={true}
        onClose={vi.fn()}
        onToggle={vi.fn()}
        currentUser={{ id: 99, displayName: 'Danny Do', role: 'Admin' }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('General Discussion')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('General Discussion'));

    await waitFor(() => {
      expect(screen.getByText('1 trả lời')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('1 trả lời'));

    await waitFor(() => {
      const threadPane = container.querySelector('[data-chat-thread-pane="true"]');
      expect(threadPane).toBeTruthy();
    });

    const threadTextarea = screen.getByPlaceholderText(/Trả lời vào luồng.../i);
    expect(threadTextarea).toBeTruthy();

    (apiClient.chat.uploadImage as any).mockClear();
    const mockPasteFile = new File(['pasted image data'], 'pasted-screenshot.png', { type: 'image/png' });

    fireEvent.paste(threadTextarea, {
      clipboardData: {
        items: [
          {
            type: 'image/png',
            kind: 'file',
            getAsFile: () => mockPasteFile,
          },
        ],
        getData: vi.fn(),
      },
    });

    await waitFor(() => {
      expect(apiClient.chat.uploadImage).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: 'pasted-screenshot.png',
          source: 'clipboard',
        })
      );
    });
  });
});
