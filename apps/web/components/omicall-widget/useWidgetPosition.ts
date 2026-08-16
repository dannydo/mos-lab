import { useState, useEffect } from 'react';
import { getViewportSize } from '../../hooks/useResponsiveTier';

export const useWidgetPosition = () => {
  const [widgetMinimized, setWidgetMinimizedState] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 384, height: 320 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const setWidgetMinimized = (min: boolean) => {
    setWidgetMinimizedState(min);
    localStorage.setItem('omi_widget_minimized', min ? 'true' : 'false');
  };

  const handleDragStart = (e: React.MouseEvent, isMinimized: boolean = false) => {
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('.ant-select') ||
      target.closest('.ant-btn')
    ) {
      return;
    }

    e.preventDefault();
    setIsDragging(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const currentWidth = isMinimized ? 56 : size.width;
    const currentHeight = isMinimized ? 56 : size.height;

    const viewport = getViewportSize();
    const initialX = position?.x ?? viewport.width - currentWidth - 24;
    const initialY = position?.y ?? viewport.height - currentHeight - 24;
    let hasMoved = false;

    let animationFrameId: number | null = null;
    let latestPos = { x: initialX, y: initialY };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        hasMoved = true;
      }

      const currentViewport = getViewportSize();
      const newX = Math.max(10, Math.min(currentViewport.width - currentWidth - 10, initialX + deltaX));
      const newY = Math.max(10, Math.min(currentViewport.height - currentHeight - 10, initialY + deltaY));
      latestPos = { x: newX, y: newY };

      if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(() => {
          setPosition(latestPos);
          animationFrameId = null;
        });
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setIsDragging(false);

      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }

      // Save position to localStorage once when dragging ends
      localStorage.setItem('omi_widget_pos', JSON.stringify(latestPos));

      if (isMinimized && !hasMoved) {
        setWidgetMinimized(false);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeStart = (e: React.MouseEvent, direction: 'bottom-right' | 'bottom-left' | 'bottom') => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;
    const viewport = getViewportSize();
    const startXPos = position?.x ?? viewport.width - size.width - 24;
    const startYPos = position?.y ?? viewport.height - size.height - 24;

    let animationFrameId: number | null = null;
    let latestSize = { width: startWidth, height: startHeight };
    let latestX = startXPos;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startXPos;

      if (direction === 'bottom-right') {
        newWidth = Math.max(300, Math.min(800, startWidth + deltaX));
        newHeight = Math.max(240, Math.min(600, startHeight + deltaY));
      } else if (direction === 'bottom-left') {
        newWidth = Math.max(300, Math.min(800, startWidth - deltaX));
        newHeight = Math.max(240, Math.min(600, startHeight + deltaY));
        newX = startXPos + (startWidth - newWidth);
      } else if (direction === 'bottom') {
        newHeight = Math.max(240, Math.min(600, startHeight + deltaY));
      }

      latestSize = { width: newWidth, height: newHeight };
      latestX = newX;

      if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(() => {
          setSize(latestSize);
          if (direction === 'bottom-left') {
            setPosition({ x: latestX, y: position?.y ?? startYPos });
          }
          animationFrameId = null;
        });
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setIsResizing(false);

      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }

      // Save size and position once when resizing ends
      localStorage.setItem('omi_widget_size', JSON.stringify(latestSize));
      if (direction === 'bottom-left') {
        localStorage.setItem('omi_widget_pos', JSON.stringify({ x: latestX, y: position?.y ?? startYPos }));
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMin = localStorage.getItem('omi_widget_minimized');
      if (savedMin !== null) {
        setWidgetMinimizedState(savedMin === 'true');
      }

      const savedPos = localStorage.getItem('omi_widget_pos');
      const savedSize = localStorage.getItem('omi_widget_size');
      if (savedPos) {
        try {
          const parsed = JSON.parse(savedPos);
          const currentWidth = savedMin === 'true' ? 56 : savedSize ? JSON.parse(savedSize).width : 384;
          const currentHeight = savedMin === 'true' ? 56 : savedSize ? JSON.parse(savedSize).height : 320;
          const viewport = getViewportSize();
          const x = Math.max(10, Math.min(viewport.width - currentWidth - 10, parsed.x));
          const y = Math.max(10, Math.min(viewport.height - currentHeight - 10, parsed.y));
          setPosition({ x, y });
        } catch (e) {}
      } else {
        const viewport = getViewportSize();
        const x = viewport.width - 384 - 24;
        const y = viewport.height - 320 - 24;
        setPosition({ x, y });
      }
      if (savedSize) {
        try {
          setSize(JSON.parse(savedSize));
        } catch (e) {}
      }
    }
  }, []);

  return {
    widgetMinimized,
    setWidgetMinimized,
    position,
    setPosition,
    size,
    setSize,
    handleDragStart,
    handleResizeStart,
    isDragging,
    isResizing,
  };
};
export default useWidgetPosition;
