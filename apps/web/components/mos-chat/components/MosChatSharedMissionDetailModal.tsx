'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button } from 'antd';
import { ExternalLink, FileText, Loader2, MapPin, Rocket, User, X } from 'lucide-react';
import {
  isAdminOrSuperAdminRole,
  type MosChatMissionSummary,
  type SharedMosChatMissionPreview,
  type SafeAny,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { openBugReport } from '../../../lib/bug-diagnostics';
import { safeStorage } from '../../../lib/safe-storage';
import { AdaptiveModal } from '../../ui';
import { RichTextViewer } from '../../ui/rich-text';

export interface MosChatSharedMissionDetailModalProps {
  open: boolean;
  reportId: number;
  fallbackMission?: MosChatMissionSummary | null;
  isDark: boolean;
  onClose: () => void;
}

/**
 * Read-only detail preview modal when clicking a shared ticket / mOS Mission card
 * inside mOS Chat (allows non-admin teammates in the conversation to inspect the request).
 */
export const MosChatSharedMissionDetailModal: React.FC<MosChatSharedMissionDetailModalProps> = ({
  open,
  reportId,
  fallbackMission,
  isDark,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<SharedMosChatMissionPreview | null>(null);

  const currentUser = useMemo<SafeAny>(() => {
    try {
      const raw = safeStorage.getItem('mos_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!open || !reportId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    void apiClient.chat
      .getSharedMissionPreview(reportId)
      .then((res) => {
        if (cancelled) return;
        if (res?.data) {
          setPreview(res.data);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : null;
        setError(msg || 'Không thể tải đầy đủ thông tin yêu cầu.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, reportId]);

  const activeMission = preview?.mission || fallbackMission || null;
  const ticketKey = preview?.key || activeMission?.key || `MSN-${reportId}`;
  const isAdmin = isAdminOrSuperAdminRole(currentUser?.role);
  const isReporter = Boolean(
    currentUser?.id &&
    (preview?.reporterStaffId
      ? Number(currentUser.id) === Number(preview.reporterStaffId)
      : activeMission?.reporterStaffId
        ? Number(currentUser.id) === Number(activeMission.reporterStaffId)
        : false)
  );

  return (
    <AdaptiveModal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      destroyOnHidden
      intent="detail"
      zIndex={1580}
      width={600}
      wrapClassName={isDark ? 'dark-theme' : 'light-theme'}
      closable={{
        closeIcon: (
          <span
            aria-label="Đóng chi tiết yêu cầu"
            className={`inline-flex items-center justify-center p-1 rounded-lg ${
              isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <X size={16} />
          </span>
        ),
      }}
      styles={{
        content: {
          padding: 0,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: isDark ? 'rgb(20, 20, 20)' : 'rgb(255, 255, 255)',
          border: isDark ? '1px solid rgb(42, 42, 47)' : '1px solid rgb(226, 232, 240)',
        },
        body: {
          padding: 0,
          overscrollBehavior: 'contain',
        },
      }}
      title={null}
    >
      <div
        className={`flex flex-col max-h-[85vh] ${isDark ? 'bg-[#141414] text-slate-100' : 'bg-white text-slate-900'}`}
      >
        {/* Header */}
        <div
          className={`px-4 py-3.5 border-b flex items-center justify-between gap-3 pr-11 ${
            isDark ? 'border-zinc-800 bg-zinc-900' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold"
              style={{
                background: 'rgba(212, 168, 75, 0.2)',
                color: '#d4a84b',
                border: '1px solid rgba(212, 168, 75, 0.4)',
              }}
            >
              <Rocket size={12} />
              <span>mOS MISSION · #{ticketKey}</span>
            </span>
            {activeMission?.stageLabel && (
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                  isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-500/15 text-purple-700'
                }`}
              >
                {activeMission.stageLabel}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-3.5 overflow-y-auto overscroll-contain flex-1">
          <h2 className={`text-[15.5px] font-bold leading-snug m-0 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {preview?.title || activeMission?.title || `Yêu cầu #${reportId}`}
          </h2>

          <div className={`flex flex-wrap items-center gap-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {(preview?.reporterName || activeMission?.reporterName) && (
              <span className="inline-flex items-center gap-1">
                <User size={13} />
                <span>Người gửi: {preview?.reporterName || activeMission?.reporterName}</span>
              </span>
            )}
            {preview?.sourcePath && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} />
                <code className="text-[11px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10">
                  {preview.sourcePath}
                </code>
              </span>
            )}
          </div>

          {activeMission?.humanStatusSummary && (
            <div
              className={`rounded-xl p-3 border text-xs leading-relaxed ${
                isDark
                  ? 'bg-slate-900/70 border-zinc-800 text-slate-200'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              {activeMission.humanStatusSummary}
            </div>
          )}

          {loading ? (
            <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 size={16} className="animate-spin text-amber-500" />
              <span>Đang tải nội dung chi tiết…</span>
            </div>
          ) : error ? (
            <Alert type="warning" showIcon message={error} />
          ) : preview?.description ? (
            <div
              className={`rounded-xl p-3 border space-y-1.5 ${
                isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-slate-200'
              }`}
            >
              <div
                className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                <FileText size={12} />
                <span>Nội dung yêu cầu</span>
              </div>
              <div className="text-sm leading-relaxed">
                <RichTextViewer content={preview.description} />
              </div>
            </div>
          ) : null}

          {preview?.resolutionSummary && (
            <div
              className={`rounded-xl p-3 border space-y-1 ${
                isDark
                  ? 'bg-emerald-950/30 border-emerald-700/40 text-emerald-200'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="text-[11px] font-bold uppercase tracking-wide">Kết quả xử lý</div>
              <div className="text-xs leading-relaxed">{preview.resolutionSummary}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-4 py-3 border-t flex flex-wrap items-center justify-end gap-2 ${
            isDark ? 'border-zinc-800 bg-zinc-900' : 'border-slate-200 bg-slate-50'
          }`}
        >
          {isReporter && (
            <Button
              onClick={() => {
                onClose();
                openBugReport(undefined, { historyKey: ticketKey });
              }}
            >
              Mở trong Yêu cầu của tôi
            </Button>
          )}
          {isAdmin && (
            <Button
              type="primary"
              href={`/dashboard/bug-reports?reportId=${reportId}`}
              icon={<ExternalLink size={13} />}
            >
              Mở trên mOS Mission
            </Button>
          )}
          <Button onClick={onClose}>Đóng</Button>
        </div>
      </div>
    </AdaptiveModal>
  );
};
