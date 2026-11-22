'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { message } from 'antd';
import {
  type CareerProgressionConfig,
  type StaffCareerStatus,
  type CareerStaffSummary,
  type CareerRole,
  type CareerPeriod,
  type BananaTransactionCategory,
} from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { useTheme } from '~/context/ThemeContext';
import type { CareerSelectorMode } from '../components/StaffCareerSelector';
import type { CareerBibleTopic } from '../components/CareerBibleDrawer';
import { FALLBACK_CAREER_PROGRESSION_CONFIG, getCareerIslands, formatCareerRoleName } from '../career-path.constants';
import { playCareerSound, triggerCareerConfetti } from '../career-path-fx';
import {
  type CareerConfigSavePayload,
  type CareerCurrentUser,
  type CareerIslandId,
  type SimulationTargetRole,
  canOpenCareerConfig,
  findCareerStaffByIdOrLegacy,
  getDefaultSimulationTarget,
  isSuperAdminCareerUser,
  normalizeCareerProgressionConfig,
  readStoredCareerUser,
  readStoredSelectorMode,
  resolveDefaultCareerStaff,
  sortCareerStaffList,
} from './careerPathTypesAndHelpers';

export function useCareerPathState() {
  const { themeMode } = useTheme();
  const searchParams = useSearchParams();
  const queryStaffId = searchParams.get('staffId');
  const [currentUser, setCurrentUser] = useState<CareerCurrentUser | null>(null);

  useEffect(() => {
    const storedUser = readStoredCareerUser();
    if (storedUser) {
      setCurrentUser(storedUser);
    }
  }, []);

  const isDanny = useMemo(() => isSuperAdminCareerUser(currentUser), [currentUser]);
  const canConfigure = useMemo(() => canOpenCareerConfig(currentUser), [currentUser]);

  const [activeIsland, setActiveIsland] = useState<CareerIslandId>('cv');
  const [config, setConfig] = useState<CareerProgressionConfig>(FALLBACK_CAREER_PROGRESSION_CONFIG);
  const [staffList, setStaffList] = useState<CareerStaffSummary[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [selectedStaffStatus, setSelectedStaffStatus] = useState<StaffCareerStatus | null>(null);
  const [syncingProd, setSyncingProd] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [activeRoleFilter, setActiveRoleFilter] = useState<string>('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState<CareerPeriod>('last_30_days');

  const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState<boolean>(false);
  const [isBananaDrawerOpen, setIsBananaDrawerOpen] = useState<boolean>(false);
  const [bananaDrawerCategory, setBananaDrawerCategory] = useState<BananaTransactionCategory>('ALL');
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [selectorMode, setSelectorMode] = useState<CareerSelectorMode>(readStoredSelectorMode);
  const [isEncyclopediaDrawerOpen, setIsEncyclopediaDrawerOpen] = useState<boolean>(false);
  const [selectedBibleTopic, setSelectedBibleTopic] = useState<CareerBibleTopic | null>(null);
  const [isMapDrawerOpen, setIsMapDrawerOpen] = useState<boolean>(false);
  const [isMobileStaffDrawerOpen, setIsMobileStaffDrawerOpen] = useState<boolean>(false);

  // Sliders for interactive simulation
  const [sliderOrders, setSliderOrders] = useState<number>(300);
  const [sliderCombo, setSliderCombo] = useState<number>(25);
  const [simulationTarget, setSimulationTarget] = useState<SimulationTargetRole>('CV_PLUS');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const safeConfig = useMemo(() => normalizeCareerProgressionConfig(config), [config]);

  const playSound = useCallback((type: 'pop' | 'fanfare') => {
    playCareerSound(type, audioCtxRef);
  }, []);

  const triggerConfetti = useCallback(() => {
    triggerCareerConfetti(canvasRef.current, () => playSound('fanfare'));
  }, [playSound]);

  const fetchStaffProgression = useCallback(
    async (staffId: number, refresh = false, targetRole?: SimulationTargetRole, period?: CareerPeriod) => {
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
      } catch {
        // Fallback to previously rendered state
      }
    },
    [selectedPeriod]
  );

  const handleSimulationTargetChange = useCallback(
    (target: SimulationTargetRole) => {
      playSound('pop');
      setSimulationTarget(target);
      if (selectedStaffId) {
        fetchStaffProgression(selectedStaffId, false, target, selectedPeriod);
      }
    },
    [playSound, selectedStaffId, fetchStaffProgression, selectedPeriod]
  );

  const loadData = useCallback(
    async (periodToLoad?: CareerPeriod) => {
      try {
        const activePeriod = periodToLoad || selectedPeriod;
        const [fetchedConfig, fetchedStaffList] = await Promise.allSettled([
          apiClient.career.getConfig(),
          apiClient.career.listStaff({ period: activePeriod }),
        ]);

        if (fetchedConfig.status === 'fulfilled' && fetchedConfig.value?.cvToCc) {
          setConfig(fetchedConfig.value);
        }

        if (fetchedStaffList.status === 'fulfilled' && fetchedStaffList.value?.length > 0) {
          const sortedList = sortCareerStaffList(fetchedStaffList.value);
          setStaffList(sortedList);

          const defaultStaff = resolveDefaultCareerStaff({
            sortedList,
            queryStaffId,
            selectedStaffId,
            currentUserId: currentUser?.id,
          });

          if (defaultStaff) {
            setSelectedStaffId(defaultStaff.id);
            const defaultTarget = getDefaultSimulationTarget(defaultStaff.careerRole);
            setSimulationTarget(defaultTarget);
            fetchStaffProgression(defaultStaff.id, false, defaultTarget, activePeriod);
          }
        }
      } catch {
        // Graceful fallback to default simulation
      }
    },
    [selectedPeriod, selectedStaffId, fetchStaffProgression, queryStaffId, currentUser]
  );

  useEffect(() => {
    if (queryStaffId && staffList.length > 0) {
      const targetId = Number(queryStaffId);
      const matched = findCareerStaffByIdOrLegacy(staffList, targetId);
      if (matched && matched.id !== selectedStaffId) {
        setSelectedStaffId(matched.id);
        const targetRole = getDefaultSimulationTarget(matched.careerRole);
        setSimulationTarget(targetRole);
        fetchStaffProgression(matched.id, false, targetRole, selectedPeriod);
      }
    }
  }, [queryStaffId, staffList, selectedStaffId, selectedPeriod, fetchStaffProgression]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePeriodChange = useCallback(
    (newPeriod: CareerPeriod) => {
      playSound('pop');
      setSelectedPeriod(newPeriod);
      loadData(newPeriod);
    },
    [playSound, loadData]
  );

  const openBananaDrawer = useCallback(
    (staffId?: number | null, category: BananaTransactionCategory = 'ALL') => {
      playSound('pop');
      if (staffId && staffId !== selectedStaffId) {
        setSelectedStaffId(staffId);
      }
      setBananaDrawerCategory(category);
      setIsBananaDrawerOpen(true);
    },
    [playSound, selectedStaffId]
  );

  const handleSelectStaff = useCallback(
    (staffId: number) => {
      playSound('pop');
      setSelectedStaffId(staffId);
      const staff = staffList.find((s) => s.id === staffId);
      const defaultTarget = getDefaultSimulationTarget(staff?.careerRole);
      setSimulationTarget(defaultTarget);
      fetchStaffProgression(staffId, false, defaultTarget, selectedPeriod);
    },
    [playSound, staffList, fetchStaffProgression, selectedPeriod]
  );

  const handleSyncProd = useCallback(async () => {
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
  }, [selectedPeriod, selectedStaffId, fetchStaffProgression, simulationTarget]);

  const handleActivateTrial = useCallback(async () => {
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
  }, [isDanny, selectedStaffId, playSound, triggerConfetti]);

  const handlePromote = useCallback(async () => {
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
  }, [isDanny, selectedStaffId, selectedStaffStatus, playSound, triggerConfetti]);

  const handleSwitchSpecialist = useCallback(async () => {
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
  }, [isDanny, selectedStaffId, playSound]);

  const handleSetRole = useCallback(
    async (staffId: number, newRole: CareerRole) => {
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
          const nextTarget = getDefaultSimulationTarget(newRole);
          setSimulationTarget(nextTarget);
          fetchStaffProgression(staffId, true, nextTarget);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi cập nhật chức danh';
        message.error(msg);
      } finally {
        setActionLoading(false);
      }
    },
    [isDanny, selectedStaffId, playSound, triggerConfetti, fetchStaffProgression]
  );

  const handleDemote = useCallback(
    async (staffId: number, targetRole: CareerRole) => {
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
          const nextTarget = getDefaultSimulationTarget(targetRole);
          setSimulationTarget(nextTarget);
          fetchStaffProgression(staffId, true, nextTarget);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi hạ cấp';
        message.error(msg);
      } finally {
        setActionLoading(false);
      }
    },
    [isDanny, selectedStaffId, playSound, fetchStaffProgression]
  );

  const handleSaveConfig = useCallback(
    async (payload: CareerConfigSavePayload) => {
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
    },
    [isDanny, selectedStaffId, fetchStaffProgression, simulationTarget]
  );

  const islands = useMemo(() => getCareerIslands(safeConfig), [safeConfig]);
  const currentIslandData = useMemo(
    () => islands.find((i) => i.id === activeIsland) || islands[0],
    [islands, activeIsland]
  );

  return {
    themeMode,
    isDanny,
    canConfigure,
    activeIsland,
    setActiveIsland,
    setConfig,
    safeConfig,
    staffList,
    selectedStaffId,
    selectedStaffStatus,
    syncingProd,
    lastSyncedAt,
    actionLoading,
    activeRoleFilter,
    setActiveRoleFilter,
    selectedPeriod,
    isConfigDrawerOpen,
    setIsConfigDrawerOpen,
    isBananaDrawerOpen,
    setIsBananaDrawerOpen,
    bananaDrawerCategory,
    savingConfig,
    selectorMode,
    setSelectorMode,
    isEncyclopediaDrawerOpen,
    setIsEncyclopediaDrawerOpen,
    selectedBibleTopic,
    setSelectedBibleTopic,
    isMapDrawerOpen,
    setIsMapDrawerOpen,
    isMobileStaffDrawerOpen,
    setIsMobileStaffDrawerOpen,
    sliderOrders,
    setSliderOrders,
    sliderCombo,
    setSliderCombo,
    simulationTarget,
    canvasRef,
    islands,
    currentIslandData,
    playSound,
    openBananaDrawer,
    handleSimulationTargetChange,
    handlePeriodChange,
    handleSelectStaff,
    handleSyncProd,
    handleActivateTrial,
    handlePromote,
    handleSwitchSpecialist,
    handleSetRole,
    handleDemote,
    handleSaveConfig,
  };
}
