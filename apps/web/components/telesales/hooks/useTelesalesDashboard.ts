'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { apiClient } from '../../../lib/api-client';

dayjs.extend(isoWeek);

export const LEVEL_PRESETS = [
  { emoji: '🥚', name: 'Egg', done: 100, booked: 125, happy: 500, pickups: 625, calls: 2083 },
  { emoji: '🐣', name: 'Hatching', done: 150, booked: 188, happy: 750, pickups: 938, calls: 3125 },
  { emoji: '🐥', name: 'Chick', done: 225, booked: 281, happy: 1125, pickups: 1406, calls: 4688 },
  { emoji: '🐔', name: 'Chicken', done: 325, booked: 406, happy: 1625, pickups: 2031, calls: 6771 },
  { emoji: '🍗', name: 'Drumstick', done: 450, booked: 563, happy: 2250, pickups: 2813, calls: 9375 },
  { emoji: '👼', name: 'Angel', done: 600, booked: 750, happy: 3000, pickups: 3750, calls: 12500 },
];

export const members = [
  {
    id: 'TN',
    name: 'Thanh Ngân',
    color: '#EC4899',
    gradient: 'linear-gradient(135deg, #EC4899, #DB2777)',
    teamRole: 'Telesales Leader',
    textColor: 'text-pink-400',
    borderColor: 'border-pink-400',
    hoverGlow: 'shadow-pink-500/20',
  },
  {
    id: 'HM',
    name: 'Hoài My',
    color: '#A855F7',
    gradient: 'linear-gradient(135deg, #A855F7, #9333EA)',
    teamRole: 'Senior Consultant',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-400',
    hoverGlow: 'shadow-purple-500/20',
  },
  {
    id: 'VT',
    name: 'Vũ Thảo',
    color: '#06B6D4',
    gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)',
    teamRole: 'Senior Consultant',
    textColor: 'text-cyan-400',
    borderColor: 'border-cyan-400',
    hoverGlow: 'shadow-cyan-500/20',
  },
  {
    id: 'KL',
    name: 'Kim Loan',
    color: '#10B981',
    gradient: 'linear-gradient(135deg, #10B981, #059669)',
    teamRole: 'Consultant Specialist',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-400',
    hoverGlow: 'shadow-emerald-500/20',
  },
  {
    id: 'TH',
    name: 'Thu Hà',
    color: '#F97316',
    gradient: 'linear-gradient(135deg, #F97316, #EA580C)',
    teamRole: 'Telesales Assistant',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-400',
    hoverGlow: 'shadow-orange-500/20',
  },
  {
    id: 'DD',
    name: 'Đăng Đô',
    color: '#D4A84B',
    gradient: 'linear-gradient(135deg, #D4A84B, #B8902F)',
    teamRole: 'Telesales Manager',
    textColor: 'text-gold',
    borderColor: 'border-gold',
    hoverGlow: 'shadow-gold/20',
  },
];

const baseDataToday: Record<string, Record<string, number>> = {
  TN: { calls: 62, pickups: 41, happy: 17, booked: 12, done: 8 },
  DD: { calls: 55, pickups: 36, happy: 14, booked: 10, done: 7 },
  HM: { calls: 48, pickups: 30, happy: 12, booked: 8, done: 5 },
  VT: { calls: 43, pickups: 27, happy: 10, booked: 7, done: 4 },
  KL: { calls: 38, pickups: 22, happy: 8, booked: 5, done: 3 },
  TH: { calls: 33, pickups: 18, happy: 6, booked: 4, done: 2 },
};

const multipliers: Record<string, number> = {
  today: 1,
  this_week: 5,
  this_month: 20,
  yesterday: 0.8,
  last_week: 4,
  last_month: 18,
};

export function getMemberData(memberId: string, period: string): Record<string, number> {
  const base = baseDataToday[memberId] || baseDataToday.DD;
  const m = multipliers[period] || 1;
  return {
    calls: Math.round(base.calls * m),
    pickups: Math.round(base.pickups * m),
    happy: Math.round(base.happy * m),
    booked: Math.round(base.booked * m),
    done: Math.round(base.done * m),
  };
}

const stylesPreset = [
  {
    color: '#EC4899',
    gradient: 'linear-gradient(135deg, #EC4899, #DB2777)',
    textColor: 'text-pink-400',
    borderColor: 'border-pink-400',
    hoverGlow: 'shadow-pink-500/20',
  },
  {
    color: '#A855F7',
    gradient: 'linear-gradient(135deg, #A855F7, #9333EA)',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-400',
    hoverGlow: 'shadow-purple-500/20',
  },
  {
    color: '#06B6D4',
    gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)',
    textColor: 'text-cyan-400',
    borderColor: 'border-cyan-400',
    hoverGlow: 'shadow-cyan-500/20',
  },
  {
    color: '#10B981',
    gradient: 'linear-gradient(135deg, #10B981, #059669)',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-400',
    hoverGlow: 'shadow-emerald-500/20',
  },
  {
    color: '#F97316',
    gradient: 'linear-gradient(135deg, #F97316, #EA580C)',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-400',
    hoverGlow: 'shadow-orange-500/20',
  },
  {
    color: '#D4A84B',
    gradient: 'linear-gradient(135deg, #D4A84B, #B8902F)',
    textColor: 'text-gold',
    borderColor: 'border-gold',
    hoverGlow: 'shadow-gold/20',
  },
  {
    color: '#3B82F6',
    gradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-400',
    hoverGlow: 'shadow-blue-500/20',
  },
  {
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #EF4444, #B91C1C)',
    textColor: 'text-red-400',
    borderColor: 'border-red-400',
    hoverGlow: 'shadow-red-500/20',
  },
];

export const RADAR_CENTER_X = 290;
export const RADAR_CENTER_Y = 200;
export const RADAR_MAX_R = 120;
export const RADAR_ANGLES = [-90, -18, 54, 126, 198].map((a) => (a * Math.PI) / 180);

export const polarToXY = (cx: number, cy: number, radius: number, angleRad: number) => ({
  x: cx + radius * Math.cos(angleRad),
  y: cy + radius * Math.sin(angleRad),
});

export const getPentagonPoints = (cx: number, cy: number, radius: number) =>
  RADAR_ANGLES.map((a) => polarToXY(cx, cy, radius, a));

export const pointsToString = (points: { x: number; y: number }[]) =>
  points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

export const findTargetMemberOrTopBooker = (memberList: SafeAny[], targetId?: string) => {
  if (!memberList || memberList.length === 0) return null;

  const searchTarget = String(targetId || '')
    .trim()
    .toLowerCase();

  if (searchTarget) {
    const found = memberList.find((m: SafeAny) => {
      const mId = String(m.id || '')
        .trim()
        .toLowerCase();
      const mInitials = String(m.initials || '')
        .trim()
        .toLowerCase();
      const mName = String(m.name || '')
        .trim()
        .toLowerCase();
      return (
        mId === searchTarget ||
        mInitials === searchTarget ||
        mName === searchTarget ||
        mName.includes(searchTarget) ||
        (searchTarget === 'dd' && (mInitials === 'nđ' || mName.includes('điệp') || mId === '18' || mId === '32268'))
      );
    });
    if (found) return found;
  }

  const sortedByBooked = memberList.slice().sort((a: SafeAny, b: SafeAny) => {
    const valA = a.perf ? (a.perf['booked'] ?? 0) : a.totalBooked || 0;
    const valB = b.perf ? (b.perf['booked'] ?? 0) : b.totalBooked || 0;
    return valB - valA;
  });

  return sortedByBooked[0] || memberList[0];
};

export interface UseTelesalesDashboardProps {
  visible: boolean;
  initialMemberId?: string;
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

export function useTelesalesDashboard(options: UseTelesalesDashboardProps) {
  const { visible, initialMemberId = '' } = options;
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const [modalSize, setModalSize] = useState<{ width: string; height: string } | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState(initialMemberId);
  const [currentPeriodId, setCurrentPeriodId] = useState('today');
  const [currentMetricKey, setCurrentMetricKey] = useState('booked');
  const [isFlipped, setIsFlipped] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configTab, setConfigTab] = useState<'target' | 'staff'>('target');
  const [systemStaff, setSystemStaff] = useState<SafeAny[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([]);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [staffLevels, setStaffLevels] = useState<Record<string, number>>({});
  const [isRadialOpen, setIsRadialOpen] = useState(false);
  const [periodDataMap, setPeriodDataMap] = useState<Record<string, SafeAny[]>>({});
  const [dbMembers, setDbMembers] = useState<SafeAny[]>([]);
  const [loading, setLoading] = useState(false);

  const [targets, setTargets] = useState<Record<string, Record<string, number>>>({
    today: { calls: 80, pickups: 50, happy: 20, booked: 15, done: 10 },
    this_week: { calls: 400, pickups: 250, happy: 100, booked: 75, done: 50 },
    this_month: { calls: 1600, pickups: 1000, happy: 400, booked: 300, done: 200 },
    yesterday: { calls: 80, pickups: 50, happy: 20, booked: 15, done: 10 },
    last_week: { calls: 400, pickups: 250, happy: 100, booked: 75, done: 50 },
    last_month: { calls: 1600, pickups: 1000, happy: 400, booked: 300, done: 200 },
  });

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    today: true,
    this_week: false,
    this_month: false,
    yesterday: false,
    last_week: false,
    last_month: false,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('mos_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setIsAdmin(parsed.role === 'admin');
        } catch (e) {
          console.error(e);
        }
      }
      const savedWidth = localStorage.getItem('telesales_modal_width');
      const savedHeight = localStorage.getItem('telesales_modal_height');
      if (savedWidth && savedHeight) {
        setModalSize({ width: savedWidth, height: savedHeight });
      }
      const savedPeriod = localStorage.getItem('telesales_dashboard_period_id');
      if (savedPeriod) {
        setCurrentPeriodId(savedPeriod);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('telesales_dashboard_period_id', currentPeriodId);
    }
  }, [currentPeriodId]);

  useEffect(() => {
    if (visible) {
      const fetchStaffLevels = async () => {
        try {
          const data = await apiClient.kpi.getStaffLevels();
          setStaffLevels((data as SafeAny) || {});
        } catch (err) {
          console.error('Failed to fetch staff levels:', err);
        }
      };
      fetchStaffLevels();
    }
  }, [visible, refreshCounter]);

  // ResizeObserver logic
  const handleResize = useCallback((width: number, height: number) => {
    if (width > 0 && height > 0) {
      const wStr = `${width}px`;
      const hStr = `${height}px`;
      localStorage.setItem('telesales_modal_width', wStr);
      localStorage.setItem('telesales_modal_height', hStr);
      setModalSize({ width: wStr, height: hStr });
    }
  }, []);

  const getMemberLevelIdx = useCallback(
    (memberId: string | number): number => {
      const idStr = String(memberId);
      const member =
        dbMembers.find((m: SafeAny) => String(m.id) === idStr || String(m.initials) === idStr) ||
        members.find((m: SafeAny) => String(m.id) === idStr || String(m.initials) === idStr);

      if (!member) {
        if (staffLevels[idStr] !== undefined) return Number(staffLevels[idStr]);
        return 2;
      }

      const numericId = String(member.id);
      const initials = String(member.initials || member.id);

      if (staffLevels[numericId] !== undefined) return Number(staffLevels[numericId]);
      if (staffLevels[initials] !== undefined) return Number(staffLevels[initials]);
      return 2;
    },
    [dbMembers, staffLevels]
  );

  const getMemberTarget = useCallback(
    (memberId: string, periodId: string): Record<string, number> => {
      const levelIdx = getMemberLevelIdx(memberId);
      const preset = LEVEL_PRESETS[levelIdx] || LEVEL_PRESETS[2];

      let divisor = 1;
      if (periodId === 'today' || periodId === 'yesterday') {
        divisor = 25;
      } else if (periodId === 'this_week' || periodId === 'last_week') {
        divisor = 4;
      }

      return {
        calls: Math.round(preset.calls / divisor),
        pickups: Math.round(preset.pickups / divisor),
        happy: Math.round(preset.happy / divisor),
        booked: Math.round(preset.booked / divisor),
        done: Math.round(preset.done / divisor),
      };
    },
    [getMemberLevelIdx]
  );

  // Fetch leaderboards
  useEffect(() => {
    if (!visible) return;

    const fetchAllLeaderboards = async () => {
      setLoading(true);
      try {
        const saved = localStorage.getItem('telesales_dashboard_visible_staff');
        const savedIds: number[] = saved ? JSON.parse(saved) : [];

        const periodsToFetch = [
          { id: 'today', start: dayjs(), end: dayjs() },
          { id: 'yesterday', start: dayjs().subtract(1, 'day'), end: dayjs().subtract(1, 'day') },
          { id: 'this_week', start: dayjs().startOf('isoWeek'), end: dayjs().endOf('isoWeek') },
          {
            id: 'last_week',
            start: dayjs().subtract(1, 'week').startOf('isoWeek'),
            end: dayjs().subtract(1, 'week').endOf('isoWeek'),
          },
          { id: 'this_month', start: dayjs().startOf('month'), end: dayjs().endOf('month') },
          {
            id: 'last_month',
            start: dayjs().subtract(1, 'month').startOf('month'),
            end: dayjs().subtract(1, 'month').endOf('month'),
          },
        ];

        const fetchResults = await Promise.all(
          periodsToFetch.map(async (p) => {
            const params: SafeAny = {
              startDate: p.start.format('YYYY-MM-DD'),
              endDate: p.end.format('YYYY-MM-DD'),
              date_from: p.start.format('YYYY-MM-DD'),
              date_to: p.end.format('YYYY-MM-DD'),
            };

            if (savedIds.length > 0) {
              params.staffIds = savedIds.join(',');
            } else {
              params.role = 'telesales';
            }

            const list = (await apiClient.kpi.getLeaderboard(params)) || [];

            const mappedMembers = list.map((item: SafeAny, idx: number) => {
              console.log(
                'useTelesalesDashboard raw item:',
                item.displayName || item.username,
                'item.avatarUrl:',
                item.avatarUrl,
                'item.avatar:',
                item.avatar
              );
              const initials = item.displayName
                ? item.displayName
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                : item.username?.slice(0, 2).toUpperCase() || '??';

              const style = stylesPreset[idx % stylesPreset.length];

              return {
                id: String(item.staffId),
                name: item.displayName || item.username,
                initials,
                avatarUrl: item.avatarUrl || item.avatar || null,
                ...style,
                teamRole: item.role === 'admin' ? 'Telesales Manager' : 'Telesales Executive',
                perf: {
                  calls: item.totalCalled || 0,
                  pickups: item.totalAnswered || 0,
                  happy: item.totalHappy || 0,
                  booked: item.totalBooked || 0,
                  done: item.totalCheckin || 0,
                },
              };
            });

            return { periodId: p.id, data: mappedMembers };
          })
        );

        const newMap: Record<string, SafeAny[]> = {};
        fetchResults.forEach((r) => {
          newMap[r.periodId] = r.data;
        });

        setPeriodDataMap(newMap);

        const activeList = newMap[currentPeriodId] || [];
        if (activeList.length > 0) {
          const selected = findTargetMemberOrTopBooker(activeList, initialMemberIdRef.current || initialMemberId);
          if (selected) {
            setCurrentMemberId(selected.id);
          }
        }
      } catch (err) {
        console.error('Fetch telesales leaderboards error:', err);
        optionsRef.current?.onError?.('Không thể tải dữ liệu bảng xếp hạng telesales');
      } finally {
        setLoading(false);
      }
    };

    fetchAllLeaderboards();
  }, [visible, refreshCounter]);

  const initialMemberIdRef = useRef(initialMemberId);
  useEffect(() => {
    if (initialMemberId) {
      initialMemberIdRef.current = initialMemberId;
    }
  }, [initialMemberId]);

  // Sync member selection on period or periodDataMap changes
  useEffect(() => {
    if (!visible) return;
    const list = periodDataMap[currentPeriodId] || [];
    setDbMembers(list);
    if (list.length > 0) {
      const selected = findTargetMemberOrTopBooker(list, initialMemberIdRef.current || initialMemberId);
      if (selected) {
        setCurrentMemberId(selected.id);
      }
    }
  }, [visible, initialMemberId, currentPeriodId, periodDataMap]);

  const toggleStaffSelection = (id: number) => {
    setSelectedStaffIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const saveVisibleStaff = async () => {
    try {
      localStorage.setItem('telesales_dashboard_visible_staff', JSON.stringify(selectedStaffIds));
      if (isAdmin) {
        await apiClient.kpi.updateStaffLevels(staffLevels);
      }
      setIsConfigOpen(false);
      optionsRef.current?.onSuccess?.('Đã cập nhật danh sách nhân sự và mục tiêu cấp độ!');
      setRefreshCounter((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to save staff levels:', err);
      optionsRef.current?.onError?.('Lỗi khi lưu cấp độ mục tiêu.');
    }
  };

  // Fetch staff list for settings
  useEffect(() => {
    if (visible && isConfigOpen) {
      const saved = localStorage.getItem('telesales_dashboard_visible_staff');
      if (saved) {
        setSelectedStaffIds(JSON.parse(saved));
      }

      const fetchStaffList = async () => {
        try {
          const list = (await apiClient.customers.getStaff()) || [];
          const ALLOWED_ROLES = ['telesales', 'manager', 'admin'];
          const filtered = list.filter((s: SafeAny) => s.role && ALLOWED_ROLES.includes(String(s.role).toLowerCase()));
          setSystemStaff(filtered);

          if (!saved) {
            const telesalesIds = filtered.map((s: SafeAny) => s.id);
            setSelectedStaffIds(telesalesIds);
          }
        } catch (err) {
          console.error('Failed to fetch staff list:', err);
        }
      };
      fetchStaffList();
    }
  }, [visible, isConfigOpen]);

  const currentMembersList =
    dbMembers.length > 0
      ? dbMembers
      : members.map((m) => ({
          ...m,
          initials: m.id,
          perf: getMemberData(m.id, currentPeriodId),
        }));

  const activeMember =
    (currentMemberId
      ? currentMembersList.find(
          (m: SafeAny) =>
            String(m.id) === String(currentMemberId) ||
            String(m.initials || '').toLowerCase() === String(currentMemberId).toLowerCase()
        )
      : null) ||
    findTargetMemberOrTopBooker(currentMembersList) ||
    currentMembersList[0];

  const activePerformance = activeMember
    ? activeMember.perf || getMemberData(activeMember.id, currentPeriodId)
    : { calls: 0, pickups: 0, happy: 0, booked: 0, done: 0 };
  const activeValue = activePerformance[currentMetricKey] || 0;
  const activeMemberTargets = activeMember
    ? getMemberTarget(activeMember.id, currentPeriodId)
    : { calls: 0, pickups: 0, happy: 0, booked: 0, done: 0 };
  const activeTarget = activeMemberTargets[currentMetricKey] || 0;
  const activePercent = activeTarget > 0 ? Math.min(Math.round((activeValue / activeTarget) * 100), 100) : 0;

  const activeLevelIdx = activeMember ? getMemberLevelIdx(activeMember.id) : 2;
  const activePreset = LEVEL_PRESETS[activeLevelIdx] || LEVEL_PRESETS[2];
  const activePresetKey = currentMetricKey as 'done' | 'booked' | 'happy' | 'pickups' | 'calls';
  const dailyTarget = Math.round(activePreset[activePresetKey] / 25);
  const weeklyTarget = Math.round(activePreset[activePresetKey] / 4);
  const monthlyTarget = activePreset[activePresetKey];

  const handleUpdateLevel = async (newLevelIdx: number) => {
    if (!isAdmin) {
      optionsRef.current?.onError?.('Bạn không có quyền thay đổi mục tiêu cấp độ.');
      return;
    }
    const updatedLevels = {
      ...staffLevels,
      [String(activeMember.id)]: newLevelIdx,
    };
    if (activeMember.initials) {
      updatedLevels[String(activeMember.initials)] = newLevelIdx;
    }
    setStaffLevels(updatedLevels);
    try {
      await apiClient.kpi.updateStaffLevels(updatedLevels);
      optionsRef.current?.onSuccess?.(
        `Đã cập nhật mục tiêu của ${activeMember.name} thành ${LEVEL_PRESETS[newLevelIdx].emoji} ${LEVEL_PRESETS[newLevelIdx].name}`
      );
      setRefreshCounter((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to update member level directly:', err);
      optionsRef.current?.onError?.('Lỗi khi lưu cấp độ mục tiêu.');
    }
  };

  // Impersonating Member Grid sorted by current metric
  const rankings = currentMembersList
    .map((m: SafeAny) => ({
      ...m,
      value: m.perf ? m.perf[currentMetricKey] : getMemberData(m.id, currentPeriodId)[currentMetricKey],
    }))
    .sort((a, b) => b.value - a.value);

  const top3 = rankings.slice(0, 3);
  const remaining = rankings.slice(3);
  const podiumOrder = [top3[1], top3[0], top3[2]]; // order 2nd, 1st, 3rd

  // Back side rankings (sorted by Done deal)
  const backRankings = currentMembersList
    .map((m: SafeAny) => ({
      ...m,
      value: m.perf ? m.perf['done'] : getMemberData(m.id, currentPeriodId)['done'],
      perf: m.perf || getMemberData(m.id, currentPeriodId),
    }))
    .sort((a, b) => b.value - a.value);
  const top3Back = backRankings.slice(0, 3);
  const remainingBack = backRankings.slice(3);
  const podiumOrderBack = [top3Back[1], top3Back[0], top3Back[2]];

  // Computed data points for Radar chart
  const metrics = ['calls', 'pickups', 'happy', 'booked', 'done'];
  const dataPoints = metrics.map((metricKey, i) => {
    const val = activePerformance[metricKey] || 0;
    const target = activeMemberTargets[metricKey] || 0;
    const ratio = target > 0 ? Math.min(val / target, 1) : 0;
    return polarToXY(RADAR_CENTER_X, RADAR_CENTER_Y, RADAR_MAX_R * ratio, RADAR_ANGLES[i]);
  });

  const handleTargetChange = (periodId: string, metricKey: string, valStr: string) => {
    const val = parseInt(valStr);
    if (!isNaN(val) && val >= 0) {
      setTargets((prev) => ({
        ...prev,
        [periodId]: {
          ...prev[periodId],
          [metricKey]: val,
        },
      }));
    }
  };

  const saveTargets = () => {
    setIsConfigOpen(false);
    optionsRef.current?.onSuccess?.('Đã cập nhật target mục tiêu mới!');
  };

  return {
    // values
    modalSize,
    currentMemberId,
    currentPeriodId,
    currentMetricKey,
    isFlipped,
    isConfigOpen,
    configTab,
    systemStaff,
    selectedStaffIds,
    refreshCounter,
    isAdmin,
    staffLevels,
    isRadialOpen,
    periodDataMap,
    dbMembers,
    loading,
    targets,
    expandedSections,

    // computed
    currentMembersList,
    activeMember,
    activePerformance,
    activeValue,
    activeMemberTargets,
    activeTarget,
    activePercent,
    activeLevelIdx,
    activePreset,
    dailyTarget,
    weeklyTarget,
    monthlyTarget,
    rankings,
    podiumOrder,
    remaining,
    podiumOrderBack,
    remainingBack,
    dataPoints,

    // setters
    setCurrentMemberId,
    setCurrentPeriodId,
    setCurrentMetricKey,
    setIsFlipped,
    setIsConfigOpen,
    setConfigTab,
    setIsRadialOpen,
    setExpandedSections,
    setStaffLevels,

    // callbacks
    handleResize,
    toggleStaffSelection,
    saveVisibleStaff,
    handleUpdateLevel,
    getMemberLevelIdx,
    getMemberTarget,
    handleTargetChange,
    saveTargets,
  };
}
