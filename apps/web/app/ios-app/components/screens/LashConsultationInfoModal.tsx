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
import { LashMaterialSpec } from './LashMaterialConstraintMatrix';

export type InfoModalType = 'MATERIAL' | 'DESIGN' | 'CURL' | 'THICKNESS' | 'LENGTH' | null;

interface LashConsultationInfoModalProps {
  type: InfoModalType;
  material: LashMaterialSpec;
  onClose: () => void;
}

export const LashConsultationInfoModal: React.FC<LashConsultationInfoModalProps> = ({ type, material, onClose }) => {
  if (!type) return null;

  return (
    <div
      className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex flex-col justify-end select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] mx-auto max-h-[88dvh] bg-[#1C1C1E] text-white rounded-t-[28px] overflow-hidden flex flex-col shadow-2xl border-t border-white/15 animate-in slide-in-from-bottom duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Thanh Vuốt Kéo iOS Handle Bar */}
        <div className="pt-2.5 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-neutral-600/70" />
        </div>

        {/* Modal Header */}
        <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#FFB400] text-black flex items-center justify-center shrink-0">
              <Info className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
            <div>
              <h3 className="text-[13px] font-black tracking-tight text-white uppercase">
                {type === 'MATERIAL' && `Quy Chuẩn Dòng Mi · ${material.shortLabel}`}
                {type === 'DESIGN' && 'Hướng Dẫn 4 Thiết Kế & Dáng Mắt'}
                {type === 'CURL' && 'Bản Đồ Độ Cong · Góc Bù Trừ Mi Thật'}
                {type === 'THICKNESS' && 'Quy Chuẩn Độ Dày & An Toàn Gốc Mi'}
                {type === 'LENGTH' && 'Quy Tắc Chiều Dài & Tỷ Lệ Vàng'}
              </h3>
              <p className="text-[10px] text-neutral-400 font-medium">Chỉ dẫn chuyên môn cho Chuyên Viên (CV🪶)</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-neutral-300 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="p-4 overflow-y-auto space-y-3.5 text-[12px] leading-relaxed">
          {/* TAB 1: MATERIAL INFO */}
          {type === 'MATERIAL' && (
            <div className="space-y-3">
              <div className="bg-[#2C2C2E] p-3 rounded-2xl border border-white/10 space-y-1.5">
                <div className="text-[11px] font-black text-[#FFB400] flex items-center gap-1.5 uppercase">
                  <ShieldCheck className="w-4 h-4 text-[#FFB400]" />
                  Quy định vật lý {material.shortLabel}
                </div>
                <p className="text-neutral-300 text-[11.5px]">{material.constraintReason}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-[#2C2C2E]/70 p-2.5 rounded-xl border border-white/5">
                  <span className="text-neutral-400 block text-[10px]">Dáng mi cho phép:</span>
                  <strong className="text-white font-bold">{material.allowedDesigns.join(', ')}</strong>
                </div>
                <div className="bg-[#2C2C2E]/70 p-2.5 rounded-xl border border-white/5">
                  <span className="text-neutral-400 block text-[10px]">Độ cong cho phép:</span>
                  <strong className="text-[#FFB400] font-bold">{material.allowedCurls.join(', ')}</strong>
                </div>
                <div className="bg-[#2C2C2E]/70 p-2.5 rounded-xl border border-white/5">
                  <span className="text-neutral-400 block text-[10px]">Độ dày chuẩn:</span>
                  <strong className="text-emerald-400 font-bold">{material.allowedThicknesses.join(', ')}</strong>
                </div>
                <div className="bg-[#2C2C2E]/70 p-2.5 rounded-xl border border-white/5">
                  <span className="text-neutral-400 block text-[10px]">Độ dài quy chuẩn:</span>
                  <strong className="text-sky-300 font-bold">
                    {material.allowedSingleLengths[0]} -{' '}
                    {material.allowedSingleLengths[material.allowedSingleLengths.length - 1]}
                  </strong>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-[11px] text-amber-200">
                <div className="font-bold flex items-center gap-1.5 text-amber-400 mb-1">
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
                <div className="bg-[#2C2C2E] p-2.5 rounded-xl border border-white/10 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-white font-bold text-[12px]">Natural (Tự Nhiên)</strong>
                    <p className="text-neutral-400 text-[11px] mt-0.5">
                      Ôm đều theo cung mi thật. Hợp: Mắt tròn, mắt hạnh nhân, khách lần đầu nối mi.
                    </p>
                  </div>
                </div>

                <div className="bg-[#2C2C2E] p-2.5 rounded-xl border border-white/10 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="text-white font-bold text-[12px]">Doll (Búp Bê Tròn Mắt)</strong>
                    <p className="text-neutral-400 text-[11px] mt-0.5">
                      Dài nhất ở chính giữa con ngươi. Hợp: Mắt một mí, mí lót, mắt dài muốn mở to tròn theo chiều dọc.
                    </p>
                  </div>
                </div>

                <div className="bg-[#2C2C2E] p-2.5 rounded-xl border border-white/10 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <strong className="text-white font-bold text-[12px]">Wing (Mắt Mèo Sexy)</strong>
                    <p className="text-neutral-400 text-[11px] mt-0.5">
                      Dài dần về phía đuôi mắt. Hợp: Mắt tròn, hai mắt gần nhau, khách thích phong cách sắc sảo quyến
                      rũ.
                    </p>
                  </div>
                </div>

                <div className="bg-[#2C2C2E] p-2.5 rounded-xl border border-white/10 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                    4
                  </span>
                  <div>
                    <strong className="text-white font-bold text-[12px]">Kim - K (Sole Katun)</strong>
                    <p className="text-neutral-400 text-[11px] mt-0.5">
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
              <div className="bg-[#2C2C2E] p-3 rounded-2xl border border-white/10 space-y-2">
                <div className="text-[11px] font-bold text-[#FFB400] uppercase">
                  Góc độ cong và cơ chế bù trừ mi thật
                </div>
                <div className="space-y-2 text-[11.5px]">
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <div>
                      <strong className="text-white">Độ Cong B (45°)</strong>
                      <span className="text-neutral-400 block text-[10.5px]">Cong tự nhiên vừa</span>
                    </div>
                    <span className="text-neutral-300 text-[11px]">Hợp mi thật mọc ngang hoặc hơi vểnh</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <div>
                      <strong className="text-white">Độ Cong C (55°)</strong>
                      <span className="text-neutral-400 block text-[10.5px]">Cong thanh thoát chuẩn mực</span>
                    </div>
                    <span className="text-neutral-300 text-[11px]">Phổ biến nhất tại Wings, mở mắt nhẹ nhàng</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <div>
                      <strong className="text-white">Độ Cong D (70°)</strong>
                      <span className="text-neutral-400 block text-[10.5px]">Cong vút quyến rũ</span>
                    </div>
                    <span className="text-neutral-300 text-[11px]">Bù trừ mi mọc cụp hoặc mắt mí lót sâu</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-white">Dòng Nâng L (LJ, LB, LC)</strong>
                      <span className="text-neutral-400 block text-[10.5px]">Chân phẳng thân cong</span>
                    </div>
                    <span className="text-neutral-300 text-[11px]">Đặc trị mắt một mí, mí bụp, nâng góc mắt</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: THICKNESS INFO */}
          {type === 'THICKNESS' && (
            <div className="space-y-3">
              <div className="bg-[#2C2C2E] p-3 rounded-2xl border border-white/10 space-y-2">
                <div className="text-[11px] font-bold text-emerald-400 uppercase">Quy tắc tải trọng an toàn gốc mi</div>
                <p className="text-neutral-300 text-[11.5px]">
                  Nguyên tắc cốt lõi: Tuyệt đối không nối sợi mi vượt quá sức chịu tải của sợi mi thật đã khám ở Bước 0.
                </p>
                <div className="space-y-1.5 text-[11px] pt-1">
                  <div className="bg-black/40 p-2 rounded-lg flex items-center justify-between">
                    <span className="text-white font-bold">0.05 mm</span>
                    <span className="text-neutral-400">Siêu mảnh, dùng cho Fan 3D-5D và IvyLight</span>
                  </div>
                  <div className="bg-black/40 p-2 rounded-lg flex items-center justify-between">
                    <span className="text-white font-bold">0.07 mm</span>
                    <span className="text-neutral-400">Mảnh nhẹ tự nhiên, chuẩn mực cho Fan 2D-3D & Mink nhẹ</span>
                  </div>
                  <div className="bg-black/40 p-2 rounded-lg flex items-center justify-between">
                    <span className="text-white font-bold">0.10 mm</span>
                    <span className="text-neutral-400">Tự nhiên rõ nét, chỉ dùng nối Classic 1D trên mi thật khỏe</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LENGTH INFO */}
          {type === 'LENGTH' && (
            <div className="space-y-3">
              <div className="bg-[#2C2C2E] p-3 rounded-2xl border border-white/10 space-y-2">
                <div className="text-[11px] font-bold text-sky-400 uppercase">Quy tắc tỷ lệ vàng chiều dài mi</div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-[11px] text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Chiều dài sợi chính chỉ nên dài hơn mi thật tối đa <strong>+2 mm</strong> để giữ độ bền lâu nhất.
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px] pt-1">
                  <div className="bg-black/40 p-2 rounded-lg flex items-center justify-between">
                    <span className="text-white font-bold">9 - 11 mm</span>
                    <span className="text-neutral-400">Tự nhiên vừa vặn, thích hợp đi làm văn phòng</span>
                  </div>
                  <div className="bg-black/40 p-2 rounded-lg flex items-center justify-between">
                    <span className="text-[#FFB400] font-black">10 - 12 mm</span>
                    <span className="text-neutral-300">Chuẩn Vàng Wings · Tỷ lệ tôn dáng mắt đẹp nhất</span>
                  </div>
                  <div className="bg-black/40 p-2 rounded-lg flex items-center justify-between">
                    <span className="text-white font-bold">11 - 13 mm</span>
                    <span className="text-neutral-400">Dài thanh thoát, tạo hiệu ứng mi cong bay bổng</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Button */}
        <div className="p-3 bg-[#161618] border-t border-white/10 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#FFB400] text-black font-extrabold text-[13px] active:scale-98 transition-all cursor-pointer shadow-md"
          >
            Đã hiểu · Quay lại chọn
          </button>
        </div>
      </div>
    </div>
  );
};
