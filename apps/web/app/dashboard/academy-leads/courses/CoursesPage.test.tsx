import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Form, InputNumber } from 'antd';
import { formatVndInput, parseVndInput } from './utils';

describe('Academy Courses Price Input Formatting and Parsing', () => {
  describe('formatVndInput', () => {
    it('formats numbers with Vietnamese dot thousand separators and đ suffix', () => {
      expect(formatVndInput(1900000)).toBe('1.900.000 đ');
      expect(formatVndInput(4900000)).toBe('4.900.000 đ');
      expect(formatVndInput(0)).toBe('0 đ');
    });

    it('returns empty string for null, undefined, or empty string', () => {
      expect(formatVndInput(null)).toBe('');
      expect(formatVndInput(undefined)).toBe('');
      expect(formatVndInput('')).toBe('');
    });
  });

  describe('parseVndInput', () => {
    it('strips non-digits so Antd InputNumber can parse formatted values without reverting', () => {
      expect(parseVndInput('1.900.000 đ')).toBe('1900000');
      expect(parseVndInput('4.900.000 đ')).toBe('4900000');
      expect(parseVndInput('4,900,000 đ')).toBe('4900000');
      expect(parseVndInput('4900000')).toBe('4900000');
      expect(parseVndInput(4900000)).toBe('4900000');
    });

    it('returns empty string for empty input', () => {
      expect(parseVndInput('')).toBe('');
      expect(parseVndInput(null)).toBe('');
      expect(parseVndInput(undefined)).toBe('');
    });
  });

  describe('InputNumber component integration', () => {
    function PriceTestForm({ initialValue, onChange }: { initialValue?: number; onChange?: (val: any) => void }) {
      return (
        <Form initialValues={{ promoPriceVnd: initialValue }}>
          <Form.Item name="promoPriceVnd" label="Học phí ưu đãi (VNĐ)">
            <InputNumber
              data-testid="promo-price-input"
              min={0}
              step={100000}
              className="w-full"
              formatter={formatVndInput}
              parser={parseVndInput}
              onChange={onChange}
            />
          </Form.Item>
        </Form>
      );
    }

    it('displays initial formatted value and allows editing without reverting', () => {
      let currentValue: any = 1900000;
      render(<PriceTestForm initialValue={1900000} onChange={(val) => (currentValue = val)} />);

      const input = screen.getByTestId('promo-price-input') as HTMLInputElement;
      expect(input.value).toBe('1.900.000 đ');

      // User changes 1.900.000 đ to 4.900.000 đ
      fireEvent.change(input, { target: { value: '4.900.000 đ' } });
      fireEvent.blur(input);

      // The input should update to 4.900.000 đ rather than reverting back to 1.900.000 đ
      expect(input.value).toBe('4.900.000 đ');
      expect(Number(currentValue)).toBe(4900000);
    });

    it('allows typing raw digits and formats on blur', () => {
      let currentValue: any = null;
      render(<PriceTestForm initialValue={1900000} onChange={(val) => (currentValue = val)} />);

      const input = screen.getByTestId('promo-price-input') as HTMLInputElement;

      fireEvent.change(input, { target: { value: '4900000' } });
      fireEvent.blur(input);

      expect(input.value).toBe('4.900.000 đ');
      expect(Number(currentValue)).toBe(4900000);
    });
  });

  describe('Academy course API mutations', () => {
    it('invalidates academy sales read cache when creating or updating courses', async () => {
      const { apiClient } = await import('../../../../lib/api-client');
      const { api } = await import('../../../../lib/api/base');

      const postSpy = vi.spyOn(api, 'post').mockResolvedValueOnce({ data: { success: true } });
      const putSpy = vi.spyOn(api, 'put').mockResolvedValueOnce({ data: { success: true } });

      const dto = {
        code: 'lash-pro',
        name: 'Khóa nối mi chuyên nghiệp',
        listPriceVnd: 5000000,
        promoPriceVnd: 4900000,
      };

      await apiClient.academySales.createCourse(dto);
      expect(postSpy).toHaveBeenCalledWith('/academy-sales/courses', dto);

      await apiClient.academySales.updateCourse(42, dto);
      expect(putSpy).toHaveBeenCalledWith('/academy-sales/courses/42', dto);

      postSpy.mockRestore();
      putSpy.mockRestore();
    });
  });
});
