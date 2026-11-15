import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MosChatConversation, MosChatGoogleWorkspacePreviewResponse } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { clearGoogleWorkspaceClientCache, openGoogleWorkspaceReader } from '../utils/google-workspace-bridge';
import { MosChatGoogleWorkspaceCardList } from '../components/MosChatGoogleWorkspaceCard';
import { MosChatGoogleWorkspaceDrawer } from '../components/MosChatGoogleWorkspaceDrawer';
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

describe('mOS Chat Google Workspace Reader & Files Integration', () => {
  beforeEach(() => {
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
});
