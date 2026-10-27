'use client';

import React, { useState } from 'react';
import { Card } from 'antd';
import {
  GraduationCap,
  Sparkles,
  Layers,
  FileText,
  ShieldCheck,
  Award,
  Clock,
  Info,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import type { PilotSession } from '@mos-lab/shared';
import { AppIcon } from '../../../../components/ui/AppIcon';
import { PilotCriteriaSopDetail } from './PilotCriteriaSopDetail';

interface TrainingModuleItem {
  id: string;
  order: number;
  title: string;
  badge: string;
  badgeColor: string;
  icon: LucideIcon;
  description: string;
  keyPoints: string[];
}

const BADGE_CLASSES: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
};

const TRAINING_MODULES: TrainingModuleItem[] = [
  {
    id: 'criteria',
    order: 1,
    title: 'Tiêu chuẩn đánh giá & Phân loại dáng mi',
    badge: 'Khung tiêu chuẩn · Chi tiết SOP v1.0',
    badgeColor: 'blue',
    icon: Sparkles,
    description:
      'Bộ tiêu chí thẩm định cấu trúc nang lông mi tự nhiên, độ dày sợi và phân loại dáng mắt phù hợp trước khi quyết định nhận ca uốn mi bóng tối.',
    keyPoints: [
      'Phân tích nang lông mi và độ khỏe nang lông',
      'Đo chiều dài tối thiểu & độ cong tự nhiên',
      'Checklist loại trừ rủi ro ban đầu (mắt nhạy cảm, viêm bờ mi)',
    ],
  },
  {
    id: 'technical-sop',
    order: 2,
    title: 'Quy trình kỹ thuật 7 bước uốn mi bóng tối',
    badge: 'Quy trình lõi',
    badgeColor: 'emerald',
    icon: Layers,
    description:
      'SOP thao tác kỹ thuật chuẩn mực từ khâu chọn trục silicon chuyên dụng, căn chỉnh sợi mi, kiểm soát thời gian ủ dưỡng định hình đến phủ bóng chuyên sâu.',
    keyPoints: [
      'Kỹ thuật đặt trục silicon & tách sợi mi chuẩn xác',
      'Kiểm soát thời gian ủ thuốc uốn theo từng chất mi',
      'Kỹ thuật phủ bóng chuyên sâu & định hình sóng mi',
    ],
  },
  {
    id: 'materials',
    order: 3,
    title: 'Định mức & Kiểm soát vật tư tiêu hao',
    badge: 'Định mức vận hành',
    badgeColor: 'purple',
    icon: FileText,
    description:
      'Quy chuẩn định lượng thuốc uốn, keo định hình, dung dịch dưỡng bóng và bộ dụng cụ vô trùng phục vụ cho từng ca thực hiện.',
    keyPoints: [
      'Định mức thuốc uốn & dung dịch phủ bóng',
      'Quy chuẩn sử dụng keo định hình & trục silicon',
      'Quy trình khử khuẩn và vệ sinh dụng cụ chuẩn y tế',
    ],
  },
  {
    id: 'safety',
    order: 4,
    title: 'Quản trị an toàn, rủi ro & Kỹ thuật xử lý sự cố',
    badge: 'An toàn & Rủi ro',
    badgeColor: 'rose',
    icon: ShieldCheck,
    description:
      'Quy định an toàn giác mạc, nhận diện sớm các phản ứng nhạy cảm của khách và phương án xử lý tức thì khi có dấu hiệu cay mắt hoặc kích ứng.',
    keyPoints: [
      'Quy tắc bảo vệ niêm mạc mắt và đệm bảo vệ',
      'Nhận diện & xử lý phản ứng nhạy cảm tức thời',
      'Biên bản ghi nhận sự cố kỹ thuật & chăm sóc bổ sung',
    ],
  },
  {
    id: 'assessment',
    order: 5,
    title: 'Đánh giá tay nghề, thẩm định CSAT & Chứng chỉ vận hành',
    badge: 'Sát hạch & Chứng chỉ',
    badgeColor: 'amber',
    icon: Award,
    description:
      'Tiêu chí kiểm định tay nghề thực hành của Chuyên Viên Kỹ Thuật, chuẩn mực CSAT khách hàng sau 72h và điều kiện cấp chứng chỉ vận hành ca dịch vụ.',
    keyPoints: [
      'Bài kiểm tra sát hạch tay nghề thực tế trên mẫu',
      'Chỉ số hài lòng khách hàng CSAT mục tiêu >= 4.8 sao',
      'Chứng chỉ chuyên môn vận hành dịch vụ Uốn Mi Bóng Tối',
    ],
  },
];

interface SopTrainingPlaceholderProps {
  onOpenSopModal?: () => void;
  onOpenCriteriaModal?: () => void;
  sessions?: PilotSession[];
  onOpenSessionFlow?: (session: PilotSession) => void;
  initialModuleId?: string | null;
}

export function SopTrainingPlaceholder({
  onOpenSopModal,
  onOpenCriteriaModal,
  sessions,
  onOpenSessionFlow,
  initialModuleId = null,
}: SopTrainingPlaceholderProps) {
  const [activeModuleId, setActiveModuleId] = useState<string | null>(initialModuleId);

  // If Hạng mục 1 is active, render detailed SOP specification
  if (activeModuleId === 'criteria') {
    return (
      <PilotCriteriaSopDetail
        onBack={() => setActiveModuleId(null)}
        onOpenCriteriaModal={onOpenCriteriaModal}
        onOpenSopModal={onOpenSopModal}
        sessions={sessions}
        onOpenSessionFlow={onOpenSessionFlow}
      />
    );
  }

  return (
    <div className="space-y-4 antialiased" data-testid="sop-training-placeholder">
      {/* Banner Giới thiệu Placeholder */}
      <div className="rounded-2xl p-4 sm:p-5 border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent relative overflow-hidden transition-all duration-300 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <AppIcon icon={GraduationCap} size={14} className="mr-1.5" />
                SOP &amp; Đào tạo KTV
              </span>
              <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <AppIcon icon={Clock} size={12} className="mr-1" />
                Khung 5 hạng mục · Hạng mục 1 đã hoàn thiện
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight m-0">
              Khung Đào Tạo &amp; Chuẩn Hóa Tay Nghề Chuyên Viên Kỹ Thuật
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed m-0">
              Khu vực SOP &amp; Đào tạo KTV đang được phát triển. Đây là hệ thống chuẩn hóa toàn diện từ lý thuyết cấu
              trúc mi, quy trình kỹ thuật 7 bước, quản trị định mức vật tư đến quy chế sát hạch cấp chứng chỉ cho Chuyên
              Viên Kỹ Thuật thực hiện dịch vụ Uốn Mi Bóng Tối tại Wings.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {onOpenSopModal && (
              <button
                type="button"
                onClick={onOpenSopModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-colors"
              >
                <AppIcon icon={BookOpen} size={14} />
                <span>Xem trước SOP 7 bước</span>
              </button>
            )}
            {onOpenCriteriaModal && (
              <button
                type="button"
                onClick={onOpenCriteriaModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-violet-500/30 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
              >
                <AppIcon icon={Sparkles} size={14} />
                <span>Xem tiêu chí mi</span>
              </button>
            )}
          </div>
        </div>

        {/* Thông báo trạng thái */}
        <div className="mt-3.5 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <AppIcon icon={Info} size={14} className="text-emerald-500 shrink-0" />
          <span>
            <strong className="text-emerald-700 dark:text-emerald-300">Hạng mục 1 đã có nội dung chi tiết:</strong> Nhấp vào Hạng mục 1 bên dưới để xem hướng dẫn quan sát 5 tiêu chí, minh chứng thực tế 17 ca Pilot và quy trình xử lý điều kiện mi.
          </span>
        </div>
      </div>

      {/* Grid 5 Hạng mục con (5 Training Modules) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {TRAINING_MODULES.map((mod) => {
          const IconComp = mod.icon;
          const badgeClass = BADGE_CLASSES[mod.badgeColor] || BADGE_CLASSES.blue;
          const isCriteriaModule = mod.id === 'criteria';

          return (
            <Card
              key={mod.id}
              variant="outlined"
              className={`rounded-2xl transition-all duration-300 flex flex-col justify-between ${
                isCriteriaModule
                  ? 'border-emerald-500/40 bg-gradient-to-b from-emerald-500/[0.04] to-transparent ring-1 ring-emerald-500/20 hover:shadow-md cursor-pointer'
                  : 'border-slate-200 dark:border-slate-800 hover:shadow-md'
              }`}
              onClick={isCriteriaModule ? () => setActiveModuleId('criteria') : undefined}
              data-testid={`training-module-card-${mod.id}`}
            >
              <div className="space-y-3 flex-1">
                {/* Header Card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isCriteriaModule
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      <AppIcon icon={IconComp} size={16} />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Hạng mục {mod.order}
                      </span>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug m-0">
                        {mod.title}
                      </h3>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center justify-center leading-none text-[10.5px] rounded-full font-medium px-2 py-0.5 shrink-0 ${badgeClass}`}
                  >
                    {mod.badge}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed m-0">{mod.description}</p>

                {/* Key Points */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block">
                    Nội dung trọng tâm:
                  </span>
                  <ul className="m-0 p-0 list-none space-y-1">
                    {mod.keyPoints.map((pt, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <AppIcon icon={CheckCircle2} size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span className="leading-tight">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-4 pt-2.5 border-t border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
                {isCriteriaModule ? (
                  <>
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <Sparkles size={12} />
                      <span>Đã hoàn thiện nội dung</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveModuleId('criteria');
                      }}
                      className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold inline-flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
                      data-testid="view-criteria-sop-btn"
                    >
                      <span>Xem chi tiết SOP</span>
                      <AppIcon icon={ArrowRight} size={12} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Clock size={12} />
                      <span>Dự kiến tích hợp Giai đoạn 2</span>
                    </span>
                    <span className="text-slate-400 font-medium inline-flex items-center gap-0.5">
                      Chi tiết <AppIcon icon={ArrowRight} size={11} />
                    </span>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
export default SopTrainingPlaceholder;
