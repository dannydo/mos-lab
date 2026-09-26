'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, message, Spin } from 'antd';
import { Sparkles, Camera, Heart, ShieldCheck, ChevronRight, Clock, X, UserRound } from 'lucide-react';
import dayjs from 'dayjs';
import type { SafeAny, AvatarNudgeResponse } from '@mos-lab/shared';
import { apiClient, resolveMediaUrl } from '../../lib/api-client';
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

function getStatusPill(action?: string, icon?: string, badge?: string): string {
  if (
    badge &&
    (badge.startsWith('Đang') ||
      badge.startsWith('Cà khịa') ||
      badge.startsWith('Thì thầm') ||
      badge.startsWith('Tối hậu') ||
      badge.startsWith('Nhắn nhủ'))
  ) {
    return badge;
  }
  switch (action) {
    case 'dụ dỗ':
      return `Đang dụ dỗ ${icon || '🍎'}`;
    case 'năn nỉ':
      return `Đang năn nỉ ${icon || '🥺'}`;
    case 'cà khịa':
      return `Cà khịa nhẹ ${icon || '😏'}`;
    case 'hờn dỗi':
      return `Đang hờn dỗi ${icon || '😤'}`;
    case 'thầm thì':
      return `Thì thầm bí mật ${icon || '🤫'}`;
    case 'đe dọa (nhẹ)':
      return `Tối hậu thư ${icon || '⚡'}`;
    default:
      return `Nhắn nhủ đầu ngày ${icon || '✨'}`;
  }
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
          badge: 'Đang dụ dỗ 🍎',
          greeting: `Alo ${currentUser?.displayName || 'bạn'} ơi, ghé tai em nói nhỏ nè! ✨`,
          banter:
            'Tướng mạo rạng rỡ thế này mà chưa có avatar thì uổng quá chừng! Lên 1 tấm selfie cười tươi là đồng đội thả tim mỏi tay, khách nhìn là mến liền. Thử ngay 15 giây nha?',
          callToAction: '📸 Đổi Liền Khoe Nhan Sắc',
          ctaText: '📸 Đổi Liền Khoe Nhan Sắc',
          snoozeText: 'Để mai khoe, nay giấu mặt 🙈',
          isBanter: false,
        },
        {
          angelAction: 'năn nỉ',
          angelIcon: '🥺',
          badge: 'Đang năn nỉ 🥺',
          greeting: `${currentUser?.displayName || 'Bạn'} ơi, cứu em với... 🥺`,
          banter: `Em bay lượn năn nỉ bạn mấy bữa nay mỏi cả cánh rồi á! Giơ máy cười tươi 15 giây cho em hoàn thành chỉ tiêu đầu ngày đi mà, năn nỉ luôn đó!`,
          callToAction: '📸 Cứu Thiên Sứ, Chụp Liền!',
          ctaText: '📸 Cứu Thiên Sứ, Chụp Liền!',
          snoozeText: 'Cho nợ nốt hôm nay nha Thiên Sứ 🥺',
          isBanter: true,
        },
        {
          angelAction: 'cà khịa',
          angelIcon: '😏',
          badge: 'Cà khịa nhẹ 😏',
          greeting: `Ủa alo ${currentUser?.displayName || 'bạn'} ơi, bắt quả tang nha! 👀`,
          banter:
            currentCount > 0
              ? 'Hôm qua ai vừa hứa chắc nịch "để mai tính" vậy ta? Nay chính là "ngày mai" trong truyền thuyết rồi nè, tính tới đâu rồi hay đang tính trốn luôn? Làm tấm ảnh nhanh gọn lẹ rồi vô ca thôi nè!'
              : 'Đồng đội ai cũng có ảnh đại diện lung linh, riêng bạn cứ để ký tự viết tắt bí ẩn như điệp viên 007 vậy. Chụp lẹ khoe nụ cười đi nè!',
          callToAction: '📸 Thôi Được Rồi, Chụp Luôn!',
          ctaText: '📸 Thôi Được Rồi, Chụp Luôn!',
          snoozeText: 'Mai đổi thiệt mà, đừng khịa nữa 🙈',
          isBanter: true,
        },
        {
          angelAction: 'hờn dỗi',
          angelIcon: '😤',
          badge: 'Đang hờn dỗi 😤',
          greeting: `Hôm nay em dỗi ${currentUser?.displayName || 'bạn'} rồi đó nha! 😤`,
          banter:
            'Cả salon ai cũng có ảnh đại diện xinh xắn, riêng bạn cứ để ký tự viết tắt bí ẩn hoài. Nay mà không chịu chụp là em buồn nguyên ngày cho coi!',
          callToAction: '📸 Chụp Liền Kẻo Em Dỗi',
          ctaText: '📸 Chụp Liền Kẻo Em Dỗi',
          snoozeText: 'Dỗ dành Thiên Sứ, mai tính nha 🥺',
          isBanter: true,
        },
        {
          angelAction: 'thầm thì',
          angelIcon: '🤫',
          badge: 'Thì thầm bí mật 🤫',
          greeting: `Suỵt... lại gần đây em bật mí bí mật nè ${currentUser?.displayName || 'bạn'}! 🤫`,
          banter:
            'Em mới soi sổ thiên cơ: ai đổi avatar nụ cười rạng rỡ sáng nay là ca làm gặp toàn khách dễ thương, tip nhận mỏi tay luôn á. Bí mật nội bộ, làm liền kẻo lỡ lộc nha!',
          callToAction: '✨ Đổi Avatar Hút May Mắn',
          ctaText: '✨ Đổi Avatar Hút May Mắn',
          snoozeText: 'Để mai nhận lộc vậy 🙈',
          isBanter: false,
        },
        {
          angelAction: 'đe dọa (nhẹ)',
          angelIcon: '⚡',
          badge: 'Tối hậu thư ⚡',
          greeting: `Báo động cấp 1 gửi tới ${currentUser?.displayName || 'bạn'}! ⚡`,
          banter: `Bạn đã bấm hoãn lần thứ ${currentCount || 1} rồi đó nha! Hôm nay mà còn bấm "để mai tính" nữa là em tự lấy ảnh dìm dán lên avatar ráng chịu à nghen!`,
          callToAction: '📸 Tự Chụp Liền Tránh Bị Dìm!',
          ctaText: '📸 Tự Chụp Liền Tránh Bị Dìm!',
          snoozeText: 'Vẫn can đảm hoãn tiếp 🏃💨',
          isBanter: true,
        },
        {
          angelAction: 'nhắn nhủ',
          angelIcon: '✨',
          badge: 'Nhắn nhủ đầu ngày ✨',
          greeting: `Chào ${currentUser?.displayName || 'bạn'}, chúc bạn ngày mới tràn đầy năng lượng! ✨`,
          banter:
            'Một chiếc avatar cười tươi sáng bừng sẽ truyền cảm hứng và trao trọn niềm tin cho cả team và khách hàng mỗi ngày. Cùng em chụp 1 tấm selfie thật rạng rỡ nhé!',
          callToAction: '📸 Chụp Selfie Rạng Rỡ Ngay',
          ctaText: '📸 Chụp Selfie Rạng Rỡ Ngay',
          snoozeText: 'Để mai mình đổi nha 🙈',
          isBanter: false,
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
                    src={resolveMediaUrl(currentUser.avatarUrl)}
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
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold tracking-tight flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}
                >
                  <span className="text-sm select-none">😈</span>
                  <span>Thiên Sứ Bóng Tối</span>
                </span>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border transition-all ${
                    isDark
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      : 'bg-purple-100 text-purple-800 border-purple-200 shadow-xs'
                  }`}
                >
                  {getStatusPill(nudgeData?.angelAction, nudgeData?.angelIcon, nudgeData?.badge)}
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
