'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Input, Tag, theme, Typography, Table, Button, Space, Select, Switch, Tooltip } from 'antd';
import {
  SearchOutlined,
  ClockCircleOutlined,
  LogoutOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Dayjs } from 'dayjs';
import type { CvDisciplineResponse, CvDisciplineStaffRecord, CvDisciplineViolationType } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { MobileRecordList } from '../../../../components/ui';
import CcAvatar from '../../cc/components/CcAvatar';
import CvDisciplineDetailDrawer from './CvDisciplineDetailDrawer';
import { formatStoreCode } from './CvThuNhapTab';
import { useResponsiveTier } from '../../../../hooks/useResponsiveTier';

const { Text } = Typography;

interface CvKyLuatTabProps {
  dateRange: [Dayjs, Dayjs];
  selectedStore: string;
  comparisonMode?: 'month' | 'week' | 'day';
}

export default function CvKyLuatTab({ dateRange, selectedStore = 'ALL' }: CvKyLuatTabProps) {
  const { token } = theme.useToken();
  const tier = useResponsiveTier();
  const isMobile = tier === 'mobile';

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<CvDisciplineResponse | null>(null);
  const [searchText, setSearchText] = useState<string>('');
  const [filterStore, setFilterStore] = useState<string>(selectedStore || 'ALL');
  const [onlyViolations, setOnlyViolations] = useState<boolean>(false);

  // Detail Drawer state
  const [selectedStaff, setSelectedStaff] = useState<CvDisciplineStaffRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [drawerInitialFilter, setDrawerInitialFilter] = useState<CvDisciplineViolationType | 'ALL'>('ALL');

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateFrom = dateRange[0].format('YYYY-MM-DD');
      const dateTo = dateRange[1].format('YYYY-MM-DD');

      const res = await apiClient.kpi.getCvDiscipline({
        dateFrom,
        dateTo,
        store: filterStore !== 'ALL' ? filterStore : undefined,
      });

      if (res) {
        setData(res);
      }
    } catch (err) {
      console.error('Error fetching CV discipline data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange, filterStore]);

  const handleOpenDetail = (
    staff: CvDisciplineStaffRecord,
    initialFilter: CvDisciplineViolationType | 'ALL' = 'ALL'
  ) => {
    setSelectedStaff(staff);
    setDrawerInitialFilter(initialFilter);
    setDrawerOpen(true);
  };

  // Filtered and searched records
  const filteredRecords = useMemo(() => {
    if (!data?.data) return [];
    return data.data.filter((record) => {
      // Store filter
      if (filterStore !== 'ALL' && record.store.toUpperCase() !== filterStore.toUpperCase()) {
        return false;
      }
      // Only violations toggle
      if (onlyViolations && record.totalViolations === 0 && record.finedBananaAmount === 0) {
        return false;
      }
      // Search text
      if (searchText) {
        const query = searchText.toLowerCase().trim();
        const nameMatch = record.staffName.toLowerCase().includes(query);
        const storeMatch = record.store.toLowerCase().includes(query);
        return nameMatch || storeMatch;
      }
      return true;
    });
  }, [data, filterStore, onlyViolations, searchText]);

  const summary = data?.summary || {
    totalLateRecords: 0,
    totalLateMinutes: 0,
    totalEarlyRecords: 0,
    totalEarlyMinutes: 0,
    totalUrgentOffs: 0,
    totalOtherPenalties: 0,
    totalFinedBananas: 0,
    totalStaffWithViolations: 0,
    totalStaffCount: 0,
  };

  return (
    <div className="space-y-4">
      {/* 4 Summary StatCards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Đi trễ */}
        <div
          className="p-3 sm:p-4 rounded-2xl border relative overflow-hidden transition-all shadow-sm"
          style={{
            background: token.colorBgContainer,
            borderColor: token.colorBorderSecondary,
          }}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <ClockCircleOutlined className="text-amber-500 text-sm" /> Đi Trễ
            </span>
            <Tag color="warning" className="!mr-0 !rounded-full !text-[10px]">
              Chấm công
            </Tag>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black tabular-nums text-slate-900 dark:text-slate-100">
              {summary.totalLateRecords}
            </span>
            <span className="text-xs text-slate-500 font-medium">lượt</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 tabular-nums font-semibold">
            Tổng trễ: {summary.totalLateMinutes} phút
          </div>
        </div>

        {/* Về sớm */}
        <div
          className="p-3 sm:p-4 rounded-2xl border relative overflow-hidden transition-all shadow-sm"
          style={{
            background: token.colorBgContainer,
            borderColor: token.colorBorderSecondary,
          }}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <LogoutOutlined className="text-orange-500 text-sm" /> Về Sớm
            </span>
            <Tag color="orange" className="!mr-0 !rounded-full !text-[10px]">
              Chấm công
            </Tag>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black tabular-nums text-slate-900 dark:text-slate-100">
              {summary.totalEarlyRecords}
            </span>
            <span className="text-xs text-slate-500 font-medium">lượt</span>
          </div>
          <div className="mt-1 text-[11px] text-orange-600 dark:text-orange-400 tabular-nums font-semibold">
            Tổng sớm: {summary.totalEarlyMinutes} phút
          </div>
        </div>

        {/* Off gấp */}
        <div
          className="p-3 sm:p-4 rounded-2xl border relative overflow-hidden transition-all shadow-sm"
          style={{
            background: token.colorBgContainer,
            borderColor: token.colorBorderSecondary,
          }}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <ThunderboltOutlined className="text-rose-500 text-sm" /> Off Gấp
            </span>
            <Tag color="error" className="!mr-0 !rounded-full !text-[10px]">
              Đột xuất
            </Tag>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black tabular-nums text-slate-900 dark:text-slate-100">
              {summary.totalUrgentOffs}
            </span>
            <span className="text-xs text-slate-500 font-medium">đơn</span>
          </div>
          <div className="mt-1 text-[11px] text-rose-500/80 font-medium">Nghỉ khẩn cấp / không báo trước</div>
        </div>

        {/* Chuối phạt */}
        <div
          className="p-3 sm:p-4 rounded-2xl border relative overflow-hidden transition-all shadow-sm bg-gradient-to-br from-rose-500/[0.04] to-transparent dark:from-rose-950/20"
          style={{
            borderColor: summary.totalFinedBananas > 0 ? 'rgba(239, 68, 68, 0.4)' : token.colorBorderSecondary,
          }}
        >
          <div className="flex items-center justify-between text-rose-500 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <span>🍌</span> Chuối Phạt
            </span>
            <Tag color="error" className="!mr-0 !rounded-full !text-[10px] !font-bold">
              Phạt nề nếp
            </Tag>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black tabular-nums text-rose-600 dark:text-rose-400">
              -{summary.totalFinedBananas}
            </span>
            <span className="text-xs text-rose-500 font-medium">chuối</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums font-medium">
            {summary.totalStaffWithViolations}/{summary.totalStaffCount} CV có vi phạm
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-500/5 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Input
            placeholder="Tìm theo tên CV hoặc Salon..."
            prefix={<SearchOutlined className="text-slate-400" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            className="rounded-xl max-w-xs"
          />
          <Select
            value={filterStore}
            onChange={setFilterStore}
            className="w-28 rounded-xl"
            options={[
              { label: 'Tất cả Salon', value: 'ALL' },
              { label: 'PXL', value: 'PXL' },
              { label: 'Q1', value: 'Q1' },
              { label: 'Q7', value: 'Q7' },
              { label: 'EP', value: 'EP' },
              { label: 'DT', value: 'DT' },
            ]}
          />
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <Switch size="small" checked={onlyViolations} onChange={setOnlyViolations} />
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium select-none">
              Chỉ hiện CV có vi phạm
            </span>
          </div>

          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={fetchData}
            type="text"
            className="!text-slate-500 hover:!text-slate-900"
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* Main Display: iPhone Mobile Card View vs Desktop Table */}
      {isMobile ? (
        <MobileRecordList
          records={filteredRecords}
          loading={loading}
          getKey={(record) => String(record.staffId)}
          emptyDescription="Không có dữ liệu kỷ luật Chuyên Viên"
          getRecordClassName={(record) =>
            record.finedBananaAmount > 0
              ? '!border-rose-500/40 !bg-gradient-to-b !from-rose-500/[0.03] !to-transparent dark:!from-slate-900 dark:!to-slate-900/95 !rounded-2xl !p-3.5 shadow-sm'
              : record.totalViolations > 0
                ? '!border-amber-500/30 !bg-white dark:!bg-slate-900/80 !rounded-2xl !p-3.5 shadow-sm'
                : '!border-slate-200 dark:!border-slate-800 !bg-white dark:!bg-slate-900/80 !rounded-2xl !p-3.5 shadow-sm opacity-90'
          }
          renderRecord={(record, index) => (
            <div className="min-w-0 cursor-pointer" onClick={() => handleOpenDetail(record, 'ALL')}>
              {/* Header: Rank + Avatar + Name + Store */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-5 shrink-0 text-center text-xs font-bold tabular-nums text-slate-400">
                    {index + 1}
                  </span>
                  <div className="shrink-0">
                    <CcAvatar
                      name={record.staffName}
                      src={record.avatar}
                      size={36}
                      className={
                        record.finedBananaAmount > 0
                          ? 'ring-2 ring-rose-400/80 rounded-full'
                          : 'border border-slate-300 dark:border-slate-700 rounded-full'
                      }
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{record.staffName}</span>
                      {record.isCvPlus && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 inline-flex items-center">
                          CV🪶
                        </span>
                      )}
                      <Tag className="!mr-0 !text-[10px] !font-mono !px-1.5 !rounded-full">
                        {formatStoreCode(record.store)}
                      </Tag>
                    </div>
                  </div>
                </div>

                {/* Banana fine total badge */}
                <div className="shrink-0 text-right">
                  {record.finedBananaAmount > 0 ? (
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40 tabular-nums">
                      <span>🍌</span>
                      <span>-{record.finedBananaAmount}</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-slate-400">
                      <span>0 🍌</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4 Interactive Metric Chips */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {/* Trễ */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDetail(record, 'LATE');
                  }}
                  className={`flex items-center justify-between p-2 rounded-xl text-left border transition-all ${
                    record.lateCount > 0
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
                      : 'bg-slate-500/5 border-transparent text-slate-400'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <ClockCircleOutlined /> Trễ
                  </span>
                  <span className="font-bold tabular-nums">
                    {record.lateCount > 0 ? `${record.lateCount} (${record.lateMinutes}p)` : '0'}
                  </span>
                </button>

                {/* Sớm */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDetail(record, 'EARLY');
                  }}
                  className={`flex items-center justify-between p-2 rounded-xl text-left border transition-all ${
                    record.earlyCount > 0
                      ? 'bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-300 hover:bg-orange-500/20'
                      : 'bg-slate-500/5 border-transparent text-slate-400'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <LogoutOutlined /> Sớm
                  </span>
                  <span className="font-bold tabular-nums">
                    {record.earlyCount > 0 ? `${record.earlyCount} (${record.earlyMinutes}p)` : '0'}
                  </span>
                </button>

                {/* Off gấp */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDetail(record, 'URGENT_OFF');
                  }}
                  className={`flex items-center justify-between p-2 rounded-xl text-left border transition-all ${
                    record.urgentOffCount > 0
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20'
                      : 'bg-slate-500/5 border-transparent text-slate-400'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <ThunderboltOutlined /> Off gấp
                  </span>
                  <span className="font-bold tabular-nums">
                    {record.urgentOffCount > 0 ? `${record.urgentOffCount} đơn` : '0'}
                  </span>
                </button>

                {/* Phạt khác / Chi tiết */}
                <div className="flex items-center justify-between p-2 rounded-xl text-left bg-slate-500/5 text-slate-500 dark:text-slate-400">
                  <span>Tổng vi phạm</span>
                  <span className="font-bold tabular-nums text-slate-900 dark:text-slate-200">
                    {record.totalViolations} vụ ➔
                  </span>
                </div>
              </div>
            </div>
          )}
        />
      ) : (
        /* Desktop Table View */
        <Card variant="outlined" styles={{ body: { padding: 0 } }} className="rounded-2xl overflow-hidden shadow-sm">
          <Table<CvDisciplineStaffRecord>
            dataSource={filteredRecords}
            rowKey={(r) => String(r.staffId)}
            loading={loading}
            pagination={{ pageSize: 20, showSizeChanger: true }}
            onRow={(record) => ({
              onClick: () => handleOpenDetail(record, 'ALL'),
              className: 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50',
            })}
            columns={[
              {
                title: '#',
                key: 'index',
                width: 50,
                align: 'center',
                render: (_, __, idx) => (
                  <span className="text-xs font-bold text-slate-400 tabular-nums">{idx + 1}</span>
                ),
              },
              {
                title: 'Chuyên Viên',
                key: 'staff',
                render: (_, record) => (
                  <div className="flex items-center gap-2.5">
                    <CcAvatar name={record.staffName} src={record.avatar} size={34} />
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{record.staffName}</span>
                        {record.isCvPlus && (
                          <Tag color="gold" className="!mr-0 !text-[10px] !font-extrabold !px-1.5 !rounded-full">
                            CV🪶
                          </Tag>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">ID: {record.legacyUserId}</div>
                    </div>
                  </div>
                ),
              },
              {
                title: 'Salon',
                dataIndex: 'store',
                key: 'store',
                width: 90,
                render: (val) => <Tag className="!font-mono !font-semibold">{formatStoreCode(val)}</Tag>,
              },
              {
                title: '⏰ Đi Trễ',
                key: 'late',
                align: 'center',
                render: (_, record) =>
                  record.lateCount > 0 ? (
                    <Tag color="warning" className="!font-semibold !rounded-full !px-2.5">
                      {record.lateCount} lần ({record.lateMinutes}p)
                    </Tag>
                  ) : (
                    <span className="text-slate-400 text-xs">0</span>
                  ),
              },
              {
                title: '🚪 Về Sớm',
                key: 'early',
                align: 'center',
                render: (_, record) =>
                  record.earlyCount > 0 ? (
                    <Tag color="orange" className="!font-semibold !rounded-full !px-2.5">
                      {record.earlyCount} lần ({record.earlyMinutes}p)
                    </Tag>
                  ) : (
                    <span className="text-slate-400 text-xs">0</span>
                  ),
              },
              {
                title: '⚡ Off Gấp',
                key: 'urgentOff',
                align: 'center',
                render: (_, record) =>
                  record.urgentOffCount > 0 ? (
                    <Tag color="error" className="!font-semibold !rounded-full !px-2.5">
                      {record.urgentOffCount} đơn
                    </Tag>
                  ) : (
                    <span className="text-slate-400 text-xs">0</span>
                  ),
              },
              {
                title: '🍌 Chuối Phạt',
                key: 'banana',
                align: 'center',
                render: (_, record) =>
                  record.finedBananaAmount > 0 ? (
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 tabular-nums">
                      <span>🍌</span>
                      <span>-{record.finedBananaAmount}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-xs font-mono">0</span>
                  ),
              },
              {
                title: 'Thao tác',
                key: 'action',
                width: 110,
                align: 'center',
                render: (_, record) => (
                  <Button
                    type="link"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDetail(record, 'ALL');
                    }}
                  >
                    Chi tiết
                  </Button>
                ),
              },
            ]}
          />
        </Card>
      )}

      {/* Detail Drawer */}
      <CvDisciplineDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        staff={selectedStaff}
        initialFilter={drawerInitialFilter}
      />
    </div>
  );
}
