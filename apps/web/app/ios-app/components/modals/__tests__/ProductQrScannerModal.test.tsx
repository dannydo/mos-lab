// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProductQrScannerModal } from '../ProductQrScannerModal';

describe('ProductQrScannerModal viewport & scan reticle', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders an enlarged camera viewport and square yellow scan reticle when camera is active', async () => {
    const fakeStream = {
      getTracks: () => [{ stop: vi.fn() }],
    } as unknown as MediaStream;

    const originalNavigator = globalThis.navigator;
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(fakeStream),
      },
    });

    render(
      <ProductQrScannerModal
        open={true}
        isDark={true}
        bookingId={771121}
        cartProducts={[]}
        onScannedProduct={vi.fn()}
        onRemoveUnit={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const viewport = screen.getByTestId('qr-camera-viewport');
    expect(viewport.className).toContain('aspect-square');
    expect(viewport.className).toContain('min-h-[300px]');
    expect(viewport.className).not.toContain('aspect-[16/10]');

    await waitFor(() => {
      expect(screen.getByTestId('qr-scan-reticle')).toBeInTheDocument();
    });

    const reticle = screen.getByTestId('qr-scan-reticle');
    expect(reticle.className).toContain('w-[74%]');
    expect(reticle.className).toContain('max-w-[280px]');
    expect(reticle.className).toContain('aspect-square');
  });
});
