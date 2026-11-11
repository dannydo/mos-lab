import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MosChatSearchModal } from '../components/MosChatSearchModal';
import { MosChatMobileSearchSheet } from '../mobile/MosChatMobileSearchSheet';
import { MosChatMobileInbox } from '../mobile/MosChatMobileInbox';
import { MosChatContext } from '../context/MosChatContext';
import type { MosChatConversation, MosChatSearchResultItem } from '@mos-lab/shared';
import { AI_COPILOT_CONV_ID } from '../constants/chat-constants';

vi.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({
    themeMode: 'dark',
    toggleTheme: vi.fn(),
    setThemeMode: vi.fn(),
  }),
}));

vi.mock('../../../lib/api/chat.api', () => ({
  chatApi: {
    chat: {
      searchMessages: vi.fn().mockResolvedValue({
        success: true,
        items: [
          {
            id: 'msg-1',
            conversationId: 'space-core',
            conversationName: 'Kênh Core Team',
            conversationType: 'space',
            senderId: '6',
            senderName: 'Nguyễn Quang Khải',
            text: 'Tìm kiếm đã hoạt động tốt',
            timeLabel: '10:00',
            createdAt: '2026-11-11T03:00:00.000Z',
          },
        ],
      }),
    },
  },
}));

describe('MOS-BUG-212: MosChatSearch Modal & Mobile Sheet Integration', () => {
  it('renders MosChatSearchModal with zIndex 1500 to sit above chat portal and overlays', () => {
    render(
      <MosChatSearchModal
        open={true}
        onClose={vi.fn()}
        onSelectMessage={vi.fn()}
      />
    );

    // Ant Design modal wraps in ant-modal-wrap with z-index
    const modalWrap = document.querySelector('.ant-modal-wrap');
    expect(modalWrap).toBeTruthy();
    // Modal root zIndex should be 1500
    expect((modalWrap as HTMLElement)?.style?.zIndex || '').toMatch(/1500/);
  });

  it('hides CURRENT_CONV scope when active conversation is AI Copilot', () => {
    const aiConversation: MosChatConversation = {
      id: AI_COPILOT_CONV_ID,
      type: 'dm',
      name: 'MAI Trợ lý AI',
      unreadCount: 0,
      updatedAt: new Date().toISOString(),
      messages: [],
    };

    render(
      <MosChatSearchModal
        open={true}
        activeConversation={aiConversation}
        onClose={vi.fn()}
        onSelectMessage={vi.fn()}
      />
    );

    // CURRENT_CONV tab for MAI should not be rendered
    expect(screen.queryByText('MAI Trợ lý AI')).toBeNull();
  });

  it('renders MosChatMobileSearchSheet with z-[1600] and executes search with initialQuery', async () => {
    const onSelect = vi.fn();
    render(
      <MosChatMobileSearchSheet
        open={true}
        onClose={vi.fn()}
        onSelectMessage={onSelect}
        initialQuery="khai"
      />
    );

    const sheetContainer = document.querySelector('.z-\\[1600\\]');
    expect(sheetContainer).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByDisplayValue('khai')).toBeTruthy();
    });
  });

  it('supports Vietnamese unaccented search matching in MosChatMobileInbox', () => {
    const conversations: MosChatConversation[] = [
      {
        id: 'c-1',
        name: 'Nguyễn Quang Khải',
        type: 'dm',
        unreadCount: 0,
        updatedAt: new Date().toISOString(),
        messages: [{ id: 'm-1', text: 'Báo cáo mOS Inbox hôm nay', senderId: 6, senderName: 'Khải', timeLabel: '09:00', createdAt: '' }],
      },
      {
        id: 'c-2',
        name: 'Tâm Nguyễn',
        type: 'dm',
        unreadCount: 0,
        updatedAt: new Date().toISOString(),
        messages: [{ id: 'm-2', text: 'Chào buổi sáng', senderId: 4, senderName: 'Tâm', timeLabel: '08:00', createdAt: '' }],
      },
    ];

    const mockContextValue: any = {
      conversations,
      activeConvId: null,
      setActiveConvId: vi.fn(),
      sidebarFilter: 'all',
      setSidebarFilter: vi.fn(),
      searchQuery: 'khai',
      setSearchQuery: vi.fn(),
      setMobileView: vi.fn(),
      setActiveSubtab: vi.fn(),
      staffDirectory: [],
      currentUser: { id: 1, role: 'admin' },
      startDirectMessage: vi.fn(),
      pinnedConvIds: new Set(),
      togglePinConversation: vi.fn(),
      markConversationAsRead: vi.fn(),
    };

    const onOpenSearchSheet = vi.fn();

    render(
      <MosChatContext.Provider value={mockContextValue}>
        <MosChatMobileInbox onOpenSearchSheet={onOpenSearchSheet} />
      </MosChatContext.Provider>
    );

    // Matches 'Nguyễn Quang Khải' even though searchQuery is 'khai' (without accents)
    expect(screen.getByText('Nguyễn Quang Khải')).toBeTruthy();

    // Deep search banner is displayed
    const deepSearchBanner = screen.getByText(/Tìm sâu/);
    expect(deepSearchBanner).toBeTruthy();

    // Clicking deep search button triggers onOpenSearchSheet with 'khai'
    fireEvent.click(deepSearchBanner);
    expect(onOpenSearchSheet).toHaveBeenCalledWith('khai');
  });
});
