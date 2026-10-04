'use client';

import React, { useState } from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';

interface Screen03ConsultationMatrixProps {
  onBack: () => void;
  onSave: (attributes: { style: string; curl: string; length: string; thickness: string; notes?: string }) => void;
}

export function Screen03ConsultationMatrix({ onBack, onSave }: Screen03ConsultationMatrixProps) {
  const [selectedStyle, setSelectedStyle] = useState('New Flawless');
  const [selectedCurl, setSelectedCurl] = useState('C');
  const [selectedLength, setSelectedLength] = useState('10-12 mm');
  const [selectedThickness, setSelectedThickness] = useState('0.07 mm');
  const [selectedColor, setSelectedColor] = useState('Đen Tuyền');
  const [notes, setNotes] = useState(
    'Khách mí lót nhẹ, mi thật góc trong yếu. CV dán pad êm, nối form cánh quạt nhẹ ôm đuôi mắt.'
  );

  const handleSubmit = () => {
    onSave({
      style: selectedStyle,
      curl: selectedCurl,
      length: selectedLength,
      thickness: selectedThickness,
      notes,
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] overflow-y-auto select-none">
      <IosNavigationBar
        title="Consultation (Tư Vấn Mi)"
        onBack={onBack}
        backTitle="Check In"
        rightAction={
          <button onClick={handleSubmit} className="text-[#FFB400] font-semibold text-base py-1 px-1 active:opacity-60">
            Lưu
          </button>
        }
      />

      <div className="flex-1 px-4 py-3 space-y-3.5 overflow-y-auto pb-6">
        {/* Customer Header Pill */}
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-neutral-100 flex items-center justify-between">
          <div>
            <div className="text-[14px] font-bold text-black">Chị Quyên · 0937.554.430</div>
            <div className="text-[12px] text-gray-500 mt-0.5 font-medium">Dịch vụ: New Flawless (550.000 đ)</div>
          </div>
          <span className="bg-[#FFB400] text-black font-extrabold text-[12px] px-2.5 py-1 rounded-full shadow-xs">
            Lần 15
          </span>
        </div>

        {/* Section 1: Dáng Mi */}
        <div>
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1.5">
            DÁNG MI (LASH STYLE)
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-neutral-100 space-y-2">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedStyle('New Flawless')}
                className={`px-3.5 py-2 rounded-xl text-[13px] font-bold transition-all ${
                  selectedStyle === 'New Flawless' ? 'bg-[#FFB400] text-black shadow-xs' : 'bg-[#F2F2F7] text-gray-800'
                }`}
              >
                {selectedStyle === 'New Flawless' && '✓ '}New Flawless
              </button>
              <button
                onClick={() => setSelectedStyle('Classic')}
                className={`px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all ${
                  selectedStyle === 'Classic'
                    ? 'bg-[#FFB400] text-black font-bold shadow-xs'
                    : 'bg-[#F2F2F7] text-gray-800'
                }`}
              >
                {selectedStyle === 'Classic' && '✓ '}Classic
              </button>
              <button
                onClick={() => setSelectedStyle('Design')}
                className={`px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all ${
                  selectedStyle === 'Design'
                    ? 'bg-[#FFB400] text-black font-bold shadow-xs'
                    : 'bg-[#F2F2F7] text-gray-800'
                }`}
              >
                {selectedStyle === 'Design' && '✓ '}Design
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedStyle('Volume')}
                className={`px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all ${
                  selectedStyle === 'Volume'
                    ? 'bg-[#FFB400] text-black font-bold shadow-xs'
                    : 'bg-[#F2F2F7] text-gray-800'
                }`}
              >
                {selectedStyle === 'Volume' && '✓ '}Volume
              </button>
              <button
                onClick={() => setSelectedStyle('Hyperlight')}
                className={`px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all ${
                  selectedStyle === 'Hyperlight'
                    ? 'bg-[#FFB400] text-black font-bold shadow-xs'
                    : 'bg-[#F2F2F7] text-gray-800'
                }`}
              >
                {selectedStyle === 'Hyperlight' && '✓ '}Hyperlight
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Độ Cong */}
        <div>
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1.5">
            ĐỘ CONG (CURL)
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-neutral-100 grid grid-cols-4 gap-2">
            {[
              { id: 'B', label: 'B (Tự nhiên nhẹ)' },
              { id: 'C', label: 'C (Cong tự nhiên)' },
              { id: 'CC', label: 'CC (Cong vừa)' },
              { id: 'D', label: 'D (Cong nhiều)' },
            ].map((c) => {
              const active = selectedCurl === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCurl(c.id)}
                  className={`p-2 rounded-xl text-[12px] leading-tight text-center font-medium transition-all flex flex-col items-center justify-center min-h-[58px] ${
                    active ? 'bg-[#FFB400] text-black font-bold shadow-xs' : 'bg-[#F2F2F7] text-gray-800'
                  }`}
                >
                  <span>{active ? `✓ ${c.label}` : c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Chiều Dài */}
        <div>
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1.5">
            CHIỀU DÀI (LENGTH)
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-neutral-100 grid grid-cols-4 gap-2">
            {[
              { id: '9-11 mm', label: '9-11 mm' },
              { id: '10-12 mm', label: '10-12 mm (Chuẩn)' },
              { id: '11-13 mm', label: '11-13 mm' },
              { id: '12-14 mm', label: '12-14 mm' },
            ].map((l) => {
              const active = selectedLength === l.id;
              return (
                <button
                  key={l.id}
                  onClick={() => setSelectedLength(l.id)}
                  className={`p-2 rounded-xl text-[12px] leading-tight text-center font-medium transition-all flex flex-col items-center justify-center min-h-[58px] ${
                    active ? 'bg-[#FFB400] text-black font-bold shadow-xs' : 'bg-[#F2F2F7] text-gray-800'
                  }`}
                >
                  <span>{active ? `✓ ${l.label}` : l.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4: Độ Dày & Màu Sắc */}
        <div>
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1.5">
            ĐỘ DÀY & MÀU SẮC
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-neutral-100 flex gap-2">
            <button
              onClick={() => setSelectedThickness('0.07 mm')}
              className={`flex-1 py-2.5 px-1 rounded-xl text-[12px] text-center font-medium transition-all ${
                selectedThickness === '0.07 mm'
                  ? 'bg-[#FFB400] text-black font-bold shadow-xs'
                  : 'bg-[#F2F2F7] text-gray-800'
              }`}
            >
              {selectedThickness === '0.07 mm' && '✓ '}0.07 mm (Siêu nhẹ)
            </button>
            <button
              onClick={() => setSelectedThickness('0.10 mm')}
              className={`py-2.5 px-3 rounded-xl text-[12px] text-center font-medium transition-all ${
                selectedThickness === '0.10 mm'
                  ? 'bg-[#FFB400] text-black font-bold shadow-xs'
                  : 'bg-[#F2F2F7] text-gray-800'
              }`}
            >
              0.10 mm
            </button>
            <button
              onClick={() => setSelectedColor('Đen Tuyền')}
              className={`flex-1 py-2.5 px-1 rounded-xl text-[12px] text-center font-medium transition-all ${
                selectedColor === 'Đen Tuyền'
                  ? 'bg-[#FFB400] text-black font-bold shadow-xs'
                  : 'bg-[#F2F2F7] text-gray-800'
              }`}
            >
              {selectedColor === 'Đen Tuyền' && '✓ '}Đen Tuyền
            </button>
            <button
              onClick={() => setSelectedColor('Nâu Tây')}
              className={`py-2.5 px-3 rounded-xl text-[12px] text-center font-medium transition-all ${
                selectedColor === 'Nâu Tây'
                  ? 'bg-[#FFB400] text-black font-bold shadow-xs'
                  : 'bg-[#F2F2F7] text-gray-800'
              }`}
            >
              Nâu Tây
            </button>
          </div>
        </div>

        {/* Section 5: Ghi Chú Cho Chuyên Viên */}
        <div>
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1.5">
            GHI CHÚ CHO CHUYÊN VIÊN
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-neutral-100">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-transparent text-[13px] text-gray-800 leading-relaxed focus:outline-none resize-none font-medium"
              placeholder="Nhập ghi chú cho chuyên viên..."
            />
          </div>
        </div>

        {/* Big Action Button */}
        <div className="pt-2">
          <button
            onClick={handleSubmit}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-bold text-[15px] shadow-md active:scale-98 transition-transform text-center"
          >
            LƯU THÔNG SỐ & CHỌN CHUYÊN VIÊN
          </button>
        </div>
      </div>
    </div>
  );
}
