import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MosChatConversation, MosChatGoogleWorkspacePreviewResponse } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { clearGoogleWorkspaceClientCache, openGoogleWorkspaceReader } from '../utils/google-workspace-bridge';
import { MosChatGoogleWorkspaceCardList } from '../components/MosChatGoogleWorkspaceCard';
import {
  MOS_CHAT_GW_DRAWER_SESSION_KEY,
  MOS_CHAT_GW_DRAWER_WIDTH_KEY,
  MosChatGoogleWorkspaceDrawer,
} from '../components/MosChatGoogleWorkspaceDrawer';
import { MosChatFilesPane, countConversationSharedWorkspaceItems } from '../components/MosChatFilesPane';

vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    chat: {
      previewGoogleWorkspace: vi.fn(),
    },
    ai: {
      sendMessage: vi.fn(),
    },
  },
}));

const SHEETS_URL =
  'https://docs.google.com/spreadsheets/d/1_T_X3L12RWMs1LRjAROBKSbQiN-hUCJwCOmtC8uULFQ/edit?gid=516151439#gid=516151439&range=D17';
const DOCS_URL = 'https://docs.google.com/document/d/1AbCdEfGhIjKlMnOpQrStUvWxYz123456/edit';
const CANVA_SHORT_URL = 'https://canva.link/leea2jxg31jg7hy';

describe('mOS Chat Google Workspace Reader & Files Integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearGoogleWorkspaceClientCache();
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders Sheets preview card with NVL/Mi tabs and highlights cell D17', async () => {
    const mockPreview: MosChatGoogleWorkspacePreviewResponse = {
      success: true,
      kind: 'spreadsheet',
      fileId: '1_T_X3L12RWMs1LRjAROBKSbQiN-hUCJwCOmtC8uULFQ',
      title: 'Kho Đề Thám - Tồn Kho',
      accessStatus: 'PUBLIC_LINK',
      requestedRange: 'D17',
      parsedRange: {
        label: 'D17',
        anchorCell: 'D17',
        startCol: 3,
        endCol: 3,
        startRow: 17,
        endRow: 17,
      },
      tabs: [
        { sheetId: 516151439, gid: '516151439', title: 'NVL', rowCount: 40 },
        { sheetId: 998877, gid: '998877', title: 'Mi', rowCount: 25 },
      ],
      activeTab: {
        gid: '516151439',
        title: 'NVL',
        totalRows: 40,
        totalCols: 5,
        rows: [],
        snippetRowStart: 16,
        snippetColStart: 1,
        snippetColHeaders: ['B', 'C', 'D', 'E'],
        snippetRows: [
          { rowNumber: 16, cells: ['Keo đen', 'Chai', '12', 'Đủ'] },
          { rowNumber: 17, cells: ['Mi Khay 0.07', 'Hộp', '3', 'Thiếu kho'] },
        ],
      },
      serviceAccountEmail: 'wings-sheets-sa@wings-lashes.iam.gserviceaccount.com',
      canonicalUrl: SHEETS_URL,
      embedUrl:
        'https://docs.google.com/spreadsheets/d/1_T_X3L12RWMs1LRjAROBKSbQiN-hUCJwCOmtC8uULFQ/edit?gid=516151439&range=D17&rm=minimal#gid=516151439',
      fetchedAt: new Date().toISOString(),
    };

    vi.mocked(apiClient.chat.previewGoogleWorkspace).mockResolvedValueOnce(mockPreview);

    const { container } = render(
      <MosChatGoogleWorkspaceCardList
        text={`Em gửi anh bảng tồn kho: ${SHEETS_URL}`}
        conversationId="space-kho"
        messageId="msg-1"
        isDark={true}
      />
    );

    const card = await screen.findByTestId('google-workspace-preview-card');
    expect(card).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Kho Đề Thám - Tồn Kho')).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /NVL/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /Mi/ })).toBeDefined();

    const highlighted = container.querySelector('[data-highlighted-cell="true"]');
    expect(highlighted).not.toBeNull();
    expect(highlighted?.textContent).toBe('3');
  });

  it('renders NEEDS_SHARE onboarding banner with mOS Bot email and copies email on click', async () => {
    const needsSharePreview: MosChatGoogleWorkspacePreviewResponse = {
      success: true,
      kind: 'document',
      fileId: '1AbCdEfGhIjKlMnOpQrStUvWxYz123456',
      title: 'Bảng Nội Bộ Chưa Cấp Quyền',
      accessStatus: 'NEEDS_SHARE',
      serviceAccountEmail: 'wings-sheets-sa@wings-lashes.iam.gserviceaccount.com',
      canonicalUrl: DOCS_URL,
      embedUrl: `${DOCS_URL}?rm=minimal`,
      fetchedAt: new Date().toISOString(),
    };

    vi.mocked(apiClient.chat.previewGoogleWorkspace).mockResolvedValueOnce(needsSharePreview);

    render(
      <MosChatGoogleWorkspaceCardList text={DOCS_URL} conversationId="space-kho" messageId="msg-2" isDark={true} />
    );

    await waitFor(() => {
      expect(screen.getByText('wings-sheets-sa@wings-lashes.iam.gserviceaccount.com')).toBeDefined();
    });

    const copyBtn = screen.getByRole('button', { name: /Sao chép email mOS Bot/ });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('wings-sheets-sa@wings-lashes.iam.gserviceaccount.com');
  });

  it('opens split drawer, toggles Đọc nhanh mOS <-> Google Trực tiếp, closes from top-right [X], and posts @AI reply', async () => {
    const fullRows: string[][] = Array.from({ length: 20 }, (_, idx) => [
      `VT-${idx + 1}`,
      `Vật tư ${idx + 1}`,
      'Hộp',
      idx === 16 ? '3 hộp thiếu' : '10',
      'Ghi chú',
    ]);

    const drawerPreview: MosChatGoogleWorkspacePreviewResponse = {
      success: true,
      kind: 'spreadsheet',
      fileId: '1_T_X3L12RWMs1LRjAROBKSbQiN-hUCJwCOmtC8uULFQ',
      title: 'Kho Đề Thám - Chi Tiết',
      accessStatus: 'PUBLIC_LINK',
      requestedRange: 'D17',
      parsedRange: {
        label: 'D17',
        anchorCell: 'D17',
        startCol: 3,
        endCol: 3,
        startRow: 17,
        endRow: 17,
      },
      tabs: [{ sheetId: 516151439, gid: '516151439', title: 'NVL', rowCount: 20 }],
      activeTab: {
        gid: '516151439',
        title: 'NVL',
        totalRows: 20,
        totalCols: 5,
        rows: fullRows,
      },
      serviceAccountEmail: 'wings-sheets-sa@wings-lashes.iam.gserviceaccount.com',
      canonicalUrl: SHEETS_URL,
      embedUrl:
        'https://docs.google.com/spreadsheets/d/1_T_X3L12RWMs1LRjAROBKSbQiN-hUCJwCOmtC8uULFQ/edit?gid=516151439&range=D17&rm=minimal#gid=516151439',
      fetchedAt: new Date().toISOString(),
    };

    vi.mocked(apiClient.chat.previewGoogleWorkspace).mockResolvedValue(drawerPreview);
    const aiTimestamp = new Date().toISOString();
    vi.mocked(apiClient.ai.sendMessage).mockResolvedValueOnce({
      sessionId: 'sess-gw-1',
      source: 'gemini',
      session: {
        id: 'sess-gw-1',
        staffId: 1,
        title: 'Kho Đề Thám - Chi Tiết',
        scope: 'mos-chat-space:space-kho',
        createdAt: aiTimestamp,
        updatedAt: aiTimestamp,
      },
      message: {
        id: 'ai-1',
        sessionId: 'sess-gw-1',
        role: 'assistant',
        content: 'Cần nhập bổ sung Mi Khay 0.07 ngay hôm nay.',
        createdAt: aiTimestamp,
      },
    });

    const onPostAiReplyToChat = vi.fn();

    const { container } = render(
      <MosChatGoogleWorkspaceDrawer
        isDark={true}
        activeConversationId="space-kho"
        onPostAiReplyToChat={onPostAiReplyToChat}
      />
    );

    act(() => {
      openGoogleWorkspaceReader({
        url: SHEETS_URL,
        gid: '516151439',
        range: 'D17',
        conversationId: 'space-kho',
        messageId: 'm-1',
        initialMode: 'fast',
      });
    });

    const drawer = await screen.findByTestId('google-workspace-split-drawer');
    expect(drawer).toBeDefined();

    const closeBtn = screen.getByLabelText('Đóng trình đọc tài liệu');
    expect(closeBtn).toBeDefined();

    await waitFor(() => {
      const targetCell = container.querySelector('[data-cell-address="D17"]');
      expect(targetCell).not.toBeNull();
      expect(targetCell?.getAttribute('data-highlighted-cell')).toBe('true');
      expect(targetCell?.textContent).toContain('3 hộp thiếu');
    });

    // Toggle to Google Trực tiếp embed mode
    fireEvent.click(screen.getByRole('button', { name: /Google Trực tiếp/ }));
    const iframe = await screen.findByTestId('gw-reader-embed-iframe');
    expect(iframe.getAttribute('src')).toContain('rm=minimal');

    // Toggle back to Đọc nhanh mOS
    fireEvent.click(screen.getByRole('button', { name: /Đọc nhanh mOS/ }));
    expect(screen.queryByTestId('gw-reader-embed-iframe')).toBeNull();

    // Open @AI bar and trigger quick prompt
    fireEvent.click(screen.getByRole('button', { name: /Hỏi @AI/ }));
    fireEvent.click(screen.getByRole('button', { name: /Tóm tắt tài liệu/ }));

    await waitFor(() => {
      expect(apiClient.ai.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'mos-chat-space:space-kho',
          message: expect.stringContaining(SHEETS_URL),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Cần nhập bổ sung Mi Khay 0\.07 ngay hôm nay\./)).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Gửi vào phòng chat/ }));
    expect(onPostAiReplyToChat).toHaveBeenCalledWith(
      'Cần nhập bổ sung Mi Khay 0.07 ngay hôm nay.',
      'Kho Đề Thám - Chi Tiết'
    );

    // Close drawer from top-right [X]
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('google-workspace-split-drawer')).toBeNull();
  });

  it('aggregates Sheets, Docs, and attachments in MosChatFilesPane and filters by category', () => {
    const now = new Date().toISOString();
    const conv: MosChatConversation = {
      id: 'space-kho',
      type: 'space',
      name: 'Kho Đề Thám',
      color: '#10b981',
      unreadCount: 0,
      updatedAt: now,
      messages: [
        {
          id: 'm-1',
          conversationId: 'space-kho',
          senderId: 10,
          senderName: 'Bảo Hân',
          senderRole: 'Admin',
          text: `Gửi anh sheet kiểm kho ${SHEETS_URL}`,
          timeLabel: '13:39',
          createdAt: now,
          attachments: [
            {
              id: 'att-1',
              url: '/uploads/bao-cao-kho.png',
              name: 'bao-cao-kho.png',
              mimeType: 'image/png',
              sizeBytes: 20480,
            },
          ],
          thread: [
            {
              id: 'r-1',
              senderId: 6,
              senderName: 'Danny Do',
              senderRole: 'Admin',
              text: `Quy trình kiểm kê chuẩn: ${DOCS_URL}`,
              timeLabel: '13:45',
              createdAt: now,
            },
          ],
        },
      ],
    };

    expect(countConversationSharedWorkspaceItems(conv)).toBe(3);

    const setActiveSubtab = vi.fn();
    const navigateToMessage = vi.fn();

    render(
      <MosChatFilesPane
        activeConversation={conv}
        setActiveSubtab={setActiveSubtab}
        navigateToMessage={navigateToMessage}
        isDark={true}
        surfaceBg="#0f172a"
        surfaceRaised="#1e293b"
        borderColor="rgba(148, 163, 184, 0.2)"
      />
    );

    // 'Tất cả' shows 2 Google Workspace items + 1 attachment
    expect(screen.getAllByTestId('mos-chat-files-gw-item')).toHaveLength(2);
    expect(screen.getAllByTestId('mos-chat-files-att-item')).toHaveLength(1);

    // Filter to Google Sheets
    fireEvent.click(screen.getByRole('button', { name: /Google Sheets/ }));
    expect(screen.getAllByTestId('mos-chat-files-gw-item')).toHaveLength(1);
    expect(screen.queryByTestId('mos-chat-files-att-item')).toBeNull();

    // Filter to Google Docs
    fireEvent.click(screen.getByRole('button', { name: /Google Docs/ }));
    expect(screen.getAllByTestId('mos-chat-files-gw-item')).toHaveLength(1);
    expect(screen.queryByTestId('mos-chat-files-att-item')).toBeNull();

    // Filter to Tệp & Ảnh
    fireEvent.click(screen.getByRole('button', { name: /Tệp & Ảnh/ }));
    expect(screen.queryByTestId('mos-chat-files-gw-item')).toBeNull();
    expect(screen.getAllByTestId('mos-chat-files-att-item')).toHaveLength(1);
    expect(screen.getByText('bao-cao-kho.png')).toBeDefined();
  });

  it('renders all columns A..H even when leading/empty rows are [] and clears D17 lock when switching tabs', async () => {
    const initialTabPreview: MosChatGoogleWorkspacePreviewResponse = {
      success: true,
      kind: 'spreadsheet',
      fileId: '1_T_X3L12RWMs1LRjAROBKSbQiN-hUCJwCOmtC8uULFQ',
      title: '[HR][2025] TỔNG HỢP',
      accessStatus: 'SERVICE_ACCOUNT',
      requestedRange: 'D17',
      parsedRange: {
        label: 'D17',
        anchorCell: 'D17',
        startCol: 3,
        endCol: 3,
        startRow: 17,
        endRow: 17,
      },
      tabs: [
        { sheetId: 516151439, gid: '516151439', title: 'ORDER KHO NVL', rowCount: 40 },
        { sheetId: 998877, gid: '998877', title: 'DROPDOWN', rowCount: 1000 },
      ],
      activeTab: {
        gid: '516151439',
        title: 'ORDER KHO NVL',
        totalRows: 20,
        totalCols: 8,
        rows: [
          [],
          [],
          ['A3', 'B3', 'C3', 'D3', 'E3', 'F3'],
          ...Array.from({ length: 14 }, (_, idx) => [`R${idx + 4}`, 'Val B', 'Val C', idx === 13 ? 'Target D17' : 'D']),
        ],
      },
      serviceAccountEmail: 'wings-sheets-sa@wings-lashes.iam.gserviceaccount.com',
      canonicalUrl: SHEETS_URL,
      embedUrl: `${SHEETS_URL}&rm=minimal`,
      fetchedAt: new Date().toISOString(),
    };

    const dropdownTabPreview: MosChatGoogleWorkspacePreviewResponse = {
      ...initialTabPreview,
      activeTab: {
        gid: '998877',
        title: 'DROPDOWN',
        totalRows: 1000,
        totalCols: 8,
        rows: [[], ['', 'Danh mục B', 'Danh mục C', 'Danh mục D', 'Danh mục E', 'Danh mục F']],
      },
    };

    vi.mocked(apiClient.chat.previewGoogleWorkspace).mockImplementation(async (params) => {
      if (params.gid === '998877') return dropdownTabPreview;
      return initialTabPreview;
    });

    const { container } = render(<MosChatGoogleWorkspaceDrawer isDark={true} activeConversationId="space-kho" />);

    act(() => {
      openGoogleWorkspaceReader({
        url: SHEETS_URL,
        gid: '516151439',
        range: 'D17',
        conversationId: 'space-kho',
      });
    });

    await waitFor(() => {
      const headers = Array.from(container.querySelectorAll('thead th')).map((th) => th.textContent?.trim());
      expect(headers).toEqual(['#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    });
    expect(screen.getByText('Đang trỏ: D17')).toBeDefined();

    // Switch to DROPDOWN tab and confirm D17 lock clears while B, C, D... stay visible
    fireEvent.click(screen.getByRole('button', { name: /DROPDOWN/ }));

    await waitFor(() => {
      expect(screen.getByText('Danh mục B')).toBeDefined();
      expect(screen.getByText('Danh mục D')).toBeDefined();
    });
    expect(screen.queryByText('Đang trỏ: D17')).toBeNull();
    const headersAfterSwitch = Array.from(container.querySelectorAll('thead th')).map((th) => th.textContent?.trim());
    expect(headersAfterSwitch).toEqual(['#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
  });

  it('resizes right drawer wider than 1000px via left drag handle and persists both width and open session across F5 remount', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1920 });

    const mockPreview: MosChatGoogleWorkspacePreviewResponse = {
      success: true,
      kind: 'spreadsheet',
      fileId: '1_T_X3L12RWMs1LRjAROBKSbQiN-hUCJwCOmtC8uULFQ',
      title: '[HR][2025] TỔNG HỢP',
      accessStatus: 'PUBLIC_LINK',
      tabs: [
        { sheetId: 516151439, gid: '516151439', title: 'NVL', rowCount: 40 },
        { sheetId: 998877, gid: '998877', title: 'BẢNG LƯƠNG', rowCount: 1000 },
      ],
      activeTab: {
        gid: '516151439',
        title: 'NVL',
        totalRows: 10,
        totalCols: 6,
        rows: [['Mã', 'Tên', 'Cột C', 'Cột D', 'Cột E', 'Cột F']],
      },
      serviceAccountEmail: 'wings-sheets-sa@wings-lashes.iam.gserviceaccount.com',
      canonicalUrl: SHEETS_URL,
      embedUrl: `${SHEETS_URL}&rm=minimal`,
      fetchedAt: new Date().toISOString(),
    };

    vi.mocked(apiClient.chat.previewGoogleWorkspace).mockResolvedValue(mockPreview);

    const view1 = render(<MosChatGoogleWorkspaceDrawer isDark={true} activeConversationId="space-kho" />);

    act(() => {
      openGoogleWorkspaceReader({
        url: SHEETS_URL,
        gid: '516151439',
        range: 'D17',
        conversationId: 'space-kho',
      });
    });

    const drawer = await screen.findByTestId('google-workspace-split-drawer');
    expect(drawer.style.width).toBe('680px');

    // Switch tab before drag & reload
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /BẢNG LƯƠNG/ })).toBeDefined();
    });
    fireEvent.click(screen.getByRole('button', { name: /BẢNG LƯƠNG/ }));

    // Drag left handle wider (680 + (1240 - 680) = 1240px > 1000px)
    const handle = screen.getByTestId('gw-reader-resize-handle');
    fireEvent.mouseDown(handle, { clientX: 1240, button: 0 });
    fireEvent.mouseMove(window, { clientX: 680 });
    fireEvent.mouseUp(window);

    expect(drawer.style.width).toBe('1240px');
    expect(window.localStorage.getItem(MOS_CHAT_GW_DRAWER_WIDTH_KEY)).toBe('1240');
    expect(window.localStorage.getItem(MOS_CHAT_GW_DRAWER_SESSION_KEY)).toContain('998877');

    // Simulate F5 reload by unmounting, wiping in-memory client cache, and mounting fresh without calling openGoogleWorkspaceReader
    view1.unmount();
    clearGoogleWorkspaceClientCache();
    vi.mocked(apiClient.chat.previewGoogleWorkspace).mockClear();

    render(<MosChatGoogleWorkspaceDrawer isDark={true} activeConversationId="space-kho" />);

    const restoredDrawer = await screen.findByTestId('google-workspace-split-drawer');
    expect(restoredDrawer.style.width).toBe('1240px');

    await waitFor(() => {
      expect(apiClient.chat.previewGoogleWorkspace).toHaveBeenCalledWith(
        expect.objectContaining({
          gid: '998877',
        })
      );
    });

    // Closing drawer clears session open state so next F5 stays closed, while width stays persisted
    fireEvent.click(screen.getByLabelText('Đóng trình đọc tài liệu'));
    expect(screen.queryByTestId('google-workspace-split-drawer')).toBeNull();
    expect(window.localStorage.getItem(MOS_CHAT_GW_DRAWER_SESSION_KEY)).toBeNull();
    expect(window.localStorage.getItem(MOS_CHAT_GW_DRAWER_WIDTH_KEY)).toBe('1240');
  });

  it('renders Canva preview card with 1-tap inline embed, Split Drawer embed/fast toggle, private banner, and Files filter', async () => {
    const canvaPreview: MosChatGoogleWorkspacePreviewResponse = {
      success: true,
      kind: 'canva',
      fileId: 'DAHbDO6HA6o',
      canonicalUrl: 'https://www.canva.com/design/DAHbDO6HA6o/BJIbSltALDzXJWELsU_BsQ/edit',
      embedUrl: 'https://www.canva.com/design/DAHbDO6HA6o/BJIbSltALDzXJWELsU_BsQ/view?embed&meta',
      title: 'TỔNG QUAN',
      authorName: 'Wings Lashes studio',
      designType: 'Whiteboard',
      embedWidth: 1920,
      embedHeight: 1080,
      accessStatus: 'PUBLIC_LINK',
      serviceAccountEmail: 'wings-sheets-sa@wings-lashes.iam.gserviceaccount.com',
      headings: [
        { id: 'canva-h-0', level: 1, text: 'TỔNG QUAN' },
        { id: 'canva-h-1', level: 1, text: 'VỀ QUY TRÌNH' },
      ],
      sections: [
        { id: 'canva-h-0', type: 'heading', level: 1, text: 'TỔNG QUAN' },
        { id: 'canva-h-1', type: 'heading', level: 1, text: 'VỀ QUY TRÌNH' },
        {
          id: 'canva-p-2',
          type: 'paragraph',
          text: 'Giao diện kiểm kho trên App Hàng New đã được check 694/1308',
        },
      ],
      excerpt: 'Giao diện kiểm kho trên App Hàng New đã được check 694/1308',
      plainText: 'TỔNG QUAN\nVỀ QUY TRÌNH\nGiao diện kiểm kho trên App Hàng New đã được check 694/1308',
      fetchedAt: new Date().toISOString(),
    };

    vi.mocked(apiClient.chat.previewGoogleWorkspace).mockResolvedValue(canvaPreview);

    render(
      <>
        <MosChatGoogleWorkspaceCardList
          text={CANVA_SHORT_URL}
          conversationId="space-kho"
          messageId="msg-c1"
          isDark={true}
        />
        <MosChatGoogleWorkspaceDrawer isDark={true} activeConversationId="space-kho" />
      </>
    );

    await waitFor(() => {
      expect(screen.getAllByText('TỔNG QUAN').length).toBeGreaterThan(0);
    });
    expect(screen.getByText(/Canva Whiteboard · Wings Lashes studio/)).toBeDefined();

    // Inline iframe stays lazy until toggled on
    expect(screen.queryByTestId('canva-inline-embed-iframe')).toBeNull();
    fireEvent.click(screen.getByTestId('canva-inline-embed-toggle'));
    const inlineIframe = screen.getByTestId('canva-inline-embed-iframe') as HTMLIFrameElement;
    expect(inlineIframe.src).toContain('/view?embed');

    // Opening side drawer defaults Canva links to interactive 'Canva Trực tiếp' mode
    fireEvent.click(screen.getByRole('button', { name: /Đọc bên cạnh/ }));
    const drawer = await screen.findByTestId('google-workspace-split-drawer');
    expect(drawer.getAttribute('aria-label')).toBe('Trình đọc thiết kế Canva');
    const drawerIframe = (await screen.findByTestId('gw-reader-embed-iframe')) as HTMLIFrameElement;
    expect(drawerIframe.src).toContain('/view?embed');

    // Toggle to extracted text mode ('Đọc nhanh văn bản')
    fireEvent.click(within(drawer).getByRole('button', { name: /Đọc nhanh văn bản/ }));
    expect(await within(drawer).findByText(/check 694\/1308/)).toBeDefined();

    // Check private Canva NEEDS_SHARE guidance & Files pane filter
    const privateCanvaPreview: MosChatGoogleWorkspacePreviewResponse = {
      ...canvaPreview,
      success: false,
      fileId: 'DAHbPrivate1',
      accessStatus: 'NEEDS_SHARE',
      title: 'Thiết kế Canva (Chưa mở quyền xem)',
    };
    clearGoogleWorkspaceClientCache();
    vi.mocked(apiClient.chat.previewGoogleWorkspace).mockResolvedValueOnce(privateCanvaPreview);

    const mockConversation: MosChatConversation = {
      id: 'space-kho',
      type: 'space',
      name: 'hoà-nhập-kho-đt---ep-với-mos',
      color: '#1a73e8',
      unreadCount: 0,
      updatedAt: '2026-11-16T07:46:30.000Z',
      messages: [
        {
          id: 'msg-c1',
          conversationId: 'space-kho',
          senderId: 13,
          senderName: 'Bảo Hân',
          senderRole: 'Admin',
          text: `@Danny Do Đố anh đọc cái này ${CANVA_SHORT_URL}`,
          timeLabel: '14:46',
          createdAt: '2026-11-16T07:46:30.000Z',
        },
        {
          id: 'msg-s1',
          conversationId: 'space-kho',
          senderId: 13,
          senderName: 'Bảo Hân',
          senderRole: 'Admin',
          text: SHEETS_URL,
          timeLabel: '13:39',
          createdAt: '2026-11-15T06:39:00.000Z',
        },
      ],
    };

    expect(countConversationSharedWorkspaceItems(mockConversation)).toBe(2);

    render(
      <>
        <MosChatGoogleWorkspaceCardList
          text="https://www.canva.com/design/DAHbPrivate1/view"
          conversationId="space-kho"
          messageId="msg-c2"
          isDark={true}
        />
        <MosChatFilesPane
          activeConversation={mockConversation}
          setActiveSubtab={vi.fn()}
          navigateToMessage={vi.fn()}
          isDark={true}
          surfaceBg="#0f172a"
          surfaceRaised="#1e293b"
          borderColor="#334155"
        />
      </>
    );

    await waitFor(() => {
      expect(screen.getByText('Thiết kế Canva đang bật chế độ riêng tư')).toBeDefined();
    });
    const filesPane = screen.getByTestId('mos-chat-files-pane');
    const canvaFilterBtn = within(filesPane).getByRole('button', { name: /Thiết kế Canva/ });
    expect(canvaFilterBtn).toBeDefined();
    fireEvent.click(canvaFilterBtn);
    expect(within(filesPane).getByText(/Google Sheets, Docs & Canva \(1\)/)).toBeDefined();
  });
});
