'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MOS_CHAT_MAX_CONCURRENT_VIDEO_UPLOADS,
  MOS_CHAT_MAX_VIDEO_BYTES,
  MOS_CHAT_MAX_VIDEOS_PER_MESSAGE,
  type MosChatImageAttachment,
  type SafeAny,
} from '@mos-lab/shared';
import { uploadSingleChatVideo } from '../../utils/chat-upload';

export type ChatUploadScope = 'main' | 'thread' | 'dock';

export interface PendingChatUploadItem {
  tempId: string;
  file: File;
  fileName: string;
  totalBytes: number;
  loadedBytes: number;
  percent: number;
  phase: 'queued' | 'uploading' | 'finalizing' | 'error';
  errorMessage?: string;
  isVideo: boolean;
  scope: ChatUploadScope;
  convId?: string;
  source: 'clipboard' | 'drive' | 'upload';
  uploadId?: string;
}

interface UploadTaskCallbacks {
  onSuccess: (attachment: MosChatImageAttachment, item: PendingChatUploadItem) => void;
  onError?: (message: string, item: PendingChatUploadItem) => void;
}

function matchesScope(item: PendingChatUploadItem, scope: ChatUploadScope, convId?: string): boolean {
  if (item.scope !== scope) return false;
  if (scope === 'dock') return item.convId === convId;
  return true;
}

function isAbortError(err: SafeAny): boolean {
  return (
    err?.name === 'AbortError' ||
    err?.name === 'CanceledError' ||
    err?.code === 'ERR_CANCELED' ||
    Boolean(err?.__ABORTED__)
  );
}

export function useChatUploadQueue() {
  const [pendingUploads, setPendingUploads] = useState<PendingChatUploadItem[]>([]);
  const pendingRef = useRef<PendingChatUploadItem[]>([]);
  pendingRef.current = pendingUploads;

  const activeTempIdsRef = useRef<Set<string>>(new Set());
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const callbacksRef = useRef<Map<string, UploadTaskCallbacks>>(new Map());
  const cancelledIdsRef = useRef<Set<string>>(new Set());

  const updatePendingList = useCallback((updater: (prev: PendingChatUploadItem[]) => PendingChatUploadItem[]) => {
    setPendingUploads((prev) => {
      const next = updater(prev);
      pendingRef.current = next;
      return next;
    });
  }, []);

  const pumpQueueRef = useRef<() => void>(() => {});

  const startSingleTask = useCallback(
    async (item: PendingChatUploadItem) => {
      if (cancelledIdsRef.current.has(item.tempId)) return;

      const controller = new AbortController();
      abortControllersRef.current.set(item.tempId, controller);
      activeTempIdsRef.current.add(item.tempId);

      updatePendingList((prev) =>
        prev.map((p) =>
          p.tempId === item.tempId
            ? { ...p, phase: 'uploading', errorMessage: undefined, percent: Math.max(1, p.percent) }
            : p
        )
      );

      try {
        const uploaded = await uploadSingleChatVideo(item.file, {
          signal: controller.signal,
          source: item.source,
          onUploadId: (uploadId) => {
            updatePendingList((prev) => prev.map((p) => (p.tempId === item.tempId ? { ...p, uploadId } : p)));
          },
          onProgress: (info) => {
            updatePendingList((prev) =>
              prev.map((p) =>
                p.tempId === item.tempId
                  ? {
                      ...p,
                      loadedBytes: info.loadedBytes,
                      totalBytes: info.totalBytes,
                      percent: info.percent,
                      phase: info.phase,
                    }
                  : p
              )
            );
          },
        });

        if (cancelledIdsRef.current.has(item.tempId) || controller.signal.aborted) {
          return;
        }

        const cbs = callbacksRef.current.get(item.tempId);
        callbacksRef.current.delete(item.tempId);
        updatePendingList((prev) => prev.filter((p) => p.tempId !== item.tempId));

        if (uploaded) {
          uploaded.source = item.source;
          cbs?.onSuccess(uploaded, item);
        } else {
          cbs?.onError?.(`Không thể tải video "${item.fileName}".`, item);
        }
      } catch (err: SafeAny) {
        if (cancelledIdsRef.current.has(item.tempId) || isAbortError(err)) {
          callbacksRef.current.delete(item.tempId);
          updatePendingList((prev) => prev.filter((p) => p.tempId !== item.tempId));
          return;
        }

        const msg = err?.response?.data?.message || err?.message || 'Không thể tải video lên.';
        updatePendingList((prev) =>
          prev.map((p) => (p.tempId === item.tempId ? { ...p, phase: 'error', errorMessage: msg } : p))
        );
        const cbs = callbacksRef.current.get(item.tempId);
        cbs?.onError?.(msg, item);
      } finally {
        activeTempIdsRef.current.delete(item.tempId);
        abortControllersRef.current.delete(item.tempId);
        cancelledIdsRef.current.delete(item.tempId);
        pumpQueueRef.current();
      }
    },
    [updatePendingList]
  );

  const pumpQueue = useCallback(() => {
    while (activeTempIdsRef.current.size < MOS_CHAT_MAX_CONCURRENT_VIDEO_UPLOADS) {
      const nextQueued = pendingRef.current.find(
        (p) => p.phase === 'queued' && !activeTempIdsRef.current.has(p.tempId) && !cancelledIdsRef.current.has(p.tempId)
      );
      if (!nextQueued) break;
      void startSingleTask(nextQueued);
    }
  }, [startSingleTask]);

  pumpQueueRef.current = pumpQueue;

  const enqueueVideoUpload = useCallback(
    (input: {
      file: File;
      scope: ChatUploadScope;
      convId?: string;
      source?: 'clipboard' | 'drive' | 'upload';
      existingVideoCount?: number;
      onSuccess: (attachment: MosChatImageAttachment, item: PendingChatUploadItem) => void;
      onError?: (message: string, item: PendingChatUploadItem) => void;
    }): { accepted: boolean; reason?: string; tempId?: string } => {
      const { file, scope, convId, source = 'upload', existingVideoCount = 0, onSuccess, onError } = input;

      if (file.size <= 0 || file.size > MOS_CHAT_MAX_VIDEO_BYTES) {
        return {
          accepted: false,
          reason: `Video "${file.name}" vượt quá dung lượng tối đa cho phép (100MB).`,
        };
      }

      const pendingInScope = pendingRef.current.filter(
        (p) => p.isVideo && p.phase !== 'error' && matchesScope(p, scope, convId)
      ).length;
      if (existingVideoCount + pendingInScope >= MOS_CHAT_MAX_VIDEOS_PER_MESSAGE) {
        return {
          accepted: false,
          reason: `Mỗi tin nhắn chỉ đính kèm tối đa ${MOS_CHAT_MAX_VIDEOS_PER_MESSAGE} video.`,
        };
      }

      const tempId = `vid-up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const item: PendingChatUploadItem = {
        tempId,
        file,
        fileName: file.name || `video-${Date.now()}.mp4`,
        totalBytes: file.size,
        loadedBytes: 0,
        percent: 0,
        phase: 'queued',
        isVideo: true,
        scope,
        convId,
        source,
      };

      callbacksRef.current.set(tempId, { onSuccess, onError });
      updatePendingList((prev) => [...prev, item]);
      pumpQueue();
      return { accepted: true, tempId };
    },
    [pumpQueue, updatePendingList]
  );

  const cancelUpload = useCallback(
    (tempId: string) => {
      cancelledIdsRef.current.add(tempId);
      const controller = abortControllersRef.current.get(tempId);
      if (controller) {
        controller.abort();
      }
      callbacksRef.current.delete(tempId);
      updatePendingList((prev) => prev.filter((p) => p.tempId !== tempId));
      pumpQueue();
    },
    [pumpQueue, updatePendingList]
  );

  const retryUpload = useCallback(
    (tempId: string) => {
      cancelledIdsRef.current.delete(tempId);
      updatePendingList((prev) =>
        prev.map((p) =>
          p.tempId === tempId
            ? { ...p, phase: 'queued', loadedBytes: 0, percent: 0, errorMessage: undefined, uploadId: undefined }
            : p
        )
      );
      pumpQueue();
    },
    [pumpQueue, updatePendingList]
  );

  const dismissFailedUpload = useCallback(
    (tempId: string) => {
      callbacksRef.current.delete(tempId);
      updatePendingList((prev) => prev.filter((p) => p.tempId !== tempId));
    },
    [updatePendingList]
  );

  const hasActiveUploadsForScope = useCallback((scope: ChatUploadScope, convId?: string): boolean => {
    return pendingRef.current.some((p) => p.phase !== 'error' && matchesScope(p, scope, convId));
  }, []);

  useEffect(() => {
    const controllers = abortControllersRef.current;
    return () => {
      for (const ctrl of controllers.values()) {
        ctrl.abort();
      }
      controllers.clear();
    };
  }, []);

  return {
    pendingUploads,
    enqueueVideoUpload,
    cancelUpload,
    retryUpload,
    dismissFailedUpload,
    hasActiveUploadsForScope,
  };
}
