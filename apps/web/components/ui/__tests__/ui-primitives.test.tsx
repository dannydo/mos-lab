import React from 'react';
import { render, screen } from '@testing-library/react';
import { Button } from 'antd';
import { describe, expect, it } from 'vitest';
import { ContentSurface, PageToolbar, StatePanel } from '../index';

describe('UI primitives', () => {
  it('renders a themed content surface', () => {
    render(<ContentSurface>Customer content</ContentSurface>);

    expect(screen.getByText('Customer content')).toBeInTheDocument();
  });

  it('keeps toolbar primary content and actions accessible', () => {
    render(<PageToolbar primary={<input aria-label="Tìm khách hàng" />} actions={<Button>Thêm lịch</Button>} />);

    expect(screen.getByRole('textbox', { name: 'Tìm khách hàng' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm lịch' })).toBeInTheDocument();
  });

  it('renders stable loading, empty, and error states', () => {
    const { rerender } = render(<StatePanel kind="loading" title="Đang tải khách hàng" />);
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();

    rerender(<StatePanel kind="empty" title="Chưa có khách hàng" />);
    expect(screen.getByText('Chưa có khách hàng')).toBeInTheDocument();

    rerender(<StatePanel kind="error" title="Không tải được khách hàng" />);
    expect(screen.getByText('Không tải được khách hàng')).toBeInTheDocument();
  });
});
