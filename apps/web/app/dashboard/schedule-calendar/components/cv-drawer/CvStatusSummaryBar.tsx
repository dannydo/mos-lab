'use client';

import React from 'react';
import { Tooltip } from 'antd';
import { ThunderboltOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

interface CvStatusSummaryBarProps {
  statusCounts: { IDLE: number; UPCOMING: number; BUSY: number; ENDING_SOON: number; OVERTIME: number };
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  isLive: boolean;
}

export const CvStatusSummaryBar: React.FC<CvStatusSummaryBarProps> = React.memo(
  ({ statusCounts, statusFilter, setStatusFilter, isLive }) => {
    return (
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-2 rounded-xl border border-slate-700/80 shadow-md text-white">
        <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between px-0.5">
          <span className="flex items-center gap-1">
            <ThunderboltOutlined className="text-amber-400" />
            <span>Trạng Thái Real-Time</span>
          </span>
          <span className="text-[9px] font-mono text-emerald-400 font-normal">
            {isLive ? '● Live order_state' : 'Auto NOW()'}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1 text-center" role="toolbar" aria-label="Bộ lọc trạng thái rảnh bận CV">
          <Tooltip title="Lọc danh sách CV đang hoàn toàn rảnh rỗi (Nhấn để bật/tắt)" placement="top">
            <button
              onClick={() => setStatusFilter(statusFilter === 'IDLE' ? 'all' : 'IDLE')}
              aria-pressed={statusFilter === 'IDLE'}
              className={`p-1 rounded-lg border text-[10px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                statusFilter === 'IDLE'
                  ? 'bg-emerald-500 text-white border-emerald-400 shadow-2xs'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Rảnh</span>
              </div>
              <div className="text-xs font-extrabold tabular-nums">{statusCounts.IDLE}</div>
            </button>
          </Tooltip>

          <Tooltip title="Lọc danh sách CV sắp có lịch hẹn trong 30 phút tới" placement="top">
            <button
              onClick={() => setStatusFilter(statusFilter === 'UPCOMING' ? 'all' : 'UPCOMING')}
              aria-pressed={statusFilter === 'UPCOMING'}
              className={`p-1 rounded-lg border text-[10px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${
                statusFilter === 'UPCOMING'
                  ? 'bg-yellow-500 text-slate-950 border-yellow-400 shadow-2xs'
                  : 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/25'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <ClockCircleOutlined className="text-yellow-400 text-[10px]" />
                <span>Sắp hẹn</span>
              </div>
              <div className="text-xs font-extrabold tabular-nums">{statusCounts.UPCOMING}</div>
            </button>
          </Tooltip>

          <Tooltip title="Lọc danh sách CV đang trong ca nối mi phục vụ khách" placement="top">
            <button
              onClick={() => setStatusFilter(statusFilter === 'BUSY' ? 'all' : 'BUSY')}
              aria-pressed={statusFilter === 'BUSY'}
              className={`p-1 rounded-lg border text-[10px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                statusFilter === 'BUSY'
                  ? 'bg-blue-600 text-white border-blue-400 shadow-2xs'
                  : 'bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>Đang nối</span>
              </div>
              <div className="text-xs font-extrabold tabular-nums">{statusCounts.BUSY}</div>
            </button>
          </Tooltip>

          <Tooltip title="Lọc danh sách CV sắp hoàn thành dịch vụ (còn <= 10 phút)" placement="top">
            <button
              onClick={() => setStatusFilter(statusFilter === 'ENDING_SOON' ? 'all' : 'ENDING_SOON')}
              aria-pressed={statusFilter === 'ENDING_SOON'}
              className={`p-1 rounded-lg border text-[10px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                statusFilter === 'ENDING_SOON'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-2xs'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <ThunderboltOutlined className="text-amber-400 text-[10px]" />
                <span>Sắp xong</span>
              </div>
              <div className="text-xs font-extrabold tabular-nums">{statusCounts.ENDING_SOON}</div>
            </button>
          </Tooltip>

          <Tooltip title="Lọc danh sách CV bị quá thời lượng dự kiến nối mi" placement="top">
            <button
              onClick={() => setStatusFilter(statusFilter === 'OVERTIME' ? 'all' : 'OVERTIME')}
              aria-pressed={statusFilter === 'OVERTIME'}
              className={`p-1 rounded-lg border text-[10px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                statusFilter === 'OVERTIME'
                  ? 'bg-rose-600 text-white border-rose-400 shadow-2xs'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <ExclamationCircleOutlined className="text-rose-400 text-[10px]" />
                <span>Quá giờ</span>
              </div>
              <div className="text-xs font-extrabold tabular-nums">{statusCounts.OVERTIME}</div>
            </button>
          </Tooltip>
        </div>
      </div>
    );
  }
);

CvStatusSummaryBar.displayName = 'CvStatusSummaryBar';
