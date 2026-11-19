import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import AvatarPromptModal from '../AvatarPromptModal';
import { apiClient } from '../../../lib/api-client';

vi.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'light' }),
}));

vi.mock('../AvatarCropModal', () => ({
  default: () => null,
}));

describe('AvatarPromptModal', () => {
  const userWithoutAvatar = {
    id: 42,
    username: 'danny',
    displayName: 'Danny Do',
    role: 'admin',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    vi.spyOn(apiClient.ai, 'getAvatarNudge').mockResolvedValue({
      angelAction: 'dụ dỗ',
      angelIcon: '🍎',
      badge: 'Đang dụ dỗ 🍎',
      greeting: 'Chào bạn!',
      banter: 'Cập nhật avatar ngay nhé!',
      callToAction: 'Chụp ảnh ngay',
      ctaText: 'Chụp ảnh ngay',
      snoozeText: 'Để mai mình đổi nha',
      isBanter: false,
    });
  });

  const wrap = (ui: React.ReactElement) => (
    <ConfigProvider theme={{ token: { motion: false } }}>{ui}</ConfigProvider>
  );

  it('closes when clicking the close icon and does not reopen when currentUser refreshes', async () => {
    const onClose = vi.fn();
    const { rerender } = render(wrap(<AvatarPromptModal currentUser={userWithoutAvatar} onClose={onClose} />));

    await waitFor(() => {
      expect(screen.getByText('Đại Sứ Thương Hiệu mOS')).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    // Simulate background auth.me() updating currentUser with a fresh object reference
    rerender(
      wrap(
        <AvatarPromptModal
          currentUser={{ ...userWithoutAvatar, displayName: 'Danny Do Updated' }}
          onClose={onClose}
        />
      )
    );

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('stays dismissed across remount in the same session, but opens when forceOpen is true', async () => {
    const { unmount } = render(wrap(<AvatarPromptModal currentUser={userWithoutAvatar} />));

    await waitFor(() => {
      expect(screen.getByText('Đại Sứ Thương Hiệu mOS')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    unmount();

    // Remount without forceOpen: remains closed for the session
    const { rerender } = render(wrap(<AvatarPromptModal currentUser={userWithoutAvatar} />));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    // Explicitly forced open (e.g. from profile): opens cleanly
    rerender(wrap(<AvatarPromptModal currentUser={userWithoutAvatar} forceOpen />));
    await waitFor(() => {
      expect(screen.getByText('Đại Sứ Thương Hiệu mOS')).toBeInTheDocument();
    });
  });
});
