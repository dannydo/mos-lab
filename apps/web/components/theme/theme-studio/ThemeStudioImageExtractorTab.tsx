'use client';

import type { ClipboardEvent, RefObject } from 'react';
import { Button } from 'antd';
import { Image as ImageIcon, Sparkles } from 'lucide-react';

interface ThemeStudioImageExtractorTabProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  imagePreview: string | null;
  extractedHexes: string[];
  onPaste: (e: ClipboardEvent) => void;
  onFileSelect: (file: File) => void;
  onGoToBoard: () => void;
}

export function ThemeStudioImageExtractorTab({
  canvasRef,
  imagePreview,
  extractedHexes,
  onPaste,
  onFileSelect,
  onGoToBoard,
}: ThemeStudioImageExtractorTabProps) {
  return (
    <div className="space-y-4 pt-2" onPaste={onPaste}>
      <p className="text-sm text-slate-500">
        Chụp màn hình giao diện anh thấy đẹp trên mạng (`Cmd + Shift + 4`), sau đó <b>dán vào đây (Cmd+V)</b> hoặc chọn
        file ảnh. Hệ thống sẽ tự quét và bốc tách 5-8 màu chủ đạo!
      </p>

      <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center hover:border-amber-500 transition-colors">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelect(file);
          }}
          className="hidden"
          id="theme-image-upload"
        />
        <label htmlFor="theme-image-upload" className="cursor-pointer block">
          <ImageIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <div className="font-medium text-sm text-slate-700 dark:text-slate-300">
            Bấm vào đây để chọn ảnh chụp màn hình, hoặc bấm{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-xs">Cmd + V</kbd> để dán
          </div>
          <div className="text-xs text-slate-400 mt-1">Hỗ trợ PNG, JPG, WebP</div>
        </label>
      </div>

      {imagePreview && (
        <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          <img
            src={imagePreview}
            alt="Preview"
            className="w-20 h-20 object-cover rounded-md border border-slate-200 dark:border-slate-700"
          />
          <div className="flex-1">
            <div className="text-xs font-semibold text-slate-500 mb-1.5">Màu sắc trích xuất thành công:</div>
            <div className="flex flex-wrap gap-2">
              {extractedHexes.map((hex) => (
                <div
                  key={hex}
                  className="flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-mono bg-white dark:bg-slate-800"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block"
                    style={{ backgroundColor: hex }}
                  />
                  <span>{hex}</span>
                </div>
              ))}
            </div>
            <div className="mt-2">
              <Button type="primary" size="small" icon={<Sparkles className="w-3.5 h-3.5" />} onClick={onGoToBoard}>
                Chuyển qua Bảng Tự Sửa để hoàn thiện
              </Button>
            </div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
