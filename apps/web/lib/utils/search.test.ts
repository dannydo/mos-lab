import { describe, it, expect } from 'vitest';
import { removeVietnameseTones, vietnameseSearchFilter } from './search';

describe('Vietnamese Search Utilities', () => {
  describe('removeVietnameseTones', () => {
    it('should remove diacritics and convert to lower case', () => {
      expect(removeVietnameseTones('Nguyễn Quang Khải')).toBe('nguyen quang khai');
      expect(removeVietnameseTones('Đội Telesales')).toBe('doi telesales');
      expect(removeVietnameseTones('Phan Xích Long')).toBe('phan xich long');
    });

    it('should handle null, undefined, numbers and empty strings', () => {
      expect(removeVietnameseTones(null)).toBe('');
      expect(removeVietnameseTones(undefined)).toBe('');
      expect(removeVietnameseTones('')).toBe('');
      expect(removeVietnameseTones(12345)).toBe('12345');
    });
  });

  describe('vietnameseSearchFilter', () => {
    it('should match option label tone-insensitively and case-insensitively', () => {
      const option = { label: '🛡️ Nguyễn Quang Khải', value: '106' };
      expect(vietnameseSearchFilter('khai', option)).toBe(true);
      expect(vietnameseSearchFilter('Khải', option)).toBe(true);
      expect(vietnameseSearchFilter('quang', option)).toBe(true);
      expect(vietnameseSearchFilter('xyz', option)).toBe(false);
    });

    it('should match option children or value if label is absent', () => {
      const optionChild = { children: 'Bích Phượng', value: '2' };
      expect(vietnameseSearchFilter('phuong', optionChild)).toBe(true);
      expect(vietnameseSearchFilter('phượng', optionChild)).toBe(true);

      const optionValue = { value: 'Thanh Mai' };
      expect(vietnameseSearchFilter('thanh', optionValue)).toBe(true);
    });

    it('should return true for empty input', () => {
      expect(vietnameseSearchFilter('', { label: 'Anything' })).toBe(true);
    });
  });
});
