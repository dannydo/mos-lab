'use client';

import React, { useState } from 'react';
import { X, ZoomIn, Check, Sparkles, User, ShieldCheck } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { LashHistoryItem, LashHistoryPhoto } from '../../state/mockData';
import { CvFeather1Badge } from '../ui-kit/CvFeatherLabels';

interface Screen02LashHistorySheetProps {
  item: LashHistoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApplySpecs: (item: LashHistoryItem) => void;
}

export function Screen02LashHistorySheet({ item, isOpen, onClose, onApplySpecs }: Screen02LashHistorySheetProps) {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';
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
      avatar: 'https://cdn.wingslashes.com/uploads/user/avatar/408/thumbnail/50408.png',
    },
    checkInBy: {
      name: item.staffName || 'Thảo Ly',
      role: 'CVL',
      tier: 'CVL',
      avatar: 'https://cdn.wingslashes.com/uploads/user/avatar/889/thumbnail/47889.png',
    },
    lashedBy: {
      name: item.staffName || 'Thảo Ly',
      role: 'CVL',
      tier: 'CVL',
      avatar: 'https://cdn.wingslashes.com/uploads/user/avatar/889/thumbnail/47889.png',
    },
    checkOutBy: {
      name: item.staffName || 'Thảo Ly',
      role: 'CVL',
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
        className="w-full max-w-[430px] bg-[var(--mos-surface)] text-[var(--mos-text)] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[var(--mos-surface-border)] overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-6 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Tiêu đề góc trái · Nút đóng [✕] góc phải (Chuẩn UI Invariant) */}
        <div className="flex items-start justify-between gap-3 p-4 pb-3 border-b border-[var(--mos-surface-border)] bg-[var(--mos-surface-raised)] shrink-0">
          <div className="min-w-0">
            <span
              className={`text-[10px] font-black uppercase tracking-wider block ${
                isDark ? 'text-blue-400' : 'text-blue-600'
              }`}
            >
              HỒ SƠ BỘ MI LẦN TRƯỚC
            </span>
            <h3 className="text-[15px] font-black text-[var(--mos-text)] truncate">
              {item.date} · {item.serviceName}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                <span>★</span> {item.rating || '5.0'}
              </span>
              <span className="text-[var(--mos-text-muted)]">·</span>
              <span className="text-[11px] text-[var(--mos-text-muted)] font-medium truncate">
                Chuyên viên: <strong className="text-[var(--mos-text)]">{item.staffName}</strong>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết hồ sơ bộ mi"
            className="w-8 h-8 rounded-full bg-[var(--mos-surface-muted)] hover:opacity-80 flex items-center justify-center text-[var(--mos-text)] active:scale-95 transition-transform shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 select-none">
          {/* Section 1: 3 Bắt Buộc Tấm Hình */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[var(--mos-text-muted)] flex items-center gap-1">
                <span>📸</span> 3 TẤM HÌNH BẮT BUỘC
              </span>
              <span
                className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${
                  isDark
                    ? 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40'
                    : 'text-emerald-700 bg-emerald-50 border-emerald-200/70'
                }`}
              >
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
                    className="group relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-neutral-900 border border-[var(--mos-surface-border)] shadow-xs cursor-pointer hover:border-blue-400 hover:shadow-md transition-all flex items-center justify-center"
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
            <p className="text-[10px] text-[var(--mos-text-muted)] mt-1.5 italic text-center">
              Nhấp vào ảnh bất kỳ để phóng to xem chi tiết bờ mi & chân nối
            </p>
          </div>

          {/* Section 2: Bộ Tứ Nhân Sự */}
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-[var(--mos-text-muted)] block mb-2">
              👥 BỘ TỨ NHÂN SỰ PHỤ TRÁCH
            </span>
            <div className="bg-[var(--mos-surface-raised)] text-[var(--mos-text)] rounded-2xl p-3 shadow-sm border border-[var(--mos-surface-border)]">
              <div className="grid grid-cols-4 gap-1 text-center">
                {/* Booked by */}
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-tight mb-1">Booked by</span>
                  <div className="relative w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-blue-500 to-cyan-400 mb-1">
                    <div className="w-full h-full rounded-full overflow-hidden relative flex items-center justify-center bg-blue-700 text-white font-bold text-xs">
                      <span>{staff.bookedBy?.name ? staff.bookedBy.name.slice(0, 2).toUpperCase() : 'TN'}</span>
                      {staff.bookedBy?.avatar && (
                        <img
                          src={staff.bookedBy.avatar}
                          alt="Booker"
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      )}
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
                    <div className="w-full h-full rounded-full overflow-hidden relative flex items-center justify-center bg-amber-600 text-black font-bold text-xs">
                      <span>TL</span>
                      {staff.checkInBy?.avatar && (
                        <img
                          src={staff.checkInBy.avatar}
                          alt="Checkin"
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded bg-neutral-900 border border-amber-400 text-amber-300 text-[7.5px] font-black leading-none inline-flex items-center">
                      <CvFeather1Badge />
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
                    <div className="w-full h-full rounded-full overflow-hidden relative flex items-center justify-center bg-purple-600 text-white font-bold text-xs">
                      <span>TL</span>
                      {staff.lashedBy?.avatar && (
                        <img
                          src={staff.lashedBy.avatar}
                          alt="Lashed by"
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded bg-neutral-900 border border-purple-400 text-purple-300 text-[7.5px] font-black leading-none inline-flex items-center">
                      <CvFeather1Badge />
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
                    <div className="w-full h-full rounded-full overflow-hidden relative flex items-center justify-center bg-emerald-700 text-white font-bold text-xs">
                      <span>{staff.checkOutBy?.name ? staff.checkOutBy.name.slice(0, 2).toUpperCase() : 'CV'}</span>
                      {staff.checkOutBy?.avatar && (
                        <img
                          src={staff.checkOutBy.avatar}
                          alt="Checkout"
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                    {/* Badge if CVL */}
                    {(staff.checkOutBy?.tier === 'CVL' || staff.checkOutBy?.role?.includes('CV')) && (
                      <span className="absolute -bottom-1 -right-1 bg-[#2C2C2E] border border-emerald-400 text-emerald-300 text-[7.5px] font-black px-1 py-0.2 rounded-full leading-tight inline-flex items-center">
                        <CvFeather1Badge />
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
                    {staff.checkOutBy?.tier === 'CVL' || staff.checkOutBy?.role?.includes('CV') ? (
                      <span className="inline-flex items-center gap-0.5">
                        <CvFeather1Badge /> Tự chốt
                      </span>
                    ) : staff.checkOutBy?.role === 'CC' ? (
                      'CC Sảnh'
                    ) : (
                      'Checkout'
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Thông Số Kỹ Thuật Mi Nối */}
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-[var(--mos-text-muted)] block mb-2">
              📐 THÔNG SỐ KỸ THUẬT MI NỐI
            </span>
            <div className="grid grid-cols-3 gap-2">
              {/* Dáng mi */}
              <div className="bg-[var(--mos-surface-raised)] rounded-xl p-2 border border-[var(--mos-surface-border)]">
                <span className="text-[9px] font-bold text-[var(--mos-text-muted)] uppercase block">Dáng mi</span>
                <span className="text-[13px] font-black text-[var(--mos-text)] block truncate mt-0.5">
                  {attrs.style || 'Natural'}
                </span>
              </div>
              {/* Độ cong */}
              <div className="bg-[var(--mos-surface-raised)] rounded-xl p-2 border border-[var(--mos-surface-border)]">
                <span className="text-[9px] font-bold text-[var(--mos-text-muted)] uppercase block">Độ cong</span>
                <span className={`text-[13px] font-black block truncate mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  {(attrs.curl || 'C').replace(/^Cong\s+/i, '')}
                </span>
              </div>
              {/* Độ dài */}
              <div className="bg-[var(--mos-surface-raised)] rounded-xl p-2 border border-[var(--mos-surface-border)]">
                <span className="text-[9px] font-bold text-[var(--mos-text-muted)] uppercase block">Độ dài</span>
                <span className="text-[13px] font-black text-[var(--mos-text)] block truncate mt-0.5 tabular-nums">
                  {(attrs.length || '10-12').replace(/\s*mm/gi, '')}
                </span>
              </div>
              {/* Độ dày */}
              <div className="bg-[var(--mos-surface-raised)] rounded-xl p-2 border border-[var(--mos-surface-border)]">
                <span className="text-[9px] font-bold text-[var(--mos-text-muted)] uppercase block">Độ dày</span>
                <span className={`text-[12.5px] font-black block truncate mt-0.5 tabular-nums ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  {(attrs.thickness || '0.10').replace(/\s*mm/gi, '')}
                </span>
              </div>
              {/* Số sợi / Fan */}
              <div className="bg-[var(--mos-surface-raised)] rounded-xl p-2 border border-[var(--mos-surface-border)]">
                <span className="text-[9px] font-bold text-[var(--mos-text-muted)] uppercase block">Số lượng</span>
                <span className="text-[13px] font-black text-[var(--mos-text)] block truncate mt-0.5">
                  {attrs.fanCount || '70 sợi'}
                </span>
              </div>
              {/* Dáng mắt */}
              <div className="bg-[var(--mos-surface-raised)] rounded-xl p-2 border border-[var(--mos-surface-border)]">
                <span className="text-[9px] font-bold text-[var(--mos-text-muted)] uppercase block">Dáng mắt</span>
                <span className={`text-[12px] font-black block truncate mt-0.5 ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>
                  {attrs.eyeShape || 'Mí lót'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Ghi Chú & Đánh Giá */}
          <div className="space-y-2">
            {attrs.notes && (
              <div
                className={`border rounded-xl p-2.5 ${
                  isDark ? 'bg-amber-950/35 border-amber-500/40' : 'bg-amber-50/70 border-amber-200/80'
                }`}
              >
                <span
                  className={`text-[10px] font-black uppercase flex items-center gap-1 ${
                    isDark ? 'text-amber-300' : 'text-amber-800'
                  }`}
                >
                  <span>📝</span> Ghi chú kỹ thuật từ chuyên viên
                </span>
                <p className={`text-[12px] font-medium mt-1 leading-snug ${isDark ? 'text-amber-100' : 'text-amber-950'}`}>
                  {attrs.notes}
                </p>
              </div>
            )}

            {item.review && (
              <div
                className={`border rounded-xl p-2.5 ${
                  isDark ? 'bg-emerald-950/35 border-emerald-500/40' : 'bg-emerald-50/70 border-emerald-200/80'
                }`}
              >
                <span
                  className={`text-[10px] font-black uppercase flex items-center gap-1 ${
                    isDark ? 'text-emerald-300' : 'text-emerald-800'
                  }`}
                >
                  <span>💬</span> Phản hồi khách hàng (Đánh giá {item.rating || '5.0'} ★)
                </span>
                <p
                  className={`text-[12px] font-medium mt-1 italic leading-snug ${
                    isDark ? 'text-emerald-100' : 'text-emerald-950'
                  }`}
                >
                  &ldquo;{item.review}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 pt-3 border-t border-[var(--mos-surface-border)] bg-[var(--mos-surface)] space-y-2 shrink-0">
          <button
            type="button"
            onClick={() => onApplySpecs(item)}
            className="w-full py-3.5 px-4 rounded-2xl bg-[var(--mos-accent)] hover:brightness-105 active:scale-98 text-[var(--mos-accent-contrast)] font-extrabold text-[14px] flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>ÁP DỤNG THÔNG SỐ NÀY CHO HÔM NAY</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-[var(--mos-surface-muted)] hover:opacity-90 active:scale-98 text-[var(--mos-text)] font-bold text-[13px] text-center transition-all cursor-pointer"
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
