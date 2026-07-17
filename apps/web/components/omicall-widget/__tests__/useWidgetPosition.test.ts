import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useWidgetPosition from '../useWidgetPosition';

describe('useWidgetPosition hook', () => {
  beforeEach(() => {
    // Reset window dimensions
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 768 });
  });

  it('should initialize with default states', () => {
    const { result } = renderHook(() => useWidgetPosition());

    expect(result.current.widgetMinimized).toBe(false);
    expect(result.current.size).toEqual({ width: 384, height: 320 });
    expect(result.current.position).toEqual({ x: 616, y: 424 });
  });

  it('should set minimize state correctly', () => {
    const { result } = renderHook(() => useWidgetPosition());

    act(() => {
      result.current.setWidgetMinimized(true);
    });

    expect(result.current.widgetMinimized).toBe(true);
  });

  it('should initialize position when dragging starts', () => {
    const { result } = renderHook(() => useWidgetPosition());

    // Create a mock mouse event
    const mockEvent = {
      preventDefault: vi.fn(),
      clientX: 100,
      clientY: 100,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleDragStart(mockEvent, false);
    });

    // When position is null, drag start initializes position based on window boundary
    // Default position is bottom right (1024 - 384 - 24 = 616, 768 - 320 - 24 = 424)
    expect(result.current.position).toEqual({ x: 616, y: 424 });
  });
});
