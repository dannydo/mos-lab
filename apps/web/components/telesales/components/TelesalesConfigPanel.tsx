'use client';

import React from 'react';
import { Button, Segmented, Checkbox, Select, message } from 'antd';
import { CloseOutlined, SaveOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { LEVEL_PRESETS } from '../hooks/useTelesalesDashboard';

interface TelesalesConfigPanelProps {
  themeMode: 'light' | 'dark';
  isConfigOpen: boolean;
  setIsConfigOpen: (open: boolean) => void;
  configTab: 'target' | 'staff';
  setConfigTab: (tab: 'target' | 'staff') => void;
  periods: { id: string; label: string }[];
  currentPeriodId: string;
  expandedSections: Record<string, boolean>;
  setExpandedSections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  targets: Record<string, Record<string, number>>;
  metricConfigs: SafeAny[];
  handleTargetChange: (periodId: string, metricKey: string, valStr: string) => void;
  saveTargets: () => void;
  systemStaff: SafeAny[];
  selectedStaffIds: number[];
  toggleStaffSelection: (id: number) => void;
  getMemberLevelIdx: (memberId: string | number) => number;
  setStaffLevels: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  saveVisibleStaff: () => Promise<void>;
  isAdmin: boolean;
}

export default function TelesalesConfigPanel({
  themeMode,
  isConfigOpen,
  setIsConfigOpen,
  configTab,
  setConfigTab,
  periods,
  currentPeriodId,
  expandedSections,
  setExpandedSections,
  targets,
  metricConfigs,
  handleTargetChange,
  saveTargets,
  systemStaff,
  selectedStaffIds,
  toggleStaffSelection,
  getMemberLevelIdx,
  setStaffLevels,
  saveVisibleStaff,
  isAdmin,
}: TelesalesConfigPanelProps) {
  const toggleConfigSection = (periodId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [periodId]: !prev[periodId],
    }));
  };

  const levelMenuItems = LEVEL_PRESETS.map((preset, idx) => ({
    value: idx,
    label: `${preset.emoji} ${preset.name}`,
  }));

  return (
    <div
      className={`absolute top-0 right-0 h-full w-[280px] border-l flex flex-col z-30 transition-transform duration-300 ${
        themeMode === 'dark' ? 'bg-[#141414] border-white/10' : 'bg-white border-slate-200'
      }`}
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        height: '100%',
        width: '280px',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 30,
        WebkitTransform: isConfigOpen ? 'translateX(0%)' : 'translateX(100%)',
        transform: isConfigOpen ? 'translateX(0%)' : 'translateX(100%)',
        transition: 'transform 0.3s ease-in-out',
        boxSizing: 'border-box',
      }}
    >
      <div
        className={`flex items-center justify-between px-4 py-3 border-b ${themeMode === 'dark' ? 'border-white/5' : 'border-gray-200'}`}
      >
        <div>
          <h3 className={`text-sm font-bold ${themeMode === 'dark' ? 'text-white' : 'text-gray-900'}`}>Cấu hình</h3>
          <p className="text-[9px] text-gold font-medium mt-0.5">Bảng xếp hạng & Mục tiêu</p>
        </div>
        <Button
          type="text"
          icon={<CloseOutlined className="text-xs" />}
          onClick={() => setIsConfigOpen(false)}
          className="flex items-center justify-center w-6 h-6 p-0 rounded-lg hover:bg-neutral-500/10"
        />
      </div>

      <div className="px-3 pt-3 flex-shrink-0">
        <Segmented
          block
          value={configTab}
          onChange={(val) => setConfigTab(val as 'target' | 'staff')}
          options={[
            { label: 'Mục tiêu', value: 'target' },
            { label: 'Nhân sự', value: 'staff' },
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
            {periods.map((p) => {
              const isCurrent = p.id === currentPeriodId;
              const isExpanded = expandedSections[p.id];
              const t = targets[p.id] || { calls: 80, pickups: 50, happy: 20, booked: 15, done: 10 };
              return (
                <div
                  key={p.id}
                  className={`rounded-xl border overflow-hidden ${
                    themeMode === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-gray-200'
                  }`}
                >
                  <button
                    onClick={() => toggleConfigSection(p.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 transition-all ${
                      themeMode === 'dark' ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold ${themeMode === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {p.label}
                      </span>
                      {isCurrent && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-gold/20 text-gold font-bold">
                          Hiện tại
                        </span>
                      )}
                    </div>
                    {isExpanded ? (
                      <UpOutlined className="text-[8px] text-gray-400" />
                    ) : (
                      <DownOutlined className="text-[8px] text-gray-400" />
                    )}
                  </button>

                  <div
                    className="transition-all duration-300 overflow-hidden"
                    style={{ maxHeight: isExpanded ? '230px' : '0px' }}
                  >
                    <div className="px-3 pb-3 pt-1 space-y-2">
                      {metricConfigs.map((m) => (
                        <div key={m.key} className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-semibold ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                          >
                            {m.icon} {m.label}
                          </span>
                          <input
                            type="number"
                            aria-label={`Mục tiêu ${m.label} cho ${p.label}`}
                            className={`w-16 h-6 rounded-md border text-center text-xs font-bold focus:border-gold/50 focus:outline-2 focus:outline-gold ${
                              themeMode === 'dark'
                                ? 'bg-black/30 border-white/10 text-white'
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                            value={t[m.key] || 0}
                            min="1"
                            onChange={(e) => handleTargetChange(p.id, m.key, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div
            className={`p-3 border-t ${themeMode === 'dark' ? 'border-white/5 bg-black/20' : 'border-gray-200 bg-gray-50'}`}
          >
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
              Chọn nhân viên hiển thị trên bảng xếp hạng (Telesales Executive, Quản lý & Admin):
            </p>
            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar min-h-0">
              {systemStaff.map((staff: SafeAny) => {
                const isChecked = selectedStaffIds.includes(staff.id);
                return (
                  <div
                    key={staff.id}
                    onClick={() => toggleStaffSelection(staff.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                      isChecked
                        ? themeMode === 'dark'
                          ? 'border-gold/30 bg-gold/5 shadow-[0_4px_12px_rgba(212,168,75,0.08)]'
                          : 'border-gold/25 bg-gold/[0.03] shadow-[0_4px_10px_rgba(212,168,75,0.05)]'
                        : themeMode === 'dark'
                          ? 'border-white/[0.04] bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.03]'
                          : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-slate-50'
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
                        <span
                          className={`text-xs font-bold truncate transition-colors ${
                            isChecked
                              ? themeMode === 'dark'
                                ? 'text-gold'
                                : 'text-amber-800'
                              : themeMode === 'dark'
                                ? 'text-gray-200'
                                : 'text-gray-800'
                          }`}
                        >
                          {staff.displayName || staff.username}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                            isChecked
                              ? themeMode === 'dark'
                                ? 'text-gold/60'
                                : 'text-amber-700/60'
                              : themeMode === 'dark'
                                ? 'text-gray-500'
                                : 'text-slate-400'
                          }`}
                        >
                          {staff.role === 'telesales' ? 'Telesales Executive' : staff.role}
                        </span>
                      </div>
                    </div>

                    {isAdmin ? (
                      <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                        <Select
                          value={getMemberLevelIdx(staff.id)}
                          onChange={(val) => {
                            setStaffLevels((prev) => {
                              const next = {
                                ...prev,
                                [String(staff.id)]: val,
                              };
                              const initials = staff.displayName
                                ? staff.displayName
                                    .split(' ')
                                    .map((n: string) => n[0])
                                    .join('')
                                    .slice(0, 2)
                                    .toUpperCase()
                                : staff.username?.slice(0, 2).toUpperCase();
                              if (initials) {
                                next[String(initials)] = val;
                              }
                              return next;
                            });
                          }}
                          options={levelMenuItems}
                          style={{ width: '100px' }}
                          size="small"
                        />
                      </div>
                    ) : (
                      <span className="text-base">{LEVEL_PRESETS[getMemberLevelIdx(staff.id)]?.emoji || '🐥'}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div
            className={`p-3 border-t ${themeMode === 'dark' ? 'border-white/5 bg-black/20' : 'border-gray-200 bg-gray-50'}`}
          >
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={saveVisibleStaff}
              className="w-full bg-gradient-to-r from-gold to-goldDark hover:from-goldLight border-none text-black font-bold h-9 rounded-xl shadow-md shadow-gold/10 flex items-center justify-center gap-1.5"
            >
              Lưu cấu hình
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
