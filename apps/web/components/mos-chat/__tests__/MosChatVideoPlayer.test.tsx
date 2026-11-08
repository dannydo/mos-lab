import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MosChatVideoPlayer } from '../components/MosChatVideoPlayer';
import type { MosChatImageAttachment } from '@mos-lab/shared';

// Mock ThemeContext
vi.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'dark' }),
}));

describe('MosChatVideoPlayer', () => {
  const movAttachment: MosChatImageAttachment = {
    id: 'att-video-1',
    url: '/api/chat/media/e38eacc6-aa61-4e1a-9d33-90be603bf808.mov',
    name: 'IMG_5903.mov',
    mimeType: 'video/quicktime',
    sizeBytes: 10161623,
    isVideo: true,
    fileExt: 'mov',
  };

  it('renders video player with file name, size, and MP4 fallback source', () => {
    const { container } = render(<MosChatVideoPlayer attachment={movAttachment} />);

    expect(screen.getByText('IMG_5903.mov')).toBeDefined();
    expect(screen.getByText('MOV')).toBeDefined();

    // Check sources
    const sources = container.querySelectorAll('source');
    expect(sources.length).toBeGreaterThanOrEqual(1);

    const mp4Source = Array.from(sources).find((s) => s.getAttribute('type') === 'video/mp4');
    expect(mp4Source).toBeDefined();
    expect(mp4Source?.getAttribute('src')).toContain('.mp4');
  });

  it('renders portrait phone-sized layout with fullscreen button on desktop', () => {
    const { container } = render(<MosChatVideoPlayer attachment={movAttachment} />);

    // Fullscreen button is present in the toolbar
    const fsButton = screen.getByLabelText('Xem toàn màn hình');
    expect(fsButton).toBeDefined();

    // The video wrapper maintains portrait 9:16 phone sizing
    const viewport = container.querySelector('.bg-black');
    expect(viewport).toBeDefined();
    expect((viewport as HTMLElement).style.aspectRatio).toBe('9 / 16');
  });

  it('displays processing state clearly when attachment is marked as processing', () => {
    const processingAttachment: MosChatImageAttachment = {
      ...movAttachment,
      isProcessing: true,
      processingStatus: 'Đang tối ưu hóa định dạng video MP4 chuẩn web...',
    };

    render(<MosChatVideoPlayer attachment={processingAttachment} />);

    expect(screen.getByText('Đang xử lý video...')).toBeDefined();
    expect(screen.getByText('Đang tối ưu hóa định dạng video MP4 chuẩn web...')).toBeDefined();
    expect(screen.getByText('Tải tệp gốc về máy')).toBeDefined();
  });

  it('displays user-friendly error fallback with download & retry buttons when video triggers error', () => {
    const { container } = render(<MosChatVideoPlayer attachment={movAttachment} />);

    const videoEl = container.querySelector('video');
    expect(videoEl).toBeDefined();

    // Simulate video decode or network error
    fireEvent.error(videoEl!);

    expect(screen.getByText('Không thể phát trực tiếp trên trình duyệt')).toBeDefined();
    expect(screen.getByText(/chưa được trình duyệt giải mã trực tiếp/i)).toBeDefined();
    expect(screen.getByText('Tải về máy (MOV)')).toBeDefined();
    expect(screen.getByText('Thử lại')).toBeDefined();
  });

  it('calls webkitEnterFullscreen on mobile video element when play is triggered', async () => {
    // Mock userAgent to simulate iPhone
    const originalUa = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      configurable: true,
    });

    const enterFullscreenMock = vi.fn();
    const playMock = vi.fn().mockResolvedValue(undefined);

    const { container } = render(<MosChatVideoPlayer attachment={movAttachment} />);

    const videoEl = container.querySelector('video') as any;
    expect(videoEl).toBeDefined();
    videoEl.webkitEnterFullscreen = enterFullscreenMock;
    videoEl.play = playMock;

    // Click play overlay button
    const playOverlay = container.querySelector('.cursor-pointer');
    if (playOverlay) {
      fireEvent.click(playOverlay);
    }

    expect(playMock).toHaveBeenCalled();
    expect(enterFullscreenMock).toHaveBeenCalled();

    // Restore userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUa,
      configurable: true,
    });
  });
});
