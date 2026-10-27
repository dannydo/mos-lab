'use client';

import React, { useState } from 'react';
import { Card } from 'antd';
import {
  GraduationCap,
  Sparkles,
  ListOrdered,
  Package,
  HeartHandshake,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Info,
  ArrowRight,
  FileText,
  Award,
  type LucideIcon,
} from 'lucide-react';
import type { PilotSession } from '@mos-lab/shared';
import { AppIcon } from '../../../../components/ui/AppIcon';
import { PilotCriteriaSopDetail } from './PilotCriteriaSopDetail';
import { PilotAssessmentCertSopDetail } from './PilotAssessmentCertSopDetail';

interface TrainingModuleItem {
  id: string;
  order: number;
  title: string;
  badge: string;
  badgeColor: 'blue' | 'purple' | 'amber' | 'emerald' | 'cyan';
  icon: LucideIcon;
  description: string;
  keyPoints: string[];
}

const BADGE_CLASSES: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20',
  purple: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20',
  amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20',
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
      'Quy chuẩn đánh giá 5 tiêu chí mi đầu vào, phân loại dáng mi khách hàng và đưa ra phác đồ uốn mi cá nhân hóa.',
    keyPoints: [
      '5 tiêu chí đánh giá lâm sàng: Chiều dài, độ dày, độ cong tự nhiên, hướng mi mọc, tình trạng da mi mắt',
      'Ma trận khuyến nghị thông số kỹ thuật (trục uốn, thời gian mềm hóa) theo từng phân loại mi',
      'Quy chuẩn từ chối/hoãn dịch vụ đối với mi tổn thương hoặc da mắt viêm nhiễm',
    ],
  },
  {
    id: 'technical-sop',
    order: 2,
    title: 'SOP kỹ thuật 7 bước uốn mi bóng tối',
    badge: 'Bản dự thảo chi tiết · Đang trình duyệt',
    badgeColor: 'emerald',
    icon: ListOrdered,
    description:
      'Quy trình kỹ thuật 7 bước uốn mi bóng tối chuẩn hóa từ 18 ca thực tế tại Đề Thám. Hướng dẫn chi tiết từng bước, thời gian chuẩn và thực tế, vật tư, QC và xử lý lỗi kỹ thuật.',
    keyPoints: [
      '7 bước tuần tự: Làm sạch, mềm mi, form độ cong, cân bằng pH, màu, Keratin, hoàn thiện',
      'Minh chứng 18 ca Pilot đối chiếu thời gian đo đạc thực tế với thời gian kỹ thuật tiêu chuẩn',
      'Định mức vật tư tiêu hao, kiểm soát chất lượng (QC) và danh mục lỗi kỹ thuật & xử lý',
    ],
  },
  {
    id: 'materials',
    order: 3,
    title: 'Định mức & Bảo quản vật tư tiêu hao',
    badge: 'Định mức tiêu hao',
    badgeColor: 'amber',
    icon: Package,
    description:
      'Danh mục vật tư tiêu hao, định mức sử dụng theo từng ca, chi phí trên mỗi lượt phục vụ và quy trình bảo quản sản phẩm.',
    keyPoints: [
      'Định mức sử dụng: Thuốc uốn, trục silicon, gel dưỡng, pad dán mắt, cọ chuốt',
      'Tính toán chi phí vật tư trực tiếp / ca để kiểm soát Contribution Margin',
      'Quy chuẩn bảo quản thuốc uốn và vật tư hóa chất trong điều kiện tiêu chuẩn',
    ],
  },
  {
    id: 'communication',
    order: 4,
    title: 'Giao tiếp & Tư vấn chăm sóc sau uốn (Aftercare)',
    badge: 'Kịch bản giao tiếp',
    badgeColor: 'purple',
    icon: HeartHandshake,
    description:
      'Kịch bản tư vấn khách hàng trước - trong - sau dịch vụ, hướng dưỡng mi tại nhà và quy trình follow-up 24h & 72h.',
    keyPoints: [
      'Bộ câu hỏi khai thác nhu cầu & giải tỏa lo lắng của khách hàng lần đầu uốn mi',
      'Cẩm nang hướng dẫn khách hàng dưỡng mi tại nhà trong 48 giờ đầu tiên',
      'Kịch bản cuộc gọi follow-up 24h và 72h nhằm tối ưu CSAT và xử lý khiếu nại sớm',
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
      'Bài kiểm tra sát hạch tay nghề thực tế trên mẫu thật (CEO Danny trực tiếp chấm)',
      'Chỉ số hài lòng khách hàng CSAT mục tiêu >= 4.8 sao từ dữ liệu Pilot',
      'Chứng chỉ chuyên môn vận hành dịch vụ Uốn Mi Bóng Tối',
    ],
  },
];

interface SopTrainingPlaceholderProps {
  onOpenSopModal?: () => void;
  onOpenCriteriaModal?: () => void;
  onOpenMaterialsSop?: () => void;
  onViewSopDetail?: () => void;
  sessions?: PilotSession[];
  onOpenSessionFlow?: (session: PilotSession) => void;
  initialModuleId?: string | null;
}

export function SopTrainingPlaceholder({
  onOpenSopModal,
  onOpenCriteriaModal,
  onOpenMaterialsSop,
  onViewSopDetail,
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

  // If Hạng mục 5 is active, render detailed Assessment, CSAT & Certificate SOP
  if (activeModuleId === 'assessment') {
    return (
      <PilotAssessmentCertSopDetail
        onBack={() => setActiveModuleId(null)}
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
                Khung 5 hạng mục · Hạng mục 1, 2 &amp; 5 đã sẵn sàng
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
            {onViewSopDetail && (
              <button
                type="button"
                onClick={onViewSopDetail}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors cursor-pointer border-0"
              >
                <AppIcon icon={ListOrdered} size={14} />
                <span>Chi tiết Hạng mục 2</span>
              </button>
            )}
            {onOpenSopModal && (
              <button
                type="button"
                onClick={onOpenSopModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-colors"
              >
                <AppIcon icon={ListOrdered} size={14} />
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
            {onOpenMaterialsSop && (
              <button
                type="button"
                onClick={onOpenMaterialsSop}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-purple-500/30 text-purple-700 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-950/40 transition-colors shadow-sm"
              >
                <AppIcon icon={FileText} size={14} />
                <span>Hạng mục 3: Định mức vật tư</span>
              </button>
            )}
          </div>
        </div>

        {/* Thông báo trạng thái */}
        <div className="mt-3.5 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <AppIcon icon={Info} size={14} className="text-emerald-500 shrink-0" />
          <span>
            <strong className="text-emerald-700 dark:text-emerald-300">
              Hạng mục 1, 2 &amp; 5 đã có nội dung chi tiết:
            </strong>{' '}
            Nhấp vào Hạng mục 1 (Tiêu chí dáng mi), Hạng mục 2 (SOP kỹ thuật 7 bước) hoặc Hạng mục 5 (Sát hạch tay nghề,
            CSAT &amp; Chứng chỉ) để xem chi tiết.
          </span>
        </div>
      </div>

      {/* Grid 5 Hạng mục con (5 Training Modules) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {TRAINING_MODULES.map((mod) => {
          const IconComp = mod.icon;
          const badgeClass = BADGE_CLASSES[mod.badgeColor] || BADGE_CLASSES.blue;
          const isCriteriaModule = mod.id === 'criteria';
          const isTechnicalModule = mod.id === 'technical-sop';
          const isAssessmentModule = mod.id === 'assessment';
          const isInteractiveModule = isCriteriaModule || isAssessmentModule;
          const isClickable = isInteractiveModule || (isTechnicalModule && Boolean(onViewSopDetail));

          return (
            <Card
              key={mod.id}
              variant="outlined"
              className={`rounded-2xl transition-all duration-300 flex flex-col justify-between ${
                isClickable
                  ? isAssessmentModule
                    ? 'border-amber-500/40 bg-gradient-to-b from-amber-500/[0.04] to-transparent ring-1 ring-amber-500/20 hover:shadow-md cursor-pointer'
                    : 'border-emerald-500/40 bg-gradient-to-b from-emerald-500/[0.04] to-transparent ring-1 ring-emerald-500/20 hover:shadow-md cursor-pointer'
                  : 'border-slate-200 dark:border-slate-800 hover:shadow-md'
              }`}
              onClick={
                isCriteriaModule
                  ? () => setActiveModuleId('criteria')
                  : isAssessmentModule
                    ? () => setActiveModuleId('assessment')
                    : isTechnicalModule && onViewSopDetail
                      ? onViewSopDetail
                      : undefined
              }
              data-testid={`training-module-card-${mod.id}`}
            >
              <div className="space-y-3 flex-1">
                {/* Header Card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isClickable
                          ? isAssessmentModule
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-emerald-500 text-white shadow-xs'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      <AppIcon icon={IconComp} size={16} />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Hạng mục {mod.order}
                      </span>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 m-0 tracking-tight leading-snug">
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
                {isInteractiveModule ? (
                  <>
                    <span
                      className={`inline-flex items-center gap-1 font-bold ${
                        isAssessmentModule
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      <Sparkles size={12} />
                      <span>Đã hoàn thiện nội dung</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveModuleId(mod.id);
                      }}
                      className={`font-bold inline-flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0 ${
                        isAssessmentModule
                          ? 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300'
                          : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300'
                      }`}
                      data-testid={isAssessmentModule ? 'view-assessment-sop-btn' : 'view-criteria-sop-btn'}
                    >
                      <span>Xem chi tiết SOP</span>
                      <AppIcon icon={ArrowRight} size={12} />
                    </button>
                  </>
                ) : isTechnicalModule ? (
                  <>
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <Clock size={12} />
                      <span>Bản dự thảo 7 bước</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewSopDetail?.();
                      }}
                      className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold inline-flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
                      data-testid="view-technical-sop-btn"
                    >
                      <span>Xem chi tiết SOP 7 bước</span>
                      <AppIcon icon={ArrowRight} size={12} />
                    </button>
                  </>
                ) : mod.id === 'materials' && onOpenMaterialsSop ? (
                  <>
                    <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                      <Sparkles size={12} />
                      <span>Đã có giao diện chi tiết 3 phần</span>
                    </span>
                    <button
                      type="button"
                      onClick={onOpenMaterialsSop}
                      className="text-purple-600 dark:text-purple-400 font-bold hover:underline inline-flex items-center gap-1 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-lg border border-purple-500/20"
                      data-testid="open-materials-sop-btn"
                    >
                      <span>Mở chi tiết &amp; Nhập liệu SOP</span>
                      <AppIcon icon={ArrowRight} size={11} />
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
