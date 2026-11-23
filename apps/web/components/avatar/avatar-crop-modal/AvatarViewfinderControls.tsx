'use client';

import React from 'react';
import { Slider } from 'antd';
import { Camera, Image as ImageIcon, RotateCw, ZoomIn } from 'lucide-react';
import { VIEWFINDER_CANVAS_SIZE, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from './avatarCropHelpers';

export interface AvatarViewfinderControlsProps {
  isDark: boolean;
  selectedImageSrc: string | null;
  zoom: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  galleryInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: () => void;
  onTouchStart: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  onTouchMove: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  onTouchEnd: () => void;
  onRotate: () => void;
  onZoomChange: (value: number) => void;
}

export const AvatarViewfinderControls: React.FC<AvatarViewfinderControlsProps> = ({
  isDark,
  selectedImageSrc,
  zoom,
  canvasRef,
  cameraInputRef,
  galleryInputRef,
  onFileChange,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onRotate,
  onZoomChange,
}) => (
  <>
    {/* Hidden inputs for Camera / Gallery */}
    <input
      ref={cameraInputRef}
      type="file"
      accept="image/*"
      capture="user"
      className="hidden"
      onChange={onFileChange}
    />
    <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

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
            width={VIEWFINDER_CANVAS_SIZE}
            height={VIEWFINDER_CANVAS_SIZE}
            className="w-full h-full object-cover touch-none"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
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
            <p className="text-[11px] leading-tight text-slate-500">
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
            onClick={onRotate}
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
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={ZOOM_STEP}
            value={zoom}
            onChange={onZoomChange}
            className="flex-1 m-0"
          />
          <span
            className={`text-[11px] font-mono tabular-nums shrink-0 w-8 text-right font-bold ${
              isDark ? 'text-amber-400' : 'text-amber-700'
            }`}
          >
            {zoom.toFixed(1)}x
          </span>
        </div>
      )}
    </div>
  </>
);
