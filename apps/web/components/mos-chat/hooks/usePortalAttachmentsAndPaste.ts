'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import type { MosChatImageAttachment, SafeAny } from '@mos-lab/shared';
import { resolveMediaUrl } from '../../../lib/api-base-url';
import { apiClient } from '../../../lib/api-client';
import { convertAttachmentToDataUrl } from '../shared/utils/convertAttachmentToDataUrl';
import { useChatUploadQueue } from '../shared/hooks/useChatUploadQueue';
import { isVideoAttachment, parseGoogleDriveImageFromText, readOrCompressImagePayload } from '../utils/chat-helpers';
import { isSupportedVideoFile } from '../utils/chat-video';

export interface UsePortalAttachmentsAndPasteParams {
  open: boolean;
  dockAttachments?: Record<string, MosChatImageAttachment[]>;
  setDockAttachments: React.Dispatch<React.SetStateAction<Record<string, MosChatImageAttachment[]>>>;
  antdMessage: MessageInstance;
}

const IMAGE_HEIC_EXTS = ['heic', 'heif', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'];
const SUPPORTED_CHAT_DOC_EXTS = [
  'mp4',
  'webm',
  'mov',
  'm4v',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'csv',
  'json',
  'zip',
  'rar',
  '7z',
];

function isImageOrHeicFile(f: File): boolean {
  if (f.type && f.type.startsWith('image/')) return true;
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  return IMAGE_HEIC_EXTS.includes(ext);
}

function isSupportedChatFile(f: File): boolean {
  if (isImageOrHeicFile(f)) return true;
  if (isSupportedVideoFile(f)) return true;
  if (
    f.type &&
    (f.type.startsWith('text/') ||
      f.type.includes('pdf') ||
      f.type.includes('document') ||
      f.type.includes('sheet') ||
      f.type.includes('presentation') ||
      f.type.includes('zip'))
  ) {
    return true;
  }
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  return SUPPORTED_CHAT_DOC_EXTS.includes(ext);
}

export function usePortalAttachmentsAndPaste({
  open,
  dockAttachments,
  setDockAttachments,
  antdMessage,
}: UsePortalAttachmentsAndPasteParams) {
  const [stagedAttachments, setStagedAttachments] = useState<MosChatImageAttachment[]>([]);
  const [threadAttachments, setThreadAttachments] = useState<MosChatImageAttachment[]>([]);
  const [nonVideoUploadingCount, setNonVideoUploadingCount] = useState<number>(0);
  const uploadQueue = useChatUploadQueue();

  const stagedRef = useRef(stagedAttachments);
  stagedRef.current = stagedAttachments;
  const threadRef = useRef(threadAttachments);
  threadRef.current = threadAttachments;
  const dockRef = useRef(dockAttachments);
  dockRef.current = dockAttachments;

  const activePendingVideoCount = uploadQueue.pendingUploads.filter((p) => p.phase !== 'error').length;
  const uploadingCount = nonVideoUploadingCount + activePendingVideoCount;
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [isDraggingOverThread, setIsDraggingOverThread] = useState<boolean>(false);
  const [driveLinkModalOpen, setDriveLinkModalOpen] = useState<boolean>(false);
  const [driveLinkInput, setDriveLinkInput] = useState<string>('');
  const [lightboxImage, setLightboxImage] = useState<{
    items: Array<{ id: string; url: string; name: string }>;
    currentIndex: number;
    zoom: number;
    rotate: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadTargetRef = useRef<{ scope: 'main' | 'thread' | 'dock'; convId?: string }>({ scope: 'main' });

  // Global drag listener to reset drag overlays on dragend, drop, or leaving window
  useEffect(() => {
    if (!open) return;
    const handleGlobalDragEnd = () => {
      setIsDraggingOver(false);
      setIsDraggingOverThread(false);
    };
    const handleWindowDragLeave = (e: DragEvent) => {
      if (!e.relatedTarget) {
        setIsDraggingOver(false);
        setIsDraggingOverThread(false);
      }
    };
    window.addEventListener('dragend', handleGlobalDragEnd);
    window.addEventListener('drop', handleGlobalDragEnd);
    window.addEventListener('dragleave', handleWindowDragLeave);
    return () => {
      window.removeEventListener('dragend', handleGlobalDragEnd);
      window.removeEventListener('drop', handleGlobalDragEnd);
      window.removeEventListener('dragleave', handleWindowDragLeave);
    };
  }, [open]);

  const appendAttachmentToTarget = useCallback(
    (attachment: MosChatImageAttachment, scope: 'main' | 'thread' | 'dock', convId?: string) => {
      if (scope === 'thread') {
        setThreadAttachments((prev) => [...prev, attachment].slice(-8));
        return;
      }
      if (scope === 'dock' && convId) {
        setDockAttachments((prev) => ({
          ...prev,
          [convId]: [...(prev[convId] || []), attachment].slice(-8),
        }));
        return;
      }
      setStagedAttachments((prev) => [...prev, attachment].slice(-8));
    },
    [setDockAttachments]
  );

  const removeStagedAttachment = useCallback(
    (attId: string, scope: 'main' | 'thread' | 'dock', convId?: string) => {
      if (scope === 'thread') {
        setThreadAttachments((prev) => prev.filter((a) => a.id !== attId));
        return;
      }
      if (scope === 'dock' && convId) {
        setDockAttachments((prev) => ({
          ...prev,
          [convId]: (prev[convId] || []).filter((a) => a.id !== attId),
        }));
        return;
      }
      setStagedAttachments((prev) => prev.filter((a) => a.id !== attId));
    },
    [setDockAttachments]
  );

  const handleProcessImageFiles = useCallback(
    async (
      files: FileList | File[],
      source: 'clipboard' | 'drive' | 'upload',
      scope: 'main' | 'thread' | 'dock' = 'main',
      convId?: string
    ) => {
      const candidateFiles = Array.from(files).filter(isSupportedChatFile);
      if (candidateFiles.length === 0) {
        antdMessage.warning(
          'Định dạng tệp không được hỗ trợ (hỗ trợ Video MP4/MOV/WebM/M4V, PDF, Excel, Word, TXT, ZIP và hình ảnh).'
        );
        return;
      }

      const existingVideoCount =
        scope === 'thread'
          ? threadRef.current.filter(isVideoAttachment).length
          : scope === 'dock' && convId
            ? (dockRef.current?.[convId] || []).filter(isVideoAttachment).length
            : stagedRef.current.filter(isVideoAttachment).length;

      let queuedVideoOffset = 0;
      const nonVideoFiles: File[] = [];

      for (const file of candidateFiles.slice(0, 10)) {
        if (isSupportedVideoFile(file)) {
          const enqueueRes = uploadQueue.enqueueVideoUpload({
            file,
            scope,
            convId,
            source,
            existingVideoCount: existingVideoCount + queuedVideoOffset,
            onSuccess: (uploadedAtt) => {
              appendAttachmentToTarget(uploadedAtt, scope, convId);
              antdMessage.success(`Đã đính kèm video "${file.name}"`);
            },
            onError: (errMsg) => {
              antdMessage.error(errMsg);
            },
          });
          if (!enqueueRes.accepted && enqueueRes.reason) {
            antdMessage.error(enqueueRes.reason);
          } else if (enqueueRes.accepted) {
            queuedVideoOffset += 1;
          }
        } else {
          nonVideoFiles.push(file);
        }
      }

      if (nonVideoFiles.length === 0) return;

      setNonVideoUploadingCount((c) => c + nonVideoFiles.length);
      for (const file of nonVideoFiles) {
        try {
          if (isImageOrHeicFile(file)) {
            const compressed = await readOrCompressImagePayload(file);
            const uploaded = await apiClient.chat.uploadImage({
              dataBase64: compressed.dataBase64,
              mimeType: compressed.mimeType,
              fileName: file.name || `paste-${Date.now()}.webp`,
              width: compressed.width,
              height: compressed.height,
              source,
            });
            if (uploaded?.attachment) {
              appendAttachmentToTarget(uploaded.attachment, scope, convId);
            }
          } else {
            const base64Data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (evt) => {
                const result = evt.target?.result as string;
                resolve(result?.split(',')[1] || '');
              };
              reader.onerror = () => reject(new Error('Không thể đọc tệp tin'));
              reader.readAsDataURL(file);
            });
            if (!base64Data) continue;

            const ext = (file.name.split('.').pop() || '').toLowerCase();
            let mimeType = file.type || '';
            if (!mimeType || mimeType === 'application/octet-stream') {
              if (ext === 'pdf') mimeType = 'application/pdf';
              else if (ext === 'xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
              else if (ext === 'xls') mimeType = 'application/vnd.ms-excel';
              else if (ext === 'docx')
                mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
              else if (ext === 'doc') mimeType = 'application/msword';
              else if (ext === 'txt') mimeType = 'text/plain';
              else if (ext === 'csv') mimeType = 'text/csv';
              else if (ext === 'zip') mimeType = 'application/zip';
              else mimeType = 'application/octet-stream';
            }

            const uploaded = await apiClient.chat.uploadFile({
              dataBase64: base64Data,
              mimeType: mimeType as SafeAny,
              fileName: file.name,
              source,
            });
            if (uploaded?.attachment) {
              appendAttachmentToTarget(uploaded.attachment, scope, convId);
            }
          }
        } catch (err: SafeAny) {
          antdMessage.error(err?.response?.data?.message || err?.message || 'Không thể tải tệp lên.');
        } finally {
          setNonVideoUploadingCount((c) => Math.max(0, c - 1));
        }
      }
    },
    [antdMessage, appendAttachmentToTarget, uploadQueue]
  );

  const handleClipboardPaste = useCallback(
    (
      e: React.ClipboardEvent<HTMLInputElement | HTMLElement>,
      scope: 'main' | 'thread' | 'dock' = 'main',
      convId?: string
    ) => {
      const items = e.clipboardData?.items;
      if (items && items.length > 0) {
        const pastedFiles: File[] = [];
        for (let i = 0; i < items.length; i += 1) {
          const item = items[i];
          if (item.type.startsWith('image/') || item.kind === 'file') {
            const file = item.getAsFile();
            if (file && isSupportedChatFile(file)) pastedFiles.push(file);
          }
        }
        if (pastedFiles.length > 0) {
          e.preventDefault();
          void handleProcessImageFiles(pastedFiles, 'clipboard', scope, convId);
          return;
        }
      }

      const pastedText = e.clipboardData?.getData('text/plain') || '';
      const driveAttachment = parseGoogleDriveImageFromText(pastedText);
      if (driveAttachment) {
        appendAttachmentToTarget(driveAttachment, scope, convId);
        antdMessage.success('Đã tự động đính kèm hình ảnh từ Google Drive');
      }
    },
    [antdMessage, handleProcessImageFiles, appendAttachmentToTarget]
  );

  const triggerFilePicker = useCallback((scope: 'main' | 'thread' | 'dock' = 'main', convId?: string) => {
    uploadTargetRef.current = { scope, convId };
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, []);

  const handleConfirmDriveLink = useCallback(() => {
    const driveAtt = parseGoogleDriveImageFromText(driveLinkInput);
    if (!driveAtt) {
      antdMessage.warning('Vui lòng dán link hình ảnh Google Drive hợp lệ (drive.google.com/file/d/...)');
      return;
    }
    const target = uploadTargetRef.current;
    appendAttachmentToTarget(driveAtt, target.scope, target.convId);
    setDriveLinkInput('');
    setDriveLinkModalOpen(false);
    antdMessage.success('Đã đính kèm ảnh từ Google Drive');
  }, [antdMessage, appendAttachmentToTarget, driveLinkInput]);

  const openLightbox = useCallback((attachments: MosChatImageAttachment[], initialIndex = 0) => {
    if (!attachments || attachments.length === 0) return;
    const normalized = attachments.map((att, idx) => ({
      id: att.id || `img-${idx}`,
      url: resolveMediaUrl(att.url),
      name: att.name || `Hình đính kèm ${idx + 1}`,
    }));
    const safeIdx = Math.max(0, Math.min(initialIndex, normalized.length - 1));
    setLightboxImage({
      items: normalized,
      currentIndex: safeIdx,
      zoom: 1,
      rotate: 0,
    });
  }, []);

  return {
    stagedAttachments,
    setStagedAttachments,
    threadAttachments,
    setThreadAttachments,
    uploadingCount,
    nonVideoUploadingCount,
    pendingUploads: uploadQueue.pendingUploads,
    cancelPendingUpload: uploadQueue.cancelUpload,
    retryPendingUpload: uploadQueue.retryUpload,
    dismissPendingUpload: uploadQueue.dismissFailedUpload,
    hasActiveUploadsForScope: uploadQueue.hasActiveUploadsForScope,
    isDraggingOver,
    setIsDraggingOver,
    isDraggingOverThread,
    setIsDraggingOverThread,
    driveLinkModalOpen,
    setDriveLinkModalOpen,
    driveLinkInput,
    setDriveLinkInput,
    lightboxImage,
    setLightboxImage,
    fileInputRef,
    uploadTargetRef,
    appendAttachmentToTarget,
    removeStagedAttachment,
    handleProcessImageFiles,
    handleClipboardPaste,
    triggerFilePicker,
    handleConfirmDriveLink,
    openLightbox,
    convertAttachmentToDataUrl,
  };
}
