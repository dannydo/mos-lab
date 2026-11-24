'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, message } from 'antd';
import { ExternalLink, Eye, Mic, RefreshCw, Smile, Sparkles, Volume2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { AppIcon, StatusTag, type StatusType } from '~/components/ui';
import {
  formatOmicallDuration,
  getAiStatusDescriptor,
  getCallStatusDescriptor,
  getHappyStatusDescriptor,
  resolveDisplayCallTime,
  type OmicallLogRow,
  type OmicallLogsApiResponse,
} from '~/app/dashboard/omicall/omicall-page-modules/omicallPageTypes';
import { apiClient } from '~/lib/api-client';

const QAPlayerDrawer = dynamic(() => import('../../QAPlayerDrawer').then((m) => m.QAPlayerDrawer), {
  ssr: false,
});

export interface CustomerOmicallRecordingsSectionProps {
  customerId: number;
  customerName?: string;
  themeMode: 'light' | 'dark';
}

function getSentimentBadgeStatus(sentiment?: string | null): StatusType {
  switch (String(sentiment || '').toUpperCase()) {
    case 'HAPPY':
    case 'SATISFIED':
      return 'success';
    case 'FRUSTRATED':
      return 'orange';
    case 'ANGRY':
      return 'error';
    default:
      return 'processing';
  }
}

export const CustomerOmicallRecordingsSection: React.FC<CustomerOmicallRecordingsSectionProps> = ({
  customerId,
  customerName,
  themeMode,
}) => {
  const isDark = themeMode === 'dark';
  const [logs, setLogs] = useState<OmicallLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [playingLogId, setPlayingLogId] = useState<number | null>(null);
  const [reanalyzingId, setReanalyzingId] = useState<number | null>(null);
  const [qaDrawerOpen, setQaDrawerOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);

  const reqIdRef = useRef(0);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      reqIdRef.current += 1;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    },
    []
  );

  const fetchCustomerLogs = useCallback(async () => {
    if (!customerId) return;
    const reqId = ++reqIdRef.current;
    setLoading(true);
    try {
      const data = (await apiClient.omicall.listLogs({
        legacyUserId: customerId,
        page: 1,
        limit: 20,
      })) as OmicallLogsApiResponse;
      if (reqId !== reqIdRef.current) return;
      setLogs(data.logs || []);
      setTotal(data.total ?? data.pagination?.total ?? (data.logs || []).length);
    } catch {
      if (reqId !== reqIdRef.current) return;
      setLogs([]);
      setTotal(0);
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void fetchCustomerLogs();
  }, [fetchCustomerLogs]);

  const handleReanalyze = useCallback(
    async (logId: number) => {
      try {
        setReanalyzingId(logId);
        await apiClient.omicall.reanalyzeLog(logId);
        message.success('Đã gửi cuộc gọi cho AI phân tích lại.');
        await fetchCustomerLogs();
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(() => {
          void fetchCustomerLogs();
        }, 6500);
      } catch {
        message.error('Không thể chạy phân tích AI cho cuộc gọi này');
      } finally {
        setReanalyzingId(null);
      }
    },
    [fetchCustomerLogs]
  );

  const fullHistoryHref = `/dashboard/omicall?legacyUserId=${customerId}${
    customerName ? `&customerName=${encodeURIComponent(customerName)}` : ''
  }`;

  return (
    <div
      className={`mb-4 rounded-lg border p-3.5 ${
        isDark ? 'border-slate-700 bg-slate-900/60' : 'border-amber-200 bg-amber-50/40'
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold">
          <AppIcon icon={Mic} size={15} className="text-amber-500" />
          <span className={isDark ? 'text-slate-100' : 'text-slate-900'}>
            Ghi âm &amp; Phân tích AI OmiCall ({total})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="small"
            icon={<AppIcon icon={RefreshCw} size={12} className={loading ? 'animate-spin' : ''} />}
            onClick={() => void fetchCustomerLogs()}
          >
            Làm mới
          </Button>
          <a
            href={fullHistoryHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-500 transition-colors hover:bg-amber-500/20"
          >
            <span>Mở trang OmiCall</span>
            <AppIcon icon={ExternalLink} size={12} />
          </a>
        </div>
      </div>

      {loading && logs.length === 0 ? (
        <div className={`py-3 text-center text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Đang tải ghi âm OmiCall...
        </div>
      ) : logs.length === 0 ? (
        <div className={`py-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Chưa ghi nhận cuộc gọi OmiCall nào cho khách hàng này.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {logs.map((log) => {
            const isInbound = String(log.direction || '').toLowerCase() === 'inbound';
            const displayPhone = isInbound ? log.sourceNumber || log.destinationNumber : log.destinationNumber;
            const talkSec = log.billSec && log.billSec > 0 ? log.billSec : log.duration;
            const callDescriptor = getCallStatusDescriptor(log.status);
            const aiDescriptor = getAiStatusDescriptor(log.analysisStatus);
            const happyDescriptor = getHappyStatusDescriptor(log.happyCallStatus);
            const qaTags = Array.isArray(log.qaTags) ? log.qaTags : [];
            const isPlaying = playingLogId === log.id;

            return (
              <div
                key={log.id}
                className={`rounded-lg border p-3 text-xs ${
                  isDark ? 'border-slate-700 bg-slate-800/80' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusTag status={isInbound ? 'processing' : 'default'} label={isInbound ? 'Gọi đến' : 'Gọi đi'} />
                    <StatusTag status={callDescriptor.status} label={callDescriptor.label} />
                    <span className="font-mono font-semibold tabular-nums">{displayPhone || 'N/A'}</span>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>·</span>
                    <span className="font-mono tabular-nums">{formatOmicallDuration(talkSec)}</span>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>·</span>
                    <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>
                      NV: <strong>{log.staffName || (log.staffId ? `Staff #${log.staffId}` : 'Chưa gán')}</strong>
                    </span>
                  </div>

                  <span className={`tabular-nums text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {new Date(resolveDisplayCallTime(log)).toLocaleString('vi-VN')}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <StatusTag status={aiDescriptor.status} label={`AI: ${aiDescriptor.label}`} />
                  {log.analysisStatus === 'DONE' && (
                    <StatusTag status={happyDescriptor.status} label={happyDescriptor.label} />
                  )}
                  {log.customerSatisfactionScore ? (
                    <span className="font-semibold tabular-nums text-amber-400">
                      ★ {log.customerSatisfactionScore}/5
                    </span>
                  ) : null}
                  {log.customerSentiment && (
                    <StatusTag status={getSentimentBadgeStatus(log.customerSentiment)} label={log.customerSentiment} />
                  )}
                  {log.laughCount > 0 && (
                    <StatusTag
                      status="purple"
                      icon={<AppIcon icon={Smile} size={11} />}
                      label={<span className="tabular-nums">{log.laughCount} cười</span>}
                    />
                  )}
                  {qaTags.map((tag) => (
                    <StatusTag
                      key={tag}
                      status={tag.toLowerCase().includes('khiếu nại') ? 'error' : 'default'}
                      label={tag}
                    />
                  ))}
                </div>

                {log.satisfactionAnalysis && (
                  <p
                    className={`mt-2 mb-0 text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
                  >
                    {log.satisfactionAnalysis}
                  </p>
                )}

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {log.recordingUrl ? (
                    <Button
                      size="small"
                      icon={<AppIcon icon={Volume2} size={13} />}
                      onClick={() => setPlayingLogId(isPlaying ? null : log.id)}
                    >
                      {isPlaying ? 'Đóng ghi âm' : 'Nghe ghi âm'}
                    </Button>
                  ) : (
                    <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      Chưa có file ghi âm
                    </span>
                  )}

                  {log.recordingUrl && (
                    <Button
                      size="small"
                      icon={<AppIcon icon={Sparkles} size={13} />}
                      loading={reanalyzingId === log.id}
                      onClick={() => void handleReanalyze(log.id)}
                    >
                      Phân tích AI
                    </Button>
                  )}

                  <Button
                    size="small"
                    type="primary"
                    icon={<AppIcon icon={Eye} size={13} />}
                    onClick={() => {
                      setSelectedLogId(log.id);
                      setQaDrawerOpen(true);
                    }}
                  >
                    Xem AI &amp; QA
                  </Button>
                </div>

                {isPlaying && log.recordingUrl && (
                  <div className="mt-2">
                    <audio controls autoPlay src={log.recordingUrl} className="h-8 w-full outline-none" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <QAPlayerDrawer
        open={qaDrawerOpen}
        omicallLogId={selectedLogId}
        onClose={() => setQaDrawerOpen(false)}
        onVerifySuccess={() => void fetchCustomerLogs()}
      />
    </div>
  );
};

CustomerOmicallRecordingsSection.displayName = 'CustomerOmicallRecordingsSection';
