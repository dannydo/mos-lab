'use client';

import React from 'react';
import { Divider } from 'antd';
import { RefreshCw } from 'lucide-react';
import { AppIcon, StatusTag } from '~/components/ui';
import { formatCallDuration, getSentimentStatus, isCallAnalyzing, parseLaughTimestamps } from './callLogModalHelpers';
import type { ResolvedCallLog } from './callLogModalTypes';

export interface CallAiAnalysisPanelProps {
  callDuration: number;
  resolvedLog: ResolvedCallLog | null;
  isDark: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

export const CallAiAnalysisPanel: React.FC<CallAiAnalysisPanelProps> = ({
  callDuration,
  resolvedLog,
  isDark,
  audioRef,
}) => {
  const analyzing = isCallAnalyzing(resolvedLog);
  const laughs = parseLaughTimestamps(resolvedLog?.laughTimestamps);
  const score = resolvedLog?.customerSatisfactionScore || 0;

  return (
    <div className="my-4">
      <Divider className={`my-3.5 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`} />
      <div className={`mb-2 text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
        KẾT QUẢ CUỘC GỌI OMICALL &amp; PHÂN TÍCH AI:
      </div>

      {analyzing ? (
        <div className="p-3 rounded-lg border border-amber-500/15 bg-amber-500/[0.04] text-xs flex flex-col gap-1 items-center justify-center text-amber-500 text-center">
          <div className="flex items-center gap-2">
            <AppIcon icon={RefreshCw} size={13} className="animate-spin" />
            <span className="font-bold">🤖 AI đang phân tích cuộc gọi ngầm...</span>
          </div>
          <span className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Booker có thể ghi chú và bấm lưu luôn mà không cần chờ.
          </span>
        </div>
      ) : resolvedLog?.analysisStatus === 'DONE' ? (
        <div
          className={`p-3.5 rounded-lg border text-xs space-y-3 ${
            isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-100/60 border-zinc-200'
          }`}
        >
          {/* Laughter & CSAT Score */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className={`font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Điểm hài lòng (CSAT)</span>
              <div className="flex items-center gap-0.5 mt-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="text-base">
                    {i < score ? '★' : '☆'}
                  </span>
                ))}
                <span
                  className={`text-[10px] ml-1 font-bold tabular-nums ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}
                >
                  ({score}/5) - Thời lượng: {formatCallDuration(callDuration)}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className={`font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Thái độ KH</span>
              <StatusTag
                status={getSentimentStatus(resolvedLog.customerSentiment)}
                className="mt-0.5 font-bold text-[10px] px-1.5 py-0.5"
                label={resolvedLog.customerSentiment || 'NEUTRAL'}
              />
            </div>
          </div>

          {/* Satisfaction Analysis Detail */}
          {resolvedLog.satisfactionAnalysis && (
            <div
              className={`text-[10.5px] border-t pt-2 ${
                isDark ? 'border-zinc-800 text-zinc-400' : 'border-zinc-200 text-zinc-600'
              }`}
            >
              <span className="font-bold text-zinc-400">Phân tích:</span> {resolvedLog.satisfactionAnalysis}
            </div>
          )}

          {/* Laughter Breakdown */}
          <div className={`border-t pt-2 space-y-1.5 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
            <div className="flex justify-between items-center text-[10.5px]">
              <span>
                👤 Khách hàng cười: <strong className="tabular-nums">{resolvedLog.laughCountCustomer || 0}</strong> lần
              </span>
              <span>
                🎧 Nhân viên cười: <strong className="tabular-nums">{resolvedLog.laughCountAgent || 0}</strong> lần
              </span>
            </div>

            {laughs.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {laughs.map((l, i) => {
                  const isCustomer = l.speaker === 'customer';
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        if (audioRef.current) {
                          audioRef.current.currentTime = l.start;
                          audioRef.current.play().catch(() => {});
                        }
                      }}
                      className={`cursor-pointer rounded border text-[10px] font-mono tabular-nums hover:opacity-85 active:scale-95 transition-all py-0.5 px-1.5 ${
                        isCustomer
                          ? isDark
                            ? 'bg-purple-950/70 border-purple-500/40 text-purple-200'
                            : 'bg-purple-50 border-purple-300 text-purple-700'
                          : isDark
                            ? 'bg-blue-950/70 border-blue-500/40 text-blue-200'
                            : 'bg-blue-50 border-blue-300 text-blue-700'
                      }`}
                    >
                      😂 {isCustomer ? 'KH' : 'NV'}: {Math.floor(l.start)}s
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Audio player element */}
          {resolvedLog.recordingUrl && (
            <div className={`border-t pt-2 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <audio ref={audioRef} src={resolvedLog.recordingUrl} controls className="w-full h-7 mt-1 outline-none" />
            </div>
          )}
        </div>
      ) : resolvedLog?.analysisStatus === 'FAILED' ? (
        <div
          className={`p-3 rounded-lg border text-xs flex flex-col gap-1 items-center justify-center text-zinc-400 text-center ${
            isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-100/60 border-zinc-200'
          }`}
        >
          <span>⚠️ Không thể tự động phân tích cuộc gọi này.</span>
          {resolvedLog.analysisError && <span className="text-[10px] opacity-75">{resolvedLog.analysisError}</span>}
        </div>
      ) : null}
    </div>
  );
};
