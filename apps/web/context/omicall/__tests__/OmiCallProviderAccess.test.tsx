import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { OmiCallProvider, useOmiCall } from '../OmiCallProvider';

vi.mock('../useAudioManager', () => ({
  useAudioManager: () => ({
    audioInputDevices: [],
    audioOutputDevices: [],
    selectedAudioInputId: '',
    selectedAudioOutputId: '',
    setSelectedAudioInputId: vi.fn(),
    setSelectedAudioOutputId: vi.fn(),
    refreshAudioDevices: vi.fn().mockResolvedValue(undefined),
  }),
  playRingback: vi.fn(),
  stopRingback: vi.fn(),
  stopRingtone: vi.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => <OmiCallProvider>{children}</OmiCallProvider>;

describe('OmiCallProvider role access & state sync', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('grants OmiCall access to regular admin accounts (off by default until enabled)', () => {
    window.localStorage.setItem(
      'mos_user',
      JSON.stringify({ id: 13, username: 'han.huynh@wingslashes.com', role: 'admin' })
    );

    const { result } = renderHook(() => useOmiCall(), { wrapper });

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.canAccessOmiCall).toBe(true);
    expect(result.current.adminOmiCallEnabled).toBe(false);
    expect(result.current.floatingLauncherVisible).toBe(false);
  });

  it('grants OmiCall access to super_admin accounts', () => {
    window.localStorage.setItem(
      'mos_user',
      JSON.stringify({ id: 1, username: 'danhdo@gmail.com', role: 'super_admin' })
    );

    const { result } = renderHook(() => useOmiCall(), { wrapper });

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.canAccessOmiCall).toBe(true);
  });

  it('grants OmiCall access and visible floating launcher to telesales and booker roles', () => {
    window.localStorage.setItem(
      'mos_user',
      JSON.stringify({ id: 18, username: 'dn2016438@gmail.com', role: 'telesales' })
    );

    const { result } = renderHook(() => useOmiCall(), { wrapper });

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isGrowthMember).toBe(true);
    expect(result.current.canAccessOmiCall).toBe(true);
    expect(result.current.floatingLauncherVisible).toBe(true);

    act(() => {
      window.localStorage.setItem(
        'mos_user',
        JSON.stringify({ id: 22, username: 'phuongpb04@gmail.com', role: 'booker' })
      );
      window.dispatchEvent(new Event('mos_user_updated'));
    });

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isGrowthMember).toBe(true);
    expect(result.current.canAccessOmiCall).toBe(true);
    expect(result.current.floatingLauncherVisible).toBe(true);
  });

  it('denies OmiCall access to non-admin, non-growth roles such as cv', () => {
    window.localStorage.setItem('mos_user', JSON.stringify({ id: 99, username: 'cv_user', role: 'cv' }));

    const { result } = renderHook(() => useOmiCall(), { wrapper });

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isGrowthMember).toBe(false);
    expect(result.current.canAccessOmiCall).toBe(false);
    expect(result.current.floatingLauncherVisible).toBe(false);
  });
});
