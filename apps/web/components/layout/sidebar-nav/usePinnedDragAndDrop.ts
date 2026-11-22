'use client';

import type React from 'react';
import { useCallback, useState } from 'react';
import type { PinnedLinkItem } from '@mos-lab/shared';

export function usePinnedDragAndDrop(
  pinnedLinks: PinnedLinkItem[],
  reorderLinks: (reordered: PinnedLinkItem[]) => Promise<void>
) {
  const [draggedPinId, setDraggedPinId] = useState<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedPinId(id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const sourceId = e.dataTransfer.getData('text/plain') || draggedPinId;
      if (!sourceId || sourceId === targetId) return;

      const sourceIndex = pinnedLinks.findIndex((item) => item.id === sourceId);
      const targetIndex = pinnedLinks.findIndex((item) => item.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) return;

      const nextItems = [...pinnedLinks];
      const [removed] = nextItems.splice(sourceIndex, 1);
      nextItems.splice(targetIndex, 0, removed);
      reorderLinks(nextItems);
      setDraggedPinId(null);
    },
    [draggedPinId, pinnedLinks, reorderLinks]
  );

  return {
    handleDragStart,
    handleDragOver,
    handleDrop,
  };
}
