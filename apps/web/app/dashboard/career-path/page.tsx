'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, Slider, message, Tooltip, Switch, Avatar } from 'antd';
import { Settings, Zap, Award, ChevronDown, UserCheck } from 'lucide-react';
import {
  type CareerProgressionConfig,
  type StaffCareerStatus,
  type CareerStaffSummary,
  type CareerRole,
  type CareerPeriod,
  type BananaTransactionCategory,
  isCanonicalSuperAdminIdentity,
  isSuperAdminRole,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { useTheme } from '../../../context/ThemeContext';
import { AdaptiveDrawer } from '../../../components/ui/AdaptiveOverlay';
import { CareerConfigDrawer } from './components/CareerConfigDrawer';
import { BananaTransactionDrawer } from './components/BananaTransactionDrawer';
import { StaffCareerSelector, type CareerSelectorMode } from './components/StaffCareerSelector';
import { MobileStaffCareerSheet } from './components/MobileStaffCareerSheet';
import { RealStaffSimulationCard } from './components/RealStaffSimulationCard';
import { CareerRealmEncyclopedia } from './components/CareerRealmEncyclopedia';
import { CareerBibleDrawer, type CareerBibleTopic } from './components/CareerBibleDrawer';
import { IslandGameIcon, WingRoleLabel } from './components/IslandGameIcon';
import { FALLBACK_CAREER_PROGRESSION_CONFIG, getCareerIslands, formatCareerRoleName } from './career-path.constants';
import { playCareerSound, triggerCareerConfetti } from './career-path-fx';

export default function CareerPathPage() {
  const { themeMode } = useTheme();
  const [currentUser, setCurrentUser] = useState<{
    id?: number;
    role?: string;
    username?: string;
    email?: string;
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

  const isDanny = useMemo(() => {
    if (!currentUser) return false;
    return (
      isSuperAdminRole(currentUser.role) ||
      isCanonicalSuperAdminIdentity({
        username: currentUser.username,
        email: currentUser.email,
      })
    );
  }, [currentUser]);

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
  const [selectedBibleTopic, setSelectedBibleTopic] = useState<CareerBibleTopic | null>(null);
  const [isMapDrawerOpen, setIsMapDrawerOpen] = useState<boolean>(false);
  const [isMobileStaffDrawerOpen, setIsMobileStaffDrawerOpen] = useState<boolean>(false);

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

          // 1. Sắp xếp danh sách Chuyên Viên theo số bộ mi (ordersCount) giảm dần (DESC), tie-break theo tên
          const sortedList = [...list].sort((a, b) => {
            const diff = (b.ordersCount || 0) - (a.ordersCount || 0);
            if (diff !== 0) return diff;
            return (a.displayName || '').localeCompare(b.displayName || '');
          });
          setStaffList(sortedList);

          // 2. Tự chọn người có số bộ mi cao nhất (ưu tiên trong nhóm CV/CV+/CV++)
          const cvPool = sortedList.filter((s) => ['CV', 'CV_PLUS', 'CV_PLUS_PLUS'].includes(s.careerRole));
          const targetPool = cvPool.length > 0 ? cvPool : sortedList;
          const highestOrdersStaff = targetPool[0];

          const defaultStaff =
            (selectedStaffId ? sortedList.find((s) => s.id === selectedStaffId) : null) || highestOrdersStaff;

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
    playCareerSound(type, audioCtxRef);
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
    triggerCareerConfetti(canvasRef.current, () => playSound('fanfare'));
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
    if (!isDanny) {
      message.error('Chỉ Super Admin (Danny) mới có quyền mở ải thử thách.');
      return;
    }
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
    if (!isDanny) {
      message.error('Chỉ Super Admin (Danny) mới có quyền duyệt thăng hạng cho Chuyên Viên.');
      return;
    }
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
    if (!isDanny) {
      message.error('Chỉ Super Admin (Danny) mới có quyền chuyển nhánh chuyên gia.');
      return;
    }
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
    if (!isDanny) {
      message.error('Chỉ Super Admin (Danny) mới có quyền thay đổi chức danh Chuyên Viên.');
      return;
    }
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
    if (!isDanny) {
      message.error('Chỉ Super Admin (Danny) mới có quyền hạ cấp Chuyên Viên.');
      return;
    }
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

  // Save admin config (Only Danny / Super Admin can save)
  const handleSaveConfig = async (payload: {
    cvToCc: typeof safeConfig.cvToCc;
    cvToCvPlus: typeof safeConfig.cvToCvPlus;
    cvPlusToCvPlusPlus: typeof safeConfig.cvPlusToCvPlusPlus;
  }) => {
    if (!isDanny) {
      message.error('Chỉ Super Admin (Danny) mới có quyền thay đổi cấu hình lộ trình thăng tiến.');
      return;
    }
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
    <div className="min-h-screen bg-rose-50/40 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-32 sm:pb-36 md:pb-12 transition-colors duration-200">
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />

      {/* TOP COMPACT STATUS BAR (PLAYER HUD) */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-pink-200 dark:border-slate-800 px-3 py-2.5 shadow-xs">
        <div className="w-full max-w-[1880px] mx-auto flex items-center justify-between">
          {/* Player Avatar & Status (Click to open staff picker on mobile) */}
          <button
            type="button"
            onClick={() => {
              playSound('pop');
              setIsMobileStaffDrawerOpen(true);
            }}
            className="flex items-center gap-2 text-left transition hover:opacity-90 active:scale-98 cursor-pointer group min-w-0"
            title="Nhấn để đổi chuyên viên"
          >
            <div className="relative shrink-0 w-10 h-10">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-400 via-rose-400 to-purple-400 p-0.5 shadow-md shadow-pink-500/25 group-hover:ring-2 group-hover:ring-pink-400">
                <Avatar
                  src={selectedStaffStatus?.avatarUrl || undefined}
                  shape="square"
                  className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center text-lg overflow-hidden font-black text-white border-0 [&>img]:object-cover [&>img]:w-full [&>img]:h-full"
                >
                  {selectedStaffStatus?.staffName ? selectedStaffStatus.staffName.slice(0, 1).toUpperCase() : '🧝‍♀️'}
                </Avatar>
              </div>
              <span className="absolute -bottom-0.5 -right-1 text-[9px] font-black bg-gradient-to-r from-rose-500 to-pink-500 text-white px-1.5 py-0.5 rounded-full border border-white dark:border-slate-900 shadow-sm whitespace-nowrap inline-flex items-center justify-center leading-none z-10">
                <WingRoleLabel
                  text={formatCareerRoleName(selectedStaffStatus?.currentRole || 'CV', true)}
                  iconSize={9.5}
                />
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1 truncate">
                  <span className="truncate max-w-[95px] xs:max-w-[120px] sm:max-w-none">
                    {selectedStaffStatus?.staffName || 'Đang chọn nhân sự...'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-pink-500 dark:text-pink-400 shrink-0 md:hidden" />
                </span>
                {/* Desktop-only full role badge (hidden on mobile to prevent clutter and weird oval wrap) */}
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 whitespace-nowrap shrink-0">
                  <span>✨</span>
                  <WingRoleLabel text={formatCareerRoleName(selectedStaffStatus?.currentRole || 'CV', true)} />
                </span>
              </div>

              {/* Mini EXP Bar */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-12 sm:w-24 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0 border border-slate-300 dark:border-slate-700 shrink-0">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-300"
                    style={expProgressStyle}
                  />
                </div>
                <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 font-bold tabular-nums whitespace-nowrap">
                  {Math.min(100, Math.round((staffRealOrders / cvToCc.minOrders) * 100))}%
                  <span className="hidden sm:inline"> EXP</span>
                </span>
              </div>
            </div>
          </button>

          {/* Currencies, 7 Islands & Admin Setting Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* 🗺️ 7 Đảo Button (Mobile & Desktop) */}
            <button
              type="button"
              onClick={() => {
                playSound('pop');
                setIsMapDrawerOpen(true);
              }}
              className="h-8 px-2.5 rounded-full bg-pink-500/15 dark:bg-pink-500/25 border border-pink-500/40 text-pink-700 dark:text-pink-300 text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer shrink-0 flex items-center gap-1 hover:bg-pink-500/30"
            >
              <span className="text-xs">🗺️</span>
              <span className="text-[11px] font-bold">7 Đảo</span>
            </button>

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
                  className={`h-8 flex items-center gap-1 px-2.5 rounded-full border text-xs font-bold font-mono shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0 ${
                    isNegative
                      ? 'bg-rose-50 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 hover:border-rose-400'
                      : 'bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 hover:border-amber-400'
                  }`}
                  title={`Số dư chuối của ${selectedStaffStatus?.staffName || 'nhân sự'}: ${realBalance.toLocaleString('vi-VN')} · Nhấn để xem sao kê lịch sử chuối`}
                >
                  <span className="text-xs">🍌</span>
                  <span className="tabular-nums">{realBalance.toLocaleString('vi-VN')}</span>
                </div>
              );
            })()}

            {/* Admin Config Button */}
            {['admin', 'super_admin'].includes(currentUser?.role?.toLowerCase() || '') && (
              <button
                onClick={() => {
                  playSound('pop');
                  setIsConfigDrawerOpen(true);
                }}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 active:scale-90 transition hover:border-pink-400 shrink-0"
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
        {/* WORLD MAP BANNER: 7 FLOATING ISLANDS (Desktop only) */}
        <div className="hidden md:block rounded-3xl p-4 bg-gradient-to-br from-pink-50 via-purple-50 to-sky-50 dark:from-slate-900 dark:via-purple-950/40 dark:to-slate-900 border-2 border-pink-200/80 dark:border-pink-500/30 shadow-md relative overflow-hidden">
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
            Vượt ải ⛑️ KTV Thử Việc ➔ CV ➔ <WingRoleLabel text="🪶 CV" /> ➔ <WingRoleLabel text="🪶 CV 🪶" /> ➔{' '}
            <WingRoleLabel text="🪽 FM 🪽" /> ➔ 💖 CHO ➔ 💎 BOSS Co-Owner!
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

        {/* STAFF LIST SELECTOR & AUDIT (Desktop only, Mobile uses Bottom Sheet) */}
        <div className="hidden md:block w-full space-y-3 transition-all duration-300">
          <StaffCareerSelector
            config={safeConfig}
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
            onSetRole={isDanny ? handleSetRole : undefined}
            onDemote={isDanny ? handleDemote : undefined}
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
            onActivateTrial={isDanny ? handleActivateTrial : undefined}
            onPromote={isDanny ? handlePromote : undefined}
            onDemote={
              isDanny && selectedStaffStatus?.currentRole && selectedStaffStatus.currentRole !== 'CV'
                ? () =>
                    handleDemote(
                      selectedStaffId!,
                      selectedStaffStatus.currentRole === 'CV_PLUS_PLUS' ? 'CV_PLUS' : 'CV'
                    )
                : undefined
            }
            onSetRole={isDanny && selectedStaffId ? (role) => handleSetRole(selectedStaffId, role) : undefined}
            onSwitchSpecialist={isDanny ? handleSwitchSpecialist : undefined}
            loadingAction={actionLoading}
            simulationTarget={simulationTarget}
            onSimulationTargetChange={handleSimulationTargetChange}
            onOpenBananaDrawer={(cat) => openBananaDrawer(selectedStaffId, cat)}
            onOpenBibleTopic={(topic) => setSelectedBibleTopic(topic)}
          />
        </div>
      </main>

      {/* CAREER BIBLE DRAWER (KINH THÁNH mOS) */}
      <CareerBibleDrawer
        open={!!selectedBibleTopic}
        onClose={() => setSelectedBibleTopic(null)}
        topic={selectedBibleTopic}
      />

      {/* 7 ISLANDS MAP BOTTOM SHEET FOR MOBILE */}
      <AdaptiveDrawer
        title={
          <div className="flex items-center gap-2">
            <span className="text-base">🗺️</span>
            <span className="font-black text-base">Bản Đồ 7 Đảo Thế Giới Thiên Thần</span>
          </div>
        }
        placement="bottom"
        height="75vh"
        open={isMapDrawerOpen}
        onClose={() => setIsMapDrawerOpen(false)}
        destroyOnHidden
      >
        <div className="p-3 space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Chọn một vương quốc để khám phá bí tịch kỹ năng và chuẩn thăng tiến:
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {islands.map((island) => {
              const isActive = activeIsland === island.id;
              return (
                <button
                  key={island.id}
                  onClick={() => {
                    playSound('pop');
                    setActiveIsland(island.id);
                    setIsMapDrawerOpen(false);
                    setIsEncyclopediaDrawerOpen(true);
                  }}
                  className={`w-full p-3 rounded-2xl border text-left transition-all relative ${
                    isActive
                      ? 'bg-pink-50/70 dark:bg-pink-950/30 border-pink-500 shadow-sm ring-1 ring-pink-500/30'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <IslandGameIcon islandId={island.id} size="sm" isActive={isActive} />
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                        <WingRoleLabel text={island.name.split('·')[0]?.trim()} />
                      </div>
                      <div className="text-[10px] text-pink-600 dark:text-pink-300 font-bold truncate">
                        {island.name.split('·')[1]?.trim()}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{island.sub}</div>
                </button>
              );
            })}
          </div>
        </div>
      </AdaptiveDrawer>

      {/* 📱 MOBILE STAFF SELECTOR BOTTOM SHEET */}
      <AdaptiveDrawer
        title={
          <div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/25 flex items-center justify-center shrink-0">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
              <span className="font-black text-sm">Chọn Chuyên Viên</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-pink-500 text-white tabular-nums shadow-xs">
                {
                  staffList.filter(
                    (s) =>
                      ['lt', 'technician', 'cv', 'ktv'].includes((s.role || '').toLowerCase()) ||
                      ['KTV', 'CV', 'CV_PLUS', 'CV_PLUS_PLUS'].includes(s.careerRole)
                  ).length
                }{' '}
                CV
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal m-0 mt-0.5">
              Chạm để xem hồ sơ và kích hoạt thử thách
            </p>
          </div>
        }
        placement="bottom"
        height="85vh"
        open={isMobileStaffDrawerOpen}
        onClose={() => setIsMobileStaffDrawerOpen(false)}
        destroyOnHidden
      >
        <MobileStaffCareerSheet
          config={safeConfig}
          staffList={staffList}
          selectedStaffId={selectedStaffId}
          onSelectStaff={(id) => {
            handleSelectStaff(id);
          }}
          onClose={() => setIsMobileStaffDrawerOpen(false)}
        />
      </AdaptiveDrawer>

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
        canEdit={isDanny}
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
