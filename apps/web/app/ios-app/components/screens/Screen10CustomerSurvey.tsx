'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { BookingItem } from '../../state/mockData';
import { getLocalProgressSnapshot, getLocalProgressSnapshotAsync } from '../../state/offlineSync';
import { CvFeather1Badge } from '../ui-kit/CvFeatherLabels';
import { Star, Sparkles, Maximize2, Check } from 'lucide-react';

interface Screen10CustomerSurveyProps {
  booking?: BookingItem;
  customerName?: string;
  staffName?: string;
  onBack: () => void;
  onComplete: (survey: {
    rating: number;
    emotion: 'happy' | 'satisfied' | 'neutral' | 'unhappy';
    feedbackNote?: string;
  }) => void;
}

export function Screen10CustomerSurvey({
  booking,
  customerName = 'Chị Quyên',
  staffName = 'Thảo Ly',
  onBack,
  onComplete,
}: Screen10CustomerSurveyProps) {
  const [selectedEmotion, setSelectedEmotion] = useState<'happy' | 'normal' | 'dislike' | 'disappointed'>('happy');
  const [rating, setRating] = useState<number>(5);
  const [zoomPhoto, setZoomPhoto] = useState<{ url: string; title: string } | null>(null);

  const defaultFeedbackPoints = useMemo(
    () => ['Nối rất êm, không cay', 'Mi nhẹ như không nối', `CV ${staffName} rất chu đáo`],
    [staffName]
  );
  const [selectedPoints, setSelectedPoints] = useState<string[]>(defaultFeedbackPoints);

  const togglePoint = (p: string) => {
    setSelectedPoints((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  // Khôi phục ảnh Before và After từ booking snapshot / cache
  const bookingId = booking?.id;
  const cachedSnapshot = useMemo(() => {
    return bookingId ? getLocalProgressSnapshot(bookingId) : null;
  }, [bookingId]);

  const [asyncSnapshot, setAsyncSnapshot] = useState<any>(null);
  useEffect(() => {
    if (bookingId) {
      void getLocalProgressSnapshotAsync(bookingId).then((data) => {
        if (data) setAsyncSnapshot(data);
      });
    }
  }, [bookingId]);

  const beforePhotoUrl =
    booking?.progress?.beforePhotoUrl || cachedSnapshot?.beforePhotoUrl || asyncSnapshot?.beforePhotoUrl || null;

  const afterPhotoUrl =
    booking?.progress?.afterPhotoUrl || cachedSnapshot?.afterPhotoUrl || asyncSnapshot?.afterPhotoUrl || null;

  const isDisplayablePhoto = (url: string | null | undefined): boolean => {
    if (!url) return false;
    if (url === '/assets/lash_before.jpg' || url === '/assets/lash_cleaned.jpg' || url === '/assets/lash_after.jpg')
      return false;
    return (
      url.startsWith('data:') ||
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('/uploads') ||
      url.startsWith('/api/') ||
      url.length > 50
    );
  };

  const handleSubmit = () => {
    const emotionMap: Record<string, 'happy' | 'satisfied' | 'neutral' | 'unhappy'> = {
      happy: 'happy',
      normal: 'satisfied',
      dislike: 'neutral',
      disappointed: 'unhappy',
    };
    onComplete({
      rating,
      emotion: emotionMap[selectedEmotion] || 'happy',
      feedbackNote: selectedPoints.join('; '),
    });
  };

  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  return (
    <div className={`flex-1 flex flex-col bg-[var(--background)] text-[var(--mos-text)] overflow-y-auto select-none`}>
      {/* Top Navbar on Black with Working Native Back Button */}
      <IosNavigationBar title="Wings Beauty Survey" onBack={onBack} backTitle="Ảnh After" />

      {/* Lightbox Zoom Modal for Mirror Inspection */}
      {zoomPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4 animate-in fade-in duration-200"
          onClick={() => setZoomPhoto(null)}
        >
          <div
            className="w-full flex items-center justify-between text-white pt-2 px-2"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[14px] font-black">{zoomPhoto.title}</span>
            <button
              type="button"
              onClick={() => setZoomPhoto(null)}
              className="w-8 h-8 rounded-full bg-neutral-800 text-white flex items-center justify-center font-bold text-sm cursor-pointer hover:bg-neutral-700"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 w-full flex items-center justify-center py-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={zoomPhoto.url}
              alt="Zoomed lash"
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-neutral-800"
            />
          </div>
          <div className="w-full pb-4 px-4 text-center">
            <button
              type="button"
              onClick={() => setZoomPhoto(null)}
              className="py-3 px-6 rounded-full bg-white text-black font-black text-[13px] shadow-lg cursor-pointer"
            >
              ✕ Đóng Gương Soi
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col justify-between py-4 px-4 overflow-y-auto">
        <div className="space-y-4">
          {/* Main Greeting */}
          <div className="text-center pt-1">
            <h2 className={`text-[20px] font-black text-[var(--mos-text)] leading-tight px-2`}>
              {customerName} ơi, Chị cảm nhận ca làm hôm nay thế nào ạ?
            </h2>
            <div
              className={`text-[12px] text-[var(--mos-text-muted)] font-medium mt-1.5 inline-flex items-center justify-center gap-1`}
            >
              <span>Chuyên viên phục vụ:</span>
              <span
                className={`${isDark ? 'text-neutral-200' : 'text-gray-800'} font-bold inline-flex items-center gap-1`}
              >
                {staffName} (<CvFeather1Badge />)
              </span>
              <span>· {booking?.branchName || 'Salon Đề Thám'}</span>
            </div>
          </div>

          {/* GƯƠNG SOI FORM MI CHO KHÁCH (Before & After Mirror Showcase: 2 Hàng Dọc Trên/Dưới) */}
          <div
            className={`bg-[var(--mos-surface)] border-[var(--mos-surface-border)] rounded-2xl p-3.5 shadow-sm border space-y-3`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#FFB400]" />
                <span className={`text-[12px] font-black text-[var(--mos-text)] uppercase tracking-wider`}>
                  GƯƠNG SOI FORM MI · ĐỐI CHIẾU TRƯỚC & SAU
                </span>
              </div>
              <span
                className={`text-[10px] font-bold ${isDark ? 'text-neutral-400 bg-neutral-800' : 'text-gray-500 bg-neutral-100'} px-2 py-0.5 rounded-full`}
              >
                Chạm để phóng to
              </span>
            </div>

            {/* 2 HÀNG DỌC: TRÊN (BEFORE) - DƯỚI (AFTER) THEO YÊU CẦU */}
            <div className="space-y-3">
              {/* HÀNG 1: TRƯỚC KHI NỐI (MẮT MỘC) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-[10px] font-black">
                      1
                    </span>
                    <span className={`text-[12px] font-black text-[var(--mos-text)]`}>
                      1. ẢNH TRƯỚC KHI NỐI · MẮT MỘC
                    </span>
                  </div>
                  <span
                    className={`text-[9.5px] font-bold ${
                      isDark ? 'text-neutral-400 bg-neutral-800' : 'text-gray-500 bg-neutral-100'
                    } px-2 py-0.5 rounded-full`}
                  >
                    Mắt mộc ban đầu
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isDisplayablePhoto(beforePhotoUrl)) {
                      setZoomPhoto({ url: beforePhotoUrl!, title: 'Ảnh 1: Mắt Mộc Ban Đầu (Before)' });
                    }
                  }}
                  className="w-full relative aspect-[4/3] rounded-xl overflow-hidden bg-[#1C1C1E] border border-neutral-700 shadow-inner group cursor-pointer text-left p-0 block"
                >
                  {isDisplayablePhoto(beforePhotoUrl) ? (
                    <>
                      <img
                        src={beforePhotoUrl!}
                        alt="Before"
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-102"
                      />
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors pointer-events-none" />
                      <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white backdrop-blur-xs pointer-events-none shadow-sm">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 p-4 text-center text-[12px]">
                      Chưa có ảnh Before
                    </div>
                  )}
                  <span className="absolute bottom-2.5 left-2.5 bg-black/85 text-amber-400 text-[10px] font-black px-2.5 py-0.8 rounded shadow-sm border border-amber-500/30 pointer-events-none">
                    Mắt Mộc Trước Nối
                  </span>
                </button>
              </div>

              {/* HÀNG 2: SAU HOÀN THIỆN ✨ */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shadow-xs">
                      2
                    </span>
                    <span className={`text-[12px] font-black ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>
                      2. ẢNH SAU HOÀN THIỆN · ĐẠT CHUẨN
                    </span>
                  </div>
                  <span className="text-[9.5px] font-extrabold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                    Form mi mới của Chị ✨
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isDisplayablePhoto(afterPhotoUrl)) {
                      setZoomPhoto({ url: afterPhotoUrl!, title: 'Ảnh 2: Mi Hoàn Thiện Sau Nối (After)' });
                    }
                  }}
                  className="w-full relative aspect-[4/3] rounded-xl overflow-hidden bg-[#1C1C1E] border-2 border-[#22C55E] shadow-md group cursor-pointer text-left p-0 block"
                >
                  {isDisplayablePhoto(afterPhotoUrl) ? (
                    <>
                      <img
                        src={afterPhotoUrl!}
                        alt="After"
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-102"
                      />
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors pointer-events-none" />
                      <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-sm pointer-events-none">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 p-4 text-center text-[12px]">
                      Chờ chụp ảnh After
                    </div>
                  )}
                  <span className="absolute bottom-2.5 left-2.5 bg-emerald-600 text-white text-[10px] font-black px-2.5 py-0.8 rounded shadow-sm pointer-events-none">
                    Sau Hoàn Thiện ✨
                  </span>
                </button>
              </div>
            </div>

            <div className="text-center text-[11px] text-gray-500 font-medium flex items-center justify-center gap-1.5 pt-0.5">
              <span>🔍 Chị chạm vào ảnh để phóng to soi gương cận cảnh từng sợi mi nhé!</span>
            </div>
          </div>

          {/* 5 Yellow Stars (Interactive) */}
          <div
            className={`bg-[var(--mos-surface)] border-[var(--mos-surface-border)] rounded-2xl p-3.5 shadow-sm border text-center`}
          >
            <div className={`text-[11px] font-bold text-[var(--mos-text-muted)] uppercase tracking-wider mb-2`}>
              ĐÁNH GIÁ SỰ HÀI LÒNG CỦA CHỊ
            </div>
            <div className="flex justify-center items-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  className="p-1 active:scale-125 transition-transform cursor-pointer"
                >
                  <Star
                    className={`w-8 h-8 ${
                      s <= rating ? 'text-[#FFB400] fill-[#FFB400]' : isDark ? 'text-neutral-700' : 'text-neutral-300'
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
            <div className="text-center text-[13px] font-extrabold text-[#FFB400] tracking-wider mt-1.5">
              {rating}.0 / 5.0 · {rating === 5 ? 'TUYỆT VỜI' : rating >= 4 ? 'HÀI LÒNG' : 'CẦN CẢI THIỆN'}
            </div>
          </div>

          {/* 4 Emotion Faces in a row */}
          <div className="grid grid-cols-4 gap-2">
            {/* 1. Rất Hài Lòng */}
            <button
              type="button"
              onClick={() => setSelectedEmotion('happy')}
              className={`p-2.5 rounded-2xl flex flex-col items-center justify-center aspect-[3/4] transition-all cursor-pointer ${
                selectedEmotion === 'happy'
                  ? isDark
                    ? 'border-2 border-[#FFB400] bg-amber-950/40 shadow-sm scale-102'
                    : 'border-2 border-[#FFB400] bg-amber-50/70 shadow-sm scale-102'
                  : isDark
                    ? 'bg-neutral-900 border border-neutral-800 hover:bg-neutral-800'
                    : 'bg-white shadow-xs border border-neutral-200/70 hover:bg-neutral-50'
              }`}
            >
              <span className="text-3xl">😄</span>
              <span
                className={`text-[11px] font-bold ${isDark ? 'text-amber-300' : 'text-amber-900'} mt-2 text-center leading-tight`}
              >
                Rất Hài Lòng
              </span>
            </button>

            {/* 2. Bình Thường */}
            <button
              type="button"
              onClick={() => setSelectedEmotion('normal')}
              className={`p-2.5 rounded-2xl flex flex-col items-center justify-center aspect-[3/4] transition-all cursor-pointer ${
                selectedEmotion === 'normal'
                  ? isDark
                    ? 'border-2 border-[#FFB400] bg-amber-950/40 shadow-sm scale-102'
                    : 'border-2 border-[#FFB400] bg-amber-50/70 shadow-sm scale-102'
                  : isDark
                    ? 'bg-neutral-900 border border-neutral-800 hover:bg-neutral-800'
                    : 'bg-white shadow-xs border border-neutral-200/70 hover:bg-neutral-50'
              }`}
            >
              <span className="text-3xl">🙂</span>
              <span
                className={`text-[11px] font-semibold ${isDark ? 'text-neutral-300' : 'text-gray-700'} mt-2 text-center leading-tight`}
              >
                Bình Thường
              </span>
            </button>

            {/* 3. Chưa Thích */}
            <button
              type="button"
              onClick={() => setSelectedEmotion('dislike')}
              className={`p-2.5 rounded-2xl flex flex-col items-center justify-center aspect-[3/4] transition-all cursor-pointer ${
                selectedEmotion === 'dislike'
                  ? isDark
                    ? 'border-2 border-[#FFB400] bg-amber-950/40 shadow-sm scale-102'
                    : 'border-2 border-[#FFB400] bg-amber-50/70 shadow-sm scale-102'
                  : isDark
                    ? 'bg-neutral-900 border border-neutral-800 hover:bg-neutral-800'
                    : 'bg-white shadow-xs border border-neutral-200/70 hover:bg-neutral-50'
              }`}
            >
              <span className="text-3xl">🙁</span>
              <span
                className={`text-[11px] font-semibold ${isDark ? 'text-neutral-300' : 'text-gray-700'} mt-2 text-center leading-tight`}
              >
                Chưa Thích
              </span>
            </button>

            {/* 4. Thất Vọng */}
            <button
              type="button"
              onClick={() => setSelectedEmotion('disappointed')}
              className={`p-2.5 rounded-2xl flex flex-col items-center justify-center aspect-[3/4] transition-all cursor-pointer ${
                selectedEmotion === 'disappointed'
                  ? isDark
                    ? 'border-2 border-[#FFB400] bg-amber-950/40 shadow-sm scale-102'
                    : 'border-2 border-[#FFB400] bg-amber-50/70 shadow-sm scale-102'
                  : isDark
                    ? 'bg-neutral-900 border border-neutral-800 hover:bg-neutral-800'
                    : 'bg-white shadow-xs border border-neutral-200/70 hover:bg-neutral-50'
              }`}
            >
              <span className="text-3xl">😡</span>
              <span
                className={`text-[11px] font-semibold ${isDark ? 'text-neutral-300' : 'text-gray-700'} mt-2 text-center leading-tight`}
              >
                Thất Vọng
              </span>
            </button>
          </div>

          {/* Điểm chị ưng ý nhất (Interactive Toggle Chips) */}
          <div
            className={`bg-[var(--mos-surface)] border-[var(--mos-surface-border)] rounded-2xl p-3.5 shadow-sm border`}
          >
            <div className={`text-[11px] font-bold text-[var(--mos-text-muted)] uppercase tracking-wider px-1 mb-2`}>
              ĐIỂM CHỊ ƯNG Ý NHẤT (CHẠM ĐỂ CHỌN)
            </div>
            <div className="space-y-2">
              {defaultFeedbackPoints.map((point) => {
                const isSelected = selectedPoints.includes(point);
                return (
                  <button
                    key={point}
                    type="button"
                    onClick={() => togglePoint(point)}
                    className={`w-full py-2.5 px-3.5 rounded-xl font-bold text-[13px] flex items-center justify-between transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-[#FFB400] text-black shadow-xs'
                        : isDark
                          ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                          : 'bg-neutral-100 text-gray-600 hover:bg-neutral-200'
                    }`}
                  >
                    <span>{point}</span>
                    {isSelected && <Check className="w-4 h-4 text-black shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-5 pb-2 space-y-2">
          <button
            onClick={handleSubmit}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-black text-[15px] shadow-md active:scale-98 transition-transform text-center cursor-pointer uppercase tracking-tight flex items-center justify-center gap-2"
          >
            <span>GỬI ĐÁNH GIÁ & HOÀN TẤT</span>
          </button>
          <button
            type="button"
            onClick={onBack}
            className={`w-full py-2.5 text-center ${isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-black'} text-[13px] font-bold active:opacity-60 transition-opacity cursor-pointer flex items-center justify-center gap-1.5`}
          >
            <span>‹ Quay lại xem ảnh After & thời gian</span>
          </button>
        </div>
      </div>
    </div>
  );
}
