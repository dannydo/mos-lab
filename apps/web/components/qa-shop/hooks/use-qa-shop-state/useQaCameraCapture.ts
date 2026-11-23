'use client';

import { useState, useCallback, useRef, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import { message } from 'antd';
import type { SafeAny } from '@mos-lab/shared';
import type { ItemStatusMap } from '../../types/qa-shop.types';
import { compressImageFile } from './qaShopMediaHelpers';

export interface UseQaCameraCaptureParams {
  setItemStatuses: Dispatch<SetStateAction<ItemStatusMap>>;
}

/** Manage WebRTC live camera evidence capture and local photo attachment uploads. */
export function useQaCameraCapture({ setItemStatuses }: UseQaCameraCaptureParams) {
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [activeItemIdForCamera, setActiveItemIdForCamera] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const startCamera = useCallback(async () => {
    setIsCameraLoading(true);
    setCameraError(null);
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ truy cập WebRTC camera.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(err.message || 'Không thể mở camera. Vui lòng kiểm tra quyền truy cập camera.');
    } finally {
      setIsCameraLoading(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  const openCameraForItem = (itemId: string) => {
    setActiveItemIdForCamera(itemId);
    setIsCameraModalOpen(true);
    setTimeout(() => {
      startCamera();
    }, 100);
  };

  const closeCameraModal = () => {
    stopCamera();
    setIsCameraModalOpen(false);
    setActiveItemIdForCamera(null);
  };

  const captureLivePhoto = () => {
    if (!videoRef.current || !activeItemIdForCamera) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      setItemStatuses((prev) => ({
        ...prev,
        [activeItemIdForCamera]: {
          ...prev[activeItemIdForCamera],
          result: 'FAIL',
          photoUrl: dataUrl,
        },
      }));

      message.success('Đã chụp ảnh bằng chứng vi phạm thành công!');
      closeCameraModal();
    }
  };

  const handleFileInputChange = async (e: ChangeEvent<HTMLInputElement>, itemId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        message.loading({ content: 'Đang xử lý & đính kèm ảnh bằng chứng...', key: `photo-${itemId}` });
        const dataUrl = await compressImageFile(file);
        if (dataUrl) {
          setItemStatuses((prev) => ({
            ...prev,
            [itemId]: {
              ...prev[itemId],
              result: 'FAIL',
              photoUrl: dataUrl,
            },
          }));
          message.success({ content: 'Đã đính kèm ảnh bằng chứng thành công!', key: `photo-${itemId}` });
        }
      } catch (err: SafeAny) {
        console.error('Compress image error:', err);
        message.error({ content: 'Không thể đính kèm ảnh, vui lòng thử lại!', key: `photo-${itemId}` });
      }
    }
    e.target.value = '';
  };

  return {
    isCameraModalOpen,
    activeItemIdForCamera,
    cameraStream,
    isCameraLoading,
    cameraError,
    videoRef,
    canvasRef,
    openCameraForItem,
    closeCameraModal,
    captureLivePhoto,
    handleFileInputChange,
  };
}
