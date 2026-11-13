import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IosProfileMenuSheet } from '../IosProfileMenuSheet';
import { Screen01IncomingBookings } from '../../screens/Screen01IncomingBookings';
import { ActiveActorProfile } from '../../../state/useIosAppState';
import { BookingItem } from '../../../state/mockData';

const mockToggleTheme = vi.fn();
const mockSetCoreThemeId = vi.fn();

vi.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({
    themeId: 'luxury-gold',
    coreThemeId: 'luxury-gold',
    themeMode: 'dark',
    toggleTheme: mockToggleTheme,
    availableCoreThemes: [
      {
        id: 'luxury-gold',
        label: 'Wings Luxury Gold',
        colors: { primary: '#FFB400' },
      },
      {
        id: 'emerald',
        label: 'Emerald City',
        colors: { primary: '#10B981' },
      },
      {
        id: 'classic-dark',
        label: 'Classic Dark',
        colors: { primary: '#3B82F6' },
      },
    ],
    setCoreThemeId: mockSetCoreThemeId,
  }),
}));

describe('IosProfileMenuSheet Theme & Mode Switching', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.style.removeProperty('--ios-font-scale');
  });

  const defaultActor: ActiveActorProfile = {
    staffId: 889,
    name: 'Thảo Ly',
    tier: 'CVL',
    badgeLabel: 'CVL · Chuyên Viên Tự Chủ',
    storeId: 6,
    branchName: 'Chi nhánh Đề Thám',
  };

  it('renders theme mode buttons and switches light/dark mode', () => {
    render(<IosProfileMenuSheet isOpen={true} onClose={vi.fn()} actor={defaultActor} role="CVL" />);

    const lightBtn = screen.getByRole('button', { name: /Nền Sáng/i });
    const darkBtn = screen.getByRole('button', { name: /Nền Tối/i });

    expect(lightBtn).toBeInTheDocument();
    expect(darkBtn).toBeInTheDocument();

    // Currently dark -> clicking light should toggle
    fireEvent.click(lightBtn);
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);

    // Currently dark -> clicking dark should not trigger toggle since already dark
    fireEvent.click(darkBtn);
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('renders available core themes and triggers theme change', () => {
    render(<IosProfileMenuSheet isOpen={true} onClose={vi.fn()} actor={defaultActor} role="CVL" />);

    expect(screen.getAllByText('Wings Luxury Gold').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Emerald City')).toBeInTheDocument();
    expect(screen.getByText('Classic Dark')).toBeInTheDocument();

    const emeraldBtn = screen.getByText('Emerald City').closest('button');
    expect(emeraldBtn).not.toBeNull();
    fireEvent.click(emeraldBtn!);
    expect(mockSetCoreThemeId).toHaveBeenCalledWith('emerald');
  });

  it('removes footer Đăng xuất and Đóng (Close) buttons while keeping header close and in-menu logout', () => {
    const onClose = vi.fn();
    const onLogout = vi.fn();
    render(<IosProfileMenuSheet isOpen={true} onClose={onClose} onLogout={onLogout} actor={defaultActor} role="CVL" />);

    expect(screen.queryByText('Đóng (Close)')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đăng xuất' })).not.toBeInTheDocument();

    const headerCloseBtn = screen.getByRole('button', { name: 'Đóng menu hồ sơ' });
    fireEvent.click(headerCloseBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    const menuLogoutBtn = screen.getByRole('button', { name: /Đăng xuất tài khoản \(Logout\)/i });
    fireEvent.click(menuLogoutBtn);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('renders Diễm Hương as CC with her own avatar and branch-wide operational scope', () => {
    const ccAvatar = 'https://cdn.wingslashes.com/uploads/user/avatar/407/thumbnail/39407.png';
    const ccActor: ActiveActorProfile = {
      staffId: 37790,
      name: 'Diễm Hương',
      tier: 'CC',
      badgeLabel: 'CC · Tư Vấn Viên',
      avatar: ccAvatar,
      storeId: 6,
      branchName: 'Chi nhánh Đề Thám',
    };

    render(<IosProfileMenuSheet isOpen={true} onClose={vi.fn()} actor={ccActor} role="CC" />);

    expect(screen.getByText('Diễm Hương')).toBeInTheDocument();
    expect(screen.getByText('CC')).toBeInTheDocument();
    const avatarImg = screen.getByAltText('Diễm Hương') as HTMLImageElement;
    expect(avatarImg.getAttribute('src')).toBe(ccAvatar);
    expect(screen.getByText(/Toàn bộ khách hàng tại chi nhánh/i)).toBeInTheDocument();
    expect(screen.queryByText(/1 khách đầu tua \+ khách book đích danh/i)).not.toBeInTheDocument();
  });

  it('renders CC role pill in Screen01IncomingBookings header and does not lock incoming cards for CC', () => {
    const ccActor: ActiveActorProfile = {
      staffId: 37790,
      name: 'Diễm Hương',
      tier: 'CC',
      badgeLabel: 'CC · Tư Vấn Viên',
      avatar: 'https://cdn.wingslashes.com/uploads/user/avatar/407/thumbnail/39407.png',
      storeId: 6,
      branchName: 'Chi nhánh Đề Thám',
    };
    const sampleBookings: BookingItem[] = [
      {
        id: 1001,
        orderNumber: 'BK-1001',
        customerName: 'Nguyên',
        customerPhone: '673394',
        customerId: 101,
        customerVisits: 73,
        customerNote: '',
        timeSlot: '16:30 - 17:40',
        serviceName: 'Classic 1D 440 70',
        servicePrice: 440000,
        serviceDuration: 70,
        status: 'INCOMING',
      },
      {
        id: 1002,
        orderNumber: 'BK-1002',
        customerName: 'Thúy Vi',
        customerPhone: '306326',
        customerId: 102,
        customerVisits: 43,
        customerNote: '',
        timeSlot: '17:00 - 18:10',
        serviceName: 'HyperLight 4X 770 70',
        servicePrice: 770000,
        serviceDuration: 70,
        status: 'SERVICING',
        assignedStaffId: 46272,
        assignedStaffName: 'Thảo Ly',
      },
    ];

    render(
      <Screen01IncomingBookings
        bookings={sampleBookings}
        bookingSegment="INCOMING"
        setBookingSegment={vi.fn()}
        onSelectBooking={vi.fn()}
        activeServicingBooking={sampleBookings[1]}
        role="CC"
        actor={ccActor}
      />
    );

    const profileTrigger = screen.getByTitle('Mở hồ sơ & chuyển vai trò');
    expect(profileTrigger).toHaveTextContent('CC');
    expect(profileTrigger).not.toHaveTextContent('CV');
    expect(screen.queryByText(/Chưa thể check-in/i)).not.toBeInTheDocument();
  });

  it('defaults iOS font scale to 85% and supports Apple slider adjustments', () => {
    render(<IosProfileMenuSheet isOpen={true} onClose={vi.fn()} actor={defaultActor} role="CVL" />);

    expect(screen.getByText('85% · Mặc định')).toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue('--ios-font-scale')).toBe('0.85');

    const increaseBtn = screen.getByRole('button', { name: 'Tăng cỡ chữ' });
    const decreaseBtn = screen.getByRole('button', { name: 'Giảm cỡ chữ' });
    const slider = screen.getByRole('slider', { name: 'Thanh trượt cỡ chữ cá nhân' });

    fireEvent.click(increaseBtn);
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue('--ios-font-scale')).toBe('0.92');

    fireEvent.change(slider, { target: { value: '4' } });
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue('--ios-font-scale')).toBe('1');

    fireEvent.click(decreaseBtn);
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue('--ios-font-scale')).toBe('0.92');
  });

  it('persists personal font size per user across F5 reloads and resets to 85% default', () => {
    window.localStorage.setItem('mos_user', JSON.stringify({ id: 37790, username: 'diemhuong', legacyStaffId: 37790 }));

    const { unmount } = render(<IosProfileMenuSheet isOpen={true} onClose={vi.fn()} actor={defaultActor} role="CC" />);

    const slider = screen.getByRole('slider', { name: 'Thanh trượt cỡ chữ cá nhân' });
    fireEvent.change(slider, { target: { value: '5' } });
    expect(screen.getByText('108%')).toBeInTheDocument();
    expect(window.localStorage.getItem('mos_ios_font_scale:user:37790')).toBe('1.08');

    // Simulate F5 page reload: reset CSS var & remount component for same user
    unmount();
    document.documentElement.style.removeProperty('--ios-font-scale');

    const remounted = render(<IosProfileMenuSheet isOpen={true} onClose={vi.fn()} actor={defaultActor} role="CC" />);
    expect(screen.getByText('108%')).toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue('--ios-font-scale')).toBe('1.08');

    // Different logged-in user has their own independent preference (starts at 85% default)
    remounted.unmount();
    document.documentElement.style.removeProperty('--ios-font-scale');
    window.localStorage.setItem('mos_user', JSON.stringify({ id: 889, username: 'thaoly', legacyStaffId: 889 }));

    const otherUserRender = render(
      <IosProfileMenuSheet isOpen={true} onClose={vi.fn()} actor={defaultActor} role="CVL" />
    );
    expect(screen.getByText('85% · Mặc định')).toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue('--ios-font-scale')).toBe('0.85');
    otherUserRender.unmount();

    // Switch back to Diễm Hương and reset to default 85%
    window.localStorage.setItem('mos_user', JSON.stringify({ id: 37790, username: 'diemhuong', legacyStaffId: 37790 }));
    render(<IosProfileMenuSheet isOpen={true} onClose={vi.fn()} actor={defaultActor} role="CC" />);
    expect(screen.getByText('108%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Đặt lại cỡ chữ mặc định' }));
    expect(screen.getByText('85% · Mặc định')).toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue('--ios-font-scale')).toBe('0.85');
    expect(window.localStorage.getItem('mos_ios_font_scale:user:37790')).toBe('0.85');
  });
});
