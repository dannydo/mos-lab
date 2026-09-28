import { describe, expect, it } from 'vitest';
import { formatCompactVND, formatDuration, formatVND, formatVndInput, getPercent, parseVndInput } from './format-utils';

describe('format-utils', () => {
  describe('formatVndInput', () => {
    it('formats number with dots as thousand separators and đ suffix', () => {
      expect(formatVndInput(1500000)).toBe('1.500.000 đ');
      expect(formatVndInput(1900000)).toBe('1.900.000 đ');
      expect(formatVndInput(4900000)).toBe('4.900.000 đ');
      expect(formatVndInput(0)).toBe('0 đ');
    });

    it('formats string numbers correctly', () => {
      expect(formatVndInput('1500000')).toBe('1.500.000 đ');
    });

    it('returns empty string for null, undefined, or empty string', () => {
      expect(formatVndInput(null)).toBe('');
      expect(formatVndInput(undefined)).toBe('');
      expect(formatVndInput('')).toBe('');
    });
  });

  describe('parseVndInput', () => {
    it('strips all non-digit characters from formatted strings', () => {
      expect(parseVndInput('1.500.000 đ')).toBe('1500000');
      expect(parseVndInput('1.500.000')).toBe('1500000');
      expect(parseVndInput('1,500,000 đ')).toBe('1500000');
      expect(parseVndInput('1500000')).toBe('1500000');
      expect(parseVndInput(1500000)).toBe('1500000');
    });

    it('returns empty string for empty, null, or undefined input', () => {
      expect(parseVndInput('')).toBe('');
      expect(parseVndInput(null)).toBe('');
      expect(parseVndInput(undefined)).toBe('');
    });
  });

  describe('formatVND', () => {
    it('formats numbers into localized currency string', () => {
      expect(formatVND(1000000)).toMatch(/1\.000\.000/);
      expect(formatVND(null)).toBe('0 đ');
    });
  });

  describe('formatCompactVND', () => {
    it('formats compact representation with M, K, B suffixes', () => {
      expect(formatCompactVND(1500000)).toMatch(/1\.5M/);
      expect(formatCompactVND(150000)).toMatch(/150K/);
      expect(formatCompactVND(1500000000)).toMatch(/1\.5B/);
    });
  });

  describe('formatDuration', () => {
    it('formats seconds into mm:ss', () => {
      expect(formatDuration(125)).toBe('02:05');
      expect(formatDuration(null)).toBe('-');
    });
  });

  describe('getPercent', () => {
    it('calculates rounded percentage correctly', () => {
      expect(getPercent(50, 200)).toBe(25);
      expect(getPercent(0, 100)).toBe(0);
      expect(getPercent(null, 100)).toBe(0);
      expect(getPercent(50, 0)).toBe(0);
    });
  });
});
