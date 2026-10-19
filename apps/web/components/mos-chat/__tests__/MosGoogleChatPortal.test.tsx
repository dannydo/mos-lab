import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MosGoogleChatPortal from '../MosGoogleChatPortal';

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
      updateTask: vi.fn().mockResolvedValue({}),
      markAsRead: vi.fn().mockResolvedValue({}),
      togglePinConversation: vi.fn().mockResolvedValue({}),
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
    const mockStaff = [
      { id: 10, displayName: 'Minh Thư', role: 'CS' },
    ];
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
});
