'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Slider, message, Tooltip, Switch } from 'antd';
import { Sparkles, Trophy, Settings, ChevronRight, Shield, Heart, Zap, Award } from 'lucide-react';
import { CareerProgressionConfig, DEFAULT_CAREER_PROGRESSION_CONFIG, StaffCareerStatus } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { useTheme } from '../../../context/ThemeContext';
import { CareerConfigDrawer } from './components/CareerConfigDrawer';

export default function CareerPathPage() {
  const { themeMode } = useTheme();
  const [currentUser, setCurrentUser] = useState<{
    id?: number;
    role?: string;
    username?: string;
    name?: string;
  } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('mos_user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch (_e) {
      // ignore
    }
  }, []);

  // State
  const [activeIsland, setActiveIsland] = useState<'cv' | 'cc' | 'fm' | 'cho' | 'boss'>('cv');
  const [selectedHero, setSelectedHero] = useState<string>('thao_my');
  const [config, setConfig] = useState<CareerProgressionConfig>(DEFAULT_CAREER_PROGRESSION_CONFIG);
  const [liveData, setLiveData] = useState<StaffCareerStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState<boolean>(false);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);

  // Sliders for interactive simulation
  const [sliderOrders, setSliderOrders] = useState<number>(340);
  const [sliderTip, setSliderTip] = useState<number>(18);
  const [sliderFix, setSliderFix] = useState<number>(1.2);
  const [sliderHi, setSliderHi] = useState<number>(84);
  const [sliderCombo, setSliderCombo] = useState<number>(24.5);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Load config & live data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedConfig, myStatus] = await Promise.allSettled([
        apiClient.career.getConfig(),
        apiClient.career.getMyProgression(),
      ]);

      if (fetchedConfig.status === 'fulfilled' && fetchedConfig.value) {
        setConfig(fetchedConfig.value);
      }
      if (myStatus.status === 'fulfilled' && myStatus.value) {
        setLiveData(myStatus.value);
      }
    } catch (_err) {
      // Graceful fallback to default simulation
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Audio synthesizer via native Web Audio API
  const playSound = (type: 'pop' | 'fanfare') => {
    try {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      if (type === 'pop') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'fanfare') {
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);
          gain.gain.setValueAtTime(0, now + idx * 0.1);
          gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.1 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 0.35);
        });
      }
    } catch (_) {}
  };

  // Confetti Canvas animation
  const triggerConfetti = () => {
    playSound('fanfare');
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      r: number;
      d: number;
      color: string;
      tilt: number;
      tiltAngleIncremental: number;
      tiltAngle: number;
    }> = [];

    const colors = [
      'rgb(244, 63, 94)',
      'rgb(236, 72, 153)',
      'rgb(139, 92, 246)',
      'rgb(59, 130, 246)',
      'rgb(16, 185, 129)',
      'rgb(245, 158, 11)',
      'rgb(251, 191, 36)',
    ];
    for (let i = 0; i < 90; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 8 + 4,
        d: Math.random() * 90 + 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngleIncremental: Math.random() * 0.07 + 0.05,
        tiltAngle: 0,
      });
    }

    let animationFrame: number;
    let frameCount = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frameCount++;
      particles.forEach((p) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 1.5;
        p.x += Math.sin(p.d) * 1.5;
        p.tilt = Math.sin(p.tiltAngle) * 15;

        ctx.beginPath();
        ctx.lineWidth = p.r / 2;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
        ctx.stroke();
      });

      if (frameCount < 160) {
        animationFrame = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    render();
  };

  // Change preset hero
  const handleSelectHero = (heroVal: string) => {
    playSound('pop');
    setSelectedHero(heroVal);
    if (heroVal === 'thao_my') {
      setSliderOrders(340);
      setSliderTip(18);
      setSliderFix(1.2);
      setSliderHi(84);
      setSliderCombo(24.5);
    } else if (heroVal === 'lan_anh') {
      setSliderOrders(180);
      setSliderTip(-8);
      setSliderFix(3.4);
      setSliderHi(62);
      setSliderCombo(12.0);
    } else if (heroVal === 'bao_tran') {
      setSliderOrders(490);
      setSliderTip(32);
      setSliderFix(0.4);
      setSliderHi(94);
      setSliderCombo(38.0);
    } else if (heroVal === 'my_account' && liveData) {
      setSliderOrders(liveData.metrics.ordersCount || 300);
      setSliderTip(Math.round((liveData.metrics.tipRatioAboveShop || 0) * 100));
      setSliderFix(Number(((liveData.metrics.fixRate || 0) * 100).toFixed(1)));
      setSliderHi(Math.round((liveData.metrics.happinessIndex || 0.8) * 100));
      setSliderCombo(liveData.metrics.selfComboRate ? Math.round(liveData.metrics.selfComboRate * 100) : 22);
    }
  };

  // Condition checks against dynamic config
  const q1Passed = sliderOrders >= config.cvToCc.minOrders;
  const q2Passed = sliderTip >= config.cvToCc.minTipRatioAboveShop * 100;
  const q3Passed = sliderFix <= config.cvToCc.maxFixRate * 100;
  const q4Passed = sliderHi >= config.cvToCc.minHappinessIndex * 100;
  const bossPassed = sliderCombo >= config.cvToCc.minSelfComboRate * 100;

  const passedCount = [q1Passed, q2Passed, q3Passed, q4Passed, bossPassed].filter(Boolean).length;
  const allPassed = passedCount === 5;
  const isMasterTech = q1Passed && q2Passed && q3Passed && q4Passed && !bossPassed;

  // Save admin config
  const handleSaveConfig = async (newCvToCc: typeof config.cvToCc) => {
    try {
      setSavingConfig(true);
      const updated = await apiClient.career.updateConfig({ cvToCc: newCvToCc });
      setConfig(updated);
      message.success('Cập nhật cấu hình thành công! Đã áp dụng ngay lập tức.');
      setIsConfigDrawerOpen(false);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi lưu cấu hình';
      message.error(errorMsg);
    } finally {
      setSavingConfig(false);
    }
  };

  // Island details
  const islands = [
    {
      id: 'cv' as const,
      name: 'CV · Thợ Lash',
      badge: 'Ải 1',
      icon: '👁️',
      sub: '80% Tip + Chuối FAL',
      title: 'Tập Sự Thiên Thần · Lash Artisan',
      desc: 'Đôi bàn tay mềm mại, từng sợi mi êm ru ru giấc ngủ nàng thơ.',
      focus: 'Kỹ thuật tinh xảo & An toàn tuyệt đối tại giường',
      skills: [
        { name: 'Khử Trùng Phép Thuật', desc: 'Vệ sinh giường, nhíp tiệt trùng 100%' },
        { name: 'Nối Mi Êm Ái', desc: 'Đúng SLA, không cộm, không cay mắt' },
        { name: 'Bảo Hành Kỹ Thuật', desc: 'Chịu trách nhiệm sửa ca Fix không tính công' },
      ],
      perks: [
        'Hưởng trọn vẹn 80% tổng tiền tip khách yêu quý',
        'Thưởng nóng tiền tươi khi khách đánh giá 5★',
        'Thưởng giữ chân khách quen (Retention Bonus)',
        'Nhận 15 quả Chuối vàng khi hỗ trợ ca Adjust ngắn ≤ 25p',
      ],
      gateText: `Đạt ${config.cvToCc.minOrders} ca mi + Tip > TB shop + Fix < ${(config.cvToCc.maxFixRate * 100).toFixed(1)}% + HI > ${(config.cvToCc.minHappinessIndex * 100).toFixed(0)}% ➔ Mở khóa ải Trùm Cuối Tự Bán Combo (≥ ${(config.cvToCc.minSelfComboRate * 100).toFixed(0)}%) để thăng cấp CC!`,
    },
    {
      id: 'cc' as const,
      name: 'CC · Phù Thủy Sảnh',
      badge: 'Ải 2',
      icon: '🌸',
      sub: `Lv × ${config.rewardRates.ccBonusRatePerLevel}đ`,
      title: 'Chiến Binh Nụ Cười · Client Consultant',
      desc: 'Nụ cười tỏa nắng chào đón, lắng nghe và thấu hiểu phong cách của từng nàng thơ.',
      focus: 'Tư vấn chuyên sâu, chốt combo & lan tỏa niềm vui',
      skills: [
        { name: 'Thấu Cảm Khách Hàng', desc: 'Nhìn dáng mắt, gợi ý dáng mi tôn nét quý phái' },
        { name: 'Bậc Thầy Chốt Combo', desc: 'Tư vấn trọn gói mi + dưỡng, tối ưu chi phí cho khách' },
        { name: 'Chia Sẻ & Đồng Đội', desc: 'Check-in/out nhịp nhàng, chia 50/50 điểm thưởng ca' },
      ],
      perks: [
        'Lương giờ + Thưởng Level CC tăng dần đều (Level × 65đ)',
        '20% tiền tip từ khách hàng',
        'Thưởng doanh số Combo & Sản phẩm bán lẻ',
        'Cơ hội tranh cúp Chiến Thần Bán Hàng & Minigame hàng tuần',
      ],
      gateText: `Thâm niên CC ≥ ${config.ccToFm.minMonthsInRole} tháng + Level CC TB ≥ Lv.${config.ccToFm.minAvgLevel} + Đạt điểm thi Vận hành & Kho ≥ ${config.ccToFm.minOpsExamScore}đ ➔ Thăng cấp Floor Manager (FM)!`,
    },
    {
      id: 'fm' as const,
      name: 'FM · Nữ Thần Sàn',
      badge: 'Ải 3',
      icon: '🏰',
      sub: '% Shop + Kho',
      title: 'Nhạc Trưởng Vận Hành · Floor Manager',
      desc: 'Giữ cho cả tiệm vận hành chuẩn xác như đồng hồ Thụy Sĩ. 100% Lý tính & Kỷ luật.',
      focus: 'Quản trị kho hàng, kiểm soát 5 giác quan CSVC & điều phối tua',
      skills: [
        { name: 'Mắt Thần Kho Bãi', desc: 'Chống thất thoát, kiểm kê xuất nhập chính xác 100%' },
        { name: 'Nhạc Trưởng Tua Giường', desc: 'Điều phối tua công bằng, triệt tiêu thời gian khách chờ' },
        {
          name: 'Giám Sát 5 Giác Quan',
          desc: 'Mắt thấy sạch, tai nghe dịu, mũi ngửi thơm, giường nằm êm, trà bánh ngon',
        },
      ],
      perks: [
        'Lương cứng cấp quản lý + Thưởng % Doanh thu chi nhánh',
        'Thưởng vượt target doanh số shop hàng tháng',
        `Túi Chuối Thần Kỳ: Được cấp ${config.rewardRates.fmMonthlyBananaGrant} Chuối/tháng để thưởng nóng tức thì cho nhân viên xuất sắc`,
      ],
      gateText: `Chi nhánh đạt Target ≥ ${config.fmToCho.minTargetHitMonths} tháng + Thất thoát kho ≤ ${(config.fmToCho.maxInventoryLossRate * 100).toFixed(1)}% + CSVC 5 giác quan ≥ ${config.fmToCho.minFacilityScore}% + eNPS nhân viên ≥ ${config.fmToCho.minStaffEnpsScore}đ ➔ Thăng cấp Chief Happiness Officer (CHO)!`,
    },
    {
      id: 'cho' as const,
      name: 'CHO · Mẹ Thiên Thần',
      badge: 'Ải 4',
      icon: '💖',
      sub: 'NPS 1/Shop',
      title: 'Nữ Thần Hạnh Phúc · Chief Happiness Officer',
      desc: 'Trái tim của chi nhánh. 100% Cảm tính & Yêu thương con người. Duy nhất 1 người/Shop.',
      focus: 'Hạnh phúc của Thiên Thần (nhân sự) & Hạnh phúc của Khách Hàng',
      skills: [
        { name: 'Người Giữ Lửa Văn Hóa', desc: 'Lắng nghe tâm tư, chữa lành áp lực cho từng thợ mi' },
        { name: 'Nâng Tầm Trải Nghiệm', desc: 'Chăm sóc khách VIP, xử lý triệt để phản hồi chưa hài lòng' },
        { name: 'Bồi Dưỡng Kế Cận', desc: 'Kèm cặp và đào tạo thế hệ FM & CHO mới tiếp quản' },
      ],
      perks: [
        'Gói đãi ngộ Executive cấp Trưởng Ban',
        `Thưởng lớn khi chỉ số hạnh phúc khách hàng NPS ≥ ${config.choToBoss.minCustomerNps}`,
        `Thưởng gắn kết nội bộ khi điểm eNPS Thiên Thần ≥ ${config.choToBoss.minStaffEnps}`,
        'Được tài trợ 100% các khóa đào tạo Lãnh đạo Khai vấn chuyên sâu',
      ],
      gateText: `Shop có lãi P&L dương liên tục ≥ ${config.choToBoss.minProfitableMonths} tháng + Biên LN ròng ≥ ${(config.choToBoss.minNetProfitMargin * 100).toFixed(0)}% + Đã đào tạo thành công 1 FM mới & 1 CHO kế cận ➔ Bổ nhiệm làm BOSS Co-Owner!`,
    },
    {
      id: 'boss' as const,
      name: 'BOSS · Co-Owner',
      badge: 'Ải 5',
      icon: '👑',
      sub: 'Cổ Tức P&L',
      title: 'Nữ Hoàng Đồng Sáng Lập · Partner & Co-Owner',
      desc: 'Đỉnh cao sự nghiệp. Từ bàn tay cầm nhíp nối mi trở thành Bà Chủ đồng sở hữu tiệm.',
      focus: 'Chiến lược kinh doanh, chia sẻ lợi nhuận & nhân bản chi nhánh',
      skills: [
        { name: 'Tầm Nhìn Chiến Lược', desc: 'Đồng hành cùng Danny mở rộng chuỗi chi nhánh' },
        { name: 'Quản Trị Lợi Nhuận', desc: 'Cân đối P&L, tối ưu chi phí, nâng cao biên lợi nhuận' },
        { name: 'Nhân Bản Văn Hóa', desc: 'Truyền cảm hứng và bệ phóng cho hàng trăm bạn nữ trẻ yêu nghề' },
      ],
      perks: [
        'Nhận Cổ tức Lợi nhuận P&L chi nhánh hàng quý',
        'Đặc quyền cấp vốn mở chi nhánh nhượng quyền Wings Lashes mới',
        'Tự do tài chính và vị thế Người dẫn dắt trong ngành làm đẹp',
      ],
      gateText: 'Đỉnh vinh quang! Bạn đã đạt nấc thang cao nhất và trở thành Đồng sở hữu Wings Lashes.',
    },
  ];

  const currentIslandData = islands.find((i) => i.id === activeIsland) || islands[0];
  const expProgressStyle = { width: `${Math.min(100, Math.round((sliderOrders / config.cvToCc.minOrders) * 100))}%` };

  return (
    <div className="min-h-screen bg-rose-50/40 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-24 transition-colors duration-200">
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />

      {/* TOP GAMER STATUS BAR (PLAYER HUD) */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-pink-200 dark:border-slate-800 px-3.5 py-2.5 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {/* Player Avatar & Status */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-400 via-rose-400 to-purple-400 p-0.5 shadow-md shadow-pink-500/25">
                <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center text-xl overflow-hidden">
                  🧝‍♀️
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 text-[10px] font-black bg-pink-500 text-white px-1 py-0.2 rounded-full border border-white font-mono">
                Lv.4
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                  {selectedHero === 'my_account' && liveData
                    ? liveData.staffName
                    : selectedHero === 'lan_anh'
                      ? 'Lan Anh'
                      : selectedHero === 'bao_tran'
                        ? 'Bảo Trân'
                        : 'Thảo My'}
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300">
                  ✨ Tu Chân CV
                </span>
              </div>

              {/* Mini EXP Bar */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-20 sm:w-24 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-300"
                    style={expProgressStyle}
                  />
                </div>
                <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 font-bold tabular-nums">
                  {Math.min(100, Math.round((sliderOrders / config.cvToCc.minOrders) * 100))}% EXP
                </span>
              </div>
            </div>
          </div>

          {/* Currencies & Admin Setting Button */}
          <div className="flex items-center gap-1.5">
            {/* Chuối (Banana Coin) */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold font-mono shadow-xs">
              <span>🍌</span>
              <span className="tabular-nums">1,450</span>
            </div>

            {/* Admin Config Button */}
            {['admin', 'super_admin'].includes(currentUser?.role?.toLowerCase() || '') && (
              <button
                onClick={() => {
                  playSound('pop');
                  setIsConfigDrawerOpen(true);
                }}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 active:scale-90 transition hover:border-pink-400"
                title="Cấu hình quy chuẩn thăng cấp"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-md mx-auto px-3.5 pt-3.5 space-y-4">
        {/* WORLD MAP BANNER: 5 FLOATING ISLANDS */}
        <div className="rounded-3xl p-4 bg-gradient-to-br from-pink-50 via-purple-50 to-sky-50 dark:from-slate-900 dark:via-purple-950/40 dark:to-slate-900 border-2 border-pink-200/80 dark:border-pink-500/30 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-pink-500 text-white text-[10px] font-black tracking-wide shadow-xs">
              🗺️ BẢN ĐỒ THẾ GIỚI THIÊN THẦN
            </div>
            <span className="text-[10px] text-pink-600 dark:text-pink-300 font-bold font-mono">5 Vương Quốc</span>
          </div>

          <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
            <span>Hành Trình Thăng Cấp RPG</span>
            <span className="text-sm">✨</span>
          </h1>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug mt-1">
            Vượt ải Thợ Kỹ Thuật ➔ Mở khóa Phù Thủy Sảnh ➔ Nhạc Trưởng Sàn ➔ Nữ Thần Hạnh Phúc ➔ Nữ Hoàng Đồng Sáng Lập!
          </p>

          {/* 5 ISLANDS INTERACTIVE TRACK */}
          <div className="mt-3.5 pt-3 border-t border-pink-200/60 dark:border-pink-500/20">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 pt-0.5 -mx-2 px-2 scroll-smooth">
              {islands.map((island) => {
                const isActive = activeIsland === island.id;
                return (
                  <button
                    key={island.id}
                    onClick={() => {
                      playSound('pop');
                      setActiveIsland(island.id);
                    }}
                    className={`flex-shrink-0 w-24 p-2.5 rounded-2xl border transition-all text-center relative group active:scale-95 ${
                      isActive
                        ? 'bg-white dark:bg-slate-800 border-pink-500 shadow-md shadow-pink-500/20 ring-2 ring-pink-500/30'
                        : 'bg-white/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <span
                      className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase ${
                        isActive
                          ? 'bg-pink-500 text-white'
                          : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {island.badge}
                    </span>
                    <div className="text-2xl mt-1">{island.icon}</div>
                    <div className="text-[11px] font-black text-slate-900 dark:text-white mt-1">
                      {island.name.split('·')[0]}
                    </div>
                    <div className="text-[9px] text-pink-700 dark:text-pink-300 font-bold truncate">
                      {island.name.split('·')[1]}
                    </div>
                    <div className="text-[8px] text-slate-400 font-mono mt-0.5 truncate">{island.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ACTIVE REALM HERO CARD */}
        <div className="rounded-3xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300">
                {currentIslandData.badge}: {currentIslandData.name}
              </span>
              <h2 className="text-base font-black text-slate-900 dark:text-white mt-1">{currentIslandData.title}</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                &ldquo;{currentIslandData.desc}&rdquo;
              </p>
            </div>
            <span className="text-3xl p-2 rounded-2xl bg-pink-50 dark:bg-slate-800 border border-pink-100 dark:border-slate-700">
              {currentIslandData.icon}
            </span>
          </div>

          <div className="text-[11px] text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
            <strong>Trọng tâm sứ mệnh:</strong> {currentIslandData.focus}
          </div>

          {/* SKILLS ACCORDION */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>BỘ KỸ NĂNG CẦN LUYỆN</span>
            </div>
            <div className="space-y-1.5">
              {currentIslandData.skills.map((skill, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{skill.name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{skill.desc}</div>
                  </div>
                  <span className="text-[9px] font-black text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-500/10 px-1.5 py-0.5 rounded-md font-mono border border-pink-200 dark:border-pink-800">
                    Lv.Max
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* PERKS LIST */}
          <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-500/30 space-y-1.5">
            <div className="text-xs font-black text-amber-900 dark:text-amber-300 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>QUYỀN LỢI & THU NHẬP MỞ KHÓA</span>
            </div>
            <ul className="text-[11px] text-amber-800 dark:text-amber-200 space-y-1 pl-4 list-disc">
              {currentIslandData.perks.map((perk, idx) => (
                <li key={idx}>{perk}</li>
              ))}
            </ul>
          </div>

          {/* GATE INFO NOTE */}
          <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 text-[11px] text-purple-900 dark:text-purple-300">
            🎯 <strong>Cánh Cổng Thăng Cấp:</strong> {currentIslandData.gateText}
          </div>
        </div>

        {/* RPG QUEST BOARD & BOSS BATTLE (SIMULATOR FOR IPHONE 12) */}
        <div className="rounded-3xl p-4 bg-white dark:bg-slate-900 border-2 border-purple-200 dark:border-purple-900/50 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 text-[10px] font-black">
                ⚔️ ĐẤU TRƯỜNG THĂNG CẤP (CV ➔ CC)
              </div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">Chinh Phục 5 Ải Thử Thách</h2>
            </div>

            <select
              value={selectedHero}
              onChange={(e) => handleSelectHero(e.target.value)}
              className="bg-pink-50 dark:bg-slate-950 border border-pink-300 dark:border-purple-800 text-pink-900 dark:text-purple-300 text-xs rounded-xl px-2 py-1 font-bold focus:outline-none"
            >
              <option value="thao_my">Thảo My (Chiến Thần)</option>
              <option value="lan_anh">Lan Anh (Học Việc)</option>
              <option value="bao_tran">Bảo Trân (Siêu Sao)</option>
              {liveData && <option value="my_account">Tài khoản của tôi (Live)</option>}
            </select>
          </div>

          {/* 4 Standard Quests + 1 Final Boss Battle */}
          <div className="space-y-2.5">
            {/* Quest 1 */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>🎯</span>
                  <span>1. Vũ Điệu Nhíp Vàng (Ca làm)</span>
                </span>
                <span
                  className={`font-mono font-black tabular-nums ${
                    q1Passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                  }`}
                >
                  {sliderOrders} / {config.cvToCc.minOrders} ca {q1Passed ? '✔' : '✖'}
                </span>
              </div>
              <Slider
                min={100}
                max={600}
                value={sliderOrders}
                onChange={(val) => {
                  playSound('pop');
                  setSliderOrders(val);
                }}
              />
              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex justify-between">
                <span>Cần tối thiểu: {config.cvToCc.minOrders} ca mi</span>
                <span className={q1Passed ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                  {q1Passed ? 'ĐẠT CHỈ TIÊU' : 'CHƯA ĐỦ CA'}
                </span>
              </div>
            </div>

            {/* Quest 2 */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>💖</span>
                  <span>2. Cơn Mưa Tiền Tip (Hơn TB Shop)</span>
                </span>
                <span
                  className={`font-mono font-black tabular-nums ${
                    q2Passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                  }`}
                >
                  {sliderTip > 0 ? `+${sliderTip}%` : `${sliderTip}%`} {q2Passed ? '✔' : '✖'}
                </span>
              </div>
              <Slider
                min={-50}
                max={50}
                value={sliderTip}
                onChange={(val) => {
                  playSound('pop');
                  setSliderTip(val);
                }}
              />
              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex justify-between">
                <span>Yêu cầu: % Tip &gt; 0% so với TB</span>
                <span className={q2Passed ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                  {q2Passed ? 'KHÁCH CỰC MÊ' : 'CẦN NỤ CƯỜI HƠN'}
                </span>
              </div>
            </div>

            {/* Quest 3 */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>🛡️</span>
                  <span>3. Khắc Tinh Rụng Mi (Lỗi Fix)</span>
                </span>
                <span
                  className={`font-mono font-black tabular-nums ${
                    q3Passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                  }`}
                >
                  {sliderFix.toFixed(1)}% {q3Passed ? '✔' : '✖'}
                </span>
              </div>
              <Slider
                min={0}
                max={5}
                step={0.1}
                value={sliderFix}
                onChange={(val) => {
                  playSound('pop');
                  setSliderFix(val);
                }}
              />
              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex justify-between">
                <span>Tiêu chuẩn: Tỷ lệ Fix &le; {(config.cvToCc.maxFixRate * 100).toFixed(1)}%</span>
                <span className={q3Passed ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                  {q3Passed ? 'TAY NGHỀ VỮNG' : 'LỖI FIX CAO'}
                </span>
              </div>
            </div>

            {/* Quest 4 */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>⭐</span>
                  <span>4. Nụ Cười Thiên Sứ (HI)</span>
                </span>
                <span
                  className={`font-mono font-black tabular-nums ${
                    q4Passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                  }`}
                >
                  {sliderHi}% {q4Passed ? '✔' : '✖'}
                </span>
              </div>
              <Slider
                min={40}
                max={100}
                value={sliderHi}
                onChange={(val) => {
                  playSound('pop');
                  setSliderHi(val);
                }}
              />
              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex justify-between">
                <span>Mục tiêu: Happiness Index &ge; {(config.cvToCc.minHappinessIndex * 100).toFixed(0)}%</span>
                <span className={q4Passed ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                  {q4Passed ? 'SIÊU THIỆN CẢM' : 'CHƯA ĐẠT HI'}
                </span>
              </div>
            </div>

            {/* Quest 5: TRÙM CUỐI */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-rose-500/10 border-2 border-pink-400/80 dark:border-pink-500/80 shadow-md space-y-2">
              <div className="flex justify-between items-center text-xs font-black">
                <span className="text-pink-700 dark:text-pink-300 flex items-center gap-1.5">
                  <span className="text-base">🔥</span>
                  <span>TRÙM CUỐI: TỰ BÁN COMBO</span>
                </span>
                <span
                  className={`font-mono text-sm font-black tabular-nums ${
                    bossPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                  }`}
                >
                  {sliderCombo.toFixed(1)}% {bossPassed ? '✔ VƯỢT MỐC' : '✖'}
                </span>
              </div>
              <Slider
                min={0}
                max={50}
                step={0.5}
                value={sliderCombo}
                onChange={(val) => {
                  playSound('pop');
                  setSliderCombo(val);
                }}
              />
              <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-300 font-bold">
                <span className="px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 border border-pink-300 dark:border-pink-700">
                  MỐC SỐNG CÒN: &ge; {(config.cvToCc.minSelfComboRate * 100).toFixed(1)}% COMBO NOT LIVE
                </span>
                <span className={bossPassed ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                  {bossPassed ? 'ĐÃ VƯỢT ẢI TRÙM' : 'DƯỚI CHỈ TIÊU'}
                </span>
              </div>
            </div>
          </div>

          {/* VICTORY OR ALTERNATE PATH BANNER */}
          {allPassed && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
              <div className="font-black flex items-center gap-1.5">
                <span>🏆</span>
                <span>HOÀN THÀNH 5/5 THỬ THÁCH! VICTORY</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Tuyệt vời! Thiên Thần đã hạ gục toàn bộ 4 chỉ số tay nghề thợ mi và vượt qua Ải Trùm Cuối với tỷ lệ tự
                bán Combo {sliderCombo.toFixed(1)}% (&ge; {(config.cvToCc.minSelfComboRate * 100).toFixed(0)}%). Hãy
                nhấn nút bên dưới để mở khóa chức danh <strong>Phù Thủy Sảnh (CC)</strong>!
              </p>
            </div>
          )}

          {isMasterTech && (
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-black flex items-center gap-1.5">
                <span>⭐</span>
                <span>LỘ TRÌNH ĐỀ XUẤT: MASTER TECHNICIAN</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Thiên Thần đạt điểm tuyệt đối về kỹ thuật nối mi nhưng không phù hợp với bán hàng tư vấn (dưới{' '}
                {(config.cvToCc.minSelfComboRate * 100).toFixed(0)}% Combo). Bạn hoàn toàn có thể phát huy tối đa theo
                nhánh <strong>Chuyên Viên Bậc Cao (Master Tech)</strong> chuyên phục vụ khách VIP và đào tạo thợ mới!
              </p>
            </div>
          )}
        </div>
      </main>

      {/* BOTTOM ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-pink-200 dark:border-slate-800 p-3 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="text-[11px] leading-tight">
            <div className="font-bold text-slate-800 dark:text-slate-200">
              {allPassed
                ? 'ĐỦ ĐIỀU KIỆN THĂNG CẤP CC'
                : isMasterTech
                  ? 'ĐỀ XUẤT NHÁNH MASTER TECH'
                  : `TIẾN ĐỘ: ${passedCount}/5 ẢI ĐẠT`}
            </div>
            <div className="text-pink-600 dark:text-pink-400 font-mono text-[10px]">
              {allPassed ? 'Mở khóa Level × 65đ + 20% Tip' : 'Cần rèn luyện thêm'}
            </div>
          </div>

          <button
            onClick={() => {
              if (allPassed) {
                triggerConfetti();
                message.success('🎉 Chúc mừng Thiên Thần đã thăng cấp thành công lên Phù Thủy Sảnh (CC)!');
              } else if (isMasterTech) {
                playSound('fanfare');
                message.info('⭐ Đã chuyển thành công sang Lộ trình Chuyên Gia (Master Technician)!');
              } else {
                playSound('pop');
                message.warning(`Bạn cần hoàn thành cả 5 ải (Hiện đạt ${passedCount}/5)!`);
              }
            }}
            className={`px-4 py-2.5 rounded-2xl font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 ${
              allPassed
                ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white shadow-pink-500/30 animate-pulse'
                : isMasterTech
                  ? 'bg-amber-500 text-white shadow-amber-500/30'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>🎉</span>
            <span>{allPassed ? 'THĂNG CẤP LÊN CC!' : isMasterTech ? 'CHỌN MASTER TECH' : 'CHƯA ĐỦ ĐIỀU KIỆN'}</span>
          </button>
        </div>
      </div>

      {/* ADMIN CONFIG DRAWER */}
      <CareerConfigDrawer
        open={isConfigDrawerOpen}
        onClose={() => setIsConfigDrawerOpen(false)}
        config={config}
        onConfigChange={setConfig}
        onSave={handleSaveConfig}
        saving={savingConfig}
        themeMode={themeMode}
      />
    </div>
  );
}
