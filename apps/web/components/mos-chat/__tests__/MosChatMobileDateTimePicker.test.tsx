import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import dayjs from 'dayjs';
import {
  MosChatMobileDateTimePicker,
  DEFAULT_MOBILE_DEADLINE_PRESETS,
} from '../mobile/MosChatMobileDateTimePicker';

describe('MosChatMobileDateTimePicker', () => {
  it('renders placeholder when value is null', () => {
    render(
      <MosChatMobileDateTimePicker
        value={null}
        onChange={vi.fn()}
        placeholder="Hoặc chọn ngày giờ cụ thể"
      />
    );

    expect(screen.getByText('Hoặc chọn ngày giờ cụ thể')).toBeInTheDocument();
  });

  it('renders formatted date time when value is provided', () => {
    const testDate = '2026-10-27T17:30:00.000Z';
    render(
      <MosChatMobileDateTimePicker
        value={testDate}
        onChange={vi.fn()}
      />
    );

    const formatted = dayjs(testDate).format('HH:mm · DD/MM/YYYY');
    expect(screen.getByText(formatted)).toBeInTheDocument();
  });

  it('renders all default mobile deadline presets', () => {
    render(
      <MosChatMobileDateTimePicker
        value={null}
        onChange={vi.fn()}
      />
    );

    for (const preset of DEFAULT_MOBILE_DEADLINE_PRESETS) {
      expect(screen.getByText(preset.label)).toBeInTheDocument();
    }
  });

  it('calls onChange with correct ISO string when preset button is clicked', () => {
    const handleChange = vi.fn();
    render(
      <MosChatMobileDateTimePicker
        value={null}
        onChange={handleChange}
      />
    );

    const firstPreset = DEFAULT_MOBILE_DEADLINE_PRESETS[0];
    const button = screen.getByText(firstPreset.label);
    fireEvent.click(button);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(typeof handleChange.mock.calls[0][0]).toBe('string');
    const selectedDate = dayjs(handleChange.mock.calls[0][0]);
    expect(selectedDate.isValid()).toBe(true);
    expect(selectedDate.hour()).toBe(17);
    expect(selectedDate.minute()).toBe(30);
  });

  it('highlights active preset button when value matches', () => {
    const preset = DEFAULT_MOBILE_DEADLINE_PRESETS[0];
    const matchingDate = preset.getDate();

    render(
      <MosChatMobileDateTimePicker
        value={matchingDate ? matchingDate.toISOString() : null}
        onChange={vi.fn()}
      />
    );

    const button = screen.getByText(preset.label);
    expect(button.className).toContain('border-amber-400');
  });

  it('shows clear button when value is present and calls onChange(null) when clicked', () => {
    const handleChange = vi.fn();
    const testDate = '2026-10-27T17:30:00.000Z';

    render(
      <MosChatMobileDateTimePicker
        value={testDate}
        onChange={handleChange}
      />
    );

    const clearButton = screen.getByLabelText('Xóa hạn chót');
    expect(clearButton).toBeInTheDocument();

    fireEvent.click(clearButton);
    expect(handleChange).toHaveBeenCalledWith(null);
  });

  it('triggers onChange when native datetime input value changes', () => {
    const handleChange = vi.fn();
    render(
      <MosChatMobileDateTimePicker
        value={null}
        onChange={handleChange}
      />
    );

    const input = screen.getByLabelText('Hoặc chọn ngày giờ cụ thể');
    fireEvent.change(input, { target: { value: '2026-10-28T14:00' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    const chosen = dayjs(handleChange.mock.calls[0][0]);
    expect(chosen.isValid()).toBe(true);
    expect(chosen.hour()).toBe(14);
    expect(chosen.minute()).toBe(0);
  });

  it('handles clearing native input value to null', () => {
    const handleChange = vi.fn();
    render(
      <MosChatMobileDateTimePicker
        value="2026-10-28T14:00:00.000Z"
        onChange={handleChange}
      />
    );

    const input = screen.getByLabelText('Hoặc chọn ngày giờ cụ thể');
    fireEvent.change(input, { target: { value: '' } });

    expect(handleChange).toHaveBeenCalledWith(null);
  });

  it('respects disabled prop on presets and input', () => {
    const handleChange = vi.fn();
    render(
      <MosChatMobileDateTimePicker
        value={null}
        onChange={handleChange}
        disabled={true}
      />
    );

    const button = screen.getByText(DEFAULT_MOBILE_DEADLINE_PRESETS[0].label);
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleChange).not.toHaveBeenCalled();

    const input = screen.getByLabelText('Hoặc chọn ngày giờ cụ thể');
    expect(input).toBeDisabled();
  });
});
