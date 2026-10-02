import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TelesaleTvLiveCelebrationBanner } from './TelesaleTvLiveCelebrationBanner';
import { ActiveCelebration } from '../hooks/useTelesaleTvLiveCelebration';

describe('TelesaleTvLiveCelebrationBanner', () => {
  it('renders Book celebration overlay with full-screen dialog role, staff name, avatar, and quote', () => {
    const celebration: ActiveCelebration = {
      id: 'book-test-1',
      kind: 'BOOK',
      staffName: 'Bích Phượng',
      avatarUrl: 'https://avatar/phuong.jpg',
      textToSpeak: 'Ting ting! Bích Phượng vừa chốt thêm một lịch, nóng máy rồi nha!',
      badgeText: '+1 BOOK HÔM NAY',
      colorTheme: 'blue',
    };

    render(<TelesaleTvLiveCelebrationBanner celebration={celebration} isSpeaking={true} />);

    const dialog = screen.getByRole('dialog', { name: /Live Voice Celebration Overlay/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveClass('fixed', 'inset-0');

    expect(screen.getByText('+1 BOOK HÔM NAY')).toBeInTheDocument();
    expect(screen.getByText('Bích Phượng')).toBeInTheDocument();
    expect(
      screen.getByText(/“Ting ting! Bích Phượng vừa chốt thêm một lịch, nóng máy rồi nha!”/)
    ).toBeInTheDocument();
    expect(screen.getByText('Đang phát loa...')).toBeInTheDocument();
    expect(screen.getByText(/MỞ KHÓA THÀNH TÍCH · MORE BOOK/i)).toBeInTheDocument();
  });

  it('renders Done celebration overlay with initials and achievement styling', () => {
    const celebration: ActiveCelebration = {
      id: 'done-test-1',
      kind: 'DONE',
      staffName: 'Thuý Kiều',
      avatarUrl: null,
      textToSpeak: 'Boom! Thuý Kiều vừa mang về thêm một Done!',
      badgeText: '+1 DONE HÔM NAY',
      colorTheme: 'emerald',
    };

    render(<TelesaleTvLiveCelebrationBanner celebration={celebration} isSpeaking={false} />);

    expect(screen.getByText('+1 DONE HÔM NAY')).toBeInTheDocument();
    expect(screen.getByText('Thuý Kiều')).toBeInTheDocument();
    expect(screen.getByText(/“Boom! Thuý Kiều vừa mang về thêm một Done!”/)).toBeInTheDocument();
    expect(screen.getByText(/MỞ KHÓA THÀNH TÍCH · MORE DONE/i)).toBeInTheDocument();
    // Initials TK
    expect(screen.getByText('TK')).toBeInTheDocument();
  });

  it('renders Milestone celebration overlay with trophy and grand achievement header', () => {
    const celebration: ActiveCelebration = {
      id: 'milestone-test-1',
      kind: 'MILESTONE',
      textToSpeak: 'Đỉnh cao! Team đã chính thức cán mốc 25 Book hôm nay! Xuất sắc!',
      badgeText: '👑 CÁN MỐC 25 BOOK!',
      colorTheme: 'amber',
    };

    render(<TelesaleTvLiveCelebrationBanner celebration={celebration} isSpeaking={true} />);

    expect(screen.getByText('👑 CÁN MỐC 25 BOOK!')).toBeInTheDocument();
    expect(
      screen.getByText(/“Đỉnh cao! Team đã chính thức cán mốc 25 Book hôm nay! Xuất sắc!”/)
    ).toBeInTheDocument();
    expect(screen.getByText(/ĐỈNH CAO THÀNH TÍCH · MILESTONE MỚI/i)).toBeInTheDocument();
  });

  it('applies fade-out class when isFadingOut is true', () => {
    const celebration: ActiveCelebration = {
      id: 'fade-test',
      kind: 'BOOK',
      staffName: 'Bích Phượng',
      textToSpeak: 'Thử fade out',
      badgeText: '+1 BOOK HÔM NAY',
      colorTheme: 'blue',
    };

    render(
      <TelesaleTvLiveCelebrationBanner celebration={celebration} isSpeaking={false} isFadingOut={true} />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('opacity-0');
  });

  it('returns null when celebration is null', () => {
    const { container } = render(<TelesaleTvLiveCelebrationBanner celebration={null} />);
    expect(container.firstChild).toBeNull();
  });
});
