import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveApiBaseUrl, resolveMediaUrl } from '../api-base-url';

describe('api-base-url & resolveMediaUrl', () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_API_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_API_URL;
    }
  });

  it('handles null, undefined, and empty string', () => {
    expect(resolveMediaUrl(null)).toBe('');
    expect(resolveMediaUrl(undefined)).toBe('');
    expect(resolveMediaUrl('')).toBe('');
    expect(resolveMediaUrl('   ')).toBe('');
  });

  it('preserves data URIs, blob URIs, and external URLs', () => {
    const dataUri = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...';
    expect(resolveMediaUrl(dataUri)).toBe(dataUri);

    const blobUri = 'blob:http://localhost:4000/123-456';
    expect(resolveMediaUrl(blobUri)).toBe(blobUri);

    const httpsUrl = 'https://dwewlqvthahwdoopssnu.supabase.co/storage/v1/object/public/test.jpg';
    expect(resolveMediaUrl(httpsUrl)).toBe(httpsUrl);

    const httpUrl = 'http://example.com/image.png';
    expect(resolveMediaUrl(httpUrl)).toBe(httpUrl);
  });

  it('resolves relative /api paths to production origin when NEXT_PUBLIC_API_URL is configured', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.lab.masteros.app/api';
    expect(resolveApiBaseUrl()).toBe('https://api.lab.masteros.app/api');

    const relativeUrl = '/api/pilot/media/aff994c6-aa9c-47a4-b35a-ef0feeb040b5.jpg';
    expect(resolveMediaUrl(relativeUrl)).toBe(
      'https://api.lab.masteros.app/api/pilot/media/aff994c6-aa9c-47a4-b35a-ef0feeb040b5.jpg'
    );
  });

  it('resolves relative paths to default localhost origin when no env is configured', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(resolveApiBaseUrl()).toBe('http://localhost:4001/api');

    const relativeUrl = '/api/pilot/media/test.jpg';
    expect(resolveMediaUrl(relativeUrl)).toBe('http://localhost:4001/api/pilot/media/test.jpg');
  });
});
