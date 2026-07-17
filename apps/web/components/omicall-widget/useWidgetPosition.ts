import { useState, useEffect } from 'react';

export const useWidgetPosition = () => {
  const [widgetMinimized, setWidgetMinimizedState] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 384, height: 320 });

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
    const startX = e.clientX;
    const startY = e.clientY;
    const currentWidth = isMinimized ? 56 : size.width;
    const currentHeight = isMinimized ? 56 : size.height;

    const initialX = position?.x ?? window.innerWidth - currentWidth - 24;
    const initialY = position?.y ?? window.innerHeight - currentHeight - 24;
    let hasMoved = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        hasMoved = true;
      }

      const newX = Math.max(10, Math.min(window.innerWidth - currentWidth - 10, initialX + deltaX));
      const newY = Math.max(10, Math.min(window.innerHeight - currentHeight - 10, initialY + deltaY));
      const newPos = { x: newX, y: newY };
      setPosition(newPos);
      localStorage.setItem('omi_widget_pos', JSON.stringify(newPos));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

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

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;
    const startXPos = position?.x ?? window.innerWidth - size.width - 24;
    const startYPos = position?.y ?? window.innerHeight - size.height - 24;

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

      setSize({ width: newWidth, height: newHeight });
      localStorage.setItem('omi_widget_size', JSON.stringify({ width: newWidth, height: newHeight }));

      if (direction === 'bottom-left') {
        const newPos = { x: newX, y: position?.y ?? startYPos };
        setPosition(newPos);
        localStorage.setItem('omi_widget_pos', JSON.stringify(newPos));
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
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
          const x = Math.max(10, Math.min(window.innerWidth - currentWidth - 10, parsed.x));
          const y = Math.max(10, Math.min(window.innerHeight - currentHeight - 10, parsed.y));
          setPosition({ x, y });
        } catch (e) {}
      } else {
        const x = window.innerWidth - 384 - 24;
        const y = window.innerHeight - 320 - 24;
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
  };
};
export default useWidgetPosition;
