'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';
import type { CbDrilldownItem } from '@mos-lab/shared';
import { AdaptiveDrawer } from '~/components/ui';
import { formatVnd } from './cb-live-telemetry-utils';

interface CbDrilldownDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  loading: boolean;
  items: CbDrilldownItem[];
}

export function CbDrilldownDrawer({ open, onClose, title, loading, items }: CbDrilldownDrawerProps) {
  return (
    <AdaptiveDrawer
      title={title}
      open={open}
      onClose={onClose}
      width={560}
      closable={{ placement: 'end' }}
      className="dark-theme"
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-400 mb-2" />
          <p className="text-xs">Đang tải danh sách giao dịch chi tiết...</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs text-slate-400 font-mono tabular-nums">
            Hiển thị tối đa {items.length} giao dịch gần nhất
          </div>
          <div className="divide-y divide-slate-800">
            {items.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-200">
                    #{item.id} • {item.customerName || 'Khách hàng'}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                    {item.bookingDateStart.slice(0, 16)} • {item.storeName}
                  </div>
                  {item.details && <div className="text-[11px] text-blue-300/80 mt-0.5">{item.details}</div>}
                </div>
                <div className="text-right">
                  <div className="font-bold text-amber-300 font-mono tabular-nums">{formatVnd(item.amountNet)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AdaptiveDrawer>
  );
}
