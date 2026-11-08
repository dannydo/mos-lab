import React from 'react';
import { describe, it, expect, vi } from 'vitest';
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
});
