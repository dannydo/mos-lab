'use client';

import React, { useState, useEffect } from 'react';
import { Button, message } from 'antd';
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
  UpOutlined
} from '@ant-design/icons';
import { useTheme } from '../context/ThemeContext';

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

export default function TelesalesDashboardModal({ visible, onClose, initialMemberId = 'TN' }: TelesalesDashboardModalProps) {
  const { themeMode } = useTheme();
  const [currentMemberId, setCurrentMemberId] = useState(initialMemberId);
  const [currentPeriodId, setCurrentPeriodId] = useState('today');
  const [currentMetricKey, setCurrentMetricKey] = useState('calls');
  const [isFlipped, setIsFlipped] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

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

  useEffect(() => {
    if (visible) {
      setCurrentMemberId(initialMemberId);
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
  }, [visible, initialMemberId]);

  if (!visible) return null;

  const activeMember = members.find(m => m.id === currentMemberId) || members[0];
  const activePerformance = getMemberData(currentMemberId, currentPeriodId);
  const activeMetricConfig = metricConfigs.find(m => m.key === currentMetricKey) || metricConfigs[0];
  const activeValue = activePerformance[currentMetricKey];
  const activeTarget = targets[currentPeriodId][currentMetricKey];
  const activePercent = activeTarget > 0 ? Math.min(Math.round((activeValue / activeTarget) * 100), 100) : 0;

  // Donut values
  const r = 85;
  const circumference = 2 * Math.PI * r; // ~534
  const strokeDashoffset = circumference - (activePercent / 100) * circumference;

  // Impersonating Member Grid sorted by current metric
  const rankings = members.map(m => ({
    ...m,
    value: getMemberData(m.id, currentPeriodId)[currentMetricKey]
  })).sort((a, b) => b.value - a.value);

  const top3 = rankings.slice(0, 3);
  const remaining = rankings.slice(3);
  const podiumOrder = [top3[1], top3[0], top3[2]]; // order 2nd, 1st, 3rd

  // Back side rankings (sorted by Done deal)
  const backRankings = members.map(m => ({
    ...m,
    value: getMemberData(m.id, currentPeriodId)['done'],
    perf: getMemberData(m.id, currentPeriodId)
  })).sort((a, b) => b.value - a.value);
  const top3Back = backRankings.slice(0, 3);
  const remainingBack = backRankings.slice(3);
  const podiumOrderBack = [top3Back[1], top3Back[0], top3Back[2]];

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
    const target = targets[currentPeriodId][mc.key];
    const ratio = Math.min(val / target, 1);
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
      {/* Outer Modal Container: Taller size, no inner card scroll, auto fitting */}
      <div 
        className="w-full max-w-[780px] h-[92vh] min-h-[820px] max-h-[920px] relative transition-transform duration-500" 
        style={{ perspective: '1500px' }}
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
                  {activeMember.id}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-base md:text-lg tracking-tight ${themeMode === 'dark' ? 'text-white' : 'text-slate-800'}`}>{activeMember.name}</span>
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
                <Button 
                  type="text"
                  icon={<SettingOutlined className="text-gold" />}
                  onClick={() => setIsConfigOpen(true)}
                  className="hover:bg-gold/10 flex items-center justify-center w-8 h-8 rounded-lg"
                  title="Cấu hình Target"
                />
                <Button 
                  type="text"
                  icon={<CloseOutlined className={themeMode === 'dark' ? 'text-gray-400 hover:text-red-500' : 'text-slate-500 hover:text-red-500'} />}
                  onClick={onClose}
                  className="hover:bg-red-500/10 flex items-center justify-center w-8 h-8 rounded-lg"
                />
              </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 p-5 flex flex-col justify-between overflow-hidden">
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
                  const target = targets[currentPeriodId][mc.key];
                  const pct = target > 0 ? Math.min(Math.round((val / target) * 100), 100) : 0;
                  const isActive = currentMetricKey === mc.key;
                  const Icon = mc.antIcon;
                  return (
                    <div 
                      key={mc.key}
                      onClick={() => setCurrentMetricKey(mc.key)}
                      className={`rounded-xl p-2.5 text-center cursor-pointer transition-all duration-300 border ${
                        isActive 
                          ? (themeMode === 'dark' 
                              ? 'bg-slate-800/80 border-slate-700 shadow-lg shadow-black/30' 
                              : 'bg-white border-slate-200 shadow-md shadow-slate-100')
                          : (themeMode === 'dark' 
                              ? 'bg-white/[0.01] border-transparent hover:bg-white/[0.04]' 
                              : 'bg-slate-50/50 border-transparent hover:bg-slate-100')
                      }`}
                      style={isActive ? { borderLeft: `3px solid ${mc.color}`, boxShadow: `0 8px 20px ${mc.color}15` } : {}}
                    >
                      <div className="flex items-center justify-center gap-1.5 text-[9px] font-bold tracking-tight mb-1 select-none" style={{ color: mc.color }}>
                        <Icon className="text-[10px] shrink-0" />
                        <span className="truncate">{mc.label}</span>
                      </div>
                      <div className="text-base font-black tracking-tight" style={{ color: mc.color }}>{val}</div>
                      <div className={`text-[8px] font-bold ${themeMode === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>/ {target}</div>
                      <div className={`mt-1.5 h-1 rounded-full overflow-hidden ${themeMode === 'dark' ? 'bg-white/10' : 'bg-slate-200/80'}`}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: mc.color }}></div>
                      </div>
                      <div className="text-[8px] font-extrabold mt-1" style={{ color: mc.color }}>{pct}%</div>
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
                    const target = targets[currentPeriodId][currentMetricKey];
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
                            {member.id}
                          </div>
                          <div className={`text-[9px] font-black truncate w-full px-1 ${themeMode === 'dark' ? 'text-gray-300' : 'text-slate-700'}`}>{member.name}</div>
                          <div className="text-xs font-black" style={{ color }}>{val}</div>
                          <div className={`text-[8px] font-bold ${themeMode === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>{pct}%</div>
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

                {/* Ranks 4-6 horizontal cards list */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {remaining.map((m, i) => {
                    const target = targets[currentPeriodId][currentMetricKey];
                    const pct = target > 0 ? Math.round((m.value / target) * 100) : 0;
                    const isSelected = m.id === currentMemberId;
                    return (
                      <div 
                        key={m.id}
                        onClick={() => setCurrentMemberId(m.id)}
                        className={`flex items-center gap-2 p-1.5 rounded-lg border text-left cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-gold/15 border-gold/30 shadow-sm' 
                            : (themeMode === 'dark' ? 'bg-white/[0.02] border-transparent hover:bg-white/5' : 'bg-slate-50 border-transparent hover:bg-slate-100')
                        }`}
                      >
                        <span className={`text-[8px] font-bold w-3 text-center ${themeMode === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>#{i + 4}</span>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ background: m.gradient }}>{m.id}</div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-[9px] font-bold block truncate ${themeMode === 'dark' ? 'text-gray-300' : 'text-slate-700'}`}>{m.name}</span>
                          <span className="text-[10px] font-black block leading-none mt-0.5" style={{ color: activeMetricConfig.color }}>{m.value} <span className={`text-[8px] font-bold ${themeMode === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>({pct}%)</span></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Target Config Panel Slide-in (Front Side) */}
            <div 
              className={`absolute top-0 right-0 h-full w-[280px] border-l flex flex-col z-30 transition-transform duration-300 ${
                themeMode === 'dark' 
                  ? 'bg-[#141414] border-white/10' 
                  : 'bg-white border-slate-200'
              } ${isConfigOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
              <div className={`flex items-center justify-between px-4 py-3 border-b ${themeMode === 'dark' ? 'border-white/5' : 'border-gray-200'}`}>
                <div>
                  <h3 className={`text-sm font-bold ${themeMode === 'dark' ? 'text-white' : 'text-gray-900'}`}>Cấu hình Target</h3>
                  <p className="text-[9px] text-gold font-medium mt-0.5">Tập thiết lập chu kỳ</p>
                </div>
                <Button type="text" icon={<CloseOutlined className="text-xs" />} onClick={() => setIsConfigOpen(false)} className="flex items-center justify-center" />
              </div>
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
                      
                      {/* Fixed height transition container */}
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
                  className="w-full bg-gradient-to-r from-gold to-goldDark hover:from-goldLight border-none text-black font-bold h-9 rounded-xl shadow-md shadow-gold/10"
                >
                  Lưu cấu hình
                </Button>
              </div>
            </div>
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
                  {activeMember.id}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-base md:text-lg tracking-tight ${themeMode === 'dark' ? 'text-white' : 'text-slate-800'}`}>{activeMember.name}</span>
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
                <Button 
                  type="text"
                  icon={<SettingOutlined className="text-gold" />}
                  onClick={() => setIsConfigOpen(true)}
                  className="hover:bg-gold/10 flex items-center justify-center w-8 h-8 rounded-lg"
                  title="Cấu hình Target"
                />
                <Button 
                  type="text"
                  icon={<CloseOutlined className={themeMode === 'dark' ? 'text-gray-400 hover:text-red-500' : 'text-slate-500 hover:text-red-500'} />}
                  onClick={onClose}
                  className="hover:bg-red-500/10 flex items-center justify-center w-8 h-8 rounded-lg"
                />
              </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 p-5 flex flex-col justify-between overflow-hidden">
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
                  const target = targets[currentPeriodId][mc.key];
                  const pct = target > 0 ? Math.min(Math.round((val / target) * 100), 100) : 0;
                  const isActive = currentMetricKey === mc.key;
                  const Icon = mc.antIcon;
                  return (
                    <div 
                      key={mc.key}
                      onClick={() => setCurrentMetricKey(mc.key)}
                      className={`rounded-xl p-2.5 text-center cursor-pointer transition-all duration-250 border ${
                        isActive 
                          ? (themeMode === 'dark' ? 'bg-white/[0.08] ring-1' : 'bg-slate-50 ring-1')
                          : (themeMode === 'dark' ? 'bg-white/[0.02] border-transparent hover:bg-white/5' : 'bg-slate-50/50 border-transparent hover:bg-slate-100')
                      }`}
                      style={isActive ? { borderColor: mc.color, boxShadow: `0 0 8px ${mc.color}20` } : {}}
                    >
                      <div className="flex items-center justify-center gap-1.5 text-[9px] font-bold tracking-tight mb-1 select-none" style={{ color: mc.color }}>
                        <Icon className="text-[10px] shrink-0" />
                        <span className="truncate">{mc.label}</span>
                      </div>
                      <div className="text-sm font-extrabold" style={{ color: mc.color }}>{val}</div>
                      <div className={`text-[8px] ${themeMode === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>/ {target}</div>
                      <div className={`mt-1.5 h-1 rounded-full overflow-hidden ${themeMode === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: mc.color }}></div>
                      </div>
                      <div className="text-[8px] font-bold mt-1" style={{ color: mc.color }}>{pct}%</div>
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
                            {member.id}
                          </div>
                          <div className={`text-[9px] font-bold truncate w-full px-1 ${themeMode === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{member.name}</div>
                          
                          {/* Mini Radar chart SVG inside podium back side columns */}
                          <svg id={`miniRadar-Back-New-${member.id}`} viewBox="0 0 60 60" className="w-[32px] h-[32px] my-0.5 opacity-80" ref={el => {
                            if (!el) return;
                            const cx = 30, cy = 30, maxR = 20;
                            const colors = ['#3b82f6', '#8B5CF6', '#F59E0B', '#F97316', '#10B981'];
                            const metrics = ['calls', 'pickups', 'happy', 'booked', 'done'];
                            const pts100 = RADAR_ANGLES.map(a => polarToXY(cx, cy, maxR, a));
                            const pts50 = RADAR_ANGLES.map(a => polarToXY(cx, cy, maxR * 0.5, a));
                            const perf = member.perf;
                            const dataPts = metrics.map((m, i) => {
                              const t = targets[currentPeriodId][m];
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

                          <div className={`text-xs font-extrabold ${themeMode === 'dark' ? 'text-white' : 'text-slate-800'}`}>{val}</div>
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

                {/* Ranks 4-6 horizontal cards list */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {remainingBack.map((m, i) => {
                    const target = targets[currentPeriodId]['done'];
                    const pct = target > 0 ? Math.round((m.value / target) * 100) : 0;
                    const isSelected = m.id === currentMemberId;
                    
                    // Segment bars calculations
                    const colors = ['#3b82f6', '#8B5CF6', '#F59E0B', '#F97316', '#10B981'];
                    const metrics = ['calls', 'pickups', 'happy', 'booked', 'done'];
                    const segmentsHtml = metrics.map((metricKey, mtIdx) => {
                      const itemVal = m.perf[metricKey];
                      const itemTgt = targets[currentPeriodId][metricKey];
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
                        className={`flex items-center gap-2 p-1.5 rounded-lg border text-left cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-gold/15 border-gold/35 shadow-sm' 
                            : (themeMode === 'dark' ? 'bg-white/[0.02] border-transparent hover:bg-white/5' : 'bg-slate-50 border-transparent hover:bg-slate-100')
                        }`}
                      >
                        <span className={`text-[8px] font-bold w-3 text-center ${themeMode === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>#{i + 4}</span>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ background: m.gradient }}>{m.id}</div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-[9px] font-semibold block truncate ${themeMode === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{m.name}</span>
                          <div className="flex gap-0.5 mt-1.5 w-16">
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
            <div 
              className={`absolute top-0 right-0 h-full w-[280px] border-l flex flex-col z-30 transition-transform duration-300 ${
                themeMode === 'dark' 
                  ? 'bg-[#141414] border-white/10' 
                  : 'bg-white border-slate-200'
              } ${isConfigOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
              <div className={`flex items-center justify-between px-4 py-3 border-b ${themeMode === 'dark' ? 'border-white/5' : 'border-gray-200'}`}>
                <div>
                  <h3 className={`text-sm font-bold ${themeMode === 'dark' ? 'text-white' : 'text-gray-900'}`}>Cấu hình Target</h3>
                  <p className="text-[9px] text-gold font-medium mt-0.5">Tập thiết lập chu kỳ</p>
                </div>
                <Button type="text" icon={<CloseOutlined className="text-xs" />} onClick={() => setIsConfigOpen(false)} className="flex items-center justify-center" />
              </div>
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
                      
                      {/* Fixed height transition container */}
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
                  className="w-full bg-gradient-to-r from-gold to-goldDark hover:from-goldLight border-none text-black font-bold h-9 rounded-xl shadow-md shadow-gold/10"
                >
                  Lưu cấu hình
                </Button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
