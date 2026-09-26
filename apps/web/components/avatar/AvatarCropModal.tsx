'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Modal, Slider, message, Spin } from 'antd';
import {
  Camera,
  Image as ImageIcon,
  RotateCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  RefreshCw,
  Smile,
  Sun,
  Layout as LayoutIcon,
  ChevronRight,
  X,
} from 'lucide-react';
import type { SafeAny, AvatarScoreResponse } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { useTheme } from '../../context/ThemeContext';

interface AvatarCropModalProps {
  open: boolean;
  onClose: () => void;
  currentUser: SafeAny;
  onSuccess?: (newAvatarUrl: string) => void;
}

// Lightweight celebration confetti particles using HTML5 canvas
function launchConfetti() {
  if (typeof window === 'undefined') return;
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    document.body.removeChild(canvas);
    return;
  }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#F59E0B', '#EC4899', '#8B5CF6', '#10B981', '#06B6D4', '#EAB308', '#FFFFFF'];
  const particles: Array<{
    x: number;
    y: number;
    size: number;
    color: string;
    speedX: number;
    speedY: number;
    rotation: number;
    rotationSpeed: number;
    opacity: number;
  }> = [];

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height * 0.45,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedX: (Math.random() - 0.5) * 16,
      speedY: Math.random() * -14 - 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      opacity: 1,
    });
  }

  let animationFrameId: number;
  const startTime = Date.now();

  function animate() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const elapsed = Date.now() - startTime;

    particles.forEach((p) => {
      p.x += p.speedX;
      p.y += p.speedY;
      p.speedY += 0.45; // gravity
      p.rotation += p.rotationSpeed;
      p.opacity = Math.max(0, 1 - elapsed / 2800);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });

    if (elapsed < 2800) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(animationFrameId);
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    }
  }

  animate();
}

export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({ open, onClose, currentUser, onSuccess }) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [aiScoreState, setAiScoreState] = useState<{
    status: 'idle' | 'analyzing' | 'scored' | 'error';
    data?: AvatarScoreResponse;
    errorMessage?: string;
  }>({ status: 'idle' });

  const [isUploading, setIsUploading] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // Load image object when selectedImageSrc changes
  useEffect(() => {
    if (!selectedImageSrc) {
      imageObjRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageObjRef.current = img;
      setZoom(1);
      setRotation(0);
      setPanOffset({ x: 0, y: 0 });
      drawCanvas();

      // Create an optimized thumbnail (max 512x512) for fast Gemini Vision scoring
      try {
        const thumbCanvas = document.createElement('canvas');
        const maxDim = 512;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        thumbCanvas.width = w;
        thumbCanvas.height = h;
        const thumbCtx = thumbCanvas.getContext('2d');
        if (thumbCtx) {
          thumbCtx.drawImage(img, 0, 0, w, h);
          const thumbDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.85);
          runAiScoring(thumbDataUrl);
        } else {
          runAiScoring(selectedImageSrc);
        }
      } catch (_) {
        runAiScoring(selectedImageSrc);
      }
    };
    img.src = selectedImageSrc;
  }, [selectedImageSrc]);

  // Redraw when zoom, rotation, panOffset change
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);

    ctx.save();
    // Center origin
    ctx.translate(size / 2, size / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(panOffset.x, panOffset.y);

    // Calculate aspect ratio fit
    const aspect = img.width / img.height;
    let drawWidth = size * zoom;
    let drawHeight = size * zoom;

    if (aspect > 1) {
      drawWidth = size * aspect * zoom;
      drawHeight = size * zoom;
    } else {
      drawWidth = size * zoom;
      drawHeight = (size / aspect) * zoom;
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  };

  useEffect(() => {
    drawCanvas();
  });

  // File selection handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      message.error('Ảnh quá lớn (> 10MB). Vui lòng chọn ảnh nhẹ hơn nhé!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSelectedImageSrc(result);
    };
    reader.readAsDataURL(file);
    // Reset inputs
    e.target.value = '';
  };

  // Run Gemini AI Vision Scoring
  const runAiScoring = async (base64Img: string) => {
    setAiScoreState({ status: 'analyzing' });
    try {
      const res = await apiClient.ai.scoreAvatar({
        photoData: base64Img,
        imageBase64: base64Img,
        mimeType: 'image/jpeg',
        staffName: currentUser?.displayName || currentUser?.username,
        role: currentUser?.role,
      });
      setAiScoreState({ status: 'scored', data: res });
    } catch (_err) {
      setAiScoreState({
        status: 'error',
        errorMessage: 'Chưa chấm điểm tự động được, bạn vẫn có thể lưu ảnh bình thường nhé!',
      });
    }
  };

  // Mouse / Touch Dragging on Viewfinder
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPanOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Rotate 90 degrees
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Upload cropped image
  const handleSaveAvatar = async () => {
    if (!canvasRef.current) return;

    // Export cropped canvas
    // Create an export canvas of 400x400
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 400;
    exportCanvas.height = 400;
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    // Clip circular path for smooth round export
    exportCtx.beginPath();
    exportCtx.arc(200, 200, 200, 0, Math.PI * 2);
    exportCtx.clip();

    // Draw the source preview canvas scaled
    exportCtx.drawImage(canvasRef.current, 0, 0, 400, 400);

    const croppedBase64 = exportCanvas.toDataURL('image/jpeg', 0.92);

    setIsUploading(true);
    try {
      const res = await apiClient.staff.uploadAvatar({
        targetStaffId: currentUser?.id,
        staffId: currentUser?.id,
        photoData: croppedBase64,
        mimeType: 'image/jpeg',
      });

      if ((res.success || res.avatarUrl) && res.avatarUrl) {
        // Update localStorage
        try {
          const stored = localStorage.getItem('mos_user');
          if (stored) {
            const parsed = JSON.parse(stored);
            parsed.avatarUrl = res.avatarUrl;
            parsed.avatar = res.avatarUrl;
            localStorage.setItem('mos_user', JSON.stringify(parsed));
          }
        } catch (_) {}

        launchConfetti();
        message.success({
          content: 'Đã cập nhật ảnh đại diện mới rực rỡ và tỏa sáng!',
          icon: <Sparkles className="text-amber-500 animate-spin" />,
        });

        onSuccess?.(res.avatarUrl);
        handleClose();
      } else {
        message.error(res.message || 'Không thể lưu avatar. Vui lòng thử lại!');
      }
    } catch (err: SafeAny) {
      message.error(err?.response?.data?.error || 'Lỗi kết nối khi tải ảnh đại diện.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedImageSrc(null);
    setAiScoreState({ status: 'idle' });
    setZoom(1);
    setRotation(0);
    setPanOffset({ x: 0, y: 0 });
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      centered
      width={480}
      destroyOnClose
      closeIcon={
        <X size={18} className={isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'} />
      }
      styles={{
        content: {
          background: isDark
            ? 'linear-gradient(180deg, #18181c 0%, #101014 100%)'
            : 'linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)',
          borderRadius: '28px',
          boxShadow: isDark
            ? '0 25px 60px -15px rgba(0,0,0,0.85)'
            : '0 25px 60px -15px rgba(0,0,0,0.18), 0 10px 25px -5px rgba(0,0,0,0.06)',
          padding: 0,
          overflow: 'hidden',
        },
        mask: {
          backdropFilter: 'blur(16px)',
          backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(15, 23, 42, 0.45)',
        },
      }}
    >
      <div
        className={`flex flex-col max-h-[85vh] overflow-y-auto no-scrollbar p-5 md:p-6 select-none ${
          isDark ? 'text-slate-100' : 'text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between pb-3 border-b ${
            isDark ? 'border-white/[0.08]' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
              <Camera size={16} />
            </div>
            <div>
              <h2
                className={`text-sm md:text-base font-bold tracking-tight leading-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                Căn Chỉnh & Chấm Điểm AI
              </h2>
              <p className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Apple Viewfinder & Wings Coach
              </p>
            </div>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border ${
              isDark
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-amber-100 text-amber-800 border-amber-300 shadow-xs'
            }`}
          >
            PRO
          </span>
        </div>

        {/* Hidden inputs for Camera / Gallery */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={handleFileChange}
        />
        <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

        {/* Viewfinder Canvas Area */}
        <div className="mt-4 flex flex-col items-center">
          <div
            className={`relative w-64 h-64 md:w-72 md:h-72 rounded-full overflow-hidden border-2 shadow-2xl flex items-center justify-center group cursor-grab active:cursor-grabbing ${
              isDark ? 'border-amber-500/40 bg-black/40' : 'border-amber-400 bg-slate-100 shadow-inner'
            }`}
          >
            {selectedImageSrc ? (
              <canvas
                ref={canvasRef}
                width={300}
                height={300}
                className="w-full h-full object-cover touch-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center border ${
                    isDark
                      ? 'bg-white/[0.05] border-white/10 text-slate-400'
                      : 'bg-white border-slate-200 text-slate-500 shadow-sm'
                  }`}
                >
                  <ImageIcon size={28} />
                </div>
                <div className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Chưa chọn ảnh đại diện
                </div>
                <p className={`text-[11px] leading-tight ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                  Chụp một tấm hình selfie rạng rỡ hoặc chọn từ thư viện iPhone của bạn
                </p>
              </div>
            )}

            {/* Apple Intelligence Aura Glowing Border Ring */}
            <div className="absolute inset-0 rounded-full pointer-events-none ring-1 ring-inset ring-white/20" />

            {/* Rule of Thirds subtle lines */}
            {selectedImageSrc && (
              <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute left-1/3 top-0 bottom-0 w-[1px] bg-white" />
                <div className="absolute left-2/3 top-0 bottom-0 w-[1px] bg-white" />
                <div className="absolute top-1/3 left-0 right-0 h-[1px] bg-white" />
                <div className="absolute top-2/3 left-0 right-0 h-[1px] bg-white" />
              </div>
            )}
          </div>

          {/* Action buttons to Pick / Snap Photo */}
          <div className="mt-3.5 flex items-center gap-2.5 w-full">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className={`flex-1 py-2 px-3 rounded-xl border active:scale-95 transition-all text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                isDark
                  ? 'bg-white/[0.08] hover:bg-white/[0.12] border-white/10 text-slate-200'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
            >
              <Camera size={14} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
              Chụp Camera
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className={`flex-1 py-2 px-3 rounded-xl border active:scale-95 transition-all text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                isDark
                  ? 'bg-white/[0.08] hover:bg-white/[0.12] border-white/10 text-slate-200'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
            >
              <ImageIcon size={14} className={isDark ? 'text-sky-400' : 'text-sky-600'} />
              Chọn từ Thư Viện
            </button>
            {selectedImageSrc && (
              <button
                type="button"
                onClick={handleRotate}
                title="Xoay 90 độ"
                className={`w-9 h-9 rounded-xl border active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-sm ${
                  isDark
                    ? 'bg-white/[0.08] hover:bg-white/[0.12] border-white/10 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                }`}
              >
                <RotateCw size={14} />
              </button>
            )}
          </div>

          {/* Zoom Slider Control */}
          {selectedImageSrc && (
            <div
              className={`mt-3 w-full border rounded-xl px-3.5 py-1.5 flex items-center gap-3 ${
                isDark ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <ZoomIn size={14} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
              <Slider
                min={0.8}
                max={3.0}
                step={0.05}
                value={zoom}
                onChange={(val) => setZoom(val)}
                className="flex-1 m-0"
              />
              <span
                className={`text-[11px] font-mono shrink-0 w-8 text-right font-bold ${
                  isDark ? 'text-amber-400' : 'text-amber-700'
                }`}
              >
                {zoom.toFixed(1)}x
              </span>
            </div>
          )}
        </div>

        {/* Wings AI Coach & Gemini Vision Scoring Card */}
        {selectedImageSrc && (
          <div
            className={`mt-4 rounded-2xl p-3.5 relative overflow-hidden backdrop-blur-md border shadow-md ${
              isDark
                ? 'bg-white/[0.04] border-white/[0.1]'
                : 'bg-gradient-to-br from-amber-50/90 via-white to-purple-50/50 border-amber-200/80'
            }`}
          >
            {/* Ambient Aurora Gradient */}
            <div
              className={`absolute -top-12 -right-12 w-28 h-28 blur-2xl pointer-events-none ${
                isDark
                  ? 'bg-gradient-to-br from-amber-500/20 to-purple-500/20'
                  : 'bg-gradient-to-br from-amber-400/20 to-purple-400/20'
              }`}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles
                  size={16}
                  className={isDark ? 'text-amber-400 animate-pulse' : 'text-amber-600 animate-pulse'}
                />
                <span className={`text-xs font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Wings AI Coach
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    isDark
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      : 'bg-purple-100 text-purple-800 border-purple-200 shadow-xs'
                  }`}
                >
                  Gemini Vision
                </span>
              </div>
              {aiScoreState.status === 'analyzing' && (
                <div
                  className={`flex items-center gap-1.5 text-[11px] font-medium ${
                    isDark ? 'text-amber-300' : 'text-amber-700'
                  }`}
                >
                  <Spin size="small" />
                  Đang quét thần thái...
                </div>
              )}
            </div>

            {/* Score Content */}
            {aiScoreState.status === 'scored' && aiScoreState.data && (
              <div className="mt-2.5 space-y-2.5">
                {aiScoreState.data.isHumanPortrait ? (
                  <>
                    {/* Badge and Total Score */}
                    <div
                      className={`flex items-center justify-between rounded-xl p-2.5 border ${
                        isDark ? 'bg-black/30 border-white/5' : 'bg-white border-slate-200/80 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <div>
                          <div className={`text-[12px] font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                            {aiScoreState.data.badge || 'Nụ Cười Tỏa Sáng'}
                          </div>
                          <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {aiScoreState.data.verdict}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-baseline gap-0.5">
                        <span
                          className={`text-xl font-black font-mono ${isDark ? 'text-amber-400' : 'text-amber-600'}`}
                        >
                          {aiScoreState.data.totalScore}
                        </span>
                        <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          /10
                        </span>
                      </div>
                    </div>

                    {/* 3 Metric Bars */}
                    {aiScoreState.data.metrics && (
                      <div className="grid grid-cols-3 gap-2">
                        <div
                          className={`rounded-lg p-2 border shadow-xs ${
                            isDark ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200/80'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span
                              className={`flex items-center gap-1 font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
                            >
                              <Smile size={11} className="text-pink-500" /> Nụ cười
                            </span>
                            <span className={`font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                              {aiScoreState.data.metrics.smile}/10
                            </span>
                          </div>
                          <div
                            className={`w-full rounded-full h-1.5 overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}
                          >
                            <div
                              className="bg-gradient-to-r from-pink-500 to-rose-400 h-full rounded-full transition-all duration-500"
                              style={{ width: `${aiScoreState.data.metrics.smile * 10}%` }}
                            />
                          </div>
                        </div>

                        <div
                          className={`rounded-lg p-2 border shadow-xs ${
                            isDark ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200/80'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span
                              className={`flex items-center gap-1 font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
                            >
                              <Sun size={11} className="text-amber-500" /> Ánh sáng
                            </span>
                            <span className={`font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                              {aiScoreState.data.metrics.lighting}/10
                            </span>
                          </div>
                          <div
                            className={`w-full rounded-full h-1.5 overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}
                          >
                            <div
                              className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500"
                              style={{ width: `${aiScoreState.data.metrics.lighting * 10}%` }}
                            />
                          </div>
                        </div>

                        <div
                          className={`rounded-lg p-2 border shadow-xs ${
                            isDark ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200/80'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span
                              className={`flex items-center gap-1 font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
                            >
                              <LayoutIcon size={11} className="text-sky-500" /> Bố cục
                            </span>
                            <span className={`font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                              {aiScoreState.data.metrics.composition}/10
                            </span>
                          </div>
                          <div
                            className={`w-full rounded-full h-1.5 overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}
                          >
                            <div
                              className="bg-gradient-to-r from-sky-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                              style={{ width: `${aiScoreState.data.metrics.composition * 10}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* AI Feedback advice */}
                    {aiScoreState.data.feedback && (
                      <p
                        className={`text-[11px] leading-snug italic rounded-xl p-2.5 border ${
                          isDark
                            ? 'bg-amber-500/[0.07] border-amber-500/20 text-slate-300'
                            : 'bg-amber-50 border-amber-300/80 text-amber-950 font-medium'
                        }`}
                      >
                        💡 &ldquo;{aiScoreState.data.feedback}&rdquo;
                      </p>
                    )}
                  </>
                ) : (
                  <div
                    className={`rounded-xl p-3 flex items-start gap-2.5 border ${
                      isDark ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-200'
                    }`}
                  >
                    <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <div className={`text-xs font-bold ${isDark ? 'text-rose-300' : 'text-rose-800'}`}>
                        Không nhận diện thấy chân dung
                      </div>
                      <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {aiScoreState.data.feedback ||
                          'Hãy chọn một tấm ảnh có khuôn mặt và nụ cười của bạn để tỏa sáng trên hệ thống nhé!'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {aiScoreState.status === 'error' && (
              <p className={`text-[11px] mt-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {aiScoreState.errorMessage}
              </p>
            )}
          </div>
        )}

        {/* Footer Buttons */}
        <div
          className={`mt-5 pt-3 border-t flex items-center justify-end gap-3 ${
            isDark ? 'border-white/[0.08]' : 'border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
              isDark
                ? 'bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 border-white/10'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-300 shadow-xs'
            }`}
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={!selectedImageSrc || isUploading}
            onClick={handleSaveAvatar}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg border ${
              selectedImageSrc && !isUploading
                ? 'bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 active:scale-95 shadow-amber-500/25 border-amber-400/40'
                : isDark
                  ? 'bg-white/10 text-slate-500 border-transparent cursor-not-allowed'
                  : 'bg-slate-200 text-slate-400 border-transparent cursor-not-allowed'
            }`}
          >
            {isUploading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Đang lưu Avatar...
              </>
            ) : (
              <>
                Lưu Avatar & Tỏa Sáng
                <ChevronRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AvatarCropModal;
