'use client';

import React, { useState, useMemo } from 'react';
import { Input, Tooltip, Avatar } from 'antd';
import { Search, RefreshCw, Sparkles, UserCheck, Shield, Award } from 'lucide-react';
import { StatusTag } from '../../../../components/ui';
import type { CareerStaffSummary, CareerRole } from '@mos-lab/shared';

interface StaffCareerSelectorProps {
  staffList: CareerStaffSummary[];
  selectedStaffId: number | null;
  onSelectStaff: (staffId: number) => void;
  onSyncProd: () => Promise<void>;
  syncing: boolean;
  lastSyncedAt?: string | null;
  activeRoleFilter?: string;
  onRoleFilterChange?: (role: string) => void;
}

const ROLE_TABS = [
  { key: 'ALL', label: 'Tất cả Thợ Mi' },
  { key: 'CV', label: 'Thợ Mi (CV)' },
  { key: 'CV_PLUS', label: 'Thợ Tự Chủ (CV+)' },
  { key: 'CV_PLUS_PLUS', label: 'Đàn Chị Sảnh (CV++)' },
];

export const StaffCareerSelector: React.FC<StaffCareerSelectorProps> = ({
  staffList,
  selectedStaffId,
  onSelectStaff,
  onSyncProd,
  syncing,
  lastSyncedAt,
  activeRoleFilter = 'ALL',
  onRoleFilterChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [internalRoleFilter, setInternalRoleFilter] = useState('ALL');

  const currentFilter = onRoleFilterChange ? activeRoleFilter : internalRoleFilter;
  const setFilter = (role: string) => {
    if (onRoleFilterChange) onRoleFilterChange(role);
    else setInternalRoleFilter(role);
  };

  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      // Bắt buộc chỉ lọc lấy CV (Thợ mi) theo danh sách báo cáo CV
      const isCv =
        ['lt', 'technician', 'cv'].includes((s.role || '').toLowerCase()) ||
        ['CV', 'CV_PLUS', 'CV_PLUS_PLUS'].includes(s.careerRole);
      if (!isCv) return false;

      const matchSearch =
        !searchTerm.trim() ||
        s.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.username.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;
      if (currentFilter === 'ALL') return true;
      if (currentFilter === 'CV') return s.careerRole === 'CV';
      if (currentFilter === 'CV_PLUS') return s.careerRole === 'CV_PLUS';
      if (currentFilter === 'CV_PLUS_PLUS') return s.careerRole === 'CV_PLUS_PLUS';
      return true;
    });
  }, [staffList, searchTerm, currentFilter]);

  const selectedStaff = useMemo(() => {
    return staffList.find((s) => s.id === selectedStaffId) || null;
  }, [staffList, selectedStaffId]);

  const getRoleBadge = (role: CareerRole) => {
    switch (role) {
      case 'CV':
        return <StatusTag status="processing" label="CV · Thợ Mi" className="tabular-nums font-semibold m-0 text-xs" />;
      case 'CV_PLUS':
        return <StatusTag status="purple" label="CV+ · Tự Chủ" className="tabular-nums font-semibold m-0 text-xs" />;
      case 'CV_PLUS_PLUS':
        return <StatusTag status="purple" label="CV++ · Đàn Chị" className="tabular-nums font-semibold m-0 text-xs" />;
      case 'CC':
        return <StatusTag status="orange" label="CC · Tư Vấn" className="tabular-nums font-semibold m-0 text-xs" />;
      case 'FM':
        return <StatusTag status="gold" label="FM · Quản Lý Sàn" className="tabular-nums font-semibold m-0 text-xs" />;
      case 'CHO':
        return (
          <StatusTag status="purple" label="CHO · Mẹ Thiên Thần" className="tabular-nums font-semibold m-0 text-xs" />
        );
      case 'BOSS':
        return <StatusTag status="error" label="BOSS · Co-Owner" className="tabular-nums font-semibold m-0 text-xs" />;
      default:
        return <StatusTag status="default" label={role} className="tabular-nums font-semibold m-0 text-xs" />;
    }
  };

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-rose-100/60 dark:border-slate-800/80 p-4 shadow-sm mb-6 transition-all duration-200">
      {/* Header bar: Title + Search + Refresh Prod Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center text-white shadow-sm">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 m-0">
                Chọn Chuyên Viên (CV) Mô Phỏng Data Thật
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold tabular-nums">
                {filteredStaff.length} thợ mi
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Dữ liệu đồng bộ trực tiếp từ danh sách Báo Cáo CV (Số ca 90 ngày, Fix, Tip, Combo, Chuối FAL)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Tìm tên nhân viên..."
            prefix={<Search className="w-3.5 h-3.5 text-slate-400" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-48 text-xs rounded-xl"
            allowClear
          />

          <Tooltip title="Làm mới dữ liệu mới nhất trực tiếp từ cơ sở dữ liệu Production">
            <button
              onClick={onSyncProd}
              disabled={syncing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                syncing
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 active:scale-95 border border-emerald-500/20'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Đang sync...' : 'Refresh từ Prod'}</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-3">
        {ROLE_TABS.map((tab) => {
          const isActive = currentFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1 rounded-xl text-xs whitespace-nowrap font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-rose-500 text-white shadow-sm font-semibold'
                  : 'bg-slate-100/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/60'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Staff Grid / Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-56 overflow-y-auto pr-1">
        {filteredStaff.length === 0 ? (
          <div className="col-span-full py-6 text-center text-xs text-slate-400">
            Không tìm thấy nhân viên nào phù hợp
          </div>
        ) : (
          filteredStaff.map((staff) => {
            const isSelected = staff.id === selectedStaffId;
            return (
              <div
                key={staff.id}
                onClick={() => onSelectStaff(staff.id)}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-400 shadow-sm ring-2 ring-rose-400/40'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 hover:border-rose-300 hover:bg-rose-50/40'
                }`}
              >
                <div className="flex items-start gap-2 mb-1.5">
                  <Avatar
                    src={staff.avatarUrl || undefined}
                    className="shrink-0 bg-gradient-to-tr from-rose-400 to-amber-300 text-white font-bold text-xs"
                    size={28}
                  >
                    {staff.displayName.slice(0, 1).toUpperCase()}
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {staff.displayName}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{staff.username.split('@')[0]}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1 mt-auto pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1">
                    {getRoleBadge(staff.careerRole)}
                    {staff.hasFailedQaAudit ? (
                      <StatusTag status="error" label="QA ❌" className="text-[9px] py-0 px-1 m-0 leading-none" />
                    ) : staff.qaAuditPassed ? (
                      <StatusTag status="success" label="QA " className="text-[9px] py-0 px-1 m-0 leading-none" />
                    ) : (
                      <StatusTag status="warning" label="QA ⚠️" className="text-[9px] py-0 px-1 m-0 leading-none" />
                    )}
                  </div>
                  {staff.ordersCount > 0 && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold tabular-nums">
                      {staff.ordersCount} ca
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer bar showing active selected staff summary */}
      {selectedStaff && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400">Đang chọn:</span>
            <Avatar
              src={selectedStaff.avatarUrl || undefined}
              size={22}
              className="shrink-0 bg-gradient-to-tr from-rose-400 to-amber-300 text-white font-bold text-[10px]"
            >
              {selectedStaff.displayName.slice(0, 1).toUpperCase()}
            </Avatar>
            <span className="font-bold text-slate-800 dark:text-slate-100">{selectedStaff.displayName}</span>
            {getRoleBadge(selectedStaff.careerRole)}
            <span className="text-slate-400">·</span>
            <span className="tabular-nums text-slate-600 dark:text-slate-300">
              <strong>{selectedStaff.ordersCount}</strong> ca mi (90 ngày)
            </span>
            <span className="text-slate-400">·</span>
            <span className="tabular-nums text-slate-600 dark:text-slate-300">
              Fix: <strong>{(selectedStaff.fixRate * 100).toFixed(1)}%</strong>
            </span>
            <span className="text-slate-400">·</span>
            <span className="tabular-nums text-slate-600 dark:text-slate-300">
              Tip:{' '}
              <strong>
                {selectedStaff.tipRatioAboveShop > 0
                  ? `+${(selectedStaff.tipRatioAboveShop * 100).toFixed(0)}%`
                  : `${(selectedStaff.tipRatioAboveShop * 100).toFixed(0)}%`}
              </strong>{' '}
              so với shop
            </span>
            <span className="text-slate-400">·</span>
            <span className="tabular-nums text-slate-600 dark:text-slate-300">
              Combo: <strong>{(selectedStaff.selfComboRate * 100).toFixed(1)}%</strong>
            </span>
          </div>

          {lastSyncedAt && (
            <div className="text-[10px] text-slate-400 tabular-nums">
              Đồng bộ lúc: {new Date(lastSyncedAt).toLocaleTimeString('vi-VN')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
