import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { IosCloudSyncBadge } from '../IosCloudSyncBadge';

describe('IosCloudSyncBadge', () => {
  it('renders with correct tooltip and aria-label when synced', () => {
    render(<IosCloudSyncBadge status="synced" />);
    const badge = screen.getByLabelText('Đã lưu ảnh an toàn lên Cloud');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('title', 'Đã lưu ảnh an toàn lên Cloud');
  });

  it('renders with uploading tooltip and animation when uploading', () => {
    render(<IosCloudSyncBadge status="uploading" />);
    const badge = screen.getByLabelText('Đang tải ảnh lên Cloud...');
    expect(badge).toBeInTheDocument();
  });

  it('renders with offline tooltip when offline', () => {
    render(<IosCloudSyncBadge status="offline" />);
    const badge = screen.getByLabelText('Chờ mạng để đồng bộ Cloud');
    expect(badge).toBeInTheDocument();
  });

  it('treats idle as synced when rendered', () => {
    render(<IosCloudSyncBadge status="idle" />);
    const badge = screen.getByLabelText('Đã lưu ảnh an toàn lên Cloud');
    expect(badge).toBeInTheDocument();
  });
});
