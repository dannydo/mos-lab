import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  DualThumbRangeSlider,
  DEFAULT_NATURAL_LENGTH_PRESETS,
  DEFAULT_NATURAL_THICKNESS_PRESETS,
  DEFAULT_NATURAL_COUNT_PRESETS,
} from '../consultation/DualThumbRangeSlider';

describe('DualThumbRangeSlider - Ấn Chọn Range (MOS-BUG-234)', () => {
  it('renders quick preset buttons when value is null (Chưa đo)', () => {
    const onChange = vi.fn();
    render(
      <DualThumbRangeSlider
        min={5}
        max={15}
        step={1}
        value={null}
        onChange={onChange}
        labelName="Dài"
        unitSuffix="mm"
        presets={DEFAULT_NATURAL_LENGTH_PRESETS}
      />
    );

    expect(screen.getByText('Ấn chọn range:')).toBeInTheDocument();
    expect(screen.getByText('Chạm hoặc ấn chọn range dưới đây')).toBeInTheDocument();

    // Verify all 6 length preset buttons exist
    const preset8to10 = screen.getByRole('button', { name: /Chọn khoảng Dài 8 – 10 mm/i });
    expect(preset8to10).toBeInTheDocument();
    expect(preset8to10).toHaveAttribute('aria-pressed', 'false');

    // Click preset -> immediately selects [8, 10] without any drag
    fireEvent.click(preset8to10);
    expect(onChange).toHaveBeenCalledWith([8, 10]);

    // Sub-labels must stay hidden while unselected
    expect(screen.queryByText('Ngắn')).not.toBeInTheDocument();
    expect(screen.queryByText('Chuẩn')).not.toBeInTheDocument();
    expect(screen.queryByText('Dài')).not.toBeInTheDocument();
  });

  it('highlights active preset button and reveals subLabel only for the selected range', () => {
    const onChange = vi.fn();
    render(
      <DualThumbRangeSlider
        min={5}
        max={15}
        step={1}
        value={[8, 10]}
        onChange={onChange}
        labelName="Dài"
        unitSuffix="mm"
        presets={DEFAULT_NATURAL_LENGTH_PRESETS}
      />
    );

    const activePreset = screen.getByRole('button', { name: /Chọn khoảng Dài 8 – 10 mm/i });
    expect(activePreset).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Chuẩn')).toBeInTheDocument();
    expect(screen.queryByText('Ngắn')).not.toBeInTheDocument();
    expect(screen.queryByText('Dài')).not.toBeInTheDocument();

    // Click a different preset -> selects [10, 12]
    const nextPreset = screen.getByRole('button', { name: /Chọn khoảng Dài 10 – 12 mm/i });
    expect(nextPreset).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(nextPreset);
    expect(onChange).toHaveBeenCalledWith([10, 12]);
  });

  it('renders thickness presets correctly and handles selection', () => {
    const onChange = vi.fn();
    render(
      <DualThumbRangeSlider
        min={0.05}
        max={0.2}
        step={0.01}
        value={null}
        onChange={onChange}
        labelName="Dày"
        unitSuffix="mm"
        presets={DEFAULT_NATURAL_THICKNESS_PRESETS}
      />
    );

    const thinPreset = screen.getByRole('button', { name: /Chọn khoảng Dày 0.05 – 0.07 mm/i });
    expect(thinPreset).toBeInTheDocument();
    fireEvent.click(thinPreset);
    expect(onChange).toHaveBeenCalledWith([0.05, 0.07]);
  });

  it('renders count / density presets correctly and handles selection', () => {
    const onChange = vi.fn();
    render(
      <DualThumbRangeSlider
        min={40}
        max={200}
        step={5}
        value={null}
        onChange={onChange}
        labelName="Số sợi"
        unitSuffix=" sợi"
        presets={DEFAULT_NATURAL_COUNT_PRESETS}
      />
    );

    const standardPreset = screen.getByRole('button', { name: /Chọn khoảng Số sợi 60 – 80 sợi/i });
    expect(standardPreset).toBeInTheDocument();
    fireEvent.click(standardPreset);
    expect(onChange).toHaveBeenCalledWith([60, 80]);
  });

  it('automatically falls back to standard presets based on labelName', () => {
    const onChange = vi.fn();
    render(
      <DualThumbRangeSlider
        min={5}
        max={15}
        step={1}
        value={null}
        onChange={onChange}
        labelName="Dài"
        unitSuffix="mm"
      />
    );

    // Should auto-resolve DEFAULT_NATURAL_LENGTH_PRESETS
    expect(screen.getByRole('button', { name: /Chọn khoảng Dài 8 – 10 mm/i })).toBeInTheDocument();
  });

  it('supports direct pointer tap on track to set initial value', () => {
    const onChange = vi.fn();
    const { container } = render(
      <DualThumbRangeSlider min={5} max={15} step={1} value={null} onChange={onChange} labelName="Dài" />
    );

    const track = container.querySelector('[class*="cursor-pointer"]');
    expect(track).toBeInTheDocument();

    // Mock getBoundingClientRect
    if (track) {
      vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 100,
        bottom: 20,
        width: 100,
        height: 20,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      // Pointer down at 30% of width (x=30) -> 5 + 0.3 * (15 - 5) = 8
      fireEvent.pointerDown(track, { clientX: 30 });
      expect(onChange).toHaveBeenCalledWith([8, 8]);
    }
  });

  it('supports direct pointer tap on track to adjust existing range bounds', () => {
    const onChange = vi.fn();
    const { container } = render(
      <DualThumbRangeSlider min={5} max={15} step={1} value={[7, 10]} onChange={onChange} labelName="Dài" />
    );

    const track = container.querySelector('[class*="cursor-pointer"]');
    expect(track).toBeInTheDocument();

    if (track) {
      vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 100,
        bottom: 20,
        width: 100,
        height: 20,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      // Pointer down at 12 (70% of 10 -> x=70) -> clickedVal = 12 (> 10) -> expands max to 12
      fireEvent.pointerDown(track, { clientX: 70 });
      expect(onChange).toHaveBeenCalledWith([7, 12]);
    }
  });
});
