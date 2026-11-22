'use client';

import type React from 'react';
import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import { Sparkles } from 'lucide-react';
import type { SafeAny } from '@mos-lab/shared';
import { useTheme } from '~/context/ThemeContext';
import { apiClient, resolveMediaUrl } from '~/lib/api-client';
import {
  MAX_AVATAR_FILE_BYTES,
  createAiScoringThumbnail,
  drawAvatarPreviewCanvas,
  exportCircularAvatarDataUrl,
  launchConfetti,
  persistAvatarToLocalStorage,
} from './avatarCropHelpers';
import type { AiScoreState, AvatarCropModalProps, PanOffset } from './avatarCropModalTypes';

type UseAvatarCropModalArgs = Pick<AvatarCropModalProps, 'onClose' | 'currentUser' | 'onSuccess'>;

export function useAvatarCropModal({ onClose, currentUser, onSuccess }: UseAvatarCropModalArgs) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [panOffset, setPanOffset] = useState<PanOffset>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<PanOffset>({ x: 0, y: 0 });
  const [aiScoreState, setAiScoreState] = useState<AiScoreState>({ status: 'idle' });
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img) return;
    drawAvatarPreviewCanvas(canvas, img, zoom, rotation, panOffset);
  }, [zoom, rotation, panOffset]);

  const runAiScoring = useCallback(async (base64Img: string) => {
    setAiScoreState({ status: 'analyzing' });
    const user = currentUserRef.current;
    try {
      const res = await apiClient.ai.scoreAvatar({
        photoData: base64Img,
        imageBase64: base64Img,
        mimeType: 'image/jpeg',
        staffName: user?.displayName || user?.username,
        role: user?.role,
      });
      setAiScoreState({ status: 'scored', data: res });
    } catch {
      setAiScoreState({
        status: 'error',
        errorMessage: 'Chưa chấm điểm tự động được, bạn vẫn có thể lưu ảnh bình thường nhé!',
      });
    }
  }, []);

  useEffect(() => {
    if (!selectedImageSrc) {
      imageObjRef.current = null;
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      imageObjRef.current = img;
      setZoom(1);
      setRotation(0);
      setPanOffset({ x: 0, y: 0 });
      if (canvasRef.current) {
        drawAvatarPreviewCanvas(canvasRef.current, img, 1, 0, { x: 0, y: 0 });
      }

      const thumbDataUrl = createAiScoringThumbnail(img, selectedImageSrc);
      void runAiScoring(thumbDataUrl);
    };
    img.src = selectedImageSrc;

    return () => {
      cancelled = true;
    };
  }, [selectedImageSrc, runAiScoring]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas, selectedImageSrc]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_AVATAR_FILE_BYTES) {
      message.error('Ảnh quá lớn (> 10MB). Vui lòng chọn ảnh nhẹ hơn nhé!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSelectedImageSrc(result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    },
    [panOffset.x, panOffset.y]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging) return;
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart.x, dragStart.y]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length === 1) {
        setIsDragging(true);
        const touch = e.touches[0];
        setDragStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
      }
    },
    [panOffset.x, panOffset.y]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDragging || e.touches.length !== 1) return;
      const touch = e.touches[0];
      setPanOffset({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart.x, dragStart.y]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedImageSrc(null);
    setAiScoreState({ status: 'idle' });
    setZoom(1);
    setRotation(0);
    setPanOffset({ x: 0, y: 0 });
    onClose();
  }, [onClose]);

  const handleSaveAvatar = useCallback(async () => {
    if (!canvasRef.current) return;
    const croppedBase64 = exportCircularAvatarDataUrl(canvasRef.current);
    if (!croppedBase64) return;

    setIsUploading(true);
    try {
      const user = currentUserRef.current;
      const res = await apiClient.staff.uploadAvatar({
        targetStaffId: user?.id,
        staffId: user?.id,
        photoData: croppedBase64,
        mimeType: 'image/jpeg',
      });

      if ((res.success || res.avatarUrl) && res.avatarUrl) {
        const resolvedAvatarUrl = resolveMediaUrl(res.avatarUrl);
        persistAvatarToLocalStorage(resolvedAvatarUrl);
        launchConfetti();
        message.success({
          content: 'Đã cập nhật ảnh đại diện mới rực rỡ và tỏa sáng!',
          icon: createElement(Sparkles, { className: 'text-amber-500 animate-spin' }),
        });
        onSuccess?.(resolvedAvatarUrl);
        handleClose();
      } else {
        message.error(res.message || 'Không thể lưu avatar. Vui lòng thử lại!');
      }
    } catch (err: SafeAny) {
      message.error(err?.response?.data?.error || 'Lỗi kết nối khi tải ảnh đại diện.');
    } finally {
      setIsUploading(false);
    }
  }, [handleClose, onSuccess]);

  return {
    isDark,
    selectedImageSrc,
    zoom,
    setZoom,
    aiScoreState,
    isUploading,
    canvasRef,
    cameraInputRef,
    galleryInputRef,
    handleFileChange,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleRotate,
    handleSaveAvatar,
    handleClose,
  };
}
