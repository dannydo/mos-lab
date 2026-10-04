'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface Screen10CustomerSurveyProps {
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
  customerName = 'Chị Quyên',
  staffName = 'Thảo Ly',
  onBack,
  onComplete,
}: Screen10CustomerSurveyProps) {
  const [selectedEmotion, setSelectedEmotion] = useState<'happy' | 'normal' | 'dislike' | 'disappointed'>('happy');

  const handleSubmit = () => {
    onComplete({
      rating: 5,
      emotion: 'happy',
      feedbackNote: 'Nối rất êm, không cay; Mi nhẹ như không nối; CV Thảo Ly rất chu đáo',
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] overflow-y-auto select-none">
      {/* Top Navbar on Black */}
      <header className="w-full pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-3 px-4 flex items-center justify-center bg-black border-b border-neutral-900 select-none z-40 relative min-h-[50px] shrink-0">
        <h1 className="text-[#FFB400] font-bold text-[17px] tracking-tight">Wings Beauty Survey</h1>
      </header>

      <div className="flex-1 flex flex-col justify-between py-6 px-4 overflow-y-auto">
        <div>
          {/* Main Question */}
          <div className="text-center pt-2">
            <h2 className="text-[20px] font-black text-black leading-tight px-2">
              {customerName} ơi, Chị cảm nhận ca làm hôm nay thế nào ạ?
            </h2>
            <div className="text-[12px] text-gray-500 font-medium mt-2">
              Chuyên viên phục vụ: <span className="text-gray-800 font-bold">{staffName} (CV+)</span> · Salon Đề Thám
            </div>
          </div>

          {/* 5 Yellow Stars */}
          <div className="flex justify-center items-center gap-1.5 mt-5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="w-7 h-7 text-[#FFB400] fill-[#FFB400]" />
            ))}
          </div>
          <div className="text-center text-[12px] font-extrabold text-[#FFB400] tracking-wider mt-1.5">
            5.0 / 5.0 · TUYỆT VỜI
          </div>

          {/* 4 Emotion Faces in a row */}
          <div className="grid grid-cols-4 gap-2.5 mt-7">
            {/* 1. Rất Hài Lòng */}
            <button
              onClick={() => setSelectedEmotion('happy')}
              className={`p-2.5 rounded-2xl flex flex-col items-center justify-center aspect-[3/4] transition-all ${
                selectedEmotion === 'happy'
                  ? 'border-2 border-[#FFB400] bg-amber-50/50 shadow-sm'
                  : 'bg-white shadow-sm'
              }`}
            >
              <span className="text-3xl">😄</span>
              <span className="text-[11px] font-bold text-amber-900 mt-2 text-center leading-tight">Rất Hài Lòng</span>
            </button>

            {/* 2. Bình Thường */}
            <button
              onClick={() => setSelectedEmotion('normal')}
              className={`p-2.5 rounded-2xl flex flex-col items-center justify-center aspect-[3/4] transition-all ${
                selectedEmotion === 'normal'
                  ? 'border-2 border-[#FFB400] bg-amber-50/50 shadow-sm'
                  : 'bg-white shadow-sm'
              }`}
            >
              <span className="text-3xl">🙂</span>
              <span className="text-[11px] font-semibold text-gray-700 mt-2 text-center leading-tight">
                Bình Thường
              </span>
            </button>

            {/* 3. Chưa Thích */}
            <button
              onClick={() => setSelectedEmotion('dislike')}
              className={`p-2.5 rounded-2xl flex flex-col items-center justify-center aspect-[3/4] transition-all ${
                selectedEmotion === 'dislike'
                  ? 'border-2 border-[#FFB400] bg-amber-50/50 shadow-sm'
                  : 'bg-white shadow-sm'
              }`}
            >
              <span className="text-3xl">🙁</span>
              <span className="text-[11px] font-semibold text-gray-700 mt-2 text-center leading-tight">Chưa Thích</span>
            </button>

            {/* 4. Thất Vọng */}
            <button
              onClick={() => setSelectedEmotion('disappointed')}
              className={`p-2.5 rounded-2xl flex flex-col items-center justify-center aspect-[3/4] transition-all ${
                selectedEmotion === 'disappointed'
                  ? 'border-2 border-[#FFB400] bg-amber-50/50 shadow-sm'
                  : 'bg-white shadow-sm'
              }`}
            >
              <span className="text-3xl">😡</span>
              <span className="text-[11px] font-semibold text-gray-700 mt-2 text-center leading-tight">Thất Vọng</span>
            </button>
          </div>

          {/* Points customer liked most */}
          <div className="mt-7">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-2.5">
              ĐIỂM CHỊ ƯNG Ý NHẤT
            </div>
            <div className="space-y-2">
              <div>
                <span className="inline-block bg-[#FFB400] text-black font-bold text-[13px] px-4 py-2 rounded-full shadow-xs">
                  ✓ Nối rất êm, không cay
                </span>
              </div>
              <div>
                <span className="inline-block bg-[#FFB400] text-black font-bold text-[13px] px-4 py-2 rounded-full shadow-xs">
                  ✓ Mi nhẹ như không nối
                </span>
              </div>
              <div>
                <span className="inline-block bg-[#FFB400] text-black font-bold text-[13px] px-4 py-2 rounded-full shadow-xs">
                  ✓ CV Thảo Ly rất chu đáo
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-6 pb-2">
          <button
            onClick={handleSubmit}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-bold text-[15px] shadow-md active:scale-98 transition-transform text-center"
          >
            GỬI ĐÁNH GIÁ & HOÀN TẤT
          </button>
        </div>
      </div>
    </div>
  );
}
