'use client';

import React, { useEffect, useRef } from 'react';
import { Modal, Spin, Typography, Tooltip, Tag, Button, theme as antTheme } from 'antd';
import {
  UserOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  CompressOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  LineChartOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../../../../context/ThemeContext';
import CcAvatar from '../../../cc/components/CcAvatar';
import { CvSpeedDetail } from '@mos-lab/shared';
import { useResizableModal } from '../../../../../hooks/useResizableModal';
import { CvSpeedTrendLineChart } from './CvSpeedTrendLineChart';

const { Text } = Typography;

export interface CvSpeedDetailModalProps {
  open: boolean;
  loading: boolean;
  staffId: number | null;
  cvDetail: CvSpeedDetail | null;
  onCancel: () => void;
}

export function CvSpeedDetailModal({ open, loading, staffId, cvDetail, onCancel }: CvSpeedDetailModalProps) {
  const { themeMode } = useTheme();
  const { token } = antTheme.useToken();
  const modalContainerRef = useRef<HTMLDivElement>(null);

  const { width, height, isMaximized, resetDimensions, toggleMaximize, startResizing } = useResizableModal({
    storageKey: 'cv_speed_modal_dimensions',
    defaultWidth: 900,
    defaultHeight: 640,
    minWidth: 640,
    maxWidth: 1400,
    minHeight: 460,
    maxHeight: 920,
  });

  const isDark = themeMode === 'dark';

  // 1. Accessibility (A11y): Keydown ESC key listener
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  // 2. Accessibility (A11y): Auto-focus inside modal container on open
  useEffect(() => {
    if (open && modalContainerRef.current) {
      modalContainerRef.current.focus();
    }
  }, [open]);

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={width}
      style={{
        top: isMaximized ? 12 : 24,
        maxWidth: 'calc(100vw - 32px)',
        paddingBottom: 0,
      }}
      styles={{
        content: {
          padding: 0,
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: token.colorBgElevated,
          border: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: isDark ? '0 20px 45px -15px rgba(0, 0, 0, 0.8)' : '0 20px 45px -15px rgba(0, 0, 0, 0.12)',
        },
      }}
      destroyOnHidden
      closeIcon={null}
    >
      <div
        ref={modalContainerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cv-speed-modal-title"
        aria-describedby="cv-speed-modal-desc"
        className="flex flex-col relative select-none outline-none overflow-hidden"
        style={{
          height,
          maxHeight: isMaximized ? 'calc(100vh - 24px)' : 'calc(100vh - 48px)',
        }}
      >
        {/* HEADER BAR */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b shrink-0"
          style={{
            backgroundColor: isDark ? '#141414' : '#fafafa',
            borderColor: token.colorBorderSecondary,
          }}
        >
          <div className="flex items-center gap-3">
            <CcAvatar name={cvDetail?.staffName || ''} src={cvDetail?.avatarUrl} size={34} />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2
                  id="cv-speed-modal-title"
                  className="font-bold text-base leading-snug m-0 p-0"
                  style={{ color: token.colorText }}
                >
                  Chi Tiết Tốc Độ & Lịch Sử
                </h2>
                <Tag
                  color={isDark ? 'gold' : 'blue'}
                  className="m-0 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                >
                  {cvDetail?.staffName || `Chuyên viên #${staffId}`}
                </Tag>
              </div>
              <span id="cv-speed-modal-desc" className="text-[11px] text-slate-400 font-medium">
                Mô hình đo lường hiệu suất & phân tích thời lượng nối mi per ca
              </span>
            </div>
          </div>

          {/* HEADER CONTROLS (Tap targets >= 44px equivalent spacing) */}
          <div className="flex items-center gap-2">
            <Tooltip title="Reset kích thước mặc định (900x640)">
              <button
                type="button"
                aria-label="Reset kích thước cửa sổ"
                onClick={resetDimensions}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors focus:ring-2 focus:ring-blue-500"
              >
                <CompressOutlined style={{ fontSize: 14 }} />
              </button>
            </Tooltip>

            <Tooltip title={isMaximized ? 'Thu nhỏ cửa sổ' : 'Phóng to cửa sổ'}>
              <button
                type="button"
                aria-label={isMaximized ? 'Thu nhỏ cửa sổ' : 'Phóng to cửa sổ'}
                onClick={toggleMaximize}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors focus:ring-2 focus:ring-blue-500"
              >
                {isMaximized ? (
                  <FullscreenExitOutlined style={{ fontSize: 14 }} />
                ) : (
                  <FullscreenOutlined style={{ fontSize: 14 }} />
                )}
              </button>
            </Tooltip>

            <button
              type="button"
              aria-label="Đóng cửa sổ (Phím ESC)"
              onClick={onCancel}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800/50 transition-colors focus:ring-2 focus:ring-red-500 ml-1"
            >
              <CloseOutlined style={{ fontSize: 14 }} />
            </button>
          </div>
        </div>

        {/* MODAL CONTENT BODY: 2-COLUMN SPLIT DASHBOARD */}
        <Spin
          spinning={loading}
          style={{ height: '100%' }}
          wrapperClassName="flex-1 min-h-0 overflow-hidden [&>.ant-spin-container]:h-full [&>.ant-spin-container]:flex [&>.ant-spin-container]:flex-col [&>.ant-spin-container]:min-h-0"
        >
          {cvDetail ? (
            <div className="grid grid-cols-12 h-full min-h-0 overflow-hidden divide-x divide-slate-200 dark:divide-slate-800">
              {/* LEFT COLUMN: OVERVIEW KPI & PHASES & LINE CHART (5 Cols = ~40%) */}
              <div
                className="col-span-5 p-4 flex flex-col gap-3.5 min-h-0 h-full overflow-y-auto"
                style={{ backgroundColor: isDark ? '#141414' : '#ffffff' }}
              >
                {/* 3 COMPACT KPI STAT CARDS */}
                <div className="grid grid-cols-3 gap-2 shrink-0">
                  <div
                    className="p-2.5 rounded-xl border text-center flex flex-col justify-center gap-0.5"
                    style={{
                      backgroundColor: isDark ? '#1a1a1a' : '#f8fafc',
                      borderColor: token.colorBorderSecondary,
                    }}
                  >
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">∑ Ca</span>
                    <span className="text-lg font-extrabold tabular-nums" style={{ color: token.colorText }}>
                      {cvDetail.totalCases} <span className="text-xs font-normal text-slate-400">ca</span>
                    </span>
                  </div>

                  <div
                    className="p-2.5 rounded-xl border text-center flex flex-col justify-center gap-0.5"
                    style={{
                      backgroundColor: isDark ? '#1a1a1a' : '#f8fafc',
                      borderColor: token.colorBorderSecondary,
                    }}
                  >
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Vs Benchmark</span>
                    <span
                      className={`text-lg font-extrabold tabular-nums ${
                        cvDetail.avgSpeedVsBenchmarkPercent <= 0 ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {cvDetail.avgSpeedVsBenchmarkPercent > 0 ? '+' : ''}
                      {cvDetail.avgSpeedVsBenchmarkPercent}%
                    </span>
                  </div>

                  <div
                    className="p-2.5 rounded-xl border text-center flex flex-col justify-center gap-0.5"
                    style={{
                      backgroundColor: isDark ? '#1a1a1a' : '#f8fafc',
                      borderColor: token.colorBorderSecondary,
                    }}
                  >
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Điểm tốc độ</span>
                    <span className="text-lg font-extrabold text-amber-500 tabular-nums">
                      {cvDetail.overallScore} <span className="text-[10px] font-normal text-slate-400">/100</span>
                    </span>
                  </div>
                </div>

                {/* PHASE BREAKDOWN BAR & LEGEND */}
                <div
                  className="p-3.5 rounded-xl border flex flex-col gap-2.5 shrink-0"
                  style={{
                    backgroundColor: isDark ? '#1a1a1a' : '#f8fafc',
                    borderColor: token.colorBorderSecondary,
                  }}
                >
                  <div
                    className="flex items-center justify-between text-xs font-bold"
                    style={{ color: token.colorText }}
                  >
                    <span className="flex items-center gap-1.5">
                      <ClockCircleOutlined className="text-blue-500" /> Phân Bổ Thời Gian Trung Bình
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal tabular-nums">
                      {(cvDetail.phaseBreakdown.cleaning || 0) +
                        (cvDetail.phaseBreakdown.extension || 0) +
                        (cvDetail.phaseBreakdown.prepQc || 0)}
                      p / ca
                    </span>
                  </div>

                  {(() => {
                    const clean = cvDetail.phaseBreakdown.cleaning || 0;
                    const ext = cvDetail.phaseBreakdown.extension || 0;
                    const prep = cvDetail.phaseBreakdown.prepQc || 0;
                    const sum = clean + ext + prep || 1;

                    const cleanPct = Math.round((clean / sum) * 100);
                    const extPct = Math.round((ext / sum) * 100);
                    const prepPct = Math.round((prep / sum) * 100);

                    return (
                      <div className="flex flex-col gap-2">
                        {/* GAUGE BAR */}
                        <div
                          className="w-full flex h-3.5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner"
                          aria-label={`Vệ sinh: ${clean}p, Nối mi: ${ext}p, Prep QC: ${prep}p`}
                        >
                          <Tooltip title={`Vệ sinh: ${clean}p (${cleanPct}%)`}>
                            <div
                              style={{ width: `${cleanPct}%`, backgroundColor: '#3b82f6' }}
                              className="h-full transition-all"
                            />
                          </Tooltip>
                          <Tooltip title={`Nối mi: ${ext}p (${extPct}%)`}>
                            <div
                              style={{ width: `${extPct}%`, backgroundColor: '#22c55e' }}
                              className="h-full transition-all"
                            />
                          </Tooltip>
                          <Tooltip title={`Prep & QC: ${prep}p (${prepPct}%)`}>
                            <div
                              style={{ width: `${prepPct}%`, backgroundColor: '#f59e0b' }}
                              className="h-full transition-all"
                            />
                          </Tooltip>
                        </div>

                        {/* INLINE LEGEND */}
                        <div className="grid grid-cols-3 gap-1 text-[11px] font-medium pt-1">
                          <div className="flex items-center gap-1.5 text-blue-500">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                            <span>
                              Vệ sinh: <strong className="tabular-nums">{clean}p</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-500">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span>
                              Nối mi: <strong className="tabular-nums">{ext}p</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-amber-500">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                            <span>
                              Prep & QC: <strong className="tabular-nums">{prep}p</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* MONTHLY SPEED TREND: SVG AREA-LINE CHART */}
                <div
                  className="p-3.5 rounded-xl border flex flex-col gap-2 shrink-0"
                  style={{
                    backgroundColor: isDark ? '#1a1a1a' : '#f8fafc',
                    borderColor: token.colorBorderSecondary,
                  }}
                >
                  <div
                    className="flex items-center justify-between text-xs font-bold"
                    style={{ color: token.colorText }}
                  >
                    <span className="flex items-center gap-1.5">
                      <LineChartOutlined className="text-purple-500" /> Xu Hướng Tốc Độ (6 Tháng Gần Đây)
                    </span>
                  </div>

                  <CvSpeedTrendLineChart monthlyTrend={cvDetail.monthlyTrend} isDark={isDark} benchmarkMinutes={60} />
                </div>
              </div>

              {/* RIGHT COLUMN: RECENT CASES TIMELINE (7 Cols = ~60%) */}
              <div
                className="col-span-7 p-4 flex flex-col gap-3 min-h-0 h-full overflow-hidden"
                style={{ backgroundColor: isDark ? '#18181b' : '#fafafa' }}
              >
                <div className="flex items-center justify-between shrink-0 pb-1">
                  <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: token.colorText }}>
                    <HistoryOutlined className="text-amber-500" /> Lịch Sử Ca Thực Hiện Gần Đây (
                    {cvDetail.recentCases.length})
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Sắp xếp ca mới nhất</span>
                </div>

                {/* TIMELINE LIST (with custom scrollbar styles) */}
                <div className="flex-1 min-h-0 overflow-y-auto pr-1.5 flex flex-col gap-2.5 custom-scrollbar">
                  {cvDetail.recentCases.map((c, idx) => {
                    const clean = c.cleaningMinutes || 0;
                    const ext = c.extensionMinutes || 0;
                    const prep = c.prepQcMinutes || 0;
                    const total = c.totalMinutes || clean + ext + prep || 1;

                    return (
                      <div
                        key={`case_${c.orderId}_${idx}`}
                        className="p-3.5 rounded-xl border flex flex-col gap-2 text-xs transition-all hover:border-blue-500/50 shadow-sm shrink-0"
                        style={{
                          backgroundColor: isDark ? '#1f1f23' : '#ffffff',
                          borderColor: token.colorBorderSecondary,
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-bold text-slate-200 dark:text-slate-100 truncate">
                              Đơn #{c.orderId}
                            </span>
                            <span className="text-slate-400 font-medium truncate">
                              — {c.lashStyle} ({c.lashCount} sợi)
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 tabular-nums shrink-0 font-mono">{c.date}</span>
                        </div>

                        {/* MODE TAG & TIME COMPARISON */}
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <Tag
                              bordered={false}
                              className="m-0 text-[10px] font-semibold px-2 py-0.5 rounded"
                              color={
                                c.serviceMode === 'retain'
                                  ? 'purple'
                                  : c.serviceMode === 'normal_removal'
                                    ? 'orange'
                                    : 'blue'
                              }
                            >
                              {c.serviceMode}
                            </Tag>
                          </div>

                          <div className="flex items-center gap-1 font-bold" style={{ color: token.colorText }}>
                            <ThunderboltOutlined className="text-amber-500" />
                            <span className="tabular-nums">{c.totalMinutes} phút</span>
                          </div>
                        </div>

                        {/* MULTI-COLOR PHASE PROGRESS BAR */}
                        <div className="flex items-center gap-2 pt-0.5">
                          <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                            <Tooltip title={`Vệ sinh: ${clean}p`}>
                              <div
                                style={{ width: `${(clean / total) * 100}%`, backgroundColor: '#3b82f6' }}
                                className="h-full"
                              />
                            </Tooltip>
                            <Tooltip title={`Nối mi: ${ext}p`}>
                              <div
                                style={{ width: `${(ext / total) * 100}%`, backgroundColor: '#22c55e' }}
                                className="h-full"
                              />
                            </Tooltip>
                            <Tooltip title={`Prep & QC: ${prep}p`}>
                              <div
                                style={{ width: `${(prep / total) * 100}%`, backgroundColor: '#f59e0b' }}
                                className="h-full"
                              />
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </Spin>

        {/* BOTTOM-RIGHT CORNER DRAG RESIZE HANDLE */}
        {!isMaximized && (
          <div
            onMouseDown={startResizing}
            title="Kéo thả góc này để thay đổi kích thước Modal"
            className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity z-50"
            style={{
              background: 'linear-gradient(135deg, transparent 50%, #94a3b8 50%)',
              borderBottomRightRadius: 12,
            }}
          />
        )}
      </div>
    </Modal>
  );
}
