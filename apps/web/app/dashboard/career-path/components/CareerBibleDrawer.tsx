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

const BIBLE_TOPICS_MAP: Record<CareerBibleTopic, BibleTopicContent> = {
  COMBO: {
    ruleId: 'CV-002',
    ruleTitle: 'Quy chế Thưởng Combo Nối Mi Bậc Thang & Ngưỡng 21%',
    version: '2.0.0',
    icon: <Sparkles className="w-5 h-5 text-pink-400" />,
    subtitle: 'Thưởng hoa hồng tiền tươi theo món và bậc thang giá trị gói combo',
    commandments: [
      'Áp dụng trên tập khách hàng Not Combo Live (chưa có gói combo đang hoạt động; khách có combo bán gia hạn vẫn cộng dồn).',
      'Thưởng tiền tươi bậc thang: Gói < 2 Triệu nhận 50.000đ; Gói 2M - < 3M nhận 100.000đ; Gói 3M - < 4M nhận 150.000đ; Từ 4M trở lên cộng 50.000đ cho mỗi 1M (Gói 4.5M nhận 200.000đ/combo).',
      'Định mức kỳ vọng: Tự chốt tối thiểu 8 combo/tháng (~+1.600.000đ hoa hồng cá nhân).',
      'Tỷ lệ tự chốt tối thiểu bắt buộc: Phải đạt từ 21% trở lên trên tệp khách tiềm năng.',
    ],
    rewardFormula: 'Thưởng Combo = 50k (<2M) | 100k (2-3M) | 150k (3-4M) | +50k/1M (≥4M)',
    penalty: 'Nếu tỷ lệ chốt < 21%: Khóa 100% tiền thưởng combo (0đ) và lương tăng thêm; chỉ bảo lưu 90% tip tư vấn.',
    routeScope: '/dashboard/career-path',
  },
  SERUM: {
    ruleId: 'CV-002',
    ruleTitle: 'Quy chế Bán Cây Dưỡng Mi Yeppeum',
    version: '2.0.0',
    icon: <Sparkles className="w-5 h-5 text-teal-400" />,
    subtitle: 'Tiền tươi trao tay cây nào nhận ngay cây đó',
    commandments: [
      'Định mức khuyến khích: Tự tư vấn bán tối thiểu 1 cây dưỡng mi/tuần (~4 cây/tháng).',
      'Tiền tươi trao tay: 100.000đ/cây khi bán giá gốc (1.100.000đ); 50.000đ/cây khi bán giá khuyến mãi/combo.',
      'Dự kiến thu nhập tăng thêm: +400.000đ/tháng chỉ riêng từ dưỡng mi Yeppeum.',
    ],
    rewardFormula: 'Hoa hồng: 100.000đ/cây giá gốc · 50.000đ/cây giảm giá',
    penalty: 'Chỉ được giải ngân khi tỷ lệ chốt combo đạt chuẩn ≥ 21%. Nếu < 21% thì tạm khóa.',
    routeScope: '/dashboard/career-path',
  },
  WAGE: {
    ruleId: 'CV-002',
    ruleTitle: 'Quy chế Lương Giờ Chuyên Viên 1 Cánh (27.500đ/h)',
    version: '2.0.0',
    icon: <Sparkles className="w-5 h-5 text-amber-400" />,
    subtitle: 'Tăng lương cứng theo giờ làm việc thực tế cho CV Tự Chủ',
    commandments: [
      'Mức lương giờ gốc của CV · Dịu Dàng: 25.500đ/giờ.',
      'Khi thăng cấp lên 🪽 CV · Thanh Lịch (1 Cánh): Lương giờ được tăng thêm +2.000đ/h ➔ Đạt 27.500đ/giờ.',
      'Trung bình mỗi tháng làm việc 24 ca (~192 giờ) mang lại thu nhập lương giờ tăng thêm ~+384.000đ/tháng.',
    ],
    rewardFormula: 'Lương giờ = 27.500đ/h (+2.000đ/h so với mức 25.500đ/h gốc)',
    penalty: 'Nếu trong tháng không đạt tỷ lệ chốt combo ≥ 21%: Lương giờ tính theo mức gốc 25.500đ/h.',
    routeScope: '/dashboard/career-path',
  },
  TIP: {
    ruleId: 'TIP-001',
    ruleTitle: 'Quy chế Hưởng 90% Tip Khi Tự Tư Vấn & Làm Mi',
    version: '2.0.0',
    icon: <HandCoins className="w-5 h-5 text-indigo-400" />,
    subtitle: 'Bảo lưu trọn vẹn 90% tiền tip do khách trao tặng',
    commandments: [
      'Tại cấp bậc CV cũ: Chuyên viên nhận 70% tip khách cho (bị khấu trừ 30% cho chi phí vận hành/sảnh).',
      'Khi lên 🪽 CV 1 Cánh Tự Chủ: Chuyên viên tự đón, tự tư vấn và làm mi trọn vẹn sẽ được nhận 70% Tip Mi + 20% Tip Tư Vấn = Ăn trọn 90% Tip!',
      'Chỉ các đơn hàng có tiền tip từ 20.000đ trở lên mới tính vào tỷ lệ tip rate của shop (Điều răn TIP-001).',
      'Nguyên tắc bảo vệ quyền lợi: Kể cả khi bán combo < 21%, Chuyên Viên VẪN ĐƯỢC BẢO LƯU 90% TIP, không bao giờ bị cắt khoản này!',
    ],
    rewardFormula: 'Tip CV 1 Cánh = 70% Tip Dịch Vụ + 20% Tip Tư Vấn = 90% Tip khách cho',
    routeScope: '/dashboard/cv',
  },
  ORDERS: {
    ruleId: 'CV-002',
    ruleTitle: 'Ải 1: Sản Lượng Tối Thiểu 330 Bộ Mi / 3 Tháng',
    version: '2.0.0',
    icon: <Eye className="w-5 h-5 text-emerald-400" />,
    subtitle: 'Nền tảng tay nghề và độ bền ca làm của Chuyên Viên',
    commandments: [
      'Chuyên viên phải hoàn thành tối thiểu 330 bộ mi trong 3 tháng liên tiếp (bình quân 110 bộ/tháng).',
      'Chỉ tính các ca làm mi hợp lệ ở trạng thái Completed trong hệ thống CRM.',
      'Sản lượng bền vững chứng minh năng lực phục vụ liên tục trước khi được tự chủ tư vấn tại giường.',
    ],
    rewardFormula: 'Định mức: ≥ 330 bộ mi / 90 ngày (≥ 110 bộ mi/tháng)',
    routeScope: '/dashboard/career-path',
  },
  FIX: {
    ruleId: 'CV-002',
    ruleTitle: 'Ải 2: Tỷ Lệ Lỗi Sửa Mi (Fix) Tối Đa 1.5%',
    version: '2.0.0',
    icon: <Bug className="w-5 h-5 text-rose-400" />,
    subtitle: 'Kỷ luật kỹ thuật và độ bền mi tuyệt đối',
    commandments: [
      'Tỷ lệ khách quay lại bảo hành sửa mi (Fix) trong tháng hoàn tất gần nhất không được vượt quá 1.5%.',
      'Đảm bảo mi gắn bền, không cộm ngứa, đúng quy chuẩn kết dính và an toàn cho mắt khách hàng.',
      'Nếu tỷ lệ Fix > 1.5%: Ải bị khóa đỏ và yêu cầu rèn luyện lại kỹ thuật gắn chân mi.',
    ],
    rewardFormula: 'Ngưỡng an toàn: Tỷ lệ Fix ≤ 1.5% tổng số ca phục vụ',
    routeScope: '/dashboard/career-path',
  },
  TIP_RATIO: {
    ruleId: 'CV-002',
    ruleTitle: 'Ải 3: Tỷ Lệ Tip Cao Hơn Trung Bình Shop +10%',
    version: '2.0.0',
    icon: <HandCoins className="w-5 h-5 text-indigo-400" />,
    subtitle: 'Thước đo tình cảm và sự hài lòng chạm đáy tim khách hàng',
    commandments: [
      'Tỷ lệ khách boa tip của Chuyên Viên phải cao hơn tỷ lệ tip bình quân toàn salon tối thiểu 10%.',
      'Ví dụ: Nếu trung bình salon là 40% khách tip, Chuyên Viên phải đạt từ 44% trở lên (+10% so với TB shop).',
      'Khách tự nguyện tip tiền là minh chứng cao nhất cho thái độ dịu dàng, chu đáo và tay nghề êm ái.',
    ],
    rewardFormula: 'Tỷ lệ Tip ≥ 1.1 × Tỷ lệ Tip Trung Bình Chi Nhánh',
    routeScope: '/dashboard/career-path',
  },
  QA: {
    ruleId: 'CV-002',
    ruleTitle: 'Ải 4: Kiểm Định Kỹ Thuật QA/QC 4 Lần/Tháng (0 Vi Phạm)',
    version: '2.0.0',
    icon: <ShieldCheck className="w-5 h-5 text-amber-400" />,
    subtitle: 'Kỷ luật chất lượng tay nghề không thỏa hiệp',
    commandments: [
      'Trong tháng hoàn tất, Chuyên Viên phải thực hiện tối thiểu 4 lần chấm bài QA/QC cùng FM / Đàn Chị (1 lần/tuần).',
      'Bắt buộc không có bất kỳ bài kiểm tra nào bị FAILED (0 vi phạm lỗi nghiêm trọng).',
      'Nếu có bài failed: Khóa quyền nâng cấp cho đến khi hoàn thành bài rèn luyện khắc phục.',
    ],
    rewardFormula: 'Tối thiểu 4 lần kiểm định/tháng · 0 bài kiểm định thất bại',
    routeScope: '/dashboard/career-path',
  },
  BANANA: {
    ruleId: 'BANANA-001',
    ruleTitle: 'Ải 5: Tích Lũy 20 Chuối Yêu Thương Check-in Văn Hóa',
    version: '2.0.0',
    icon: <span className="text-xl">🍌</span>,
    subtitle: 'Điểm danh văn hóa, tương trợ đồng đội và kỷ luật ca làm',
    commandments: [
      'Chuyên Viên phải tích lũy tối thiểu 20 Chuối Yêu Thương check-in văn hóa trong tháng.',
      'Chuối thưởng cho sự đúng giờ, nề nếp salon, hỗ trợ bạn bè và nhận thả tim từ đồng đội.',
      'Số dư Chuối phản ánh mức độ hòa nhập và tinh thần yêu thương gắn kết tập thể.',
    ],
    rewardFormula: 'Tối thiểu 20 🍌 trong tháng · Số dư Chuối không âm',
    routeScope: '/dashboard/career-path',
  },
  HI: {
    ruleId: 'CV-002',
    ruleTitle: 'Ải 6: Chỉ Số Hài Lòng Đồng Đội (HI) Tối Thiểu 70%',
    version: '2.0.0',
    icon: <Heart className="w-5 h-5 text-rose-400" />,
    subtitle: 'Chỉ số hạnh phúc và hòa thuận giữa các Thiên Thần',
    commandments: [
      'Chỉ số Happiness Index (HI) đo lường qua đánh giá ẩn danh và tương trợ nội bộ phải đạt ≥ 70%.',
      'Một Chuyên Viên tài năng nhưng gây lục đục nội bộ hoặc không hòa đồng sẽ không thể lên cấp Tự Chủ.',
      'Sự tôn trọng, hỗ trợ đàn em và phối hợp cùng Sảnh/Lễ tân là điều kiện tiên quyết.',
    ],
    rewardFormula: 'Chỉ số HI ≥ 70% mức độ đồng thuận salon',
    routeScope: '/dashboard/career-path',
  },
  CHALLENGE_30D: {
    ruleId: 'CV-002',
    ruleTitle: 'Ải Trùm Cuối: Thử Thách Tự Tư Vấn 30 Ngày',
    version: '2.0.0',
    icon: <Flame className="w-5 h-5 text-amber-500" />,
    subtitle: 'Bước ngoặt nâng cấp từ Chuyên Viên Kỹ Thuật sang Chuyên Viên Tự Chủ',
    commandments: [
      'Chuyên Viên bước vào 30 ngày thử thách tự chủ tiếp nhận khách tại giường, tự soi mi, tự tư vấn giải pháp và tự chốt gói combo.',
      'Trong 30 ngày này, tỷ lệ chốt combo phải cán mốc tối thiểu 21% trên khách tiềm năng.',
      'Sau khi hoàn thành xuất sắc 30 ngày thử thách, Chuyên Viên chính thức được sắc phong 🪽 CV 1 Cánh Tự Chủ!',
    ],
    rewardFormula: '30 ngày rèn luyện thực tế · Tỷ lệ chốt Combo ≥ 21%',
    routeScope: '/dashboard/career-path',
  },
  PENALTY_21: {
    ruleId: 'CV-002',
    ruleTitle: 'Chế Tài Nghiêm Minh Khi Tỷ Lệ Combo < 21%',
    version: '2.0.0',
    icon: <AlertTriangle className="w-5 h-5 text-rose-500" />,
    subtitle: 'Cân bằng giữa bảo vệ quyền lợi và kỷ luật bán hàng',
    commandments: [
      'BẢO LƯU 90% TIP: Dù không bán được combo nào (< 21%), Chuyên Viên vẫn nhận đủ 90% Tip khách cho (70% dịch vụ + 20% tư vấn).',
      'KHÓA THƯỞNG BÁN HÀNG: Cắt toàn bộ thưởng Combo (0đ) và thưởng Dưỡng mi Yeppeum (0đ).',
      'KHÓA LƯƠNG TĂNG THÊM: Lương giờ giữ nguyên mức gốc 25.500đ/h, không nhận khoản +2.000đ/h tăng thêm.',
      'QUY TẮC 2 THÁNG LIỀN: Nếu 2 tháng liên tiếp không đạt tối thiểu 21% combo, Chuyên Viên sẽ quay trở lại cấp bậc CV · Dịu Dàng và tip tụt về 70%.',
    ],
    penalty: 'Khóa toàn bộ tiền thưởng combo, dưỡng mi và lương tăng thêm; bảo lưu 90% tip.',
    routeScope: '/dashboard/career-path',
  },
};

export const CareerBibleDrawer: React.FC<CareerBibleDrawerProps> = ({ open, onClose, topic }) => {
  if (!topic || !BIBLE_TOPICS_MAP[topic]) return null;

  const content = BIBLE_TOPICS_MAP[topic];

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
