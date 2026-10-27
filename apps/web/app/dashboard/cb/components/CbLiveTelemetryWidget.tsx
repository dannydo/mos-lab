'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Eye,
  Layers,
  Radio,
  RefreshCw,
  Sliders,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Form, InputNumber, Select, Progress, message, Tooltip } from 'antd';
import { useTheme } from '../../../../context/ThemeContext';
import { apiClient } from '../../../../lib/api-client';
import {
  CbDailyRecord,
  CbDrilldownItem,
  CbLiveTelemetryResponse,
  CbTargetConfig,
} from '@mos-lab/shared';
import { IconButton, AdaptiveDrawer } from '../../../../components/ui';

function formatVnd(val?: number): string {
  if (val === undefined || val === null || isNaN(val)) return '0 đ';
  return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' đ';
}

function formatMillions(val?: number, decimals = 1): string {
  if (val === undefined || val === null || isNaN(val)) return '0M';
  const m = val / 1_000_000;
  if (m === 0) return '0M';
  if (Number.isInteger(m)) return `${m}M`;
  return `${m.toFixed(decimals).replace('.', ',')}M`;
}

export interface CbLiveTelemetryWidgetProps {
  autoRefreshIntervalSec?: number;
  showCardWrapper?: boolean;
}

export default function CbLiveTelemetryWidget({
  autoRefreshIntervalSec = 20,
  showCardWrapper = true,
}: CbLiveTelemetryWidgetProps = {}) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [data, setData] = useState<CbLiveTelemetryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('2026-11');
  const [storeScope, setStoreScope] = useState<'DE_THAM_ESTELLA' | 'DE_THAM' | 'ESTELLA' | 'ALL'>('DE_THAM_ESTELLA');
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Drawer Cấu hình Mục tiêu
  const [targetDrawerOpen, setTargetDrawerOpen] = useState(false);
  const [targetSaving, setTargetSaving] = useState(false);
  const [targetForm] = Form.useForm();

  // Drawer / Modal Drilldown
  const [drilldownDrawerOpen, setDrilldownDrawerOpen] = useState(false);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [drilldownItems, setDrilldownItems] = useState<CbDrilldownItem[]>([]);
  const [drilldownTitle, setDrilldownTitle] = useState('');

  // Chế độ xem bảng ngày: 7 ngày gần nhất hoặc Cả tháng
  const [dailyViewMode, setDailyViewMode] = useState<'RECENT_7' | 'ALL_MONTH'>('RECENT_7');

  const fetchTelemetry = useCallback(async () => {
    try {
      const res = await apiClient.kpi.getCbLiveTelemetry({
        month: selectedMonth,
        storeScope,
      });
      setData(res);
      setError(null);
      setSecondsAgo(0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể kết nối đường truyền Live Streaming.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, storeScope]);

  // Initial load and manual fetch
  useEffect(() => {
    setLoading(true);
    fetchTelemetry();
  }, [fetchTelemetry]);

  // Auto-polling when live streaming is enabled
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      fetchTelemetry();
    }, 20000);
    return () => clearInterval(interval);
  }, [isLive, fetchTelemetry]);

  // Seconds counter
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle open Target Drawer
  const handleOpenTargetConfig = () => {
    if (data?.targets) {
      targetForm.setFieldsValue({
        comboSalesTarget: data.targets.comboSalesTarget,
        productSalesTarget: data.targets.productSalesTarget,
        greenFunnelDoneTarget: data.targets.greenFunnelDoneTarget,
        greenFunnelBookTarget: data.targets.greenFunnelBookTarget,
        greenFunnelConversionTarget: data.targets.greenFunnelConversionTarget,
        packageUsageDoneTarget: data.targets.packageUsageDoneTarget,
        repeatComboSalesTarget: data.targets.repeatComboSalesTarget,
        aovPackageUsageTarget: data.targets.aovPackageUsageTarget,
      });
    }
    setTargetDrawerOpen(true);
  };

  // Handle save Target Config
  const handleSaveTargetConfig = async (values: Partial<CbTargetConfig>) => {
    setTargetSaving(true);
    try {
      await apiClient.kpi.saveCbTargetConfig({
        ...values,
        month: selectedMonth,
        storeScope,
      });
      message.success(`Đã cập nhật mục tiêu tháng ${selectedMonth}!`);
      setTargetDrawerOpen(false);
      fetchTelemetry();
    } catch {
      message.error('Không thể lưu cấu hình mục tiêu.');
    } finally {
      setTargetSaving(false);
    }
  };

  // Handle Drilldown
  const handleOpenDrilldown = async (
    category: 'COMBO' | 'PRODUCT' | 'GREEN_FUNNEL' | 'PACKAGE_USAGE',
    title: string
  ) => {
    setDrilldownTitle(title);
    setDrilldownDrawerOpen(true);
    setDrilldownLoading(true);
    try {
      const items = await apiClient.kpi.getCbDrilldown({
        category,
        month: selectedMonth,
        storeScope,
        limit: 50,
      });
      setDrilldownItems(items);
    } catch {
      message.error('Không thể tải danh sách chi tiết.');
    } finally {
      setDrilldownLoading(false);
    }
  };

  // Lọc danh sách ngày hiển thị
  let displayedDailyRecords: CbDailyRecord[] = [];
  if (data?.daily) {
    if (dailyViewMode === 'ALL_MONTH') {
      displayedDailyRecords = data.daily;
    } else {
      const reversed = [...data.daily].reverse();
      const activeIndex = reversed.findIndex((d) => d.totalSalesNet > 0);
      const startIndex = activeIndex >= 0 ? activeIndex : 0;
      const slice = reversed.slice(startIndex, startIndex + 7).reverse();
      displayedDailyRecords = slice.length > 0 ? slice : data.daily.slice(0, 7);
    }
  }

  // Dữ liệu cho biểu đồ lũy kế
  let chartPoints = { actualPath: '', planPath: '', maxVal: 560_000_000, points: [] as { x: number; y: number; val: number; day: string }[] };
  if (data?.daily) {
    const maxVal = Math.max(data.targets?.totalSalesTarget || 560_000_000, (data.revenue?.totalSalesNet || 0) * 1.1);
    const width = 420;
    const height = 150;
    const padding = 20;

    const daysCount = data.daily.length;
    const xStep = (width - padding * 2) / Math.max(1, daysCount - 1);

    // Kế hoạch line
    const planPath = `M ${padding} ${height - padding} L ${width - padding} ${
      height - padding - ((data.targets?.totalSalesTarget || 560_000_000) / maxVal) * (height - padding * 2)
    }`;

    // Thực tế line
    const actualPoints: { x: number; y: number; val: number; day: string }[] = [];
    let path = '';
    data.daily.forEach((d, idx) => {
      const x = padding + idx * xStep;
      const y = height - padding - (d.cumulativeSales / maxVal) * (height - padding * 2);
      if (idx === 0) {
        path += `M ${x} ${y}`;
      } else {
        path += ` L ${x} ${y}`;
      }
      actualPoints.push({ x, y, val: d.cumulativeSales, day: d.displayDate });
    });

    chartPoints = { actualPath: path, planPath, maxVal, points: actualPoints };
  }

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <p className="text-sm font-medium">Đang kết nối đường truyền Live Streaming 100% từ MySQL core...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 bg-red-950/40 border border-red-800/60 rounded-2xl text-red-300">
        <div className="flex items-center gap-2 mb-2 font-semibold text-red-200">
          <AlertCircle className="w-5 h-5" />
          Lỗi kết nối đường truyền Live Telemetry
        </div>
        <p className="text-xs mb-4">{error}</p>
        <button
          onClick={fetchTelemetry}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors"
        >
          Thử kết nối lại
        </button>
      </div>
    );
  }

  if (!data) return null;

  const targets = data.targets;
  const isConfigured = targets.configured;
  const pacingStatus = data.meta.pacingStatus;

  return (
    <div className="space-y-4">
      {/* 1. HEADER CONTROLLER BAR (Mockup Ảnh 239) */}
      <div className="bg-slate-900/90 dark:bg-black/80 border border-amber-500/30 rounded-2xl p-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500">
                $CB SALES COMMAND BOARD
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider ${
                  isLive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                {isLive ? 'LIVE STREAMING' : 'TẠM DỪNG'}
              </span>
            </div>
            <div className="text-xs text-amber-200/70 mt-1 flex flex-wrap items-center gap-2 font-mono">
              <span>
                {selectedMonth === '2026-11' ? 'THÁNG 11/2026' : selectedMonth === '2026-10' ? 'THÁNG 10/2026 (DỮ LIỆU NỀN)' : selectedMonth}
              </span>
              <span>•</span>
              <span>
                {storeScope === 'DE_THAM_ESTELLA'
                  ? 'ĐỀ THÁM + ESTELLA'
                  : storeScope === 'DE_THAM'
                  ? 'ĐỀ THÁM'
                  : storeScope === 'ESTELLA'
                  ? 'ESTELLA'
                  : 'TẤT CẢ CHI NHÁNH'}
              </span>
              <span>•</span>
              <span>CHƯA VAT</span>
              <span>•</span>
              <span className="text-slate-400">Đồng bộ: {secondsAgo}s trước</span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            <Select
              value={selectedMonth}
              onChange={setSelectedMonth}
              className="w-36 text-xs"
              options={[
                { value: '2026-10', label: 'Tháng 10/2026 (Nền)' },
                { value: '2026-11', label: 'Tháng 11/2026 ($CB)' },
                { value: '2026-12', label: 'Tháng 12/2026' },
              ]}
            />
            <Select
              value={storeScope}
              onChange={setStoreScope}
              className="w-44 text-xs"
              options={[
                { value: 'DE_THAM_ESTELLA', label: 'Đề Thám + Estella' },
                { value: 'DE_THAM', label: 'Đề Thám (ID 6)' },
                { value: 'ESTELLA', label: 'Estella (ID 16)' },
                { value: 'ALL', label: 'Toàn hệ thống' },
              ]}
            />
            <IconButton
              label="Cấu hình mục tiêu"
              icon={Sliders}
              tone="primary"
              onClick={handleOpenTargetConfig}
              className="!text-amber-400 !border-amber-500/40 hover:!border-amber-400"
            />
            <IconButton
              label={isLive ? 'Tạm dừng Live' : 'Bật Live Streaming'}
              icon={isLive ? Radio : RefreshCw}
              tone="default"
              onClick={() => setIsLive(!isLive)}
              className={isLive ? '!text-emerald-400 !border-emerald-500/40' : '!text-slate-400'}
            />
          </div>
        </div>
      </div>

      {/* 2. HÀNG 1: 4 TOP CARDS (Mockup Ảnh 239) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* DOANH SỐ GÓI */}
        <div
          onClick={() => handleOpenDrilldown('COMBO', 'Danh sách Đơn Bán Gói (Chưa VAT)')}
          className="bg-slate-900/90 dark:bg-black/75 border border-slate-800 hover:border-blue-500/60 transition-all rounded-2xl p-4 cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
            <span className="tracking-wide text-slate-300">DOANH SỐ GÓI</span>
            <span className="text-blue-400 group-hover:text-blue-300 flex items-center gap-1 text-[11px]">
              Chi tiết <Eye className="w-3 h-3" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black text-blue-400 tracking-tight font-mono">
              {formatMillions(data.revenue.comboSalesNet)}
            </span>
            <span className="text-slate-500 text-sm font-semibold">
              / {isConfigured ? formatMillions(targets.comboSalesTarget) : '---'}
            </span>
          </div>
          <div className="text-xs text-slate-400 font-medium">
            {isConfigured ? (
              <span className="text-blue-300 font-semibold">{data.revenue.comboAttainmentPercent}% mục tiêu tháng</span>
            ) : (
              <span className="text-slate-500 italic">Chưa cấu hình mục tiêu</span>
            )}
            <span className="text-slate-500 ml-2">({data.revenue.comboOrderCount} đơn)</span>
          </div>
        </div>

        {/* SẢN PHẨM */}
        <div
          onClick={() => handleOpenDrilldown('PRODUCT', 'Danh sách Đơn Bán Sản Phẩm (Chưa VAT)')}
          className="bg-slate-900/90 dark:bg-black/75 border border-slate-800 hover:border-purple-500/60 transition-all rounded-2xl p-4 cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
            <span className="tracking-wide text-slate-300">SẢN PHẨM</span>
            <span className="text-purple-400 group-hover:text-purple-300 flex items-center gap-1 text-[11px]">
              Chi tiết <Eye className="w-3 h-3" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black text-purple-400 tracking-tight font-mono">
              {formatMillions(data.revenue.productSalesNet)}
            </span>
            <span className="text-slate-500 text-sm font-semibold">
              / {isConfigured ? formatMillions(targets.productSalesTarget) : '---'}
            </span>
          </div>
          <div className="text-xs text-slate-400 font-medium">
            {isConfigured ? (
              <span className="text-purple-300 font-semibold">{data.revenue.productAttainmentPercent}% mục tiêu tháng</span>
            ) : (
              <span className="text-slate-500 italic">Chưa cấu hình</span>
            )}
            <span className="text-slate-500 ml-2">({data.revenue.productOrderCount} đơn)</span>
          </div>
        </div>

        {/* TỔNG DOANH SỐ */}
        <div className="bg-slate-900/90 dark:bg-black/75 border border-amber-500/40 rounded-2xl p-4 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
            <span className="tracking-wide text-amber-300">TỔNG DOANH SỐ</span>
            <span className="text-[11px] text-amber-400/80 font-mono">Gói + SP</span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black text-amber-300 tracking-tight font-mono">
              {formatMillions(data.revenue.totalSalesNet)}
            </span>
            <span className="text-slate-500 text-sm font-semibold">
              / {isConfigured ? formatMillions(targets.totalSalesTarget) : '---'}
            </span>
          </div>
          <div className="text-xs text-slate-400 font-medium">
            {isConfigured ? (
              <span className="text-amber-300 font-semibold">{data.revenue.totalAttainmentPercent}% mục tiêu</span>
            ) : (
              <span className="text-slate-500 italic">Chưa cấu hình</span>
            )}
            <span className="text-slate-500 ml-2">({formatVnd(data.revenue.totalSalesNet)})</span>
          </div>
        </div>

        {/* NHỊP KẾ HOẠCH */}
        <div className="bg-slate-900/90 dark:bg-black/75 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
            <span className="tracking-wide text-slate-300">NHỊP KẾ HOẠCH</span>
            <span className="text-[11px] text-emerald-400/80 font-mono">30 ngày</span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black text-emerald-400 tracking-tight font-mono">
              {isConfigured ? formatMillions(targets.dailyPlanPace) : '---'}
            </span>
            <span className="text-slate-500 text-sm font-semibold">/ ngày</span>
          </div>
          <div className="text-xs text-slate-400 font-medium">
            {isConfigured ? (
              <span>{formatMillions(targets.totalSalesTarget)} ÷ {targets.daysInMonth} ngày</span>
            ) : (
              <span className="text-slate-500 italic">Chưa cấu hình nhịp</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. HÀNG 2: NHỊP DOANH SỐ LŨY KẾ + VÒNG XANH + DÙNG GÓI (Mockup Ảnh 239) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Cột 1: NHỊP DOANH SỐ LŨY KẾ (Run-rate Chart) (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 dark:bg-black/75 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                Nhịp Doanh Số Lũy Kế
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-3 h-0.5 bg-amber-400 inline-block" /> Thực tế
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-3 h-0.5 bg-slate-500 border-b border-dashed inline-block" /> Kế hoạch
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Triệu đồng • Gói + Sản phẩm • Lũy kế đến ngày hiện tại
            </p>

            {/* SVG Cumulative Run-Rate Chart */}
            <div className="relative w-full h-40 bg-slate-950/60 rounded-xl p-2 border border-slate-800/80">
              <svg className="w-full h-full" viewBox="0 0 420 150">
                {/* Horizontal guide lines */}
                {[0, 140, 280, 420, 560].map((v) => {
                  const y = 130 - (v / 560) * 110;
                  return (
                    <g key={v}>
                      <line x1="20" y1={y} x2="400" y2={y} stroke="currentColor" className="text-slate-800" strokeDasharray="2 2" strokeWidth="0.8" />
                      <text x="5" y={y + 3} fill="currentColor" className="text-slate-500" fontSize="8" fontFamily="monospace">
                        {v}
                      </text>
                    </g>
                  );
                })}

                {/* Plan target line */}
                {isConfigured && (
                  <line x1="20" y1="130" x2="400" y2="20" stroke="currentColor" className="text-slate-600" strokeDasharray="3 3" strokeWidth="1.5" />
                )}

                {/* Actual cumulative line */}
                <path d={chartPoints.actualPath} fill="none" stroke="currentColor" className="text-amber-500" strokeWidth="2.5" strokeLinecap="round" />

                {/* Latest actual point dot */}
                {chartPoints.points.length > 0 && (
                  <g>
                    <circle
                      cx={chartPoints.points[chartPoints.points.length - 1].x}
                      cy={chartPoints.points[chartPoints.points.length - 1].y}
                      r="4"
                      fill="currentColor"
                      stroke="currentColor"
                      className="text-amber-500 stroke-amber-100"
                      strokeWidth="2"
                    />
                  </g>
                )}
              </svg>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Hiện tại: <strong className="text-amber-400">{formatMillions(data.revenue.totalSalesNet)}</strong></span>
            <span>Mục tiêu: <strong className="text-slate-300">{formatMillions(targets.totalSalesTarget)}</strong></span>
          </div>
        </div>

        {/* Cột 2: ĐỘNG CƠ VÒNG XANH (Done từ khách lẻ) (3.5 cols) */}
        <div
          onClick={() => handleOpenDrilldown('GREEN_FUNNEL', 'Lượt Done Vòng Xanh')}
          className="lg:col-span-3 bg-slate-900/90 dark:bg-black/75 border border-slate-800 hover:border-emerald-500/50 transition-all rounded-2xl p-4 shadow-lg cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-400" />
                Vòng Xanh
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Vạch: 10,0%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">Done từ khách lẻ</p>

            <div className="flex items-baseline gap-2 mb-2 font-mono">
              <span className="text-3xl font-black text-emerald-400">
                {data.greenFunnel.greenVisitsCount}
              </span>
              <span className="text-slate-500 text-sm font-semibold">
                / {data.greenFunnel.greenVisitsTarget} Done
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <Progress
                percent={Math.min(100, data.greenFunnel.progressPercent)}
                showInfo={false}
                strokeColor="rgb(16 185 129)"
                trailColor="rgb(30 41 59)"
                size="small"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>• Đơn gói chốt:</span>
                <strong className="text-emerald-400 font-mono">{data.greenFunnel.greenComboOrdersCount} đơn</strong>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>• Tỷ lệ chốt Live:</span>
                <strong className="text-emerald-400 font-mono">{data.greenFunnel.closingRatePercent}%</strong>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Kế hoạch:</span>
            <span className="font-mono text-slate-300">780 Book → 540 Done</span>
          </div>
        </div>

        {/* Cột 3: KHÁCH ĐANG DÙNG GÓI (Done có trừ lượt gói) (3.5 cols) */}
        <div
          onClick={() => handleOpenDrilldown('PACKAGE_USAGE', 'Lượt Done Khách Dùng Gói (Trừ Số Dư)')}
          className="lg:col-span-4 bg-slate-900/90 dark:bg-black/75 border border-slate-800 hover:border-purple-500/50 transition-all rounded-2xl p-4 shadow-lg cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-400" />
                Khách Đang Dùng Gói
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/30">
                Mốc: 1.000 Done
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">Done có trừ lượt gói</p>

            <div className="flex items-baseline gap-2 mb-2 font-mono">
              <span className="text-3xl font-black text-purple-400">
                {data.retention.balanceDeductionVisitsCount}
              </span>
              <span className="text-slate-500 text-sm font-semibold">
                / {data.retention.targetVisits} Done
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <Progress
                percent={Math.min(100, data.retention.progressPercent)}
                showInfo={false}
                strokeColor="rgb(168 85 247)"
                trailColor="rgb(30 41 59)"
                size="small"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>• Đơn mua tiếp:</span>
                <strong className="text-purple-400 font-mono">{data.retention.repurchaseOrdersCount} đơn</strong>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>• Doanh số gói:</span>
                <strong className="text-purple-400 font-mono">
                  {formatMillions(data.retention.repurchaseComboSalesNet)} / {formatMillions(targets.repeatComboSalesTarget || 349_000_000)}
                </strong>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Renew / Upgrade:</span>
            <span className="font-mono text-slate-300">AOV kế hoạch 5,55M</span>
          </div>
        </div>
      </div>

      {/* 4. HÀNG 3: PHÂN TÍCH THEO NGÀY + DỰ BÁO CHỐT THÁNG (Mockup Ảnh 239) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Cột trái: PHÂN TÍCH THEO NGÀY (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/90 dark:bg-black/75 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-400" />
                Phân Tích Theo Ngày
              </span>
              <p className="text-[11px] text-slate-400">
                Doanh số chưa VAT • Đơn vị M
              </p>
            </div>
            <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setDailyViewMode('RECENT_7')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  dailyViewMode === 'RECENT_7' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                7 ngày gần nhất
              </button>
              <button
                type="button"
                onClick={() => setDailyViewMode('ALL_MONTH')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  dailyViewMode === 'ALL_MONTH' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Cả tháng
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-medium">
                  <th className="py-2 px-2">NGÀY</th>
                  <th className="py-2 px-2 text-right">GÓI</th>
                  <th className="py-2 px-2 text-right">SP</th>
                  <th className="py-2 px-2 text-right">TỔNG</th>
                  <th className="py-2 px-2 text-right">DONE VX</th>
                  <th className="py-2 px-2 text-right">DONE GÓI</th>
                  <th className="py-2 px-2 text-right">SO VỚI NHỊP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {displayedDailyRecords.map((r) => {
                  const isPositive = r.varianceToPace >= 0;
                  return (
                    <tr key={r.date} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-2 text-slate-300 font-semibold">{r.displayDate}</td>
                      <td className="py-2 px-2 text-right text-blue-400">{formatMillions(r.comboSalesNet)}</td>
                      <td className="py-2 px-2 text-right text-purple-400">{formatMillions(r.productSalesNet)}</td>
                      <td className="py-2 px-2 text-right text-amber-300 font-bold">{formatMillions(r.totalSalesNet)}</td>
                      <td className="py-2 px-2 text-right text-emerald-400">{r.greenVisitsCount}</td>
                      <td className="py-2 px-2 text-right text-purple-400">{r.packageUsageVisitsCount}</td>
                      <td className="py-2 px-2 text-right">
                        {isConfigured ? (
                          <span
                            className={`inline-flex items-center gap-0.5 font-bold ${
                              isPositive ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {isPositive ? '+' : ''}
                            {formatMillions(r.varianceToPace)}
                          </span>
                        ) : (
                          <span className="text-slate-600">---</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cột phải: DỰ BÁO CHỐT THÁNG (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/90 dark:bg-black/75 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Dự Báo Chốt Tháng
              </span>
              <span className="text-[10px] text-slate-400">Nhịp 7 ngày gần nhất</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">Theo nhịp thực tế 7 ngày vừa qua</p>

            <div className="flex items-baseline gap-2 mb-2 font-mono">
              <span className="text-4xl font-black text-emerald-400">
                {isConfigured ? formatMillions(data.forecast.forecastTotal) : '---'}
              </span>
              <span className="text-slate-500 text-sm font-semibold">
                / {isConfigured ? formatMillions(targets.totalSalesTarget) : '---'}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl font-bold text-emerald-400 font-mono">
                {isConfigured ? `${data.forecast.forecastPercent}%` : '---'}
              </span>
              <span className="text-xs text-slate-400">dự báo đạt</span>
            </div>

            {/* Difference Badge */}
            {isConfigured && (
              <div
                className={`p-2.5 rounded-xl border text-xs font-medium mb-3 flex items-center gap-2 ${
                  data.forecast.forecastVariance >= 0
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-red-500/10 text-red-300 border-red-500/30'
                }`}
              >
                {data.forecast.forecastVariance >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-400" />
                )}
                <span>
                  {data.forecast.forecastVariance >= 0 ? '+' : ''}
                  {formatMillions(data.forecast.forecastVariance)} so với mục tiêu
                </span>
              </div>
            )}

            {/* Formula Explanation */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 leading-relaxed font-mono">
              {data.forecast.summaryFormula}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Trạng thái dự báo:</span>
            <span
              className={`font-semibold ${
                data.forecast.status === 'ON_TRACK'
                  ? 'text-emerald-400'
                  : data.forecast.status === 'BORDERLINE'
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}
            >
              {data.forecast.status === 'ON_TRACK'
                ? 'Đúng nhịp'
                : data.forecast.status === 'BORDERLINE'
                ? 'Sát mục tiêu'
                : 'Nguy cơ hụt'}
            </span>
          </div>
        </div>
      </div>

      {/* 5. HÀNG 4: BOTTOM STATUS BAR (Mockup Ảnh 239) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* KHÁCH HÀNG DUY NHẤT */}
        <div className="bg-slate-900/90 dark:bg-black/75 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Khách Hàng Duy Nhất
            </span>
            <div className="text-2xl font-black text-slate-100 font-mono mt-1">
              {data.retention.uniquePaxCount} <span className="text-sm font-normal text-slate-400">khách</span>
            </div>
          </div>
          <div className="text-right text-xs text-slate-400 font-mono">
            <div>{data.meta.totalDoneVisits} lượt Done</div>
            <div className="text-amber-300">{data.meta.uniquePaxPerVisit} lượt / khách</div>
          </div>
        </div>

        {/* CẢNH BÁO NHỊP */}
        <div className="bg-slate-900/90 dark:bg-black/75 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Cảnh Báo Nhịp
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`w-3 h-3 rounded-full ${
                  pacingStatus === 'ĐÚNG TIẾN ĐỘ'
                    ? 'bg-emerald-400 animate-pulse'
                    : pacingStatus === 'SÁT MỤC TIÊU'
                    ? 'bg-amber-400'
                    : pacingStatus === 'HỤT MỤC TIÊU'
                    ? 'bg-red-400 animate-pulse'
                    : 'bg-slate-500'
                }`}
              />
              <span
                className={`text-lg font-black tracking-wide ${
                  pacingStatus === 'ĐÚNG TIẾN ĐỘ'
                    ? 'text-emerald-400'
                    : pacingStatus === 'SÁT MỤC TIÊU'
                    ? 'text-amber-400'
                    : pacingStatus === 'HỤT MỤC TIÊU'
                    ? 'text-red-400'
                    : 'text-slate-400'
                }`}
              >
                {pacingStatus}
              </span>
            </div>
          </div>
          <div className="text-right text-xs text-slate-400 font-mono">
            <div>Ngưỡng: 18,7M/ngày</div>
            <div>1.000 Done dùng gói</div>
          </div>
        </div>
      </div>

      {/* DRAWER CẤU HÌNH MỤC TIÊU THÁNG (Guideline Mục 2.5) */}
      <AdaptiveDrawer
        title={
          <div>
            <div className="text-base font-bold text-slate-200">
              MỤC TIÊU THÁNG {selectedMonth}
            </div>
            <div className="text-xs text-slate-400 font-normal">
              Phạm vi: {storeScope === 'DE_THAM_ESTELLA' ? 'Đề Thám + Estella' : storeScope}
            </div>
          </div>
        }
        open={targetDrawerOpen}
        onClose={() => setTargetDrawerOpen(false)}
        width={420}
        closable={{ placement: 'end' }}
        className="dark-theme"
      >
        <Form
          form={targetForm}
          layout="vertical"
          onFinish={handleSaveTargetConfig}
          className="space-y-4"
        >
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed">
            Mục tiêu được lưu trực tiếp vào cơ sở dữ liệu hệ thống. Tháng {selectedMonth} có {targets.daysInMonth} ngày.
          </div>

          <Form.Item
            label="Mục tiêu Doanh số gói chưa VAT (đ)"
            name="comboSalesTarget"
            rules={[{ required: true, message: 'Vui lòng nhập mục tiêu gói' }]}
          >
            <InputNumber
              className="w-full"
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(v) => v!.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            label="Mục tiêu Doanh số sản phẩm chưa VAT (đ)"
            name="productSalesTarget"
            rules={[{ required: true, message: 'Vui lòng nhập mục tiêu sản phẩm' }]}
          >
            <InputNumber
              className="w-full"
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(v) => v!.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item label="Done Vòng Xanh (Lượt)" name="greenFunnelDoneTarget">
              <InputNumber className="w-full" min={0} />
            </Form.Item>
            <Form.Item label="Tỷ lệ chốt VX (%)" name="greenFunnelConversionTarget">
              <InputNumber className="w-full" min={0} max={100} step={0.1} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item label="Done dùng gói (Mốc)" name="packageUsageDoneTarget">
              <InputNumber className="w-full" min={0} />
            </Form.Item>
            <Form.Item label="Doanh số mua tiếp (đ)" name="repeatComboSalesTarget">
              <InputNumber
                className="w-full"
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(v) => v!.replace(/\$\s?|(,*)/g, '')}
              />
            </Form.Item>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setTargetDrawerOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-xs font-medium cursor-pointer hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={targetSaving}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer transition-colors shadow-lg"
            >
              {targetSaving ? 'Đang lưu...' : 'Lưu mục tiêu'}
            </button>
          </div>
        </Form>
      </AdaptiveDrawer>

      {/* DRAWER DRILLDOWN CHI TIẾT GIAO DỊCH (Guideline Câu hỏi 6) */}
      <AdaptiveDrawer
        title={drilldownTitle}
        open={drilldownDrawerOpen}
        onClose={() => setDrilldownDrawerOpen(false)}
        width={560}
        closable={{ placement: 'end' }}
        className="dark-theme"
      >
        {drilldownLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-400 mb-2" />
            <p className="text-xs">Đang tải danh sách giao dịch chi tiết...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-slate-400 font-mono">
              Hiển thị tối đa {drilldownItems.length} giao dịch gần nhất
            </div>
            <div className="divide-y divide-slate-800">
              {drilldownItems.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-200">
                      #{item.id} • {item.customerName || 'Khách hàng'}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {item.bookingDateStart.slice(0, 16)} • {item.storeName}
                    </div>
                    {item.details && (
                      <div className="text-[11px] text-blue-300/80 mt-0.5">{item.details}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-amber-300 font-mono">
                      {formatVnd(item.amountNet)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </AdaptiveDrawer>
    </div>
  );
}
