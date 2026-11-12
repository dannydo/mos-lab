'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, Trash2, Loader2, User } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { compressLashImage } from '../../utils/imageCompressor';

export interface CustomerAvatarPickerProps {
  avatarUrl?: string | null;
  customerName: string;
  customerPhone?: string;
  avatarRingClass?: string;
  size?: number; // Size in px, default 46
  onUpdateAvatar?: (newUrl: string) => Promise<any> | void;
  disabled?: boolean;
}

export function CustomerAvatarPicker({
  avatarUrl,
  customerName,
  customerPhone,
  avatarRingClass = 'border-[2px] border-[#34C759]',
  size = 46,
  onUpdateAvatar,
  disabled = false,
}: CustomerAvatarPickerProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [currentAvatar, setCurrentAvatar] = useState<string | undefined>(avatarUrl || undefined);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasImgError, setHasImgError] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentAvatar(avatarUrl || undefined);
    setHasImgError(false);
  }, [avatarUrl]);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSheetOpen(false);
    setIsLoading(true);
    setHasImgError(false);

    try {
      // 1. Phản hồi tức thời với blob URL
      const tempUrl = URL.createObjectURL(file);
      setCurrentAvatar(tempUrl);

      // 2. Nén ảnh qua canvas nhẹ và sắc nét (tối đa 800px, dung lượng ~30-50KB)
      const compressed = await compressLashImage(file, 800, 0.8);
      try {
        URL.revokeObjectURL(tempUrl);
      } catch (_) {}

      setCurrentAvatar(compressed);

      // 3. Đồng bộ lên state và server
      if (onUpdateAvatar) {
        await onUpdateAvatar(compressed);
      }
    } catch (err) {
      console.warn('[CustomerAvatarPicker] Failed to process avatar image:', err);
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setIsSheetOpen(false);
    setIsLoading(true);
    setCurrentAvatar('');
    setHasImgError(false);
    try {
      if (onUpdateAvatar) {
        await onUpdateAvatar('');
      }
    } catch (err) {
      console.warn('[CustomerAvatarPicker] Failed to remove avatar:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const initials = customerName
    ? customerName
        .split(' ')
        .filter(Boolean)
        .slice(-2)
        .map((p) => p.charAt(0).toUpperCase())
        .join('')
    : 'KH';

  return (
    <>
      {/* Hidden File Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
        disabled={disabled || isLoading}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
        disabled={disabled || isLoading}
      />

      {/* Avatar Display & Trigger */}
      <div className="relative shrink-0 select-none">
        <button
          type="button"
          disabled={disabled || isLoading}
          onClick={() => setIsSheetOpen(true)}
          title="Chạm để thay đổi ảnh đại diện khách hàng"
          aria-label={`Ảnh đại diện của ${customerName}. Chạm để thay đổi.`}
          style={{ width: size, height: size }}
          className={`relative rounded-full overflow-hidden ${avatarRingClass} p-0.5 flex items-center justify-center bg-neutral-900 shadow-sm cursor-pointer active:scale-95 transition-transform group`}
        >
          {currentAvatar && !hasImgError ? (
            <img
              src={currentAvatar}
              alt={customerName}
              className="w-full h-full object-cover rounded-full"
              onError={() => setHasImgError(true)}
            />
          ) : (
            <div className="w-full h-full rounded-full bg-gradient-to-br from-neutral-800 to-neutral-950 flex items-center justify-center text-amber-400 font-black text-xs">
              {initials || <User className="w-4 h-4 text-neutral-400" />}
            </div>
          )}

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center rounded-full">
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
            </div>
          )}
        </button>

        {/* Small Camera Badge Button */}
        {!disabled && (
          <button
            type="button"
            onClick={() => setIsSheetOpen(true)}
            aria-label="Thay đổi ảnh đại diện"
            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#FFB400] text-black shadow-md border-2 ${
              isDark ? 'border-[#1C1C1E]' : 'border-white'
            } flex items-center justify-center cursor-pointer active:scale-90 transition-transform`}
          >
            <Camera className="w-2.5 h-2.5 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Native iOS Bottom Action Sheet */}
      {isSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] select-none">
          {/* Dimmed Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn"
            onClick={() => setIsSheetOpen(false)}
          />

          {/* ActionSheet Container */}
          <div className="w-full max-w-[420px] z-10 flex flex-col gap-2.5 animate-slideUp">
            {/* Main Options Group */}
            <div
              className={`rounded-2xl overflow-hidden border backdrop-blur-xl shadow-2xl transition-colors ${
                isDark ? 'bg-[#1C1C1E]/95 border-neutral-800 text-white' : 'bg-white/95 border-neutral-200 text-black'
              }`}
            >
              {/* Header Title */}
              <div
                className={`px-4 py-3 text-center border-b ${isDark ? 'border-neutral-800/80' : 'border-neutral-100'}`}
              >
                <h3 className={`text-[13px] font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                  Ảnh Đại Diện Khách Hàng
                </h3>
                <p className={`text-[11.5px] mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  {customerName} {customerPhone ? `· ${customerPhone}` : ''}
                </p>
              </div>

              {/* Action 1: Camera */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className={`w-full py-3.5 px-4 flex items-center justify-center gap-2.5 text-[15px] font-medium border-b cursor-pointer transition-colors active:opacity-70 ${
                  isDark
                    ? 'border-neutral-800/80 text-white hover:bg-neutral-800/50'
                    : 'border-neutral-100 text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <Camera className="w-4 h-4 text-[#FFB400]" />
                <span>Chụp ảnh mới (Camera)</span>
              </button>

              {/* Action 2: Photo Library */}
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className={`w-full py-3.5 px-4 flex items-center justify-center gap-2.5 text-[15px] font-medium cursor-pointer transition-colors active:opacity-70 ${
                  isDark ? 'text-white hover:bg-neutral-800/50' : 'text-neutral-900 hover:bg-neutral-50'
                } ${currentAvatar ? `border-b ${isDark ? 'border-neutral-800/80' : 'border-neutral-100'}` : ''}`}
              >
                <ImageIcon className="w-4 h-4 text-[#34C759]" />
                <span>Chọn từ thư viện ảnh</span>
              </button>

              {/* Action 3: Remove Avatar (if exists) */}
              {currentAvatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className={`w-full py-3.5 px-4 flex items-center justify-center gap-2 text-[15px] font-semibold text-[#FF3B30] cursor-pointer transition-colors active:opacity-70 ${
                    isDark ? 'hover:bg-neutral-800/50' : 'hover:bg-neutral-50'
                  }`}
                >
                  <Trash2 className="w-4 h-4 text-[#FF3B30]" />
                  <span>Gỡ ảnh đại diện</span>
                </button>
              )}
            </div>

            {/* Cancel Button */}
            <div
              className={`rounded-2xl overflow-hidden border backdrop-blur-xl shadow-2xl transition-colors ${
                isDark ? 'bg-[#1C1C1E]/95 border-neutral-800' : 'bg-white/95 border-neutral-200'
              }`}
            >
              <button
                type="button"
                onClick={() => setIsSheetOpen(false)}
                className="w-full py-3.5 px-4 text-center text-[#FFB400] text-[15px] font-bold active:opacity-60 transition-opacity cursor-pointer"
              >
                Hủy (Cancel)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
