'use client';

import React, { useEffect } from 'react';
import type { MosChatActiveSubtab } from '../types/mos-chat-types';
import type { LightboxImageState } from './usePortalNavigationAndShortcuts';

export interface UsePortalKeyboardAndAutofocusParams {
  open: boolean;
  onClose: () => void;
  onToggle: () => void;
  activeConvId: string;
  activeSubtab: MosChatActiveSubtab;
  threadOpen: boolean;
  setThreadOpen: (open: boolean) => void;
  setSearchModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  lightboxImage: LightboxImageState | null;
  setLightboxImage: React.Dispatch<React.SetStateAction<LightboxImageState | null>>;
  composerInputRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  threadInputRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  dockInputRefs: React.MutableRefObject<Record<string, HTMLTextAreaElement | null>>;
  dockedConvIds: string[];
  collapsedDockIds: Record<string, boolean>;
  anyComposerBlockingModalOpen: boolean;
  anyEscapeBlockingModalOpen: boolean;
}

/**
 * Registers global keyboard shortcuts (Cmd+K search, Cmd+J portal toggle,
 * Escape / lightbox controls) and smart click-anywhere composer autofocus.
 */
export function usePortalKeyboardAndAutofocus({
  open,
  onClose,
  onToggle,
  activeConvId,
  activeSubtab,
  threadOpen,
  setThreadOpen,
  setSearchModalOpen,
  lightboxImage,
  setLightboxImage,
  composerInputRef,
  threadInputRef,
  dockInputRefs,
  dockedConvIds,
  collapsedDockIds,
  anyComposerBlockingModalOpen,
  anyEscapeBlockingModalOpen,
}: UsePortalKeyboardAndAutofocusParams): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSearchModalOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxImage) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setLightboxImage(null);
          return;
        }
        if (e.key === 'ArrowLeft' && lightboxImage.items.length > 1) {
          e.preventDefault();
          setLightboxImage((prev) =>
            prev
              ? {
                  ...prev,
                  currentIndex: (prev.currentIndex - 1 + prev.items.length) % prev.items.length,
                  zoom: 1,
                  rotate: 0,
                }
              : null
          );
          return;
        }
        if (e.key === 'ArrowRight' && lightboxImage.items.length > 1) {
          e.preventDefault();
          setLightboxImage((prev) =>
            prev
              ? {
                  ...prev,
                  currentIndex: (prev.currentIndex + 1) % prev.items.length,
                  zoom: 1,
                  rotate: 0,
                }
              : null
          );
          return;
        }
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          setLightboxImage((prev) =>
            prev ? { ...prev, zoom: Math.min(4, Number((prev.zoom + 0.25).toFixed(2))) } : null
          );
          return;
        }
        if (e.key === '-') {
          e.preventDefault();
          setLightboxImage((prev) =>
            prev ? { ...prev, zoom: Math.max(0.5, Number((prev.zoom - 0.25).toFixed(2))) } : null
          );
          return;
        }
        if (e.key === '0') {
          e.preventDefault();
          setLightboxImage((prev) => (prev ? { ...prev, zoom: 1, rotate: 0 } : null));
          return;
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        onToggle();
        return;
      }
      if (open && e.key === 'Escape') {
        if (e.defaultPrevented || anyEscapeBlockingModalOpen) {
          return;
        }
        if (threadOpen) {
          e.preventDefault();
          setThreadOpen(false);
          return;
        }
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggle, onClose, open, lightboxImage, setLightboxImage, threadOpen, setThreadOpen, anyEscapeBlockingModalOpen]);

  useEffect(() => {
    if (open && activeSubtab === 'chat' && !anyComposerBlockingModalOpen && !lightboxImage) {
      const t = setTimeout(() => {
        composerInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(t);
    }
  }, [open, activeConvId, activeSubtab, anyComposerBlockingModalOpen, lightboxImage, composerInputRef]);

  useEffect(() => {
    const hasExpandedDock = dockedConvIds.some((id) => !collapsedDockIds[id]);
    if (!open && !hasExpandedDock) return;
    if (anyComposerBlockingModalOpen || lightboxImage) return;

    const INTERACTIVE_SELECTOR = [
      'a',
      'button',
      'input',
      'textarea',
      'select',
      'label',
      'summary',
      '[role="button"]',
      '[role="link"]',
      '[role="menuitem"]',
      '[role="option"]',
      '[role="tab"]',
      '[role="switch"]',
      '[role="checkbox"]',
      '[role="combobox"]',
      '[role="dialog"]',
      '[contenteditable="true"]',
      '[data-no-chat-autofocus="true"]',
      '.ant-modal',
      '.ant-drawer',
      '.ant-select',
      '.ant-select-dropdown',
      '.ant-picker',
      '.ant-picker-dropdown',
      '.ant-dropdown',
      '.ant-popover',
      '.ant-popconfirm',
      '.ant-tooltip',
      '.ant-pagination',
      '.ant-tabs-tab',
      '.ant-table-thead th.ant-table-column-has-sorters',
      '.ant-checkbox-wrapper',
      '.ant-radio-wrapper',
      '.ant-switch',
      '.ant-upload',
    ].join(', ');

    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const selection = window.getSelection()?.toString().trim();
      if (selection && selection.length > 0) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(INTERACTIVE_SELECTOR)) return;

      const dockEl = target.closest('[data-dock-conv-id]') as HTMLElement | null;
      if (dockEl) {
        const dockConvId = dockEl.getAttribute('data-dock-conv-id');
        if (dockConvId && dockInputRefs.current[dockConvId]) {
          dockInputRefs.current[dockConvId]?.focus();
          return;
        }
      }

      if (open && threadOpen && target.closest('[data-chat-thread-pane="true"]')) {
        threadInputRef.current?.focus();
        return;
      }

      if (open && activeSubtab === 'chat') {
        composerInputRef.current?.focus();
        return;
      }

      const activeDockId = [...dockedConvIds].reverse().find((id) => !collapsedDockIds[id]);
      if (activeDockId && dockInputRefs.current[activeDockId]) {
        dockInputRefs.current[activeDockId]?.focus();
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [
    open,
    activeSubtab,
    threadOpen,
    dockedConvIds,
    collapsedDockIds,
    anyComposerBlockingModalOpen,
    lightboxImage,
    composerInputRef,
    threadInputRef,
    dockInputRefs,
  ]);
}
