'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button, message, Spin, Segmented, Checkbox, Select } from 'antd';
import {
  PhoneOutlined,
  CustomerServiceOutlined,
  SmileOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  SettingOutlined,
  SyncOutlined,
  CloseOutlined,
  TrophyOutlined,
  SaveOutlined,
  DownOutlined,
  UpOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { useTheme } from '../context/ThemeContext';
import dayjs from 'dayjs';
import api from '../lib/api';

interface TelesalesDashboardModalProps {
  visible: boolean;
  onClose: () => void;
  initialMemberId?: string;
}

const members = [
  { id: 'TN', name: 'Thanh Ngân', color: '#EC4899', gradient: 'linear-gradient(135deg, #EC4899, #DB2777)', teamRole: 'Telesales Leader', textColor: 'text-pink-400', borderColor: 'border-pink-400', hoverGlow: 'shadow-pink-500/20' },
  { id: 'HM', name: 'Hoài My', color: '#A855F7', gradient: 'linear-gradient(135deg, #A855F7, #9333EA)', teamRole: 'Senior Consultant', textColor: 'text-purple-400', borderColor: 'border-purple-400', hoverGlow: 'shadow-purple-500/20' },
  { id: 'VT', name: 'Vũ Thảo', color: '#06B6D4', gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)', teamRole: 'Senior Consultant', textColor: 'text-cyan-400', borderColor: 'border-cyan-400', hoverGlow: 'shadow-cyan-500/20' },
  { id: 'KL', name: 'Kim Loan', color: '#10B981', gradient: 'linear-gradient(135deg, #10B981, #059669)', teamRole: 'Consultant Specialist', textColor: 'text-emerald-400', borderColor: 'border-emerald-400', hoverGlow: 'shadow-emerald-500/20' },
  { id: 'TH', name: 'Thu Hà', color: '#F97316', gradient: 'linear-gradient(135deg, #F97316, #EA580C)', teamRole: 'Telesales Assistant', textColor: 'text-orange-400', borderColor: 'border-orange-400', hoverGlow: 'shadow-orange-500/20' },
  { id: 'DD', name: 'Đăng Đô', color: '#D4A84B', gradient: 'linear-gradient(135deg, #D4A84B, #B8902F)', teamRole: 'Telesales Manager', textColor: 'text-gold', borderColor: 'border-gold', hoverGlow: 'shadow-gold/20' },
];

const metricConfigs = [
  { key: 'calls', label: 'Calls', icon: '📞', color: '#3B82F6', gradId: 'callsGrad', antIcon: PhoneOutlined, bgGradient: 'from-blue-600 to-cyan-400', shadowGlow: 'shadow-blue-500/20', lightBg: 'bg-blue-50/70 text-blue-600 border-blue-100', darkBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { key: 'pickups', label: 'Pickups', icon: '📱', color: '#8B5CF6', gradId: 'pickupsGrad', antIcon: CustomerServiceOutlined, bgGradient: 'from-purple-600 to-fuchsia-400', shadowGlow: 'shadow-purple-500/20', lightBg: 'bg-purple-50/70 text-purple-600 border-purple-100', darkBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { key: 'happy', label: 'Happy Call', icon: '😊', color: '#F59E0B', gradId: 'happyGrad', antIcon: SmileOutlined, bgGradient: 'from-amber-500 to-orange-400', shadowGlow: 'shadow-amber-500/20', lightBg: 'bg-amber-50/70 text-amber-600 border-amber-100', darkBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { key: 'booked', label: 'Booked', icon: '📅', color: '#F97316', gradId: 'bookedGrad', antIcon: CalendarOutlined, bgGradient: 'from-orange-500 to-amber-500', shadowGlow: 'shadow-orange-500/20', lightBg: 'bg-orange-50/70 text-orange-600 border-orange-100', darkBg: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  { key: 'done', label: 'Done Deal', icon: '✅', color: '#10B981', gradId: 'doneGrad', antIcon: CheckCircleOutlined, bgGradient: 'from-emerald-600 to-teal-400', shadowGlow: 'shadow-emerald-500/20', lightBg: 'bg-emerald-50/70 text-emerald-600 border-emerald-100', darkBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
];

const periods = [
  { id: 'last_month', label: 'Tháng trước' },
  { id: 'last_week', label: 'Tuần trước' },
  { id: 'yesterday', label: 'Hôm qua' },
  { id: 'today', label: 'Hôm nay' },
  { id: 'this_week', label: 'Tuần này' },
  { id: 'this_month', label: 'Tháng này' }
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
  last_month: 18
};

function getMemberData(memberId: string, period: string): Record<string, number> {
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

const LEVEL_PRESETS = [
  { emoji: '🥚', name: 'Egg', done: 100, booked: 125, happy: 500, pickups: 625, calls: 2083 },
  { emoji: '🐣', name: 'Hatching', done: 150, booked: 188, happy: 750, pickups: 938, calls: 3125 },
  { emoji: '🐥', name: 'Chick', done: 225, booked: 281, happy: 1125, pickups: 1406, calls: 4688 },
  { emoji: '🐔', name: 'Chicken', done: 325, booked: 406, happy: 1625, pickups: 2031, calls: 6771 },
  { emoji: '🍗', name: 'Drumstick', done: 450, booked: 563, happy: 2250, pickups: 2813, calls: 9375 },
  { emoji: '👼', name: 'Angel', done: 600, booked: 750, happy: 3000, pickups: 3750, calls: 12500 }
];

export default function TelesalesDashboardModal({ visible, onClose, initialMemberId = 'TN' }: TelesalesDashboardModalProps) {
  const { themeMode } = useTheme();
  const modalContainerRef = useRef<HTMLDivElement | null>(null);
  const [modalSize, setModalSize] = useState<{ width: string; height: string } | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState(initialMemberId);
  const [currentPeriodId, setCurrentPeriodId] = useState('today');
  const [currentMetricKey, setCurrentMetricKey] = useState('calls');
  const [isFlipped, setIsFlipped] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configTab, setConfigTab] = useState<'target' | 'staff'>('target');
  const [systemStaff, setSystemStaff] = useState<any[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([]);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [staffLevels, setStaffLevels] = useState<Record<string, number>>({});

  const getMemberTarget = (memberId: string, periodId: string): Record<string, number> => {
    const levelIdx = staffLevels[String(memberId)] !== undefined ? staffLevels[String(memberId)] : 2;
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
  };

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
    last_month: false
  });

  const [dbMembers, setDbMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
          const res = await api.get('/kpi/staff-levels');
          setStaffLevels(res.data || {});
        } catch (err) {
          console.error('Failed to fetch staff levels:', err);
        }
      };
      fetchStaffLevels();
    }
  }, [visible, refreshCounter]);

  useEffect(() => {
    if (!visible) return;
    const container = modalContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rect = entry.target.getBoundingClientRect();
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);
        if (width > 0 && height > 0) {
          const wStr = `${width}px`;
          const hStr = `${height}px`;
          localStorage.setItem('telesales_modal_width', wStr);
          localStorage.setItem('telesales_modal_height', hStr);
          setModalSize(prev => {
            if (prev && prev.width === wStr && prev.height === hStr) {
              return prev;
            }
            return { width: wStr, height: hStr };
          });
        }
      }
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setIsFlipped(false);
      setIsConfigOpen(false);
      setExpandedSections(prev => {
        const next = { ...prev };
        periods.forEach(p => {
          next[p.id] = p.id === currentPeriodId;
        });
        return next;
      });
    }
  }, [visible, currentPeriodId]);

  useEffect(() => {
    if (!visible) return;

    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const now = dayjs();
        let start = now;
        let end = now;

        if (currentPeriodId === 'today') {
          start = now.startOf('day');
          end = now.endOf('day');
        } else if (currentPeriodId === 'yesterday') {
          start = now.subtract(1, 'day').startOf('day');
          end = now.subtract(1, 'day').endOf('day');
        } else if (currentPeriodId === 'this_week') {
          start = now.startOf('isoWeek');
          end = now.endOf('day');
        } else if (currentPeriodId === 'last_week') {
          start = now.subtract(1, 'week').startOf('isoWeek');
          end = now.subtract(1, 'week').endOf('isoWeek');
        } else if (currentPeriodId === 'this_month') {
          start = now.startOf('month');
          end = now.endOf('day');
        } else if (currentPeriodId === 'last_month') {
          start = now.subtract(1, 'month').startOf('month');
          end = now.subtract(1, 'month').endOf('month');
        }

        const saved = localStorage.getItem('telesales_dashboard_visible_staff');
        const savedIds = saved ? JSON.parse(saved) : [];

        const params: any = {
          startDate: start.format('YYYY-MM-DD'),
          endDate: end.format('YYYY-MM-DD')
        };

        if (savedIds.length > 0) {
          params.staffIds = savedIds.join(',');
        } else {
          params.role = 'telesales';
        }

        const res = await api.get('/kpi/leaderboard', { params });
        const list = res.data || [];
        
        const stylesPreset = [
          { color: '#EC4899', gradient: 'linear-gradient(135deg, #EC4899, #DB2777)', textColor: 'text-pink-400', borderColor: 'border-pink-400', hoverGlow: 'shadow-pink-500/20' },
          { color: '#A855F7', gradient: 'linear-gradient(135deg, #A855F7, #9333EA)', textColor: 'text-purple-400', borderColor: 'border-purple-400', hoverGlow: 'shadow-purple-500/20' },
          { color: '#06B6D4', gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)', textColor: 'text-cyan-400', borderColor: 'border-cyan-400', hoverGlow: 'shadow-cyan-500/20' },
          { color: '#10B981', gradient: 'linear-gradient(135deg, #10B981, #059669)', textColor: 'text-emerald-400', borderColor: 'border-emerald-400', hoverGlow: 'shadow-emerald-500/20' },
          { color: '#F97316', gradient: 'linear-gradient(135deg, #F97316, #EA580C)', textColor: 'text-orange-400', borderColor: 'border-orange-400', hoverGlow: 'shadow-orange-500/20' },
          { color: '#D4A84B', gradient: 'linear-gradient(135deg, #D4A84B, #B8902F)', textColor: 'text-gold', borderColor: 'border-gold', hoverGlow: 'shadow-gold/20' },
          { color: '#3B82F6', gradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', textColor: 'text-blue-400', borderColor: 'border-blue-400', hoverGlow: 'shadow-blue-500/20' },
          { color: '#EF4444', gradient: 'linear-gradient(135deg, #EF4444, #B91C1C)', textColor: 'text-red-400', borderColor: 'border-red-400', hoverGlow: 'shadow-red-500/20' }
        ];

        const mappedMembers = list.map((item: any, idx: number) => {
          const initials = item.displayName
            ? item.displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
            : item.username?.slice(0, 2).toUpperCase() || '??';

          const style = stylesPreset[idx % stylesPreset.length];

          return {
            id: String(item.staffId),
            name: item.displayName || item.username,
            initials,
            ...style,
            teamRole: item.role === 'admin' ? 'Telesales Manager' : 'Telesales Executive',
            perf: {
              calls: item.totalCalled || 0,
              pickups: item.totalAnswered || 0,
              happy: item.totalHappy || 0,
              booked: item.totalBooked || 0,
              done: item.totalCheckin || 0
            }
          };
        });

        setDbMembers(mappedMembers);

        if (mappedMembers.length > 0) {
          const found = mappedMembers.find((m: any) => m.id === currentMemberId || m.initials === currentMemberId);
          if (!found) {
            const initialFound = mappedMembers.find((m: any) => m.id === initialMemberId || m.initials === initialMemberId);
            setCurrentMemberId(initialFound ? initialFound.id : mappedMembers[0].id);
          } else {
            setCurrentMemberId(found.id);
          }
        }
      } catch (err: any) {
        console.error('Fetch telesales leaderboard error:', err);
        message.error('Không thể tải dữ liệu bảng xếp hạng telesales');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [visible, currentPeriodId, initialMemberId, refreshCounter]);

  const toggleStaffSelection = (id: number) => {
    setSelectedStaffIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const saveVisibleStaff = async () => {
    try {
      localStorage.setItem('telesales_dashboard_visible_staff', JSON.stringify(selectedStaffIds));
      if (isAdmin) {
        await api.post('/kpi/staff-levels', staffLevels);
      }
      setIsConfigOpen(false);
      message.success('Đã cập nhật danh sách nhân sự và mục tiêu cấp độ!');
      setRefreshCounter(prev => prev + 1);
    } catch (err) {
      console.error('Failed to save staff levels:', err);
      message.error('Lỗi khi lưu cấp độ mục tiêu.');
    }
  };

  useEffect(() => {
    if (visible && isConfigOpen) {
      const saved = localStorage.getItem('telesales_dashboard_visible_staff');
      if (saved) {
        setSelectedStaffIds(JSON.parse(saved));
      }

      const fetchStaffList = async () => {
        try {
          const res = await api.get('/customers/staff');
          const list = res.data || [];
          const filtered = list.filter((s: any) => s.role !== 'technician');
          setSystemStaff(filtered);
          
          if (!saved) {
            const telesalesIds = filtered.filter((s: any) => s.role === 'telesales').map((s: any) => s.id);
            setSelectedStaffIds(telesalesIds);
          }
        } catch (err) {
          console.error('Failed to fetch staff list:', err);
        }
      };
      fetchStaffList();
    }
  }, [visible, isConfigOpen]);

  if (!visible) return null;

  const currentMembersList = dbMembers.length > 0 ? dbMembers : members.map(m => ({
    ...m,
    initials: m.id,
    perf: getMemberData(m.id, currentPeriodId)
  }));

  const activeMember = currentMembersList.find((m: any) => m.id === currentMemberId || m.initials === currentMemberId) || currentMembersList[0];
  const activePerformance = activeMember.perf || getMemberData(activeMember.id, currentPeriodId);
  const activeMetricConfig = metricConfigs.find(m => m.key === currentMetricKey) || metricConfigs[0];
  const activeValue = activePerformance[currentMetricKey];
  const activeMemberTargets = getMemberTarget(activeMember.id, currentPeriodId);
  const activeTarget = activeMemberTargets[currentMetricKey];
  const activePercent = activeTarget > 0 ? Math.min(Math.round((activeValue / activeTarget) * 100), 100) : 0;

  const activeLevelIdx = staffLevels[String(activeMember.id)] !== undefined ? staffLevels[String(activeMember.id)] : 2;
  const activePreset = LEVEL_PRESETS[activeLevelIdx] || LEVEL_PRESETS[2];
  const activePresetKey = currentMetricKey as 'done' | 'booked' | 'happy' | 'pickups' | 'calls';
  const dailyTarget = Math.round(activePreset[activePresetKey] / 25);
  const weeklyTarget = Math.round(activePreset[activePresetKey] / 4);
  const monthlyTarget = activePreset[activePresetKey];

  // Donut values
  const r = 85;
  const circumference = 2 * Math.PI * r; // ~534
  const strokeDashoffset = circumference - (activePercent / 100) * circumference;

  // Impersonating Member Grid sorted by current metric
  const rankings = currentMembersList.map((m: any) => ({
    ...m,
    value: m.perf ? m.perf[currentMetricKey] : getMemberData(m.id, currentPeriodId)[currentMetricKey]
  })).sort((a, b) => b.value - a.value);

  const top3 = rankings.slice(0, 3);
  const remaining = rankings.slice(3);
  const podiumOrder = [top3[1], top3[0], top3[2]]; // order 2nd, 1st, 3rd

  // Back side rankings (sorted by Done deal)
  const backRankings = currentMembersList.map((m: any) => ({
    ...m,
    value: m.perf ? m.perf['done'] : getMemberData(m.id, currentPeriodId)['done'],
    perf: m.perf || getMemberData(m.id, currentPeriodId)
  })).sort((a, b) => b.value - a.value);
  const top3Back = backRankings.slice(0, 3);
  const remainingBack = backRankings.slice(3);
  const podiumOrderBack = [top3Back[1], top3Back[0], top3Back[2]];

  const renderConfigPanel = () => {
    return (
      <div 
        className={`absolute top-0 right-0 h-full w-[280px] border-l flex flex-col z-30 transition-transform duration-300 ${
          themeMode === 'dark' 
            ? 'bg-[#141414] border-white/10' 
            : 'bg-white border-slate-200'
        } ${isConfigOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className={`flex items-center justify-between px-4 py-3 border-b ${themeMode === 'dark' ? 'border-white/5' : 'border-gray-200'}`}>
          <div>
            <h3 className={`text-sm font-bold ${themeMode === 'dark' ? 'text-white' : 'text-gray-900'}`}>Cấu hình</h3>
            <p className="text-[9px] text-gold font-medium mt-0.5">Bảng xếp hạng & Mục tiêu</p>
          </div>
          <Button type="text" icon={<CloseOutlined className="text-xs" />} onClick={() => setIsConfigOpen(false)} className="flex items-center justify-center w-6 h-6 p-0 rounded-lg hover:bg-neutral-500/10" />
        </div>
        
        <div className="px-3 pt-3 flex-shrink-0">
          <Segmented
            block
            value={configTab}
            onChange={(val) => setConfigTab(val as 'target' | 'staff')}
            options={[
              { label: 'Mục tiêu', value: 'target' },
              { label: 'Nhân sự', value: 'staff' }
            ]}
            style={{
              backgroundColor: themeMode === 'dark' ? '#1f1f1f' : '#f0f0f0',
              color: themeMode === 'dark' ? '#fff' : '#000',
            }}
          />
        </div>

        {configTab === 'target' ? (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {periods.map(p => {
                const isCurrent = p.id === currentPeriodId;
                const isExpanded = expandedSections[p.id];
                const t = targets[p.id];
                return (
                  <div 
                    key={p.id} 
                    className={`rounded-xl border overflow-hidden ${
                      themeMode === 'dark' 
                        ? 'bg-white/[0.02] border-white/5' 
                        : 'bg-slate-50 border-gray-200'
                    }`}
                  >
                    <button 
                      onClick={() => toggleConfigSection(p.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 transition-all ${
                        themeMode === 'dark' ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold ${themeMode === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{p.label}</span>
                        {isCurrent && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-gold/20 text-gold font-bold">Hiện tại</span>}
                      </div>
                      {isExpanded ? <UpOutlined className="text-[8px] text-gray-400" /> : <DownOutlined className="text-[8px] text-gray-400" />}
                    </button>
                    
                    <div className="transition-all duration-300 overflow-hidden" style={{ maxHeight: isExpanded ? '230px' : '0px' }}>
                      <div className="px-3 pb-3 pt-1 space-y-2">
                        {metricConfigs.map(m => (
                          <div key={m.key} className="flex items-center justify-between">
                            <span className={`text-[10px] font-semibold ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{m.icon} {m.label}</span>
                            <input 
                              type="number"
                              className={`w-16 h-6 rounded-md border text-center text-xs font-bold focus:border-gold/50 outline-none ${
                                themeMode === 'dark' 
                                  ? 'bg-black/30 border-white/10 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                              value={t[m.key]}
                              min="1"
                              onChange={e => handleTargetChange(p.id, m.key, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className={`p-3 border-t ${themeMode === 'dark' ? 'border-white/5 bg-black/20' : 'border-gray-200 bg-gray-50'}`}>
              <Button 
                type="primary" 
                icon={<SaveOutlined />} 
                onClick={saveTargets}
                className="w-full bg-gradient-to-r from-gold to-goldDark hover:from-goldLight border-none text-black font-bold h-9 rounded-xl shadow-md shadow-gold/10 flex items-center justify-center gap-1.5"
              >
                Lưu cấu hình
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 flex flex-col min-h-0 p-3">
              <p className={`text-[10px] ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-500'} mb-2 shrink-0`}>
                Chọn nhân viên hiển thị trên bảng xếp hạng (Mặc định lọc theo vai trò Telesales):
              </p>
              <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar min-h-0">
                {systemStaff.map((staff: any) => {
                  const isChecked = selectedStaffIds.includes(staff.id);
                  return (
                    <div 
                      key={staff.id} 
                      onClick={() => toggleStaffSelection(staff.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                        isChecked 
                          ? (themeMode === 'dark' 
                              ? 'border-gold/30 bg-gold/5 shadow-[0_4px_12px_rgba(212,168,75,0.08)]' 
                              : 'border-gold/25 bg-gold/[0.03] shadow-[0_4px_10px_rgba(212,168,75,0.05)]')
                          : (themeMode === 'dark' 
                              ? 'border-white/[0.04] bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.03]' 
                              : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-slate-50')
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Checkbox 
                          checked={isChecked}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleStaffSelection(staff.id)}
                          className="shrink-0 scale-105"
                        />
                        <div className="flex flex-col min-w-0 flex-1 select-none">
                          <span className={`text-xs font-bold truncate transition-colors ${
                            isChecked 
                              ? (themeMode === 'dark' ? 'text-gold' : 'text-amber-800')
                              : (themeMode === 'dark' ? 'text-gray-200' : 'text-gray-800')
                          }`}>
                            {staff.displayName || staff.username}
                          </span>
                          <span className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                            isChecked
                              ? (themeMode === 'dark' ? 'text-gold/60' : 'text-amber-700/60')
                              : (themeMode === 'dark' ? 'text-gray-500' : 'text-slate-400')
                          }`}>
                            {staff.role === 'telesales' ? 'Telesales Executive' : staff.role}
                          </span>
                        </div>
                      </div>

                      {isAdmin ? (
                        <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                          <Select
                            value={staffLevels[String(staff.id)] !== undefined ? staffLevels[String(staff.id)] : 2}
                            onChange={(val) => {
                              setStaffLevels(prev => ({
                                ...prev,
                                [String(staff.id)]: val
                              }));
                            }}
                            size="small"
                            style={{ width: 110 }}
                            variant="filled"
                            options={LEVEL_PRESETS.map((p, idx) => ({
                              value: idx,
                              label: (
                                <span className="flex items-center gap-1.5 font-semibold text-xs select-none">
                                  <span className="text-sm">{p.emoji}</span>
                                  <span>{p.name}</span>
                                </span>
                              )
                            }))}
                          />
                        </div>
                      ) : (
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${
                          themeMode === 'dark'
                            ? 'bg-white/[0.03] border-white/5 text-gray-300'
                            : 'bg-slate-100 border-slate-200/60 text-slate-600'
                        }`}>
                          <span className="text-xs">{LEVEL_PRESETS[staffLevels[String(staff.id)] !== undefined ? staffLevels[String(staff.id)] : 2]?.emoji || '🐥'}</span>
                          <span>{LEVEL_PRESETS[staffLevels[String(staff.id)] !== undefined ? staffLevels[String(staff.id)] : 2]?.name || 'Chick'}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className={`p-3 border-t ${themeMode === 'dark' ? 'border-white/5 bg-black/20' : 'border-gray-200 bg-gray-50'}`}>
              <Button 
                type="primary" 
                icon={<SaveOutlined />} 
                onClick={saveVisibleStaff}
                className="w-full bg-gradient-to-r from-gold to-goldDark hover:from-goldLight border-none text-black font-bold h-9 rounded-xl shadow-md shadow-gold/10 flex items-center justify-center gap-1.5"
              >
                Cập nhật nhân sự
              </Button>
            </div>
          </>
        )}
      </div>
    );
  };

  // Radar chart drawing values
  const RADAR_CENTER_X = 290;
  const RADAR_CENTER_Y = 200;
  const RADAR_MAX_R = 120;
  const RADAR_ANGLES = [-90, -18, 54, 126, 198].map(a => a * Math.PI / 180);
  const polarToXY = (cx: number, cy: number, radius: number, angleRad: number) => ({
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad)
  });
  const getPentagonPoints = (cx: number, cy: number, radius: number) =>
    RADAR_ANGLES.map(a => polarToXY(cx, cy, radius, a));
  const pointsToString = (points: { x: number; y: number }[]) =>
    points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const dataPoints = metricConfigs.map((mc, i) => {
    const val = activePerformance[mc.key];
    const target = activeMemberTargets[mc.key];
    const ratio = target > 0 ? Math.min(val / target, 1) : 0;
    return polarToXY(RADAR_CENTER_X, RADAR_CENTER_Y, RADAR_MAX_R * ratio, RADAR_ANGLES[i]);
  });

  const toggleConfigSection = (periodId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [periodId]: !prev[periodId]
    }));
  };

  const handleTargetChange = (periodId: string, metricKey: string, valStr: string) => {
    const val = parseInt(valStr);
    if (!isNaN(val) && val >= 0) {
      setTargets(prev => ({
        ...prev,
        [periodId]: {
          ...prev[periodId],
          [metricKey]: val
        }
      }));
    }
  };

  const saveTargets = () => {
    setIsConfigOpen(false);
    message.success('Đã cập nhật target mục tiêu mới!');
  };

  return (
    <div 
      className="fixed inset-0 z-[1010] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-300" 
      onClick={onClose}
    >
      {/* Outer Modal Container: Resizable & size-persistent layout */}
      <div 
        ref={modalContainerRef}
        className={`relative transition-transform duration-500 ${
          modalSize ? 'w-auto h-auto' : 'w-full max-w-[780px] h-[92vh] min-h-[820px] max-h-[920px]'
        }`} 
        style={{ 
          perspective: '1500px',
          resize: 'both',
          overflow: 'hidden',
          minWidth: '600px',
          minHeight: '780px',
          maxWidth: '95vw',
          maxHeight: '95vh',
          width: modalSize ? modalSize.width : undefined,
          height: modalSize ? modalSize.height : undefined,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className={`relative w-full h-full transition-transform duration-700 ease-in-out ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`} style={{ transformStyle: 'preserve-3d' }}>
          
          {/* ============================== FRONT FACE (DONUT VIEW) ============================== */}
          <div 
            className={`absolute inset-0 w-full h-full [backface-visibility:hidden] rounded-2xl border shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden transition-all duration-300 ${
              themeMode === 'dark' 
                ? 'bg-[#121212] border-neutral-800/80 text-white' 
                : 'bg-white border-slate-100 text-slate-800'
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b transition-colors ${themeMode === 'dark' ? 'border-white/5 bg-white/[0.01]' : 'border-slate-100 bg-slate-50/40'}`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-black/10" style={{ background: activeMember.gradient }}>
                  {activeMember.initials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-base md:text-lg tracking-tight ${themeMode === 'dark' ? 'text-white' : 'text-slate-800'}`}>{activeMember.name}</span>
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                      themeMode === 'dark' ? 'bg-white/5 border-white/10 text-gold' : 'bg-slate-100 border-slate-200 text-amber-800'
                    }`}>
                      <span>{activePreset.emoji} {activePreset.name}</span>
                    </div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-gold/15 text-gold font-extrabold border border-gold/25 shadow-sm">Telesales</span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                  </div>
                  <div className={`text-[10px] font-medium flex items-center gap-1 mt-0.5 ${themeMode === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                    <span>Đang hoạt động</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button 
                  type="text"
                  icon={<SyncOutlined className="text-gold" />}
                  onClick={() => setIsFlipped(true)}
                  className="hover:bg-gold/10 flex items-center justify-center w-8 h-8 rounded-lg"
                  title="Xoay lật sang biểu đồ Radar"
                />
                {isAdmin && (
                  <Button 
                    type="text"
                    icon={<SettingOutlined className="text-gold" />}
                    onClick={() => setIsConfigOpen(true)}
                    className="hover:bg-gold/10 flex items-center justify-center w-8 h-8 rounded-lg"
                    title="Cấu hình Target & Nhân sự"
                  />
                )}
                <Button 
                  type="text"
                  icon={<CloseOutlined className={themeMode === 'dark' ? 'text-gray-400 hover:text-red-500' : 'text-slate-500 hover:text-red-500'} />}
                  onClick={onClose}
                  className="hover:bg-red-500/10 flex items-center justify-center w-8 h-8 rounded-lg"
                />
              </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 p-5 flex flex-col justify-between overflow-hidden relative">
              {loading && (
                <div className="absolute inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center rounded-b-2xl">
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 28, color: '#D4A84B' }} spin />} />
                </div>
              )}
              {/* Timeline (V3C4 Dots) */}
              <div className={`border p-3 rounded-2xl ${themeMode === 'dark' ? 'border-neutral-800 bg-white/[0.01]' : 'border-slate-100 bg-slate-50/30'}`}>
                <div className="flex items-center justify-between mb-2.5 px-2">
                  <span className={`text-[9px] font-extrabold uppercase tracking-wider ${themeMode === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>← Trước</span>
                  <span className={`text-[9px] font-extrabold uppercase tracking-wider ${themeMode === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>Hiện tại / Tương lai →</span>
                </div>
                <div className="relative flex items-center justify-center py-1">
                  <div className={`absolute top-1/2 left-[8%] right-[8%] h-[2px] ${themeMode === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`} style={{ transform: 'translateY(-50%)' }}></div>
                  <div className={`absolute top-1/2 left-1/2 w-[2px] h-4 ${themeMode === 'dark' ? 'bg-slate-700' : 'bg-slate-300'}`} style={{ transform: 'translate(-50%, -50%)' }}></div>
                  <div className="relative flex items-center justify-between w-full px-[4%]">
                    {periods.map(p => {
                      const isActive = p.id === currentPeriodId;
                      return (
                        <div key={p.id} className="flex flex-col items-center cursor-pointer select-none" style={{ width: '16%' }} onClick={() => setCurrentPeriodId(p.id)}>
                          <div 
                            className={`w-3.5 h-3.5 rounded-full transition-all duration-300 relative flex items-center justify-center border-2 ${
                              isActive 
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 border-white dark:border-[#121212] scale-110' 
                                : `${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-300 border-white hover:bg-slate-400'}`
                            }`}
                            style={isActive ? { boxShadow: '0 0 12px rgba(245,158,11,0.6)' } : {}}
                          >
                            {isActive && <span className="absolute inset-0 rounded-full bg-amber-500 animate-ping opacity-50"></span>}
                          </div>
                          <span className={`text-[9px] mt-1.5 font-bold text-center leading-tight transition-colors ${
                            isActive 
                              ? 'text-amber-500' 
                              : `${themeMode === 'dark' ? 'text-gray-500' : 'text-slate-400'}`
                          }`}>{p.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Target Preset Level breakdown bar */}
              <div className={`flex items-center justify-center gap-6 py-2 px-4 rounded-xl border ${
                themeMode === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'
              } mx-6 mb-1 text-[11px] font-semibold shrink-0`}>
                <span className={themeMode === 'dark' ? 'text-gray-400' : 'text-slate-500'}>
                  🎯 Chỉ tiêu {activeMetricConfig.label} ({activePreset.emoji} {activePreset.name}):
                </span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <span className="opacity-60">Daily:</span>
                    <span className="font-extrabold text-gold">{dailyTarget}</span>
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-white/10"></span>
                  <span className="flex items-center gap-1">
                    <span className="opacity-60">Weekly:</span>
                    <span className="font-extrabold text-gold">{weeklyTarget}</span>
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-white/10"></span>
                  <span className="flex items-center gap-1">
                    <span className="opacity-60">Monthly:</span>
                    <span className="font-extrabold text-gold">{monthlyTarget}</span>
                  </span>
                </div>
              </div>

              {/* Donut Chart */}
              <div className="flex flex-col items-center my-1 flex-shrink-0">
                <div className="relative w-[150px] h-[150px]">
                  <svg width="150" height="150" viewBox="0 0 200 200">
                    <defs>
                      <linearGradient id="callsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3B82F6" />
                        <stop offset="100%" stopColor="#60A5FA" />
                      </linearGradient>
                      <linearGradient id="pickupsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#A78BFA" />
                      </linearGradient>
                      <linearGradient id="happyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#FBBF24" />
                      </linearGradient>
                      <linearGradient id="bookedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F97316" />
                        <stop offset="100%" stopColor="#FBBF24" />
                      </linearGradient>
                      <linearGradient id="doneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#34D399" />
                      </linearGradient>
                    </defs>
                    <circle cx="100" cy="100" r={r} fill="none" strokeWidth="14" className={themeMode === 'dark' ? 'stroke-white/5' : 'stroke-slate-100'}></circle>
                    <circle 
                      cx="100" cy="100" r={r} fill="none" strokeWidth="14" strokeLinecap="round"
                      stroke={`url(#${activeMetricConfig.gradId})`}
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      transform="rotate(-90 100 100)"
                      style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.3s ease' }}
                    ></circle>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black tracking-tight" style={{ color: activeMetricConfig.color }}>{activeValue}</span>
                    <span className={`text-[10px] font-bold mt-0.5 ${themeMode === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>/ {activeTarget} {activeMetricConfig.label}</span>
                    <span className="text-sm font-extrabold mt-0.5" style={{ color: activeMetricConfig.color }}>{activePercent}%</span>
                  </div>
                </div>

              </div>

              {/* Mini Summary Cards (Vibrant gradients, shadows and tint backdrops) */}
              <div className="grid grid-cols-5 gap-2 mt-1.5 flex-shrink-0">
                {metricConfigs.map(mc => {
                  const val = activePerformance[mc.key];
                  const target = activeMemberTargets[mc.key];
                  const actualPct = target > 0 ? Math.round((val / target) * 100) : 0;
                  const barPct = Math.min(actualPct, 100);
                  const isActive = currentMetricKey === mc.key;
                  const Icon = mc.antIcon;
                  return (
                    <div 
                      key={mc.key}
                      onClick={() => setCurrentMetricKey(mc.key)}
                      className={`rounded-2xl p-2.5 flex items-center gap-2.5 cursor-pointer transition-all duration-300 border ${
                        isActive 
                          ? (themeMode === 'dark' 
                              ? 'border-transparent' 
                              : 'border-transparent')
                          : (themeMode === 'dark' 
                              ? 'border-white/5 hover:border-white/10' 
                              : 'border-slate-100 hover:border-slate-200/80')
                      }`}
                      style={{
                        background: isActive 
                          ? (themeMode === 'dark' ? `linear-gradient(135deg, ${mc.color}15, rgba(255,255,255,0.01))` : `linear-gradient(135deg, ${mc.color}08, #ffffff)`)
                          : (themeMode === 'dark' ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)'),
                        boxShadow: isActive ? `0 10px 25px -5px ${mc.color}25, 0 8px 10px -6px ${mc.color}25` : 'none',
                        borderLeft: isActive ? `3.5px solid ${mc.color}` : undefined
                      }}
                    >
                      {/* Left Side: Glowing Radial Ring with Icon */}
                      <div 
                        className="relative w-11 h-11 flex items-center justify-center shrink-0 rounded-full transition-all duration-300"
                        style={{
                          boxShadow: `0 0 15px ${mc.color}35`,
                        }}
                      >
                        <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="16" fill="none" stroke={themeMode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} strokeWidth="2.5"></circle>
                          <circle cx="18" cy="18" r="16" fill="none" stroke={mc.color} strokeWidth="3" strokeDasharray="100" strokeDashoffset={100 - barPct} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }}></circle>
                        </svg>
                        <Icon className="text-sm relative z-10" style={{ color: mc.color, fontSize: '22px' }} />
                      </div>

                      {/* Right Side: Info with Diagonal Slash */}
                      <div className="flex-1 min-w-0 text-left">
                        <span className="text-[10px] font-black uppercase tracking-wider block font-outfit" style={{ color: mc.color }}>{mc.label}</span>
                        <div className="flex items-center gap-1.5 leading-none mt-0 select-none">
                          <span className={`text-2xl font-outfit font-black ${themeMode === 'dark' ? 'text-white' : 'text-slate-800'}`}>{val}</span>
                          <span className="w-[1.5px] h-5 transform rotate-12 shrink-0" style={{ backgroundColor: `${mc.color}45` }}></span>
                          <span className={`text-xs font-extrabold ${themeMode === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>{target}</span>
                        </div>
                        <span className="text-[9px] font-black uppercase block mt-0.5" style={{ color: mc.color }}>ĐẠT: {actualPct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Leaderboard (Podium Fixed Height with glass blocks & gradients) */}
              <div className={`pt-2 border-t mt-2 flex-shrink-0 ${themeMode === 'dark' ? 'border-white/5' : 'border-slate-150'}`}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <TrophyOutlined className="text-gold text-xs animate-bounce" />
                  <span className={`text-[10px] font-black uppercase tracking-wider ${themeMode === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>Bảng Xếp Hạng Đội Nhóm</span>
                  <span className={`text-[9px] font-semibold ${themeMode === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>— {activeMetricConfig.label}</span>
                </div>
                
                {/* Podium Grid */}
                <div className="w-full flex items-end justify-center gap-4 pt-9" style={{ minHeight: '190px' }}>
                  {podiumOrder.map((member, idx) => {
                    if (!member) return null;
                    const val = member.value;
                    const memberTargets = getMemberTarget(member.id, currentPeriodId);
                    const target = memberTargets[currentMetricKey];
                    const pct = target > 0 ? Math.round((val / target) * 100) : 0;
                    const isSelected = member.id === currentMemberId;
                    const rank = idx === 0 ? 2 : (idx === 1 ? 1 : 3);
                    const barHeight = idx === 0 ? 70 : (idx === 1 ? 95 : 50);
                    const rankEmoji = idx === 0 ? '🥈' : (idx === 1 ? '🥇' : '🥉');
                    const color = activeMetricConfig.color;

                    return (
                      <div 
                        key={member.id} 
                        onClick={() => setCurrentMemberId(member.id)}
                        className={`flex flex-col items-center relative cursor-pointer transition-all duration-300 hover:scale-105 ${isSelected ? 'scale-105 z-10' : 'opacity-85 hover:opacity-100'}`} 
                        style={{ width: '90px' }}
                      >
                        <div className="flex flex-col items-center mb-1.5 text-center w-full relative z-10">
                          <span className="text-xs mb-0.5">{rank === 1 ? '👑' : rankEmoji}</span>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white mb-1 border-2 ${
                            isSelected ? 'border-gold shadow-lg shadow-gold/30 scale-105' : (themeMode === 'dark' ? 'border-slate-800' : 'border-white')
                          }`} style={{ background: member.gradient }}>
                            {member.initials}
                          </div>
                          <div className={`text-[10px] font-black truncate w-full px-1 ${themeMode === 'dark' ? 'text-gray-300' : 'text-slate-700'}`}>{member.name}</div>
                          <div className="text-sm font-black" style={{ color }}>{val}</div>
                          <div className={`text-[9px] font-bold ${themeMode === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>{pct}%</div>
                        </div>
                        <div 
                          className="w-full rounded-t-xl flex items-end justify-center pb-1.5 transition-all duration-500 shadow-inner" 
                          style={{ 
                            height: `${barHeight}px`, 
                            background: themeMode === 'dark' 
                              ? `linear-gradient(to top, ${color}15, ${color}45)` 
                              : `linear-gradient(to top, ${color}08, ${color}25)`, 
                            borderTop: `1px solid ${color}${themeMode === 'dark' ? '30' : '40'}`,
                            borderLeft: `1px solid ${color}${themeMode === 'dark' ? '30' : '40'}`,
                            borderRight: `1px solid ${color}${themeMode === 'dark' ? '30' : '40'}`,
                            boxShadow: isSelected ? `0 -4px 15px ${color}18` : 'none'
                          }}
                        >
                          <span className="text-xs font-black opacity-20" style={{ color }}>{rank}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
 
                {/* Ranks 4-7 horizontal cards list */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {remaining.map((m, i) => {
                    const memberTargets = getMemberTarget(m.id, currentPeriodId);
                    const target = memberTargets[currentMetricKey];
                    const pct = target > 0 ? Math.round((m.value / target) * 100) : 0;
                    const isSelected = m.id === currentMemberId;
                    return (
                      <div 
                        key={m.id}
                        onClick={() => setCurrentMemberId(m.id)}
                        className={`flex items-center gap-2.5 p-2 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-gold/15 border-gold/40 shadow-sm' 
                            : (themeMode === 'dark' ? 'bg-white/[0.02] border-transparent hover:bg-white/5' : 'bg-slate-50 border-transparent hover:bg-slate-100')
                        }`}
                      >
                        <span className={`text-[11px] font-bold w-4 text-center ${themeMode === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>#{i + 4}</span>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm" style={{ background: m.gradient }}>{m.initials}</div>
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                          <span className={`text-xs font-bold truncate ${themeMode === 'dark' ? 'text-gray-200' : 'text-slate-700'}`}>{m.name}</span>
                          <span className="text-xs font-black shrink-0" style={{ color: activeMetricConfig.color }}>{m.value} <span className={`text-[10px] font-bold ${themeMode === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>({pct}%)</span></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Target Config Panel Slide-in (Front Side) */}
            {renderConfigPanel()}
          </div>

          {/* ============================== BACK FACE (RADAR VIEW - V3E) ============================== */}
          <div 
            className={`absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl border shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden transition-colors duration-300 ${
              themeMode === 'dark' 
                ? 'bg-[#121212] border-neutral-800/80 text-white' 
                : 'bg-white border-slate-100 text-slate-800'
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b transition-colors ${themeMode === 'dark' ? 'border-white/5 bg-white/[0.01]' : 'border-slate-100 bg-slate-50/40'}`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-black/10" style={{ background: activeMember.gradient }}>
                  {activeMember.initials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-base md:text-lg tracking-tight ${themeMode === 'dark' ? 'text-white' : 'text-slate-800'}`}>{activeMember.name}</span>
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                      themeMode === 'dark' ? 'bg-white/5 border-white/10 text-gold' : 'bg-slate-100 border-slate-200 text-amber-800'
                    }`}>
                      <span>{activePreset.emoji} {activePreset.name}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/15 text-gold font-bold border border-gold/20">Telesales</span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                  </div>
                  <div className={`text-[10px] flex items-center gap-1 mt-0.5 ${themeMode === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                    <span>Đang hoạt động</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button 
                  type="text"
                  icon={<SyncOutlined className="text-gold" />}
                  onClick={() => setIsFlipped(false)}
                  className="hover:bg-gold/10 flex items-center justify-center w-8 h-8 rounded-lg"
                  title="Xoay lật sang biểu đồ Donut"
                />
                {isAdmin && (
                  <Button 
                    type="text"
                    icon={<SettingOutlined className="text-gold" />}
                    onClick={() => setIsConfigOpen(true)}
                    className="hover:bg-gold/10 flex items-center justify-center w-8 h-8 rounded-lg"
                    title="Cấu hình Target & Nhân sự"
                  />
                )}
                <Button 
                  type="text"
                  icon={<CloseOutlined className={themeMode === 'dark' ? 'text-gray-400 hover:text-red-500' : 'text-slate-500 hover:text-red-500'} />}
                  onClick={onClose}
                  className="hover:bg-red-500/10 flex items-center justify-center w-8 h-8 rounded-lg"
                />
              </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 p-5 flex flex-col justify-between overflow-hidden relative">
              {loading && (
                <div className="absolute inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center rounded-b-2xl">
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 28, color: '#D4A84B' }} spin />} />
                </div>
              )}
              {/* Timeline (V3C4 Dots) */}
              <div className={`border p-3 rounded-2xl ${themeMode === 'dark' ? 'border-neutral-800 bg-white/[0.01]' : 'border-slate-100 bg-slate-50/30'}`}>
                <div className="flex items-center justify-between mb-2.5 px-2">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${themeMode === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>← Trước</span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${themeMode === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>Hiện tại / Tương lai →</span>
                </div>
                <div className="relative flex items-center justify-center py-1">
                  <div className={`absolute top-1/2 left-[8%] right-[8%] h-[2px] ${themeMode === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`} style={{ transform: 'translateY(-50%)' }}></div>
                  <div className={`absolute top-1/2 left-1/2 w-[2px] h-4 ${themeMode === 'dark' ? 'bg-slate-700' : 'bg-slate-300'}`} style={{ transform: 'translate(-50%, -50%)' }}></div>
                  <div className="relative flex items-center justify-between w-full px-[4%]">
                    {periods.map(p => {
                      const isActive = p.id === currentPeriodId;
                      return (
                        <div key={p.id} className="flex flex-col items-center cursor-pointer select-none" style={{ width: '16%' }} onClick={() => setCurrentPeriodId(p.id)}>
                          <div 
                            className={`w-3.5 h-3.5 rounded-full transition-all duration-300 relative flex items-center justify-center border-2 ${
                              isActive 
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 border-white dark:border-[#121212] scale-110' 
                                : `${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-300 border-white hover:bg-slate-400'}`
                            }`}
                            style={isActive ? { boxShadow: '0 0 12px rgba(245,158,11,0.6)' } : {}}
                          >
                            {isActive && <span className="absolute inset-0 rounded-full bg-amber-500 animate-ping opacity-50"></span>}
                          </div>
                          <span className={`text-[9px] mt-1.5 font-bold text-center leading-tight transition-colors ${
                            isActive 
                              ? 'text-amber-500' 
                              : `${themeMode === 'dark' ? 'text-gray-500' : 'text-slate-400'}`
                          }`}>{p.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Target Preset Level breakdown bar */}
              <div className={`flex items-center justify-center gap-6 py-2 px-4 rounded-xl border ${
                themeMode === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'
              } mx-6 mb-1 text-[11px] font-semibold shrink-0`}>
                <span className={themeMode === 'dark' ? 'text-gray-400' : 'text-slate-500'}>
                  🎯 Chỉ tiêu {activeMetricConfig.label} ({activePreset.emoji} {activePreset.name}):
                </span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <span className="opacity-60">Daily:</span>
                    <span className="font-extrabold text-gold">{dailyTarget}</span>
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-white/10"></span>
                  <span className="flex items-center gap-1">
                    <span className="opacity-60">Weekly:</span>
                    <span className="font-extrabold text-gold">{weeklyTarget}</span>
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-white/10"></span>
                  <span className="flex items-center gap-1">
                    <span className="opacity-60">Monthly:</span>
                    <span className="font-extrabold text-gold">{monthlyTarget}</span>
                  </span>
                </div>
              </div>

              {/* Radar Chart (V3E) */}
              <div className="flex flex-col items-center my-1.5 flex-shrink-0">
                <svg viewBox="0 0 580 400" className="w-[240px] h-[165px] select-none">
                  {/* Concentric rings */}
                  {[0.25, 0.5, 0.75, 1.0].map(level => {
                    const pts = getPentagonPoints(RADAR_CENTER_X, RADAR_CENTER_Y, RADAR_MAX_R * level);
                    const ptsStr = pointsToString(pts);
                    const isOuter = level === 1.0;
                    return (
                      <polygon 
                        key={level} 
                        points={ptsStr} 
                        fill="none" 
                        stroke={
                          isOuter
                            ? (themeMode === 'dark' ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.35)')
                            : (themeMode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.14)')
                        } 
                        strokeWidth={isOuter ? '1.5' : '0.75'} 
                        strokeDasharray={isOuter ? 'none' : '3,3'} 
                      />
                    );
                  })}
                  {/* Axis lines */}
                  {RADAR_ANGLES.map((a, i) => {
                    const end = polarToXY(RADAR_CENTER_X, RADAR_CENTER_Y, RADAR_MAX_R, a);
                    const isActive = currentMetricKey === metricConfigs[i].key;
                    return (
                      <line 
                        key={i} 
                        x1={RADAR_CENTER_X} y1={RADAR_CENTER_Y} x2={end.x} y2={end.y} 
                        stroke={isActive ? metricConfigs[i].color : (themeMode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)')} 
                        strokeWidth={isActive ? 1.5 : 0.5} 
                      />
                    );
                  })}
                  {/* Axis labels (Font size reduced by 30% to 25px to fit fully) */}
                  {RADAR_ANGLES.map((a, i) => {
                    const labelDist = RADAR_MAX_R + 24;
                    const pos = polarToXY(RADAR_CENTER_X, RADAR_CENTER_Y, labelDist, a);
                    
                    // Fine-tune alignments for the 25px font-size
                    let anchor: 'start' | 'middle' | 'end' = 'middle';
                    let dy = '0px';
                    
                    if (i === 0) { // Top (Calls)
                      anchor = 'middle';
                      dy = '-10px';
                    } else if (i === 1) { // Right-Top (Pickups)
                      anchor = 'start';
                      dy = '5px';
                    } else if (i === 2) { // Right-Bottom (Happy Call)
                      anchor = 'start';
                      dy = '12px';
                    } else if (i === 3) { // Left-Bottom (Booked)
                      anchor = 'end';
                      dy = '12px';
                    } else if (i === 4) { // Left-Top (Done Deal)
                      anchor = 'end';
                      dy = '5px';
                    }

                    const isActive = currentMetricKey === metricConfigs[i].key;
                    return (
                      <text 
                        key={i} 
                        x={pos.x} y={pos.y} 
                        textAnchor={anchor}
                        dy={dy}
                        style={{ 
                          fill: metricConfigs[i].color, 
                          fontSize: '25px', 
                          fontWeight: isActive ? '950' : '650', 
                          fontFamily: 'Plus Jakarta Sans' 
                        }}
                      >
                        {metricConfigs[i].label}
                      </text>
                    );
                  })}
                  {/* Values path */}
                  <polygon 
                    points={pointsToString(dataPoints)} 
                    fill={themeMode === 'dark' ? 'rgba(212,168,75,0.18)' : 'rgba(212,168,75,0.12)'} 
                    stroke="#D4A84B" 
                    strokeWidth="2" 
                    strokeLinejoin="round" 
                  />
                  {/* Data points */}
                  {dataPoints.map((pt, i) => {
                    const isActive = currentMetricKey === metricConfigs[i].key;
                    return (
                      <circle 
                        key={i} 
                        cx={pt.x} cy={pt.y} 
                        r={isActive ? 5 : 3} 
                        fill={metricConfigs[i].color} 
                        stroke={isActive ? '#fff' : 'none'} 
                        strokeWidth={isActive ? 1.5 : 0} 
                      />
                    );
                  })}
                </svg>
              </div>

              {/* Legend Row copied from Front face (Mini Summary Cards) */}
              <div className="grid grid-cols-5 gap-2 mt-1 flex-shrink-0">
                {metricConfigs.map(mc => {
                  const val = activePerformance[mc.key];
                  const target = activeMemberTargets[mc.key];
                  const actualPct = target > 0 ? Math.round((val / target) * 100) : 0;
                  const barPct = Math.min(actualPct, 100);
                  const isActive = currentMetricKey === mc.key;
                  const Icon = mc.antIcon;
                  return (
                    <div 
                      key={mc.key}
                      onClick={() => setCurrentMetricKey(mc.key)}
                      className={`rounded-2xl p-2.5 flex items-center gap-2.5 cursor-pointer transition-all duration-300 border ${
                        isActive 
                          ? (themeMode === 'dark' 
                              ? 'border-transparent' 
                              : 'border-transparent')
                          : (themeMode === 'dark' 
                              ? 'border-white/5 hover:border-white/10' 
                              : 'border-slate-100 hover:border-slate-200/80')
                      }`}
                      style={{
                        background: isActive 
                          ? (themeMode === 'dark' ? `linear-gradient(135deg, ${mc.color}15, rgba(255,255,255,0.01))` : `linear-gradient(135deg, ${mc.color}08, #ffffff)`)
                          : (themeMode === 'dark' ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)'),
                        boxShadow: isActive ? `0 10px 25px -5px ${mc.color}25, 0 8px 10px -6px ${mc.color}25` : 'none',
                        borderLeft: isActive ? `3.5px solid ${mc.color}` : undefined
                      }}
                    >
                      {/* Left Side: Glowing Radial Ring with Icon */}
                      <div 
                        className="relative w-11 h-11 flex items-center justify-center shrink-0 rounded-full transition-all duration-300"
                        style={{
                          boxShadow: `0 0 15px ${mc.color}35`,
                        }}
                      >
                        <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="16" fill="none" stroke={themeMode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} strokeWidth="2.5"></circle>
                          <circle cx="18" cy="18" r="16" fill="none" stroke={mc.color} strokeWidth="3" strokeDasharray="100" strokeDashoffset={100 - barPct} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }}></circle>
                        </svg>
                        <Icon className="text-sm relative z-10" style={{ color: mc.color, fontSize: '22px' }} />
                      </div>

                      {/* Right Side: Info with Diagonal Slash */}
                      <div className="flex-1 min-w-0 text-left">
                        <span className="text-[10px] font-black uppercase tracking-wider block font-outfit" style={{ color: mc.color }}>{mc.label}</span>
                        <div className="flex items-center gap-1.5 leading-none mt-0 select-none">
                          <span className={`text-2xl font-outfit font-black ${themeMode === 'dark' ? 'text-white' : 'text-slate-800'}`}>{val}</span>
                          <span className="w-[1.5px] h-5 transform rotate-12 shrink-0" style={{ backgroundColor: `${mc.color}45` }}></span>
                          <span className={`text-xs font-extrabold ${themeMode === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>{target}</span>
                        </div>
                        <span className="text-[9px] font-black uppercase block mt-0.5" style={{ color: mc.color }}>ĐẠT: {actualPct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Leaderboard (Podium Fixed Height) */}
              <div className={`pt-2 border-t mt-2 flex-shrink-0 ${themeMode === 'dark' ? 'border-white/5' : 'border-gray-200'}`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <TrophyOutlined className="text-gold text-xs animate-bounce" />
                  <span className={`text-[10px] font-black uppercase tracking-wider ${themeMode === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>Bảng Xếp Hạng Đội Nhóm (Đóng deal)</span>
                </div>
                
                {/* Podium Grid */}
                <div className="w-full flex items-end justify-center gap-4 pt-9" style={{ minHeight: '190px' }}>
                  {podiumOrderBack.map((member, idx) => {
                    if (!member) return null;
                    const val = member.value;
                    const isSelected = member.id === currentMemberId;
                    const rank = idx === 0 ? 2 : (idx === 1 ? 1 : 3);
                    const barHeight = idx === 0 ? 70 : (idx === 1 ? 95 : 50);
                    const rankEmoji = idx === 0 ? '🥈' : (idx === 1 ? '🥇' : '🥉');

                    return (
                      <div 
                        key={member.id} 
                        onClick={() => setCurrentMemberId(member.id)}
                        className={`flex flex-col items-center relative cursor-pointer transition-all duration-300 hover:scale-105 ${isSelected ? 'scale-105 z-10' : 'opacity-85 hover:opacity-100'}`} 
                        style={{ width: '90px' }}
                      >
                        <div className="flex flex-col items-center mb-1 text-center w-full relative z-10">
                          <span className="text-xs mb-0.5">{rank === 1 ? '👑' : rankEmoji}</span>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white mb-1 border-2 ${
                            isSelected ? 'border-gold shadow-lg shadow-gold/20 scale-105' : (themeMode === 'dark' ? 'border-white/10' : 'border-gray-300')
                          }`} style={{ background: member.gradient }}>
                            {member.initials}
                          </div>
                          <div className={`text-[10px] font-black truncate w-full px-1 ${themeMode === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{member.name}</div>
                          
                          {/* Mini Radar chart SVG inside podium back side columns */}
                          <svg id={`miniRadar-Back-New-${member.id}`} viewBox="0 0 60 60" className="w-[32px] h-[32px] my-0.5 opacity-80" ref={el => {
                            if (!el) return;
                            const cx = 30, cy = 30, maxR = 20;
                            const colors = ['#3b82f6', '#8B5CF6', '#F59E0B', '#F97316', '#10B981'];
                            const metrics = ['calls', 'pickups', 'happy', 'booked', 'done'];
                            const pts100 = RADAR_ANGLES.map(a => polarToXY(cx, cy, maxR, a));
                            const pts50 = RADAR_ANGLES.map(a => polarToXY(cx, cy, maxR * 0.5, a));
                            const perf = member.perf;
                            const memberTargets = getMemberTarget(member.id, currentPeriodId);
                            const dataPts = metrics.map((m, i) => {
                              const t = memberTargets[m];
                              const ratio = t > 0 ? Math.min(perf[m] / t, 1) : 0;
                              return polarToXY(cx, cy, maxR * ratio, RADAR_ANGLES[i]);
                            });
                            el.innerHTML = `
                              <polygon points="${pointsToString(pts100)}" fill="none" stroke="${themeMode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}" stroke-width="0.5"/>
                              <polygon points="${pointsToString(pts50)}" fill="none" stroke="${themeMode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}" stroke-width="0.3" stroke-dasharray="1.5,1.5"/>
                              <polygon points="${pointsToString(dataPts)}" fill="rgba(212,168,75,0.15)" stroke="#D4A84B" stroke-width="1.2" stroke-linejoin="round"/>
                              ${dataPts.map((p, i) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="1.5" fill="${colors[i]}"/>`).join('')}
                            `;
                          }}></svg>

                          <div className={`text-sm font-black ${themeMode === 'dark' ? 'text-white' : 'text-slate-800'}`}>{val}</div>
                        </div>
                        <div 
                          className="w-full rounded-t-lg transition-all duration-500 flex items-end justify-center pb-1"
                          style={{ 
                            height: `${barHeight}px`, 
                            background: themeMode === 'dark' 
                              ? 'linear-gradient(to top, rgba(255,255,255,0.03), rgba(255,255,255,0.08))' 
                              : 'linear-gradient(to top, rgba(0,0,0,0.02), rgba(0,0,0,0.05))', 
                            border: `1px solid ${themeMode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                            borderBottom: 'none'
                          }}
                        >
                          <span className="text-xs font-black opacity-20 text-white">{rank}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Ranks 4-7 horizontal cards list */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {remainingBack.map((m, i) => {
                    const memberTargets = getMemberTarget(m.id, currentPeriodId);
                    const target = memberTargets['done'];
                    const pct = target > 0 ? Math.round((m.value / target) * 100) : 0;
                    const isSelected = m.id === currentMemberId;
                    
                    // Segment bars calculations
                    const colors = ['#3b82f6', '#8B5CF6', '#F59E0B', '#F97316', '#10B981'];
                    const metrics = ['calls', 'pickups', 'happy', 'booked', 'done'];
                    const segmentsHtml = metrics.map((metricKey, mtIdx) => {
                      const itemVal = m.perf[metricKey];
                      const itemTgt = memberTargets[metricKey];
                      const itemPct = itemTgt > 0 ? Math.min(Math.round((itemVal / itemTgt) * 100), 100) : 0;
                      return (
                        <div key={metricKey} className={`flex-1 h-1 rounded overflow-hidden ${themeMode === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`}>
                          <div className="h-full rounded" style={{ width: `${itemPct}%`, backgroundColor: colors[mtIdx] }}></div>
                        </div>
                      );
                    });

                    return (
                      <div 
                        key={m.id}
                        onClick={() => setCurrentMemberId(m.id)}
                        className={`flex items-center gap-2.5 p-2 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-gold/15 border-gold/35 shadow-sm' 
                            : (themeMode === 'dark' ? 'bg-white/[0.02] border-transparent hover:bg-white/5' : 'bg-slate-50 border-transparent hover:bg-slate-100')
                        }`}
                      >
                        <span className={`text-[11px] font-bold w-4 text-center ${themeMode === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>#{i + 4}</span>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm" style={{ background: m.gradient }}>{m.initials}</div>
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                          <span className={`text-xs font-bold truncate ${themeMode === 'dark' ? 'text-gray-200' : 'text-slate-700'}`}>{m.name}</span>
                          <div className="flex gap-0.5 shrink-0 w-20">
                            {segmentsHtml}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Target Config Panel Slide-in (Back Side) */}
            {renderConfigPanel()}
          </div>

        </div>
        {/* Drag resize handle visual indicator */}
        <div className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 pointer-events-none z-[1050] flex items-end justify-end opacity-40">
          <svg className="w-3 h-3 text-gold" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="8" y1="2" x2="2" y2="8" />
            <line x1="8" y1="5" x2="5" y2="8" />
          </svg>
        </div>
      </div>
    </div>
  );
}
