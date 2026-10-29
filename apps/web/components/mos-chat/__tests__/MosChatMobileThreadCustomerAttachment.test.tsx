import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { MosChatMessage, MosChatCustomerCard, MosChatThreadReply } from '@mos-lab/shared';
import { MosChatMobileThreadSheet } from '../mobile/MosChatMobileThreadSheet';

const { mockSendThreadReply, mockOpenCustomerDetail, mockContextValue } = vi.hoisted(() => {
  const mockSendThreadReply = vi.fn().mockResolvedValue(true);
  const mockOpenCustomerDetail = vi.fn();

  const sampleCustomerCard: MosChatCustomerCard = {
    customerId: 5678,
    name: 'Nadhira Ulya',
    meta: 'Booking 12:20 · Thiết Kế Mi Tự Nhiên',
    cvName: 'Chi nhánh Estella',
    phone: '0901234567',
  };

  const sampleParentMsg: MosChatMessage = {
    id: 'msg-root-1',
    conversationId: 'space-wings-cs',
    senderId: 'wings-ai-copilot',
    senderName: '🤖 MAI',
    senderRole: 'mOS AI',
    text: 'Chú ơi, theo tinh thần Chân Thành & Khoa Học...',
    timeLabel: '11:28',
    createdAt: '2026-10-29T04:28:00.000Z',
    thread: [
      {
        id: 'reply-1',
        senderId: 6,
        senderName: 'Nguyễn Quang Khải',
        senderRole: 'ADMIN',
        text: 'Đính kèm thẻ khách hàng Nadhira Ulya :',
        customerCard: sampleCustomerCard,
        timeLabel: '12:21',
        createdAt: '2026-10-29T05:21:00.000Z',
        reactions: {},
      },
    ],
  };

  const mockContextValue = {
    currentUser: { id: 6, fullName: 'Nguyễn Quang Khải', role: 'admin' },
    activeConversation: { id: 'space-wings-cs', name: 'Wings CS', type: 'space' },
    staffDirectory: [],
    activeThreadMsg: sampleParentMsg,
    threadReplies: sampleParentMsg.thread as MosChatThreadReply[],
    sendThreadReply: mockSendThreadReply,
    reactToMessage: vi.fn(),
    deleteThreadReply: vi.fn(),
    moveThreadItem: vi.fn(),
    markThreadAsRead: vi.fn(),
    editMessage: vi.fn(),
    setMobileView: vi.fn(),
    tasks: [],
    toggleTaskDone: vi.fn(),
    updateTask: vi.fn(),
    executeMissionAction: vi.fn(),
    isAiThinking: false,
    openCustomerDetail: mockOpenCustomerDetail,
  };

  return { mockSendThreadReply, mockOpenCustomerDetail, mockContextValue, sampleCustomerCard, sampleParentMsg };
});

vi.mock('../context/MosChatContext', () => ({
  MosChatContext: React.createContext(mockContextValue),
  useMosChat: () => mockContextValue,
}));

vi.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({
    themeMode: 'dark',
  }),
}));

vi.mock('../MosChatCustomerPickerModal', () => ({
  MosChatCustomerPickerModal: ({
    open,
    onSelectCustomerCard,
    onClose,
  }: {
    open: boolean;
    onSelectCustomerCard: (card: MosChatCustomerCard, sendImmediately?: boolean) => void;
    onClose: () => void;
  }) => {
    if (!open) return null;
    return (
      <div data-testid="mock-customer-picker-modal">
        <button
          type="button"
          data-testid="select-customer-btn"
          onClick={() =>
            onSelectCustomerCard(
              {
                customerId: 5678,
                name: 'Nadhira Ulya',
                meta: 'Booking 12:20 · Thiết Kế Mi Tự Nhiên',
                cvName: 'Chi nhánh Estella',
                phone: '0901234567',
              },
              false
            )
          }
        >
          Chọn Nadhira Ulya
        </button>
        <button type="button" data-testid="close-picker-btn" onClick={onClose}>
          Đóng
        </button>
      </div>
    );
  },
}));

describe('MosChatMobileThreadSheet - Customer Card Attachment [MOS-BUG-178]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders customer card attachment inside thread reply bubble [MOS-BUG-178]', () => {
    render(<MosChatMobileThreadSheet />);

    // Thẻ khách hàng Nadhira Ulya được render rõ ràng bên trong reply bubble
    expect(screen.getByTestId('mos-chat-customer-card')).toBeInTheDocument();
    expect(screen.getByText('Nadhira Ulya')).toBeInTheDocument();
    expect(screen.getByText(/Booking 12:20 · Thiết Kế Mi Tự Nhiên/)).toBeInTheDocument();
  });

  it('renders attach customer button in toolbar [MOS-BUG-178]', () => {
    render(<MosChatMobileThreadSheet />);

    const attachCustomerBtn = screen.getByRole('button', { name: 'Đính kèm khách hàng' });
    expect(attachCustomerBtn).toBeInTheDocument();
  });

  it('opens customer picker modal and stages customer card inside thread [MOS-BUG-178]', async () => {
    render(<MosChatMobileThreadSheet />);

    const attachCustomerBtn = screen.getByRole('button', { name: 'Đính kèm khách hàng' });
    fireEvent.click(attachCustomerBtn);

    // Modal hiển thị
    expect(screen.getByTestId('mock-customer-picker-modal')).toBeInTheDocument();

    // Chọn khách hàng Nadhira Ulya
    const selectBtn = screen.getByTestId('select-customer-btn');
    fireEvent.click(selectBtn);

    // Modal đóng và hiển thị preview staged customer card trên thanh input của thread
    await waitFor(() => {
      expect(screen.queryByTestId('mock-customer-picker-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('mos-chat-mobile-staged-customer-thread')).toBeInTheDocument();
    });
  });

  it('submits thread reply with customerCard when user clicks send [MOS-BUG-178]', async () => {
    render(<MosChatMobileThreadSheet />);

    // 1. Mở picker và chọn khách
    const attachCustomerBtn = screen.getByRole('button', { name: 'Đính kèm khách hàng' });
    fireEvent.click(attachCustomerBtn);
    const selectBtn = screen.getByTestId('select-customer-btn');
    fireEvent.click(selectBtn);

    await waitFor(() => {
      expect(screen.getByTestId('mos-chat-mobile-staged-customer-thread')).toBeInTheDocument();
    });

    // 2. Nhấn nút Gửi phản hồi luồng
    const sendBtn = screen.getByRole('button', { name: 'Gửi phản hồi luồng' });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(mockSendThreadReply).toHaveBeenCalledWith(
        'Đính kèm thẻ khách hàng Nadhira Ulya:',
        expect.objectContaining({
          customerCard: expect.objectContaining({
            customerId: 5678,
            name: 'Nadhira Ulya',
          }),
        })
      );
    });
  });
});
