'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Input, message } from 'antd';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  GraduationCap,
  Award,
  BookOpen,
  Send,
  Eye,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { AppIcon } from '../../../../components/ui/AppIcon';
import { AdaptiveModal } from '../../../../components/ui';

export interface QuizQuestion {
  id: number;
  question: string;
  options: { key: 'A' | 'B' | 'C' | 'D'; text: string }[];
  correctKey: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

export const THEORY_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'Mục tiêu chính của kỹ thuật uốn mi là gì?',
    options: [
      { key: 'A', text: 'Làm mi thật dài ra vĩnh viễn' },
      { key: 'B', text: 'Tạo độ cong cho mi thật trong một khoảng thời gian' },
      { key: 'C', text: 'Làm tăng số lượng nang mi' },
      { key: 'D', text: 'Thay thế hoàn toàn mascara' },
    ],
    correctKey: 'B',
    explanation:
      'Uốn mi tác động vào liên kết lưu huỳnh (disulfide bonds) ở lớp vỏ cortex của sợi mi thật để định hình độ cong tạm thời trong chu kỳ sinh trưởng của mi (6-8 tuần).',
  },
  {
    id: 2,
    question: 'Trước khi thực hiện, bước nào cần ưu tiên hàng đầu?',
    options: [
      { key: 'A', text: 'Bôi thuốc uốn ngay để tiết kiệm thời gian' },
      { key: 'B', text: 'Kiểm tra tình trạng mắt, mi và hỏi tiền sử dị ứng/nhạy cảm' },
      { key: 'C', text: 'Chọn trục lớn nhất cho mọi khách' },
      { key: 'D', text: 'Nhuộm mi trước khi kiểm tra' },
    ],
    correctKey: 'B',
    explanation:
      'Thăm khám mi và kiểm tra tiền sử dị ứng là bước tiên quyết bắt buộc để đảm bảo an toàn giác mạc và phát hiện các chống chỉ định.',
  },
  {
    id: 3,
    question: 'Trường hợp nào nên hoãn dịch vụ và đánh giá thêm?',
    options: [
      { key: 'A', text: 'Mi khỏe, mắt không kích ứng' },
      { key: 'B', text: 'Khách đã hiểu quy trình' },
      { key: 'C', text: 'Mắt đang đỏ, đau, viêm hoặc có dấu hiệu nhiễm trùng' },
      { key: 'D', text: 'Khách muốn độ cong tự nhiên' },
    ],
    correctKey: 'C',
    explanation:
      'Tuyệt đối không thực hiện dịch vụ hóa chất khi mắt khách có dấu hiệu viêm bờ mi, đau đỏ hoặc tổn thương niêm mạc.',
  },
  {
    id: 4,
    question: 'Vì sao cần làm sạch mi trước khi uốn?',
    options: [
      { key: 'A', text: 'Để thuốc mạnh hơn' },
      { key: 'B', text: 'Loại bỏ dầu, bụi và cặn có thể ảnh hưởng độ bám, độ đồng đều' },
      { key: 'C', text: 'Để mi thật rụng nhanh hơn' },
      { key: 'D', text: 'Không có lý do, chỉ là bước hình thức' },
    ],
    correctKey: 'B',
    explanation:
      'Bã nhờn và cặn mỹ phẩm tạo màng chắn ngăn thuốc uốn thẩm thấu đều, khiến mi uốn xong không đạt độ cong hoặc cong loang lổ.',
  },
  {
    id: 5,
    question: 'Trục nên được chọn chủ yếu dựa trên yếu tố nào?',
    options: [
      { key: 'A', text: 'Chỉ dựa vào màu sắc của trục' },
      { key: 'B', text: 'Độ dài mi, dáng mắt, độ cong mong muốn và khả năng tạo độ cong an toàn' },
      { key: 'C', text: 'Chọn loại nhỏ nhất để cong nhiều nhất' },
      { key: 'D', text: 'Dùng chung một cỡ cho mọi khách' },
    ],
    correctKey: 'B',
    explanation:
      'Kích thước trục silicon phải tương thích với chiều dài sợi mi thật (phủ 50-70% độ cong) và độ sâu hốc mắt của khách.',
  },
  {
    id: 6,
    question: 'Nguyên tắc chung đúng nhất khi đặt mi lên trục là gì?',
    options: [
      { key: 'A', text: 'Mi tách đều, cùng hướng, không gập hoặc chồng chéo' },
      { key: 'B', text: 'Mi bắt chéo để tăng độ dày' },
      { key: 'C', text: 'Chỉ cần dán phần ngọn mi' },
      { key: 'D', text: 'Kéo căng mi tối đa để tạo cong' },
    ],
    correctKey: 'A',
    explanation:
      'Kỹ thuật Zero Cross: Các sợi mi phải được trải song song vuông góc 90° với bờ mi, chân mi áp sát đỉnh trục không bị vặn xoắn.',
  },
  {
    id: 7,
    question: 'Khi cố định mi lên trục, điều quan trọng nhất là gì?',
    options: [
      { key: 'A', text: 'Các sợi mi nằm tách tương đối, hướng đều, không bắt chéo hoặc gập' },
      { key: 'B', text: 'Kéo căng tối đa mọi sợi mi' },
      { key: 'C', text: 'Để mi dính thành từng cụm' },
      { key: 'D', text: 'Để keo tràn vào mắt' },
    ],
    correctKey: 'A',
    explanation:
      'Cố định mi bằng keo định hình chuyên dụng sao cho sợi mi giữ nguyên trật tự tự nhiên, không bị chèn ép gập khúc.',
  },
  {
    id: 8,
    question: 'Thuốc uốn và thuốc định hình có vai trò gì trong phản ứng hóa sinh?',
    options: [
      { key: 'A', text: 'Cả hai chỉ có tác dụng làm sạch' },
      {
        key: 'B',
        text: 'Thuốc uốn làm thay đổi liên kết cấu trúc sợi mi; bước định hình giúp ổn định hình dạng mới theo trục',
      },
      { key: 'C', text: 'Thuốc định hình làm mi mọc nhanh hơn' },
      { key: 'D', text: 'Có thể đổi thứ tự tùy ý' },
    ],
    correctKey: 'B',
    explanation:
      'Thuốc số 1 (kiềm, pH 9.2-9.5) mở biểu bì và bẻ gãy liên kết disulfide; Thuốc số 2 (acid trung hòa, pH 3.0-3.5) hàn gắn liên kết ở vị trí cong mới.',
  },
  {
    id: 9,
    question: 'Thời gian lưu thuốc nên được quyết định như thế nào?',
    options: [
      { key: 'A', text: 'Luôn cố định 15 phút cho mọi sản phẩm' },
      { key: 'B', text: 'Theo video trên mạng bất kể nhãn thuốc' },
      { key: 'C', text: 'Theo hướng dẫn nhà sản xuất, tình trạng sợi mi và quy trình đã được đào tạo' },
      { key: 'D', text: 'Càng lâu càng cong đẹp' },
    ],
    correctKey: 'C',
    explanation:
      'Canh thời gian chuẩn xác theo độ đàn hồi và cấu trúc mi (mi tơ mảnh: 10-12p; mi thường: 12-14p; mi dày thô cứng: 14-16p).',
  },
  {
    id: 10,
    question: 'Vì sao không nên để thuốc tiếp xúc với da/mắt hoặc lan vào niêm mạc?',
    options: [
      { key: 'A', text: 'Có thể gây kích ứng hoặc tổn thương hóa chất' },
      { key: 'B', text: 'Chỉ làm giảm mùi hương' },
      { key: 'C', text: 'Không ảnh hưởng nếu nhắm mắt' },
      { key: 'D', text: 'Giúp thuốc phát huy tốt hơn' },
    ],
    correctKey: 'A',
    explanation:
      'Thuốc uốn có tính kiềm cao, nếu lem vào niêm mạc hoặc giác mạc có thể gây bỏng hóa chất, viêm kết mạc hoặc trợt biểu mô giác mạc.',
  },
  {
    id: 11,
    question: 'Nếu khách báo nóng rát, đau hoặc chảy nước mắt bất thường trong khi làm, cần làm gì?',
    options: [
      { key: 'A', text: 'Tiếp tục đủ thời gian mới xử lý' },
      { key: 'B', text: 'Thêm thuốc để cân bằng' },
      {
        key: 'C',
        text: 'Dừng quy trình, lau sạch sản phẩm nhẹ nhàng, an toàn và đánh giá tình trạng; tìm trợ giúp y tế khi cần',
      },
      { key: 'D', text: 'Che mắt và bỏ qua' },
    ],
    correctKey: 'C',
    explanation:
      'An toàn là trên hết: Lập tức dừng thao tác, dùng tăm bông gạt sạch thuốc, rửa nhẹ bằng nước muối sinh lý 0.9% và kiểm tra giác mạc.',
  },
  {
    id: 12,
    question: 'Dấu hiệu nào cho thấy mi có nguy cơ bị xử lý quá mức (over-processed)?',
    options: [
      { key: 'A', text: 'Mi mềm, đàn hồi tự nhiên' },
      { key: 'B', text: 'Mi khô xơ, quăn gập, mất đàn hồi hoặc có dấu hiệu gãy' },
      { key: 'C', text: 'Mi được chải tách đều' },
      { key: 'D', text: 'Trục vừa vặn' },
    ],
    correctKey: 'B',
    explanation:
      'Khi ủ quá thời gian hoặc quẹt thuốc lên ngọn mi, protein keratin bị phá hủy khiến ngọn mi bị sun xoăn, giòn và đứt gãy.',
  },
  {
    id: 13,
    question: 'Vệ sinh dụng cụ và tay có ý nghĩa gì đối với an toàn dịch vụ?',
    options: [
      { key: 'A', text: 'Chỉ để khu vực làm đẹp mắt hơn' },
      { key: 'B', text: 'Giảm nguy cơ lây nhiễm chéo và bảo vệ khách lẫn kỹ thuật viên' },
      { key: 'C', text: 'Không cần nếu chỉ làm một khách' },
      { key: 'D', text: 'Chỉ cần vệ sinh cuối ngày' },
    ],
    correctKey: 'B',
    explanation:
      'Khử khuẩn nhíp, que gạt và sát khuẩn tay theo chuẩn y tế phòng ngừa lây nhiễm vi khuẩn gây viêm bờ mi hoặc đau mắt đỏ.',
  },
  {
    id: 14,
    question: 'Sau khi uốn mi, lời dặn nào phù hợp nhất với khách hàng?',
    options: [
      { key: 'A', text: 'Chà xát mi mạnh để giữ cong' },
      {
        key: 'B',
        text: 'Tuân thủ hướng dẫn chăm sóc của hệ sản phẩm; tránh tác động mạnh và theo dõi dấu hiệu kích ứng',
      },
      { key: 'C', text: 'Tự bôi hóa chất uốn lại tại nhà' },
      { key: 'D', text: 'Giật mi nếu thấy không đều' },
    ],
    correctKey: 'B',
    explanation:
      'Dặn khách kiêng nước tối thiểu 4 giờ đầu để liên kết định hình ổn định hoàn toàn, chải dưỡng keratin bóng tối hàng ngày.',
  },
  {
    id: 15,
    question: 'Nếu kết quả uốn không đều, cách xử lý chuyên nghiệp nhất là gì?',
    options: [
      { key: 'A', text: 'Lập tức bôi thuốc lần nữa lên toàn bộ mi' },
      {
        key: 'B',
        text: 'Xác định nguyên nhân, đánh giá độ khỏe của mi và chỉ điều chỉnh khi đủ điều kiện, theo hướng dẫn sản phẩm và đào tạo',
      },
      { key: 'C', text: 'Dùng nhiệt cao để ép cong' },
      { key: 'D', text: 'Che khuyết điểm, không nói với khách' },
    ],
    correctKey: 'B',
    explanation:
      'Không bao giờ uốn chồng thuốc ngay lập tức vì sẽ làm cháy sợi mi. Phải đánh giá sức khỏe nang mi và chỉ chỉnh sửa khi đủ điều kiện dưỡng.',
  },
  {
    id: 16,
    question: 'Cách lựa chọn trục uốn đúng nhất có thể áp dụng cho toàn bộ khách hàng?',
    options: [
      { key: 'A', text: 'Trục càng to mi uốn càng đẹp' },
      { key: 'B', text: 'Chọn trục sao cho độ dài mi che phủ 50-70% độ cong của trục' },
      { key: 'C', text: 'Trục càng nhỏ độ cong càng đẹp' },
      { key: 'D', text: 'Trục nào cũng được, miễn mi dính lên trục là được' },
    ],
    correctKey: 'B',
    explanation:
      'Độ phủ lý tưởng 50-70% giúp mi cong vuốt mượt mà theo sống trục cá heo; nếu dưới 50% mi bị lài đơ, nếu vượt quá 100% ngọn mi bị cụp quéo.',
  },
  {
    id: 17,
    question: 'Nên nhuộm mi trước hay sau khi bôi cân bằng pH?',
    options: [
      { key: 'A', text: 'Nhuộm mi trước rồi mới dùng cân bằng pH' },
      { key: 'B', text: 'Cân bằng pH trước sau đó mới nhuộm' },
      { key: 'C', text: 'Dưỡng keratin trước rồi mới bôi cân bằng pH' },
      { key: 'D', text: 'Nhuộm trước hay cân bằng pH trước đều được' },
    ],
    correctKey: 'A',
    explanation:
      'Nhuộm phủ màu bóng đen trong môi trường biểu bì đang mở, sau đó bôi dưỡng cân bằng pH (5.5) để khép chặt lớp cutin khóa màu và dưỡng chất bên trong.',
  },
];

interface LashLiftTheoryExamModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitScore?: (finalScore: number, answersSummary: string) => void;
  candidateName?: string;
  examinerName?: string;
}

export function LashLiftTheoryExamModal({
  open,
  onClose,
  onSubmitScore,
  candidateName = 'Chuyên Viên Giang Hồ',
  examinerName = 'CEO Danny Đỗ',
}: LashLiftTheoryExamModalProps) {
  // Timer State (30 phút = 1800 giây)
  const TOTAL_SECONDS = 30 * 60;
  const [secondsLeft, setSecondsLeft] = useState<number>(TOTAL_SECONDS);
  const [timerRunning, setTimerRunning] = useState<boolean>(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Selected Answers (Q1 to Q17)
  const [answers, setAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>({
    1: 'B',
    2: 'B',
    3: 'C',
    4: 'B',
    5: 'B',
    6: 'A',
    7: 'A',
    8: 'B',
    9: 'C',
    10: 'A',
    11: 'C',
    12: 'B',
    13: 'B',
    14: 'B',
    15: 'B',
    16: 'B',
    17: 'A',
  });

  // Essay answers
  const [essay18, setEssay18] = useState<string>(
    'Quy trình 7 bước an toàn Wings:\n1. Thăm khám kiểm tra mi & tiền sử dị ứng\n2. Vệ sinh tẩy dầu mi và dán pad hydrogel\n3. Chọn size trục silicone phù hợp độ dài mi (S/M/L) và dán ôm bờ mi\n4. Bắt sợi mi 90 độ lên trục (Zero Cross)\n5. Bôi thuốc uốn số 1 canh thời gian theo chất mi (10-14 phút)\n6. Lau sạch và bôi thuốc định hình số 2 (8-10 phút)\n7. Nhuộm phủ bóng Nano, cân bằng pH và khóa biểu bì bằng tinh chất Keratin, dặn dò chăm sóc 24h.'
  );

  const [essay19, setEssay19] = useState<{
    caseA: string;
    caseB: string;
    caseC: string;
    caseD: string;
  }>({
    caseA:
      'Lý do: Bôi thuốc uốn lem lên chóp ngọn mi hoặc ủ quá giờ làm cháy keratin. Phòng ngừa: Chỉ bôi thuốc 2/3 thân mi, cách ngọn ít nhất 1.5mm.',
    caseB:
      'Lý do: Thuốc số 1 chưa đủ độ mềm hóa hoặc thuốc số 2 bị lau quá sớm. Phòng ngừa: Kiểm tra độ dẻo đàn hồi trước khi lau thuốc 1, bấm giờ đúng chuẩn thuốc 2.',
    caseC:
      'Lý do: Khi chải vuốt keo định hình sợi mi bị bắt chéo đè lên nhau. Phòng ngừa: Dùng que gạt rẽ từng sợi mi thẳng góc 90 độ song song tuyệt đối trước khi bôi hóa chất.',
    caseD:
      'Lý do: Chiều dài mi dưới 5mm không thể ôm đỉnh trục. Phòng ngừa: Kiểm tra đo mi từ đầu, hoãn dịch vụ hoặc tư vấn dưỡng mi 3 tuần trước khi uốn.',
  });

  const [essay20, setEssay20] = useState<string>(
    'Thứ tự xử lý khẩn:\n1. Dừng ngay thao tác, trấn an khách hàng.\n2. Dùng tăm bông khô thấm hút sạch hóa chất xung quanh mí mắt.\n3. Rửa nhẹ bằng dung dịch nước muối sinh lý NaCl 0.9% vô trùng; tuyệt đối không tự ý nhỏ hóa chất trung hòa vào mắt.\n4. Đánh giá thị lực và niêm mạc mắt.\n5. Dấu hiệu cần chuyển viện khám khẩn cấp: Đau nhức dữ dội kéo dài quá 15 phút, mắt đỏ rực phù nề, chảy nước mắt liên tục không ngớt, hoặc khách nhìn mờ/giảm thị lực.'
  );

  // Essay points awarded by Examiner (Danny Do)
  const [essayScores, setEssayScores] = useState<{ q18: number; q19: number; q20: number }>({
    q18: 10, // max 10
    q19: 12, // max 12
    q20: 10, // max 10
  });

  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [showExplanations, setShowExplanations] = useState<boolean>(false);

  // Timer countdown
  useEffect(() => {
    if (!open) return;
    if (timerRunning && !isSubmitted) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            message.warning('⏱️ Đã hết 30 phút thi lý thuyết! Hệ thống tự động thu bài.');
            setIsSubmitted(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open, timerRunning, isSubmitted]);

  // Scoring calculation
  const correctCount = useMemo(() => {
    return THEORY_QUESTIONS.filter((q) => answers[q.id] === q.correctKey).length;
  }, [answers]);

  const mcqScore = useMemo(() => {
    // 17 câu trắc nghiệm, mỗi câu 4 điểm = 68 điểm max
    return correctCount * 4;
  }, [correctCount]);

  const essayTotal = useMemo(() => {
    return essayScores.q18 + essayScores.q19 + essayScores.q20;
  }, [essayScores]);

  const finalTheoryScore = useMemo(() => {
    return Math.min(100, mcqScore + essayTotal);
  }, [mcqScore, essayTotal]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleSelectOption = (qId: number, key: 'A' | 'B' | 'C' | 'D') => {
    if (isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [qId]: key }));
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    setTimerRunning(false);
    setShowExplanations(true);
    message.success(
      `Đã nộp bài thi lý thuyết! Điểm trắc nghiệm: ${mcqScore}/68đ · Điểm tự luận: ${essayTotal}/32đ · Tổng: ${finalTheoryScore}/100đ`
    );
    if (onSubmitScore) {
      const summary = `Lý thuyết 17/17 câu đúng (${mcqScore}đ) + 3 câu tự luận xuất sắc (${essayTotal}đ) = ${finalTheoryScore}/100đ`;
      onSubmitScore(finalTheoryScore, summary);
    }
  };

  return (
    <AdaptiveModal
      open={open}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <GraduationCap size={18} />
          </div>
          <div>
            <span className="text-sm font-black text-slate-900 dark:text-slate-100 block">
              Bài Thi Lý Thuyết Kỹ Thuật Uốn Mi (Wings Academy)
            </span>
            <span className="text-[11px] text-slate-500 font-normal">
              Thí sinh: <strong>{candidateName}</strong> · Giám khảo: <strong>{examinerName}</strong>
            </span>
          </div>
        </div>
      }
      width={760}
      footer={
        <div className="flex items-center justify-between w-full pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              Đúng:{' '}
              <strong className="text-emerald-600 font-bold tabular-nums">
                {correctCount}/{THEORY_QUESTIONS.length}
              </strong>{' '}
              câu trắc nghiệm ({mcqScore}đ)
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-500">
              Tổng điểm:{' '}
              <strong className="text-amber-600 font-bold tabular-nums text-sm">
                {finalTheoryScore}/100đ
              </strong>{' '}
              ({finalTheoryScore >= 80 ? 'ĐẠT' : 'CHƯA ĐẠT'})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Đóng
            </button>
            {!isSubmitted ? (
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                data-testid="btn-submit-theory-exam"
              >
                <Send size={13} />
                <span>Nộp Bài Thi</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowExplanations((p) => !p)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all cursor-pointer"
              >
                {showExplanations ? 'Ẩn Lời Giải' : 'Xem Lời Giải'}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-xs">
        {/* Banner Đếm Ngược & Thống Kê Điểm */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="font-bold text-blue-900 dark:text-blue-200 text-xs flex items-center gap-1.5">
              <BookOpen size={14} className="text-blue-500" />
              <span>Đề Thi 20 Câu (17 Trắc Nghiệm 68đ + 3 Tự Luận 32đ)</span>
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 mt-0.5">
              Đánh giá kiến thức hóa sinh, kiểm soát trục cá heo, dải pH và quy trình ứng phó khẩn.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Timer */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-black tabular-nums ${
                secondsLeft <= 300
                  ? 'text-rose-600 bg-rose-500/10 border-rose-500/30 animate-pulse'
                  : 'text-blue-700 dark:text-blue-300 bg-blue-500/10 border-blue-500/30'
              }`}
            >
              <Clock size={14} />
              <span>{formatTimer(secondsLeft)}</span>
            </div>

            <button
              type="button"
              onClick={() => setTimerRunning((p) => !p)}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              title={timerRunning ? 'Tạm dừng' : 'Tiếp tục'}
            >
              {timerRunning ? <Pause size={13} /> : <Play size={13} />}
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PHẦN I: 17 CÂU TRẮC NGHIỆM */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wide">
              Phần I. Trắc Nghiệm (17 Câu · 68 Điểm)
            </span>
            <span className="text-[11px] text-slate-400">Chọn 1 đáp án đúng nhất (4đ/câu)</span>
          </div>

          {THEORY_QUESTIONS.map((q) => {
            const chosen = answers[q.id];
            const isCorrect = chosen === q.correctKey;
            return (
              <div
                key={q.id}
                className={`p-3 rounded-xl border transition-all ${
                  isSubmitted
                    ? isCorrect
                      ? 'bg-emerald-500/[0.04] border-emerald-500/30'
                      : 'bg-rose-500/[0.04] border-rose-500/30'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
                data-testid={`quiz-question-${q.id}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-xs leading-snug">
                    <span className="text-blue-600 dark:text-blue-400 font-black mr-1">Câu {q.id}.</span>
                    {q.question}
                  </span>
                  {isSubmitted && (
                    <span
                      className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-1.5 py-0.5 rounded ${
                        isCorrect
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isCorrect ? (
                        <>
                          <Check size={11} /> +4đ
                        </>
                      ) : (
                        <>
                          <XCircle size={11} /> 0đ
                        </>
                      )}
                    </span>
                  )}
                </div>

                {/* 4 Lựa chọn A B C D */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {q.options.map((opt) => {
                    const isSelected = chosen === opt.key;
                    const isTheCorrectOne = isSubmitted && opt.key === q.correctKey;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleSelectOption(q.id, opt.key)}
                        disabled={isSubmitted}
                        className={`text-left p-2 rounded-lg border text-[11.5px] flex items-center gap-2 transition-all cursor-pointer ${
                          isTheCorrectOne
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-900 dark:text-emerald-200 font-semibold'
                            : isSelected
                              ? isSubmitted && !isCorrect
                                ? 'bg-rose-500/15 border-rose-500/50 text-rose-900 dark:text-rose-200 font-semibold'
                                : 'bg-blue-500/15 border-blue-500/50 text-blue-900 dark:text-blue-200 font-semibold'
                              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            isTheCorrectOne
                              ? 'bg-emerald-500 text-white'
                              : isSelected
                                ? isSubmitted && !isCorrect
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-blue-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {opt.key}
                        </span>
                        <span className="flex-1 leading-snug">{opt.text}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Giải thích chi tiết khi nộp bài */}
                {showExplanations && (
                  <div className="mt-2 p-2 rounded-lg bg-blue-500/[0.07] border border-blue-500/20 text-[11px] text-blue-900 dark:text-blue-200 flex items-start gap-1.5">
                    <Sparkles size={13} className="text-blue-500 shrink-0 mt-0.5" />
                    <span>
                      <strong>Lời giải Wings SOP:</strong> {q.explanation}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* PHẦN II: 3 CÂU TỰ LUẬN (32 ĐIỂM) */}
        {/* ========================================================================= */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wide">
              Phần II. Tự Luận Chuyên Sâu (3 Câu · 32 Điểm)
            </span>
            <span className="text-[11px] text-slate-400">CEO Danny trực tiếp chấm</span>
          </div>

          {/* Câu 18 */}
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                <span className="text-blue-600 dark:text-blue-400 font-black mr-1">Câu 18 (10đ).</span>
                Trình bày 7 bước chính của một quy trình uốn mi an toàn
              </span>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-slate-400">Điểm:</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={essayScores.q18}
                  onChange={(e) =>
                    setEssayScores((p) => ({ ...p, q18: Math.min(10, Math.max(0, Number(e.target.value))) }))
                  }
                  className="w-12 text-center font-bold border border-slate-300 dark:border-slate-700 rounded p-0.5 tabular-nums bg-transparent"
                />
                <span className="text-slate-400">/10đ</span>
              </div>
            </div>
            <Input.TextArea
              rows={3}
              value={essay18}
              onChange={(e) => setEssay18(e.target.value)}
              placeholder="Nhập 7 bước uốn mi an toàn..."
              className="text-xs rounded-lg"
              disabled={isSubmitted}
            />
          </div>

          {/* Câu 19 */}
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                <span className="text-blue-600 dark:text-blue-400 font-black mr-1">Câu 19 (12đ).</span>
                Phân tích 4 nguyên nhân khiến mi uốn không đều hoặc gập gãy &amp; cách phòng ngừa
              </span>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-slate-400">Điểm:</span>
                <input
                  type="number"
                  min={0}
                  max={12}
                  value={essayScores.q19}
                  onChange={(e) =>
                    setEssayScores((p) => ({ ...p, q19: Math.min(12, Math.max(0, Number(e.target.value))) }))
                  }
                  className="w-12 text-center font-bold border border-slate-300 dark:border-slate-700 rounded p-0.5 tabular-nums bg-transparent"
                />
                <span className="text-slate-400">/12đ</span>
              </div>
            </div>

            <div className="space-y-1.5 text-[11.5px]">
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  A. Mới làm xong đẹp, sau 1 ngày ngọn mi bị sun quéo:
                </span>
                <Input.TextArea
                  rows={1.5}
                  value={essay19.caseA}
                  onChange={(e) => setEssay19((p) => ({ ...p, caseA: e.target.value }))}
                  className="text-xs rounded-lg mt-0.5"
                  disabled={isSubmitted}
                />
              </div>

              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  B. Sau khi lau thuốc số 2 và gỡ trục, có nhiều sợi không cong:
                </span>
                <Input.TextArea
                  rows={1.5}
                  value={essay19.caseB}
                  onChange={(e) => setEssay19((p) => ({ ...p, caseB: e.target.value }))}
                  className="text-xs rounded-lg mt-0.5"
                  disabled={isSubmitted}
                />
              </div>

              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  C. Hướng ngọn mi sau khi uốn bị nghiêng xéo chồng lên nhau:
                </span>
                <Input.TextArea
                  rows={1.5}
                  value={essay19.caseC}
                  onChange={(e) => setEssay19((p) => ({ ...p, caseC: e.target.value }))}
                  className="text-xs rounded-lg mt-0.5"
                  disabled={isSubmitted}
                />
              </div>

              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  D. Mi quá ngắn khi uốn không chải lên trục được:
                </span>
                <Input.TextArea
                  rows={1.5}
                  value={essay19.caseD}
                  onChange={(e) => setEssay19((p) => ({ ...p, caseD: e.target.value }))}
                  className="text-xs rounded-lg mt-0.5"
                  disabled={isSubmitted}
                />
              </div>
            </div>
          </div>

          {/* Câu 20 */}
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                <span className="text-blue-600 dark:text-blue-400 font-black mr-1">Câu 20 (10đ).</span>
                Quy trình ứng phó khi mắt khách nóng rát &amp; dấu hiệu cần chuyển viện
              </span>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-slate-400">Điểm:</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={essayScores.q20}
                  onChange={(e) =>
                    setEssayScores((p) => ({ ...p, q20: Math.min(10, Math.max(0, Number(e.target.value))) }))
                  }
                  className="w-12 text-center font-bold border border-slate-300 dark:border-slate-700 rounded p-0.5 tabular-nums bg-transparent"
                />
                <span className="text-slate-400">/10đ</span>
              </div>
            </div>
            <Input.TextArea
              rows={3}
              value={essay20}
              onChange={(e) => setEssay20(e.target.value)}
              placeholder="Quy trình 5 bước ứng phó an toàn giác mạc..."
              className="text-xs rounded-lg"
              disabled={isSubmitted}
            />
          </div>
        </div>
      </div>
    </AdaptiveModal>
  );
}
