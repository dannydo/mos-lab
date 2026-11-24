import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, renderHook } from '@testing-library/react';
import type { MosChatCustomerCard } from '@mos-lab/shared';
import {
  clearRecentMosChatDials,
  dispatchOpenMosChatOmiCallDialer,
  isValidDialablePhone,
  MOS_CHAT_OPEN_OMICALL_DIALER_EVENT,
  normalizeVietnamDialPhone,
  readRecentMosChatDials,
  saveRecentMosChatDial,
} from '../utils/omicall-dial-helpers';

const { mockMakeCall, mockCustomersList, mockOmiCallState, mockOpenCustomerDetail, mockMessageInfo } = vi.hoisted(
  () => {
    const mockMakeCall = vi.fn().mockResolvedValue(undefined);
    const mockCustomersList = vi.fn().mockResolvedValue({ data: [] });
    const mockOpenCustomerDetail = vi.fn();
    const mockMessageInfo = vi.fn();
    const mockOmiCallState = {
      canAccessOmiCall: true,
      isAdmin: true,
      adminOmiCallEnabled: false,
      isRegistered: true,
      isSimulated: false,
      omicallReady: true,
      sipConfig: { sipUser: '106' },
      callState: 'idle' as 'idle' | 'confirming' | 'ringing' | 'incoming' | 'connected' | 'analyzing' | 'wrapup',
      makeCall: mockMakeCall,
    };
    return { mockMakeCall, mockCustomersList, mockOmiCallState, mockOpenCustomerDetail, mockMessageInfo };
  }
);

vi.mock('../../../context/OmiCallContext', () => ({
  useOmiCall: () => mockOmiCallState,
}));

vi.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({
    themeMode: 'dark',
  }),
}));

vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    customers: {
      list: mockCustomersList,
    },
  },
}));

vi.mock('../context/MosChatContext', () => {
  const ctxVal = {
    currentUser: { id: 1, fullName: 'Danny Do', role: 'super_admin' },
    conversations: [],
    activeConversation: null,
    staffDirectory: [],
    openCustomerDetail: mockOpenCustomerDetail,
  };
  return {
    MosChatContext: React.createContext(ctxVal),
    useMosChat: () => ctxVal,
  };
});

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg></svg>' }),
  },
}));

vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd');
  return {
    ...actual,
    message: {
      ...actual.message,
      info: mockMessageInfo,
      warning: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

import { MosChatOmiCallDialerModal } from '../modals/MosChatOmiCallDialerModal';
import { MosChatCustomerCardAttachment } from '../components/MosChatCustomerCardAttachment';
import { MosChatRichText } from '../MosChatRichText';
import { useOmiCallActions } from '../../../context/omicall/useOmiCallActions';

describe('omicall-dial-helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('normalizes Vietnamese phone numbers accurately', () => {
    expect(normalizeVietnamDialPhone('0909 123 456')).toBe('0909123456');
    expect(normalizeVietnamDialPhone('+84 909.123.456')).toBe('0909123456');
    expect(normalizeVietnamDialPhone('84912345678')).toBe('0912345678');
    expect(normalizeVietnamDialPhone('1900 1234')).toBe('19001234');
  });

  it('validates dialable phone numbers and rejects masked/invalid values', () => {
    expect(isValidDialablePhone('0909 123 456')).toBe(true);
    expect(isValidDialablePhone('+84909123456')).toBe(true);
    expect(isValidDialablePhone('028 3822 1234')).toBe(true);
    expect(isValidDialablePhone('1900 1234')).toBe(true);

    expect(isValidDialablePhone('090****123')).toBe(false);
    expect(isValidDialablePhone('090912')).toBe(false);
    expect(isValidDialablePhone('2026-11-24')).toBe(false);
    expect(isValidDialablePhone('150.000')).toBe(false);
    expect(isValidDialablePhone('')).toBe(false);
  });

  it('dedupes recent dials and caps storage at 8 entries', () => {
    for (let i = 0; i < 10; i++) {
      saveRecentMosChatDial(99, {
        phone: `090900000${i}`,
        name: `Khách ${i}`,
      });
    }
    // Re-dial an earlier number to move it to the top and dedupe
    saveRecentMosChatDial(99, {
      phone: '+84 909 000 001',
      name: 'Khách 1 Updated',
    });

    const list = readRecentMosChatDials(99);
    expect(list).toHaveLength(8);
    expect(list[0].phone).toBe('0909000001');
    expect(list[0].name).toBe('Khách 1 Updated');

    clearRecentMosChatDials(99);
    expect(readRecentMosChatDials(99)).toEqual([]);
  });
});

describe('MosChatOmiCallDialerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockOmiCallState.canAccessOmiCall = true;
    mockOmiCallState.callState = 'idle';
    mockOmiCallState.isAdmin = true;
    mockOmiCallState.adminOmiCallEnabled = false;
    mockCustomersList.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when canAccessOmiCall is false', () => {
    mockOmiCallState.canAccessOmiCall = false;
    const { container } = render(<MosChatOmiCallDialerModal isDark={true} open={true} />);
    expect(container.firstChild).toBeNull();
  });

  it('opens via dispatchOpenMosChatOmiCallDialer event with prefill and triggers makeCall', async () => {
    render(<MosChatOmiCallDialerModal isDark={true} currentUser={{ id: 7 }} />);

    act(() => {
      dispatchOpenMosChatOmiCallDialer({
        phone: '0909 123 456',
        name: 'Chị Lan',
        customerId: 42,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Gọi số điện thoại qua OmiCall')).toBeInTheDocument();
      expect(screen.getByText('Chị Lan')).toBeInTheDocument();
    });

    const submitBtn = screen.getByTestId('mos-chat-omicall-dial-submit-btn');
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMakeCall).toHaveBeenCalledWith('0909123456', 'Chị Lan', 42, undefined, undefined, {
        autoEnableAdmin: true,
      });
    });
  });

  it('supports clicking dialpad digits, backspace, and dialing via Enter', async () => {
    render(<MosChatOmiCallDialerModal isDark={false} currentUser={{ id: 8 }} open={true} />);

    const digits = ['0', '9', '0', '9', '1', '2', '3', '4', '5', '6', '9'];
    for (const d of digits) {
      fireEvent.click(screen.getByLabelText(`Phím ${d}`));
    }
    // Remove extra trailing 9
    fireEvent.click(screen.getByLabelText('Xoá 1 ký tự'));

    const input = screen.getByLabelText('Nhập số điện thoại hoặc tên khách hàng') as HTMLInputElement;
    expect(input.value).toBe('0909123456');

    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mockMakeCall).toHaveBeenCalledWith('0909123456', 'Khách hàng', undefined, undefined, undefined, {
        autoEnableAdmin: true,
      });
    });
  });

  it('searches CRM customers by phone/name and supports 1-click dial', async () => {
    mockCustomersList.mockResolvedValue({
      data: [{ id: 501, name: 'Ngọc Hân', phone: '0918222333', avatar: null }],
    });

    render(<MosChatOmiCallDialerModal isDark={true} currentUser={{ id: 9 }} open={true} />);

    const input = screen.getByLabelText('Nhập số điện thoại hoặc tên khách hàng');
    fireEvent.change(input, { target: { value: 'Ngọc Hân' } });

    await waitFor(
      () => {
        expect(mockCustomersList).toHaveBeenCalledWith({
          search: 'Ngọc Hân',
          limit: 5,
          assignedStaffId: 'all',
        });
        expect(screen.getByText('Ngọc Hân')).toBeInTheDocument();
      },
      { timeout: 1500 }
    );

    const callRowBtn = screen.getByRole('button', { name: 'Gọi' });
    fireEvent.click(callRowBtn);

    await waitFor(() => {
      expect(mockMakeCall).toHaveBeenCalledWith('0918222333', 'Ngọc Hân', 501, undefined, undefined, {
        autoEnableAdmin: true,
      });
    });
  });

  it('disables dialing when callState is not idle', () => {
    mockOmiCallState.callState = 'connected';
    render(
      <MosChatOmiCallDialerModal
        isDark={true}
        open={true}
        initialPrefill={{ phone: '0909123456', name: 'Chị Lan', customerId: 42 }}
      />
    );

    expect(screen.getByText(/Đang có cuộc gọi diễn ra/i)).toBeInTheDocument();
    expect(screen.getByTestId('mos-chat-omicall-dial-submit-btn')).toBeDisabled();
  });
});

describe('MosChatCustomerCardAttachment OmiCall button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOmiCallState.canAccessOmiCall = true;
  });

  const baseCard: MosChatCustomerCard = {
    customerId: 1234,
    name: 'Huyền',
    meta: 'Booking 11:45',
    phone: '0909 123 456',
  };

  it('renders 1-click OmiCall button when authorized and phone is unmasked', () => {
    render(<MosChatCustomerCardAttachment card={baseCard} />);
    const callBtn = screen.getByTestId('mos-chat-customer-card-omicall-btn');
    fireEvent.click(callBtn);

    expect(mockMakeCall).toHaveBeenCalledWith('0909123456', 'Huyền', 1234, undefined, undefined, {
      autoEnableAdmin: true,
    });
    expect(mockOpenCustomerDetail).not.toHaveBeenCalled();
  });

  it('hides OmiCall button when phone is masked or user lacks access', () => {
    const { rerender } = render(<MosChatCustomerCardAttachment card={{ ...baseCard, phone: '090****456' }} />);
    expect(screen.queryByTestId('mos-chat-customer-card-omicall-btn')).toBeNull();

    mockOmiCallState.canAccessOmiCall = false;
    rerender(<MosChatCustomerCardAttachment card={baseCard} />);
    expect(screen.queryByTestId('mos-chat-customer-card-omicall-btn')).toBeNull();
  });
});

describe('MosChatRichText clickable phone numbers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOmiCallState.canAccessOmiCall = true;
  });

  it('renders clickable OmiCall chip for VN phone numbers and ignores dates, prices, and URLs', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    render(
      <MosChatRichText
        content="Gọi chị Lan số 0909 123 456 ngày 2026-11-24 giá 150.000đ link https://wingslashes.com/0909123456"
        isDark={true}
      />
    );

    const phoneButtons = screen.getAllByTestId('mos-chat-inline-phone-btn');
    expect(phoneButtons).toHaveLength(1);
    expect(phoneButtons[0]).toHaveTextContent('0909 123 456');

    fireEvent.click(phoneButtons[0]);
    const customEvents = dispatchSpy.mock.calls
      .map((c) => c[0])
      .filter((ev): ev is CustomEvent => ev instanceof CustomEvent && ev.type === MOS_CHAT_OPEN_OMICALL_DIALER_EVENT);
    expect(customEvents.length).toBe(1);
    expect(customEvents[0].detail).toEqual({ phone: '0909 123 456' });
    dispatchSpy.mockRestore();
  });
});

describe('useOmiCallActions autoEnableAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('auto-enables Admin OmiCall when autoEnableAdmin=true, while blocking default makeCall when disabled', async () => {
    const setAdminOmiCallEnabled = vi.fn();
    const setCallState = vi.fn();
    const setCurrentCall = vi.fn();
    const setOmicallReadyState = vi.fn();
    const setShouldInit = vi.fn();

    const { result } = renderHook(() =>
      useOmiCallActions({
        canAccessOmiCall: true,
        isAdmin: true,
        adminOmiCallEnabled: false,
        setAdminOmiCallEnabled,
        isTabMuted: false,
        isSimulated: false,
        isRegistered: false,
        sipConfig: null,
        currentCall: null,
        isHeld: false,
        isSdkReadyRef: { current: false },
        pendingOutboundCallRef: { current: null },
        simulatedTimerRef: { current: null },
        currentCallRef: { current: null },
        initOmiCallSdk: () => false,
        refreshAudioDevices: async () => {},
        setOmicallReadyState,
        setShouldInit,
        setCallState,
        setCurrentCall,
        setIsSimulated: vi.fn(),
        setIsMuted: vi.fn(),
        setIsHeld: vi.fn(),
        setCallLogCustomerInfo: vi.fn(),
        setIsCallLogModalOpen: vi.fn(),
      })
    );

    // Without autoEnableAdmin -> blocked with info message
    await act(async () => {
      await result.current.makeCall('0909123456', 'Khách Test', 10);
    });
    expect(setAdminOmiCallEnabled).not.toHaveBeenCalled();
    expect(setCallState).not.toHaveBeenCalled();
    expect(mockMessageInfo).toHaveBeenCalled();

    // With autoEnableAdmin -> auto-enables and enters confirming state
    await act(async () => {
      await result.current.makeCall('+84909123456', 'Khách Test', 10, undefined, undefined, {
        autoEnableAdmin: true,
      });
    });
    expect(setAdminOmiCallEnabled).toHaveBeenCalledWith(true);
    expect(setCallState).toHaveBeenCalledWith('confirming');
    expect(setCurrentCall).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '0909123456',
        name: 'Khách Test',
        legacyUserId: 10,
        direction: 'outbound',
      })
    );
  });
});
