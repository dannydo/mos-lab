'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface UsePointerTriggerOptions {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

export function usePointerTrigger(options?: UsePointerTriggerOptions) {
  const [internalOpen, setInternalOpen] = useState(options?.defaultOpen ?? false);
  const isControlled = options?.open !== undefined;
  const open = isControlled ? options.open! : internalOpen;

  const setOpen = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      setInternalOpen((prevInternal) => {
        const currentVal = isControlled ? options!.open! : prevInternal;
        const nextVal = typeof next === 'function' ? next(currentVal) : next;
        options?.onOpenChange?.(nextVal);
        return nextVal;
      });
    },
    [isControlled, options]
  );

  const lastToggleRef = useRef(0);
  const triggerIdRef = useRef(`ptr-${Math.random().toString(36).slice(2, 9)}`);

  const toggle = useCallback(
    (e?: React.SyntheticEvent | Event) => {
      const now = Date.now();
      if (now - lastToggleRef.current < 250) return;
      lastToggleRef.current = now;
      if (e) {
        e.stopPropagation();
      }
      setOpen((prev) => !prev);
    },
    [setOpen]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 0) {
        toggle(e);
      }
    },
    [toggle]
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0) {
        toggle(e);
      }
    },
    [toggle]
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      toggle(e);
    },
    [toggle]
  );

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      toggle(e);
    },
    [toggle]
  );

  // Fallback outside dismissal via pointerdown for browsers where mousedown/click is suppressed
  useEffect(() => {
    if (!open) return;

    const handleOutsidePointer = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target) return;

      // Check if target is inside this trigger button
      if (target.closest?.(`[data-ptr-id="${triggerIdRef.current}"]`)) return;

      // Check if target is inside an active antd dropdown, popover, or select popup
      const activePopups = document.querySelectorAll(
        '.ant-dropdown:not(.ant-dropdown-hidden), .ant-popover:not(.ant-popover-hidden), .ant-select-dropdown:not(.ant-select-dropdown-hidden)'
      );
      for (let i = 0; i < activePopups.length; i++) {
        if (activePopups[i].contains(target)) return;
      }

      setOpen(false);
    };

    document.addEventListener('pointerdown', handleOutsidePointer);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointer);
    };
  }, [open, setOpen]);

  return {
    open,
    setOpen,
    toggle,
    triggerProps: {
      'data-ptr-id': triggerIdRef.current,
      onPointerDown,
      onMouseDown,
      onTouchStart,
      onClick,
    },
  };
}

export default usePointerTrigger;
