'use client';

import React, { useState } from 'react';
import { X, ZoomIn, Check, Sparkles, User, ShieldCheck } from 'lucide-react';
import { LashHistoryItem, LashHistoryPhoto } from '../../state/mockData';

interface Screen02LashHistorySheetProps {
  item: LashHistoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApplySpecs: (item: LashHistoryItem) => void;
}

export function Screen02LashHistorySheet({ item, isOpen, onClose, onApplySpecs }: Screen02LashHistorySheetProps) {
  const [zoomPhoto, setZoomPhoto] = useState<LashHistoryPhoto | null>(null);

  if (!isOpen || !item) return null;

  // Default fallback 3 photos if not yet populated from server
  const photos: LashHistoryPhoto[] =
    item.photos && item.photos.length > 0
      ? item.photos
      : [
          {
            type: 'before',
            label: '1. Before · Mắt mộc',
            sublabel: 'Góc nhìn cận cảnh mi thật trước khi làm',
            url: 'https://cdn.wingslashes.com/uploads/order/service-progress/645/original/1401645.jpg',
          },
          {
            type: 'cleaned',
            label: '2. Vệ sinh · Nhắm',
            sublabel: 'Vệ sinh mi, dán gel pad chuẩn bị nối',
            url: 'https://cdn.wingslashes.com/uploads/order/service-progress/646/original/1401646.jpg',
          },
          {
            type: 'after',
            label: '3. After · Hoàn thiện',
            sublabel: 'Thành phẩm sau khi nối hoàn tất',
            url: 'https://cdn.wingslashes.com/uploads/order/service-progress/685/original/1401685.jpg',
          },
        ];

  const staff = item.staffMembers || {
    bookedBy: {
      name: 'Tâm Nguyễn',
      role: 'Booker',
      avatar: 'https://cdn.wingslashes.com/uploads/user/avatar/781/original/781.jpg',
    },
    checkInBy: {
      name: item.staffName || 'Thảo Ly',
      role: 'CV🪶',
      tier: 'CVL',
      avatar: 'https://cdn.wingslashes.com/uploads/user/avatar/889/thumbnail/47889.png',
    },
    lashedBy: {
      name: item.staffName || 'Thảo Ly',
      role: 'CV🪶',
      tier: 'CVL',
      avatar: 'https://cdn.wingslashes.com/uploads/user/avatar/889/thumbnail/47889.png',
    },
    checkOutBy: {
      name: item.staffName || 'Thảo Ly',
      role: 'CV🪶',
      tier: 'CVL',
      avatar: 'https://cdn.wingslashes.com/uploads/user/avatar/889/thumbnail/47889.png',
    },
  };

  const attrs = item.attributes || {
    style: 'Natural',
    curl: 'C',
    length: '10-12 mm',
    thickness: '0.10 mm',
    fanCount: '70 sợi',
    material: 'Mink Silk',
    eyeShape: 'Mí lót / Sụp mí',
    notes: 'Mi khách cong nhẹ tự nhiên, chân mi cách bờ 1mm chuẩn kỹ thuật.',
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-6 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Tiêu đề góc trái · Nút đóng [✕] góc phải (Chuẩn UI Invariant) */}
        <div className="flex items-start justify-between gap-3 p-4 pb-3 border-b border-neutral-100 bg-neutral-50/60 shrink-0">
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 block">
              HỒ SƠ BỘ MI LẦN TRƯỚC
            </span>
            <h3 className="text-[15px] font-black text-neutral-900 truncate">
              {item.date} · {item.serviceName}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
                <span>★</span> {item.rating || '5.0'}
              </span>
              <span className="text-neutral-300">·</span>
              <span className="text-[11px] text-neutral-500 font-medium truncate">
                Chuyên viên: <strong className="text-neutral-800">{item.staffName}</strong>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết hồ sơ bộ mi"
            className="w-8 h-8 rounded-full bg-neutral-200/80 hover:bg-neutral-300 flex items-center justify-center text-neutral-700 active:scale-95 transition-transform shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 select-none">
          {/* Section 1: 3 Bắt Buộc Tấm Hình */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-neutral-700 flex items-center gap-1">
                <span>📸</span> 3 TẤM HÌNH BẮT BUỘC
              </span>
              <span className="text-[10.5px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70">
                ✓ Đủ 3 góc chụp
              </span>
            </div>

            <div className="flex flex-col space-y-3">
              {photos.map((p, idx) => {
                const thumbUrl = p.url.includes('/original/') ? p.url.replace('/original/', '/thumbnail/') : p.url;
                return (
                  <div
                    key={idx}
                    onClick={() => setZoomPhoto(p)}
                    className="group relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-200/90 shadow-xs cursor-pointer hover:border-blue-400 hover:shadow-md transition-all flex items-center justify-center"
                  >
                    <img
                      src={thumbUrl}
                      alt={p.label}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      loading="eager"
                      decoding="async"
                    />
                    {/* Top gradient & Label badge */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                      <span className="px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-white text-[11.5px] font-black border border-white/20 shadow-md">
                        {p.label}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[10.5px] font-bold border border-white/20 shadow-md group-hover:bg-blue-600 transition-colors">
                        <ZoomIn className="w-3.5 h-3.5" /> Phóng to
                      </span>
                    </div>

                    {/* Bottom overlay with Sublabel */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-6 flex items-end justify-between pointer-events-none">
                      <span className="text-[11px] font-medium text-white/95 drop-shadow-xs line-clamp-1">
                        {p.sublabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-neutral-400 mt-1.5 italic text-center">
              Nhấp vào ảnh bất kỳ để phóng to xem chi tiết bờ mi & chân nối
            </p>
          </div>

          {/* Section 2: Bộ Tứ Nhân Sự */}
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-700 block mb-2">
              👥 BỘ TỨ NHÂN SỰ PHỤ TRÁCH
            </span>
            <div className="bg-[#1C1C1E] text-white rounded-2xl p-3 shadow-sm border border-neutral-800">
              <div className="grid grid-cols-4 gap-1 text-center">
                {/* Booked by */}
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-tight mb-1">Booked by</span>
                  <div className="relative w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-blue-500 to-cyan-400 mb-1">
                    {staff.bookedBy?.avatar ? (
                      <img
                        src={staff.bookedBy.avatar}
                        alt="Booker"
                        className="w-full h-full rounded-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : null}
                    <div className="w-full h-full rounded-full bg-blue-700 flex items-center justify-center font-bold text-xs text-white">
                      {staff.bookedBy?.name ? staff.bookedBy.name.slice(0, 2).toUpperCase() : 'TN'}
                    </div>
                  </div>
                  <span className="text-[11px] font-extrabold truncate w-full px-0.5">
                    {staff.bookedBy?.name || 'Tâm Nguyễn'}
                  </span>
                  <span className="text-[9px] text-blue-400 font-bold">Booker</span>
                </div>

                {/* Checkin by */}
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-tight mb-1">
                    Checkin by
                  </span>
                  <div className="relative w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 to-yellow-300 mb-1">
                    {staff.checkInBy?.avatar ? (
                      <img
                        src={staff.checkInBy.avatar}
                        alt="Checkin"
                        className="w-full h-full rounded-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : null}
                    <div className="w-full h-full rounded-full bg-amber-600 flex items-center justify-center font-bold text-xs text-white">
                      TL
                    </div>
                    <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded bg-neutral-900 border border-amber-400 text-amber-300 text-[7.5px] font-black leading-none">
                      CV🪶
                    </span>
                  </div>
                  <span className="text-[11px] font-extrabold truncate w-full px-0.5 text-amber-300">
                    {staff.checkInBy?.name || 'Thảo Ly'}
                  </span>
                  <span className="text-[9px] text-amber-400 font-bold">Đón khách</span>
                </div>

                {/* Lashed by */}
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-tight mb-1">Lashed by</span>
                  <div className="relative w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-purple-500 to-pink-500 mb-1">
                    {staff.lashedBy?.avatar ? (
                      <img
                        src={staff.lashedBy.avatar}
                        alt="Lashed by"
                        className="w-full h-full rounded-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : null}
                    <div className="w-full h-full rounded-full bg-purple-600 flex items-center justify-center font-bold text-xs text-white">
                      TL
                    </div>
                    <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded bg-neutral-900 border border-purple-400 text-purple-300 text-[7.5px] font-black leading-none">
                      CV🪶
                    </span>
                  </div>
                  <span className="text-[11px] font-extrabold truncate w-full px-0.5 text-purple-300">
                    {staff.lashedBy?.name || 'Thảo Ly'}
                  </span>
                  <span className="text-[9px] text-purple-400 font-bold">Thực hiện</span>
                </div>

                {/* Checkout by */}
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-tight mb-1">
                    Checkout by
                  </span>
                  <div className="relative w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-emerald-500 to-teal-400 mb-1">
                    {staff.checkOutBy?.avatar ? (
                      <img
                        src={staff.checkOutBy.avatar}
                        alt="Checkout"
                        className="w-full h-full rounded-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : null}
                    <div className="w-full h-full rounded-full bg-emerald-700 flex items-center justify-center font-bold text-xs text-white">
                      {staff.checkOutBy?.name ? staff.checkOutBy.name.slice(0, 2).toUpperCase() : 'CV'}
                    </div>
                    {/* Badge if CVL */}
                    {(staff.checkOutBy?.tier === 'CVL' || staff.checkOutBy?.role?.includes('CV')) && (
                      <span className="absolute -bottom-1 -right-1 bg-[#2C2C2E] border border-emerald-400 text-emerald-300 text-[7.5px] font-black px-1 py-0.2 rounded-full leading-tight">
                        CV🪶
                      </span>
                    )}
                    {(staff.checkOutBy?.tier === 'CC' || staff.checkOutBy?.role === 'CC') && (
                      <span className="absolute -bottom-1 -right-1 bg-[#2C2C2E] border border-emerald-400 text-emerald-300 text-[7.5px] font-black px-1 py-0.2 rounded-full leading-tight">
                        CC
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-extrabold truncate w-full px-0.5 text-emerald-400">
                    {staff.checkOutBy?.name || 'Thảo Ly'}
                  </span>
                  <span className="text-[9px] text-emerald-400 font-bold">
                    {staff.checkOutBy?.tier === 'CVL' || staff.checkOutBy?.role?.includes('CV')
                      ? 'CV🪶 Tự chốt'
                      : staff.checkOutBy?.role === 'CC'
                        ? 'CC Sảnh'
                        : 'Checkout'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Thông Số Kỹ Thuật Mi Nối */}
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-700 block mb-2">
              📐 THÔNG SỐ KỸ THUẬT MI NỐI
            </span>
            <div className="grid grid-cols-3 gap-2">
              {/* Dáng mi */}
              <div className="bg-neutral-50 rounded-xl p-2 border border-neutral-200/70">
                <span className="text-[9px] font-bold text-neutral-400 uppercase block">Dáng mi</span>
                <span className="text-[13px] font-black text-neutral-900 block truncate mt-0.5">
                  {attrs.style || 'Natural'}
                </span>
              </div>
              {/* Độ cong */}
              <div className="bg-neutral-50 rounded-xl p-2 border border-neutral-200/70">
                <span className="text-[9px] font-bold text-neutral-400 uppercase block">Độ cong</span>
                <span className="text-[13px] font-black text-blue-600 block truncate mt-0.5">
                  Cong {attrs.curl || 'C'}
                </span>
              </div>
              {/* Độ dài */}
              <div className="bg-neutral-50 rounded-xl p-2 border border-neutral-200/70">
                <span className="text-[9px] font-bold text-neutral-400 uppercase block">Độ dài</span>
                <span className="text-[13px] font-black text-neutral-900 block truncate mt-0.5">
                  {attrs.length || '10-12 mm'}
                </span>
              </div>
              {/* Độ dày */}
              <div className="bg-neutral-50 rounded-xl p-2 border border-neutral-200/70">
                <span className="text-[9px] font-bold text-neutral-400 uppercase block">Độ dày</span>
                <span className="text-[12.5px] font-black text-emerald-700 block truncate mt-0.5">
                  {attrs.thickness || '0.10 mm'}
                </span>
              </div>
              {/* Số sợi / Fan */}
              <div className="bg-neutral-50 rounded-xl p-2 border border-neutral-200/70">
                <span className="text-[9px] font-bold text-neutral-400 uppercase block">Số lượng</span>
                <span className="text-[13px] font-black text-neutral-900 block truncate mt-0.5">
                  {attrs.fanCount || '70 sợi'}
                </span>
              </div>
              {/* Dáng mắt */}
              <div className="bg-neutral-50 rounded-xl p-2 border border-neutral-200/70">
                <span className="text-[9px] font-bold text-neutral-400 uppercase block">Dáng mắt</span>
                <span className="text-[12px] font-black text-purple-700 block truncate mt-0.5">
                  {attrs.eyeShape || 'Mí lót'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Ghi Chú & Đánh Giá */}
          <div className="space-y-2">
            {attrs.notes && (
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5">
                <span className="text-[10px] font-black uppercase text-amber-800 flex items-center gap-1">
                  <span>📝</span> Ghi chú kỹ thuật từ chuyên viên
                </span>
                <p className="text-[12px] text-amber-950 font-medium mt-1 leading-snug">{attrs.notes}</p>
              </div>
            )}

            {item.review && (
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5">
                <span className="text-[10px] font-black uppercase text-emerald-800 flex items-center gap-1">
                  <span>💬</span> Phản hồi khách hàng (Đánh giá {item.rating || '5.0'} ★)
                </span>
                <p className="text-[12px] text-emerald-950 font-medium mt-1 italic leading-snug">
                  &ldquo;{item.review}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 pt-3 border-t border-neutral-100 bg-white space-y-2 shrink-0">
          <button
            type="button"
            onClick={() => onApplySpecs(item)}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-[#FFB400] hover:brightness-105 active:scale-98 text-black font-extrabold text-[14px] flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 fill-black stroke-black" />
            <span>ÁP DỤNG THÔNG SỐ NÀY CHO HÔM NAY</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 active:scale-98 text-neutral-700 font-bold text-[13px] text-center transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Lightbox Zoom Photo Modal */}
      {zoomPhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setZoomPhoto(null)}
        >
          <div className="relative max-w-[420px] w-full flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <span className="text-[14px] font-black tracking-wide">{zoomPhoto.label}</span>
              <button
                type="button"
                onClick={() => setZoomPhoto(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={zoomPhoto.url}
              alt={zoomPhoto.label}
              className="w-full rounded-2xl object-contain max-h-[75vh] shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
            <span className="text-[11px] text-neutral-400 mt-2">Chạm vào vùng ngoài để đóng</span>
          </div>
        </div>
      )}
    </div>
  );
}
