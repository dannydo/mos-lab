import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AIAssistantWidget } from '../AIAssistantWidget';
import { aiApi } from '../../../../../lib/api/ai.api';
import { safeStorage } from '../../../../../lib/safe-storage';
import { AI_LAUNCHER_STORAGE_KEY } from '../../../../../lib/ai-assistant-launcher';

// Mock AdaptiveDrawer
vi.mock('../../../../../components/ui', () => ({
  AdaptiveDrawer: ({ open, title, children }: { open: boolean; title: React.ReactNode; children: React.ReactNode }) =>
    open ? (
      <div data-testid="assistant-drawer">
        <div data-testid="drawer-title">{title}</div>
        <div data-testid="drawer-body">{children}</div>
      </div>
    ) : null,
}));

// Mock aiApi
vi.mock('../../../../../lib/api/ai.api', () => ({
  aiApi: {
    ai: {
      listSessions: vi.fn(),
      getSession: vi.fn(),
      createSession: vi.fn(),
      deleteSession: vi.fn(),
      sendMessage: vi.fn(),
    },
  },
}));

describe('AIAssistantWidget (Private Workspace AI Copilot)', () => {
  const mockCurrentUser = {
    id: 99,
    username: 'danny_do',
    displayName: 'Danny Do',
    role: 'super_admin',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (aiApi.ai.listSessions as ReturnType<typeof vi.fn>).mockResolvedValue({
      sessions: [
        {
          id: 'sess-1',
          staffId: 99,
          title: 'Phiên phân tích mẫu',
          scope: 'customers',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });
    (aiApi.ai.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      session: {
        id: 'sess-1',
        staffId: 99,
        title: 'Phiên phân tích mẫu',
        scope: 'customers',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      messages: [],
    });
  });

  it('renders the floating launcher button with Private Workspace indicator', () => {
    render(<AIAssistantWidget themeMode="dark" currentUser={mockCurrentUser} onApplyFilter={vi.fn()} />);

    expect(screen.getByText('mOS Copilot')).toBeDefined();
    expect(screen.getByText('Riêng tư')).toBeDefined();
  });

  it('opens the private workspace drawer when launcher is clicked', async () => {
    render(<AIAssistantWidget themeMode="dark" currentUser={mockCurrentUser} onApplyFilter={vi.fn()} />);

    const launcher = screen.getByText('mOS Copilot').closest('button');
    expect(launcher).not.toBeNull();

    await act(async () => {
      fireEvent.click(launcher!);
    });

    expect(screen.getByTestId('assistant-drawer')).toBeDefined();
    expect(screen.getByText('Private Workspace')).toBeDefined();
    expect(screen.getByText(/Toàn bộ thảo luận & bộ lọc chỉ áp dụng trên màn hình cá nhân của bạn/i)).toBeDefined();
  });

  it('displays quick suggestion prompts in empty state', async () => {
    render(<AIAssistantWidget themeMode="dark" currentUser={mockCurrentUser} onApplyFilter={vi.fn()} />);

    await act(async () => {
      fireEvent.click(screen.getByText('mOS Copilot').closest('button')!);
    });

    expect(screen.getByText('Giải thích nhóm khách (Buckets)')).toBeDefined();
    expect(screen.getByText('Lọc khách NYC 60 chi tiêu > 1tr')).toBeDefined();
    expect(screen.getByText('Khách hàng được giao cho tôi')).toBeDefined();
  });

  it('sends message, renders thinking accordion, and allows applying suggested filter action', async () => {
    const handleApplyFilter = vi.fn();

    (aiApi.ai.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
      sessionId: 'sess-1',
      source: 'fallback',
      session: {
        id: 'sess-1',
        staffId: 99,
        title: 'Lọc khách NYC 60',
        scope: 'customers',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      message: {
        id: 'msg-resp-1',
        sessionId: 'sess-1',
        role: 'assistant',
        content: 'Tôi đề xuất lọc tệp khách hàng NYC 60 có chi tiêu trên 1 triệu đồng.',
        thinking: 'Phân tích tiêu chí 31-60 ngày và chi tiêu tối thiểu 1.000.000 đ',
        suggestedAction: {
          type: 'APPLY_FILTER',
          label: 'Lọc khách NYC 60 chi tiêu > 1tr',
          payload: {
            activeTab: 'NOT_COMBO_LIVE',
            daysSinceLastVisitMin: 31,
            daysSinceLastVisitMax: 60,
            totalSpentMin: 1000000,
          },
        },
        createdAt: new Date().toISOString(),
      },
    });

    render(<AIAssistantWidget themeMode="dark" currentUser={mockCurrentUser} onApplyFilter={handleApplyFilter} />);

    // Open drawer
    await act(async () => {
      fireEvent.click(screen.getByText('mOS Copilot').closest('button')!);
    });

    // Click quick prompt "Lọc khách NYC 60 chi tiêu > 1tr"
    const quickBtn = screen.getByText('Lọc khách NYC 60 chi tiêu > 1tr').closest('button');
    await act(async () => {
      fireEvent.click(quickBtn!);
    });

    // Check that thinking accordion is displayed
    await waitFor(() => {
      expect(screen.getByText('Tư duy & Phân tích logic')).toBeDefined();
      expect(screen.getByText('Phân tích tiêu chí 31-60 ngày và chi tiêu tối thiểu 1.000.000 đ')).toBeDefined();
    });

    // Check message content
    expect(screen.getByText('Tôi đề xuất lọc tệp khách hàng NYC 60 có chi tiêu trên 1 triệu đồng.')).toBeDefined();

    // Check suggested action card
    const applyBtn = screen.getByText('Áp dụng vào bảng hiện tại').closest('button');
    expect(applyBtn).not.toBeNull();

    // Click apply action
    await act(async () => {
      fireEvent.click(applyBtn!);
    });

    // Verify onApplyFilter was called with the exact criteria
    expect(handleApplyFilter).toHaveBeenCalledTimes(1);
    expect(handleApplyFilter).toHaveBeenCalledWith({
      activeTab: 'NOT_COMBO_LIVE',
      daysSinceLastVisitMin: 31,
      daysSinceLastVisitMax: 60,
      totalSpentMin: 1000000,
    });

    // Verify button text updates to "Đã áp dụng vào bảng dữ liệu"
    expect(screen.getByText('Đã áp dụng vào bảng dữ liệu')).toBeDefined();
  });

  it('loads and applies persisted launcher position from storage', () => {
    safeStorage.setItem(AI_LAUNCHER_STORAGE_KEY, JSON.stringify({ x: 150, y: 280 }));

    render(<AIAssistantWidget themeMode="dark" currentUser={mockCurrentUser} onApplyFilter={vi.fn()} />);

    const launcher = screen.getByRole('button', { name: /mOS Copilot/i });
    const container = launcher.closest('[data-ai-assistant-launcher-container]') as HTMLElement;
    expect(container?.style.left).toBe('150px');
    expect(container?.style.top).toBe('280px');
  });

  it('supports pointer dragging and persists new position on pointer up', () => {
    safeStorage.removeItem(AI_LAUNCHER_STORAGE_KEY);

    render(<AIAssistantWidget themeMode="dark" currentUser={mockCurrentUser} onApplyFilter={vi.fn()} />);

    const launcher = screen.getByRole('button', { name: /mOS Copilot/i });
    launcher.setPointerCapture = vi.fn();
    launcher.releasePointerCapture = vi.fn();
    launcher.hasPointerCapture = vi.fn().mockReturnValue(true);
    launcher.getBoundingClientRect = vi.fn().mockReturnValue({ left: 300, top: 400, width: 48, height: 48 });

    // Pointer down
    fireEvent.pointerDown(launcher, {
      button: 0,
      pointerId: 1,
      clientX: 300,
      clientY: 400,
    });

    // Pointer move (dragging past threshold)
    fireEvent.pointerMove(launcher, {
      pointerId: 1,
      clientX: 380,
      clientY: 450,
    });

    // Pointer up
    fireEvent.pointerUp(launcher, {
      pointerId: 1,
      clientX: 380,
      clientY: 450,
    });

    const saved = safeStorage.getItem(AI_LAUNCHER_STORAGE_KEY);
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.x).toBe(380);
    expect(parsed.y).toBe(450);

    // Clicking immediately after drag should be suppressed
    fireEvent.click(launcher);
    expect(screen.queryByTestId('assistant-drawer')).toBeNull();
  });

  it('renders session switcher bar, allows starting new session and switching back to old session', async () => {
    (aiApi.ai.listSessions as ReturnType<typeof vi.fn>).mockResolvedValue({
      sessions: [
        {
          id: 'sess-1',
          staffId: 99,
          title: 'Báo cáo NOT_COMBO_LIVE',
          scope: 'customers',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'sess-2',
          staffId: 99,
          title: 'Giải thích nhóm khách',
          scope: 'customers',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    (aiApi.ai.getSession as ReturnType<typeof vi.fn>).mockImplementation((id: string) => {
      if (id === 'sess-2') {
        return Promise.resolve({
          session: { id: 'sess-2', staffId: 99, title: 'Giải thích nhóm khách' },
          messages: [
            {
              id: 'm-2',
              sessionId: 'sess-2',
              role: 'assistant',
              content: 'Nội dung phiên giải thích nhóm khách',
              createdAt: new Date().toISOString(),
            },
          ],
        });
      }
      return Promise.resolve({
        session: { id: 'sess-1', staffId: 99, title: 'Báo cáo NOT_COMBO_LIVE' },
        messages: [],
      });
    });

    render(<AIAssistantWidget themeMode="dark" currentUser={mockCurrentUser} onApplyFilter={vi.fn()} />);

    // Open drawer
    await act(async () => {
      fireEvent.click(screen.getByText('mOS Copilot').closest('button')!);
    });

    // Check that session switcher bar is rendered
    expect(screen.getByText('+ Phiên mới')).toBeDefined();
    expect(screen.getByText('Báo cáo NOT_COMBO_LIVE')).toBeDefined();
    expect(screen.getByText('Giải thích nhóm khách')).toBeDefined();

    // Switch to sess-2 by clicking its pill
    const sess2Btn = screen.getByText('Giải thích nhóm khách').closest('div');
    expect(sess2Btn).not.toBeNull();
    await act(async () => {
      fireEvent.click(sess2Btn!);
    });

    expect(aiApi.ai.getSession).toHaveBeenCalledWith('sess-2');
    await waitFor(() => {
      expect(screen.getByText('Nội dung phiên giải thích nhóm khách')).toBeDefined();
    });

    // Click "+ Phiên mới" to start new session
    const newSessBtn = screen.getByText('+ Phiên mới').closest('button');
    await act(async () => {
      fireEvent.click(newSessBtn!);
    });

    // Empty state should be displayed ready for new prompts
    expect(screen.getByText('Không Gian Làm Việc Trợ Lý AI')).toBeDefined();
  });
});
