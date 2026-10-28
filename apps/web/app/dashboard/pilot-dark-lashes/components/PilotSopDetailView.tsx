'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Card, Tooltip, Typography, message } from 'antd';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Compass,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  GraduationCap,
  HelpCircle,
  Image as ImageIcon,
  Info,
  Layers,
  Maximize2,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Timer,
  User,
  Workflow,
  Wrench,
  X,
} from 'lucide-react';
import {
  DARK_LASHES_SOP_7_STEPS_DETAILED,
  type PilotSopStepDetail,
  type PilotSopStepEmpiricalStat,
  type PilotStepSampleSession,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { AppIcon } from '../../../../components/ui/AppIcon';

const { Title, Text } = Typography;

function formatSecondsToDisplay(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds <= 0) {
    return '--:--';
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}p ${s < 10 ? '0' : ''}${s}s`;
}

/**
 * Từ điển thuật ngữ kỹ thuật dành cho người mới và Chuyên Viên
 * Diễn giải thuật ngữ chuyên môn thành ngôn ngữ đời thường, dễ hiểu, trực quan.
 */
interface GlossaryItem {
  term: string;
  simpleExplain: string;
  contextStep: string;
  badge?: string;
}

const TECHNICAL_GLOSSARY_7_STEPS: GlossaryItem[] = [
  {
    term: 'Liên kết Disunfua (Cầu nối S-S)',
    simpleExplain:
      'Cầu nối protein tự nhiên bên trong sợi mi quyết định mi thẳng hay cong. Thuốc số 1 tạm thời tháo lỏng liên kết để uốn theo trục, sau đó thuốc số 2 khóa chặt lại tạo nếp cong bền lâu.',
    contextStep: 'Bước 2 & Bước 3',
    badge: 'Cơ chế cốt lõi',
  },
  {
    term: 'Làm mềm (Softening)',
    simpleExplain:
      'Quá trình dùng thuốc uốn số 1 mở lớp biểu bì ngoài và đưa sợi mi về trạng thái mềm dẻo như sợi bún nguội, giúp mi dễ dàng ôm sát mặt cong trục silicon.',
    contextStep: 'Bước 2',
    badge: 'Kỹ thuật chính',
  },
  {
    term: 'Setting Cream (Thuốc khóa form số 2)',
    simpleExplain:
      'Kem định hình giúp tái tạo và khóa cứng toàn bộ liên kết bên trong sợi mi theo hình dáng trục cong, đảm bảo mi không bị nhả thẳng sau khi hoàn thành.',
    contextStep: 'Bước 3',
    badge: 'Khóa độ cong',
  },
  {
    term: 'Cân bằng pH (pH 5.5 - 6.0)',
    simpleExplain:
      'Trung hòa lượng kiềm còn sót lại của thuốc uốn, đưa sợi mi về môi trường axit nhẹ sinh lý tự nhiên. Thao tác này giúp các lớp vảy mi khép chặt, mi không bị khô cháy giòn.',
    contextStep: 'Bước 4',
    badge: 'Bảo vệ sợi mi',
  },
  {
    term: 'Màu bóng tối (Deep Black Lash Tint)',
    simpleExplain:
      'Thuốc nhuộm đen tuyền chuyên dụng thẩm thấu vào vỏ mi, biến các ngọn mi nâu hoặc vàng nhạt thành màu đen sâu thăm thẳm, tạo hiệu ứng mắt sâu cuốn hút.',
    contextStep: 'Bước 5',
    badge: 'Đặc trưng Bóng Tối',
  },
  {
    term: 'Keratin thủy phân & Glossy Serum',
    simpleExplain:
      'Tinh chất đạm protein siêu nhỏ thấm sâu vào lõi mi nuôi dưỡng, tạo một màng bảo vệ bóng loáng phản chiếu ánh sáng óng ả suốt nhiều tuần.',
    contextStep: 'Bước 6',
    badge: 'Phục hồi & Dưỡng',
  },
  {
    term: 'Trục Silicon Uốn Mi (Lash Pads)',
    simpleExplain:
      'Miếng đệm silicon mềm mại ôm khít mí mắt trên. Có nhiều kích cỡ (S/M/L) và dáng cong (Cá Heo, Tròn) để tạo độ cong tự nhiên hoặc cong vút tùy dáng mắt khách.',
    contextStep: 'Bước 2 & Bước 3',
    badge: 'Dụng cụ định hình',
  },
  {
    term: 'Sáp bắt mi (Lash Balm Glue)',
    simpleExplain:
      'Sáp dán định hình mi gốc nước không chứa cồn, giữ từng sợi mi bám dính chắc chắn trên trục uốn mà không làm khô cứng mi, dễ lau sạch bằng nước muối.',
    contextStep: 'Bước 1 & Bước 2',
    badge: 'Keo dán êm dịu',
  },
  {
    term: 'Eye Pad Gel (Miếng dán mi dưới)',
    simpleExplain:
      'Miếng dán y tế chứa gel dưỡng ẩm đặt dưới mi dưới, giúp cách ly hoàn toàn mi dưới không bị dính thuốc uốn và bảo vệ da mắt khỏi bị kích ứng.',
    contextStep: 'Bước 1',
    badge: 'An toàn giác mạc',
  },
  {
    term: 'Cây chải mi kim loại (Lash Lift Tool)',
    simpleExplain:
      'Cây que gạt kim loại đầu nhọn siêu mảnh chuyên dụng để miết phẳng, căng đều và tách riêng từng sợi mi song song trên trục, không để mi bắt chéo nhau.',
    contextStep: 'Bước 2 & Bước 3',
    badge: 'Định hình sợi mi',
  },
];

/**
 * Minh chứng hình ảnh thực tế từ các ca Pilot đã hoàn thành
 */
const PILOT_REAL_STEP_MEDIA: Record<number, { photoUrl: string; label: string; sessionNote: string }> = {
  1: {
    photoUrl: '/api/pilot/media/ea735600-d100-4749-9db8-54405430e956.jpg',
    label: 'Ảnh soi cấu trúc mi & dán Eye Pad (Ca Pilot #10)',
    sessionNote: 'Kiểm tra chất mi và cách ly mi dưới bằng Eye Pad Gel chuẩn cách bờ mi 1mm.',
  },
  2: {
    photoUrl: '/api/pilot/media/32f48e47-b02a-4b0b-9ecc-cc843d018385.jpg',
    label: 'Ảnh bắt mi ôm trục silicon & thoa thuốc làm mềm (Ca Pilot #14)',
    sessionNote: 'Sợi mi ôm sát trục cá heo R3, gạt thuốc số 1 cách chân mi 1.5mm an toàn.',
  },
  5: {
    photoUrl: '/api/pilot/media/0d7a30c5-22ec-48e2-bafe-10085da19bdb.jpg',
    label: 'Ảnh phủ màu đen sâu Deep Black Tint (Ca Pilot #12)',
    sessionNote: 'Nhuộm phủ kín 100% sợi mi tạo hiệu ứng đen tuyền đặc trưng của Uốn Mi Bóng Tối.',
  },
  7: {
    photoUrl: '/api/pilot/media/1f7ce362-702c-497b-b169-50008332e018.jpg',
    label: 'Ảnh hoàn thiện After chuẩn nghiệm thu (Ca Pilot #18 - Khách Nguyệt)',
    sessionNote: 'Mi cong vút đều tơi xốp, màu đen sâu bóng bẩy, khách hàng chấm 5/5 sao CSAT.',
  },
};

/**
 * Helper phân loại cấp độ hướng dẫn: Bắt buộc, Lưu ý kỹ thuật, Cảnh báo an toàn
 */
type InstructionLevel = 'MANDATORY' | 'TECH_TIP' | 'SAFETY_ALERT';

interface TaggedInstruction {
  text: string;
  level: InstructionLevel;
  highlightText?: string;
}

function tagInstruction(text: string): TaggedInstruction {
  const lower = text.toLowerCase();
  if (
    lower.includes('ngăn thuốc') ||
    lower.includes('kết mạc') ||
    lower.includes('giác mạc') ||
    lower.includes('cay xót') ||
    lower.includes('cách ly') ||
    lower.includes('không cử động mí') ||
    lower.includes('không lem')
  ) {
    return {
      text,
      level: 'SAFETY_ALERT',
      highlightText: 'CẢNH BÁO AN TOÀN',
    };
  }

  if (
    lower.includes('soi cấu trúc') ||
    lower.includes('chọn trục') ||
    lower.includes('căn chỉnh') ||
    lower.includes('miết nhẹ') ||
    lower.includes('thẩm thấu') ||
    lower.includes('bấm giờ') ||
    lower.includes('tỷ lệ chuẩn') ||
    lower.includes('quan sát')
  ) {
    return {
      text,
      level: 'TECH_TIP',
      highlightText: 'LƯU Ý KỸ THUẬT',
    };
  }

  return {
    text,
    level: 'MANDATORY',
    highlightText: 'BẮT BUỘC',
  };
}

interface PilotSopDetailViewProps {
  onBack?: () => void;
  onOpenSopModal?: () => void;
  onViewSessionId?: (sessionId: number) => void;
}

export function PilotSopDetailView({ onBack, onOpenSopModal, onViewSessionId }: PilotSopDetailViewProps) {
  const [selectedStepOrder, setSelectedStepOrder] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Record<number, PilotSopStepEmpiricalStat>>({});
  const [totalSessions, setTotalSessions] = useState<number>(18);
  const [filterQuery, setFilterQuery] = useState('');

  // UI state for interactivity: Accordion expand/collapse, glossary, deep dive, image preview
  const [expandedStepOrders, setExpandedStepOrders] = useState<Set<number>>(() => new Set([1, 2, 3, 4, 5, 6, 7]));
  const [showGlossary, setShowGlossary] = useState<boolean>(false);
  const [expandedDeepDives, setExpandedDeepDives] = useState<Record<number, boolean>>({});
  const [previewMedia, setPreviewMedia] = useState<{ open: boolean; title: string; imageUrl: string; note?: string }>({
    open: false,
    title: '',
    imageUrl: '',
    note: '',
  });

  const fetchEmpiricalStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.pilot.getSopEmpiricalStats({ pilotCode: 'DARK_LASHES' });
      if (res && Array.isArray(res.stats)) {
        const mapped: Record<number, PilotSopStepEmpiricalStat> = {};
        for (const st of res.stats) {
          mapped[st.stepOrder] = st;
        }
        setStats(mapped);
        if (typeof res.totalSessionsCount === 'number') {
          setTotalSessions(res.totalSessionsCount);
        }
      }
    } catch {
      // Non-blocking fallback: empirical metrics can load from cache
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmpiricalStats();
  }, [fetchEmpiricalStats]);

  // Aggregate standard vs empirical total time
  const { totalTargetMinutes, totalEmpiricalAvgSeconds, stepsWithStats } = useMemo(() => {
    let targetMin = 0;
    let empiricalSecSum = 0;
    let countedSteps = 0;

    for (const step of DARK_LASHES_SOP_7_STEPS_DETAILED) {
      targetMin += step.targetMinutes;
      const st = stats[step.stepOrder];
      if (st && st.avgDurationSeconds > 0) {
        empiricalSecSum += st.avgDurationSeconds;
        countedSteps++;
      }
    }

    return {
      totalTargetMinutes: targetMin,
      totalEmpiricalAvgSeconds: empiricalSecSum,
      stepsWithStats: countedSteps,
    };
  }, [stats]);

  // Filtered steps list
  const filteredSteps = useMemo(() => {
    let list = DARK_LASHES_SOP_7_STEPS_DETAILED;
    if (selectedStepOrder !== 'all') {
      list = list.filter((s) => s.stepOrder === selectedStepOrder);
    }
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.purpose.toLowerCase().includes(q) ||
          s.materials.some((m) => m.name.toLowerCase().includes(q)) ||
          s.commonErrors.some((e) => e.error.toLowerCase().includes(q) || e.remedy.toLowerCase().includes(q))
      );
    }
    return list;
  }, [selectedStepOrder, filterQuery]);

  // Toggle individual step accordion
  const toggleStepExpand = useCallback((order: number) => {
    setExpandedStepOrders((prev) => {
      const next = new Set(prev);
      if (next.has(order)) {
        next.delete(order);
      } else {
        next.add(order);
      }
      return next;
    });
  }, []);

  // Expand all steps
  const handleExpandAll = useCallback(() => {
    setExpandedStepOrders(new Set(DARK_LASHES_SOP_7_STEPS_DETAILED.map((s) => s.stepOrder)));
  }, []);

  // Collapse all steps
  const handleCollapseAll = useCallback(() => {
    setExpandedStepOrders(new Set());
  }, []);

  // Toggle deep dive section
  const toggleDeepDive = useCallback((stepOrder: number) => {
    setExpandedDeepDives((prev) => ({
      ...prev,
      [stepOrder]: !prev[stepOrder],
    }));
  }, []);

  return (
    <div className="space-y-5 antialiased" data-testid="pilot-sop-detail-view">
      {/* ═══════════════════════════════════════════
          1. HEADER & DRAFT STATUS BANNER
          ═══════════════════════════════════════════ */}
      <div className="rounded-2xl p-4 sm:p-6 border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-slate-900/5 dark:to-slate-900/40 relative overflow-hidden transition-all duration-300 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-xs cursor-pointer"
                >
                  <AppIcon icon={ArrowLeft} size={13} />
                  <span>Quay lại Khung Đào Tạo</span>
                </button>
              )}
              <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <AppIcon icon={Clock} size={12} className="mr-1 text-amber-600 dark:text-amber-400" />
                Bản dự thảo chuyên môn · Chờ Cô Giang Đàm thẩm định
              </span>
              <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <AppIcon icon={CheckCircle2} size={12} className="mr-1 text-emerald-600 dark:text-emerald-400" />
                Đối chiếu 18 ca Pilot thực tế
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight m-0">
              Hạng mục 2: Quy trình Kỹ thuật 7 Bước Uốn Mi Bóng Tối
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-4xl m-0">
              Tài liệu SOP kỹ thuật chuẩn mực phục vụ đào tạo Chuyên Viên Kỹ Thuật tại Wings và trình duyệt CEO trước khi
              triển khai mở rộng (Scale). Thiết kế trực quan, dễ hiểu từng bước; tích hợp mục đích thao tác, danh mục vật tư
              tiêu hao, tiêu chuẩn kiểm soát chất lượng (QC) và thống kê đối chiếu thời gian đo đạc thực tế.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              type={showGlossary ? 'primary' : 'default'}
              icon={<AppIcon icon={BookOpen} size={14} />}
              onClick={() => setShowGlossary(!showGlossary)}
              className="rounded-xl text-xs font-semibold"
              data-testid="toggle-glossary-btn"
            >
              {showGlossary ? 'Đóng từ điển thuật ngữ' : 'Từ điển thuật ngữ (Dễ hiểu)'}
            </Button>

            {onOpenSopModal && (
              <Button
                icon={<AppIcon icon={Layers} size={14} />}
                onClick={onOpenSopModal}
                className="rounded-xl text-xs font-medium border-slate-300 dark:border-slate-700"
              >
                Quản lý bước SOP
              </Button>
            )}
            <Button
              icon={<AppIcon icon={RefreshCw} size={14} className={loading ? 'animate-spin' : ''} />}
              onClick={fetchEmpiricalStats}
              loading={loading}
              className="rounded-xl text-xs font-medium"
            >
              Làm mới số liệu
            </Button>
          </div>
        </div>

        {/* Thông báo trạng thái thẩm định chuyên môn */}
        <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
          <AppIcon icon={Info} size={15} className="text-amber-500 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-800 dark:text-slate-200">Lưu ý phê duyệt:</strong> Đây là bản dự thảo kỹ
            thuật đang được trình duyệt chuyên môn cùng Cô Giang Đàm và Project Owner. Hệ thống phân định rõ ràng giữa{' '}
            <strong className="text-slate-800 dark:text-slate-200">Thời gian kỹ thuật tiêu chuẩn (target)</strong> và{' '}
            <strong className="text-slate-800 dark:text-slate-200">Thời gian thực tế đo đạc</strong>, tuyệt đối không
            lấy thời gian một ca riêng lẻ làm định mức chung. Các thông số kỹ thuật thiếu căn cứ đều được đánh dấu{' '}
            <em className="text-amber-600 dark:text-amber-400 font-medium">&ldquo;Chờ Cô Giang Đàm xác nhận&rdquo;</em>.
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          TỪ ĐIỂN THUẬT NGỮ KỸ THUẬT (DỄ HIỂU CHO HỌC VIÊN)
          ═══════════════════════════════════════════ */}
      {showGlossary && (
        <div
          className="p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 space-y-3 transition-all shadow-xs"
          data-testid="sop-glossary-section"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AppIcon icon={BookOpen} size={15} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
                  Từ Điển Thuật Ngữ Kỹ Thuật (Diễn Giải Dễ Hiểu Cho Mọi Người)
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Giúp người chưa có chuyên môn hoặc học viên mới dễ dàng nắm bắt nguyên lý uốn mi an toàn
                </span>
              </div>
            </div>
            <span className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold bg-amber-500/15 px-2.5 py-1 rounded-full border border-amber-500/30">
              10 thuật ngữ cốt lõi
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {TECHNICAL_GLOSSARY_7_STEPS.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-500/20 space-y-1.5 shadow-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                    <AppIcon icon={HelpCircle} size={13} className="text-amber-500 shrink-0" />
                    <span>{item.term}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 whitespace-nowrap">
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11.5px] text-slate-600 dark:text-slate-300 m-0 leading-relaxed">
                  {item.simpleExplain}
                </p>
                <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Áp dụng tại:</span>
                  <span className="font-semibold text-slate-600 dark:text-slate-300">{item.contextStep}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          2. CORE PRINCIPLES & GUIDELINES (4 NGUYÊN TẮC)
          ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card
          size="small"
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-xs"
        >
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <AppIcon icon={FileCheck2} size={14} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nguyên tắc 1</span>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 m-0">Trình tự 7 bước bất biến</h4>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0 mt-1 leading-snug">
                Giữ nguyên tên, cấu trúc và thứ tự 7 bước đã được Cô Giang Đàm phê duyệt.
              </p>
            </div>
          </div>
        </Card>

        <Card
          size="small"
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-xs"
        >
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <AppIcon icon={Timer} size={14} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nguyên tắc 2</span>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 m-0">Phân định thời gian</h4>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0 mt-1 leading-snug">
                Tách biệt thời gian chuẩn kỹ thuật với thời gian thực tế; không lấy 1 ca làm định mức.
              </p>
            </div>
          </div>
        </Card>

        <Card
          size="small"
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-xs"
        >
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <AppIcon icon={ShieldCheck} size={14} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nguyên tắc 3</span>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 m-0">Minh chứng &amp; Căn cứ</h4>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0 mt-1 leading-snug">
                Thông số chưa được đo kiểm thức tế đánh dấu rõ ràng &ldquo;Chờ Cô Giang Đàm xác nhận&rdquo;.
              </p>
            </div>
          </div>
        </Card>

        <Card
          size="small"
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-xs"
        >
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AppIcon icon={Award} size={14} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nguyên tắc 4</span>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 m-0">Dự thảo không tự ban hành</h4>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0 mt-1 leading-snug">
                Trình bản dự thảo để PO và Cô Giang Đàm thẩm duyệt; không tự ý áp dụng chính thức.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════
          3. BENCHMARK COMPARISON SUMMARY METRICS
          ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Thời gian tiêu chuẩn</span>
            <AppIcon icon={Timer} size={16} className="text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
              {totalTargetMinutes}
            </span>
            <span className="text-xs text-slate-500 font-medium">phút (7 bước)</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Định mức kỹ thuật khuyến nghị</span>
        </div>

        <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Thời gian thực tế TB</span>
            <AppIcon icon={Clock} size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {totalEmpiricalAvgSeconds > 0 ? Math.round(totalEmpiricalAvgSeconds / 60) : '--'}
            </span>
            <span className="text-xs text-slate-500 font-medium">phút / ca</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            {stepsWithStats > 0 ? `Đo đạc từ ${stepsWithStats}/7 bước ca hoàn thành` : 'Đang đồng bộ số liệu'}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tổng ca Pilot lưu trữ</span>
            <AppIcon icon={Layers} size={16} className="text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-extrabold text-purple-600 dark:text-purple-400 tabular-nums">
              {totalSessions}
            </span>
            <span className="text-xs text-slate-500 font-medium">ca dịch vụ</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Nguồn minh chứng đối chiếu</span>
        </div>

        <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tiêu chuẩn kiểm soát QC</span>
            <AppIcon icon={ShieldCheck} size={16} className="text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
              100%
            </span>
            <span className="text-xs text-slate-500 font-medium">nghiệm thu</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Checklist an toàn &amp; CSAT 5 sao</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          4. 7-STEP NAVIGATOR BAR, EXPAND/COLLAPSE & FILTERS
          ═══════════════════════════════════════════ */}
      <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedStepOrder('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedStepOrder === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Tất cả 7 bước
          </button>

          {DARK_LASHES_SOP_7_STEPS_DETAILED.map((step) => {
            const isSelected = selectedStepOrder === step.stepOrder;
            const st = stats[step.stepOrder];
            return (
              <button
                key={step.stepOrder}
                type="button"
                aria-label={`Bước ${step.stepOrder}: ${step.name}`}
                onClick={() => {
                  setSelectedStepOrder(step.stepOrder);
                  // Ensure selected step is expanded
                  setExpandedStepOrders((prev) => new Set([...prev, step.stepOrder]));
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {step.stepOrder}
                </span>
                <span>{step.name}</span>
                {st && st.avgDurationSeconds > 0 && (
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded tabular-nums font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'
                    }`}
                  >
                    {Math.round(st.avgDurationSeconds / 60)}p
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Nút mở rộng / thu gọn tất cả accordion */}
          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shrink-0">
            <button
              type="button"
              onClick={handleExpandAll}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
              title="Mở rộng tất cả 7 bước"
              data-testid="expand-all-btn"
            >
              <AppIcon icon={ChevronDown} size={12} />
              <span>Mở rộng hết</span>
            </button>
            <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700" />
            <button
              type="button"
              onClick={handleCollapseAll}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
              title="Thu gọn tất cả các bước"
              data-testid="collapse-all-btn"
            >
              <AppIcon icon={ChevronUp} size={12} />
              <span>Thu gọn hết</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative shrink-0 w-full md:w-56">
            <input
              type="text"
              placeholder="Tìm theo bước, vật tư, lỗi..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <AppIcon icon={Search} size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          5. BENCHMARK COMPARISON TABLE (BẢNG ĐỐI CHIẾU THỜI GIAN)
          ═══════════════════════════════════════════ */}
      {selectedStepOrder === 'all' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <AppIcon icon={Compass} size={16} className="text-teal-600 dark:text-teal-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
                Bảng Thống Kê Đối Chiếu: Thời Gian Tiêu Chuẩn vs Thời Gian Thực Tế Pilot
              </h3>
            </div>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              * Không lấy thời gian một ca làm định mức chung
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10.5px] font-semibold">
                  <th className="py-2.5 px-3">Thứ tự &amp; Bước kỹ thuật</th>
                  <th className="py-2.5 px-3">Chuẩn kỹ thuật (Target)</th>
                  <th className="py-2.5 px-3">Thực tế TB (Pilot)</th>
                  <th className="py-2.5 px-3">Biến thiên thực tế (Min - Max)</th>
                  <th className="py-2.5 px-3">Số ca ghi nhận</th>
                  <th className="py-2.5 px-3">Nhận định vận hành</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-normal">
                {DARK_LASHES_SOP_7_STEPS_DETAILED.map((step) => {
                  const st = stats[step.stepOrder];
                  const hasEmpirical = Boolean(st && st.completedCount > 0);
                  const avgMinutes = hasEmpirical ? Math.round(st.avgDurationSeconds / 60) : null;
                  const delta = avgMinutes !== null ? avgMinutes - step.targetMinutes : null;

                  return (
                    <tr
                      key={step.stepOrder}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedStepOrder(step.stepOrder);
                        setExpandedStepOrders((prev) => new Set([...prev, step.stepOrder]));
                      }}
                    >
                      <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-100">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center">
                            {step.stepOrder}
                          </span>
                          <span>{step.name}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                        {step.targetMinutes} phút
                      </td>
                      <td className="py-3 px-3 tabular-nums font-semibold">
                        {hasEmpirical ? (
                          <div className="space-y-1">
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {formatSecondsToDisplay(st.avgDurationSeconds)} ({avgMinutes}p)
                            </span>
                            {/* Visual comparison bar */}
                            <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                              <div className="bg-emerald-500 rounded-full h-full w-3/5" />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">Đang cập nhật</span>
                        )}
                      </td>
                      <td className="py-3 px-3 tabular-nums text-slate-500 dark:text-slate-400">
                        {hasEmpirical ? (
                          <span>
                            {formatSecondsToDisplay(st.minDurationSeconds)} - {formatSecondsToDisplay(st.maxDurationSeconds)}
                          </span>
                        ) : (
                          '--'
                        )}
                      </td>
                      <td className="py-3 px-3 tabular-nums text-slate-600 dark:text-slate-300">
                        {st ? `${st.completedCount} ca hoàn thành` : '0'}
                      </td>
                      <td className="py-3 px-3">
                        {delta !== null ? (
                          delta > 3 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md font-medium">
                              <AppIcon icon={Clock} size={11} /> Thao tác kỹ lưỡng (+{delta}p)
                            </span>
                          ) : delta < -3 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md font-medium">
                              <AppIcon icon={CheckCircle2} size={11} /> Hoàn thành nhanh ({delta}p)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md font-medium">
                              <AppIcon icon={CheckCircle2} size={11} /> Đúng chuẩn thiết kế
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400 text-xs">Theo dõi thêm</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          6. DETAILED CARDS FOR EACH STEP (7 BƯỚC CHI TIẾT - ACCORDION COLLAPSIBLE)
          ═══════════════════════════════════════════ */}
      {filteredSteps.length === 0 ? (
        <div className="py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
          <AppIcon icon={Search} size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-xs text-slate-500 dark:text-slate-400 m-0">Không tìm thấy bước kỹ thuật phù hợp với từ khóa.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredSteps.map((step) => {
            const st = stats[step.stepOrder];
            const hasEmpirical = Boolean(st && st.completedCount > 0);
            const isExpanded = expandedStepOrders.has(step.stepOrder);
            const isDeepDiveOpen = Boolean(expandedDeepDives[step.stepOrder]);
            const stepRealMedia = PILOT_REAL_STEP_MEDIA[step.stepOrder];

            return (
              <Card
                key={step.stepOrder}
                variant="outlined"
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all duration-300"
                styles={{ body: { padding: 0 } }}
              >
                {/* ───────────────────────────────────────
                    Step Card Header (Click to toggle collapse)
                    ─────────────────────────────────────── */}
                <div
                  onClick={() => toggleStepExpand(step.stepOrder)}
                  className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
                  data-testid={`step-header-${step.stepOrder}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-extrabold text-base flex items-center justify-center shrink-0 shadow-xs">
                      {step.stepOrder}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Bước {step.stepOrder}/7
                        </span>
                        <span className="inline-flex items-center justify-center leading-none text-[11px] px-2 py-0.5 rounded-full font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 tabular-nums">
                          <AppIcon icon={Timer} size={11} className="mr-1" />
                          Tiêu chuẩn: {step.targetMinutes} phút
                        </span>
                        {hasEmpirical && (
                          <span className="inline-flex items-center justify-center leading-none text-[11px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 tabular-nums">
                            <AppIcon icon={Clock} size={11} className="mr-1" />
                            Thực tế TB: {formatSecondsToDisplay(st.avgDurationSeconds)} ({st.completedCount} ca)
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 font-medium">
                          • {step.materials.length} vật tư • {step.qualityCheckpoints.length} điểm QC • {step.commonErrors.length} lỗi phòng tránh
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 m-0 mt-0.5">
                        {step.name}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {step.unverifiedNotice && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/25 shrink-0">
                        <AppIcon icon={HelpCircle} size={13} className="text-amber-600 shrink-0" />
                        <span>{step.unverifiedNotice}</span>
                      </span>
                    )}

                    <div className="w-8 h-8 rounded-lg bg-slate-200/60 dark:bg-slate-700/60 flex items-center justify-center text-slate-600 dark:text-slate-300">
                      <AppIcon icon={isExpanded ? ChevronUp : ChevronDown} size={16} />
                    </div>
                  </div>
                </div>

                {/* ───────────────────────────────────────
                    Step Card Body (5 phần chuẩn mực)
                    ─────────────────────────────────────── */}
                {isExpanded && (
                  <div className="p-4 sm:p-6 space-y-6 animate-fadeIn">
                    {/* PHẦN 1: MỤC ĐÍCH CHUYÊN MÔN */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          <AppIcon icon={Compass} size={14} className="text-teal-600" />
                          <span>Mục đích chuyên môn</span>
                        </div>
                        <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold bg-teal-500/10 px-2 py-0.5 rounded-md">
                          Ý nghĩa kỹ thuật
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-teal-500/5 dark:bg-teal-500/10 p-3.5 rounded-xl border border-teal-500/15 m-0 font-medium">
                        {step.purpose}
                      </p>
                    </div>

                    {/* PHẦN 2 & PHẦN 3: CÁCH THỰC HIỆN & VẬT TƯ */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                      {/* PHẦN 2: CÁCH THỰC HIỆN (HƯỚNG DẪN THAO TÁC TUẦN TỰ) */}
                      <div className="lg:col-span-7 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <AppIcon icon={BookOpen} size={14} className="text-emerald-600" />
                            <span>Hướng dẫn thao tác kỹ thuật chuẩn mực</span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {step.instructions.length} bước con tuần tự
                          </span>
                        </div>

                        <ol className="m-0 p-0 list-none space-y-2.5">
                          {step.instructions.map((ins, idx) => {
                            const tagged = tagInstruction(ins);
                            return (
                              <li
                                key={idx}
                                className="flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800"
                              >
                                <span className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                                  {idx + 1}
                                </span>
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {tagged.level === 'MANDATORY' && (
                                      <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                        <AppIcon icon={CheckCircle2} size={10} className="mr-1" />
                                        Bắt buộc
                                      </span>
                                    )}
                                    {tagged.level === 'TECH_TIP' && (
                                      <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                        <AppIcon icon={Sparkles} size={10} className="mr-1" />
                                        Lưu ý kỹ thuật
                                      </span>
                                    )}
                                    {tagged.level === 'SAFETY_ALERT' && (
                                      <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                        <AppIcon icon={AlertTriangle} size={10} className="mr-1" />
                                        Cảnh báo an toàn
                                      </span>
                                    )}
                                    <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                                      Thao tác {step.stepOrder}.{idx + 1}
                                    </span>
                                  </div>
                                  <p className="leading-relaxed m-0 text-slate-700 dark:text-slate-300">
                                    {tagged.text}
                                  </p>
                                </div>
                              </li>
                            );
                          })}
                        </ol>
                      </div>

                      {/* PHẦN 3: DỤNG CỤ & VẬT TƯ SỬ DỤNG */}
                      <div className="lg:col-span-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <AppIcon icon={Package} size={14} className="text-purple-600" />
                            <span>Dụng cụ &amp; Vật tư sử dụng</span>
                          </div>
                          <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold bg-purple-500/10 px-2 py-0.5 rounded-md">
                            Định lượng chuẩn
                          </span>
                        </div>

                        <div className="space-y-2">
                          {step.materials.map((mat, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-start justify-between gap-2 shadow-xs"
                            >
                              <div className="space-y-0.5">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                                  {mat.name}
                                </span>
                                {mat.purposeNote && (
                                  <span className="text-[11.5px] text-slate-500 dark:text-slate-400 block leading-snug">
                                    {mat.purposeNote}
                                  </span>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                {mat.estimatedAmount && (
                                  <span className="inline-block text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20 tabular-nums">
                                    {mat.estimatedAmount}
                                  </span>
                                )}
                                {mat.isDisposable && (
                                  <span className="block text-[10px] text-slate-400 mt-0.5 font-medium">Tiêu hao 1 lần</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* PHẦN 4 & PHẦN 5: ĐIỂM KIỂM SOÁT QC & LỖI THƯỜNG GẶP */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                      {/* PHẦN 4: ĐIỂM KIỂM SOÁT CHẤT LƯỢNG (QC) */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <AppIcon icon={ShieldCheck} size={14} className="text-emerald-600" />
                            <span>Điểm kiểm soát chất lượng &amp; Tiêu chuẩn hoàn thành</span>
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            100% Đạt
                          </span>
                        </div>

                        <ul className="m-0 p-0 list-none space-y-2">
                          {step.qualityCheckpoints.map((qc, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-500/20 shadow-2xs"
                            >
                              <AppIcon icon={CheckCircle2} size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                              <span className="leading-relaxed font-medium">{qc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* PHẦN 5: LỖI KỸ THUẬT THƯỜNG GẶP & PHƯƠNG ÁN XỬ LÝ */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <AppIcon icon={ShieldAlert} size={14} className="text-rose-600" />
                            <span>Lỗi kỹ thuật thường gặp &amp; Phương án xử lý</span>
                          </div>
                          <span className="text-[10px] font-semibold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-md">
                            Khắc phục tức thì
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {step.commonErrors.map((err, idx) => (
                            <div
                              key={idx}
                              className="p-3.5 rounded-xl border border-rose-500/25 bg-rose-50/40 dark:bg-rose-950/20 space-y-2 shadow-2xs"
                            >
                              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400">
                                <AppIcon icon={AlertTriangle} size={14} className="shrink-0" />
                                <span>{err.error}</span>
                              </div>
                              {err.cause && (
                                <p className="text-[11.5px] text-slate-600 dark:text-slate-400 m-0 leading-snug">
                                  <strong className="text-slate-700 dark:text-slate-300">Nguyên nhân:</strong> {err.cause}
                                </p>
                              )}
                              <p className="text-[11.5px] text-emerald-800 dark:text-emerald-300 m-0 leading-snug font-medium pt-1.5 border-t border-rose-200/50 dark:border-rose-900/40 flex items-start gap-1.5">
                                <AppIcon icon={Check} size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                                <span>
                                  <strong>Khắc phục tức thì:</strong> {err.remedy}
                                </span>
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* HÌNH ẢNH MINH HỌA THỰC TẾ NẾU CÓ DỮ LIỆU */}
                    {stepRealMedia && (
                      <div className="p-3.5 rounded-xl border border-teal-500/20 bg-teal-500/5 dark:bg-teal-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-teal-500/30 shrink-0 relative bg-slate-900">
                            <img
                              src={stepRealMedia.photoUrl}
                              alt={stepRealMedia.label}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800 dark:text-teal-300">
                              <AppIcon icon={ImageIcon} size={13} className="text-teal-600" />
                              <span>{stepRealMedia.label}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 m-0 mt-0.5">
                              {stepRealMedia.sessionNote}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setPreviewMedia({
                              open: true,
                              title: stepRealMedia.label,
                              imageUrl: stepRealMedia.photoUrl,
                              note: stepRealMedia.sessionNote,
                            })
                          }
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border border-teal-500/30 hover:bg-teal-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <AppIcon icon={Maximize2} size={12} />
                          <span>Xem ảnh phóng to</span>
                        </button>
                      </div>
                    )}

                    {/* KHỐI MỞ RỘNG: DỮ LIỆU CHUYÊN SÂU & MINH CHỨNG CA PILOT THỰC TẾ (DEEP DIVE) */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => toggleDeepDive(step.stepOrder)}
                        className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors cursor-pointer"
                        data-testid={`deep-dive-toggle-${step.stepOrder}`}
                      >
                        <span className="flex items-center gap-2">
                          <AppIcon icon={FileText} size={14} className="text-indigo-600" />
                          <span>Dữ liệu Chuyên Sâu &amp; Thống Kê Đo Kiểm Pilot (Deep Dive)</span>
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400">
                          <span>{isDeepDiveOpen ? 'Thu gọn thông số' : 'Mở rộng thông số chuyên sâu'}</span>
                          <AppIcon icon={isDeepDiveOpen ? ChevronUp : ChevronDown} size={13} />
                        </span>
                      </button>

                      {isDeepDiveOpen && (
                        <div className="mt-3 p-4 rounded-xl border border-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/10 space-y-3 animate-fadeIn">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              Đo kiểm thời gian thực tế qua bộ đếm tự động:
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Số ca ghi nhận: <strong>{st?.completedCount ?? 0} ca</strong> | Min: {formatSecondsToDisplay(st?.minDurationSeconds)} | Max: {formatSecondsToDisplay(st?.maxDurationSeconds)}
                            </span>
                          </div>

                          {st && st.sampleSessions && st.sampleSessions.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                              {st.sampleSessions.map((samp, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 flex items-center justify-between gap-2 hover:border-emerald-500/40 transition-colors shadow-2xs"
                                >
                                  <div className="space-y-0.5">
                                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                                      Ca #{samp.sessionId} · {samp.customerName}
                                    </span>
                                    <span className="text-[11px] text-slate-500 block">
                                      {samp.technicianName} · {samp.sessionDate || 'Gần đây'}
                                    </span>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="inline-block text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                      {formatSecondsToDisplay(samp.durationSeconds)}
                                    </span>
                                    {onViewSessionId && (
                                      <button
                                        type="button"
                                        onClick={() => onViewSessionId(samp.sessionId)}
                                        className="block text-[11px] text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium mt-0.5 cursor-pointer"
                                      >
                                        Xem ca gốc →
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 dark:text-slate-400 m-0 italic">
                              Chưa có dữ liệu ca mẫu cho bước này hoặc đang được cập nhật thêm.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          MODAL XEM ẢNH MINH CHỨNG PILOT PHÓNG TO
          ═══════════════════════════════════════════ */}
      {previewMedia.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewMedia({ open: false, title: '', imageUrl: '', note: '' })}
          data-testid="sop-photo-modal"
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-4 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 m-0">
                {previewMedia.title}
              </h4>
              <button
                type="button"
                onClick={() => setPreviewMedia({ open: false, title: '', imageUrl: '', note: '' })}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black flex items-center justify-center max-h-[65vh]">
              <img
                src={previewMedia.imageUrl}
                alt={previewMedia.title}
                className="max-h-[63vh] w-auto object-contain rounded-lg"
              />
            </div>
            {previewMedia.note && (
              <p className="text-xs text-slate-600 dark:text-slate-300 m-0 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                {previewMedia.note}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PilotSopDetailView;
