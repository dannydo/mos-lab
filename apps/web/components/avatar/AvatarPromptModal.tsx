'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, message, Spin } from 'antd';
import { Sparkles, Camera, Heart, ShieldCheck, ChevronRight, Clock, X, UserRound } from 'lucide-react';
import type { SafeAny, AvatarNudgeResponse } from '@mos-lab/shared';
import dayjs from 'dayjs';
import { apiClient } from '../../lib/api-client';
import { useTheme } from '../../context/ThemeContext';
import AvatarCropModal from './AvatarCropModal';

interface AvatarPromptModalProps {
  currentUser: SafeAny;
  forceOpen?: boolean;
  onClose?: () => void;
  onAvatarUpdated?: (newAvatarUrl: string) => void;
}

const STORAGE_KEY_SNOOZE_UNTIL = 'mos_avatar_snooze_until';
const STORAGE_KEY_SNOOZE_COUNT = 'mos_avatar_snooze_count';

// Check if user needs an avatar nudge
export function shouldPromptForAvatar(user: SafeAny): boolean {
  if (!user || !user.id) return false;

  // Check if avatar is missing or is google placeholder
  const rawAvatar = user.avatarUrl || user.avatar;
  const isDefaultOrMissing =
    !rawAvatar ||
    typeof rawAvatar !== 'string' ||
    rawAvatar.trim() === '' ||
    rawAvatar.includes('googleusercontent.com') ||
    rawAvatar.includes('placeholder') ||
    rawAvatar.includes('default-avatar');

  if (!isDefaultOrMissing) return false;

  // Check snooze in localStorage
  if (typeof window === 'undefined') return false;
  const snoozeUntilStr = localStorage.getItem(STORAGE_KEY_SNOOZE_UNTIL);
  if (snoozeUntilStr) {
    const snoozeUntil = dayjs(snoozeUntilStr);
    if (dayjs().isBefore(snoozeUntil)) {
      return false; // Still snoozed today
    }
  }

  return true;
}

export const AvatarPromptModal: React.FC<AvatarPromptModalProps> = ({
  currentUser,
  forceOpen = false,
  onClose,
  onAvatarUpdated,
}) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState<boolean>(false);
  const [snoozeCount, setSnoozeCount] = useState<number>(0);
  const [nudgeData, setNudgeData] = useState<AvatarNudgeResponse | null>(null);
  const [isLoadingNudge, setIsLoadingNudge] = useState<boolean>(false);

  // Evaluate whether to show popup
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    if (currentUser) {
      const needed = shouldPromptForAvatar(currentUser);
      if (needed) {
        setIsOpen(true);
      }
    }
  }, [currentUser, forceOpen]);

  // Load snooze count and fetch Gemini banter nudge
  const loadNudge = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const currentCount = parseInt(localStorage.getItem(STORAGE_KEY_SNOOZE_COUNT) || '0', 10);
    setSnoozeCount(currentCount);

    setIsLoadingNudge(true);
    try {
      const res = await apiClient.ai.getAvatarNudge({
        staffName: currentUser?.displayName || currentUser?.username || 'Bạn',
        role: currentUser?.role,
        snoozeCount: currentCount,
      });
      setNudgeData(res);
    } catch (_err) {
      // Fallback list of Thiên Sứ Bóng Tối moods
      const fallbackList: AvatarNudgeResponse[] = [
        {
          angelAction: 'dụ dỗ',
          angelIcon: '🍎',
          badge: 'Cám Dỗ Ngọt Ngào',
          greeting: `Hỡi ${currentUser?.displayName || 'bạn'} xinh đẹp... ✨`,
          banter:
            'Ta mang đến cho ngươi cơ hội tỏa sáng ngút ngàn trên mOS! Chỉ 15 giây selfie nụ cười rạng rỡ, hào quang sẽ theo ngươi cả ngày dài. Ngươi nỡ chối từ quả táo thần kỳ này sao?',
          callToAction: '🍎 Nghe Lời Cám Dỗ, Chụp Luôn!',
          snoozeText: 'Cưỡng lại cám dỗ, để mai tính 🙈',
          isBanter: false,
        },
        {
          angelAction: 'năn nỉ',
          angelIcon: '🥺',
          badge: 'Hạ Mình Cầu Xin',
          greeting: `Ai đó cứu Thiên Sứ với... 🥺`,
          banter: `Ta bay vòng vòng năn nỉ ${currentUser?.displayName || 'bạn'} mỏi cả cánh rồi! Giơ máy lên cười tươi 15 giây cho ta hoàn thành KPI thiên đình đi mà, năn nỉ đó!`,
          callToAction: '📸 Cứu Thiên Sứ, Chụp Liền!',
          snoozeText: 'Cho nợ nốt hôm nay nha Thiên Sứ 🥺',
          isBanter: true,
        },
        {
          angelAction: 'cà khịa',
          angelIcon: '😏',
          badge: 'Bắt Quả Tang!',
          greeting: `Ủa alo ${currentUser?.displayName || 'bạn'} ơi? 😈`,
          banter:
            currentCount > 0
              ? 'Hôm qua ai thề non hẹn biển "để mai tính" ta? Hôm nay là ngày mai trong truyền thuyết rồi nè! Tính tới đâu rồi hay đang tính trốn luôn?'
              : 'Đồng đội ai cũng avatar lung linh, riêng bạn cứ để ký tự viết tắt bí ẩn như điệp viên 007 vậy. Chụp lẹ khoe nụ cười đi nè!',
          callToAction: '📸 Thôi Được Rồi, Chụp Luôn!',
          snoozeText: 'Hứa danh dự ngày mai đổi thiệt 🙈',
          isBanter: true,
        },
        {
          angelAction: 'hờn dỗi',
          angelIcon: '😤',
          badge: 'Giận Tím Người',
          greeting: `Thiên Sứ dỗi ${currentUser?.displayName || 'bạn'} rồi đó! 😤`,
          banter:
            'Ngắm cái icon mặc định của bạn suốt mấy hôm làm ta muốn tiền đình. Hôm nay mà không chụp là ta ếm bùa cho khách khen suốt ngày mỏi miệng ráng chịu!',
          callToAction: '📸 Chụp Ngay Kẻo Thiên Sứ Khóc',
          snoozeText: 'Dỗ dành Thiên Sứ, mai tính nha 🥺',
          isBanter: true,
        },
        {
          angelAction: 'thầm thì',
          angelIcon: '🤫',
          badge: 'Bí Mật Đen Tối',
          greeting: `Suỵt... lại gần đây ta bảo! 🤫`,
          banter:
            'Ta vừa soi sổ thiên cơ: ai đổi avatar nụ cười rạng rỡ hôm nay thì tỉ lệ nhận tip và khách book tua tăng vùn vụt! Đừng để lọt bí mật này cho người khác nhen!',
          callToAction: '✨ Đổi Avatar Hút May Mắn',
          snoozeText: 'Để mai nhận lộc vậy 🙈',
          isBanter: false,
        },
        {
          angelAction: 'đe dọa (nhẹ)',
          angelIcon: '⚡',
          badge: 'Tối Hậu Thư',
          greeting: `Cảnh báo từ cõi u tối! ⚡`,
          banter: `Bạn đã bấm 'Để mai tính' đến lần thứ ${currentCount || 1} rồi đấy nhé! Nếu hôm nay còn chối từ, ta sẽ biến avatar của bạn thành hình quả chuối vàng khổng lồ!`,
          callToAction: '📸 Đổi Ngay Tránh Bị Hóa Chuối!',
          snoozeText: 'Vẫn can đảm hoãn tiếp 🏃💨',
          isBanter: true,
        },
      ];
      const picked = fallbackList[Math.floor(Math.random() * fallbackList.length)];
      setNudgeData(picked);
    } finally {
      setIsLoadingNudge(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isOpen) {
      loadNudge();
    }
  }, [isOpen, loadNudge]);

  // Handle "Để mai mình đổi"
  const handleSnooze = () => {
    if (typeof window !== 'undefined') {
      const nextCount = snoozeCount + 1;
      localStorage.setItem(STORAGE_KEY_SNOOZE_COUNT, String(nextCount));
      // Snooze until tomorrow at 04:00 AM
      const tomorrowMorning = dayjs().add(1, 'day').startOf('day').add(4, 'hour').toISOString();
      localStorage.setItem(STORAGE_KEY_SNOOZE_UNTIL, tomorrowMorning);
    }

    message.info('Đã ghi nhận! Chúc bạn một ngày làm việc tràn đầy năng lượng và niềm vui!');
    setIsOpen(false);
    onClose?.();
  };

  const handleOpenCropModal = () => {
    setIsCropModalOpen(true);
  };

  const handleAvatarSuccess = (newAvatarUrl: string) => {
    setIsCropModalOpen(false);
    setIsOpen(false);
    // Clear snooze so it doesn't prompt again
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_SNOOZE_UNTIL);
    }
    onAvatarUpdated?.(newAvatarUrl);
    onClose?.();
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  return (
    <>
      <Modal
        open={isOpen}
        onCancel={handleClose}
        footer={null}
        centered
        width={420}
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
          className={`flex flex-col p-5 md:p-6 select-none relative ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
        >
          {/* Ambient Siri Aurora Glow Behind Avatar */}
          <div
            className={`absolute top-10 left-1/2 -translate-x-1/2 w-44 h-44 rounded-full blur-3xl pointer-events-none ${
              isDark
                ? 'bg-gradient-to-tr from-amber-500/20 via-pink-500/20 to-purple-500/20'
                : 'bg-gradient-to-tr from-amber-400/25 via-pink-400/20 to-purple-400/20'
            }`}
          />

          {/* Top Apple Indicator Bar */}
          <div className={`w-10 h-1 rounded-full mx-auto mb-4 ${isDark ? 'bg-white/20' : 'bg-slate-300'}`} />

          {/* Central Avatar with Siri Aurora Glow Ring */}
          <div className="flex flex-col items-center justify-center pt-2 pb-4">
            <div className="relative group">
              {/* Rotating Aurora Conic Gradient Ring */}
              <div
                className="absolute -inset-1 rounded-full opacity-80 blur-[2px] transition duration-1000 group-hover:opacity-100"
                style={{
                  background: 'conic-gradient(from 0deg, #f59e0b, #ec4899, #8b5cf6, #06b6d4, #10b981, #f59e0b)',
                  animation: 'spin 8s linear infinite',
                }}
              />
              <div
                className={`relative w-24 h-24 rounded-full flex items-center justify-center overflow-hidden shadow-2xl ring-2 ${
                  isDark ? 'bg-slate-900 ring-white/20' : 'bg-white ring-black/10'
                }`}
              >
                {currentUser?.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser?.displayName || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className={`w-full h-full flex flex-col items-center justify-center ${
                      isDark
                        ? 'bg-gradient-to-br from-amber-500/20 via-purple-500/10 to-sky-500/20 text-slate-300'
                        : 'bg-gradient-to-br from-amber-100 via-purple-50 to-sky-100 text-slate-700'
                    }`}
                  >
                    <UserRound size={40} className={isDark ? 'text-amber-400/80 mb-0.5' : 'text-amber-600 mb-0.5'} />
                    <span
                      className={`text-[10px] font-bold font-mono ${isDark ? 'text-amber-300/80' : 'text-amber-700'}`}
                    >
                      {currentUser?.displayName?.slice(0, 2)?.toUpperCase() || 'MOS'}
                    </span>
                  </div>
                )}
                {/* Camera Overlay Badge */}
                <div
                  onClick={handleOpenCropModal}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white"
                >
                  <Camera size={20} className="text-amber-400" />
                </div>
              </div>
            </div>

            <div className="mt-3 text-center">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide ${
                  isDark
                    ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                    : 'bg-amber-100 border border-amber-300/80 text-amber-900 shadow-xs'
                }`}
              >
                <Sparkles
                  size={12}
                  className={isDark ? 'text-amber-400 animate-pulse' : 'text-amber-600 animate-pulse'}
                />
                Đại Sứ Thương Hiệu mOS
              </div>
            </div>
          </div>

          {/* Thiên Sứ Bóng Tối Card (Single Conversational Card - Thumb Zone Mobile Optimized) */}
          <div
            className={`mt-1 rounded-2xl p-4 relative overflow-hidden backdrop-blur-md shadow-md border ${
              isDark
                ? 'bg-white/[0.05] border-white/[0.1]'
                : 'bg-gradient-to-br from-amber-50/90 via-white to-orange-50/70 border-amber-200/80'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`text-xs font-bold tracking-tight flex items-center gap-1 ${isDark ? 'text-white' : 'text-slate-900'}`}
                >
                  <span className="text-sm select-none">{nudgeData?.angelIcon || '😈'}</span>
                  <span>Thiên Sứ Bóng Tối</span>
                  <span className={`font-semibold text-[11px] ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
                    ({nudgeData?.angelAction || 'nhắn nhủ'})
                  </span>
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    isDark
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      : 'bg-purple-100 text-purple-800 border-purple-200 shadow-xs'
                  }`}
                >
                  {nudgeData?.badge || (nudgeData?.isBanter ? 'Cà khịa thân thiện' : 'Khích lệ')}
                </span>
              </div>
              {isLoadingNudge && (
                <div
                  className={`flex items-center gap-1 text-[10px] font-medium shrink-0 ${
                    isDark ? 'text-amber-300' : 'text-amber-700'
                  }`}
                >
                  <Spin size="small" />
                  <span>Đang nhập vai...</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-xs">
              <div className={`font-bold text-[13px] ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                {nudgeData?.greeting || `Chào ${currentUser?.displayName || 'bạn'}! ✨`}
              </div>
              <p className={`text-[12px] leading-relaxed font-normal ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {nudgeData?.banter ||
                  nudgeData?.quote ||
                  'Một tấm ảnh đại diện rạng rỡ giúp kết nối tình đồng đội và trao gửi niềm tin trọn vẹn đến khách hàng.'}
              </p>
            </div>
          </div>

          {/* 3 Squircle Values */}
          <div className="mt-3.5 grid grid-cols-3 gap-2">
            <div
              className={`rounded-xl p-2 text-center border shadow-xs ${
                isDark ? 'bg-white/[0.04] border-white/[0.06]' : 'bg-slate-50 border-slate-200/80'
              }`}
            >
              <ShieldCheck size={16} className="text-emerald-500 mx-auto mb-1" />
              <div className={`text-[11px] font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Tin Cậy</div>
              <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Khách an tâm</div>
            </div>

            <div
              className={`rounded-xl p-2 text-center border shadow-xs ${
                isDark ? 'bg-white/[0.04] border-white/[0.06]' : 'bg-slate-50 border-slate-200/80'
              }`}
            >
              <Heart size={16} className="text-pink-500 mx-auto mb-1" />
              <div className={`text-[11px] font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Kết Nối</div>
              <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Ấm áp đồng đội</div>
            </div>

            <div
              className={`rounded-xl p-2 text-center border shadow-xs ${
                isDark ? 'bg-white/[0.04] border-white/[0.06]' : 'bg-slate-50 border-slate-200/80'
              }`}
            >
              <Sparkles size={16} className="text-amber-500 mx-auto mb-1" />
              <div className={`text-[11px] font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Tỏa Sáng</div>
              <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Chuyên nghiệp</div>
            </div>
          </div>

          {/* Primary & Secondary Action Buttons */}
          <div className="mt-5 space-y-2">
            {/* Primary Desert Titanium Button */}
            <button
              type="button"
              onClick={handleOpenCropModal}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-all cursor-pointer border border-amber-400/40"
            >
              <Camera size={16} />
              {nudgeData?.callToAction || nudgeData?.ctaText || 'Chụp / Chọn ảnh ngay'}
              <ChevronRight size={14} />
            </button>

            {/* Secondary Snooze Button */}
            <button
              type="button"
              onClick={handleSnooze}
              className={`w-full py-2.5 px-4 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isDark
                  ? 'bg-white/[0.05] hover:bg-white/[0.09] border-white/[0.08] text-slate-400 hover:text-slate-200'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs'
              }`}
            >
              <Clock size={13} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
              {nudgeData?.snoozeText || `Để mai mình đổi ${snoozeCount > 0 ? `(lần ${snoozeCount + 1})` : ''}`}
            </button>
          </div>
        </div>
      </Modal>

      {/* Embedded Crop Modal */}
      <AvatarCropModal
        open={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        currentUser={currentUser}
        onSuccess={handleAvatarSuccess}
      />
    </>
  );
};

export default AvatarPromptModal;
