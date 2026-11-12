import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CustomerAvatarPicker } from '../CustomerAvatarPicker';

// Mock ThemeContext
vi.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'dark', toggleTheme: vi.fn() }),
}));

// Mock imageCompressor
vi.mock('../../utils/imageCompressor', () => ({
  compressLashImage: vi.fn().mockResolvedValue('data:image/jpeg;base64,mockCompressedData'),
}));

describe('CustomerAvatarPicker', () => {
  it('renders customer avatar when avatarUrl is provided', () => {
    render(
      <CustomerAvatarPicker
        avatarUrl="https://cdn.wingslashes.com/sample-avatar.jpg"
        customerName="Nhàn"
        customerPhone="0901.360.069"
      />
    );

    const img = screen.getByRole('img', { name: /Nhàn/i });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://cdn.wingslashes.com/sample-avatar.jpg');
  });

  it('renders initials when no avatar is provided', () => {
    render(<CustomerAvatarPicker avatarUrl="" customerName="Nguyễn Thị Nhàn" customerPhone="0901.360.069" />);

    expect(screen.getByText('TN')).toBeInTheDocument();
  });

  it('opens action sheet when avatar is clicked', () => {
    render(
      <CustomerAvatarPicker
        avatarUrl="https://cdn.wingslashes.com/sample.jpg"
        customerName="Nhàn"
        customerPhone="0901.360.069"
      />
    );

    const triggerBtn = screen.getByRole('button', { name: /Ảnh đại diện của Nhàn/i });
    fireEvent.click(triggerBtn);

    expect(screen.getByText('Ảnh Đại Diện Khách Hàng')).toBeInTheDocument();
    expect(screen.getByText(/Chụp ảnh mới \(Camera\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Chọn từ thư viện ảnh/i)).toBeInTheDocument();
    expect(screen.getByText(/Gỡ ảnh đại diện/i)).toBeInTheDocument();
  });

  it('calls onUpdateAvatar with empty string when removing avatar', async () => {
    const onUpdate = vi.fn();
    render(
      <CustomerAvatarPicker
        avatarUrl="https://cdn.wingslashes.com/sample.jpg"
        customerName="Nhàn"
        customerPhone="0901.360.069"
        onUpdateAvatar={onUpdate}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Ảnh đại diện của Nhàn/i }));
    const removeBtn = screen.getByText(/Gỡ ảnh đại diện/i);
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith('');
    });
  });

  it('closes action sheet when clicking Cancel', () => {
    render(
      <CustomerAvatarPicker
        avatarUrl="https://cdn.wingslashes.com/sample.jpg"
        customerName="Nhàn"
        customerPhone="0901.360.069"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Ảnh đại diện của Nhàn/i }));
    expect(screen.getByText('Ảnh Đại Diện Khách Hàng')).toBeInTheDocument();

    const cancelBtn = screen.getByText(/Hủy \(Cancel\)/i);
    fireEvent.click(cancelBtn);

    expect(screen.queryByText('Ảnh Đại Diện Khách Hàng')).not.toBeInTheDocument();
  });
});
