'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button, Tooltip, Select, DatePicker, Segmented } from 'antd';
import { AdaptiveModal, DataTable } from '../../../../components/ui';
import {
  ClipboardList,
  RotateCw,
  Volume2,
  VolumeX,
  Sparkles,
  Clock,
  Flame,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Filter,
  Users,
  Tv,
} from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import { TelesaleTvEventLog, TelesaleTvJournalOverview } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { useTheme } from '../../../../context/ThemeContext';

interface TelesaleTvJournalModalProps {
  open: boolean;
  onClose: () => void;
  staffList?: Array<{ legacyStaffId: number; name: string }>;
  zIndex?: number;
}

export const TelesaleTvJournalModal: React.FC<TelesaleTvJournalModalProps> = ({
  open,
  onClose,
  staffList = [],
  zIndex = 100005,
}) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const [selectedDate, setSelectedDate] = useState<string>(() => dayjs().format('YYYY-MM-DD'));
  const [loading, setLoading] = useState<boolean>(false);
  const [journalData, setJournalData] = useState<TelesaleTvJournalOverview | null>(null);

  // Filters
  const [staffFilter, setStaffFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchJournal = useCallback(async (dateStr: string) => {
    setLoading(true);
    try {
      // 1. Fetch server records
      const serverJournal = await apiClient.telesaleTarget.getTvJournal({ date: dateStr });

      // 2. Hydrate client local execution status if available for today
      let clientLogs: TelesaleTvEventLog[] = [];
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(`MOS_TV_MONITOR_EVENT_LOGS_${dateStr}`);
          if (raw) clientLogs = JSON.parse(raw);
        } catch {}
      }

      // Merge server events with client logs (client execution details take precedence for local TV status)
      const clientLogMap = new Map<string, TelesaleTvEventLog>();
      clientLogs.forEach((l) => clientLogMap.set(l.id, l));

      const mergedEvents = (serverJournal.events || []).map((ev) => {
        const clientExec = clientLogMap.get(ev.id);
        if (clientExec) {
          return {
            ...ev,
            eventReceived: clientExec.eventReceived,
            voiceTriggered: clientExec.voiceTriggered,
            voiceErrorReason: clientExec.voiceErrorReason,
            overlayTriggered: clientExec.overlayTriggered,
            overlayErrorReason: clientExec.overlayErrorReason,
            status: clientExec.status,
            errorMessage: clientExec.errorMessage,
          };
        }
        return ev;
      });

      // Also include any client-only events (e.g. milestones triggered locally)
      for (const cl of clientLogs) {
        if (!mergedEvents.some((e) => e.id === cl.id)) {
          mergedEvents.push(cl);
        }
      }

      // Sort descending
      mergedEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const voiceSuccess = mergedEvents.filter((e) => e.voiceTriggered).length;
      const voiceError = mergedEvents.filter((e) => e.eventReceived && !e.voiceTriggered).length;
      const overlaySuccess = mergedEvents.filter((e) => e.overlayTriggered).length;
      const overlayError = mergedEvents.filter((e) => e.eventReceived && !e.overlayTriggered).length;
      const latestEventTime = mergedEvents.length > 0 ? mergedEvents[0].timestamp : null;

      setJournalData({
        totalEvents: mergedEvents.length,
        voiceSuccess,
        voiceError,
        overlaySuccess,
        overlayError,
        latestEventTime,
        events: mergedEvents,
      });
    } catch {
      // Fallback to local storage if API call is offline
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(`MOS_TV_MONITOR_EVENT_LOGS_${dateStr}`);
          if (raw) {
            const list: TelesaleTvEventLog[] = JSON.parse(raw);
            list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setJournalData({
              totalEvents: list.length,
              voiceSuccess: list.filter((e) => e.voiceTriggered).length,
              voiceError: list.filter((e) => e.eventReceived && !e.voiceTriggered).length,
              overlaySuccess: list.filter((e) => e.overlayTriggered).length,
              overlayError: list.filter((e) => e.eventReceived && !e.overlayTriggered).length,
              latestEventTime: list.length > 0 ? list[0].timestamp : null,
              events: list,
            });
          }
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchJournal(selectedDate);
    }
  }, [open, selectedDate, fetchJournal]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    if (!journalData?.events) return [];
    return journalData.events.filter((ev) => {
      // Staff filter
      if (staffFilter !== 'ALL') {
        const staffMatch =
          String(ev.staffId) === staffFilter || ev.staffName?.toLowerCase().includes(staffFilter.toLowerCase());
        if (!staffMatch) return false;
      }

      // Type filter
      if (typeFilter !== 'ALL' && ev.type !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && ev.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [journalData, staffFilter, typeFilter, statusFilter]);

  const latestTimeFormatted = useMemo(() => {
    if (!journalData?.latestEventTime) return 'Chưa có sự kiện';
    const firstEvent = journalData.events?.[0];
    if (firstEvent?.timeFormatted) return firstEvent.timeFormatted;
    try {
      return new Date(journalData.latestEventTime).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Ho_Chi_Minh',
      });
    } catch {
      return dayjs(journalData.latestEventTime).format('HH:mm:ss');
    }
  }, [journalData]);

  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 110,
      render: (val: string, record: TelesaleTvEventLog) => {
        let time = record.timeFormatted;
        if (!time && val) {
          try {
            time = new Date(val).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
              timeZone: 'Asia/Ho_Chi_Minh',
            });
          } catch {
            time = dayjs(val).format('HH:mm:ss');
          }
        }
        return <span className="font-mono text-xs font-semibold text-zinc-300 tabular-nums">{time || '--:--:--'}</span>;
      },
    },
    {
      title: 'Nhân viên',
      dataIndex: 'staffName',
      key: 'staffName',
      width: 150,
      render: (name: string, record: TelesaleTvEventLog) => {
        if (record.type === 'MILESTONE') {
          return (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-950/70 text-amber-300 border border-amber-600/40">
              <Users className="w-3 h-3 text-amber-400" />
              Toàn team
            </span>
          );
        }
        return (
          <div className="flex items-center gap-2">
            {record.avatarUrl ? (
              <img
                src={record.avatarUrl}
                alt={name}
                className="w-6 h-6 rounded-full object-cover border border-zinc-700 shrink-0"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-[10px] font-bold text-black shrink-0">
                {name ? name.charAt(0).toUpperCase() : 'T'}
              </div>
            )}
            <span className="text-xs font-medium text-zinc-100 truncate">{name || 'Telesales'}</span>
          </div>
        );
      },
    },
    {
      title: 'Loại Event',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (type: 'BOOK' | 'DONE' | 'MILESTONE') => {
        if (type === 'BOOK') {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-950 text-blue-300 border border-blue-500/40">
              BOOK
            </span>
          );
        }
        if (type === 'DONE') {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
              DONE
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-500/40">
            MILESTONE
          </span>
        );
      },
    },
    {
      title: 'Kết quả thay đổi',
      dataIndex: 'changeResult',
      key: 'changeResult',
      width: 150,
      render: (result: string, record: TelesaleTvEventLog) => {
        const isBook = record.type === 'BOOK';
        const isDone = record.type === 'DONE';
        const colorClass = isBook
          ? isDark
            ? 'text-blue-300 bg-blue-950/60 border-blue-600/40'
            : 'text-blue-700 bg-blue-50 border-blue-200'
          : isDone
            ? isDark
              ? 'text-emerald-300 bg-emerald-950/60 border-emerald-600/40'
              : 'text-emerald-700 bg-emerald-50 border-emerald-200'
            : isDark
              ? 'text-amber-300 bg-amber-950/60 border-amber-600/40'
              : 'text-amber-700 bg-amber-50 border-amber-200';

        return (
          <span
            className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold border tabular-nums ${colorClass}`}
          >
            {result || (record.type === 'BOOK' ? '+1 Book' : record.type === 'DONE' ? '+1 Done' : 'Cán mốc')}
          </span>
        );
      },
    },
    {
      title: (
        <span className="flex items-center gap-1 text-[11px]">
          <Tv className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-400' : 'text-slate-400'}`} />
          TV Nhận
        </span>
      ),
      dataIndex: 'eventReceived',
      key: 'eventReceived',
      width: 100,
      render: (received: boolean) =>
        received ? (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
              isDark
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
            }`}
          >
            ✅ Đã nhận
          </span>
        ) : (
          <Tooltip title="Sự kiện phát sinh trước khi mở TV Monitor (Lịch sử) hoặc chưa tiếp nhận">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold cursor-help ${
                isDark
                  ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                  : 'bg-slate-100 text-slate-600 border border-slate-300'
              }`}
            >
              ⏸️ Chưa nhận
            </span>
          </Tooltip>
        ),
    },
    {
      title: (
        <span className="flex items-center gap-1 text-[11px]">
          <Volume2 className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
          Voice
        </span>
      ),
      dataIndex: 'voiceTriggered',
      key: 'voiceTriggered',
      width: 110,
      render: (triggered: boolean, record: TelesaleTvEventLog) =>
        triggered ? (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
              isDark
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
            }`}
          >
            ✅ Đã phát
          </span>
        ) : (
          <Tooltip
            title={
              record.voiceErrorReason ||
              (record.eventReceived ? 'Âm thanh không được phát' : 'Sự kiện trước khi mở TV Monitor (Lịch sử)')
            }
          >
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold cursor-help ${
                record.eventReceived
                  ? isDark
                    ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                    : 'bg-rose-50 text-rose-800 border border-rose-300'
                  : isDark
                    ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    : 'bg-slate-100 text-slate-500 border border-slate-300'
              }`}
            >
              {record.eventReceived ? '❌ Lỗi phát' : '⏸️ Không phát'}
            </span>
          </Tooltip>
        ),
    },
    {
      title: (
        <span className="flex items-center gap-1 text-[11px]">
          <Sparkles className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
          Overlay
        </span>
      ),
      dataIndex: 'overlayTriggered',
      key: 'overlayTriggered',
      width: 110,
      render: (triggered: boolean, record: TelesaleTvEventLog) =>
        triggered ? (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
              isDark
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
            }`}
          >
            ✅ Đã hiện
          </span>
        ) : (
          <Tooltip
            title={
              record.overlayErrorReason ||
              (record.eventReceived ? 'Banner không hiển thị' : 'Sự kiện trước khi mở TV Monitor (Lịch sử)')
            }
          >
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold cursor-help ${
                record.eventReceived
                  ? isDark
                    ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                    : 'bg-rose-50 text-rose-800 border border-rose-300'
                  : isDark
                    ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    : 'bg-slate-100 text-slate-500 border border-slate-300'
              }`}
            >
              {record.eventReceived ? '❌ Không hiện' : '⏸️ Không hiện'}
            </span>
          </Tooltip>
        ),
    },
    {
      title: 'Trạng thái cuối & Lý do',
      dataIndex: 'status',
      key: 'status',
      render: (status: 'SUCCESS' | 'ERROR', record: TelesaleTvEventLog) => {
        const isSuccess = status === 'SUCCESS';
        return (
          <div className="flex flex-col gap-0.5">
            <div>
              {isSuccess ? (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                    isDark
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-600/50'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                  }`}
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  {record.eventReceived ? 'Thành công' : 'Ghi nhận'}
                </span>
              ) : (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                    isDark
                      ? 'bg-rose-950/80 text-rose-400 border border-rose-600/50'
                      : 'bg-rose-50 text-rose-700 border border-rose-300'
                  }`}
                >
                  <XCircle className={`w-3.5 h-3.5 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
                  Lỗi
                </span>
              )}
            </div>
            {!isSuccess && (record.errorMessage || record.voiceErrorReason || record.overlayErrorReason) && (
              <span
                className={`text-[11px] font-mono line-clamp-1 ${isDark ? 'text-rose-300/90' : 'text-rose-600'}`}
                title={record.errorMessage || record.voiceErrorReason || record.overlayErrorReason || ''}
              >
                {record.errorMessage || record.voiceErrorReason || record.overlayErrorReason}
              </span>
            )}
            {isSuccess && !record.eventReceived && (
              <span
                className={`text-[10px] font-mono line-clamp-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}
                title="Sự kiện lịch sử (phát sinh trước khi mở TV Monitor)"
              >
                Lịch sử ca làm
              </span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <AdaptiveModal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1080}
      centered
      zIndex={zIndex}
      className="tv-journal-modal"
      title={null}
      destroyOnHidden
      intent="detail"
    >
      <div
        className={`-m-6 p-6 rounded-2xl border flex flex-col gap-5 select-none font-sans transition-colors ${
          isDark ? 'bg-zinc-950 text-zinc-100 border-zinc-800' : 'bg-white text-slate-800 border-slate-200'
        }`}
      >
        {/* 1. HEADER */}
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 ${
            isDark ? 'border-zinc-800' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-700 p-0.5 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
              <div
                className={`w-full h-full rounded-[10px] flex items-center justify-center ${
                  isDark ? 'bg-zinc-950' : 'bg-white'
                }`}
              >
                <ClipboardList className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  className={`text-base sm:text-lg font-black tracking-tight m-0 ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}
                >
                  NHẬT KÝ TV MONITOR · GIÁM SÁT LIVE EVENTS
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    isDark
                      ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}
                >
                  MANAGER / ADMIN
                </span>
              </div>
              <p className={`text-xs m-0 mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Kiểm tra từng bước xử lý sự kiện: Tiếp nhận TV → Kích hoạt Voice → Kích hoạt Overlay
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Tooltip title="Làm mới lịch sử sự kiện">
              <Button
                type="text"
                icon={
                  <RotateCw
                    className={`w-4 h-4 ${isDark ? 'text-zinc-300' : 'text-slate-600'} ${
                      loading ? 'animate-spin' : ''
                    }`}
                  />
                }
                onClick={() => fetchJournal(selectedDate)}
                className={`!rounded-xl !h-9 !w-9 !p-0 flex items-center justify-center border transition-all ${
                  isDark
                    ? '!text-zinc-300 hover:!bg-zinc-800 border-zinc-700'
                    : '!text-slate-600 hover:!bg-slate-100 border-slate-300 shadow-sm'
                }`}
              />
            </Tooltip>
            <Button
              onClick={onClose}
              className={`rounded-xl text-xs h-9 px-3 font-semibold border transition-all ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 shadow-sm'
              }`}
            >
              Đóng
            </Button>
          </div>
        </div>

        {/* 2. TOP OVERVIEW SUMMARY (4 METRIC CARDS) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Card 1: Tổng Live Event */}
          <div
            className={`rounded-xl p-3 border flex flex-col justify-between transition-colors ${
              isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className={`flex items-center justify-between text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              <span>Tổng Live Events</span>
              <Flame className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div
              className={`text-2xl font-black font-mono tabular-nums mt-1 ${
                isDark ? 'text-amber-300' : 'text-amber-700'
              }`}
            >
              {journalData?.totalEvents ?? 0}
            </div>
            <div className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              Sự kiện trong ngày
            </div>
          </div>

          {/* Card 2: Voice thành công / lỗi */}
          <div
            className={`rounded-xl p-3 border flex flex-col justify-between transition-colors ${
              isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className={`flex items-center justify-between text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              <span>Loa / Voice TTS</span>
              <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`text-xl font-black font-mono tabular-nums ${
                  isDark ? 'text-emerald-400' : 'text-emerald-600'
                }`}
              >
                {journalData?.voiceSuccess ?? 0}
              </span>
              <span className={`text-xs font-mono ${isDark ? 'text-zinc-400' : 'text-slate-400'}`}>/</span>
              <span
                className={`text-xl font-black font-mono tabular-nums ${isDark ? 'text-rose-400' : 'text-rose-600'}`}
              >
                {journalData?.voiceError ?? 0}
              </span>
            </div>
            <div className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              <span className={`${isDark ? 'text-emerald-400' : 'text-emerald-600'} font-bold`}>
                {journalData?.voiceSuccess ?? 0} thành công
              </span>{' '}
              ·{' '}
              <span className={`${isDark ? 'text-rose-400' : 'text-rose-600'} font-bold`}>
                {journalData?.voiceError ?? 0} lỗi
              </span>
            </div>
          </div>

          {/* Card 3: Overlay thành công / lỗi */}
          <div
            className={`rounded-xl p-3 border flex flex-col justify-between transition-colors ${
              isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className={`flex items-center justify-between text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              <span>Celebration Overlay</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`text-xl font-black font-mono tabular-nums ${
                  isDark ? 'text-emerald-400' : 'text-emerald-600'
                }`}
              >
                {journalData?.overlaySuccess ?? 0}
              </span>
              <span className={`text-xs font-mono ${isDark ? 'text-zinc-400' : 'text-slate-400'}`}>/</span>
              <span
                className={`text-xl font-black font-mono tabular-nums ${isDark ? 'text-rose-400' : 'text-rose-600'}`}
              >
                {journalData?.overlayError ?? 0}
              </span>
            </div>
            <div className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              <span className={`${isDark ? 'text-emerald-400' : 'text-emerald-600'} font-bold`}>
                {journalData?.overlaySuccess ?? 0} thành công
              </span>{' '}
              ·{' '}
              <span className={`${isDark ? 'text-rose-400' : 'text-rose-600'} font-bold`}>
                {journalData?.overlayError ?? 0} lỗi
              </span>
            </div>
          </div>

          {/* Card 4: Sự kiện gần nhất */}
          <div
            className={`rounded-xl p-3 border flex flex-col justify-between transition-colors ${
              isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className={`flex items-center justify-between text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              <span>Sự kiện gần nhất</span>
              <Clock className="w-3.5 h-3.5 text-sky-500" />
            </div>
            <div
              className={`text-lg font-black font-mono tabular-nums mt-1 truncate ${
                isDark ? 'text-sky-300' : 'text-sky-700'
              }`}
            >
              {latestTimeFormatted}
            </div>
            <div className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              Thời điểm phát sinh
            </div>
          </div>
        </div>

        {/* 3. FILTERS TOOLBAR */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border transition-colors ${
            isDark ? 'bg-zinc-900/70 border-zinc-800/80' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date filter */}
            <div className="flex items-center gap-1.5">
              <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                <Calendar className="w-3.5 h-3.5" />
                Ngày:
              </span>
              <DatePicker
                value={dayjs(selectedDate)}
                onChange={(d) => {
                  if (d) setSelectedDate(d.format('YYYY-MM-DD'));
                }}
                allowClear={false}
                className={
                  isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-100 rounded-lg text-xs h-8' : 'rounded-lg text-xs h-8'
                }
              />
              {selectedDate !== dayjs().format('YYYY-MM-DD') && (
                <Button
                  size="small"
                  onClick={() => setSelectedDate(dayjs().format('YYYY-MM-DD'))}
                  className={`text-[11px] h-8 rounded-lg ${
                    isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
                      : 'bg-white border-slate-300 text-slate-700 shadow-sm'
                  }`}
                >
                  Hôm nay
                </Button>
              )}
            </div>

            {/* Staff filter */}
            <div className="flex items-center gap-1.5">
              <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                <Users className="w-3.5 h-3.5" />
                Nhân viên:
              </span>
              <Select
                value={staffFilter}
                onChange={setStaffFilter}
                className="w-36 text-xs h-8"
                options={[
                  { label: 'Tất cả nhân viên', value: 'ALL' },
                  ...staffList.map((s) => ({ label: s.name, value: String(s.legacyStaffId) })),
                ]}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Event Type Filter */}
            <Segmented
              value={typeFilter}
              onChange={(val) => setTypeFilter(val as string)}
              className={isDark ? 'bg-zinc-950 border border-zinc-800 text-xs' : 'text-xs'}
              options={[
                { label: 'Tất cả', value: 'ALL' },
                { label: 'BOOK', value: 'BOOK' },
                { label: 'DONE', value: 'DONE' },
                { label: 'MILESTONE', value: 'MILESTONE' },
              ]}
            />

            {/* Status Filter */}
            <Segmented
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as string)}
              className={isDark ? 'bg-zinc-950 border border-zinc-800 text-xs' : 'text-xs'}
              options={[
                { label: 'Tất cả', value: 'ALL' },
                { label: '✅ Thành công', value: 'SUCCESS' },
                { label: '❌ Lỗi', value: 'ERROR' },
              ]}
            />
          </div>
        </div>

        {/* 4. MAIN EVENTS TABLE */}
        <div
          className={`rounded-xl border overflow-hidden transition-colors ${
            isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-slate-200'
          }`}
        >
          <DataTable
            dataSource={filteredEvents}
            columns={columns as any}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 8,
              showSizeChanger: false,
              className: `!m-3 ${isDark ? '!text-zinc-400' : '!text-slate-600'}`,
            }}
            locale={{
              emptyText: (
                <div className={`p-8 text-center ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                  <ClipboardList className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-zinc-600' : 'text-slate-300'}`} />
                  <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    Không có Live Event nào phù hợp với bộ lọc
                  </p>
                </div>
              ),
            }}
            size="middle"
            className="tv-journal-table"
          />
        </div>

        {/* 5. FOOTER INVARIANT NOTE */}
        <div
          className={`flex items-center justify-between text-[11px] border-t pt-3 ${
            isDark ? 'border-zinc-800/80 text-zinc-400' : 'border-slate-200 text-slate-500'
          }`}
        >
          <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
            <AlertCircle className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
            Nhật ký giám sát: Không tự động phát lại loa hoặc hiệu ứng khi xem báo cáo
          </span>
          <span className={`font-mono ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
            Hiển thị {filteredEvents.length} / {journalData?.totalEvents ?? 0} sự kiện
          </span>
        </div>
      </div>
    </AdaptiveModal>
  );
};
