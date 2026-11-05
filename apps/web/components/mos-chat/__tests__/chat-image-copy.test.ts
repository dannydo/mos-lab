import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  copyImageToClipboard,
  copyImageUrlToClipboard,
  convertBlobToPng,
  downloadImage,
} from '../utils/chat-image-copy';

describe('chat-image-copy utilities', () => {
  const originalClipboard = navigator.clipboard;
  const originalClipboardItem = (global as any).ClipboardItem;

  beforeEach(() => {
    vi.restoreAllMocks();
    (global as any).ClipboardItem = class MockClipboardItem {
      constructor(public data: Record<string, Blob>) {}
    };
  });

  afterEach(() => {
    Object.assign(navigator, { clipboard: originalClipboard });
    (global as any).ClipboardItem = originalClipboardItem;
  });

  it('copyImageUrlToClipboard copies resolved URL text using navigator.clipboard.writeText', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const res = await copyImageUrlToClipboard('/api/chat/media/test.png', { showToast: false });
    expect(res).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('/api/chat/media/test.png'));
  });

  it('copyImageToClipboard falls back to writeText when image byte write fails', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        write: vi.fn().mockRejectedValue(new Error('Permission denied')),
        writeText: writeTextMock,
      },
    });

    const mockBlob = new Blob(['png'], { type: 'image/png' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => mockBlob,
    } as any);

    const res = await copyImageToClipboard('/api/chat/media/test.png', { showToast: false });
    expect(res).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('/api/chat/media/test.png'));
  });

  it('copyImageToClipboard writes ClipboardItem when PNG blob is available and write succeeds', async () => {
    const writeMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        write: writeMock,
        writeText: vi.fn(),
      },
    });

    const mockBlob = new Blob(['fake png data'], { type: 'image/png' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => mockBlob,
    } as any);

    const res = await copyImageToClipboard('https://example.com/photo.png', { showToast: false });
    expect(res).toBe(true);
    expect(writeMock).toHaveBeenCalled();
  });

  it('convertBlobToPng returns existing PNG blob as-is', async () => {
    const pngBlob = new Blob(['png content'], { type: 'image/png' });
    const converted = await convertBlobToPng(pngBlob);
    expect(converted).toBe(pngBlob);
  });

  it('downloadImage creates an anchor element and clicks it', () => {
    const clickMock = vi.fn();
    const originalCreateElement = document.createElement.bind(document);

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName === 'a') {
        el.click = clickMock;
      }
      return el;
    });

    downloadImage('/api/chat/media/pic.jpg', 'pic.jpg');
    expect(clickMock).toHaveBeenCalled();
  });
});
