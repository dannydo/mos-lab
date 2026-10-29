import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { MosChatMessage, MosChatCustomerCard } from '@mos-lab/shared';
import { MosChatCustomerCardAttachment } from '../components/MosChatCustomerCardAttachment';
import { MosChatMobileMessageItem } from '../mobile/MosChatMobileMessageItem';
import { MosChatMobileComposer } from '../mobile/MosChatMobileComposer';

const { mockOpenCustomerDetail, mockSendMessage, mockContextValue } = vi.hoisted(() => {
  const mockOpenCustomerDetail = vi.fn();
  const mockSendMessage = vi.fn().mockResolvedValue(true);
  const mockContextValue = {
    currentUser: { id: 1, fullName: 'Danny Do', role: 'admin' },
    reactToMessage: vi.fn(),
    setSelectedMsgForAction: vi.fn(),
    setReplyingToMessage: vi.fn(),
    messages: [],
    staffDirectory: [],
    sendMessage: mockSendMessage,
    openCustomerDetail: mockOpenCustomerDetail,
    activeConversation: { id: 'conv-test', name: 'wings-cs', type: 'space' },
  };
  return { mockOpenCustomerDetail, mockSendMessage, mockContextValue };
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

describe('MosChatCustomerCardAttachment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleCard: MosChatCustomerCard = {
    customerId: 1234,
    name: 'Huyền',
    meta: 'Booking 11:45 · New Classic 390',
    cvName: 'Chi nhánh Estella Place',
    phone: '0909123456',
  };

  it('renders customer name, booking metadata and cv/branch correctly', () => {
    render(<MosChatCustomerCardAttachment card={sampleCard} />);

    expect(screen.getByTestId('mos-chat-customer-card')).toBeInTheDocument();
    expect(screen.getByText('Huyền')).toBeInTheDocument();
    expect(screen.getByText(/Booking 11:45 · New Classic 390/)).toBeInTheDocument();
    expect(screen.getByText(/Chi nhánh Estella Place/)).toBeInTheDocument();
  });

  it('renders customer avatar image when avatarUrl is provided [MOS-BUG-175]', () => {
    const cardWithAvatar: MosChatCustomerCard = {
      ...sampleCard,
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120',
    };
    render(<MosChatCustomerCardAttachment card={cardWithAvatar} />);

    const avatarEl = screen.getByTestId('mos-chat-customer-card-avatar');
    expect(avatarEl).toBeInTheDocument();
    const imgEl = avatarEl.querySelector('img');
    expect(imgEl).toHaveAttribute('src', cardWithAvatar.avatarUrl);
  });

  it('renders customer initials when avatarUrl is absent [MOS-BUG-175]', () => {
    render(<MosChatCustomerCardAttachment card={sampleCard} />);

    const avatarEl = screen.getByTestId('mos-chat-customer-card-avatar');
    expect(avatarEl).toBeInTheDocument();
    expect(avatarEl).toHaveTextContent('H');
  });

  it('calls openCustomerDetail when clicking the attachment card or external link button', () => {
    render(<MosChatCustomerCardAttachment card={sampleCard} />);

    const cardEl = screen.getByTestId('mos-chat-customer-card');
    fireEvent.click(cardEl);
    expect(mockOpenCustomerDetail).toHaveBeenCalledWith(1234);

    mockOpenCustomerDetail.mockClear();

    const openBtn = screen.getByLabelText('Mở hồ sơ khách hàng');
    fireEvent.click(openBtn);
    expect(mockOpenCustomerDetail).toHaveBeenCalledWith(1234);
  });

  it('resolves string customerId and meta fallback #id when opening customer details [MOS-BUG-179]', () => {
    // String customerId
    const cardWithStringId = { ...sampleCard, customerId: '9999' as unknown as number };
    const { unmount } = render(<MosChatCustomerCardAttachment card={cardWithStringId} />);
    fireEvent.click(screen.getByTestId('mos-chat-customer-card'));
    expect(mockOpenCustomerDetail).toHaveBeenCalledWith(9999);
    unmount();

    mockOpenCustomerDetail.mockClear();

    // Meta fallback #7777
    const cardWithMetaFallback: MosChatCustomerCard = {
      name: 'Thu Trang',
      meta: 'Booking 14:00 · #7777 Thiết Kế Mi',
    };
    render(<MosChatCustomerCardAttachment card={cardWithMetaFallback} />);
    fireEvent.click(screen.getByTestId('mos-chat-customer-card'));
    expect(mockOpenCustomerDetail).toHaveBeenCalledWith(7777);
  });
});

describe('MosChatMobileMessageItem with customerCard [MOS-BUG-168]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders customer attachment card inside mobile chat bubble', () => {
    const messageWithCard: MosChatMessage = {
      id: 'msg-101',
      conversationId: 'conv-test',
      senderId: 6,
      senderName: 'Nguyễn Quang Khải',
      senderRole: 'ADMIN',
      text: 'Chị rụng hơn 10 sợi tại chỗ :< @Bảo Hân chăm chị thêm nhé',
      timeLabel: '17:16',
      createdAt: '2026-10-28T10:16:00.000Z',
      customerCard: {
        customerId: 5678,
        name: 'Huyền',
        meta: 'Booking 11:45 · New Classic 390',
        cvName: 'Chi nhánh Estella Place',
      },
    };

    render(<MosChatMobileMessageItem message={messageWithCard} />);

    // Text content
    expect(screen.getByText(/Chị rụng hơn 10 sợi tại chỗ/)).toBeInTheDocument();

    // Customer Card Attachment must be rendered on mobile
    expect(screen.getByTestId('mos-chat-customer-card')).toBeInTheDocument();
    expect(screen.getByText('Huyền')).toBeInTheDocument();
    expect(screen.getByText(/Booking 11:45 · New Classic 390/)).toBeInTheDocument();
    expect(screen.getByText('Chi nhánh Estella Place')).toBeInTheDocument();

    // Clicking card opens customer detail drawer
    fireEvent.click(screen.getByTestId('mos-chat-customer-card'));
    expect(mockOpenCustomerDetail).toHaveBeenCalledWith(5678);
  });
});

describe('MosChatMobileComposer with customerCard staging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const stagedCard: MosChatCustomerCard = {
    customerId: 8888,
    name: 'Khánh Vy',
    meta: 'Combo Volume 500k',
    cvName: 'Bảo Hân',
  };

  it('renders staged customer card preview and triggers onRemoveCustomerCard', () => {
    const handleRemove = vi.fn();

    render(
      <MosChatMobileComposer
        onOpenActionSheet={vi.fn()}
        onOpenStickerSheet={vi.fn()}
        stagedCustomerCard={stagedCard}
        onRemoveCustomerCard={handleRemove}
      />
    );

    expect(screen.getByTestId('mos-chat-mobile-staged-customer')).toBeInTheDocument();
    expect(screen.getByText('Khánh Vy')).toBeInTheDocument();
    expect(screen.getByText('(Combo Volume 500k)')).toBeInTheDocument();

    // Clicking staged card opens customer detail [MOS-BUG-179]
    fireEvent.click(screen.getByTestId('mos-chat-mobile-staged-customer'));
    expect(mockOpenCustomerDetail).toHaveBeenCalledWith(8888);

    const removeBtn = screen.getByLabelText('Bỏ đính kèm thẻ khách hàng');
    fireEvent.click(removeBtn);
    expect(handleRemove).toHaveBeenCalledTimes(1);
  });

  it('sends customerCard when user submits the message', async () => {
    const handleRemove = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <MosChatMobileComposer
        onOpenActionSheet={vi.fn()}
        onOpenStickerSheet={vi.fn()}
        stagedCustomerCard={stagedCard}
        onRemoveCustomerCard={handleRemove}
        onSendSuccess={handleSuccess}
        text="Chăm sóc giúp chị này nhé"
      />
    );

    const sendBtn = screen.getByLabelText('Gửi tin nhắn');
    fireEvent.click(sendBtn);

    expect(mockSendMessage).toHaveBeenCalledWith(
      'Chăm sóc giúp chị này nhé',
      expect.objectContaining({
        customerCard: stagedCard,
      })
    );
  });

  it('sends customerCard with fallback text when user submits without typing text', async () => {
    const handleRemove = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <MosChatMobileComposer
        onOpenActionSheet={vi.fn()}
        onOpenStickerSheet={vi.fn()}
        stagedCustomerCard={stagedCard}
        onRemoveCustomerCard={handleRemove}
        onSendSuccess={handleSuccess}
        text=""
      />
    );

    const sendBtn = screen.getByLabelText('Gửi tin nhắn');
    fireEvent.click(sendBtn);

    expect(mockSendMessage).toHaveBeenCalledWith(
      'Đính kèm thẻ khách hàng Khánh Vy',
      expect.objectContaining({
        customerCard: stagedCard,
      })
    );
  });
});
