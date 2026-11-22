'use client';

import React from 'react';
import { Card } from 'antd';
import { Camera, Eye } from 'lucide-react';

interface MacroPhotoCaptureCardProps {
  leftEyePhoto: string | null;
  rightEyePhoto: string | null;
  onCaptureLeftEye: () => void;
  onCaptureRightEye: () => void;
}

interface EyeCaptureSlotProps {
  hasPhoto: boolean;
  eyeTitle: string;
  eyeMeta: string;
  watermarkLabel: string;
  buttonLabel: string;
  gradientClass: string;
  iconColorClass: string;
  onCapture: () => void;
}

function EyeCaptureSlot({
  hasPhoto,
  eyeTitle,
  eyeMeta,
  watermarkLabel,
  buttonLabel,
  gradientClass,
  iconColorClass,
  onCapture,
}: EyeCaptureSlotProps) {
  return (
    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-1.5">
      <div className="w-full h-24 rounded-lg bg-slate-200 dark:bg-slate-700/80 flex items-center justify-center text-slate-400 relative overflow-hidden group">
        {hasPhoto ? (
          <div
            className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr ${gradientClass} text-slate-700 dark:text-slate-200 text-xs p-1`}
          >
            <Eye size={22} className={`${iconColorClass} mb-1`} />
            <span className="font-bold text-[10px]">{eyeTitle}</span>
            <span className="text-[9px] text-slate-500 dark:text-slate-400">{eyeMeta}</span>
          </div>
        ) : (
          <Camera size={20} />
        )}
        <span className="absolute bottom-1 right-1 text-[8px] font-bold bg-black/60 text-white px-1 rounded">
          {watermarkLabel}
        </span>
      </div>
      <button
        type="button"
        onClick={onCapture}
        className="w-full py-1.5 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
      >
        {buttonLabel}
      </button>
    </div>
  );
}

export function MacroPhotoCaptureCard({
  leftEyePhoto,
  rightEyePhoto,
  onCaptureLeftEye,
  onCaptureRightEye,
}: MacroPhotoCaptureCardProps) {
  return (
    <Card
      variant="outlined"
      className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
            <Camera size={15} className="text-amber-500" />
            <span>Minh Chứng Hình Ảnh Thực Tế (Macro 2 Mắt)</span>
          </span>
          <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
            Watermark mOS Verified
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <EyeCaptureSlot
            hasPhoto={Boolean(leftEyePhoto)}
            eyeTitle="MẮT TRÁI (L-EYE)"
            eyeMeta="C-Curl 65° · Cân Xứng"
            watermarkLabel="mOS #01"
            buttonLabel="📸 Chụp Mắt Trái"
            gradientClass="from-amber-500/20 to-emerald-500/20"
            iconColorClass="text-amber-600"
            onCapture={onCaptureLeftEye}
          />
          <EyeCaptureSlot
            hasPhoto={Boolean(rightEyePhoto)}
            eyeTitle="MẮT PHẢI (R-EYE)"
            eyeMeta="C-Curl 65° · Độ Lệch 0mm"
            watermarkLabel="mOS #02"
            buttonLabel="📸 Chụp Mắt Phải"
            gradientClass="from-emerald-500/20 to-blue-500/20"
            iconColorClass="text-emerald-600"
            onCapture={onCaptureRightEye}
          />
        </div>
      </div>
    </Card>
  );
}
