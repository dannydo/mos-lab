'use client';

import React from 'react';
import {
  X,
  Sparkles,
  Info,
  ShieldCheck,
  Feather,
  Zap,
  Leaf,
  Layers,
  Eye,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { LashMaterialSpec } from './LashMaterialConstraintMatrix';
import { CvFeather1Badge } from '../ui-kit/CvFeatherLabels';

export type InfoModalType = 'MATERIAL' | 'DESIGN' | 'CURL' | 'THICKNESS' | 'LENGTH' | null;

interface LashConsultationInfoModalProps {
  type: InfoModalType;
  material: LashMaterialSpec;
  onClose: () => void;
}

export const LashConsultationInfoModal: React.FC<LashConsultationInfoModalProps> = ({ type, material, onClose }) => {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';

  if (!type) return null;

  return (
    <div
      className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex flex-col justify-end select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] mx-auto max-h-[88dvh] bg-[var(--mos-surface)] text-[var(--mos-text)] rounded-t-[28px] overflow-hidden flex flex-col shadow-2xl border-t border-[var(--mos-surface-border)] animate-in slide-in-from-bottom duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Thanh Vuốt Kéo iOS Handle Bar */}
        <div className="pt-2.5 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-[var(--mos-surface-border-strong)]" />
        </div>

        {/* Modal Header */}
        <div className="px-4 py-2.5 border-b border-[var(--mos-surface-border)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[var(--mos-accent)] text-[var(--mos-accent-contrast)] flex items-center justify-center shrink-0">
              <Info className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
            <div>
              <h3 className="text-[13px] font-black tracking-tight text-[var(--mos-text)] uppercase">
                {type === 'MATERIAL' && `Quy Chuẩn Dòng Mi · ${material.shortLabel}`}
                {type === 'DESIGN' && 'Hướng Dẫn 4 Thiết Kế & Dáng Mắt'}
                {type === 'CURL' && 'Bản Đồ Độ Cong · Góc Bù Trừ Mi Thật'}
                {type === 'THICKNESS' && 'Quy Chuẩn Độ Dày & An Toàn Gốc Mi'}
                {type === 'LENGTH' && 'Quy Tắc Chiều Dài & Tỷ Lệ Vàng'}
              </h3>
              <p className="text-[10px] text-[var(--mos-text-muted)] font-medium">
                Chỉ dẫn chuyên môn cho Chuyên Viên (<CvFeather1Badge />)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[var(--mos-surface-muted)] hover:opacity-80 active:scale-95 flex items-center justify-center text-[var(--mos-text)] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="p-4 overflow-y-auto space-y-3.5 text-[12px] leading-relaxed">
          {/* TAB 1: MATERIAL INFO */}
          {type === 'MATERIAL' && (
            <div className="space-y-3">
              <div className="bg-[var(--mos-surface-raised)] p-3 rounded-2xl border border-[var(--mos-surface-border)] space-y-1.5">
                <div className="text-[11px] font-black text-[var(--mos-accent)] flex items-center gap-1.5 uppercase">
                  <ShieldCheck className="w-4 h-4 text-[var(--mos-accent)]" />
                  Quy định vật lý {material.shortLabel}
                </div>
                <p className="text-[var(--mos-text-muted)] text-[11.5px]">{material.constraintReason}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-[var(--mos-surface-raised)] p-2.5 rounded-xl border border-[var(--mos-surface-border)]">
                  <span className="text-[var(--mos-text-muted)] block text-[10px]">Dáng mi cho phép:</span>
                  <strong className="text-[var(--mos-text)] font-bold">{material.allowedDesigns.join(', ')}</strong>
                </div>
                <div className="bg-[var(--mos-surface-raised)] p-2.5 rounded-xl border border-[var(--mos-surface-border)]">
                  <span className="text-[var(--mos-text-muted)] block text-[10px]">Độ cong cho phép:</span>
                  <strong className="text-[var(--mos-accent)] font-bold">{material.allowedCurls.join(', ')}</strong>
                </div>
                <div className="bg-[var(--mos-surface-raised)] p-2.5 rounded-xl border border-[var(--mos-surface-border)]">
                  <span className="text-[var(--mos-text-muted)] block text-[10px]">Độ dày chuẩn:</span>
                  <strong className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    {material.allowedThicknesses.join(', ')}
                  </strong>
                </div>
                <div className="bg-[var(--mos-surface-raised)] p-2.5 rounded-xl border border-[var(--mos-surface-border)]">
                  <span className="text-[var(--mos-text-muted)] block text-[10px]">Độ dài quy chuẩn:</span>
                  <strong className={`font-bold ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>
                    {material.allowedSingleLengths[0]} -{' '}
                    {material.allowedSingleLengths[material.allowedSingleLengths.length - 1]}
                  </strong>
                </div>
              </div>

              <div
                className={`border rounded-xl p-3 text-[11px] ${
                  isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className={`font-bold flex items-center gap-1.5 mb-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                  <Sparkles className="w-3.5 h-3.5" /> Mẹo tư vấn khách hàng:
                </div>
                {material.code === 'FLAWLESS_MINK' && (
                  <p>
                    Mink có sợi mi đen tuyền bóng tự nhiên, siêu nhẹ và êm ái. Phù hợp khách thích mắt sắc nét, quyến rũ
                    nhưng không nặng nề.
                  </p>
                )}
                {material.code === 'HYPERLIGHT' && (
                  <p>
                    Sợi siêu mịn tạo hiệu ứng bồng bềnh như mây, mật độ dày đặc mà mi thật vẫn thở dễ dàng. Giữ mi bền
                    nhất khi đi làm và sinh hoạt.
                  </p>
                )}
                {material.code === 'ULTRALIGHT' && (
                  <p>
                    Chất liệu lông vũ siêu nhẹ 0.05mm - 0.07mm, êm nhẹ như không nối. Giải pháp tuyệt hảo cho mi thật
                    yếu hoặc khách thích tự nhiên tối đa.
                  </p>
                )}
                {material.code === 'IVYLIGHT' && (
                  <p>
                    Kỹ thuật nâng mi đỉnh cao từ sợi mi chữ L (LJ, LB, LC), giúp mở góc mắt và nâng cung mi sụp, mắt một
                    mí cực kỳ rõ rệt.
                  </p>
                )}
                {(material.code === 'NEW_CLASSIC' || material.code === 'NEW_VOLUME') && (
                  <p>Dòng mi cổ điển tiêu chuẩn với các mức giá dễ tiếp cận, đáp ứng nhu cầu nối tự nhiên hằng ngày.</p>
                )}
                {material.code === 'UNDER_MINK' && (
                  <p>
                    Nối mi dưới cân bằng tỷ lệ mắt, giúp mắt to tròn long lanh hơn, đặc biệt khi khách trang điểm tiệc
                    hoặc chụp ảnh.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DESIGN INFO */}
          {type === 'DESIGN' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="bg-[var(--mos-surface-raised)] p-2.5 rounded-xl border border-[var(--mos-surface-border)] flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-500 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-[var(--mos-text)] font-bold text-[12px]">Natural (Tự Nhiên)</strong>
                    <p className="text-[var(--mos-text-muted)] text-[11px] mt-0.5">
                      Ôm đều theo cung mi thật. Hợp: Mắt tròn, mắt hạnh nhân, khách lần đầu nối mi.
                    </p>
                  </div>
                </div>

                <div className="bg-[var(--mos-surface-raised)] p-2.5 rounded-xl border border-[var(--mos-surface-border)] flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-500 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="text-[var(--mos-text)] font-bold text-[12px]">Doll (Búp Bê Tròn Mắt)</strong>
                    <p className="text-[var(--mos-text-muted)] text-[11px] mt-0.5">
                      Dài nhất ở chính giữa con ngươi. Hợp: Mắt một mí, mí lót, mắt dài muốn mở to tròn theo chiều dọc.
                    </p>
                  </div>
                </div>

                <div className="bg-[var(--mos-surface-raised)] p-2.5 rounded-xl border border-[var(--mos-surface-border)] flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-500 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <strong className="text-[var(--mos-text)] font-bold text-[12px]">Wing (Đuôi Dài Thanh Thoát)</strong>
                    <p className="text-[var(--mos-text-muted)] text-[11px] mt-0.5">
                      Dài dần về phía đuôi mắt. Hợp: Mắt tròn, hai mắt gần nhau, khách thích phong cách sắc sảo thanh
                      thoát.
                    </p>
                  </div>
                </div>

                <div className="bg-[var(--mos-surface-raised)] p-2.5 rounded-xl border border-[var(--mos-surface-border)] flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-500 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                    4
                  </span>
                  <div>
                    <strong className="text-[var(--mos-text)] font-bold text-[12px]">Kim - K (Sole Katun)</strong>
                    <p className="text-[var(--mos-text-muted)] text-[11px] mt-0.5">
                      Đan xen các trụ tia dài ngắn tạo điểm nhấn lung linh. Hợp: Mắt to, khách hay makeup tiệc, cá tính
                      nổi bật.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CURL INFO */}
          {type === 'CURL' && (
            <div className="space-y-3">
              <div className="bg-[var(--mos-surface-raised)] p-3 rounded-2xl border border-[var(--mos-surface-border)] space-y-2">
                <div className="text-[11px] font-bold text-[var(--mos-accent)] uppercase">
                  Góc độ cong và cơ chế bù trừ mi thật
                </div>
                <div className="space-y-2 text-[11.5px]">
                  <div className="flex items-center justify-between border-b border-[var(--mos-surface-border)] pb-1.5">
                    <div>
                      <strong className="text-[var(--mos-text)]">Độ Cong B (45°)</strong>
                      <span className="text-[var(--mos-text-muted)] block text-[10.5px]">Cong tự nhiên vừa</span>
                    </div>
                    <span className="text-[var(--mos-text-muted)] text-[11px]">Hợp mi thật mọc ngang hoặc hơi vểnh</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-[var(--mos-surface-border)] pb-1.5">
                    <div>
                      <strong className="text-[var(--mos-text)]">Độ Cong C (55°)</strong>
                      <span className="text-[var(--mos-text-muted)] block text-[10.5px]">Cong thanh thoát chuẩn mực</span>
                    </div>
                    <span className="text-[var(--mos-text-muted)] text-[11px]">Phổ biến nhất tại Wings, mở mắt nhẹ nhàng</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-[var(--mos-surface-border)] pb-1.5">
                    <div>
                      <strong className="text-[var(--mos-text)]">Độ Cong D (70°)</strong>
                      <span className="text-[var(--mos-text-muted)] block text-[10.5px]">Cong vút quyến rũ</span>
                    </div>
                    <span className="text-[var(--mos-text-muted)] text-[11px]">Bù trừ mi mọc cụp hoặc mắt mí lót sâu</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-[var(--mos-text)]">Dòng Nâng L (LJ, LB, LC)</strong>
                      <span className="text-[var(--mos-text-muted)] block text-[10.5px]">Chân phẳng thân cong</span>
                    </div>
                    <span className="text-[var(--mos-text-muted)] text-[11px]">Đặc trị mắt một mí, mí bụp, nâng góc mắt</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: THICKNESS INFO */}
          {type === 'THICKNESS' && (
            <div className="space-y-3">
              <div className="bg-[var(--mos-surface-raised)] p-3 rounded-2xl border border-[var(--mos-surface-border)] space-y-2">
                <div className={`text-[11px] font-bold uppercase ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  Quy tắc tải trọng an toàn gốc mi
                </div>
                <p className="text-[var(--mos-text-muted)] text-[11.5px]">
                  Nguyên tắc cốt lõi: Tuyệt đối không nối sợi mi vượt quá sức chịu tải của sợi mi thật đã khám ở Bước 0.
                </p>
                <div className="space-y-1.5 text-[11px] pt-1">
                  <div className="bg-[var(--mos-surface)] border border-[var(--mos-surface-border)] p-2 rounded-lg flex items-center justify-between">
                    <span className="text-[var(--mos-text)] font-bold">0.05 mm</span>
                    <span className="text-[var(--mos-text-muted)]">Siêu mảnh, dùng cho Fan 3D-5D và IvyLight</span>
                  </div>
                  <div className="bg-[var(--mos-surface)] border border-[var(--mos-surface-border)] p-2 rounded-lg flex items-center justify-between">
                    <span className="text-[var(--mos-text)] font-bold">0.07 mm</span>
                    <span className="text-[var(--mos-text-muted)]">Mảnh nhẹ tự nhiên, chuẩn mực cho Fan 2D-3D & Mink nhẹ</span>
                  </div>
                  <div className="bg-[var(--mos-surface)] border border-[var(--mos-surface-border)] p-2 rounded-lg flex items-center justify-between">
                    <span className="text-[var(--mos-text)] font-bold">0.10 mm</span>
                    <span className="text-[var(--mos-text-muted)]">Tự nhiên rõ nét, chỉ dùng nối Classic 1D trên mi thật khỏe</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LENGTH INFO */}
          {type === 'LENGTH' && (
            <div className="space-y-3">
              <div className="bg-[var(--mos-surface-raised)] p-3 rounded-2xl border border-[var(--mos-surface-border)] space-y-2">
                <div className={`text-[11px] font-bold uppercase ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
                  Quy tắc tỷ lệ vàng chiều dài mi
                </div>
                <div
                  className={`border rounded-xl p-2.5 text-[11px] flex items-start gap-2 ${
                    isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                  <span>
                    Chiều dài sợi chính chỉ nên dài hơn mi thật tối đa <strong>+2 mm</strong> để giữ độ bền lâu nhất.
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px] pt-1">
                  <div className="bg-[var(--mos-surface)] border border-[var(--mos-surface-border)] p-2 rounded-lg flex items-center justify-between">
                    <span className="text-[var(--mos-text)] font-bold">9 - 11 mm</span>
                    <span className="text-[var(--mos-text-muted)]">Tự nhiên vừa vặn, thích hợp đi làm văn phòng</span>
                  </div>
                  <div className="bg-[var(--mos-surface)] border border-[var(--mos-surface-border)] p-2 rounded-lg flex items-center justify-between">
                    <span className="text-[var(--mos-accent)] font-black">10 - 12 mm</span>
                    <span className="text-[var(--mos-text)]">Chuẩn Vàng Wings · Tỷ lệ tôn dáng mắt đẹp nhất</span>
                  </div>
                  <div className="bg-[var(--mos-surface)] border border-[var(--mos-surface-border)] p-2 rounded-lg flex items-center justify-between">
                    <span className="text-[var(--mos-text)] font-bold">11 - 13 mm</span>
                    <span className="text-[var(--mos-text-muted)]">Dài thanh thoát, tạo hiệu ứng mi cong bay bổng</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Button */}
        <div className="p-3 bg-[var(--mos-surface-raised)] border-t border-[var(--mos-surface-border)] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[var(--mos-accent)] text-[var(--mos-accent-contrast)] font-extrabold text-[13px] active:scale-98 transition-all cursor-pointer shadow-md"
          >
            Đã hiểu · Quay lại chọn
          </button>
        </div>
      </div>
    </div>
  );
};
