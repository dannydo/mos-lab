import { describe, it, expect } from 'vitest';
import { isSupportedVideoFile, isVideoAttachment, formatVideoDuration } from './chat-video';
import type { MosChatImageAttachment } from '@mos-lab/shared';

describe('mOS Chat Video Invariants (MOS-CHAT-VIDEO)', () => {
  describe('isSupportedVideoFile', () => {
    it('detects video files by MIME type', () => {
      const fileMp4 = new File(['mock'], 'demo.mp4', { type: 'video/mp4' });
      const fileWebm = new File(['mock'], 'demo.webm', { type: 'video/webm' });
      const fileMov = new File(['mock'], 'demo.mov', { type: 'video/quicktime' });

      expect(isSupportedVideoFile(fileMp4)).toBe(true);
      expect(isSupportedVideoFile(fileWebm)).toBe(true);
      expect(isSupportedVideoFile(fileMov)).toBe(true);
    });

    it('detects video files by extension when MIME type is missing or generic', () => {
      const fileWithoutMime = new File(['mock'], 'screen_record.MP4');
      const fileWebmExt = new File(['mock'], 'bug_report.webm');
      const fileMovExt = new File(['mock'], 'iphone_record.mov');

      expect(isSupportedVideoFile(fileWithoutMime)).toBe(true);
      expect(isSupportedVideoFile(fileWebmExt)).toBe(true);
      expect(isSupportedVideoFile(fileMovExt)).toBe(true);
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
});
