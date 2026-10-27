'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Typography, Button, Tooltip, Space, Progress } from 'antd';
import {
  Zap,
  Gift,
  ShoppingBag,
  TrendingUp,
  Users,
  RefreshCw,
  Info,
  Radio,
  Clock,
} from 'lucide-react';
import dayjs from 'dayjs';
import { CbLiveTelemetryResponse } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { formatCompactVND } from '../../../../lib/format-utils';
import { StatusTag } from '../../../../components/ui';

interface CbLiveTelemetryWidgetProps {
  initialMonth?: string;
  autoRefreshIntervalSec?: number;
  showCardWrapper?: boolean;
}

export default function CbLiveTelemetryWidget({
  initialMonth,
  autoRefreshIntervalSec = 20,
  showCardWrapper = true,
}: CbLiveTelemetryWidgetProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (initialMonth) return initialMonth;
    const now = dayjs();
    if (now.month() === 10) return now.format('YYYY-MM');
    return '2026-11';
  });

  const [telemetry, setTelemetry] = useState<CbLiveTelemetryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');
  const [isLiveActive, setIsLiveActive] = useState(true);
  const isFetchingRef = useRef(false);

  const fetchTelemetry = useCallback(
    async (isManual = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      if (isManual) setLoading(true);

      try {
        const data = await apiClient.kpi.getCbLiveTelemetry({
          month: selectedMonth,
        });
        if (data) {
          setTelemetry(data);
          setLastUpdatedTime(dayjs().format('HH:mm:ss'));
        }
      } catch (err) {
        console.error('Lỗi nạp dữ liệu $CB Live Telemetry:', err);
      } finally {
        isFetchingRef.current = false;
        if (isManual) setLoading(false);
      }
    },
    [selectedMonth]
  );

  useEffect(() => {
    void fetchTelemetry(true);
  }, [fetchTelemetry]);

  useEffect(() => {
    if (!isLiveActive || autoRefreshIntervalSec <= 0) return;

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void fetchTelemetry(false);
    }, autoRefreshIntervalSec * 1000);

    return () => clearInterval(interval);
  }, [autoRefreshIntervalSec, fetchTelemetry, isLiveActive]);

  const rev = telemetry?.revenue;
  const green = telemetry?.greenFunnel;
  const ret = telemetry?.retention;

  const content = (
    <div className="cb-live-telemetry-container space-y-4">
      {/* HEADER BANNER */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-blue-500/10">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-500">
            <Zap className="w-5 h-5 animate-pulse text-emerald-500" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-slate-800 dark:text-slate-100">
                $CB LIVE TELEMETRY PIPELINE
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                100% Real-Time
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
              <span>Đường truyền dữ liệu trực tiếp từ Core Database</span>
              {lastUpdatedTime && (
                <>
                  <span>•</span>
                  <span className="tabular-nums flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Đồng bộ lúc: {lastUpdatedTime}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* MONTH SELECTOR & ACTION BUTTONS */}
        <div className="flex items-center gap-2 flex-wrap">
          <Space.Compact size="small">
            <Button
              type={selectedMonth === '2026-10' ? 'primary' : 'default'}
              onClick={() => setSelectedMonth('2026-10')}
              className="text-xs"
            >
              Tháng 10
            </Button>
            <Button
              type={selectedMonth === '2026-11' ? 'primary' : 'default'}
              onClick={() => setSelectedMonth('2026-11')}
              className="text-xs font-semibold"
            >
              Tháng 11 (Target $CB)
            </Button>
            <Button
              type={selectedMonth === '2026-12' ? 'primary' : 'default'}
              onClick={() => setSelectedMonth('2026-12')}
              className="text-xs"
            >
              Tháng 12
            </Button>
          </Space.Compact>

          <Button
            size="small"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            onClick={() => void fetchTelemetry(true)}
            loading={loading}
            className="text-xs"
          >
            Làm mới
          </Button>

          <Button
            size="small"
            type={isLiveActive ? 'dashed' : 'text'}
            onClick={() => setIsLiveActive((prev) => !prev)}
            className={`text-xs ${isLiveActive ? 'text-emerald-500 border-emerald-500' : 'text-slate-400'}`}
          >
            {isLiveActive ? '● Streaming On' : '○ Tạm dừng'}
          </Button>
        </div>
      </div>

      {/* 3 CỤM BỘ ĐO LIVE STREAMING (MATCHING TICKET PIPELINE SCHEMA) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CỤM 1: DOANH SỐ THỰC THU (LIVE) */}
        <div className="p-4 rounded-xl border border-blue-500/30 dark:border-blue-900/50 bg-white dark:bg-slate-900 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-blue-500" />
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                  1. Doanh Số Thực Thu (Live)
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Chưa VAT
              </span>
            </div>

            <div className="space-y-3">
              {/* DÒNG TIỀN GÓI */}
              <div className="flex items-center justify-between">
                <Tooltip title="Bóc tách chuẩn xác: total_price - tax_amount của các dòng order_service_combo trong kỳ">
                  <span className="text-xs text-slate-600 dark:text-slate-400 cursor-help flex items-center gap-1">
                    • Dòng tiền gói chưa VAT:
                    <Info className="w-3 h-3 text-slate-400 opacity-60" />
                  </span>
                </Tooltip>
                <div className="text-right">
                  <div className="tabular-nums font-bold text-sm text-blue-600 dark:text-blue-400">
                    {formatCompactVND(rev?.comboSalesNet || 0)}
                  </div>
                  <div className="tabular-nums text-[11px] text-slate-400">
                    {Math.round(rev?.comboSalesNet || 0).toLocaleString('vi-VN')} đ
                  </div>
                </div>
              </div>

              {/* DÒNG TIỀN SẢN PHẨM */}
              <div className="flex items-center justify-between">
                <Tooltip title="Bóc tách chuẩn xác: total_price - tax_amount của từng dòng order_product trong kỳ">
                  <span className="text-xs text-slate-600 dark:text-slate-400 cursor-help flex items-center gap-1">
                    • Dòng tiền sản phẩm chưa VAT:
                    <Info className="w-3 h-3 text-slate-400 opacity-60" />
                  </span>
                </Tooltip>
                <div className="text-right">
                  <div className="tabular-nums font-bold text-sm text-purple-600 dark:text-purple-400">
                    {formatCompactVND(rev?.productSalesNet || 0)}
                  </div>
                  <div className="tabular-nums text-[11px] text-slate-400">
                    {Math.round(rev?.productSalesNet || 0).toLocaleString('vi-VN')} đ
                  </div>
                </div>
              </div>

              {/* AOV GÓI THỜI GIAN THỰC */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <Tooltip title="Giá trị trung bình mỗi đơn gói = Dòng tiền gói chưa VAT / Số đơn gói">
                  <span className="text-xs text-slate-600 dark:text-slate-400 cursor-help flex items-center gap-1">
                    • AOV gói thời gian thực:
                    <Info className="w-3 h-3 text-slate-400 opacity-60" />
                  </span>
                </Tooltip>
                <div className="text-right">
                  <span className="tabular-nums font-bold text-xs text-amber-600 dark:text-amber-400">
                    {formatCompactVND(rev?.comboAov || 0)}
                  </span>
                  <span className="tabular-nums text-[11px] text-slate-400 ml-1">
                    ({rev?.comboOrderCount || 0} đơn)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60 -mx-4 -mb-4 p-3 rounded-b-xl">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">∑ Tổng Doanh Số Net:</span>
            <span className="tabular-nums font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
              {Math.round(rev?.totalSalesNet || 0).toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>

        {/* CỤM 2: ĐỘNG CƠ VÒNG XANH (LIVE) - Green Funnel Pulse */}
        <div className="p-4 rounded-xl border border-emerald-500/30 dark:border-emerald-900/50 bg-white dark:bg-slate-900 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                  2. Động Cơ Vòng Xanh (Live)
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {(green?.closingRatePercent || 0) >= 10.0 ? 'Chuẩn ≥ 10%' : 'Chuẩn: 10%'}
              </span>
            </div>

            <div className="space-y-3">
              {/* LƯỢT DONE VÒNG XANH LŨY KẾ */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-400">• Lượt Done Vòng xanh:</span>
                  <div className="tabular-nums font-bold text-xs text-slate-800 dark:text-slate-200">
                    <span className="text-emerald-600 dark:text-emerald-400 text-sm">
                      {green?.greenVisitsCount || 0}
                    </span>
                    <span className="text-slate-400 font-normal"> / {green?.greenVisitsTarget || 540} Done</span>
                  </div>
                </div>
                <Progress
                  percent={Math.min(100, green?.progressPercent || 0)}
                  size="small"
                  showInfo={false}
                  className="m-0"
                />
              </div>

              {/* ĐƠN GÓI CHỐT TỪ VÒNG XANH */}
              <div className="flex items-center justify-between pt-1">
                <Tooltip title="Số đơn mua gói phát sinh từ đúng các lịch Done vòng xanh trong kỳ">
                  <span className="text-xs text-slate-600 dark:text-slate-400 cursor-help flex items-center gap-1">
                    • Đơn gói chốt từ Vòng xanh:
                    <Info className="w-3 h-3 text-slate-400 opacity-60" />
                  </span>
                </Tooltip>
                <span className="tabular-nums font-bold text-xs text-emerald-600 dark:text-emerald-400">
                  {green?.greenComboOrdersCount || 0} đơn
                </span>
              </div>

              {/* % TỶ LỆ CHỐT LIVE */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <Tooltip title="Tỷ lệ chốt = [Đơn gói từ Vòng xanh / Lượt Done Vòng xanh] * 100%. Vạch chuẩn tối thiểu 10.0%">
                  <span className="text-xs text-slate-600 dark:text-slate-400 cursor-help flex items-center gap-1">
                    • % Tỷ lệ chốt Live:
                    <Info className="w-3 h-3 text-slate-400 opacity-60" />
                  </span>
                </Tooltip>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`tabular-nums font-extrabold text-sm ${
                      (green?.closingRatePercent || 0) >= 10.0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {green?.closingRatePercent || 0}%
                  </span>
                  <span className="text-[11px] text-slate-400">(Vạch: 10%)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60 -mx-4 -mb-4 p-3 rounded-b-xl">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Đánh giá Vòng Xanh:</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                (green?.closingRatePercent || 0) >= 10.0
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
              }`}
            >
              {(green?.closingRatePercent || 0) >= 10.0 ? '✓ Đạt chuẩn 10%' : '⚠️ Cần bức phá chốt gói'}
            </span>
          </div>
        </div>

        {/* CỤM 3: ĐỘNG CƠ DÙNG GÓI (LIVE) - Retention Pulse */}
        <div className="p-4 rounded-xl border border-fuchsia-500/30 dark:border-fuchsia-900/50 bg-white dark:bg-slate-900 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-fuchsia-500" />
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                  3. Động Cơ Dùng Gói (Live)
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-500/20">
                Retention Pulse
              </span>
            </div>

            <div className="space-y-3">
              {/* LƯỢT DONE TRỪ SỐ DƯ GÓI (TARGET 1K) */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <Tooltip title="Số lịch Completed có phát sinh trừ lượt mi thực tế (user_service_balance_transaction_id)">
                    <span className="text-slate-600 dark:text-slate-400 cursor-help flex items-center gap-1">
                      • Lượt Done trừ số dư gói:
                      <Info className="w-3 h-3 text-slate-400 opacity-60" />
                    </span>
                  </Tooltip>
                  <div className="tabular-nums font-bold text-xs text-slate-800 dark:text-slate-200">
                    <span className="text-fuchsia-600 dark:text-fuchsia-400 text-sm">
                      {ret?.balanceDeductionVisitsCount || 0}
                    </span>
                    <span className="text-slate-400 font-normal"> / {ret?.targetVisits || 1000} (1K)</span>
                  </div>
                </div>
                <Progress
                  percent={Math.min(100, ret?.progressPercent || 0)}
                  size="small"
                  showInfo={false}
                  className="m-0"
                />
              </div>

              {/* ĐƠN MUA TIẾP CỦA KHÁCH ĐANG DÙNG GÓI */}
              <div className="flex items-center justify-between pt-1">
                <Tooltip title="Đơn mua thêm combo hoặc sản phẩm từ tệp khách hàng đang dùng gói">
                  <span className="text-xs text-slate-600 dark:text-slate-400 cursor-help flex items-center gap-1">
                    • Đơn mua tiếp của khách dùng gói:
                    <Info className="w-3 h-3 text-slate-400 opacity-60" />
                  </span>
                </Tooltip>
                <span className="tabular-nums font-bold text-xs text-fuchsia-600 dark:text-fuchsia-400">
                  {ret?.repurchaseOrdersCount || 0} đơn
                </span>
              </div>

              {/* SỐ KHÁCH DUY NHẤT (UNIQUE PAX) LIVE */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <Tooltip title="Số lượng khách hàng khác nhau (Unique Pax) có lịch Done dùng gói trong kỳ">
                  <span className="text-xs text-slate-600 dark:text-slate-400 cursor-help flex items-center gap-1">
                    • Số khách duy nhất (Unique Pax):
                    <Info className="w-3 h-3 text-slate-400 opacity-60" />
                  </span>
                </Tooltip>
                <span className="tabular-nums font-extrabold text-sm text-fuchsia-600 dark:text-fuchsia-400">
                  {ret?.uniquePaxCount || 0} pax
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60 -mx-4 -mb-4 p-3 rounded-b-xl">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tiến độ Mốc 1K Lượt:</span>
            <span className="tabular-nums font-bold text-xs text-fuchsia-600 dark:text-fuchsia-400">
              {ret?.progressPercent || 0}% hoàn thành
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  if (!showCardWrapper) {
    return content;
  }

  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      {content}
    </div>
  );
}
