'use client';

import React from 'react';
import { Button, Space, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { Clock, History, Phone, RefreshCw } from 'lucide-react';
import type { CustomerSmsHistoryItem } from '@mos-lab/shared';
import { AppIcon, StatePanel, StatusTag } from '~/components/ui';

export interface SmsHistoryPaneProps {
  history: CustomerSmsHistoryItem[];
  loadingHistory: boolean;
  isDark: boolean;
  onReload: () => void;
}

export const SmsHistoryPane: React.FC<SmsHistoryPaneProps> = ({ history, loadingHistory, isDark, onReload }) => (
  <div
    className={`md:col-span-5 p-4 rounded-xl border flex flex-col justify-between min-h-[440px] max-h-[520px] ${
      isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-200'
    }`}
  >
    <div>
      <div className="flex justify-between items-center mb-3">
        <Space>
          <AppIcon icon={History} size={15} className="text-amber-500" />
          <span className="font-bold text-sm">Lịch sử SMS</span>
          <StatusTag status="gold" label={history.length} className="tabular-nums font-bold" />
        </Space>
        <Tooltip title="Tải lại lịch sử">
          <Button
            type="text"
            size="small"
            aria-label="Tải lại lịch sử SMS"
            icon={<AppIcon icon={RefreshCw} size={12} className={loadingHistory ? 'animate-spin' : ''} />}
            onClick={onReload}
            loading={loadingHistory}
          />
        </Tooltip>
      </div>

      {loadingHistory ? (
        <StatePanel kind="loading" minHeight={200} surface={false} />
      ) : history.length === 0 ? (
        <StatePanel
          kind="empty"
          description={<span className="text-xs text-slate-400">Chưa có lịch sử SMS</span>}
          minHeight={200}
          surface={false}
        />
      ) : (
        <div className="overflow-y-auto max-h-[420px] pr-1 space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              className={`p-3 rounded-lg border text-xs transition-all ${
                isDark
                  ? 'bg-neutral-950 border-zinc-800 hover:border-amber-500/50'
                  : 'bg-white border-slate-200 hover:border-amber-400'
              }`}
            >
              <div className="flex justify-between items-center mb-1 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <AppIcon icon={Clock} size={10} />
                  <span className="tabular-nums font-semibold">
                    {dayjs(item.dateCreated).format('DD/MM/YYYY HH:mm')}
                  </span>
                </span>
                <StatusTag status="processing" label={item.createdStaffName || 'Nhân viên'} className="text-[10px]" />
              </div>
              <div
                className={`font-semibold mb-1 flex items-center gap-1 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}
              >
                <AppIcon icon={Phone} size={10} className="text-amber-500" />
                <span className="tabular-nums">{item.toPhoneNumber}</span>
              </div>
              <div
                className={`line-clamp-4 text-xs whitespace-pre-wrap leading-relaxed ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                {item.body}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);
