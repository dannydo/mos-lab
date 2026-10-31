'use client';

import React from 'react';
import { Card } from 'antd';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Award,
  TrendingDown,
  Sparkles,
  User,
  GraduationCap,
  ShieldCheck,
  Check,
  Zap,
} from 'lucide-react';
import { AppIcon } from '../../../../components/ui/AppIcon';

export interface PracticeSessionRecord {
  id: string;
  date: string;
  sessionTime: string;
  lessonName: string;
  timeRange: string;
  durationMinutes: number;
  errorsCount: number;
  notes: string;
  status: 'COMPLETED' | 'EXCELLENT' | 'EXAM_DAY';
}

export const GIANG_HO_PRACTICE_SESSIONS: PracticeSessionRecord[] = [
  {
    id: 'p-1',
    date: '26/10/2026',
    sessionTime: 'Chiều',
    lessonName: 'Uốn và thực hành kỹ thuật cơ bản',
    timeRange: '13:00 – 14:15',
    durationMinutes: 75,
    errorsCount: 3,
    notes: 'Chưa canh độ cong, chưa biết dán trục 2 độ, ngọn còn cong quéo, trục còn hở bọt khí.',
    status: 'COMPLETED',
  },
  {
    id: 'p-2',
    date: '28/10/2026',
    sessionTime: 'Sáng',
    lessonName: 'Thực hành xử lý tách lớp uốn không dính',
    timeRange: '09:15 – 10:28',
    durationMinutes: 73,
    errorsCount: 2,
    notes: 'Lớp trên còn nhiều sợi bị đè dưới trục nên mi bị quéo; mi mắt trái có 1 sợi bên ngoài ko ôm hết trục.',
    status: 'COMPLETED',
  },
  {
    id: 'p-3',
    date: '29/10/2026',
    sessionTime: 'Chiều',
    lessonName: 'Thực hành xử lý mi con nhiều & căn chỉnh',
    timeRange: '13:18 – 14:26',
    durationMinutes: 68,
    errorsCount: 1,
    notes: 'Chải mi còn bị dính keo nên còn mất thời gian, ngọn mi xử lý chưa sạch thuốc.',
    status: 'COMPLETED',
  },
  {
    id: 'p-4',
    date: '30/10/2026',
    sessionTime: 'Chiều',
    lessonName: 'Cách chọn trục uốn chuẩn dáng mi mắt',
    timeRange: '16:15 – 17:19',
    durationMinutes: 64,
    errorsCount: 0,
    notes: 'Cách chọn trục: các thao tác đã ổn định, ngọn mi sạch thuốc, ôm đỉnh trục rất đều.',
    status: 'EXCELLENT',
  },
  {
    id: 'p-5',
    date: '31/10/2026',
    sessionTime: 'Sáng (09:30)',
    lessonName: 'THI TỐT NGHIỆP TAY NGHỀ (70P THỰC HÀNH + 30P LÝ THUYẾT)',
    timeRange: '09:30 – 11:10',
    durationMinutes: 70,
    errorsCount: 0,
    notes: 'CEO Danny Đỗ trực tiếp coi và chấm thi độc lập; Cô Giang Đàm theo dõi quy chuẩn đào tạo.',
    status: 'EXAM_DAY',
  },
];

interface GiangHoLearningJourneyCardProps {
  onOpenExamRubric?: () => void;
  onOpenTheoryQuiz?: () => void;
}

export function GiangHoLearningJourneyCard({
  onOpenExamRubric,
  onOpenTheoryQuiz,
}: GiangHoLearningJourneyCardProps) {
  return (
    <Card
      variant="outlined"
      className="rounded-2xl border-amber-500/30 bg-gradient-to-br from-amber-500/[0.04] via-transparent to-emerald-500/[0.03] shadow-sm overflow-hidden"
      data-testid="giang-ho-learning-journey-card"
    >
      <div className="space-y-4">
        {/* Header Thông Tin Thí Sinh */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md font-black text-lg shrink-0">
              GH
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 m-0">
                  Chuyên Viên Giang Hồ
                </h3>
                <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 m-0">
                  Học Viên Uốn Mi Wings Academy
                </span>
                <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 m-0">
                  Chi Nhánh Đề Thám (Q.1)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                Giảng viên đào tạo:{' '}
                <strong className="text-slate-700 dark:text-slate-300">Cô Giang Đàm (Master Trainer)</strong> · Giám
                khảo chấm thi: <strong className="text-amber-600 dark:text-amber-400">CEO Danny Đỗ</strong>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenTheoryQuiz && (
              <button
                type="button"
                onClick={onOpenTheoryQuiz}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition-all cursor-pointer shadow-xs"
                data-testid="btn-open-theory-quiz-quick"
              >
                <AppIcon icon={GraduationCap} size={15} />
                <span>📝 Bài Thi Lý Thuyết (30&apos;)</span>
              </button>
            )}
            {onOpenExamRubric && (
              <button
                type="button"
                onClick={onOpenExamRubric}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 shadow-md transition-all cursor-pointer"
                data-testid="btn-open-iphone-rubric-quick"
              >
                <AppIcon icon={Award} size={15} />
                <span>📱 iPhone Chấm Thi 1-Chạm (70&apos;)</span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Metric cards tóm tắt tiến bộ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                Tốc độ hoàn thiện
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  64 phút
                </span>
                <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-0.5">
                  <TrendingDown size={12} /> -11 phút
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Giảm từ 75&apos; xuống 64&apos;</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Clock size={18} />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                Tỉ lệ lỗi kỹ thuật
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg font-black text-blue-600 dark:text-blue-400 tabular-nums">
                  0 lỗi
                </span>
                <span className="text-[11px] text-blue-500 font-semibold">Buổi gần nhất</span>
              </div>
              <span className="text-[10px] text-slate-400">Đã làm chủ kỹ thuật chọn trục</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <ShieldCheck size={18} />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                Trạng thái sát hạch
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-base font-black text-amber-600 dark:text-amber-400">
                  Sẵn sàng thi 31/10
                </span>
              </div>
              <span className="text-[10px] text-slate-400">9h30 sáng nay tại salon</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Zap size={18} />
            </div>
          </div>
        </div>

        {/* Bảng Chi Tiết 4 Buổi Học & Lịch Thi Sáng Nay */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Calendar size={14} className="text-amber-500" />
              <span>Tiến Trình Thực Hành Lâm Sàng (Tổng hợp bởi Cô Giang Đàm)</span>
            </span>
            <span className="text-[11px] text-slate-400">Chuẩn KTV: ≤ 70&apos; · 0% lỗi · ≥ 95đ</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                  <th className="py-2.5 px-3">Ngày &amp; Buổi</th>
                  <th className="py-2.5 px-3">Bài học đào tạo</th>
                  <th className="py-2.5 px-3 text-center">Khung giờ</th>
                  <th className="py-2.5 px-3 text-center">Thời gian</th>
                  <th className="py-2.5 px-3 text-center">Lỗi kỹ thuật</th>
                  <th className="py-2.5 px-3">Ghi chú chuyên môn (Cô Giang Đàm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {GIANG_HO_PRACTICE_SESSIONS.map((ses, idx) => {
                  const isExam = ses.status === 'EXAM_DAY';
                  const isExcellent = ses.status === 'EXCELLENT';
                  return (
                    <tr
                      key={ses.id}
                      className={`transition-colors ${
                        isExam
                          ? 'bg-amber-500/[0.08] dark:bg-amber-950/20 font-medium'
                          : isExcellent
                            ? 'bg-emerald-500/[0.04] dark:bg-emerald-950/10'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                          <span>{ses.date}</span>
                          <span className="text-[10.5px] px-1.5 py-0.2 rounded font-normal bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {ses.sessionTime}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          {isExam ? (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-300">
                              <Award size={13} />
                              {ses.lessonName}
                            </span>
                          ) : (
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {ses.lessonName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap tabular-nums text-slate-600 dark:text-slate-400">
                        {ses.timeRange}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center leading-none px-2 py-1 rounded-md text-[11px] font-bold tabular-nums ${
                            ses.durationMinutes <= 70
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {ses.durationMinutes}&apos;
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {isExam ? (
                          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                            Đang thi
                          </span>
                        ) : ses.errorsCount === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                            <Check size={11} /> 0 lỗi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                            <AlertCircle size={11} /> {ses.errorsCount} lỗi
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-[11px] max-w-xs">
                        {ses.notes}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Khung Tiêu Chuẩn Nghiệm Thu Tốt Nghiệp */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
            <span className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300 mb-1">
              <Award size={14} />
              <span>Tiêu Chuẩn Đạt Tốt Nghiệp Tay Nghề</span>
            </span>
            <ul className="m-0 pl-4 space-y-0.5 text-[11px]">
              <li>Thời gian thực hành: <strong>≤ 80 phút</strong></li>
              <li>Tỉ lệ sai sót kỹ thuật: <strong>≤ 1%</strong></li>
              <li>Tổng điểm sát hạch thực hành &amp; lý thuyết: <strong>≥ 90% (90/100đ)</strong></li>
            </ul>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200">
            <span className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 mb-1">
              <Sparkles size={14} />
              <span>Tiêu Chuẩn Đạt KTV Chính Thức (Chuyên Viên Tự Chủ)</span>
            </span>
            <ul className="m-0 pl-4 space-y-0.5 text-[11px]">
              <li>Thời gian thực hành: <strong>≤ 70 phút</strong> (đạt chuẩn salon Wings)</li>
              <li>Tỉ lệ lỗi kỹ thuật: <strong>0%</strong> (ôm đỉnh trục, không lem mắt)</li>
              <li>Tổng điểm đánh giá chuyên môn: <strong>≥ 95% (95/100đ)</strong></li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}
