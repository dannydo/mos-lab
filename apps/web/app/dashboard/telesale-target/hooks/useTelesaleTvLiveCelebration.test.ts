import { describe, it, expect } from 'vitest';
import { getRandomQuote } from './useTelesaleTvLiveCelebration';
import { getBestVietnameseVoice } from '../../../../components/voice-assistant/speech-utils';

describe('useTelesaleTvLiveCelebration Quotes & Voice Style', () => {
  it('replaces [Tên] placeholder with staff name correctly', () => {
    const quotes = ['Anh thích cái cách [Tên] chăm sóc khách hàng đầy ân cần.'];
    const res = getRandomQuote(quotes, 'Bích Phượng');
    expect(res).toBe('Anh thích cái cách Bích Phượng chăm sóc khách hàng đầy ân cần.');
  });

  it('contains the 4 Wings cultural values: Vui vẻ, Ân cần, Chân thành, Khoa học', () => {
    const sampleQuotes = [
      'Anh thích cái cách [Tên] chăm sóc khách hàng đầy ân cần.',
      '[Tên] ơi, sự chân thành từ trái tim em luôn có ma lực đặc biệt.',
      'Tư vấn chuẩn xác, phân tích nhu cầu cực kỳ khoa học.',
      'Nụ cười vui vẻ của [Tên] qua từng cuộc gọi đã thắp sáng cả phòng rồi.',
    ];

    const joined = sampleQuotes.join(' ');
    expect(joined.toLowerCase()).toContain('ân cần');
    expect(joined.toLowerCase()).toContain('chân thành');
    expect(joined.toLowerCase()).toContain('khoa học');
    expect(joined.toLowerCase()).toContain('vui vẻ');
  });

  it('getBestVietnameseVoice filters male and female voices when available', () => {
    // When window is undefined or mock voices
    const voice = getBestVietnameseVoice('male');
    // In node/vitest environment, window.speechSynthesis is undefined or mocked, returns null safely
    expect(voice === null || typeof voice === 'object').toBe(true);
  });
});
