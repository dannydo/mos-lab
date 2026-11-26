import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isSupportedVideoFile,
  isVideoAttachment,
  formatVideoDuration,
  MAX_CHAT_VIDEO_BYTES,
  MAX_CHAT_VIDEOS_PER_MESSAGE,
  MAX_CONCURRENT_CHAT_VIDEO_UPLOADS,
} from './chat-video';
import { uploadSingleChatVideo } from './chat-upload';
import { apiClient } from '../../../lib/api-client';
import type { MosChatImageAttachment } from '@mos-lab/shared';

vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    chat: {
      initVideoUpload: vi.fn(),
      uploadVideoChunk: vi.fn(),
      completeVideoUpload: vi.fn(),
      abortVideoUpload: vi.fn(),
    },
  },
}));

describe('mOS Chat Video Invariants (MOS-CHAT-VIDEO)', () => {
  describe('isSupportedVideoFile', () => {
    it('detects video files by MIME type including M4V', () => {
      const fileMp4 = new File(['mock'], 'demo.mp4', { type: 'video/mp4' });
      const fileWebm = new File(['mock'], 'demo.webm', { type: 'video/webm' });
      const fileMov = new File(['mock'], 'demo.mov', { type: 'video/quicktime' });
      const fileM4v = new File(['mock'], 'demo.m4v', { type: 'video/x-m4v' });

      expect(isSupportedVideoFile(fileMp4)).toBe(true);
      expect(isSupportedVideoFile(fileWebm)).toBe(true);
      expect(isSupportedVideoFile(fileMov)).toBe(true);
      expect(isSupportedVideoFile(fileM4v)).toBe(true);
    });

    it('detects video files by extension when MIME type is missing or generic', () => {
      const fileWithoutMime = new File(['mock'], 'screen_record.MP4');
      const fileWebmExt = new File(['mock'], 'bug_report.webm');
      const fileMovExt = new File(['mock'], 'iphone_record.mov');
      const fileM4vExt = new File(['mock'], 'iphone_record.m4v');

      expect(isSupportedVideoFile(fileWithoutMime)).toBe(true);
      expect(isSupportedVideoFile(fileWebmExt)).toBe(true);
      expect(isSupportedVideoFile(fileMovExt)).toBe(true);
      expect(isSupportedVideoFile(fileM4vExt)).toBe(true);
    });

    it('returns false for non-video files (images, PDFs, documents)', () => {
      const fileImage = new File(['mock'], 'photo.png', { type: 'image/png' });
      const filePdf = new File(['mock'], 'doc.pdf', { type: 'application/pdf' });
      const fileExe = new File(['mock'], 'app.exe');

      expect(isSupportedVideoFile(fileImage)).toBe(false);
      expect(isSupportedVideoFile(filePdf)).toBe(false);
      expect(isSupportedVideoFile(fileExe)).toBe(false);
    });
  });

  describe('isVideoAttachment', () => {
    it('detects video attachment with explicit isVideo flag', () => {
      const att: MosChatImageAttachment = {
        id: 'att-v1',
        url: '/api/chat/media/123.mp4',
        name: 'video.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 1024,
        isVideo: true,
      };
      expect(isVideoAttachment(att)).toBe(true);
    });

    it('detects video attachment by video/* MIME type', () => {
      const att: MosChatImageAttachment = {
        id: 'att-v2',
        url: '/api/chat/media/456.bin',
        name: 'clip',
        mimeType: 'video/webm',
        sizeBytes: 2048,
      };
      expect(isVideoAttachment(att)).toBe(true);
    });

    it('detects video attachment by file extension in url or name', () => {
      const att: MosChatImageAttachment = {
        id: 'att-v3',
        url: '/api/chat/media/789.mov',
        name: 'recorded.mov',
        mimeType: 'application/octet-stream',
        sizeBytes: 4096,
      };
      expect(isVideoAttachment(att)).toBe(true);
    });

    it('returns false for standard images and documents', () => {
      const imageAtt: MosChatImageAttachment = {
        id: 'att-img',
        url: '/api/chat/media/abc.jpg',
        name: 'photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 512,
      };
      const pdfAtt: MosChatImageAttachment = {
        id: 'att-pdf',
        url: '/api/chat/media/def.pdf',
        name: 'report.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
      };

      expect(isVideoAttachment(imageAtt)).toBe(false);
      expect(isVideoAttachment(pdfAtt)).toBe(false);
      expect(isVideoAttachment(null)).toBe(false);
    });
  });

  describe('formatVideoDuration', () => {
    it('formats 0 or undefined as 00:00', () => {
      expect(formatVideoDuration(0)).toBe('00:00');
      expect(formatVideoDuration(undefined)).toBe('00:00');
      expect(formatVideoDuration(-5)).toBe('00:00');
    });

    it('formats single digit seconds with leading zero', () => {
      expect(formatVideoDuration(7)).toBe('00:07');
    });

    it('formats standard MM:SS accurately', () => {
      expect(formatVideoDuration(45)).toBe('00:45');
      expect(formatVideoDuration(75)).toBe('01:15');
      expect(formatVideoDuration(125)).toBe('02:05');
      expect(formatVideoDuration(600)).toBe('10:00');
    });
  });

  describe('100MB chunked video upload limits and retry behavior', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('exposes 100MB, 5 videos/message, and 2 concurrent limits', () => {
      expect(MAX_CHAT_VIDEO_BYTES).toBe(100 * 1024 * 1024);
      expect(MAX_CHAT_VIDEOS_PER_MESSAGE).toBe(5);
      expect(MAX_CONCURRENT_CHAT_VIDEO_UPLOADS).toBe(2);
    });

    it('rejects files exceeding 100MB before calling API', async () => {
      const oversized = {
        name: 'giant_4k.mov',
        size: 101 * 1024 * 1024,
        type: 'video/quicktime',
      } as unknown as File;

      await expect(uploadSingleChatVideo(oversized)).rejects.toThrow(/100MB/);
      expect(apiClient.chat.initVideoUpload).not.toHaveBeenCalled();
    });

    it('chunks, retries transient failure, reports progress, and completes upload', async () => {
      const blob = new Blob([new Uint8Array(6 * 1024 * 1024)], { type: 'video/mp4' });
      const file = new File([blob], 'salon_demo.mp4', { type: 'video/mp4' });

      vi.mocked(apiClient.chat.initVideoUpload).mockResolvedValue({
        success: true,
        uploadId: 'up-test-1',
        chunkSizeBytes: 5 * 1024 * 1024,
        maxVideoBytes: MAX_CHAT_VIDEO_BYTES,
        expiresAt: new Date().toISOString(),
      });

      vi.mocked(apiClient.chat.uploadVideoChunk)
        .mockRejectedValueOnce(new Error('Network blip'))
        .mockResolvedValue({
          success: true,
          uploadId: 'up-test-1',
          chunkIndex: 0,
          receivedBytes: 5 * 1024 * 1024,
          uploadedChunks: 1,
        });

      vi.mocked(apiClient.chat.completeVideoUpload).mockResolvedValue({
        success: true,
        attachment: {
          id: 'att-vid-1',
          url: '/api/chat/media/12345678-1234-1234-1234-1234567890ab.mp4',
          name: 'salon_demo.mp4',
          mimeType: 'video/mp4',
          sizeBytes: file.size,
          isVideo: true,
          fileExt: 'mp4',
        },
      });

      const progressUpdates: number[] = [];
      const result = await uploadSingleChatVideo(file, {
        onProgress: (info) => progressUpdates.push(info.percent),
      });

      expect(result?.url).toBe('/api/chat/media/12345678-1234-1234-1234-1234567890ab.mp4');
      expect(apiClient.chat.initVideoUpload).toHaveBeenCalledTimes(1);
      // 2 chunks total, first failed once then retried -> 3 chunk calls
      expect(apiClient.chat.uploadVideoChunk).toHaveBeenCalledTimes(3);
      expect(apiClient.chat.completeVideoUpload).toHaveBeenCalledTimes(1);
      expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
    });
  });
});
