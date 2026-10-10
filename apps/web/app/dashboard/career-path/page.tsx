'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, Slider, message, Tooltip, Switch, Avatar } from 'antd';
import { Settings, Zap, Award } from 'lucide-react';
import type {
  CareerProgressionConfig,
  StaffCareerStatus,
  CareerStaffSummary,
  CareerRole,
  CareerPeriod,
  BananaTransactionCategory,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { useTheme } from '../../../context/ThemeContext';
import { AdaptiveDrawer } from '../../../components/ui/AdaptiveOverlay';
import { CareerConfigDrawer } from './components/CareerConfigDrawer';
import { BananaTransactionDrawer } from './components/BananaTransactionDrawer';
import { StaffCareerSelector, type CareerSelectorMode } from './components/StaffCareerSelector';
import { RealStaffSimulationCard } from './components/RealStaffSimulationCard';
import { CareerRealmEncyclopedia } from './components/CareerRealmEncyclopedia';
import { IslandGameIcon, WingRoleLabel } from './components/IslandGameIcon';
import { FALLBACK_CAREER_PROGRESSION_CONFIG, getCareerIslands, formatCareerRoleName } from './career-path.constants';

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
  const [activeIsland, setActiveIsland] = useState<
    'ktv' | 'cv' | 'cv_plus' | 'cv_plus_plus' | 'fm' | 'cho' | 'boss' | 'cc'
  >('cv');
  const [config, setConfig] = useState<CareerProgressionConfig>(FALLBACK_CAREER_PROGRESSION_CONFIG);
  const [staffList, setStaffList] = useState<CareerStaffSummary[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [selectedStaffStatus, setSelectedStaffStatus] = useState<StaffCareerStatus | null>(null);
  const [syncingProd, setSyncingProd] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [activeRoleFilter, setActiveRoleFilter] = useState<string>('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState<CareerPeriod>('last_month');

  const [loading, setLoading] = useState<boolean>(true);
  const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState<boolean>(false);
  const [isBananaDrawerOpen, setIsBananaDrawerOpen] = useState<boolean>(false);
  const [bananaDrawerCategory, setBananaDrawerCategory] = useState<BananaTransactionCategory>('ALL');
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [selectorMode, setSelectorMode] = useState<CareerSelectorMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('mos_career_selector_mode') as CareerSelectorMode | null;
        if (saved === 'ultra_compact' || saved === 'cards' || saved === 'table') {
          return saved;
        }
      } catch (_) {}
    }
    return 'cards';
  });
  const [isStaffSelectorCollapsed, setIsStaffSelectorCollapsed] = useState<boolean>(true);
  const [isEncyclopediaDrawerOpen, setIsEncyclopediaDrawerOpen] = useState<boolean>(false);

  // Sliders for interactive simulation
  const [sliderOrders, setSliderOrders] = useState<number>(300);
  const [sliderCombo, setSliderCombo] = useState<number>(25);
  const [simulationTarget, setSimulationTarget] = useState<'CV_PLUS' | 'CV_PLUS_PLUS'>('CV_PLUS');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const safeConfig: CareerProgressionConfig = useMemo(() => {
    const base = FALLBACK_CAREER_PROGRESSION_CONFIG;
    if (!config || !config.cvToCc) return base;
    return {
      ...base,
      ...config,
      cvToCvPlus: { ...base.cvToCvPlus, ...(config.cvToCvPlus || {}) },
      cvPlusToCvPlusPlus: { ...base.cvPlusToCvPlusPlus, ...(config.cvPlusToCvPlusPlus || {}) },
      cvPlusPlusToFm: { ...base.cvPlusPlusToFm, ...(config.cvPlusPlusToFm || {}) },
      cvToCc: { ...base.cvToCc, ...(config.cvToCc || {}) },
      ccToFm: { ...base.ccToFm, ...(config.ccToFm || {}) },
      fmToCho: { ...base.fmToCho, ...(config.fmToCho || {}) },
      choToBoss: { ...base.choToBoss, ...(config.choToBoss || {}) },
      rewardRates: { ...base.rewardRates, ...(config.rewardRates || {}) },
    };
  }, [config]);

  const { cvToCc, cvPlusToCvPlusPlus, cvPlusPlusToFm, ccToFm, fmToCho, choToBoss, rewardRates } = safeConfig;

  const fetchStaffProgression = useCallback(
    async (staffId: number, refresh = false, targetRole?: 'CV_PLUS' | 'CV_PLUS_PLUS', period?: CareerPeriod) => {
      try {
        const activePeriod = period || selectedPeriod;
        const res = await apiClient.career.getStaffProgression(staffId, refresh, targetRole, activePeriod);
        setSelectedStaffStatus(res);
        if (res?.metrics) {
          setSliderOrders(res.metrics.ordersCount || 300);
          setSliderCombo(Math.round((res.metrics.selfComboRate || 0.25) * 100));
        }
        if (res?.lastSyncedAt) {
          setLastSyncedAt(res.lastSyncedAt);
        }
      } catch (_err) {
        // fallback
      }
    },
    [selectedPeriod]
  );

  const handleSimulationTargetChange = (target: 'CV_PLUS' | 'CV_PLUS_PLUS') => {
    playSound('pop');
    setSimulationTarget(target);
    if (selectedStaffId) {
      fetchStaffProgression(selectedStaffId, false, target, selectedPeriod);
    }
  };

  // Load config & live data
  const loadData = useCallback(
    async (periodToLoad?: CareerPeriod) => {
      try {
        setLoading(true);
        const activeP = periodToLoad || selectedPeriod;
        const [fetchedConfig, fetchedStaffList] = await Promise.allSettled([
          apiClient.career.getConfig(),
          apiClient.career.listStaff({ period: activeP }),
        ]);

        if (fetchedConfig.status === 'fulfilled' && fetchedConfig.value?.cvToCc) {
          setConfig(fetchedConfig.value);
        }

        if (fetchedStaffList.status === 'fulfilled' && fetchedStaffList.value?.length > 0) {
          const list = fetchedStaffList.value;
          setStaffList(list);

          // Auto select first technician or staff member
          const defaultStaff =
            (selectedStaffId ? list.find((s) => s.id === selectedStaffId) : null) ||
            list.find((s) => ['CV', 'CV_PLUS', 'CV_PLUS_PLUS'].includes(s.careerRole)) ||
            list[0];
          if (defaultStaff) {
            setSelectedStaffId(defaultStaff.id);
            const defaultTarget = defaultStaff.careerRole === 'CV_PLUS' ? 'CV_PLUS_PLUS' : 'CV_PLUS';
            setSimulationTarget(defaultTarget);
            fetchStaffProgression(defaultStaff.id, false, defaultTarget, activeP);
          }
        }
      } catch (_err) {
        // Graceful fallback to default simulation
      } finally {
        setLoading(false);
      }
    },
    [selectedPeriod, selectedStaffId, fetchStaffProgression]
  );

  const handlePeriodChange = (newPeriod: CareerPeriod) => {
    playSound('pop');
    setSelectedPeriod(newPeriod);
    loadData(newPeriod);
  };

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

  const openBananaDrawer = useCallback(
    (staffId?: number | null, category: BananaTransactionCategory = 'ALL') => {
      playSound('pop');
      if (staffId && staffId !== selectedStaffId) {
        setSelectedStaffId(staffId);
      }
      setBananaDrawerCategory(category);
      setIsBananaDrawerOpen(true);
    },
    [selectedStaffId]
  );

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

  const handleSelectStaff = (staffId: number) => {
    playSound('pop');
    setSelectedStaffId(staffId);
    const staff = staffList.find((s) => s.id === staffId);
    const defaultTarget = staff?.careerRole === 'CV_PLUS' ? 'CV_PLUS_PLUS' : 'CV_PLUS';
    setSimulationTarget(defaultTarget);
    fetchStaffProgression(staffId, false, defaultTarget, selectedPeriod);
  };

  const handleSyncProd = async () => {
    try {
      setSyncingProd(true);
      const res = await apiClient.career.syncProd();
      message.success(res.message || 'Đã làm mới dữ liệu từ Production!');
      setLastSyncedAt(res.timestamp || new Date().toISOString());

      const updatedList = await apiClient.career.listStaff({ period: selectedPeriod });
      setStaffList(updatedList);

      if (selectedStaffId) {
        await fetchStaffProgression(selectedStaffId, true, simulationTarget, selectedPeriod);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi làm mới dữ liệu';
      message.error(msg);
    } finally {
      setSyncingProd(false);
    }
  };

  const handleActivateTrial = async () => {
    if (!selectedStaffId) return;
    try {
      setActionLoading(true);
      const res = await apiClient.career.activateTrial(selectedStaffId);
      setSelectedStaffStatus(res);
      playSound('fanfare');
      triggerConfetti();
      message.success('Đã mở khóa Ải Trùm Cuối: Bắt đầu 30 ngày thử thách tự tư vấn!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi mở ải';
      message.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromote = async () => {
    if (!selectedStaffId || !selectedStaffStatus) return;
    try {
      setActionLoading(true);
      const res = await apiClient.career.promoteStaff(selectedStaffId, selectedStaffStatus.targetRole);
      setSelectedStaffStatus(res);
      playSound('fanfare');
      triggerConfetti();
      message.success(
        `🎉 Chúc mừng ${selectedStaffStatus.staffName} đã thăng cấp thành công lên ${formatCareerRoleName(selectedStaffStatus.targetRole)}!`
      );
      setStaffList((prev) =>
        prev.map((s) => (s.id === selectedStaffId ? { ...s, careerRole: selectedStaffStatus.targetRole } : s))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi duyệt thăng cấp';
      message.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSwitchSpecialist = async () => {
    if (!selectedStaffId) return;
    try {
      setActionLoading(true);
      const res = await apiClient.career.switchToSpecialist(selectedStaffId);
      setSelectedStaffStatus(res);
      playSound('fanfare');
      message.info('⭐ Đã chuyển thành công sang Lộ trình Chuyên Gia (Master Technician)!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi chuyển nhánh';
      message.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetRole = async (staffId: number, newRole: CareerRole) => {
    try {
      setActionLoading(true);
      const res = await apiClient.career.setStaffRole(staffId, newRole);
      playSound('fanfare');
      triggerConfetti();
      message.success(`🎉 Đã cập nhật chức danh thành công lên ${formatCareerRoleName(newRole)}!`);
      setStaffList((prev) => prev.map((s) => (s.id === staffId ? { ...s, careerRole: newRole } : s)));
      if (selectedStaffId === staffId) {
        setSelectedStaffStatus(res);
        const nextTarget = newRole === 'CV_PLUS' ? 'CV_PLUS_PLUS' : 'CV_PLUS';
        setSimulationTarget(nextTarget);
        fetchStaffProgression(staffId, true, nextTarget);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi cập nhật chức danh';
      message.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDemote = async (staffId: number, targetRole: CareerRole) => {
    try {
      setActionLoading(true);
      const res = await apiClient.career.demoteStaff(staffId, targetRole);
      playSound('pop');
      message.info(`Đã điều chỉnh chức danh về ${formatCareerRoleName(targetRole)}.`);
      setStaffList((prev) => prev.map((s) => (s.id === staffId ? { ...s, careerRole: targetRole } : s)));
      if (selectedStaffId === staffId) {
        setSelectedStaffStatus(res);
        const nextTarget = targetRole === 'CV_PLUS' ? 'CV_PLUS_PLUS' : 'CV_PLUS';
        setSimulationTarget(nextTarget);
        fetchStaffProgression(staffId, true, nextTarget);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi hạ cấp';
      message.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Save admin config
  const handleSaveConfig = async (payload: {
    cvToCc: typeof safeConfig.cvToCc;
    cvToCvPlus: typeof safeConfig.cvToCvPlus;
    cvPlusToCvPlusPlus: typeof safeConfig.cvPlusToCvPlusPlus;
  }) => {
    try {
      setSavingConfig(true);
      const updated = await apiClient.career.updateConfig(payload);
      setConfig(updated);
      if (selectedStaffId) {
        await fetchStaffProgression(selectedStaffId, true, simulationTarget);
      }
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
  const islands = useMemo(() => getCareerIslands(safeConfig), [safeConfig]);

  const currentIslandData = islands.find((i) => i.id === activeIsland) || islands[0];
  const staffRealOrders = selectedStaffStatus?.metrics?.ordersCount || 0;
  const expProgressStyle = { width: `${Math.min(100, Math.round((staffRealOrders / cvToCc.minOrders) * 100))}%` };

  return (
    <div className="min-h-screen bg-rose-50/40 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-12 transition-colors duration-200">
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />

      {/* TOP COMPACT STATUS BAR (PLAYER HUD) */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-pink-200 dark:border-slate-800 px-3.5 py-2 shadow-xs">
        <div className="w-full max-w-[1880px] mx-auto flex items-center justify-between px-2 sm:px-4">
          {/* Player Avatar & Status */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-400 via-rose-400 to-purple-400 p-0.5 shadow-md shadow-pink-500/25">
                <Avatar
                  src={selectedStaffStatus?.avatarUrl || undefined}
                  shape="square"
                  className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center text-lg overflow-hidden font-black text-white border-0 [&>img]:object-cover [&>img]:w-full [&>img]:h-full"
                >
                  {selectedStaffStatus?.staffName ? selectedStaffStatus.staffName.slice(0, 1).toUpperCase() : '🧝‍♀️'}
                </Avatar>
              </div>
              <span className="absolute -bottom-1 -right-1 text-[9px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded-full border border-white dark:border-slate-900 font-mono whitespace-nowrap shadow-xs">
                {formatCareerRoleName(selectedStaffStatus?.currentRole || 'CV', true)}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                  {selectedStaffStatus?.staffName || 'Đang chọn nhân sự...'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300">
                  ✨ {formatCareerRoleName(selectedStaffStatus?.currentRole || 'CV', true)}
                </span>
              </div>

              {/* Mini EXP Bar */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-20 sm:w-28 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-300"
                    style={expProgressStyle}
                  />
                </div>
                <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 font-bold tabular-nums">
                  {Math.min(100, Math.round((staffRealOrders / cvToCc.minOrders) * 100))}% EXP
                </span>
              </div>
            </div>
          </div>

          {/* Currencies & Admin Setting Button */}
          <div className="flex items-center gap-2">
            {/* Tổng số chuối dư (Banana Balance) */}
            {(() => {
              const realBalance =
                typeof selectedStaffStatus?.metrics?.bananaBalance === 'number'
                  ? selectedStaffStatus.metrics.bananaBalance
                  : 0;
              const isNegative = realBalance < 0;

              return (
                <div
                  onClick={() => openBananaDrawer(selectedStaffId, 'ALL')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold font-mono shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                    isNegative
                      ? 'bg-rose-50 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 hover:border-rose-400'
                      : 'bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 hover:border-amber-400'
                  }`}
                  title={`Số dư chuối của ${selectedStaffStatus?.staffName || 'nhân sự'}: ${realBalance.toLocaleString('vi-VN')} · Nhấn để xem sao kê lịch sử chuối`}
                >
                  <span>🍌</span>
                  <span className="tabular-nums">{realBalance.toLocaleString('vi-VN')}</span>
                </div>
              );
            })()}

            {/* Desktop FHD indicator */}
            <span className="hidden xl:inline-flex text-[10px] px-2.5 py-1 rounded-xl bg-pink-500/10 dark:bg-pink-500/20 text-pink-600 dark:text-pink-300 border border-pink-500/30 font-bold">
              🖥️ Desktop FHD Mode
            </span>

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
      <main className="w-full max-w-[1880px] mx-auto px-3.5 sm:px-5 xl:px-6 pt-3.5 space-y-4">
        {/* WORLD MAP BANNER: 6 FLOATING ISLANDS */}
        <div className="rounded-3xl p-4 bg-gradient-to-br from-pink-50 via-purple-50 to-sky-50 dark:from-slate-900 dark:via-purple-950/40 dark:to-slate-900 border-2 border-pink-200/80 dark:border-pink-500/30 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-pink-500 text-white text-[10px] font-black tracking-wide shadow-xs">
              🗺️ BẢN ĐỒ THẾ GIỚI THIÊN THẦN
            </div>
            <span className="text-[10px] text-pink-600 dark:text-pink-300 font-bold font-mono">
              7 Vương Quốc Panoramic · Nhìn trọn 1 màn hình
            </span>
          </div>

          <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
            <span>Hành Trình Thăng Cấp RPG</span>
            <span className="text-sm">✨</span>
          </h1>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug mt-1">
            Vượt ải ⛑️ KTV Thử Việc ➔ CV · Dịu Dàng ➔ <WingRoleLabel text="🪽 CV" /> · Thanh Lịch ➔{' '}
            <WingRoleLabel text="🪽 CV 🪽" /> · Quí Phái ➔ 🏰 FM Nữ Thần Sàn ➔ 💖 CHO Mẹ Thiên Thần ➔ 💎 BOSS Co-Owner!
          </p>

          {/* 7 ISLANDS PANORAMIC GRID ON DESKTOP FHD */}
          <div className="mt-3 pt-1 border-t border-pink-200/60 dark:border-pink-500/20">
            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2.5 pt-3.5">
              {islands.map((island) => {
                const isActive = activeIsland === island.id;
                return (
                  <button
                    key={island.id}
                    onClick={() => {
                      playSound('pop');
                      setActiveIsland(island.id);
                      setIsEncyclopediaDrawerOpen(true);
                    }}
                    className={`w-full p-2 sm:p-2.5 rounded-2xl border transition-all text-center relative group active:scale-95 ${
                      isActive
                        ? 'bg-white dark:bg-slate-800 border-pink-500 shadow-md shadow-pink-500/20 ring-2 ring-pink-500/30'
                        : 'bg-white/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <span
                      className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase whitespace-nowrap shadow-xs z-10 ${
                        isActive
                          ? 'bg-pink-500 text-white shadow-pink-500/30 ring-1 ring-white/50'
                          : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {island.badge}
                    </span>
                    <div className="mt-1 mb-1 flex justify-center">
                      <IslandGameIcon islandId={island.id} size="md" isActive={isActive} />
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-black text-slate-900 dark:text-white mt-0.5">
                      <WingRoleLabel text={island.name.split('·')[0]?.trim()} />
                    </div>
                    <div className="text-[8px] sm:text-[9px] text-pink-700 dark:text-pink-300 font-bold truncate">
                      {island.name.split('·')[1]?.trim()}
                    </div>
                    <div className="text-[7.5px] sm:text-[8px] text-slate-400 font-mono mt-0.5 truncate">
                      {island.sub}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* STAFF LIST SELECTOR & AUDIT (HORIZONTAL AVATAR RAIL OR EXPANDABLE TABLE) */}
        <div className="w-full space-y-3 transition-all duration-300">
          <StaffCareerSelector
            staffList={staffList}
            selectedStaffId={selectedStaffId}
            onSelectStaff={handleSelectStaff}
            onSyncProd={handleSyncProd}
            syncing={syncingProd}
            lastSyncedAt={lastSyncedAt}
            activeRoleFilter={activeRoleFilter}
            onRoleFilterChange={setActiveRoleFilter}
            period={selectedPeriod}
            onPeriodChange={handlePeriodChange}
            onSetRole={handleSetRole}
            onDemote={handleDemote}
            actionLoading={actionLoading}
            onOpenBananaDrawer={(staffId, cat) => openBananaDrawer(staffId, cat)}
            selectorMode={selectorMode}
            onSelectorModeChange={(mode) => {
              setSelectorMode(mode);
              setIsStaffSelectorCollapsed(mode !== 'table');
            }}
            isCollapsedHorizontal={selectorMode !== 'table'}
            onCollapseHorizontal={() => {
              setIsStaffSelectorCollapsed(true);
            }}
            onExpandHorizontal={() => {
              setSelectorMode('table');
              setIsStaffSelectorCollapsed(false);
            }}
          />
        </div>

        {/* REAL STAFF SIMULATION CARD & ENCYCLOPEDIA (FULL WIDTH) */}
        <div className="w-full space-y-4 transition-all duration-300">
          <RealStaffSimulationCard
            status={selectedStaffStatus}
            config={safeConfig}
            sliderOrders={sliderOrders}
            setSliderOrders={setSliderOrders}
            sliderCombo={sliderCombo}
            setSliderCombo={setSliderCombo}
            onActivateTrial={handleActivateTrial}
            onPromote={handlePromote}
            onDemote={
              selectedStaffStatus?.currentRole && selectedStaffStatus.currentRole !== 'CV'
                ? () =>
                    handleDemote(
                      selectedStaffId!,
                      selectedStaffStatus.currentRole === 'CV_PLUS_PLUS' ? 'CV_PLUS' : 'CV'
                    )
                : undefined
            }
            onSetRole={selectedStaffId ? (role) => handleSetRole(selectedStaffId, role) : undefined}
            onSwitchSpecialist={handleSwitchSpecialist}
            loadingAction={actionLoading}
            simulationTarget={simulationTarget}
            onSimulationTargetChange={handleSimulationTargetChange}
            onOpenBananaDrawer={(cat) => openBananaDrawer(selectedStaffId, cat)}
          />
        </div>
      </main>

      {/* ACTIVE REALM LORE & SKILL ENCYCLOPEDIA DRAWER */}
      <AdaptiveDrawer
        title={
          <div className="flex items-center gap-2">
            <IslandGameIcon islandId={currentIslandData.id} size="sm" isActive />
            <span className="font-black text-base">{currentIslandData.name}</span>
          </div>
        }
        placement="right"
        width={680}
        open={isEncyclopediaDrawerOpen}
        onClose={() => setIsEncyclopediaDrawerOpen(false)}
        destroyOnHidden
      >
        <CareerRealmEncyclopedia currentIslandData={currentIslandData} />
      </AdaptiveDrawer>

      {/* ADMIN CONFIG DRAWER */}
      <CareerConfigDrawer
        open={isConfigDrawerOpen}
        onClose={() => setIsConfigDrawerOpen(false)}
        config={safeConfig}
        onConfigChange={setConfig}
        onSave={handleSaveConfig}
        saving={savingConfig}
        themeMode={themeMode}
      />

      {/* BANANA TRANSACTION & GIVE AWAY DRAWER */}
      <BananaTransactionDrawer
        open={isBananaDrawerOpen}
        onClose={() => setIsBananaDrawerOpen(false)}
        staffId={selectedStaffId}
        staffName={selectedStaffStatus?.staffName}
        avatarUrl={selectedStaffStatus?.avatarUrl}
        initialCategory={bananaDrawerCategory}
        period={selectedPeriod}
      />
    </div>
  );
}
