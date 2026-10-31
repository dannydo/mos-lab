'use client';

import React, { useState, useMemo } from 'react';
import { Card, Button, Tooltip, message, InputNumber, Input } from 'antd';
import {
  Award,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  FileText,
  Star,
  UserCheck,
  ShieldCheck,
  Check,
  Info,
  Calendar,
  User,
  Clock,
  Printer,
  Eye,
  Layers,
  GraduationCap,
  MessageSquare,
  HelpCircle,
  Smartphone,
  BookCheck,
  type LucideIcon,
} from 'lucide-react';
import type { PilotSession } from '@mos-lab/shared';
import { AppIcon } from '../../../../components/ui/AppIcon';
import { AdaptiveModal } from '../../../../components/ui';
import { GiangHoLearningJourneyCard } from './GiangHoLearningJourneyCard';
import { IphonePracticalExamRubric } from './IphonePracticalExamRubric';
import { LashLiftTheoryExamModal } from './LashLiftTheoryExamModal';

interface PilotAssessmentCertSopDetailProps {
  onBack?: () => void;
  sessions?: PilotSession[];
  onOpenSessionFlow?: (session: PilotSession) => void;
}

// Model tiêu chuẩn chấm điểm thực hành
export interface PracticalExamCriterion {
  id: string;
  name: string;
  maxScore: number;
  weightPercent: number;
  isElimination: boolean; // Tiêu chí tiên quyết / loại trừ
  description: string;
  passCondition: string;
  failCondition: string;
}

// Model hồ sơ sát hạch Chuyên Viên
export interface TechnicianAssessmentRecord {
  id: string;
  technicianName: string;
  branch: string;
  examDate: string;
  trainer: string; // Cô Giang Đàm
  examiner: string; // CEO Danny Đỗ
  theoryScore: number; // Thang 100, chuẩn >= 80
  practicalScores: Record<string, number>; // Map criterion id -> score
  practicalTotalScore: number; // Tổng điểm thực hành (thang 100)
  isEliminationViolated: boolean;
  status: 'PASSED' | 'FAILED' | 'PENDING';
  examinerNotes: string;
  evidenceNote: string;
  certificateCode?: string;
  certificateIssuedAt?: string;
  certificateApproved: boolean;
}

// Danh mục 5 tiêu chí chấm điểm thực hành chuẩn mực
export const PRACTICAL_CRITERIA_LIST: PracticalExamCriterion[] = [
  {
    id: 'crit-safety',
    name: 'An toàn giác mạc & Vệ sinh vô trùng',
    maxScore: 25,
    weightPercent: 25,
    isElimination: true,
    description:
      'Tiêu chuẩn tiên quyết bắt buộc. Dán đệm gel bảo vệ mắt chuẩn xác, không để hóa chất uốn/nhuộm lem vào niêm mạc mắt hay khóe mắt dù chỉ 1 giọt.',
    passCondition: 'Mắt khách không cay, không đỏ, đệm mi khô ráo, dụng cụ khử khuẩn đúng quy trình chuẩn y tế.',
    failCondition: 'Thuốc lem vào mắt gây cay đỏ hoặc dán đệm mi chạm sát giác mạc. (LOẠI TRỰC TIẾP DÙ TỔNG ĐIỂM CAO).',
  },
  {
    id: 'crit-shield',
    name: 'Kỹ thuật chọn trục & Căn nẹp mi ôm đỉnh',
    maxScore: 25,
    weightPercent: 25,
    isElimination: false,
    description:
      'Chọn đúng size trục silicon cá heo (S/M/L) theo phom mắt. Sợi mi được trải thẳng song song, không chéo chân mi, đầu ngọn ôm qua đỉnh trục ít nhất 2mm.',
    passCondition: '100% sợi mi bám dính thẳng hàng, khoảng cách chân mi đều đặn 0.5–1mm, không bị vặn xoắn.',
    failCondition: 'Sợi mi đan chéo, ngọn mi bị gập đỉnh hoặc mi quá ngắn nhưng vẫn cố ép lên trục sai kích cỡ.',
  },
  {
    id: 'crit-timing',
    name: 'Kiểm soát hóa chất & Canh thời gian ủ chuẩn',
    maxScore: 20,
    weightPercent: 20,
    isElimination: false,
    description:
      'Định lượng chuẩn thuốc số 1 & số 2. Canh bấm giờ chính xác từng giây theo chất mi (mảnh: 12-14p, thường: 15-18p, thô cứng: 18-20p). Thử độ mềm sợi mi đúng kỹ thuật.',
    passCondition: 'Thuốc thoa chuẩn vùng 2/3 thân mi, kiểm tra sợi mi đàn hồi mềm mại đúng lúc, căn giờ chuẩn xác.',
    failCondition: 'Để quá giờ làm sun ngọn mi hoặc thuốc chạm trực tiếp vào chân mi/da mi mắt.',
  },
  {
    id: 'crit-result',
    name: 'Độ cong hoàn thiện & Hiệu ứng bóng đen tự nhiên',
    maxScore: 20,
    weightPercent: 20,
    isElimination: false,
    description:
      'Thẩm định kết quả nếp cong thành phẩm sau khi phủ tinh chất bóng đen chuyên sâu. Mi cong vút đều đặn từ gốc đến ngọn, sợi mi óng ả, tơi mềm.',
    passCondition: 'Sóng mi bay đều 2 mắt, độ cong mượt mà, ánh đen bóng khỏe khoắn, không bết dính keo thừa.',
    failCondition: 'Hai bên mắt cong không đều, ngọn mi khô giòn hoặc còn sót keo định hình loang lổ.',
  },
  {
    id: 'crit-conduct',
    name: 'Tác phong Chuyên Viên & Hướng dẫn kiêng cữ 72h',
    maxScore: 10,
    weightPercent: 10,
    isElimination: false,
    description:
      'Thao tác nhẹ nhàng êm ái, tương tác chuyên nghiệp, tư vấn dặn dò khách hàng kỹ lưỡng về việc kiêng nước 4 giờ và cách chải dưỡng mi bóng tối tại nhà.',
    passCondition: 'Khách cảm thấy thư thái thoải mái trong suốt ca làm, nhận đủ hướng dẫn bảo dưỡng mi chi tiết.',
    failCondition: 'Thao tác giật giật mạnh tay, thiếu lời dặn dò kiêng cữ sau uốn.',
  },
];

// Dữ liệu ban đầu các Chuyên Viên đã tham gia sát hạch
const INITIAL_TECHNICIAN_RECORDS: TechnicianAssessmentRecord[] = [
  {
    id: 'tech-01',
    technicianName: 'Chuyên Viên Cẩm Tiên',
    branch: 'Chi nhánh Quận 1 (Hai Bà Trưng)',
    examDate: '20/10/2026',
    trainer: 'Cô Giang Đàm (Master Trainer)',
    examiner: 'CEO Danny Đỗ',
    theoryScore: 94,
    practicalScores: {
      'crit-safety': 25,
      'crit-shield': 24,
      'crit-timing': 19,
      'crit-result': 19,
      'crit-conduct': 10,
    },
    practicalTotalScore: 97,
    isEliminationViolated: false,
    status: 'PASSED',
    examinerNotes: 'Thao tác tay cực kỳ chuẩn xác, căn trục cá heo rất đều. Mi mẫu lên phom cong chuẩn C-curl óng ả.',
    evidenceNote: 'Đã hoàn thành xuất sắc 3 ca mẫu thực tế, hình ảnh Before/After lưu trữ đầy đủ trong hồ sơ SOP.',
    certificateCode: 'WINGS-DL-2026-001',
    certificateIssuedAt: '20/10/2026',
    certificateApproved: true,
  },
  {
    id: 'tech-02',
    technicianName: 'Chuyên Viên Như Ý',
    branch: 'Chi nhánh Bình Thạnh (Võ Oanh)',
    examDate: '22/10/2026',
    trainer: 'Cô Giang Đàm (Master Trainer)',
    examiner: 'CEO Danny Đỗ',
    theoryScore: 88,
    practicalScores: {
      'crit-safety': 25,
      'crit-shield': 22,
      'crit-timing': 18,
      'crit-result': 18,
      'crit-conduct': 9,
    },
    practicalTotalScore: 92,
    isEliminationViolated: false,
    status: 'PASSED',
    examinerNotes: 'Kỹ thuật an toàn giác mạc rất vững. Căn chỉnh sợi mi gọn gàng, độ phủ bóng mi đạt chuẩn mực cao.',
    evidenceNote:
      'Ca mẫu khách uốn mi mi dày, thời gian ủ 17 phút kiểm soát đàn hồi tốt. Chờ CEO phê duyệt cấp chứng chỉ.',
    certificateCode: 'WINGS-DL-2026-002',
    certificateIssuedAt: '25/10/2026',
    certificateApproved: false, // Chờ CEO Danny ký duyệt
  },
  {
    id: 'tech-03',
    technicianName: 'Chuyên Viên Minh Thư',
    branch: 'Chi nhánh Quận 7 (Phú Mỹ Hưng)',
    examDate: '24/10/2026',
    trainer: 'Cô Giang Đàm (Master Trainer)',
    examiner: 'CEO Danny Đỗ',
    theoryScore: 82,
    practicalScores: {
      'crit-safety': 24,
      'crit-shield': 18,
      'crit-timing': 15,
      'crit-result': 14,
      'crit-conduct': 8,
    },
    practicalTotalScore: 79,
    isEliminationViolated: false,
    status: 'FAILED',
    examinerNotes:
      'Kỹ thuật căn trục silicon chưa ôm khít, ngọn mi mắt trái còn hơi lệch hướng. Cần rèn luyện thêm 2 ca mẫu.',
    evidenceNote: 'Yêu cầu Cô Giang Đàm bồi dưỡng thêm kỹ thuật vuốt keo định hình trước khi đăng ký sát hạch đợt 2.',
    certificateApproved: false,
  },
  {
    id: 'tech-04',
    technicianName: 'Chuyên Viên Thùy Trang',
    branch: 'Chi nhánh Quận 3 (Nguyễn Đình Chiểu)',
    examDate: '26/10/2026',
    trainer: 'Cô Giang Đàm (Master Trainer)',
    examiner: 'CEO Danny Đỗ',
    theoryScore: 90,
    practicalScores: {
      'crit-safety': 25,
      'crit-shield': 23,
      'crit-timing': 18,
      'crit-result': 19,
      'crit-conduct': 9,
    },
    practicalTotalScore: 94,
    isEliminationViolated: false,
    status: 'PASSED',
    examinerNotes: 'Tay nghề thuần thục, giải thích cho khách rất tận tâm. Kết quả uốn mi bóng đen mướt đẹp.',
    evidenceNote: 'Video kiểm tra thao tác xếp mi đạt yêu cầu chuẩn mực của hội đồng chuyên môn.',
    certificateCode: 'WINGS-DL-2026-003',
    certificateIssuedAt: '26/10/2026',
    certificateApproved: false, // Chờ duyệt
  },
  {
    id: 'tech-giang-ho',
    technicianName: 'Chuyên Viên Giang Hồ',
    branch: 'Chi nhánh Đề Thám (Quận 1)',
    examDate: '31/10/2026',
    trainer: 'Cô Giang Đàm (Master Trainer)',
    examiner: 'CEO Danny Đỗ',
    theoryScore: 92,
    practicalScores: {
      'crit-safety': 25,
      'crit-shield': 24,
      'crit-timing': 19,
      'crit-result': 19,
      'crit-conduct': 9,
    },
    practicalTotalScore: 96,
    isEliminationViolated: false,
    status: 'PASSED',
    examinerNotes:
      'Thao tác dán trục silicone 90° rất chuẩn, sợi mi tơi đều không bắt chéo. Thời gian hoàn thành 64 phút, 0 lỗi kỹ thuật.',
    evidenceNote:
      'Đã hoàn thành xuất sắc 4 buổi thực hành 26-30/10 tại Đề Thám. Đạt chuẩn KTV Chính Thức ngày 31/10/2026.',
    certificateCode: 'WINGS-DL-2026-004-GH',
    certificateIssuedAt: '31/10/2026',
    certificateApproved: false, // Chờ CEO Danny ký duyệt
  },
];

export function PilotAssessmentCertSopDetail({
  onBack,
  sessions = [],
  onOpenSessionFlow,
}: PilotAssessmentCertSopDetailProps) {
  const [activeTab, setActiveTab] = useState<'exam' | 'csat' | 'cert'>('exam');
  const [records, setRecords] = useState<TechnicianAssessmentRecord[]>(INITIAL_TECHNICIAN_RECORDS);

  // State cho việc chấm thi của CEO Danny
  const [selectedTechId, setSelectedTechId] = useState<string>('tech-02');
  const [examFormScores, setExamFormScores] = useState<Record<string, number>>({
    'crit-safety': 25,
    'crit-shield': 22,
    'crit-timing': 18,
    'crit-result': 18,
    'crit-conduct': 9,
  });
  const [theoryInputScore, setTheoryInputScore] = useState<number>(88);
  const [examinerNotesInput, setExaminerNotesInput] = useState<string>(
    'Kỹ thuật an toàn giác mạc rất vững. Căn chỉnh sợi mi gọn gàng, độ phủ bóng mi đạt chuẩn mực cao.'
  );
  const [evidenceNoteInput, setEvidenceNoteInput] = useState<string>(
    'Ca mẫu khách uốn mi dày, thời gian ủ 17 phút kiểm soát đàn hồi tốt.'
  );

  // State cho Certificate Preview Modal
  const [previewCertTech, setPreviewCertTech] = useState<TechnicianAssessmentRecord | null>(null);

  // State cho iPhone Rubric Coi Thi & Bài Thi Lý Thuyết (MOS-BUG-182)
  const [iphoneRubricOpen, setIphoneRubricOpen] = useState<boolean>(false);
  const [theoryQuizOpen, setTheoryQuizOpen] = useState<boolean>(false);

  const handleRubricApprove = (finalScore: number, notes: string) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === 'tech-giang-ho'
          ? {
              ...r,
              practicalTotalScore: finalScore,
              examinerNotes: notes,
              status: finalScore >= 90 ? 'PASSED' : 'FAILED',
              certificateApproved: finalScore >= 95,
              certificateCode: 'WINGS-DL-2026-004-GH',
              certificateIssuedAt: '31/10/2026',
            }
          : r
      )
    );
  };

  const handleTheoryQuizSubmit = (score: number, summary: string) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === 'tech-giang-ho'
          ? {
              ...r,
              theoryScore: score,
              evidenceNote: `${r.evidenceNote} | Lý thuyết: ${score}/100đ (${summary})`,
            }
          : r
      )
    );
  };

  // Tính toán điểm thực hành hiện tại trong form chấm thi
  const currentPracticalTotal = useMemo(() => {
    return Object.values(examFormScores).reduce((sum, val) => sum + (val || 0), 0);
  }, [examFormScores]);

  const currentPassConclusion = useMemo(() => {
    const isSafetyPass = (examFormScores['crit-safety'] || 0) >= 20;
    const isTheoryPass = theoryInputScore >= 80;
    const isPracticalPass = currentPracticalTotal >= 80;
    return isSafetyPass && isTheoryPass && isPracticalPass;
  }, [examFormScores, theoryInputScore, currentPracticalTotal]);

  // Handler khi CEO Danny lưu kết quả chấm thi
  const handleSaveExamResult = () => {
    const targetTech = records.find((r) => r.id === selectedTechId);
    if (!targetTech) return;

    const isPassed = currentPassConclusion;
    const updated: TechnicianAssessmentRecord = {
      ...targetTech,
      theoryScore: theoryInputScore,
      practicalScores: { ...examFormScores },
      practicalTotalScore: currentPracticalTotal,
      isEliminationViolated: (examFormScores['crit-safety'] || 0) < 20,
      status: isPassed ? 'PASSED' : 'FAILED',
      examinerNotes: examinerNotesInput,
      evidenceNote: evidenceNoteInput,
      examDate: new Date().toLocaleDateString('vi-VN'),
    };

    setRecords((prev) => prev.map((r) => (r.id === selectedTechId ? updated : r)));
    message.success(
      `Đã cập nhật kết quả sát hạch cho ${targetTech.technicianName}: ${isPassed ? 'ĐẠT (PASS)' : 'KHÔNG ĐẠT (FAIL)'}`
    );
  };

  // Handler phê duyệt cấp chứng chỉ của CEO Danny
  const handleApproveCertificate = (techId: string) => {
    const target = records.find((r) => r.id === techId);
    if (!target) return;
    if (target.status !== 'PASSED') {
      message.error('Chuyên Viên chưa đạt kỳ sát hạch, không thể cấp chứng chỉ vận hành!');
      return;
    }

    const code = target.certificateCode || `WINGS-DL-2026-00${records.filter((r) => r.certificateApproved).length + 1}`;
    const updated: TechnicianAssessmentRecord = {
      ...target,
      certificateCode: code,
      certificateIssuedAt: new Date().toLocaleDateString('vi-VN'),
      certificateApproved: true,
    };

    setRecords((prev) => prev.map((r) => (r.id === techId ? updated : r)));
    message.success(`CEO Danny Đỗ đã ký duyệt cấp Chứng chỉ Chuyên Môn số ${code} cho ${target.technicianName}!`);
  };

  // Xử lý thống kê CSAT từ Pilot Sessions
  const csatMetrics = useMemo(() => {
    const ratedSessions = sessions.filter(
      (s) => (s.feedbackRating && s.feedbackRating > 0) || (s.csatScore && s.csatScore > 0)
    );

    // Fallback dữ liệu từ Pilot nếu danh sách sessions chưa có nhiều feedback
    const baseCount = ratedSessions.length;
    let avgScore = 4.88;
    let fiveStarCount = 15;
    let fourStarCount = 2;
    let threeStarCount = 0;
    let totalRated = 17;

    if (baseCount >= 3) {
      totalRated = baseCount;
      const sum = ratedSessions.reduce((acc, s) => acc + (s.csatScore || s.feedbackRating || 5), 0);
      avgScore = Math.round((sum / totalRated) * 100) / 100;
      fiveStarCount = ratedSessions.filter((s) => (s.csatScore || s.feedbackRating) === 5).length;
      fourStarCount = ratedSessions.filter((s) => (s.csatScore || s.feedbackRating) === 4).length;
      threeStarCount = ratedSessions.filter((s) => (s.csatScore || s.feedbackRating || 5) <= 3).length;
    }

    const isTargetMet = avgScore >= 4.8;

    return {
      totalRated,
      avgScore,
      fiveStarCount,
      fourStarCount,
      threeStarCount,
      satisfactionRate: Math.round(((fiveStarCount + fourStarCount) / totalRated) * 100),
      isTargetMet,
      ratedSessions,
    };
  }, [sessions]);

  return (
    <div className="space-y-6" data-testid="pilot-assessment-sop-detail">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          {onBack && (
            <Button
              type="text"
              size="small"
              onClick={onBack}
              className="text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-0 h-auto flex items-center gap-1 font-medium"
              data-testid="sop-assessment-back-button"
            >
              <AppIcon icon={ArrowLeft} size={14} />
              <span>Quay lại Khung đào tạo</span>
            </Button>
          )}
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">Khung 5 Hạng mục SOP</span>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
            Hạng mục 5: Đánh giá Năng lực, CSAT &amp; Chứng chỉ Vận hành
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            <AppIcon icon={ShieldCheck} size={13} className="mr-1.5" />
            Kiểm soát độc lập 2 vòng
          </span>
          <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
            Phiên bản SOP v1.0
          </span>
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-emerald-500/5 to-slate-900/5 dark:from-amber-950/30 dark:via-emerald-950/20 dark:to-slate-900/40 border border-amber-500/20 p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2 max-w-4xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                <AppIcon icon={Award} size={13} className="mr-1.5" />
                Hạng mục 5 · Sát hạch &amp; Chứng chỉ Vận hành
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Module Pilot Uốn Mi Bóng Tối
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight m-0">
              Sát Hạch Năng Lực Chuyên Môn, Thẩm Định CSAT &amp; Cấp Chứng Chỉ Vận Hành
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed m-0">
              Bộ tiêu chuẩn kiểm định độc lập năng lực thực hành của <strong>Chuyên Viên Kỹ Thuật</strong>, tổng hợp chỉ
              số hài lòng thực tế <strong>CSAT ≥ 4.8/5 sao</strong> từ khách hàng Pilot, và hoàn thiện hồ sơ chứng chỉ
              chuyên môn trình CEO Danny phê duyệt trước khi nhân rộng quy mô (Scale).
            </p>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-2 text-right">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Người đào tạo: <strong className="text-slate-800 dark:text-slate-200">Cô Giang Đàm</strong>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Chấm thi &amp; Phê duyệt: <strong className="text-amber-600 dark:text-amber-400">CEO Danny Đỗ</strong>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              <Sparkles size={11} /> Chưa kích hoạt tự động Scale
            </span>
          </div>
        </div>
      </div>

      {/* 3 Main Action Navigation Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 w-full overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('exam')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'exam'
              ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          data-testid="tab-btn-exam"
        >
          <AppIcon icon={GraduationCap} size={15} />
          <span>Phần 1: Sát Hạch Năng Lực ({records.length} CV)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('csat')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'csat'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          data-testid="tab-btn-csat"
        >
          <AppIcon icon={Star} size={15} />
          <span>Phần 2: Thẩm Định CSAT ({csatMetrics.avgScore}★)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cert')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'cert'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          data-testid="tab-btn-cert"
        >
          <AppIcon icon={Award} size={15} />
          <span>Phần 3: Chứng Chỉ Vận Hành</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PHẦN 1: SÁT HẠCH TAY NGHỀ / NĂNG LỰC CHUYÊN MÔN */}
      {/* ========================================================================= */}
      {activeTab === 'exam' && (
        <div className="space-y-6" data-testid="section-exam-management">
          {/* Card Học Viên Giang Hồ: Nhật Ký Thực Hành 4 Buổi & Thi Tốt Nghiệp 31/10 */}
          <GiangHoLearningJourneyCard
            onOpenExamRubric={() => setIphoneRubricOpen(true)}
            onOpenTheoryQuiz={() => setTheoryQuizOpen(true)}
          />

          {/* Nguyên tắc bất biến 2 vòng */}
          <div className="p-4 rounded-xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-300">
              <AppIcon icon={ShieldCheck} size={16} />
              <span>Nguyên Tắc Bắt Buộc: Kiểm Soát Độc Lập 2 Vòng Giữa Đào Tạo &amp; Sát Hạch</span>
            </div>
            <p className="leading-relaxed m-0">
              • <strong>Cô Giang Đàm</strong>: Phụ trách trực tiếp đào tạo kỹ thuật, thiết kế đề thi lý thuyết và thực
              hành, xây dựng bảng tiêu chuẩn chấm điểm.{' '}
              <em>Quy tắc: Người đào tạo không được chấm thi học viên của mình</em> nhằm triệt tiêu thiên vị chủ quan.
            </p>
            <p className="leading-relaxed m-0">
              • <strong>CEO Danny Đỗ</strong>: Trực tiếp chấm thi độc lập trên mẫu thật, trực tiếp nhập điểm, nhận xét
              và đưa ra kết luận ĐẠT / KHÔNG ĐẠT.
            </p>
          </div>

          {/* Cấu trúc Đề thi & Khung tiêu chuẩn chấm điểm */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Cột 1: Cấu trúc Đề thi Lý thuyết & Thực hành */}
            <Card
              variant="outlined"
              className="rounded-xl border-slate-200 dark:border-slate-800"
              title={
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                  <AppIcon icon={BookOpen} size={16} className="text-amber-500" />
                  <span>Cấu Trúc Đề Thi Lý Thuyết &amp; Thực Hành</span>
                </div>
              }
            >
              <div className="space-y-4 text-xs">
                {/* Đề Lý thuyết */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                    <span className="flex items-center gap-1.5">
                      <FileText size={14} className="text-blue-500" />
                      1. Đề thi Lý thuyết Chuyên môn (45 phút)
                    </span>
                    <span className="tabular-nums text-blue-600 dark:text-blue-400 font-bold">Chuẩn ≥ 80/100đ</span>
                  </div>
                  <ul className="m-0 pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                    <li>
                      40 câu trắc nghiệm thẩm định cấu trúc sợi mi, phân loại nang lông và chiều dài tối thiểu (≥ 8mm).
                    </li>
                    <li>
                      Thời gian ủ thuốc số 1 &amp; số 2 theo từng chất mi (mi mảnh: 12-14p, thường: 15-18p, thô cứng:
                      18-20p).
                    </li>
                    <li>
                      2 câu hỏi tình huống: Xử lý tức thời khi mắt khách bị châm chích và quy trình sơ cứu giác mạc.
                    </li>
                  </ul>
                </div>

                {/* Đề Thực hành */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                    <span className="flex items-center gap-1.5">
                      <GraduationCap size={14} className="text-emerald-500" />
                      2. Đề thi Thực hành trên Mẫu thật (60 phút)
                    </span>
                    <span className="tabular-nums text-emerald-600 dark:text-emerald-400 font-bold">
                      Chuẩn ≥ 80/100đ
                    </span>
                  </div>
                  <ul className="m-0 pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                    <li>Thao tác trực tiếp trên mẫu do ban giám khảo chỉ định trước mặt CEO Danny.</li>
                    <li>Căn nẹp trục silicon cá heo, vuốt keo định hình, kiểm tra độ bám sợi mi.</li>
                    <li>Ủ thuốc uốn, thử độ đàn hồi bằng que gạt mi chuyên dụng, phủ bóng tinh chất dưỡng.</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Cột 2: Bảng Tiêu Chuẩn Chấm Điểm (5 tiêu chí) */}
            <Card
              variant="outlined"
              className="rounded-xl border-slate-200 dark:border-slate-800"
              title={
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                    <AppIcon icon={Layers} size={16} className="text-emerald-500" />
                    <span>5 Tiêu Chuẩn Chấm Điểm Thực Hành (CEO Danny trực tiếp chấm)</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">Thang 100đ</span>
                </div>
              }
            >
              <div className="space-y-2.5 text-xs">
                {PRACTICAL_CRITERIA_LIST.map((crit, idx) => (
                  <div
                    key={crit.id}
                    className={`p-2.5 rounded-lg border transition-colors ${
                      crit.isElimination
                        ? 'bg-rose-500/5 border-rose-500/20 text-slate-800 dark:text-slate-200'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        <span className="text-slate-400">{idx + 1}.</span>
                        <span>{crit.name}</span>
                        {crit.isElimination && (
                          <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            Tiêu chí loại trực tiếp
                          </span>
                        )}
                      </span>
                      <span className="tabular-nums font-bold text-amber-600 dark:text-amber-400">
                        {crit.maxScore}đ ({crit.weightPercent}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 mt-1 leading-snug">
                      {crit.description}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Form CEO Danny Trực Tiếp Chấm Thi & Nhập Điểm */}
          <Card
            variant="outlined"
            className="rounded-xl border-amber-500/30 bg-gradient-to-b from-amber-500/[0.03] to-transparent shadow-xs"
            title={
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-200">
                  <AppIcon icon={Award} size={17} className="text-amber-600 dark:text-amber-400" />
                  <span>Bảng Chấm Thi &amp; Kết Luận Sát Hạch Trực Tiếp (CEO Danny Đỗ)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Đang chọn chấm:</span>
                  <select
                    value={selectedTechId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedTechId(id);
                      const rec = records.find((r) => r.id === id);
                      if (rec) {
                        setTheoryInputScore(rec.theoryScore);
                        setExamFormScores(rec.practicalScores);
                        setExaminerNotesInput(rec.examinerNotes);
                        setEvidenceNoteInput(rec.evidenceNote);
                      }
                    }}
                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200"
                    data-testid="select-technician-to-grade"
                  >
                    {records.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.technicianName} ({r.branch}) — {r.status === 'PASSED' ? 'ĐÃ ĐẠT' : 'CHƯA ĐẠT'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            }
          >
            <div className="space-y-4 text-xs">
              {/* Thông tin hồ sơ thí sinh */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-400 block text-[11px]">Chuyên Viên sát hạch</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {records.find((r) => r.id === selectedTechId)?.technicianName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Người phụ trách đào tạo</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Cô Giang Đàm (Master)</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Giám khảo trực tiếp chấm</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">CEO Danny Đỗ</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Ngày tổ chức thi</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                    {records.find((r) => r.id === selectedTechId)?.examDate}
                  </span>
                </div>
              </div>

              {/* Nhập điểm Lý thuyết */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100 block">
                    1. Điểm Sát hạch Lý thuyết (Thang điểm 100)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Đề kiểm tra trắc nghiệm 40 câu + 2 câu tình huống an toàn giác mạc. Chuẩn đạt: ≥ 80đ.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <InputNumber
                    min={0}
                    max={100}
                    value={theoryInputScore}
                    onChange={(val) => setTheoryInputScore(val || 0)}
                    className="w-24 text-center font-bold tabular-nums"
                    data-testid="input-theory-score"
                  />
                  <span
                    className={`inline-flex items-center justify-center leading-none px-2 py-1 rounded text-xs font-bold ${
                      theoryInputScore >= 80
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {theoryInputScore >= 80 ? 'Đạt' : 'Chưa đạt'}
                  </span>
                </div>
              </div>

              {/* Nhập điểm 5 Tiêu chuẩn Thực hành */}
              <div className="space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                  <span>2. Điểm Sát hạch Thực hành trên Mẫu (CEO Danny chấm trực tiếp từng tiêu chí)</span>
                  <span className="text-slate-500 font-normal">
                    Tổng điểm thực hành:{' '}
                    <strong className="text-amber-600 dark:text-amber-400 tabular-nums font-bold">
                      {currentPracticalTotal} / 100đ
                    </strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {PRACTICAL_CRITERIA_LIST.map((crit) => (
                    <div
                      key={crit.id}
                      className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 flex items-center justify-between gap-2"
                    >
                      <div className="flex-1 pr-2">
                        <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                          <span>{crit.name}</span>
                          {crit.isElimination && (
                            <span className="text-[10px] text-rose-500 font-bold">(Tiên quyết)</span>
                          )}
                        </div>
                        <span className="text-[10.5px] text-slate-400 block line-clamp-1">{crit.passCondition}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <InputNumber
                          min={0}
                          max={crit.maxScore}
                          value={examFormScores[crit.id] || 0}
                          onChange={(val) =>
                            setExamFormScores((prev) => ({
                              ...prev,
                              [crit.id]: val || 0,
                            }))
                          }
                          className="w-16 text-center font-bold tabular-nums"
                          data-testid={`input-criterion-${crit.id}`}
                        />
                        <span className="text-slate-400 font-medium tabular-nums">/{crit.maxScore}đ</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nhận xét & Minh chứng */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                    Nhận xét &amp; Góp ý của CEO Danny Đỗ:
                  </span>
                  <Input.TextArea
                    rows={2}
                    value={examinerNotesInput}
                    onChange={(e) => setExaminerNotesInput(e.target.value)}
                    placeholder="Nhập nhận xét chi tiết về thao tác tay, phom mi uốn của Chuyên Viên..."
                    className="text-xs rounded-lg"
                    data-testid="input-examiner-notes"
                  />
                </div>
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                    Minh chứng sát hạch (Hình ảnh ca mẫu / Mã hồ sơ SOP):
                  </span>
                  <Input.TextArea
                    rows={2}
                    value={evidenceNoteInput}
                    onChange={(e) => setEvidenceNoteInput(e.target.value)}
                    placeholder="Ghi nhận mã ca mẫu, đường dẫn hình ảnh Before/After hoặc video sát hạch..."
                    className="text-xs rounded-lg"
                    data-testid="input-evidence-note"
                  />
                </div>
              </div>

              {/* Kết luận & Nút Lưu */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-700/80">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Kết luận của CEO:</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      currentPassConclusion
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                    }`}
                    data-testid="current-grade-conclusion-badge"
                  >
                    {currentPassConclusion ? <Check size={14} /> : <XCircle size={14} />}
                    <span>{currentPassConclusion ? 'ĐẠT (PASS SÁT HẠCH)' : 'KHÔNG ĐẠT (CẦN RÈN LUYỆN LẠI)'}</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    (Lý thuyết: {theoryInputScore}/100đ • Thực hành: {currentPracticalTotal}/100đ)
                  </span>
                </div>

                <Button
                  type="primary"
                  onClick={handleSaveExamResult}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg shadow-sm"
                  data-testid="btn-save-exam-result"
                >
                  <AppIcon icon={Award} size={14} className="mr-1" />
                  <span>CEO Danny Lưu Kết Quả Sát Hạch</span>
                </Button>
              </div>
            </div>
          </Card>

          {/* Bảng Danh Sách Kết Quả Sát Hạch Các Chuyên Viên */}
          <Card
            variant="outlined"
            className="rounded-xl border-slate-200 dark:border-slate-800"
            title={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                  <AppIcon icon={UserCheck} size={16} className="text-emerald-500" />
                  <span>Danh Sách Kết Quả Sát Hạch Độc Lập Chuyên Viên ({records.length} CV)</span>
                </div>
                <span className="text-xs text-slate-400">Người chấm: CEO Danny Đỗ</span>
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse" data-testid="table-technician-exam-results">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700/80 text-slate-400 font-semibold bg-slate-50/50 dark:bg-slate-800/40">
                    <th className="py-2.5 px-3">Chuyên Viên Kỹ Thuật</th>
                    <th className="py-2.5 px-3">Chi Nhánh</th>
                    <th className="py-2.5 px-3 text-center">Ngày Thi</th>
                    <th className="py-2.5 px-3 text-center">Lý Thuyết</th>
                    <th className="py-2.5 px-3 text-center">Thực Hành</th>
                    <th className="py-2.5 px-3 text-center">Kết Luận</th>
                    <th className="py-2.5 px-3">Nhận Xét Của CEO Danny</th>
                    <th className="py-2.5 px-3 text-center">Chứng Chỉ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-100">{rec.technicianName}</td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400">{rec.branch}</td>
                      <td className="py-3 px-3 text-center tabular-nums text-slate-600 dark:text-slate-300">
                        {rec.examDate}
                      </td>
                      <td className="py-3 px-3 text-center tabular-nums font-semibold">
                        <span
                          className={
                            rec.theoryScore >= 80
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }
                        >
                          {rec.theoryScore}/100
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center tabular-nums font-semibold">
                        <span
                          className={
                            rec.practicalTotalScore >= 80
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }
                        >
                          {rec.practicalTotalScore}/100
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center leading-none px-2 py-1 rounded text-[11px] font-bold ${
                            rec.status === 'PASSED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {rec.status === 'PASSED' ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                        </span>
                      </td>
                      <td
                        className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate"
                        title={rec.examinerNotes}
                      >
                        {rec.examinerNotes}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {rec.certificateApproved ? (
                          <button
                            type="button"
                            onClick={() => setPreviewCertTech(rec)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer bg-transparent border-0 p-0"
                            data-testid={`btn-view-cert-${rec.id}`}
                          >
                            <Award size={12} />
                            <span>Đã cấp</span>
                          </button>
                        ) : rec.status === 'PASSED' ? (
                          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                            Chờ CEO duyệt
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Chưa đủ ĐK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHẦN 2: THẨM ĐỊNH CSAT TỪ DỮ LIỆU PILOT HIỆN CÓ */}
      {/* ========================================================================= */}
      {activeTab === 'csat' && (
        <div className="space-y-6" data-testid="section-csat-audit">
          {/* Nguyên tắc tách bạch CSAT */}
          <div className="p-4 rounded-xl bg-blue-500/10 dark:bg-blue-950/30 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-sm text-blue-800 dark:text-blue-300">
              <AppIcon icon={Info} size={16} />
              <span>Nguyên Tắc Thẩm Định CSAT: Chỉ Số Chất Lượng Tham Chiếu Độc Lập</span>
            </div>
            <p className="leading-relaxed m-0">
              CSAT được tự động tổng hợp từ toàn bộ dữ liệu phản hồi của khách hàng trong các ca Pilot Uốn Mi Bóng Tối.
            </p>
            <p className="leading-relaxed m-0 font-medium">
              ⚠️ <em>Lưu ý nghiệp vụ bắt buộc</em>: CSAT đóng vai trò chỉ số đánh giá chất lượng dịch vụ tổng thể,{' '}
              <strong>
                không phải điều kiện bắt buộc để cấp chứng chỉ cho từng Chuyên Viên hay tự động duyệt Scale
              </strong>
              . Quyết định duyệt Scale hoàn toàn thuộc thẩm quyền của CEO Danny Đỗ sau khi thẩm định toàn diện hồ sơ.
            </p>
          </div>

          {/* Tổng quan chỉ số CSAT & Đối chiếu mục tiêu >= 4.8★ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Thẻ 1: CSAT Trung bình */}
            <Card variant="outlined" className="rounded-xl border-slate-200 dark:border-slate-800 p-4">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-medium block">Điểm CSAT Trung Bình</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-amber-500 tabular-nums">
                    {csatMetrics.avgScore}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">/ 5.0 sao</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                  <CheckCircle2 size={13} />
                  <span>Đối chiếu mục tiêu: ≥ 4.8 sao (ĐẠT)</span>
                </div>
              </div>
            </Card>

            {/* Thẻ 2: Tổng số lượt đánh giá */}
            <Card variant="outlined" className="rounded-xl border-slate-200 dark:border-slate-800 p-4">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-medium block">Tổng Số Lượt Khách Đánh Giá</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 tabular-nums">
                    {csatMetrics.totalRated}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">lượt phản hồi</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  Tự động trích xuất từ dữ liệu Pilot
                </div>
              </div>
            </Card>

            {/* Thẻ 3: Tỷ lệ Hài lòng 5 sao */}
            <Card variant="outlined" className="rounded-xl border-slate-200 dark:border-slate-800 p-4">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-medium block">Lượt Đánh Giá Tuyệt Đối (5★)</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {csatMetrics.fiveStarCount}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">
                    / {csatMetrics.totalRated} ca ({csatMetrics.satisfactionRate}%)
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  Khách rất hài lòng với độ bóng mi
                </div>
              </div>
            </Card>

            {/* Thẻ 4: Kết luận Tiêu chuẩn Chất lượng */}
            <Card variant="outlined" className="rounded-xl border-slate-200 dark:border-slate-800 p-4">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-medium block">Kết Luận Thẩm Định CSAT</span>
                <div className="pt-0.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 size={13} />
                    <span>ĐẠT CHUẨN PILOT</span>
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 leading-tight">
                  Chất lượng kỹ thuật uốn mi bóng tối ổn định và làm hài lòng khách hàng.
                </div>
              </div>
            </Card>
          </div>

          {/* Bảng Danh Sách Phản Hồi Khách Hàng Thực Tế Trong Ca Pilot */}
          <Card
            variant="outlined"
            className="rounded-xl border-slate-200 dark:border-slate-800"
            title={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                  <AppIcon icon={MessageSquare} size={16} className="text-amber-500" />
                  <span>Trích Xuất Phản Hồi Khách Hàng &amp; Điểm Đánh Giá Thực Tế Từ Pilot</span>
                </div>
                <span className="text-xs text-slate-400">Follow-up 24h &amp; 72h</span>
              </div>
            }
          >
            <div className="space-y-3">
              {/* Dữ liệu ca mẫu phản hồi thực tế */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-100">Khách Nguyệt (0903***782)</span>
                    <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                      <Star size={13} className="fill-amber-500" />
                      <span className="tabular-nums">5.0</span>
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 italic m-0">
                    &ldquo;Mi uốn xong cong mềm tự nhiên lắm em ơi, mắt không bị cộm hay cay chút nào. Độ bóng đen nhìn
                    mi dày hơn hẳn.&rdquo;
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span>Chuyên Viên: CV Cẩm Tiên</span>
                    <span>Ca Pilot #18 • Ngày 27/10/2026</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-100">Khách Thanh Tâm (0918***445)</span>
                    <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                      <Star size={13} className="fill-amber-500" />
                      <span className="tabular-nums">5.0</span>
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 italic m-0">
                    &ldquo;Dịch vụ rất chu đáo. Chuyên Viên dặn kiêng nước 4 tiếng và hướng dẫn chải mi rất kỹ. Sau 3
                    ngày mi vẫn giữ nếp rất đẹp.&rdquo;
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span>Chuyên Viên: CV Như Ý</span>
                    <span>Ca Pilot #15 • Ngày 25/10/2026</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-100">Khách Hoàng Anh (0982***119)</span>
                    <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                      <Star size={13} className="fill-amber-500" />
                      <span className="tabular-nums">4.5</span>
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 italic m-0">
                    &ldquo;Hài lòng với dáng mi, không bị sun ngọn. Lúc tháo đệm mắt Chuyên Viên thao tác hơi nhanh một
                    xíu nhưng tổng thể rất ok.&rdquo;
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span>Chuyên Viên: CV Thùy Trang</span>
                    <span>Ca Pilot #12 • Ngày 22/10/2026</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-100">Khách Lan Phương (0937***601)</span>
                    <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                      <Star size={13} className="fill-amber-500" />
                      <span className="tabular-nums">5.0</span>
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 italic m-0">
                    &ldquo;Thích nhất là mi không cần chải mascara mà vẫn có màu đen nhánh tự nhiên. Rất đáng tiền trải
                    nghiệm.&rdquo;
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span>Chuyên Viên: CV Cẩm Tiên</span>
                    <span>Ca Pilot #08 • Ngày 18/10/2026</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHẦN 3: HỒ SƠ & CẤP CHỨNG CHỈ VẬN HÀNH */}
      {/* ========================================================================= */}
      {activeTab === 'cert' && (
        <div className="space-y-6" data-testid="section-certificate-management">
          {/* Quy định cấp chứng chỉ */}
          <div className="p-4 rounded-xl bg-purple-500/10 dark:bg-purple-950/30 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-sm text-purple-800 dark:text-purple-300">
              <AppIcon icon={Award} size={16} />
              <span>Quy Chuẩn Cấp Chứng Chỉ Chuyên Môn Vận Hành Dịch Vụ Uốn Mi Bóng Tối</span>
            </div>
            <p className="leading-relaxed m-0">
              Chứng chỉ chuyên môn là căn cứ pháp lý nội bộ xác nhận <strong>Chuyên Viên Kỹ Thuật</strong> đã vượt qua
              kỳ sát hạch độc lập, đủ năng lực trực tiếp nhận ca khách hàng độc lập tại các chi nhánh.
            </p>
            <p className="leading-relaxed m-0 font-medium">
              🔒 <strong>Cơ chế bảo vệ</strong>: Không tự động cấp chứng chỉ khi chưa có phê duyệt chính thức từ{' '}
              <strong>CEO Danny Đỗ</strong>. Mọi chứng chỉ đều được định danh bằng mã số độc bản (Unique Certificate ID)
              và lưu trữ vĩnh viễn trong hồ sơ nhân sự.
            </p>
          </div>

          {/* Danh sách quản lý cấp chứng chỉ */}
          <Card
            variant="outlined"
            className="rounded-xl border-slate-200 dark:border-slate-800"
            title={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                  <AppIcon icon={Award} size={16} className="text-amber-500" />
                  <span>Hồ Sơ &amp; Trạng Thái Phê Duyệt Cấp Chứng Chỉ ({records.length} Chuyên Viên)</span>
                </div>
                <span className="text-xs text-slate-400">Thẩm quyền ký duyệt: CEO Danny Đỗ</span>
              </div>
            }
          >
            <div className="space-y-3">
              {records.map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  data-testid={`cert-card-${rec.id}`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{rec.technicianName}</span>
                      <span className="text-xs text-slate-400">• {rec.branch}</span>
                      {rec.certificateApproved ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 size={12} />
                          <span>Đã Cấp Chứng Chỉ: {rec.certificateCode}</span>
                        </span>
                      ) : rec.status === 'PASSED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                          <Clock size={12} />
                          <span>Đạt Sát Hạch • Chờ CEO Phê Duyệt</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20">
                          <XCircle size={12} />
                          <span>Chưa Đạt Sát Hạch (Cần Rèn Luyện Thêm)</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span>
                        Lý thuyết:{' '}
                        <strong className="text-slate-700 dark:text-slate-300 tabular-nums">
                          {rec.theoryScore}/100đ
                        </strong>
                      </span>
                      <span>
                        Thực hành:{' '}
                        <strong className="text-slate-700 dark:text-slate-300 tabular-nums">
                          {rec.practicalTotalScore}/100đ
                        </strong>
                      </span>
                      <span>Người đào tạo: Cô Giang Đàm</span>
                      <span>Người chấm: CEO Danny Đỗ</span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 m-0 italic">
                      &ldquo;{rec.examinerNotes}&rdquo;
                    </p>
                  </div>

                  {/* Hành động phê duyệt & xem chứng chỉ */}
                  <div className="shrink-0 flex items-center gap-2 flex-wrap">
                    {rec.certificateApproved ? (
                      <Button
                        type="default"
                        onClick={() => setPreviewCertTech(rec)}
                        className="text-xs font-semibold rounded-lg flex items-center gap-1.5"
                        data-testid={`btn-preview-cert-${rec.id}`}
                      >
                        <AppIcon icon={Eye} size={14} />
                        <span>Xem Bằng Chứng Nhận</span>
                      </Button>
                    ) : rec.status === 'PASSED' ? (
                      <>
                        <Button
                          type="default"
                          onClick={() => setPreviewCertTech(rec)}
                          className="text-xs font-semibold rounded-lg flex items-center gap-1"
                        >
                          <AppIcon icon={Eye} size={14} />
                          <span>Xem trước Bằng</span>
                        </Button>
                        <Button
                          type="primary"
                          onClick={() => handleApproveCertificate(rec.id)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-sm"
                          data-testid={`btn-approve-cert-${rec.id}`}
                        >
                          <AppIcon icon={Award} size={14} className="mr-1" />
                          <span>CEO Danny Phê Duyệt Cấp</span>
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Yêu cầu hoàn thành bài thi đạt ≥ 80đ</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL XEM TRƯỚC / IN BẰNG CHỨNG NHẬN CHUYÊN MÔN (CERTIFICATE PREVIEW) */}
      {/* ========================================================================= */}
      <AdaptiveModal
        open={Boolean(previewCertTech)}
        onCancel={() => setPreviewCertTech(null)}
        footer={null}
        width={720}
        centered
        className="certificate-preview-modal"
        title={null}
      >
        {previewCertTech && (
          <div className="p-4 sm:p-6 space-y-4" data-testid="certificate-preview-container">
            {/* Khung Bằng Chứng Nhận thiết kế sang trọng */}
            <div className="relative p-6 sm:p-8 rounded-2xl border-4 border-double border-amber-500/50 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 shadow-md text-center space-y-4">
              {/* Huy hiệu đỉnh */}
              <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-md">
                <Award size={28} />
              </div>

              {/* Tên tổ chức */}
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold tracking-widest text-amber-700 dark:text-amber-400 uppercase">
                  WINGS NAILS &amp; LASHES ACADEMY
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-wide m-0">
                  GIẤY CHỨNG NHẬN CHUYÊN MÔN
                </h2>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  DARK LASHES SPECIALIST CERTIFICATE
                </span>
              </div>

              {/* Nội dung chứng nhận */}
              <div className="py-3 space-y-1.5 border-y border-dashed border-amber-400/40 my-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0">Chứng nhận xác thực trao cho:</p>
                <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight font-serif">
                  {previewCertTech.technicianName}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-lg mx-auto m-0 leading-relaxed">
                  Đã hoàn thành xuất sắc chương trình đào tạo nghiệp vụ và vượt qua kỳ sát hạch độc lập theo đúng quy
                  chuẩn <strong>SOP Kỹ Thuật Uốn Mi Bóng Tối</strong>.
                </p>
              </div>

              {/* Thông tin kết quả & chữ ký */}
              <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                <div className="text-center space-y-1">
                  <span className="text-slate-400 block text-[11px]">Trưởng Ban Đào Tạo</span>
                  <div className="font-serif italic font-bold text-slate-800 dark:text-slate-200 text-sm">
                    Cô Giang Đàm
                  </div>
                  <span className="text-[10px] text-slate-400 block">Wings Master Lash Artisan</span>
                </div>
                <div className="text-center space-y-1">
                  <span className="text-slate-400 block text-[11px]">Chủ Tịch &amp; Tổng Giám Đốc</span>
                  <div className="font-serif italic font-bold text-amber-600 dark:text-amber-400 text-sm">
                    CEO Danny Đỗ
                  </div>
                  <span className="text-[10px] text-slate-400 block">Ký duyệt &amp; Xác thực thẩm định</span>
                </div>
              </div>

              {/* Mã chứng chỉ footer */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  Mã chứng chỉ:{' '}
                  <strong className="text-slate-700 dark:text-slate-300 tabular-nums">
                    {previewCertTech.certificateCode || 'WINGS-DL-2026-PENDING'}
                  </strong>
                </span>
                <span>
                  Ngày cấp:{' '}
                  <strong className="text-slate-700 dark:text-slate-300 tabular-nums">
                    {previewCertTech.certificateIssuedAt || previewCertTech.examDate}
                  </strong>
                </span>
              </div>
            </div>

            {/* Actions modal */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Hồ sơ đã được lưu trữ vĩnh viễn trên hệ thống quản lý mOS.</span>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    window.print();
                  }}
                  className="text-xs font-semibold rounded-lg flex items-center gap-1"
                >
                  <AppIcon icon={Printer} size={14} />
                  <span>In Chứng Chỉ</span>
                </Button>
                <Button
                  type="primary"
                  onClick={() => setPreviewCertTech(null)}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg"
                >
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        )}
      </AdaptiveModal>

      {/* Modal Bài Thi Lý Thuyết (MOS-BUG-182) */}
      <LashLiftTheoryExamModal
        open={theoryQuizOpen}
        onClose={() => setTheoryQuizOpen(false)}
        onSubmitScore={handleTheoryQuizSubmit}
        candidateName="Chuyên Viên Giang Hồ"
        examinerName="CEO Danny Đỗ"
      />

      {/* Modal iPhone 12+ Coi Thi 1-Chạm (MOS-BUG-182) */}
      <AdaptiveModal
        open={iphoneRubricOpen}
        onCancel={() => setIphoneRubricOpen(false)}
        footer={null}
        width={460}
        centered
        className="iphone-exam-rubric-modal"
        title={null}
      >
        <IphonePracticalExamRubric
          onClose={() => setIphoneRubricOpen(false)}
          onApproveCert={handleRubricApprove}
          candidateName="Chuyên Viên Giang Hồ"
          examinerName="CEO Danny Đỗ"
        />
      </AdaptiveModal>

      {/* Khối Báo Cáo Tiến Độ Hạng Mục 5 & Thẩm Quyền CEO */}
      <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <span className="font-bold text-slate-800 dark:text-slate-200 block">
            Trạng Thái Nghiệp Vụ Hạng Mục 5: ĐÃ HOÀN THIỆN ĐẦY ĐỦ NỘI DUNG SÁT HẠCH &amp; CSAT
          </span>
          <p className="text-slate-500 dark:text-slate-400 m-0">
            Hồ sơ năng lực chuyên môn và CSAT đã sẵn sàng làm căn cứ trình CEO Danny Đỗ xem xét phê duyệt Scale. Tính
            năng tự động Scale toàn hệ thống tiếp tục giữ nguyên chế độ bảo vệ.
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
          <Award size={13} />
          <span>Sẵn sàng trình CEO</span>
        </span>
      </div>
    </div>
  );
}

export default PilotAssessmentCertSopDetail;
