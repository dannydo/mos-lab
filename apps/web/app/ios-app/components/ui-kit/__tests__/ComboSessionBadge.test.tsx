import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ComboSessionBadge, formatComboSessionUnicode } from '../ComboSessionBadge';

describe('ComboSessionBadge & formatComboSessionUnicode (The Pair Invariant)', () => {
  it('luôn định dạng đầy đủ cả Nối và Dặm kể cả khi dặm = 0 (ví dụ: Kim Anh có 4 nối, 0 dặm)', () => {
    const res = formatComboSessionUnicode(4, 0);
    expect(res.normalCount).toBe(4);
    expect(res.retainCount).toBe(0);
    expect(res.displayStr).toBe('✦ 4 · ↻ 0');
    expect(res.hasRetain).toBe(true);
    expect(res.isZeroNew).toBe(false);
  });

  it('luôn định dạng đầy đủ cả Nối và Dặm kể cả khi nối = 0 (ví dụ: Trang có 0 nối, 3 dặm)', () => {
    const res = formatComboSessionUnicode(0, 3);
    expect(res.normalCount).toBe(0);
    expect(res.retainCount).toBe(3);
    expect(res.displayStr).toBe('✦ 0 · ↻ 3');
    expect(res.hasRetain).toBe(true);
    expect(res.isZeroNew).toBe(true);
  });

  it('định dạng chính xác khi cả hai đều > 0 (ví dụ: Hiền có 3 nối, 12 dặm)', () => {
    const res = formatComboSessionUnicode(3, 12);
    expect(res.normalCount).toBe(3);
    expect(res.retainCount).toBe(12);
    expect(res.displayStr).toBe('✦ 3 · ↻ 12');
  });

  it('render badge Kim Anh: ✦ 4 có màu vàng gold, ↻ 0 có màu xám trung tính', () => {
    const { container } = render(<ComboSessionBadge normalRemaining={4} retainRemaining={0} />);

    expect(screen.getByText(/✦ 4/)).toBeInTheDocument();
    expect(screen.getByText(/↻ 0/)).toBeInTheDocument();

    const normalEl = screen.getByText(/✦ 4/);
    const retainEl = screen.getByText(/↻ 0/);

    expect(normalEl.className).toContain('text-amber-400');
    expect(retainEl.className).toContain('text-neutral-500');
  });

  it('render badge Trang: ✦ 0 có màu xám trung tính, ↻ 3 có màu xanh cyan', () => {
    const { container } = render(<ComboSessionBadge normalRemaining={0} retainRemaining={3} />);

    expect(screen.getByText(/✦ 0/)).toBeInTheDocument();
    expect(screen.getByText(/↻ 3/)).toBeInTheDocument();

    const normalEl = screen.getByText(/✦ 0/);
    const retainEl = screen.getByText(/↻ 3/);

    expect(normalEl.className).toContain('text-neutral-500');
    expect(retainEl.className).toContain('text-cyan-400');
  });

  it('không render badge khi tổng lượt <= 0', () => {
    const { container } = render(<ComboSessionBadge normalRemaining={0} retainRemaining={0} />);
    expect(container.firstChild).toBeNull();
  });
});
