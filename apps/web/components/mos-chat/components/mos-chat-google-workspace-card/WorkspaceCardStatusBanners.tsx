'use client';

import React from 'react';
import { Copy, ExternalLink, Loader2, Lock, RefreshCw, ShieldAlert } from 'lucide-react';
import type { MosChatGoogleWorkspaceAccessStatus, MosChatGoogleWorkspacePreviewResponse } from '@mos-lab/shared';

export interface WorkspaceCardStatusBannersProps {
  isDark: boolean;
  isCanva: boolean;
  loading: boolean;
  error: string | null;
  data: MosChatGoogleWorkspacePreviewResponse | null;
  accessStatus?: MosChatGoogleWorkspaceAccessStatus;
  canonicalUrl: string;
  copiedBotEmail: boolean;
  onReload: () => void;
  onCopyBotEmail: (email: string) => void;
}

export const WorkspaceCardStatusBanners: React.FC<WorkspaceCardStatusBannersProps> = ({
  isDark,
  isCanva,
  loading,
  error,
  data,
  accessStatus,
  canonicalUrl,
  copiedBotEmail,
  onReload,
  onCopyBotEmail,
}) => {
  const needsShareBoxClass = isDark
    ? 'bg-amber-500/10 border-amber-500/30 text-amber-100'
    : 'bg-amber-50 border-amber-300 text-amber-950';
  const needsShareDescClass = isDark ? 'text-amber-200/80' : 'text-amber-900/80';
  const shareLinkClass = isDark
    ? 'border-amber-400/35 text-amber-200 hover:bg-amber-500/15'
    : 'border-amber-400 text-amber-900 hover:bg-amber-100';
  const reloadBtnClass = isDark
    ? 'border-slate-700 text-slate-200 hover:bg-white/10'
    : 'border-slate-300 text-slate-700 hover:bg-slate-100';

  return (
    <>
      {loading && !data && (
        <div
          className={`flex items-center gap-2 py-2 px-1 text-[11.5px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
        >
          <Loader2 size={14} className={`animate-spin ${isCanva ? 'text-violet-400' : 'text-emerald-500'}`} />
          <span>{isCanva ? 'Đang đọc thiết kế từ Canva...' : 'Đang đọc dữ liệu trực tiếp từ Google Workspace...'}</span>
        </div>
      )}

      {error && !data && (
        <div className="flex items-center justify-between gap-2 text-[11.5px] text-rose-400 px-1 py-1">
          <span className="truncate">{error}</span>
          <button
            type="button"
            onClick={onReload}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-rose-500/30 hover:bg-rose-500/10 cursor-pointer shrink-0 font-semibold"
          >
            <RefreshCw size={11} />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {data && accessStatus === 'NEEDS_SHARE' && isCanva && (
        <div className={`rounded-lg p-2.5 space-y-2 border ${needsShareBoxClass}`}>
          <div className="flex items-start gap-2 text-[11.5px] leading-relaxed">
            <Lock size={14} className="shrink-0 mt-0.5 text-amber-500" />
            <div>
              <div className="font-bold">Thiết kế Canva đang bật chế độ riêng tư</div>
              <div className={needsShareDescClass}>
                Để xem trực tiếp trong mOS Chat, hãy mở thiết kế trên Canva → bấm <b>Chia sẻ (Share)</b> → đổi quyền
                liên kết thành <b>Bất kỳ ai có liên kết (Anyone with the link) → Xem</b>, rồi bấm <b>Thử tải lại</b>.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${shareLinkClass}`}
            >
              <ExternalLink size={11} />
              <span>Mở trên Canva</span>
            </a>
            <button
              type="button"
              onClick={onReload}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border cursor-pointer ${reloadBtnClass}`}
            >
              <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
              <span>Thử tải lại</span>
            </button>
          </div>
        </div>
      )}

      {data && accessStatus === 'NEEDS_SHARE' && !isCanva && (
        <div className={`rounded-lg p-2.5 space-y-2 border ${needsShareBoxClass}`}>
          <div className="flex items-start gap-2 text-[11.5px] leading-relaxed">
            <Lock size={14} className="shrink-0 mt-0.5 text-amber-500" />
            <div>
              <div className="font-bold">Tài liệu đang bật chế độ riêng tư</div>
              <div className={needsShareDescClass}>
                Để xem trực tiếp trong mOS Chat mà không cần đăng nhập từng tài khoản Google, hãy chia sẻ quyền Xem cho
                mOS Bot:
              </div>
            </div>
          </div>
          <div
            className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border text-[11px] font-mono ${
              isDark ? 'bg-slate-950/60 border-amber-500/25' : 'bg-white border-amber-300'
            }`}
          >
            <span className="truncate select-all">{data.serviceAccountEmail}</span>
            <button
              type="button"
              onClick={() => onCopyBotEmail(data.serviceAccountEmail)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-sans font-bold cursor-pointer shrink-0 ${
                isDark ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' : 'bg-amber-600 text-white hover:bg-amber-700'
              }`}
            >
              <Copy size={11} />
              <span>{copiedBotEmail ? 'Đã sao chép' : 'Sao chép email mOS Bot'}</span>
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${shareLinkClass}`}
            >
              <ExternalLink size={11} />
              <span>Mở Google để chia sẻ</span>
            </a>
            <button
              type="button"
              onClick={onReload}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border cursor-pointer ${reloadBtnClass}`}
            >
              <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
              <span>Thử tải lại</span>
            </button>
          </div>
        </div>
      )}

      {data && accessStatus === 'RESTRICTED_ROLE' && (
        <div
          className={`rounded-lg p-2.5 flex items-start gap-2 border text-[11.5px] ${
            isDark ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <ShieldAlert size={14} className="shrink-0 mt-0.5 text-rose-500" />
          <div className="flex-1 min-w-0">
            <div className="font-bold">Tài liệu nội bộ được bảo vệ theo vai trò (Điều răn UI-011)</div>
            <div className="opacity-85 mt-0.5">
              {data.statusMessage ||
                'Tài liệu nội bộ đọc qua Service Account chỉ mở xem khi quản lý/admin gửi trong phòng hoặc tài khoản của bạn có quyền xem.'}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
