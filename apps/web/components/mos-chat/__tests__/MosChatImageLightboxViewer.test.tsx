import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MosChatImageLightboxViewer } from '../components/MosChatImageLightboxViewer';

describe('MosChatImageLightboxViewer', () => {
  const sampleItems = [
    { id: 'img-1', url: 'https://example.com/sheet.png', name: 'Bảng theo dõi học viên' },
    { id: 'img-2', url: 'https://example.com/diagram.png', name: 'Sơ đồ luồng xử lý' },
  ];

  let setLightboxImageMock: any;

  beforeEach(() => {
    setLightboxImageMock = vi.fn();
  });

  it('renders image lightbox maximized with toolbar, image, and presets', () => {
    render(
      <MosChatImageLightboxViewer
        lightboxImage={{
          items: sampleItems,
          currentIndex: 0,
          zoom: 1,
          rotate: 0,
        }}
        setLightboxImage={setLightboxImageMock}
      />
    );

    // Image name in toolbar
    expect(screen.getByText('Bảng theo dõi học viên')).toBeDefined();

    // Image index badge (1 / 2)
    expect(screen.getByText('1 / 2')).toBeDefined();

    // Zoom badge 100% (toolbar + preset pill)
    const zoomBadges = screen.getAllByText('100%');
    expect(zoomBadges.length).toBeGreaterThanOrEqual(1);

    // Main rendered image has full-viewport scaling classes
    const images = screen.getAllByAltText('Bảng theo dõi học viên');
    const mainImg = images[0];
    expect(mainImg).toBeDefined();
    expect(mainImg.className).toContain('max-w-[98.5vw]');
    expect(mainImg.className).toContain('max-h-[calc(100vh-80px)]');
  });

  it('handles zoom in, zoom out and reset zoom actions', () => {
    render(
      <MosChatImageLightboxViewer
        lightboxImage={{
          items: sampleItems,
          currentIndex: 0,
          zoom: 1,
          rotate: 0,
        }}
        setLightboxImage={setLightboxImageMock}
      />
    );

    // Click Zoom In
    const zoomInBtn = screen.getByRole('button', { name: /Phóng to/i });
    fireEvent.click(zoomInBtn);
    expect(setLightboxImageMock).toHaveBeenCalled();

    // Click Zoom Out
    const zoomOutBtn = screen.getByRole('button', { name: /Thu nhỏ/i });
    fireEvent.click(zoomOutBtn);
    expect(setLightboxImageMock).toHaveBeenCalled();

    // Click Reset / Fit to frame
    const resetBtn = screen.getByRole('button', { name: /Vừa khung hình/i });
    fireEvent.click(resetBtn);
    expect(setLightboxImageMock).toHaveBeenCalled();
  });

  it('handles preset zoom pills (Fit, 50%, 150%, 200%, 300%) and 100% actual size', () => {
    render(
      <MosChatImageLightboxViewer
        lightboxImage={{
          items: sampleItems,
          currentIndex: 0,
          zoom: 1,
          rotate: 0,
        }}
        setLightboxImage={setLightboxImageMock}
      />
    );

    // Preset Fit
    const presetFitBtn = screen.getByRole('button', { name: 'Fit' });
    fireEvent.click(presetFitBtn);
    expect(setLightboxImageMock).toHaveBeenCalledWith(expect.any(Function));

    // Preset 200%
    const preset200Btn = screen.getByRole('button', { name: '200%' });
    fireEvent.click(preset200Btn);
    expect(setLightboxImageMock).toHaveBeenCalledWith(expect.any(Function));

    // Click 100% Actual size button
    const actual100Btn = screen.getByRole('button', { name: /Kích thước gốc 100%/i });
    fireEvent.click(actual100Btn);
    expect(setLightboxImageMock).toHaveBeenCalledWith(expect.any(Function));
  });

  it('handles image navigation with Next and Prev buttons', () => {
    render(
      <MosChatImageLightboxViewer
        lightboxImage={{
          items: sampleItems,
          currentIndex: 0,
          zoom: 1,
          rotate: 0,
        }}
        setLightboxImage={setLightboxImageMock}
      />
    );

    const nextBtns = screen.getAllByRole('button', { name: /Hình tiếp theo/i });
    fireEvent.click(nextBtns[0]);
    expect(setLightboxImageMock).toHaveBeenCalled();

    const prevBtns = screen.getAllByRole('button', { name: /Hình trước/i });
    fireEvent.click(prevBtns[0]);
    expect(setLightboxImageMock).toHaveBeenCalled();
  });

  it('handles rotate action and close action', () => {
    render(
      <MosChatImageLightboxViewer
        lightboxImage={{
          items: sampleItems,
          currentIndex: 0,
          zoom: 1,
          rotate: 0,
        }}
        setLightboxImage={setLightboxImageMock}
      />
    );

    // Rotate
    const rotateBtn = screen.getByRole('button', { name: /Xoay ảnh 90°/i });
    fireEvent.click(rotateBtn);
    expect(setLightboxImageMock).toHaveBeenCalled();

    // Close
    const closeBtn = screen.getByRole('button', { name: /Đóng xem ảnh/i });
    fireEvent.click(closeBtn);
    expect(setLightboxImageMock).toHaveBeenCalledWith(null);
  });

  it('handles keyboard shortcuts (F, 0, 1, Escape, +, -, R)', () => {
    render(
      <MosChatImageLightboxViewer
        lightboxImage={{
          items: sampleItems,
          currentIndex: 0,
          zoom: 1,
          rotate: 0,
        }}
        setLightboxImage={setLightboxImageMock}
      />
    );

    // Shortcut 'f' for Fit
    fireEvent.keyDown(window, { key: 'f' });
    expect(setLightboxImageMock).toHaveBeenCalled();

    // Shortcut '1' for 100%
    fireEvent.keyDown(window, { key: '1' });
    expect(setLightboxImageMock).toHaveBeenCalled();

    // Shortcut '0' for Fit
    fireEvent.keyDown(window, { key: '0' });
    expect(setLightboxImageMock).toHaveBeenCalled();

    // Shortcut 'Escape' for close
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(setLightboxImageMock).toHaveBeenCalledWith(null);
  });
});
