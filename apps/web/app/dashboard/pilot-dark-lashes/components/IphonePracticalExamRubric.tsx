'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Input, message } from 'antd';
import { AdaptiveModal } from '../../../../components/ui';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Camera,
  Award,
  Sparkles,
  Check,
  ShieldCheck,
  User,
  Eye,
  Info,
  ChevronRight,
  Maximize2,
  Minimize2,
  FileCheck,
} from 'lucide-react';
import { AppIcon } from '../../../../components/ui/AppIcon';

export interface PracticalRubricScores {
  stage1: number; // Thăm khám & Vệ sinh (10đ)
  stage2: number; // Dán trục & Bắt sợi mi 90° (25đ)
  stage3: number; // Canh hóa chất & Canh giờ (35đ)
  stage4: number; // Nghiệm thu Form mi & Chăm sóc (30đ)
}

interface IphonePracticalExamRubricProps {
  onClose?: () => void;
  onApproveCert?: (finalScore: number, notes: string) => void;
  candidateName?: string;
  examinerName?: string;
  initialScores?: Partial<PracticalRubricScores>;
}

export function IphonePracticalExamRubric({
  onClose,
  onApproveCert,
  candidateName = 'Chuyên Viên Giang Hồ',
  examinerName = 'CEO Danny Đỗ',
  initialScores,
}: IphonePracticalExamRubricProps) {
  // Timer State (70 phút = 4200 giây)
  const TOTAL_SECONDS = 70 * 60;
  const [secondsLeft, setSecondsLeft] = useState<number>(TOTAL_SECONDS);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Scores State
  const [scores, setScores] = useState<PracticalRubricScores>({
    stage1: initialScores?.stage1 ?? 10,
    stage2: initialScores?.stage2 ?? 25,
    stage3: initialScores?.stage3 ?? 35,
    stage4: initialScores?.stage4 ?? 30,
  });

  // Photo captures
  const [leftEyePhoto, setLeftEyePhoto] = useState<string | null>(
    '/uploads/pilot-left-eye-verified.jpg'
  );
  const [rightEyePhoto, setRightEyePhoto] = useState<string | null>(
    '/uploads/pilot-right-eye-verified.jpg'
  );

  // Notes
  const [examinerNotes, setExaminerNotes] = useState<string>(
    'Thao tác dán trục silicone 90° rất chuẩn, sợi mi tơi đều không bắt chéo. Thời gian hoàn thiện 64 phút, 0 lỗi kỹ thuật.'
  );

  // Modal ký duyệt
  const [signModalOpen, setSignModalOpen] = useState<boolean>(false);
  const [isSigned, setIsSigned] = useState<boolean>(false);

  // Timer Effect
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            message.warning('⏱️ Đã hết thời gian thi thực hành 70 phút!');
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
  }, [timerRunning]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const timerColorClass = useMemo(() => {
    if (secondsLeft <= 5 * 60) {
      return 'text-rose-500 bg-rose-500/10 border-rose-500/30 animate-pulse';
    }
    if (secondsLeft <= 15 * 60) {
      return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    }
    return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
  }, [secondsLeft]);

  // Total practical score
  const totalScore = useMemo(() => {
    return scores.stage1 + scores.stage2 + scores.stage3 + scores.stage4;
  }, [scores]);

  // Rank determination
  const rank = useMemo(() => {
    if (totalScore >= 95) {
      return {
        label: 'ĐẠT KTV CHÍNH THỨC WINGS',
        sub: 'Xếp loại Xuất Sắc · Đủ điều kiện tự chủ ca làm',
        color: 'emerald',
      };
    }
    if (totalScore >= 90) {
      return {
        label: 'ĐẠT TỐT NGHIỆP TAY NGHỀ',
        sub: 'Xếp loại Giỏi · Đạt chuẩn SOP Đề Thám',
        color: 'blue',
      };
    }
    return {
      label: 'CHƯA ĐẠT CHUẨN',
      sub: 'Cần bồi dưỡng thêm cùng Cô Giang Đàm',
      color: 'rose',
    };
  }, [totalScore]);

  const handleQuickTagClick = (tag: string) => {
    setExaminerNotes((prev) => (prev ? `${prev} · ${tag}` : tag));
  };

  const handleApprove = () => {
    setIsSigned(true);
    setSignModalOpen(false);
    message.success(`Đã ký duyệt và cấp chứng chỉ mOS thành công cho ${candidateName}!`);
    if (onApproveCert) {
      onApproveCert(totalScore, examinerNotes);
    }
  };

  return (
    <div
      className="max-w-md mx-auto bg-slate-50 dark:bg-slate-950 min-h-screen pb-28 text-slate-800 dark:text-slate-100 flex flex-col font-sans border-x border-slate-200 dark:border-slate-800 shadow-2xl relative"
      data-testid="iphone-exam-rubric-view"
    >
      {/* 1. Header Cố Định (Top Sticky Header iPhone) */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                iPhone Coi Thi 1-Chạm
              </span>
            </div>
            <h2 className="text-base font-black text-slate-900 dark:text-slate-50 m-0 leading-tight">
              {candidateName}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0">
              Giám khảo: <strong>{examinerName}</strong> · Đề Thám Q.1
            </p>
          </div>

          {/* Built-in Countdown Timer */}
          <div className="flex flex-col items-end">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-black tabular-nums transition-all ${timerColorClass}`}
              data-testid="practical-exam-timer"
            >
              <Clock size={16} />
              <span>{formatTimer(secondsLeft)}</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <button
                type="button"
                onClick={() => setTimerRunning((p) => !p)}
                className="p-1 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                title={timerRunning ? 'Tạm dừng' : 'Bắt đầu'}
                data-testid="btn-toggle-timer"
              >
                {timerRunning ? <Pause size={12} /> : <Play size={12} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimerRunning(false);
                  setSecondsLeft(TOTAL_SECONDS);
                }}
                className="p-1 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                title="Đặt lại 70 phút"
                data-testid="btn-reset-timer"
              >
                <RotateCcw size={12} />
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-4 space-y-4 flex-1">
        {/* Banner Nhắc Nhở Tiêu Chuẩn */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center gap-2 text-amber-900 dark:text-amber-200">
          <AppIcon icon={ShieldCheck} size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="leading-tight text-[11.5px]">
            Chấm thi độc lập 4 chặng: <strong>100 điểm tuyệt đối</strong>. Thao tác 1-chạm cực nhạy,
            không gây tiếng động ảnh hưởng khách đang làm mi.
          </span>
        </div>

        {/* ========================================================================= */}
        {/* CHẶNG 1: THĂM KHÁM & CHUẨN BỊ (10 ĐIỂM) */}
        {/* ========================================================================= */}
        <Card
          variant="outlined"
          className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden"
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="font-bold text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Chặng 1 (10 phút)
              </span>
              <span className="text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums">
                {scores.stage1}/10 điểm
              </span>
            </div>

            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 m-0">
              I. Thăm Khám &amp; Chuẩn Bị Vệ Sinh
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 leading-snug">
              • Test đàn hồi ẩm (Wet Elasticity Test) nhận diện mi mảnh/dày.
              <br />
              • Chọn đúng size trục silicone (S/M/L) che 50-70% chiều dài mi.
              <br />• Dán pad hydrogel cách bờ mi 0.5mm, tuyệt đối không cộm mắt.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setScores((s) => ({ ...s, stage1: 10 }))}
                className={`py-3 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[48px] ${
                  scores.stage1 === 10
                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/50'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
                data-testid="btn-stage1-pass"
              >
                <Check size={16} />
                <span>Đạt Chuẩn (10đ)</span>
              </button>

              <button
                type="button"
                onClick={() => setScores((s) => ({ ...s, stage1: 0 }))}
                className={`py-3 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[48px] ${
                  scores.stage1 === 0
                    ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-500/50'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
                data-testid="btn-stage1-fail"
              >
                <XCircle size={16} />
                <span>Chưa Đạt (0đ)</span>
              </button>
            </div>
          </div>
        </Card>

        {/* ========================================================================= */}
        {/* CHẶNG 2: DÁN TRỤC & BẮT MI 90° ZERO CROSS (25 ĐIỂM) */}
        {/* ========================================================================= */}
        <Card
          variant="outlined"
          className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden"
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="font-bold text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Chặng 2 (15 phút)
              </span>
              <span className="text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums">
                {scores.stage2}/25 điểm
              </span>
            </div>

            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 m-0">
              II. Dán Trục &amp; Bắt Sợi Mi 90° (Zero Cross)
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 leading-snug">
              • Trục silicone ôm sát bờ mi không hở bọt khí.
              <br />
              • 100% sợi mi vuốt thẳng góc 90°, không bắt chéo sợi con.
              <br />• Chân mi không bị đùn thịt, không gấp nếp.
            </p>

            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setScores((s) => ({ ...s, stage2: 25 }))}
                className={`py-3 px-1 rounded-xl text-[11.5px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer min-h-[48px] text-center leading-tight ${
                  scores.stage2 === 25
                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/50'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
                data-testid="btn-stage2-perfect"
              >
                <Check size={15} />
                <span>Chuẩn 100% (25đ)</span>
              </button>

              <button
                type="button"
                onClick={() => setScores((s) => ({ ...s, stage2: 15 }))}
                className={`py-3 px-1 rounded-xl text-[11.5px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer min-h-[48px] text-center leading-tight ${
                  scores.stage2 === 15
                    ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-500/50'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
                data-testid="btn-stage2-minor"
              >
                <AlertTriangle size={15} />
                <span>Lệch 2-3 sợi (15đ)</span>
              </button>

              <button
                type="button"
                onClick={() => setScores((s) => ({ ...s, stage2: 0 }))}
                className={`py-3 px-1 rounded-xl text-[11.5px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer min-h-[48px] text-center leading-tight ${
                  scores.stage2 === 0
                    ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-500/50'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
                data-testid="btn-stage2-fail"
              >
                <XCircle size={15} />
                <span>Chéo chân (0đ)</span>
              </button>
            </div>
          </div>
        </Card>

        {/* ========================================================================= */}
        {/* CHẶNG 3: CANH HÓA CHẤT & PHỦ BÓNG (35 ĐIỂM) */}
        {/* ========================================================================= */}
        <Card
          variant="outlined"
          className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden"
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="font-bold text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Chặng 3 (30 phút)
              </span>
              <span className="text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums">
                {scores.stage3}/35 điểm
              </span>
            </div>

            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 m-0">
              III. Canh Hóa Chất &amp; Phủ Bóng Tối
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 leading-snug">
              • Step 1 (pH 9.2-9.5) bôi cách chân 0.5-1mm, không dính ngọn mi.
              <br />
              • Bấm giờ chuẩn chất mi (≤ 14p). Step 2 (pH 3.0-3.5) đúng giờ.
              <br />• Phủ Nano Bóng Tối tơi đều, cân bằng pH 5.5, không cay mắt.
            </p>

            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setScores((s) => ({ ...s, stage3: 35 }))}
                className={`py-3 px-1 rounded-xl text-[11.5px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer min-h-[48px] text-center leading-tight ${
                  scores.stage3 === 35
                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/50'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
                data-testid="btn-stage3-perfect"
              >
                <Check size={15} />
                <span>Chuẩn xác (35đ)</span>
              </button>

              <button
                type="button"
                onClick={() => setScores((s) => ({ ...s, stage3: 20 }))}
                className={`py-3 px-1 rounded-xl text-[11.5px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer min-h-[48px] text-center leading-tight ${
                  scores.stage3 === 20
                    ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-500/50'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
                data-testid="btn-stage3-minor"
              >
                <AlertTriangle size={15} />
                <span>Lem nhẹ (20đ)</span>
              </button>

              <button
                type="button"
                onClick={() => setScores((s) => ({ ...s, stage3: 0 }))}
                className={`py-3 px-1 rounded-xl text-[11.5px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer min-h-[48px] text-center leading-tight ${
                  scores.stage3 === 0
                    ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-500/50'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
                data-testid="btn-stage3-fail"
              >
                <XCircle size={15} />
                <span>Cháy/Cay (0đ)</span>
              </button>
            </div>
          </div>
        </Card>

        {/* ========================================================================= */}
        {/* CHẶNG 4: NGHIỆM THU FORM MI & CHĂM SÓC (30 ĐIỂM) */}
        {/* ========================================================================= */}
        <Card
          variant="outlined"
          className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden"
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="font-bold text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Chặng 4 (15 phút)
              </span>
              <span className="text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums">
                {scores.stage4}/30 điểm
              </span>
            </div>

            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 m-0">
              IV. Nghiệm Thu Form Mi &amp; Hướng Dẫn
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 leading-snug">
              • Góc nâng chân mi đạt 60°–75° (đo thước Lash Protractor).
              <br />
              • Độ cong 2 mắt cân xứng (sai lệch ≤ 1mm). Mi tơi bóng không sun.
              <br />• Dặn dò kiêng nước 4 giờ và dưỡng mi đúng văn hóa Wings.
            </p>

            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setScores((s) => ({ ...s, stage4: 30 }))}
                className={`py-3 px-1 rounded-xl text-[11.5px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer min-h-[48px] text-center leading-tight ${
                  scores.stage4 === 30
                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/50'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
                data-testid="btn-stage4-perfect"
              >
                <Check size={15} />
                <span>Hoàn hảo (30đ)</span>
              </button>

              <button
                type="button"
                onClick={() => setScores((s) => ({ ...s, stage4: 15 }))}
                className={`py-3 px-1 rounded-xl text-[11.5px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer min-h-[48px] text-center leading-tight ${
                  scores.stage4 === 15
                    ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-500/50'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
                data-testid="btn-stage4-minor"
              >
                <AlertTriangle size={15} />
                <span>Lệch nhẹ (15đ)</span>
              </button>

              <button
                type="button"
                onClick={() => setScores((s) => ({ ...s, stage4: 0 }))}
                className={`py-3 px-1 rounded-xl text-[11.5px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer min-h-[48px] text-center leading-tight ${
                  scores.stage4 === 0
                    ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-500/50'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
                data-testid="btn-stage4-fail"
              >
                <XCircle size={15} />
                <span>Lài đơ (0đ)</span>
              </button>
            </div>
          </div>
        </Card>

        {/* ========================================================================= */}
        {/* CỔNG CHỤP ẢNH THỰC CHỨNG 2 MẮT (MACRO PHOTO CAPTURE) */}
        {/* ========================================================================= */}
        <Card
          variant="outlined"
          className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                <Camera size={15} className="text-amber-500" />
                <span>Minh Chứng Hình Ảnh Thực Tế (Macro 2 Mắt)</span>
              </span>
              <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Watermark mOS Verified
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Mắt trái */}
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-1.5">
                <div className="w-full h-24 rounded-lg bg-slate-200 dark:bg-slate-700/80 flex items-center justify-center text-slate-400 relative overflow-hidden group">
                  {leftEyePhoto ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 text-slate-700 dark:text-slate-200 text-xs p-1">
                      <Eye size={22} className="text-amber-600 mb-1" />
                      <span className="font-bold text-[10px]">MẮT TRÁI (L-EYE)</span>
                      <span className="text-[9px] text-slate-500">C-Curl 65° · Cân Xứng</span>
                    </div>
                  ) : (
                    <Camera size={20} />
                  )}
                  <span className="absolute bottom-1 right-1 text-[8px] font-bold bg-black/60 text-white px-1 rounded">
                    mOS #01
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLeftEyePhoto('/uploads/left-verified.jpg');
                    message.success('Đã ghi nhận ảnh macro mắt trái!');
                  }}
                  className="w-full py-1.5 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  📸 Chụp Mắt Trái
                </button>
              </div>

              {/* Mắt phải */}
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-1.5">
                <div className="w-full h-24 rounded-lg bg-slate-200 dark:bg-slate-700/80 flex items-center justify-center text-slate-400 relative overflow-hidden group">
                  {rightEyePhoto ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-emerald-500/20 to-blue-500/20 text-slate-700 dark:text-slate-200 text-xs p-1">
                      <Eye size={22} className="text-emerald-600 mb-1" />
                      <span className="font-bold text-[10px]">MẮT PHẢI (R-EYE)</span>
                      <span className="text-[9px] text-slate-500">C-Curl 65° · Độ Lệch 0mm</span>
                    </div>
                  ) : (
                    <Camera size={20} />
                  )}
                  <span className="absolute bottom-1 right-1 text-[8px] font-bold bg-black/60 text-white px-1 rounded">
                    mOS #02
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRightEyePhoto('/uploads/right-verified.jpg');
                    message.success('Đã ghi nhận ảnh macro mắt phải!');
                  }}
                  className="w-full py-1.5 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  📸 Chụp Mắt Phải
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* ========================================================================= */}
        {/* NHẬN XÉT CỦA GIÁM KHẢO DANNY ĐỖ */}
        {/* ========================================================================= */}
        <Card
          variant="outlined"
          className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
        >
          <div className="space-y-2">
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
              Góp Ý &amp; Nhận Xét Của CEO Danny Đỗ:
            </span>

            {/* Quick comment pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                'Thao tác tay vững',
                'Căn trục cá heo rất đều',
                'Sợi mi tơi óng',
                'An toàn giác mạc tốt',
                'Ân cần chu đáo',
              ].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleQuickTagClick(tag)}
                  className="text-[10.5px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  + {tag}
                </button>
              ))}
            </div>

            <Input.TextArea
              rows={2}
              value={examinerNotes}
              onChange={(e) => setExaminerNotes(e.target.value)}
              placeholder="Nhập nhận xét chi tiết..."
              className="text-xs rounded-xl"
              data-testid="input-iphone-notes"
            />
          </div>
        </Card>
      </main>

      {/* ========================================================================= */}
      {/* STICKY BOTTOM ACTION BAR (CỐ ĐỊNH ĐÁY iPHONE) */}
      {/* ========================================================================= */}
      <footer className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3 shadow-2xl z-50">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
              Tổng Điểm Thực Hành
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                {totalScore}
              </span>
              <span className="text-xs text-slate-400 font-semibold">/ 100đ</span>
            </div>
          </div>

          <div className="text-right">
            <span
              className={`inline-flex items-center justify-center leading-none px-2 py-1 rounded-md text-[10.5px] font-black tracking-wide ${
                totalScore >= 95
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : totalScore >= 90
                    ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
              }`}
            >
              {rank.label}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{rank.sub}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSignModalOpen(true)}
          className={`w-full py-3.5 px-4 rounded-xl text-xs font-black text-white shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[48px] ${
            isSigned
              ? 'bg-emerald-600 hover:bg-emerald-500'
              : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600'
          }`}
          data-testid="btn-iphone-sign-cert"
        >
          <AppIcon icon={Award} size={17} />
          <span>{isSigned ? '✅ ĐÃ CẤP CHỨNG CHỈ mOS' : '✅ KÝ DUYỆT & CẤP CHỨNG CHỈ mOS'}</span>
        </button>
      </footer>

      {/* Modal Ký Duyệt & Cấp Chứng Chỉ */}
      <AdaptiveModal
        open={signModalOpen}
        onCancel={() => setSignModalOpen(false)}
        footer={null}
        width={380}
        centered
        className="rounded-2xl overflow-hidden"
      >
        <div className="p-4 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center text-white mx-auto shadow-lg">
            <Award size={32} />
          </div>

          <div>
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
              Xác Nhận Ký Duyệt Chuyên Môn
            </span>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 m-0 mt-0.5">
              Cấp Chứng Chỉ Uốn Mi mOS
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-1">
              Học viên: <strong>{candidateName}</strong>
              <br />
              Điểm thực hành: <strong className="text-amber-600 tabular-nums">{totalScore}/100đ</strong> ({rank.label})
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Mã chứng chỉ số:</span>
              <span className="font-mono font-bold text-amber-600">WINGS-DL-2026-004-GH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Giảng viên hướng dẫn:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">Cô Giang Đàm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Chủ khảo phê duyệt:</span>
              <span className="font-bold text-emerald-600">CEO Danny Đỗ</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSignModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleApprove}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 shadow-md transition-all cursor-pointer"
              data-testid="btn-confirm-sign"
            >
              Ký Xác Nhận
            </button>
          </div>
        </div>
      </AdaptiveModal>
    </div>
  );
}
