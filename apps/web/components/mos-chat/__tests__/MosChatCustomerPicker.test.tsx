import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MosChatCustomerPickerModal } from '../MosChatCustomerPickerModal';
import { SAMPLE_CUSTOMER_CARDS } from '../constants/chat-constants';
import { MosChatComposer, type MosChatComposerProps } from '../components/MosChatComposer';
import type { MosChatMessage, MosChatCustomerCard } from '@mos-lab/shared';

vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    customers: {
      list: vi.fn(),
      getAppointments: vi.fn(),
    },
  },
}));

import { apiClient } from '../../../lib/api-client';

describe('MosChatCustomerPickerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with tabs and sample cards when open', () => {
    const handleClose = vi.fn();
    const handleSelect = vi.fn();

    render(
      <MosChatCustomerPickerModal
        open={true}
        onClose={handleClose}
        onSelectCustomerCard={handleSelect}
      />
    );

    expect(screen.getByText('Đính kèm thẻ Khách hàng / Booking mOS')).toBeInTheDocument();
    expect(screen.getByText('Tra cứu Khách hàng')).toBeInTheDocument();
    expect(screen.getByText(/Lịch hẹn hôm nay/)).toBeInTheDocument();
    expect(screen.getByText('Thẻ Mẫu Nhanh')).toBeInTheDocument();
  });

  it('allows selecting sample card and triggers onSelectCustomerCard with sendImmediately false', () => {
    const handleClose = vi.fn();
    const handleSelect = vi.fn();

    render(
      <MosChatCustomerPickerModal
        open={true}
        onClose={handleClose}
        onSelectCustomerCard={handleSelect}
      />
    );

    fireEvent.click(screen.getByText('Thẻ Mẫu Nhanh'));

    const attachButtons = screen.getAllByRole('button', { name: /Đính kèm/i });
    expect(attachButtons.length).toBeGreaterThan(0);
    fireEvent.click(attachButtons[0]);

    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        name: SAMPLE_CUSTOMER_CARDS[0].name,
      }),
      false
    );
  });

  it('allows clicking send now on sample card and triggers onSelectCustomerCard with sendImmediately true', () => {
    const handleClose = vi.fn();
    const handleSelect = vi.fn();

    render(
      <MosChatCustomerPickerModal
        open={true}
        onClose={handleClose}
        onSelectCustomerCard={handleSelect}
      />
    );

    fireEvent.click(screen.getByText('Thẻ Mẫu Nhanh'));

    const sendButtons = screen.getAllByRole('button', { name: /Gửi ngay/i });
    expect(sendButtons.length).toBeGreaterThan(0);
    fireEvent.click(sendButtons[0]);

    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        name: SAMPLE_CUSTOMER_CARDS[0].name,
      }),
      true
    );
  });

  it('searches customers from API and displays results', async () => {
    const mockList = vi.fn().mockResolvedValue({
      data: [
        {
          id: 101,
          name: 'Võ Thị Mai Phương',
          phone: '0901234567',
          bucket: 'COMBO_LIVE',
          totalVisits: 12,
          assignedStaff: { displayName: 'Thúy Vi' },
        },
      ],
      meta: { total: 1 },
    });
    (apiClient.customers.list as any) = mockList;

    const handleClose = vi.fn();
    const handleSelect = vi.fn();

    render(
      <MosChatCustomerPickerModal
        open={true}
        onClose={handleClose}
        onSelectCustomerCard={handleSelect}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Tìm theo tên khách, số điện thoại/i);
    fireEvent.change(searchInput, { target: { value: 'Mai Phương' } });

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'Mai Phương',
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Võ Thị Mai Phương')).toBeInTheDocument();
      expect(screen.getByText('0901234567')).toBeInTheDocument();
    });

    const attachButton = screen.getByRole('button', { name: /Đính kèm/i });
    fireEvent.click(attachButton);

    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 101,
        name: 'Võ Thị Mai Phương',
        phone: '0901234567',
      }),
      false
    );
  });
});

describe('MosChatComposer Customer Card Staging', () => {
  const defaultComposerProps: Partial<MosChatComposerProps> = {
    isMobile: false,
    activeConversation: { id: 'space-test', type: 'space', name: 'General' } as any,
    currentUser: { id: 1, displayName: 'Danny' } as any,
    canUseAiCopilot: true,
    isStrictDannySuperAdmin: true,
    aiThinkingActive: false,
    isDark: true,
    token: { colorText: '#fff', colorBgElevated: '#1f1f1f' } as any,
    surfaceBg: '#141414',
    surfaceRaised: '#1f1f1f',
    borderColor: '#303030',
    borderStrong: '#444',
    composerText: '',
    setComposerText: vi.fn(),
    composerCursorPos: 0,
    setComposerCursorPos: vi.fn(),
    composerInputRef: { current: null },
    stagedAttachments: [],
    renderStagedAttachmentsStrip: () => null,
    isUrgentSend: false,
    setIsUrgentSend: vi.fn(),
    handleSendMessage: vi.fn(),
    handleSendMain: vi.fn(),
    triggerFilePicker: vi.fn(),
    handleSendQuickCustomerCard: vi.fn(),
    openTaskModalFromMessage: vi.fn(),
    checkForMentionTrigger: vi.fn(),
    handleClipboardPaste: vi.fn(),
    handleMentionKeyDown: vi.fn(),
    handleApplyFormat: vi.fn(),
    renderMentionAutocompleteDropdown: () => null,
    renderAppleNotesFormatToolbar: () => null,
    renderComposerEmojiPickerContent: () => null,
    renderRichTextMessage: (t) => t,
    setDriveLinkModalOpen: vi.fn(),
    uploadTargetRef: { current: null },
    setTriggerWorkflowModalOpen: vi.fn(),
    setInitialWorkflowCode: vi.fn(),
    setRichEditorModalState: vi.fn(),
    isComposingRef: { current: false },
    lastCompositionEndMsRef: { current: 0 },
  };

  it('displays staged customer card preview and allows removing it', () => {
    const handleRemove = vi.fn();
    const handleOpenPicker = vi.fn();
    const stagedCard: MosChatCustomerCard = {
      customerId: 999,
      name: 'Nguyễn Thị Hoa',
      meta: 'VIP Combo · 15 lần ghé',
      phone: '0912345678',
    };

    render(
      <MosChatComposer
        {...(defaultComposerProps as MosChatComposerProps)}
        handleOpenCustomerPicker={handleOpenPicker}
        stagedCustomerCard={stagedCard}
        setStagedCustomerCard={handleRemove}
      />
    );

    expect(screen.getByText('Nguyễn Thị Hoa')).toBeInTheDocument();
    expect(screen.getByText(/VIP Combo · 15 lần ghé/)).toBeInTheDocument();

    const removeBtn = screen.getByLabelText('Bỏ đính kèm thẻ khách hàng');
    fireEvent.click(removeBtn);
    expect(handleRemove).toHaveBeenCalledWith(null);
  });

  it('triggers handleOpenCustomerPicker when clicking attach button', () => {
    const handleOpenPicker = vi.fn();

    render(
      <MosChatComposer
        {...(defaultComposerProps as MosChatComposerProps)}
        handleOpenCustomerPicker={handleOpenPicker}
        stagedCustomerCard={null}
        setStagedCustomerCard={vi.fn()}
      />
    );

    const attachBtn = screen.getByLabelText('Đính kèm thẻ Khách hàng');
    fireEvent.click(attachBtn);
    expect(handleOpenPicker).toHaveBeenCalled();
  });
});
