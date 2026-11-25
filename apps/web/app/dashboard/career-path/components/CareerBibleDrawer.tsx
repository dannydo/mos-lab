'use client';

import React from 'react';
import { AdaptiveDrawer } from '../../../../components/ui/AdaptiveOverlay';
import {
  BookOpen,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Lock,
  ArrowRight,
  Eye,
  Bug,
  HandCoins,
  Heart,
} from 'lucide-react';
import Link from 'next/link';
import { calculateComboBonus, DEFAULT_CAREER_PROGRESSION_CONFIG, type CareerProgressionConfig } from '@mos-lab/shared';

export type CareerBibleTopic =
  | 'COMBO'
  | 'SERUM'
  | 'WAGE'
  | 'TIP'
  | 'ORDERS'
  | 'FIX'
  | 'TIP_RATIO'
  | 'QA'
  | 'BANANA'
  | 'HI'
  | 'CHALLENGE_30D'
  | 'PENALTY_21';

interface CareerBibleDrawerProps {
  open: boolean;
  onClose: () => void;
  topic: CareerBibleTopic | null;
  config?: CareerProgressionConfig | null;
}

interface BibleTopicContent {
  ruleId: string;
  ruleTitle: string;
  version: string;
  icon: React.ReactNode;
  subtitle: string;
  commandments: string[];
  penalty?: string;
  rewardFormula?: string;
  routeScope?: string;
}

function fmtVnd(value: number): string {
  return `${Math.round(value).toLocaleString('vi-VN')}đ`;
}

function fmtPct(ratio: number): string {
  const pct = Number((ratio * 100).toFixed(1));
  return `${Number.isInteger(pct) ? pct.toFixed(0) : pct}%`;
}

function buildCareerBibleTopics(
  rawConfig?: CareerProgressionConfig | null
): Record<CareerBibleTopic, BibleTopicContent> {
  const cfg = rawConfig || DEFAULT_CAREER_PROGRESSION_CONFIG;
  const cvl = cfg.cvToCvPlus || cfg.cvToCc;
  const cvll = cfg.cvPlusToCvPlusPlus;
  const baseWage = cfg.compensation?.hourlyWages?.cv ?? 25500;
  const cvlWage = cvl.hourlyWage ?? 27500;
  const cvllWage = cvll.hourlyWage ?? 29500;
  const minComboPct = fmtPct(cvl.minSelfComboRate ?? 0.21);
  const cvllPromoPct = fmtPct(cvll.promotionMinComboRate ?? 0.3);
  const cvllPromoMonths = cvll.promotionConsecutiveMonths ?? 2;
  const under2m = cvl.comboUnder2mBonus ?? 50000;
  const step1m = cvl.comboStepPerMillionBonus ?? 50000;
  const sample45m = calculateComboBonus(4500000, cvl);
  const serumOrig = cvl.serumOriginalPriceBonus ?? 100000;
  const serumDisc = cvl.serumDiscountedPriceBonus ?? 50000;
  const serumDeep = cvl.serumDeepDiscountPriceBonus ?? 10000;
  const serumFree = cvl.serumFreePriceBonus ?? 1000;
  const minOrders = cvl.minOrders ?? 330;
  const maxFixPct = fmtPct(cvl.maxFixRate ?? 0.015);
  const tipAbovePct = fmtPct(cvl.minTipRatioAboveShop ?? 0.05);
  const cvllTipAbovePct = fmtPct(cvll.minTipRatioAboveShop ?? 0.05);
  const qaAudits = cvl.minQaAudits ?? 4;
  const minBananas = cvl.minBananaCount ?? 20;
  const minHiPct = fmtPct(cvl.minHappinessIndex ?? 0.7);
  const trialDays = cvl.trialDurationDays ?? 30;
  const demoteMonths = cfg.maintenanceRules?.cvPlus?.consecutiveFailedMonthsToDemote ?? 2;

  return {
    COMBO: {
      ruleId: 'CV-002',
      ruleTitle: `Quy chế Thưởng Combo Nối Mi Tối Giản & Ngưỡng ${minComboPct}`,
      version: '2.9.0',
      icon: <Sparkles className="w-5 h-5 text-pink-400" />,
      subtitle: 'Thưởng hoa hồng tiền tươi tối giản hóa và cộng gộp các gói mua cùng 1 lúc',
      commandments: [
        'Áp dụng trên tập khách hàng Not Combo Live (chưa có gói combo đang hoạt động; khách có combo bán gia hạn vẫn cộng dồn).',
        `Công thức thưởng tối giản: Tổng đơn Combo < 2 Triệu = ${fmtVnd(under2m)}; mỗi 1 Triệu kế tiếp (từ 2M trở lên) = +${fmtVnd(step1m)} (gói 4.5M nhận ${fmtVnd(sample45m)}).`,
        'Quy tắc 2 Combo Mua Cùng 1 Lúc: Nếu khách mua nhiều gói Combo cùng 1 lúc trong cùng 1 đơn (order_id), bắt buộc cộng gộp tổng tiền các gói lại trước rồi mới áp công thức tính thưởng 1 lần duy nhất.',
        `Tỷ lệ tự chốt tối thiểu bắt buộc: Phải đạt từ ${minComboPct} trở lên trên tệp khách Not Combo Live (lên CVLL: đạt ${cvllPromoPct} × ${cvllPromoMonths} tháng liền; tư vấn hộ 100/0 nhận 100% Combo).`,
      ],
      rewardFormula: `< 2M = ${fmtVnd(under2m)} • Mỗi 1M kế tiếp = +${fmtVnd(step1m)} (Gói 4.5M: ${fmtVnd(sample45m)})`,
      penalty: `Nếu tỷ lệ chốt < ${minComboPct}: Khóa 100% tiền thưởng combo (0đ) và lương tăng thêm; chỉ bảo lưu 90% tip tư vấn.`,
      routeScope: '/dashboard/career-path',
    },
    SERUM: {
      ruleId: 'CV-002',
      ruleTitle: 'Quy chế Bán Cây Dưỡng Mi Yeppeum',
      version: '2.1.0',
      icon: <Sparkles className="w-5 h-5 text-teal-400" />,
      subtitle: 'Tiền tươi trao tay cây nào nhận ngay cây đó (CVLL tư vấn hộ nhận 100%)',
      commandments: [
        `Định mức khuyến khích: Tự tư vấn bán tối thiểu ${cvl.expectedSerumsPerWeek ?? 1} cây dưỡng mi/tuần.`,
        `Tiền tươi trao tay theo 4 nấc thang: Giá gốc 1.1M nhận ${fmtVnd(serumOrig)}/cây; Giảm giá nhẹ < 50% nhận ${fmtVnd(serumDisc)}/cây; Giảm sâu ≥ 50% nhận ${fmtVnd(serumDeep)}/cây; Tặng kèm Free (0đ) nhận ${fmtVnd(serumFree)}/cây.`,
        'Đối với CVLL (CV-004): Khi tư vấn bán sản phẩm hộ CV hoặc CVL khác, CVLL hưởng 100% thưởng sản phẩm và CV/CVL nhận 0đ.',
      ],
      rewardFormula: `Hoa hồng: ${fmtVnd(serumOrig)} giá gốc · ${fmtVnd(serumDisc)} giảm < 50% · ${fmtVnd(serumDeep)} giảm ≥ 50% · ${fmtVnd(serumFree)} Free`,
      penalty: `Chỉ được giải ngân khi tỷ lệ chốt combo đạt chuẩn ≥ ${minComboPct}. Nếu < ${minComboPct} thì tạm khóa.`,
      routeScope: '/dashboard/career-path',
    },
    WAGE: {
      ruleId: 'CV-002 · CV-004',
      ruleTitle: `Quy chế Lương Giờ CVL (${fmtVnd(cvlWage)}/h) & CVLL (${fmtVnd(cvllWage)}/h)`,
      version: '2.2.0',
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
      subtitle: 'Tăng lương cứng theo giờ làm việc thực tế đồng bộ từ Cấu hình Live',
      commandments: [
        `Mức lương giờ gốc của CV: ${fmtVnd(baseWage)}/giờ.`,
        `Khi lên CVL: Lương giờ tăng +${fmtVnd(cvlWage - baseWage)}/h ➔ Đạt ${fmtVnd(cvlWage)}/giờ.`,
        `Khi lên CVLL: Lương giờ tăng tiếp +${fmtVnd(cvllWage - cvlWage)}/h ➔ Đạt ${fmtVnd(cvllWage)}/giờ.`,
      ],
      rewardFormula: `CV ${fmtVnd(baseWage)}/h · CVL ${fmtVnd(cvlWage)}/h · CVLL ${fmtVnd(cvllWage)}/h`,
      penalty: `Nếu trong tháng không đạt ngưỡng chốt combo: Lương giờ tính theo mức gốc ${fmtVnd(baseWage)}/h.`,
      routeScope: '/dashboard/career-path',
    },
    TIP: {
      ruleId: 'TIP-001',
      ruleTitle: 'Quy chế Hưởng 90% Tip (70% Làm Mi + 20% Tư Vấn)',
      version: '2.2.0',
      icon: <HandCoins className="w-5 h-5 text-indigo-400" />,
      subtitle: 'CVL & CVLL áp dụng chung quy tắc Tip 70+20',
      commandments: [
        'Tại cấp bậc CV: Chuyên viên nhận 70% tip khách cho.',
        'Khi tự đón, tự tư vấn và làm mi trọn vẹn (CVL / CVLL): nhận 70% Tip Mi + 10% Check-in + 10% Check-out = 90% Tip!',
        'Chỉ các đơn hàng có tiền tip từ 20.000đ trở lên mới tính vào tỷ lệ tip rate của shop (Điều răn TIP-001).',
        'Kể cả khi bán combo dưới ngưỡng, Chuyên Viên VẪN ĐƯỢC BẢO LƯU Tip tư vấn theo công sức thực tế.',
      ],
      rewardFormula: 'Tip = 70% Làm mi + 10% Check-in + 10% Check-out (tổng 90% khi tự làm trọn gói)',
      routeScope: '/dashboard/cv',
    },
    ORDERS: {
      ruleId: 'CV-002',
      ruleTitle: `Ải 1: Sản Lượng Tối Thiểu ${minOrders} Bộ Mi / 3 Tháng`,
      version: '2.1.0',
      icon: <Eye className="w-5 h-5 text-emerald-400" />,
      subtitle: 'Nền tảng tay nghề và độ bền ca làm (CVLL bắt buộc đi tua khách mình)',
      commandments: [
        `Chuyên viên phải hoàn thành tối thiểu ${minOrders} bộ mi trong 3 tháng liên tiếp.`,
        'Chỉ tính các ca làm mi hợp lệ ở trạng thái Completed trong hệ thống CRM.',
        'Đối với CVLL (CV-004): Bắt buộc đi đủ tua khách của mình; bỏ tua để chạy sang hỗ trợ sảnh sẽ bị phạt theo quy định.',
      ],
      rewardFormula: `Định mức: ≥ ${minOrders} bộ mi / 90 ngày`,
      routeScope: '/dashboard/career-path',
    },
    FIX: {
      ruleId: 'CV-002',
      ruleTitle: `Ải 2: Tỷ Lệ Lỗi Sửa Mi (Fix) Tối Đa ${maxFixPct}`,
      version: '2.1.0',
      icon: <Bug className="w-5 h-5 text-rose-400" />,
      subtitle: 'Kỷ luật kỹ thuật và độ bền mi tuyệt đối',
      commandments: [
        `Tỷ lệ khách quay lại bảo hành sửa mi (Fix) trong kỳ không được vượt quá ${maxFixPct}.`,
        'Đảm bảo mi gắn bền, không cộm ngứa, đúng quy chuẩn kết dính và an toàn cho mắt khách hàng.',
        `Nếu tỷ lệ Fix > ${maxFixPct}: Ải bị khóa đỏ và yêu cầu rèn luyện lại kỹ thuật.`,
      ],
      rewardFormula: `Ngưỡng an toàn: Tỷ lệ Fix ≤ ${maxFixPct} tổng số ca phục vụ`,
      routeScope: '/dashboard/career-path',
    },
    TIP_RATIO: {
      ruleId: 'CV-002',
      ruleTitle: 'Ải 3: Tỷ Lệ Tip Cao Hơn Trung Bình Shop',
      version: '2.1.0',
      icon: <HandCoins className="w-5 h-5 text-indigo-400" />,
      subtitle: 'Thước đo tình cảm và sự hài lòng của khách hàng',
      commandments: [
        `Tỷ lệ khách boa tip phải cao hơn tỷ lệ tip bình quân toàn salon theo cấu hình (+${tipAbovePct} cho CVL và +${cvllTipAbovePct} cho CVLL).`,
        'Khách tự nguyện tip tiền là minh chứng cao nhất cho sự chu đáo, tận tâm và tay nghề êm ái.',
      ],
      rewardFormula: `Tỷ lệ Tip ≥ (1 + % Vượt Chuẩn Shop) × Tỷ lệ Tip Trung Bình Chi Nhánh`,
      routeScope: '/dashboard/career-path',
    },
    QA: {
      ruleId: 'CV-002',
      ruleTitle: `Ải 4: Kiểm Định Kỹ Thuật QA/QC ${qaAudits} Lần/Tháng (0 Vi Phạm)`,
      version: '2.1.0',
      icon: <ShieldCheck className="w-5 h-5 text-amber-400" />,
      subtitle: 'Kỷ luật chất lượng tay nghề không thỏa hiệp',
      commandments: [
        `Trong tháng hoàn tất, Chuyên Viên phải thực hiện tối thiểu ${qaAudits} lần chấm bài QA/QC.`,
        'Bắt buộc không có bất kỳ bài kiểm tra nào bị FAILED (0 vi phạm lỗi nghiêm trọng).',
        'Nếu có bài failed: Khóa quyền nâng cấp cho đến khi hoàn thành bài rèn luyện khắc phục.',
      ],
      rewardFormula: `Tối thiểu ${qaAudits} lần kiểm định/tháng · 0 bài kiểm định thất bại`,
      routeScope: '/dashboard/career-path',
    },
    BANANA: {
      ruleId: 'BANANA-001',
      ruleTitle: `Ải 5: Tích Lũy ${minBananas} Chuối Yêu Thương Check-in Văn Hóa`,
      version: '2.1.0',
      icon: <span className="text-xl">🍌</span>,
      subtitle: 'Điểm danh văn hóa, tương trợ đồng đội và kỷ luật ca làm',
      commandments: [
        `Chuyên Viên phải tích lũy tối thiểu ${minBananas} Chuối Yêu Thương check-in văn hóa trong tháng.`,
        'Chuối thưởng cho sự đúng giờ, nề nếp salon, hỗ trợ bạn bè và nhận thả tim từ đồng đội.',
      ],
      rewardFormula: `Tối thiểu ${minBananas} 🍌 trong tháng · Số dư Chuối không âm`,
      routeScope: '/dashboard/career-path',
    },
    HI: {
      ruleId: 'CV-002',
      ruleTitle: `Ải 6: Chỉ Số Hài Lòng Đồng Đội (HI) Tối Thiểu ${minHiPct}`,
      version: '2.1.0',
      icon: <Heart className="w-5 h-5 text-rose-400" />,
      subtitle: 'Chỉ số hạnh phúc và hòa thuận giữa các Thiên Thần',
      commandments: [
        `Chỉ số Happiness Index (HI) đo lường qua đánh giá ẩn danh và tương trợ nội bộ phải đạt ≥ ${minHiPct}.`,
        'Sự tôn trọng, hỗ trợ đồng đội và phối hợp cùng Sảnh là điều kiện tiên quyết.',
      ],
      rewardFormula: `Chỉ số HI ≥ ${minHiPct} mức độ đồng thuận salon`,
      routeScope: '/dashboard/career-path',
    },
    CHALLENGE_30D: {
      ruleId: 'CV-002 · CV-004',
      ruleTitle: `Ải Trùm Cuối: CVL (${minComboPct}) & CVLL (${cvllPromoPct} × ${cvllPromoMonths} Tháng)`,
      version: '2.2.0',
      icon: <Flame className="w-5 h-5 text-amber-500" />,
      subtitle: 'Thử thách tự tư vấn & thăng cấp tự chủ',
      commandments: [
        `Lên CVL: Trực tiếp tự soi mi, tự tư vấn trong ${trialDays} ngày với tỷ lệ chốt combo ≥ ${minComboPct} trên khách Not Combo Live.`,
        `Lên CVLL: Đủ 6 ải cốt lõi và đạt tối thiểu ${cvllPromoPct} tỷ lệ bán Combo trong ${cvllPromoMonths} tháng liên tiếp.`,
      ],
      rewardFormula: `CVL: ≥ ${minComboPct} (${trialDays} ngày) · CVLL: ≥ ${cvllPromoPct} × ${cvllPromoMonths} tháng liền`,
      routeScope: '/dashboard/career-path',
    },
    PENALTY_21: {
      ruleId: 'CV-002 · CV-004',
      ruleTitle: `Chế Tài Khi Tỷ Lệ Combo < ${minComboPct}`,
      version: '2.2.0',
      icon: <AlertTriangle className="w-5 h-5 text-rose-500" />,
      subtitle: 'Cân bằng giữa bảo vệ quyền lợi và kỷ luật bán hàng',
      commandments: [
        'BẢO LƯU TIP: Dù không đạt ngưỡng combo, Chuyên Viên vẫn nhận Tip tư vấn theo công sức.',
        'KHÓA THƯỞNG BÁN HÀNG: Cắt toàn bộ thưởng Combo (0đ) và thưởng Dưỡng mi Yeppeum (0đ).',
        `KHÓA LƯƠNG TĂNG THÊM: Lương giờ giữ nguyên mức gốc ${fmtVnd(baseWage)}/h.`,
        `QUY TẮC ${demoteMonths} THÁNG LIỀN: Nếu ${demoteMonths} tháng liên tiếp không đạt ngưỡng duy trì, CVL về CV và CVLL giáng về CVL.`,
      ],
      penalty: 'Khóa toàn bộ tiền thưởng combo, dưỡng mi và lương tăng thêm; bảo lưu tip.',
      routeScope: '/dashboard/career-path',
    },
  };
}

export const CareerBibleDrawer: React.FC<CareerBibleDrawerProps> = ({ open, onClose, topic, config }) => {
  const topicsMap = React.useMemo(() => buildCareerBibleTopics(config), [config]);
  if (!topic || !topicsMap[topic]) return null;

  const content = topicsMap[topic];

  return (
    <AdaptiveDrawer
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-pink-500 flex items-center gap-1.5 font-mono uppercase tracking-wide">
              <span>Kinh Thánh mOS</span>
              <span>·</span>
              <span>Điều răn {content.ruleId}</span>
              <span className="text-[9px] px-1.5 py-0 rounded-full bg-pink-500/15 text-pink-400 font-bold border border-pink-500/30">
                v{content.version}
              </span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
              {content.ruleTitle}
            </div>
          </div>
        </div>
      }
      width={480}
      height="65%"
    >
      <div className="space-y-4 pb-6 text-slate-700 dark:text-slate-300">
        {/* Banner tóm tắt */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-pink-500/25 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800 shadow-xs shrink-0">{content.icon}</div>
          <div className="min-w-0">
            <h4 className="text-xs font-black text-slate-900 dark:text-white mb-0.5">{content.ruleTitle}</h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">{content.subtitle}</p>
          </div>
        </div>

        {/* Công thức / Định mức nếu có */}
        {content.rewardFormula && (
          <div className="p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{content.rewardFormula}</div>
          </div>
        )}

        {/* Chế tài nếu có */}
        {content.penalty && (
          <div className="p-3 rounded-xl bg-rose-500/10 dark:bg-rose-950/30 border border-rose-500/30 flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-rose-500 shrink-0" />
            <div className="text-xs font-bold text-rose-700 dark:text-rose-300">{content.penalty}</div>
          </div>
        )}

        {/* Các điều răn cốt lõi */}
        <div className="space-y-2">
          <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-pink-500" />
            <span>Quy Chuẩn Cốt Lõi (Kinh Thánh mOS)</span>
          </div>
          <div className="space-y-2">
            {content.commandments.map((cmd, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-2.5"
              >
                <span className="w-5 h-5 rounded-full bg-pink-500/15 text-pink-600 dark:text-pink-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed m-0 font-medium">{cmd}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Nút xem toàn văn trong Kinh Thánh */}
        <div className="pt-2">
          <Link
            href="/dashboard/diagrams"
            className="flex items-center justify-between p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 transition-colors"
          >
            <span className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-pink-500" />
              <span>Tra cứu toàn văn Điều răn {content.ruleId} trong Kinh Thánh</span>
            </span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>
      </div>
    </AdaptiveDrawer>
  );
};
