import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MosChatAvatar } from '../MosChatAvatar';
import { getAvatarInitials, getAvatarColorPalette, resolveStaffAvatarUrl } from '../utils/chat-helpers';

describe('MosChatAvatar & Avatar Helpers', () => {
  const mockStaffDirectory = [
    {
      id: 6,
      username: 'khai.nguyen@wingslashes.com',
      displayName: 'Nguyễn Quang Khải',
      role: 'admin',
      avatarUrl: 'https://lh3.googleusercontent.com/a/khai-avatar=s96-c',
      isOnline: true,
    },
    {
      id: 14,
      username: 'nguyen.bui@wingslashes.com',
      displayName: 'Bùi Sinh Nguyên',
      role: 'admin',
      avatarUrl: 'https://cdn.wingslashes.com/uploads/user/avatar/nguyen.png',
      isOnline: false,
    },
    {
      id: 99,
      username: 'danny.do@wingslashes.com',
      displayName: 'Danny Do',
      role: 'super_admin',
      avatarUrl: null,
      isOnline: true,
    },
  ];

  it('calculates clean 2-letter initials for single, multi-word, and emoji-prefixed names without UTF-16 surrogate splitting', () => {
    expect(getAvatarInitials('Nguyễn Quang Khải')).toBe('NK');
    expect(getAvatarInitials('Bùi Sinh Nguyên')).toBe('BN');
    expect(getAvatarInitials('Danny Do')).toBe('DD');
    expect(getAvatarInitials('Chuyên Viên Mai')).toBe('MA');
    expect(getAvatarInitials('Admin Tâm')).toBe('TÂ');
    expect(getAvatarInitials('🚀 mOS Mission')).toBe('MM');
    expect(getAvatarInitials('🤖 MAI')).toBe('MA');
    expect(getAvatarInitials('⭐ Chính tôi (Nguyễn Quang Khải)')).toBe('NK');
    expect(getAvatarInitials('')).toBe('NV');
    expect(getAvatarInitials(null)).toBe('NV');
  });

  it('provides deterministic attractive color palette per name', () => {
    const pal1 = getAvatarColorPalette('Nguyễn Quang Khải');
    const pal2 = getAvatarColorPalette('Nguyễn Quang Khải');
    expect(pal1).toEqual(pal2);
    expect(pal1.bg).toContain('from-');
    expect(pal1.text).toContain('text-');
  });

  it('resolves staff avatar URL by ID or Name from staff directory', () => {
    const urlById = resolveStaffAvatarUrl({
      staffId: 6,
      staffDirectory: mockStaffDirectory as any,
    });
    expect(urlById).toBe('https://lh3.googleusercontent.com/a/khai-avatar=s96-c');

    const urlByName = resolveStaffAvatarUrl({
      name: 'Bùi Sinh Nguyên',
      staffDirectory: mockStaffDirectory as any,
    });
    expect(urlByName).toBe('https://cdn.wingslashes.com/uploads/user/avatar/nguyen.png');

    const urlFallback = resolveStaffAvatarUrl({
      name: 'Danny Do',
      staffDirectory: mockStaffDirectory as any,
    });
    expect(urlFallback).toBeNull();
  });

  it('renders image when avatarUrl is present in staff directory', () => {
    render(
      <MosChatAvatar
        name="Nguyễn Quang Khải"
        staffId={6}
        staffDirectory={mockStaffDirectory as any}
        size="md"
        showOnline={true}
        isOnline={true}
      />
    );

    const img = screen.getByRole('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://lh3.googleusercontent.com/a/khai-avatar=s96-c');
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
  });

  it('renders initials badge when staff has no avatar image', () => {
    render(<MosChatAvatar name="Danny Do" staffId={99} staffDirectory={mockStaffDirectory as any} size="md" />);

    expect(screen.getByText('DD')).toBeTruthy();
  });
});
