'use client';

import React from 'react';
import { Button, Space } from 'antd';
import { Calendar, CheckCircle2, MessageSquare, XCircle } from 'lucide-react';
import { AppIcon } from '~/components/ui';
import type { QuickActionType } from './callLogModalTypes';

export interface QuickActionsPanelProps {
  isDark: boolean;
  loading: boolean;
  onQuickAction: (actionType: QuickActionType) => void;
}

export const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({ isDark, loading, onQuickAction }) => (
  <div
    className={`mb-4 mt-4 p-3 rounded-lg border ${
      isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-black/[0.01] border-black/[0.06]'
    }`}
  >
    <div className="flex items-center justify-between gap-2 mb-2">
      <span className={`text-xs font-semibold ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
        ⚡ GHI NHANH &amp; LƯU NGAY (1-CLICK):
      </span>
      <span className="text-[11px] text-zinc-400">Tự động điền &amp; lưu nhật ký tức thì</span>
    </div>

    <Space wrap size={[8, 8]}>
      <Button
        danger
        type="primary"
        icon={<AppIcon icon={XCircle} size={14} />}
        onClick={() => onQuickAction('NO_ANSWER')}
        loading={loading}
        disabled={loading}
        className="font-medium hover:scale-[1.02] active:scale-[0.98] transition-all"
      >
        Gọi Nhỡ (Lưu ngay)
      </Button>

      <Button
        color="purple"
        variant="outlined"
        icon={<AppIcon icon={MessageSquare} size={14} />}
        onClick={() => onQuickAction('NOTE_24H')}
        loading={loading}
        disabled={loading}
        className="font-medium hover:scale-[1.02] active:scale-[0.98] transition-all"
      >
        24h NT (Lưu ngay)
      </Button>

      <Button
        color="danger"
        variant="outlined"
        icon={<AppIcon icon={XCircle} size={14} />}
        onClick={() => onQuickAction('BUSY')}
        loading={loading}
        disabled={loading}
        className="font-medium hover:scale-[1.02] active:scale-[0.98] transition-all"
      >
        Máy Bận (Lưu ngay)
      </Button>

      <Button
        color="gold"
        variant="outlined"
        icon={<AppIcon icon={Calendar} size={14} />}
        onClick={() => onQuickAction('CALL_BACK')}
        loading={loading}
        disabled={loading}
        className="font-medium hover:scale-[1.02] active:scale-[0.98] transition-all"
      >
        Hẹn Gọi Lại
      </Button>

      <Button
        color="green"
        variant="solid"
        icon={<AppIcon icon={CheckCircle2} size={14} />}
        onClick={() => onQuickAction('BOOKED')}
        loading={loading}
        disabled={loading}
        className="font-medium hover:scale-[1.02] active:scale-[0.98] transition-all"
      >
        Đã Book Lịch
      </Button>
    </Space>
  </div>
);
