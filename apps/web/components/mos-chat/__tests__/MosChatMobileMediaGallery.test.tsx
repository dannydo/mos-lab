import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MosChatMobileMediaGallery, type MosChatGalleryImage } from '../mobile/MosChatMobileMediaGallery';

const sampleImages: MosChatGalleryImage[] = [
  {
    id: 'img-1',
    url: '/uploads/lash-design-1.jpg',
    name: 'Mẫu mi Katun tự nhiên',
    senderName: 'Chuyên Viên Mai',
    senderRole: 'CV',
    createdAt: '2026-10-24T10:00:00.000Z',
  },
  {
    id: 'img-2',
    url: '/uploads/lash-design-2.jpg',
    name: 'Mẫu mi Thiết kế Anime',
    senderName: 'Hương CC',
    senderRole: 'CC',
    createdAt: '2026-10-24T10:05:00.000Z',
  },
  {
    id: 'img-3',
    url: '/uploads/lash-design-3.jpg',
    name: 'Mẫu mi Babydoll cong C',
    senderName: 'Danny Do',
    senderRole: 'admin',
    createdAt: '2026-10-24T10:10:00.000Z',
  },
];

describe('MosChatMobileMediaGallery (Messenger-style mobile image slider)', () => {
  it('renders gallery with active image, counter badge, and sender information', () => {
    const handleClose = vi.fn();
    render(<MosChatMobileMediaGallery open={true} images={sampleImages} initialIndex={0} onClose={handleClose} />);

    // Active image counter badge: 1 / 3
    expect(screen.getByText('1 / 3')).toBeTruthy();
    // Sender name of first image
    expect(screen.getByText('Chuyên Viên Mai')).toBeTruthy();

    // Close button
    const closeBtn = screen.getByRole('button', { name: 'Đóng xem hình' });
    expect(closeBtn).toBeTruthy();

    // Download / Open link
    const downloadLink = screen.getByRole('link', { name: 'Mở hoặc tải ảnh gốc' });
    expect(downloadLink).toBeTruthy();

    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('slides to next and previous image via chevron buttons', () => {
    render(<MosChatMobileMediaGallery open={true} images={sampleImages} initialIndex={0} onClose={vi.fn()} />);

    expect(screen.getByText('1 / 3')).toBeTruthy();
    expect(screen.getByText('Chuyên Viên Mai')).toBeTruthy();

    // Tap next chevron
    const nextBtn = screen.getByRole('button', { name: 'Xem hình tiếp theo' });
    fireEvent.click(nextBtn);

    // Counter and sender should update to image 2
    expect(screen.getByText('2 / 3')).toBeTruthy();
    expect(screen.getByText('Hương CC')).toBeTruthy();

    // Tap prev chevron
    const prevBtn = screen.getByRole('button', { name: 'Xem hình trước' });
    fireEvent.click(prevBtn);

    // Counter and sender should return to image 1
    expect(screen.getByText('1 / 3')).toBeTruthy();
    expect(screen.getByText('Chuyên Viên Mai')).toBeTruthy();
  });

  it('navigates to specific image when tapping on thumbnail in bottom strip', () => {
    render(<MosChatMobileMediaGallery open={true} images={sampleImages} initialIndex={0} onClose={vi.fn()} />);

    expect(screen.getByText('1 / 3')).toBeTruthy();

    // Tap on 3rd thumbnail
    const thumb3 = screen.getByRole('button', { name: 'Xem hình 3' });
    fireEvent.click(thumb3);

    expect(screen.getByText('3 / 3')).toBeTruthy();
    expect(screen.getByText('Danny Do')).toBeTruthy();
  });

  it('slides between images on horizontal touch swipe gesture', () => {
    render(<MosChatMobileMediaGallery open={true} images={sampleImages} initialIndex={0} onClose={vi.fn()} />);

    expect(screen.getByText('1 / 3')).toBeTruthy();

    const trackContainer = screen.getByRole('dialog').querySelector('.touch-none') as HTMLElement;
    expect(trackContainer).toBeTruthy();

    // Swipe left (startX: 200, moveX: 120 -> deltaX: -80 < -45)
    fireEvent.touchStart(trackContainer, { touches: [{ clientX: 200, clientY: 300 }] });
    fireEvent.touchMove(trackContainer, { touches: [{ clientX: 120, clientY: 302 }] });
    fireEvent.touchEnd(trackContainer);

    // Should slide to image 2
    expect(screen.getByText('2 / 3')).toBeTruthy();
    expect(screen.getByText('Hương CC')).toBeTruthy();

    // Swipe right (startX: 100, moveX: 180 -> deltaX: +80 > +45)
    fireEvent.touchStart(trackContainer, { touches: [{ clientX: 100, clientY: 300 }] });
    fireEvent.touchMove(trackContainer, { touches: [{ clientX: 180, clientY: 302 }] });
    fireEvent.touchEnd(trackContainer);

    // Should slide back to image 1
    expect(screen.getByText('1 / 3')).toBeTruthy();
    expect(screen.getByText('Chuyên Viên Mai')).toBeTruthy();
  });

  it('dismisses gallery when pulled down vertically beyond threshold', () => {
    const handleClose = vi.fn();
    render(<MosChatMobileMediaGallery open={true} images={sampleImages} initialIndex={0} onClose={handleClose} />);

    const trackContainer = screen.getByRole('dialog').querySelector('.touch-none') as HTMLElement;

    // Pull down vertically (startY: 100, moveY: 250 -> deltaY: +150 > +90)
    fireEvent.touchStart(trackContainer, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchMove(trackContainer, { touches: [{ clientX: 202, clientY: 250 }] });
    fireEvent.touchEnd(trackContainer);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('closes gallery on Escape key press and navigates with Arrow keys', () => {
    const handleClose = vi.fn();
    render(<MosChatMobileMediaGallery open={true} images={sampleImages} initialIndex={0} onClose={handleClose} />);

    // ArrowRight -> goes to image 2
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('2 / 3')).toBeTruthy();

    // ArrowLeft -> goes back to image 1
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText('1 / 3')).toBeTruthy();

    // Escape -> closes gallery
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('allows zooming in and out via header zoom buttons and resetting to 100% (MOS-FEAT-147)', () => {
    render(<MosChatMobileMediaGallery open={true} images={sampleImages} initialIndex={0} onClose={vi.fn()} />);

    // Default zoom is 100%
    expect(screen.getByText('100%')).toBeTruthy();

    const zoomInBtn = screen.getByRole('button', { name: 'Phóng to ảnh' });
    const zoomOutBtn = screen.getByRole('button', { name: 'Thu nhỏ ảnh' });
    const resetBtn = screen.getByRole('button', { name: 'Đặt lại thu phóng' });

    // Tap Zoom In -> 150%
    fireEvent.click(zoomInBtn);
    expect(screen.getByText('150%')).toBeTruthy();

    // Tap Zoom In again -> 200%
    fireEvent.click(zoomInBtn);
    expect(screen.getByText('200%')).toBeTruthy();

    // Tap Zoom Out -> 150%
    fireEvent.click(zoomOutBtn);
    expect(screen.getByText('150%')).toBeTruthy();

    // Tap Reset -> 100%
    fireEvent.click(resetBtn);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('zooms into 250% on double-tap and resets on second double-tap (MOS-FEAT-147)', () => {
    render(<MosChatMobileMediaGallery open={true} images={sampleImages} initialIndex={0} onClose={vi.fn()} />);

    expect(screen.getByText('100%')).toBeTruthy();

    const trackContainer = screen.getByRole('dialog').querySelector('.touch-none') as HTMLElement;

    // First tap
    fireEvent.touchStart(trackContainer, { touches: [{ clientX: 200, clientY: 300 }] });
    fireEvent.touchEnd(trackContainer);

    // Second tap within 200ms -> triggers double-tap zoom
    fireEvent.touchStart(trackContainer, { touches: [{ clientX: 200, clientY: 300 }] });
    fireEvent.touchEnd(trackContainer);

    expect(screen.getByText('250%')).toBeTruthy();

    // Double tap again to reset back to 100%
    fireEvent.touchStart(trackContainer, { touches: [{ clientX: 200, clientY: 300 }] });
    fireEvent.touchEnd(trackContainer);
    fireEvent.touchStart(trackContainer, { touches: [{ clientX: 200, clientY: 300 }] });
    fireEvent.touchEnd(trackContainer);

    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('resets zoom scale back to 100% when navigating between images (MOS-FEAT-147)', () => {
    render(<MosChatMobileMediaGallery open={true} images={sampleImages} initialIndex={0} onClose={vi.fn()} />);

    // Zoom in to 200%
    const zoomInBtn = screen.getByRole('button', { name: 'Phóng to ảnh' });
    fireEvent.click(zoomInBtn);
    fireEvent.click(zoomInBtn);
    expect(screen.getByText('200%')).toBeTruthy();

    // Navigate to next image via keyboard ArrowRight
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('2 / 3')).toBeTruthy();

    // Zoom automatically resets to 100%
    expect(screen.getByText('100%')).toBeTruthy();
  });
});
