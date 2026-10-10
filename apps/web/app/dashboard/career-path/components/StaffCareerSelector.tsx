'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Input, Tooltip, Avatar, Dropdown, Popconfirm } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  RefreshCw,
  UserCheck,
  Eye,
  Bug,
  HandCoins,
  ShieldCheck,
  Heart,
  Banana,
  Wallet,
  CheckCircle2,
  Table as TableIcon,
  LayoutGrid,
  Sparkles,
  ArrowDownCircle,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  CircleUser,
  CreditCard,
} from 'lucide-react';
import { StatusTag, DataTable } from '../../../../components/ui';
import { WingRoleLabel } from './IslandGameIcon';
import type { CareerStaffSummary, CareerRole, CareerPeriod, BananaTransactionCategory } from '@mos-lab/shared';
import { formatCareerRoleName } from '../career-path.constants';

export type CareerSelectorMode = 'ultra_compact' | 'cards' | 'table';

export interface StaffCareerSelectorProps {
  staffList: CareerStaffSummary[];
  selectedStaffId: number | null;
  onSelectStaff: (staffId: number) => void;
  onSyncProd: () => Promise<void>;
  syncing: boolean;
  lastSyncedAt?: string | null;
  activeRoleFilter?: string;
  onRoleFilterChange?: (role: string) => void;
  period?: CareerPeriod;
  onPeriodChange?: (period: CareerPeriod) => void;
  onSetRole?: (staffId: number, newRole: CareerRole) => Promise<void>;
  onDemote?: (staffId: number, targetRole: CareerRole) => Promise<void>;
  actionLoading?: boolean;
  onOpenBananaDrawer?: (staffId: number, category: BananaTransactionCategory) => void;
  isCollapsedHorizontal?: boolean;
  onCollapseHorizontal?: () => void;
  onExpandHorizontal?: () => void;
  selectorMode?: CareerSelectorMode;
  onSelectorModeChange?: (mode: CareerSelectorMode) => void;
}

const ROLE_TABS = [
  { key: 'ALL', label: 'Tất cả', fullLabel: 'Tất cả Chuyên Viên & KTV' },
  { key: 'KTV', label: 'KTV', fullLabel: 'KTV Thử Việc (Tập sự & Sát hạch)' },
  { key: 'CV', label: 'CV · Dịu Dàng', fullLabel: 'Chuyên Viên Dịu Dàng (0 Cánh)' },
  {
    key: 'CV_PLUS',
    label: '🪽 CV (1 Cánh · Đang triển khai)',
    fullLabel: 'Chuyên Viên Thanh Lịch (1 Cánh - Đang triển khai)',
  },
  { key: 'CV_PLUS_PLUS', label: '🪽 CV 🪽 (Nghiên cứu)', fullLabel: 'Chuyên Viên Quí Phái (2 Cánh - Đang nghiên cứu)' },
];

const PERIOD_TABS: { key: CareerPeriod; label: string; fullLabel: string }[] = [
  {
    key: 'last_month',
    label: 'Tháng trước',
    fullLabel: 'Tháng trước (chu kỳ hoàn tất gần nhất, không tính tháng này)',
  },
  { key: 'this_month', label: 'Tháng này', fullLabel: 'Tháng này (tính từ ngày 1 đến hiện tại)' },
  { key: 'last_30_days', label: '30 ngày qua', fullLabel: '30 ngày gần nhất tính đến hôm nay' },
  {
    key: 'last_3_months',
    label: '3 tháng trước',
    fullLabel: '3 tháng trước (quý hoàn tất gần nhất, không tính tháng này)',
  },
];

const StaffCareerSelectorComponent: React.FC<StaffCareerSelectorProps> = ({
  staffList,
  selectedStaffId,
  onSelectStaff,
  onSyncProd,
  syncing,
  lastSyncedAt,
  activeRoleFilter = 'ALL',
  onRoleFilterChange,
  period = 'last_month',
  onPeriodChange,
  onSetRole,
  onDemote,
  actionLoading = false,
  onOpenBananaDrawer,
  isCollapsedHorizontal = false,
  onCollapseHorizontal,
  onExpandHorizontal,
  selectorMode,
  onSelectorModeChange,
}) => {
  const [internalRoleFilter, setInternalRoleFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [internalMode, setInternalMode] = useState<CareerSelectorMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('mos_career_selector_mode') as CareerSelectorMode | null;
        if (saved === 'ultra_compact' || saved === 'cards' || saved === 'table') {
          return saved;
        }
      } catch (_) {}
    }
    return isCollapsedHorizontal ? 'cards' : 'table';
  });

  const currentMode: CareerSelectorMode = selectorMode ?? internalMode;

  const handleModeChange = (mode: CareerSelectorMode) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mos_career_selector_mode', mode);
      } catch (_) {}
    }
    if (onSelectorModeChange) {
      onSelectorModeChange(mode);
    } else {
      setInternalMode(mode);
      if (mode === 'table') {
        onExpandHorizontal?.();
      } else {
        onCollapseHorizontal?.();
      }
    }
  };

  const currentFilter = onRoleFilterChange ? activeRoleFilter : internalRoleFilter;
  const setFilter = (role: string) => {
    if (onRoleFilterChange) onRoleFilterChange(role);
    else setInternalRoleFilter(role);
  };

  const scrollRailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedStaffId && scrollRailRef.current) {
      const activeEl = scrollRailRef.current.querySelector<HTMLElement>(`[data-staff-id="${selectedStaffId}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedStaffId, currentMode]);

  const scrollRail = (direction: 'left' | 'right') => {
    if (scrollRailRef.current) {
      scrollRailRef.current.scrollBy({
        left: direction === 'left' ? -350 : 350,
        behavior: 'smooth',
      });
    }
  };

  const renderModeSwitcher = () => (
    <div className="flex items-center gap-0.5 bg-slate-100/90 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/70 shrink-0">
      <Tooltip title="Chế độ Siêu Gọn: Chỉ hiển thị avatar các bạn Chuyên Viên, tối đa diện tích màn hình">
        <button
          type="button"
          data-testid="mode-ultra-compact-btn"
          onClick={() => handleModeChange('ultra_compact')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            currentMode === 'ultra_compact'
              ? 'bg-rose-500 text-white shadow-xs font-black'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/70'
          }`}
        >
          <CircleUser className="w-3.5 h-3.5" />
          <span>Chỉ Avatar</span>
        </button>
      </Tooltip>

      <Tooltip title="Chế độ Thẻ Ngang: Hiển thị avatar kèm tên, cấp bậc và 3 chỉ số nhanh">
        <button
          type="button"
          data-testid="mode-cards-btn"
          onClick={() => handleModeChange('cards')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            currentMode === 'cards'
              ? 'bg-rose-500 text-white shadow-xs font-black'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/70'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Thẻ Ngang</span>
        </button>
      </Tooltip>

      <Tooltip title="Chế độ Bảng 8 Cột: Mở rộng xem toàn bộ 8 chỉ số kiểm toán của toàn salon">
        <button
          type="button"
          data-testid="mode-table-btn"
          onClick={() => handleModeChange('table')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            currentMode === 'table'
              ? 'bg-rose-500 text-white shadow-xs font-black'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/70'
          }`}
        >
          <TableIcon className="w-3.5 h-3.5" />
          <span>Bảng 8 Cột</span>
        </button>
      </Tooltip>
    </div>
  );

  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      // Bắt buộc chỉ lọc lấy CV (Chuyên viên) & KTV theo danh sách báo cáo
      const isCv =
        ['lt', 'technician', 'cv', 'ktv'].includes((s.role || '').toLowerCase()) ||
        ['KTV', 'CV', 'CV_PLUS', 'CV_PLUS_PLUS'].includes(s.careerRole);
      if (!isCv) return false;

      if (currentFilter === 'ALL') return true;
      if (currentFilter === 'KTV') return s.careerRole === 'KTV';
      if (currentFilter === 'CV') return s.careerRole === 'CV';
      if (currentFilter === 'CV_PLUS') return s.careerRole === 'CV_PLUS';
      if (currentFilter === 'CV_PLUS_PLUS') return s.careerRole === 'CV_PLUS_PLUS';
      return true;
    });
  }, [staffList, currentFilter]);

  const selectedStaff = useMemo(() => {
    return staffList.find((s) => s.id === selectedStaffId) || null;
  }, [staffList, selectedStaffId]);

  const getStaffTipPercent = (staff: CareerStaffSummary): number => {
    if (typeof staff.staffTipRate === 'number' && staff.staffTipRate > 0) {
      return Number((staff.staffTipRate * 100).toFixed(1));
    }
    if (staff.ordersCount && staff.totalTip) {
      const raw = Math.min(0.65, Math.max(0.2, (staff.totalTip / (staff.ordersCount * 38000)) * 0.45));
      return Number((raw * 100).toFixed(1));
    }
    return 31.4;
  };

  const getQaAuditsCount = (staff: CareerStaffSummary): number => {
    if (typeof staff.qaAuditsCount === 'number') {
      return staff.qaAuditsCount;
    }
    if (typeof staff.weeklyQaAuditRate === 'number') {
      return Math.round(staff.weeklyQaAuditRate * 4);
    }
    return 0;
  };

  const getBananaBalance = (staff: CareerStaffSummary): number => {
    return typeof staff.bananaBalance === 'number' ? staff.bananaBalance : 0;
  };

  type MetricStatus = 'passed' | 'near' | 'failed';

  const getStatusBadgeClass = (status: MetricStatus): string => {
    switch (status) {
      case 'passed':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25';
      case 'near':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25';
      case 'failed':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25';
    }
  };

  const getStatusLabel = (status: MetricStatus): string => {
    switch (status) {
      case 'passed':
        return '✓ Đạt chuẩn';
      case 'near':
        return '⚡ Gần đạt';
      case 'failed':
        return '✕ Chưa đạt';
    }
  };

  const getOrdersStatus = (orders: number): MetricStatus => {
    if (orders >= 300) return 'passed';
    if (orders >= 240) return 'near';
    return 'failed';
  };

  const getFixStatus = (fixRate: number): MetricStatus => {
    const fixPct = Number(((fixRate || 0) * 100).toFixed(1));
    if (fixPct <= 2.0) return 'passed';
    if (fixPct <= 2.5) return 'near';
    return 'failed';
  };

  const getTipStatus = (staff: CareerStaffSummary): MetricStatus => {
    const tipPct = getStaffTipPercent(staff);
    const branchTipRate = staff.shopTipRate || staff.branchTipRate || 0.45;
    const targetTipPct = Number((branchTipRate * 1.1 * 100).toFixed(1));
    const nearTipPct = Number((branchTipRate * 0.9 * 100).toFixed(1));

    if (tipPct >= targetTipPct) return 'passed';
    if (tipPct >= nearTipPct) return 'near';
    return 'failed';
  };

  const getQaStatus = (staff: CareerStaffSummary): MetricStatus => {
    if (staff.hasFailedQaAudit) return 'failed';
    const audits = getQaAuditsCount(staff);
    if (audits >= 4) return 'passed';
    if (audits >= 3) return 'near';
    return 'failed';
  };

  const getHiStatus = (hi: number): MetricStatus => {
    const hiPct = Math.round((hi || 0.75) * 100);
    if (hiPct >= 70) return 'passed';
    if (hiPct >= 65) return 'near';
    return 'failed';
  };

  const getBananaCountStatus = (count: number): MetricStatus => {
    if (count >= 20) return 'passed';
    if (count >= 15) return 'near';
    return 'failed';
  };

  const getBananaBalanceStatus = (balance: number): MetricStatus => {
    if (balance >= 0) return 'passed';
    if (balance >= -500) return 'near';
    return 'failed';
  };

  const getStaffOverallStatus = (staff: CareerStaffSummary): MetricStatus => {
    if (['CV_PLUS', 'CV_PLUS_PLUS', 'MASTER_TECH'].includes(staff.careerRole)) {
      return 'passed';
    }

    const sOrders = getOrdersStatus(staff.ordersCount || 0);
    const sFix = getFixStatus(staff.fixRate || 0);
    const sTip = getTipStatus(staff);
    const sQa = getQaStatus(staff);
    const sHi = getHiStatus(staff.happinessIndex || 0.75);
    const sBanana = getBananaCountStatus(staff.bananaCount || 0);
    const sBalance = getBananaBalanceStatus(getBananaBalance(staff));

    const list = [sOrders, sFix, sTip, sQa, sHi, sBanana, sBalance];
    const passed = list.filter((s) => s === 'passed').length;
    const failed = list.filter((s) => s === 'failed').length;

    if (passed >= 4 && failed <= 1) return 'passed';
    if (failed >= 4 || passed < 2) return 'failed';
    return 'near';
  };

  const getRoleBadge = (role: CareerRole, compact = false) => {
    switch (role) {
      case 'KTV':
        return (
          <StatusTag
            status="default"
            label={compact ? 'KTV' : 'KTV Thử Việc'}
            className="tabular-nums font-semibold m-0 text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"
          />
        );
      case 'CV':
        return (
          <StatusTag
            status="processing"
            label={compact ? 'CV' : 'CV · Dịu Dàng'}
            className="tabular-nums font-bold m-0 text-[10px] px-1.5 py-0 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800 bg-pink-50 dark:bg-pink-950/40"
          />
        );
      case 'CV_PLUS':
        return (
          <StatusTag
            status="purple"
            label={<WingRoleLabel text={compact ? '🪽 CV' : '🪽 CV · Thanh Lịch'} />}
            className="tabular-nums font-bold m-0 text-[10px] px-1.5 py-0 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40"
          />
        );
      case 'CV_PLUS_PLUS':
        return (
          <StatusTag
            status="gold"
            label={<WingRoleLabel text={compact ? '🪽 CV 🪽' : '🪽 CV 🪽 · Quí Phái'} />}
            className="tabular-nums font-bold m-0 text-[10px] px-1.5 py-0 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40"
          />
        );
      case 'MASTER_TECH':
        return (
          <StatusTag
            status="gold"
            label={compact ? 'Master Tech' : 'Master Tech · Kỹ Thuật'}
            className="tabular-nums font-bold m-0 text-[10px] px-1.5 py-0"
          />
        );
      case 'CC':
        return (
          <StatusTag
            status="orange"
            label={compact ? 'CC' : 'CC · Tư Vấn'}
            className="tabular-nums font-bold m-0 text-[10px] px-1.5 py-0"
          />
        );
      case 'FM':
        return (
          <StatusTag
            status="gold"
            label={compact ? 'FM' : 'FM · Quản Lý Sàn'}
            className="tabular-nums font-bold m-0 text-[10px] px-1.5 py-0"
          />
        );
      case 'CHO':
        return (
          <StatusTag
            status="purple"
            label={compact ? 'CHO' : 'CHO · Mẹ Thiên Thần'}
            className="tabular-nums font-bold m-0 text-[10px] px-1.5 py-0"
          />
        );
      case 'BOSS':
        return (
          <StatusTag
            status="error"
            label={compact ? 'BOSS' : 'BOSS · Co-Owner'}
            className="tabular-nums font-bold m-0 text-[10px] px-1.5 py-0"
          />
        );
      default:
        return (
          <StatusTag status="default" label={role} className="tabular-nums font-bold m-0 text-[10px] px-1.5 py-0" />
        );
    }
  };

  const renderRoleDropdown = (staff: CareerStaffSummary, compact = false) => {
    if (!onSetRole) return getRoleBadge(staff.careerRole, compact);

    return (
      <Dropdown
        menu={{
          items: [
            {
              key: 'KTV',
              label: (
                <span className="font-semibold text-xs flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <span>⛑️ KTV Thử Việc</span>
                  {staff.careerRole === 'KTV' && (
                    <span className="text-[10px] text-emerald-500 font-bold">✓ Hiện tại</span>
                  )}
                </span>
              ),
              disabled: staff.careerRole === 'KTV',
            },
            {
              key: 'CV',
              label: (
                <span className="font-semibold text-xs flex items-center gap-1.5 text-pink-600 dark:text-pink-400">
                  <span>CV · Dịu Dàng</span>
                  {staff.careerRole === 'CV' && (
                    <span className="text-[10px] text-emerald-500 font-bold">✓ Hiện tại</span>
                  )}
                </span>
              ),
              disabled: staff.careerRole === 'CV',
            },
            {
              key: 'CV_PLUS',
              label: (
                <span className="font-semibold text-xs flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>🪽 CV · Thanh Lịch</span>
                  {staff.careerRole === 'CV_PLUS' && (
                    <span className="text-[10px] text-emerald-500 font-bold">✓ Hiện tại</span>
                  )}
                </span>
              ),
              disabled: staff.careerRole === 'CV_PLUS',
            },
            {
              key: 'CV_PLUS_PLUS',
              label: (
                <span className="font-semibold text-xs flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>🪽 CV 🪽 · Quí Phái</span>
                  {staff.careerRole === 'CV_PLUS_PLUS' && (
                    <span className="text-[10px] text-emerald-500 font-bold">✓ Hiện tại</span>
                  )}
                </span>
              ),
              disabled: staff.careerRole === 'CV_PLUS_PLUS',
            },
          ],
          onClick: ({ key }) => {
            onSetRole(staff.id, key as CareerRole);
          },
        }}
        trigger={['click']}
      >
        <span
          onClick={(e) => e.stopPropagation()}
          className="cursor-pointer hover:opacity-80 transition-opacity inline-flex items-center"
          title="Nhấn để đổi cấp bậc trực tiếp"
        >
          {getRoleBadge(staff.careerRole, compact)}
        </span>
      </Dropdown>
    );
  };

  const columns: ColumnsType<CareerStaffSummary> = [
    {
      title: 'Chuyên Viên',
      key: 'staff',
      minWidth: 160,
      sorter: (a, b) => a.displayName.localeCompare(b.displayName),
      render: (_, staff) => {
        const isSelected = staff.id === selectedStaffId;
        const overallStatus = getStaffOverallStatus(staff);
        return (
          <div className="flex items-center gap-2.5 py-0.5">
            <div className="relative shrink-0">
              <Avatar
                src={staff.avatarUrl || undefined}
                className={`bg-gradient-to-tr from-rose-400 to-amber-300 text-white font-bold text-xs ring-2 transition-all ${
                  isSelected
                    ? overallStatus === 'passed'
                      ? 'ring-emerald-500 shadow-sm shadow-emerald-500/20'
                      : overallStatus === 'near'
                        ? 'ring-amber-500 shadow-sm shadow-amber-500/20'
                        : 'ring-rose-500 shadow-sm shadow-rose-500/20'
                    : 'ring-white/40 dark:ring-slate-800'
                }`}
                size={34}
              >
                {staff.displayName.slice(0, 1).toUpperCase()}
              </Avatar>
              {isSelected && (
                <span
                  className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ring-2 shadow-xs transition-transform scale-105 ${
                    overallStatus === 'passed'
                      ? 'bg-emerald-500 text-white ring-white dark:ring-slate-900'
                      : overallStatus === 'near'
                        ? 'bg-amber-500 text-white ring-white dark:ring-slate-900'
                        : 'bg-rose-500 text-white ring-white dark:ring-slate-900'
                  }`}
                  title={`Đang chọn · ${getStatusLabel(overallStatus)}`}
                >
                  ✓
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`text-xs truncate ${
                    isSelected
                      ? overallStatus === 'passed'
                        ? 'font-black text-emerald-600 dark:text-emerald-400'
                        : overallStatus === 'near'
                          ? 'font-black text-amber-600 dark:text-amber-400'
                          : 'font-black text-rose-600 dark:text-rose-400'
                      : 'font-bold text-slate-800 dark:text-slate-100'
                  }`}
                  title={staff.displayName}
                >
                  {staff.displayName}
                </span>
                {renderRoleDropdown(staff, true)}
              </div>
              <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                <span>@{staff.username.split('@')[0]}</span>
                {staff.branchName && (
                  <>
                    <span>·</span>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{staff.branchName}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: (
        <Tooltip title="Bộ mi: Số ca hoàn thành trong 90 ngày qua (Chuẩn ≥ 300 bộ)">
          <span className="inline-flex items-center justify-center p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Eye className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </span>
        </Tooltip>
      ),
      key: 'ordersCount',
      dataIndex: 'ordersCount',
      width: 64,
      align: 'center',
      sorter: (a, b) => (a.ordersCount || 0) - (b.ordersCount || 0),
      render: (ordersCount: number) => {
        const count = ordersCount || 0;
        const status = getOrdersStatus(count);
        return (
          <Tooltip title={`${count}/300 bộ mi (90 ngày qua) · ${getStatusLabel(status)}`}>
            <span
              className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums border ${getStatusBadgeClass(
                status
              )}`}
            >
              {count}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: (
        <Tooltip title="Fix: Tỷ lệ sửa mi / bảo hành trong tháng hoàn tất gần nhất (Chuẩn ≤ 2.0%)">
          <span className="inline-flex items-center justify-center p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Bug className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </span>
        </Tooltip>
      ),
      key: 'fixRate',
      dataIndex: 'fixRate',
      width: 64,
      align: 'center',
      sorter: (a, b) => (a.fixRate || 0) - (b.fixRate || 0),
      render: (fixRate: number) => {
        const fixPct = Number(((fixRate || 0) * 100).toFixed(1));
        const status = getFixStatus(fixRate || 0);
        return (
          <Tooltip
            title={`Tỷ lệ bảo hành / sửa: ${fixPct}% tháng hoàn tất gần nhất (chuẩn ≤ 2.0%) · ${getStatusLabel(status)}`}
          >
            <span
              className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums border ${getStatusBadgeClass(
                status
              )}`}
            >
              {fixPct}%
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: (
        <Tooltip title="Tip: Tỷ lệ khách tip ≥ 20K trong tháng hoàn tất gần nhất (Chuẩn vượt 10% TB chi nhánh)">
          <span className="inline-flex items-center justify-center p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <HandCoins className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </span>
        </Tooltip>
      ),
      key: 'tip',
      width: 66,
      align: 'center',
      sorter: (a, b) => getStaffTipPercent(a) - getStaffTipPercent(b),
      render: (_, staff) => {
        const tipPct = getStaffTipPercent(staff);
        const status = getTipStatus(staff);
        const diffShop = Number(((staff.tipRatioAboveShop || 0) * 100).toFixed(0));
        const branchLabel = staff.branchName || 'Chi nhánh';
        const branchTipPct = ((staff.shopTipRate || staff.branchTipRate || 0.45) * 100).toFixed(1);
        const targetTipPct = Number(((staff.shopTipRate || staff.branchTipRate || 0.45) * 1.1 * 100).toFixed(1));
        return (
          <Tooltip
            title={`Tip tháng hoàn tất gần nhất: ${tipPct}% (mục tiêu ≥ ${targetTipPct}% · TB ${branchLabel}: ${branchTipPct}%, ${
              diffShop >= 0 ? `+${diffShop}%` : `${diffShop}%`
            }) · ${getStatusLabel(status)}`}
          >
            <span
              className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums border ${getStatusBadgeClass(
                status
              )}`}
            >
              {tipPct}%
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: (
        <Tooltip title="QA & QC: Kiểm định định kỳ trong tháng hoàn tất gần nhất (Chuẩn ≥ 4 lần/tháng và không vi phạm FAILED)">
          <span className="inline-flex items-center justify-center p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ShieldCheck className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </span>
        </Tooltip>
      ),
      key: 'qaAudits',
      width: 68,
      align: 'center',
      sorter: (a, b) => getQaAuditsCount(a) - getQaAuditsCount(b),
      render: (_, staff) => {
        const audits = getQaAuditsCount(staff);
        const status = getQaStatus(staff);
        return (
          <Tooltip
            title={
              staff.hasFailedQaAudit
                ? '✕ Có biên bản vi phạm QA'
                : `${audits}/4 lần kiểm định tác phong & vệ sinh tháng hoàn tất gần nhất · ${getStatusLabel(status)}`
            }
          >
            <span
              className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums border ${getStatusBadgeClass(
                status
              )}`}
            >
              {audits}/4
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: (
        <Tooltip title="HI: Chỉ số Hạnh Phúc trong tháng hoàn tất gần nhất (Chuẩn ≥ 70%)">
          <span className="inline-flex items-center justify-center p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Heart className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </span>
        </Tooltip>
      ),
      key: 'hi',
      dataIndex: 'happinessIndex',
      width: 62,
      align: 'center',
      sorter: (a, b) => (a.happinessIndex || 0) - (b.happinessIndex || 0),
      render: (happinessIndex: number) => {
        const hiPct = Math.round((happinessIndex || 0.75) * 100);
        const status = getHiStatus(happinessIndex || 0.75);
        return (
          <Tooltip
            title={`Chỉ số Hạnh Phúc HI tháng hoàn tất gần nhất: ${hiPct}% (chuẩn ≥ 70%) · ${getStatusLabel(status)}`}
          >
            <span
              className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums border ${getStatusBadgeClass(
                status
              )}`}
            >
              {hiPct}%
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: (
        <Tooltip title="Chuối yêu thương: Check-in nhận từ đồng đội trong tháng hoàn tất gần nhất (Chuẩn ≥ 20 🍌)">
          <span className="inline-flex items-center justify-center p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Banana className="w-4 h-4 text-amber-500" />
          </span>
        </Tooltip>
      ),
      key: 'bananaCount',
      dataIndex: 'bananaCount',
      width: 66,
      align: 'center',
      sorter: (a, b) => (a.bananaCount || 0) - (b.bananaCount || 0),
      render: (bananaCount: number, staff: CareerStaffSummary) => {
        const count = bananaCount || 0;
        const status = getBananaCountStatus(count);
        return (
          <Tooltip title={`${count}/20 chuối Check-in tính điểm · ${getStatusLabel(status)} (Nhấn để xem danh sách)`}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenBananaDrawer?.(staff.id, 'CHECKIN');
              }}
              className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums border hover:scale-105 active:scale-95 transition-transform cursor-pointer ${getStatusBadgeClass(
                status
              )}`}
            >
              {count}
            </button>
          </Tooltip>
        );
      },
    },
    {
      title: (
        <Tooltip title="Ví chuối: Số dư ví thực tế sống ở thời điểm hiện tại (Chuẩn không âm ≥ 0 🍌)">
          <span className="inline-flex items-center justify-center p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Wallet className="w-4 h-4 text-amber-500" />
          </span>
        </Tooltip>
      ),
      key: 'bananaBalance',
      width: 76,
      align: 'center',
      sorter: (a, b) => getBananaBalance(a) - getBananaBalance(b),
      render: (_, staff) => {
        const balance = getBananaBalance(staff);
        const status = getBananaBalanceStatus(balance);
        return (
          <Tooltip
            title={`Số dư ví hiện tại: ${balance.toLocaleString('vi-VN')} 🍌 · ${getStatusLabel(status)} (Nhấn để xem sao kê)`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenBananaDrawer?.(staff.id, 'ALL');
              }}
              className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-black tabular-nums border shadow-2xs hover:scale-105 active:scale-95 transition-transform cursor-pointer ${getStatusBadgeClass(
                status
              )}`}
            >
              {balance.toLocaleString('vi-VN')}
            </button>
          </Tooltip>
        );
      },
    },
  ];

  if (currentMode === 'ultra_compact') {
    return (
      <div className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-rose-100/60 dark:border-slate-800/80 p-2.5 shadow-sm transition-all duration-200">
        {/* Top Control Bar: Title, Count, Inline Role Chips, Period & 3-Way Mode Switcher */}
        <div className="flex items-center justify-between gap-2.5 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/80 flex-wrap">
          {/* Left: Title + Staff Count + Inline Role Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-6 h-6 rounded-lg bg-pink-500/10 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-500/20 flex items-center justify-center shrink-0">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 m-0">Chuyên Viên</h3>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/30 tabular-nums">
              {filteredStaff.length} CV
            </span>

            {/* Inline Role Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 ml-1">
              {ROLE_TABS.map((tab) => {
                const isActive = currentFilter === tab.key;
                return (
                  <Tooltip key={tab.key} title={tab.fullLabel}>
                    <button
                      type="button"
                      onClick={() => setFilter(tab.key)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all duration-150 shrink-0 whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-rose-500 text-white shadow-xs font-bold'
                          : 'bg-slate-100/90 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200/90 dark:hover:bg-slate-700/80'
                      }`}
                    >
                      <WingRoleLabel text={tab.label} />
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>

          {/* Right: Period Chips, Scroll Arrows & 3-Way Mode Switcher */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Period selector */}
            <div className="hidden sm:flex items-center gap-0.5 bg-slate-100/80 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 overflow-x-auto no-scrollbar shrink-0">
              {PERIOD_TABS.map((tab) => {
                const isActive = (period || 'last_month') === tab.key;
                return (
                  <Tooltip key={tab.key} title={tab.fullLabel}>
                    <button
                      type="button"
                      onClick={() => onPeriodChange?.(tab.key)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all duration-150 cursor-pointer shrink-0 whitespace-nowrap ${
                        isActive
                          ? 'bg-rose-500 text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/70'
                      }`}
                    >
                      {tab.label}
                    </button>
                  </Tooltip>
                );
              })}
            </div>

            {/* Scroll navigation arrows for horizontal rail */}
            <div className="flex items-center gap-1">
              <Tooltip title="Cuộn sang trái (kéo ngang)">
                <button
                  type="button"
                  onClick={() => scrollRail('left')}
                  className="w-6 h-6 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
              <Tooltip title="Cuộn sang phải (kéo ngang)">
                <button
                  type="button"
                  onClick={() => scrollRail('right')}
                  className="w-6 h-6 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            </div>

            {/* 3-Way Mode Switcher */}
            {renderModeSwitcher()}
          </div>
        </div>

        {/* ULTRA COMPACT AVATAR ONLY RAIL ("Chỉ thấy avatar CV thôi") */}
        <div
          ref={scrollRailRef}
          className="flex items-center gap-3 overflow-x-auto py-1 px-1 no-scrollbar scroll-smooth"
        >
          {filteredStaff.length === 0 ? (
            <div className="py-2 px-3 text-xs text-slate-400">Không tìm thấy Chuyên Viên nào trong danh mục này</div>
          ) : (
            filteredStaff.map((staff) => {
              const isSelected = staff.id === selectedStaffId;
              const overallStatus = getStaffOverallStatus(staff);
              const tipRate = getStaffTipPercent(staff);
              const balance = getBananaBalance(staff);

              return (
                <Tooltip
                  key={staff.id}
                  title={
                    <div className="p-1 space-y-1 text-center min-w-[140px]">
                      <div className="font-bold text-xs text-white flex items-center justify-center gap-1">
                        <span>{staff.displayName}</span>
                        {getRoleBadge(staff.careerRole, true)}
                      </div>
                      <div className="text-[10px] text-slate-300">{getStatusLabel(overallStatus)}</div>
                      <div className="text-[10px] font-mono text-amber-300 border-t border-white/10 pt-1">
                        {staff.ordersCount || 0} mi · {tipRate}% tip · {balance.toLocaleString('vi-VN')} 🍌
                      </div>
                    </div>
                  }
                >
                  <button
                    data-staff-id={staff.id}
                    type="button"
                    onClick={() => onSelectStaff(staff.id)}
                    className={`group relative flex flex-col items-center px-1.5 py-1 rounded-2xl transition-all duration-200 shrink-0 cursor-pointer select-none active:scale-95 ${
                      isSelected
                        ? 'bg-rose-500/10 dark:bg-rose-500/20 shadow-xs'
                        : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60 opacity-85 hover:opacity-100'
                    }`}
                  >
                    <div className="relative">
                      <Avatar
                        src={staff.avatarUrl || undefined}
                        className={`bg-gradient-to-tr from-rose-400 to-amber-300 text-white font-bold text-xs transition-all ${
                          isSelected
                            ? 'ring-2 ring-pink-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-md shadow-pink-500/30'
                            : overallStatus === 'passed'
                              ? 'border-2 border-emerald-500'
                              : overallStatus === 'near'
                                ? 'border-2 border-amber-500'
                                : 'border-2 border-rose-500'
                        }`}
                        size={42}
                      >
                        {staff.displayName.slice(0, 1).toUpperCase()}
                      </Avatar>

                      {isSelected ? (
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[9px] text-white font-black shadow-xs">
                          ✓
                        </span>
                      ) : (
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                            overallStatus === 'passed'
                              ? 'bg-emerald-500'
                              : overallStatus === 'near'
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                          }`}
                        />
                      )}
                    </div>
                    <span
                      className={`text-[10px] truncate max-w-[58px] text-center block mt-1 transition-colors ${
                        isSelected
                          ? 'font-bold text-pink-600 dark:text-pink-400'
                          : 'font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                      }`}
                    >
                      {staff.displayName}
                    </span>
                  </button>
                </Tooltip>
              );
            })
          )}
        </div>
      </div>
    );
  }

  if (currentMode === 'cards' || (isCollapsedHorizontal && currentMode !== 'table')) {
    return (
      <div className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-rose-100/60 dark:border-slate-800/80 p-3 shadow-sm transition-all duration-200">
        {/* Top Control Bar: Title, Count, Role Filters, Period & 3-Way Mode Switcher */}
        <div className="flex items-center justify-between gap-3 pb-2.5 mb-2 border-b border-slate-100 dark:border-slate-800/80 flex-wrap">
          {/* Left: Title + Staff Count + Inline Role Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-7 h-7 rounded-lg bg-pink-500/10 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-500/20 flex items-center justify-center shrink-0">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 m-0">
              Chuyên Viên Mô Phỏng
            </h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/30 tabular-nums">
              {filteredStaff.length} CV
            </span>

            {/* Inline Role Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 ml-1">
              {ROLE_TABS.map((tab) => {
                const isActive = currentFilter === tab.key;
                return (
                  <Tooltip key={tab.key} title={tab.fullLabel}>
                    <button
                      type="button"
                      onClick={() => setFilter(tab.key)}
                      className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition-all duration-150 shrink-0 whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-rose-500 text-white shadow-xs font-bold'
                          : 'bg-slate-100/90 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200/90 dark:hover:bg-slate-700/80'
                      }`}
                    >
                      <WingRoleLabel text={tab.label} />
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>

          {/* Right: Period Chips, Scroll Arrows & 3-Way Mode Switcher */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Period selector */}
            <div className="hidden sm:flex items-center gap-0.5 bg-slate-100/80 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 overflow-x-auto no-scrollbar shrink-0">
              {PERIOD_TABS.map((tab) => {
                const isActive = (period || 'last_month') === tab.key;
                return (
                  <Tooltip key={tab.key} title={tab.fullLabel}>
                    <button
                      type="button"
                      onClick={() => onPeriodChange?.(tab.key)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all duration-150 cursor-pointer shrink-0 whitespace-nowrap ${
                        isActive
                          ? 'bg-rose-500 text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/70'
                      }`}
                    >
                      {tab.label}
                    </button>
                  </Tooltip>
                );
              })}
            </div>

            {/* Scroll navigation arrows for horizontal rail */}
            <div className="flex items-center gap-1">
              <Tooltip title="Cuộn sang trái (kéo ngang)">
                <button
                  type="button"
                  onClick={() => scrollRail('left')}
                  className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </Tooltip>
              <Tooltip title="Cuộn sang phải (kéo ngang)">
                <button
                  type="button"
                  onClick={() => scrollRail('right')}
                  className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </Tooltip>
            </div>

            {/* 3-Way Mode Switcher */}
            {renderModeSwitcher()}
          </div>
        </div>

        {/* Horizontal Scrollable Rail of Avatars ("Kéo ngang và để avatar ngang") */}
        <div
          ref={scrollRailRef}
          className="flex items-center gap-3 overflow-x-auto py-1 px-1 no-scrollbar scroll-smooth"
        >
          {filteredStaff.length === 0 ? (
            <div className="py-3 px-4 text-xs text-slate-400">Không tìm thấy Chuyên Viên nào trong danh mục này</div>
          ) : (
            filteredStaff.map((staff) => {
              const isSelected = staff.id === selectedStaffId;
              const overallStatus = getStaffOverallStatus(staff);
              const tipRate = getStaffTipPercent(staff);
              const balance = getBananaBalance(staff);

              return (
                <button
                  key={staff.id}
                  data-staff-id={staff.id}
                  type="button"
                  onClick={() => onSelectStaff(staff.id)}
                  className={`group relative flex items-center gap-3 px-3.5 py-2 rounded-2xl border transition-all shrink-0 cursor-pointer select-none active:scale-95 ${
                    isSelected
                      ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-500 shadow-md ring-2 ring-rose-500/25'
                      : 'bg-white/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/70 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar
                      src={staff.avatarUrl || undefined}
                      size={42}
                      className={`transition-all ${
                        isSelected
                          ? overallStatus === 'passed'
                            ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-sm shadow-emerald-500/30'
                            : overallStatus === 'near'
                              ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-sm shadow-amber-500/30'
                              : 'ring-2 ring-rose-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-sm shadow-rose-500/30'
                          : 'border border-slate-200 dark:border-slate-700 group-hover:border-pink-400'
                      }`}
                    >
                      {staff.displayName.slice(0, 1).toUpperCase()}
                    </Avatar>
                    {isSelected ? (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[9px] text-white font-black shadow-xs">
                        ✓
                      </span>
                    ) : (
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                          overallStatus === 'passed'
                            ? 'bg-emerald-500'
                            : overallStatus === 'near'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                        }`}
                        title={getStatusLabel(overallStatus)}
                      />
                    )}
                  </div>

                  <div className="text-left min-w-0">
                    <div className="flex items-center gap-1.5 flex-nowrap">
                      <span
                        className={`text-xs truncate max-w-[120px] ${
                          isSelected
                            ? 'font-black text-rose-600 dark:text-rose-400'
                            : 'font-bold text-slate-800 dark:text-slate-100'
                        }`}
                        title={staff.displayName}
                      >
                        {staff.displayName}
                      </span>
                      <span className="scale-90 origin-left shrink-0">{getRoleBadge(staff.careerRole, true)}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono mt-0.5 whitespace-nowrap">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {staff.ordersCount || 0} mi
                      </span>
                      <span>·</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{tipRate}% tip</span>
                      <span>·</span>
                      <span
                        className={
                          balance < 0
                            ? 'text-rose-600 dark:text-rose-400 font-bold'
                            : 'text-amber-600 dark:text-amber-400 font-bold'
                        }
                      >
                        {balance.toLocaleString('vi-VN')} 🍌
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-rose-100/60 dark:border-slate-800/80 p-4 shadow-sm mb-6 transition-all duration-200">
      {/* Header bar: Refactored Clean 2-Row Layout */}
      <div className="space-y-2.5 mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
        {/* Row 1: Title, Count, Info, Period Filter, View Mode & Symbol-only Collapse Button */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-pink-500/10 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-500/20 flex items-center justify-center shrink-0">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 m-0">
                Chuyên Viên Mô Phỏng
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/30 tabular-nums">
                {filteredStaff.length} CV
              </span>
              <Tooltip
                title="Dữ liệu đánh giá theo tháng hoàn tất gần nhất (3 tháng đối với bộ mi & combo). Bấm vào từng bạn để mô phỏng."
                placement="bottomLeft"
              >
                <span className="cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 inline-flex items-center">
                  <Info className="w-3.5 h-3.5" />
                </span>
              </Tooltip>
            </div>
          </div>

          {/* Right Controls: Period, View Mode & Pure Symbol Collapse Button */}
          <div className="flex items-center gap-1.5 ml-auto">
            {/* Period Filter Chips */}
            <div className="flex items-center gap-0.5 bg-slate-100/80 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 overflow-x-auto no-scrollbar shrink-0">
              {PERIOD_TABS.map((tab) => {
                const isActive = (period || 'last_month') === tab.key;
                return (
                  <Tooltip key={tab.key} title={tab.fullLabel}>
                    <button
                      type="button"
                      onClick={() => onPeriodChange?.(tab.key)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all duration-150 cursor-pointer shrink-0 whitespace-nowrap ${
                        isActive
                          ? 'bg-rose-500 text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/70'
                      }`}
                    >
                      {tab.label}
                    </button>
                  </Tooltip>
                );
              })}
            </div>

            {/* 3-Way Mode Switcher */}
            {renderModeSwitcher()}
          </div>
        </div>

        {/* Row 2: Full-width Role Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          {ROLE_TABS.map((tab) => {
            const isActive = currentFilter === tab.key;
            return (
              <Tooltip key={tab.key} title={tab.fullLabel}>
                <button
                  type="button"
                  onClick={() => setFilter(tab.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 shrink-0 whitespace-nowrap ${
                    isActive
                      ? 'bg-rose-500 text-white shadow-xs font-bold'
                      : 'bg-slate-100/90 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200/90 dark:hover:bg-slate-700/80'
                  }`}
                >
                  <WingRoleLabel text={tab.label} />
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* Primary View: Table with all metrics like Image 2 */}
      {viewMode === 'table' ? (
        <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 overflow-hidden shadow-xs">
          <DataTable<CareerStaffSummary>
            columns={columns}
            dataSource={filteredStaff}
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ y: 520 }}
            onRow={(record) => ({
              onClick: () => onSelectStaff(record.id),
              className: 'cursor-pointer group',
            })}
            rowClassName={(record) => {
              const isSelected = record.id === selectedStaffId;
              if (!isSelected)
                return 'cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50';
              const overall = getStaffOverallStatus(record);
              const colorBg =
                overall === 'passed'
                  ? 'bg-emerald-500/10 dark:bg-emerald-950/40 [&>td]:!bg-emerald-500/10 dark:[&>td]:!bg-emerald-950/40'
                  : overall === 'near'
                    ? 'bg-amber-500/10 dark:bg-amber-950/40 [&>td]:!bg-amber-500/10 dark:[&>td]:!bg-amber-950/40'
                    : 'bg-rose-500/10 dark:bg-rose-950/40 [&>td]:!bg-rose-500/10 dark:[&>td]:!bg-rose-950/40';
              return `cursor-pointer transition-colors font-bold ${colorBg}`;
            }}
          />
        </div>
      ) : (
        /* Alternate View: Enhanced Grid with Image 2 style badges */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
          {filteredStaff.length === 0 ? (
            <div className="col-span-full py-6 text-center text-xs text-slate-400">
              Không tìm thấy nhân viên nào phù hợp
            </div>
          ) : (
            filteredStaff.map((staff) => {
              const isSelected = staff.id === selectedStaffId;
              const overallStatus = getStaffOverallStatus(staff);
              const tipPct = getStaffTipPercent(staff);
              const fixPct = Number(((staff.fixRate || 0) * 100).toFixed(1));
              const audits = getQaAuditsCount(staff);
              const hiPct = Math.round((staff.happinessIndex || 0.75) * 100);
              const balance = getBananaBalance(staff);

              return (
                <div
                  key={staff.id}
                  onClick={() => onSelectStaff(staff.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all duration-150 flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? overallStatus === 'passed'
                        ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-500/70 shadow-xs ring-2 ring-emerald-400/30'
                        : overallStatus === 'near'
                          ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500/70 shadow-xs ring-2 ring-amber-400/30'
                          : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-400 dark:border-rose-500/70 shadow-xs ring-2 ring-rose-400/30'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-500/40 hover:bg-rose-50/60 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative shrink-0">
                        <Avatar
                          src={staff.avatarUrl || undefined}
                          className={`bg-gradient-to-tr from-rose-400 to-amber-300 text-white font-bold text-xs ring-2 transition-all ${
                            isSelected
                              ? overallStatus === 'passed'
                                ? 'ring-emerald-500 shadow-sm shadow-emerald-500/20'
                                : overallStatus === 'near'
                                  ? 'ring-amber-500 shadow-sm shadow-amber-500/20'
                                  : 'ring-rose-500 shadow-sm shadow-rose-500/20'
                              : 'ring-transparent'
                          }`}
                          size={32}
                        >
                          {staff.displayName.slice(0, 1).toUpperCase()}
                        </Avatar>
                        {isSelected && (
                          <span
                            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black ring-1 shadow-xs ${
                              overallStatus === 'passed'
                                ? 'bg-emerald-500 text-white ring-white dark:ring-slate-900'
                                : overallStatus === 'near'
                                  ? 'bg-amber-500 text-white ring-white dark:ring-slate-900'
                                  : 'bg-rose-500 text-white ring-white dark:ring-slate-900'
                            }`}
                            title={`Đang chọn · ${getStatusLabel(overallStatus)}`}
                          >
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate"
                          title={staff.displayName}
                        >
                          {staff.displayName}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                          <span>@{staff.username.split('@')[0]}</span>
                          {staff.branchName && (
                            <>
                              <span>·</span>
                              <span className="text-slate-500 dark:text-slate-400 font-medium">{staff.branchName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {renderRoleDropdown(staff, true)}
                  </div>

                  {/* 6 Indicator Badges */}
                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 text-[10px]">
                    <div
                      className={`flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-full border tabular-nums font-bold ${getStatusBadgeClass(
                        getOrdersStatus(staff.ordersCount || 0)
                      )}`}
                    >
                      <Eye className="w-2.5 h-2.5" />
                      <span>{staff.ordersCount || 0}</span>
                    </div>
                    <div
                      className={`flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-full border tabular-nums font-bold ${getStatusBadgeClass(
                        getFixStatus(staff.fixRate || 0)
                      )}`}
                    >
                      <Bug className="w-2.5 h-2.5" />
                      <span>{fixPct}%</span>
                    </div>
                    <div
                      className={`flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-full border tabular-nums font-bold ${getStatusBadgeClass(
                        getTipStatus(staff)
                      )}`}
                    >
                      <HandCoins className="w-2.5 h-2.5" />
                      <span>{tipPct}%</span>
                    </div>
                    <div
                      className={`flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-full border tabular-nums font-bold ${getStatusBadgeClass(
                        getQaStatus(staff)
                      )}`}
                    >
                      <ShieldCheck className="w-2.5 h-2.5" />
                      <span>{audits}/4</span>
                    </div>
                    <div
                      className={`flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-full border tabular-nums font-bold ${getStatusBadgeClass(
                        getHiStatus(staff.happinessIndex || 0.75)
                      )}`}
                    >
                      <Heart className="w-2.5 h-2.5" />
                      <span>{hiPct}%</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenBananaDrawer?.(staff.id, 'CHECKIN');
                      }}
                      className={`flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-full border tabular-nums font-bold hover:scale-105 active:scale-95 transition-transform cursor-pointer ${getStatusBadgeClass(
                        getBananaCountStatus(staff.bananaCount || 0)
                      )}`}
                      title="Bấm để xem danh sách Chuối Check-in"
                    >
                      <Banana className="w-2.5 h-2.5" />
                      <span>{staff.bananaCount || 0}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[10px]">
                    <span className="text-slate-400">Ví chuối:</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenBananaDrawer?.(staff.id, 'ALL');
                      }}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-bold tabular-nums hover:scale-105 active:scale-95 transition-transform cursor-pointer ${getStatusBadgeClass(
                        getBananaBalanceStatus(balance)
                      )}`}
                      title="Bấm để xem sao kê ví chuối"
                    >
                      <Wallet className="w-2.5 h-2.5" />
                      <span>{balance.toLocaleString('vi-VN')}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Footer bar showing active selected staff summary */}
      {selectedStaff && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 dark:text-slate-400">Đang chọn:</span>
            <Avatar
              src={selectedStaff.avatarUrl || undefined}
              size={22}
              className="shrink-0 bg-gradient-to-tr from-rose-400 to-amber-300 text-white font-bold text-[10px]"
            >
              {selectedStaff.displayName.slice(0, 1).toUpperCase()}
            </Avatar>
            <span className="font-bold text-slate-800 dark:text-slate-100">{selectedStaff.displayName}</span>
            {getRoleBadge(selectedStaff.careerRole, true)}
            {selectedStaff.branchName && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
                {selectedStaff.branchName}
              </span>
            )}
            <span className="text-slate-400">·</span>
            <span className="tabular-nums text-slate-600 dark:text-slate-300">
              <strong>{selectedStaff.ordersCount}</strong> bộ mi (90 ngày qua)
            </span>
            <span className="text-slate-400">·</span>
            <span className="tabular-nums text-slate-600 dark:text-slate-300">
              Fix: <strong>{(selectedStaff.fixRate * 100).toFixed(1)}%</strong>
            </span>
            <span className="text-slate-400">·</span>
            <span className="tabular-nums text-slate-600 dark:text-slate-300">
              Tip: <strong>{getStaffTipPercent(selectedStaff)}%</strong>
            </span>
            <span className="text-slate-400">·</span>
            <span className="tabular-nums text-slate-600 dark:text-slate-300">
              QA: <strong>{getQaAuditsCount(selectedStaff)}/4</strong>
            </span>
            <span className="text-slate-400">·</span>
            <span className="tabular-nums text-slate-600 dark:text-slate-300">
              HI: <strong>{Math.round((selectedStaff.happinessIndex || 0.75) * 100)}%</strong>
            </span>
            <span className="text-slate-400">·</span>
            <span className="tabular-nums text-slate-600 dark:text-slate-300">
              Chuối yêu thương: <strong>{selectedStaff.bananaCount || 0} 🍌</strong>
            </span>
            <span className="text-slate-400">·</span>
            <span className="tabular-nums text-amber-600 dark:text-amber-400 font-bold">
              Ví: <strong>{getBananaBalance(selectedStaff).toLocaleString('vi-VN')} 🍌</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Action buttons for manual promotion and demotion */}
            {selectedStaff.careerRole === 'KTV' && onSetRole && (
              <Popconfirm
                title="Đưa nhân sự này lên CV · Dịu Dàng?"
                description={`Xác nhận thăng cấp cho ${selectedStaff.displayName} lên CV · Dịu Dàng (khi được FM / Đàn Chị bảo trợ & hoàn thành sát hạch).`}
                okText="Lên CV · Dịu Dàng"
                cancelText="Hủy"
                onConfirm={() => onSetRole(selectedStaff.id, 'CV')}
              >
                <button
                  disabled={actionLoading}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white flex items-center gap-1 shadow-xs transition-all active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Lên CV · Dịu Dàng</span>
                </button>
              </Popconfirm>
            )}

            {selectedStaff.careerRole === 'CV' && onSetRole && (
              <Popconfirm
                title="Đưa nhân sự này lên 🪽 CV · Thanh Lịch?"
                description={`Xác nhận thăng cấp thủ công cho ${selectedStaff.displayName} lên 🪽 CV · Thanh Lịch.`}
                okText="Lên 🪽 CV · Thanh Lịch"
                cancelText="Hủy"
                onConfirm={() => onSetRole(selectedStaff.id, 'CV_PLUS')}
              >
                <button
                  disabled={actionLoading}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 shadow-xs transition-all active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Lên 🪽 CV · Thanh Lịch</span>
                </button>
              </Popconfirm>
            )}

            {selectedStaff.careerRole === 'CV_PLUS' && (
              <>
                {onSetRole && (
                  <Popconfirm
                    title="Đưa nhân sự này lên 🪽 CV 🪽 · Quí Phái?"
                    description={`Xác nhận thăng cấp thủ công cho ${selectedStaff.displayName} lên 🪽 CV 🪽 · Quí Phái.`}
                    okText="Lên 🪽 CV 🪽 · Quí Phái"
                    cancelText="Hủy"
                    onConfirm={() => onSetRole(selectedStaff.id, 'CV_PLUS_PLUS')}
                  >
                    <button
                      disabled={actionLoading}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 shadow-xs transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Lên 🪽 CV 🪽 · Quí Phái</span>
                    </button>
                  </Popconfirm>
                )}
                {onDemote && (
                  <Popconfirm
                    title="Hạ cấp nhân sự về CV · Dịu Dàng?"
                    description={`Chuyển cấp bậc của ${selectedStaff.displayName} về CV · Dịu Dàng.`}
                    okText="Hạ về CV · Dịu Dàng"
                    cancelText="Hủy"
                    okType="danger"
                    onConfirm={() => onDemote(selectedStaff.id, 'CV')}
                  >
                    <button
                      disabled={actionLoading}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <ArrowDownCircle className="w-3.5 h-3.5" />
                      <span>🔻 Hạ về CV · Dịu Dàng</span>
                    </button>
                  </Popconfirm>
                )}
              </>
            )}

            {selectedStaff.careerRole === 'CV_PLUS_PLUS' && onDemote && (
              <Popconfirm
                title="Hạ cấp nhân sự về 🪽 CV · Thanh Lịch?"
                description={`Chuyển cấp bậc của ${selectedStaff.displayName} về 🪽 CV · Thanh Lịch.`}
                okText="Hạ về 🪽 CV · Thanh Lịch"
                cancelText="Hủy"
                okType="danger"
                onConfirm={() => onDemote(selectedStaff.id, 'CV_PLUS')}
              >
                <button
                  disabled={actionLoading}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                >
                  <ArrowDownCircle className="w-3.5 h-3.5" />
                  <span>🔻 Hạ về 🪽 CV · Thanh Lịch</span>
                </button>
              </Popconfirm>
            )}

            {lastSyncedAt && (
              <div className="text-[10px] text-slate-400 tabular-nums ml-1">
                Đồng bộ lúc: {new Date(lastSyncedAt).toLocaleTimeString('vi-VN')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const StaffCareerSelector = React.memo(StaffCareerSelectorComponent);
