import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TelesaleTvLiveCelebrationBanner } from './TelesaleTvLiveCelebrationBanner';
import { ActiveCelebration } from '../hooks/useTelesaleTvLiveCelebration';

describe('TelesaleTvLiveCelebrationBanner', () => {
  it('renders Book celebration banner with staff name, avatar, and quote', () => {
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

    expect(screen.getByText('+1 BOOK HÔM NAY')).toBeInTheDocument();
    expect(screen.getByText('Bích Phượng')).toBeInTheDocument();
    expect(
      screen.getByText(/“Ting ting! Bích Phượng vừa chốt thêm một lịch, nóng máy rồi nha!”/)
    ).toBeInTheDocument();
    expect(screen.getByText('Đang phát loa...')).toBeInTheDocument();
  });

  it('renders Done celebration banner correctly', () => {
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
  });

  it('renders Milestone celebration banner correctly', () => {
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
  });

  it('returns null when celebration is null', () => {
    const { container } = render(<TelesaleTvLiveCelebrationBanner celebration={null} />);
    expect(container.firstChild).toBeNull();
  });
});
