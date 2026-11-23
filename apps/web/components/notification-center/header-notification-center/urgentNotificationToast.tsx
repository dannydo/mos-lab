'use client';

import { Button, notification } from 'antd';
import { Sparkles } from 'lucide-react';
import type { MosNotificationItem } from '@mos-lab/shared';
import { cleanNotificationTitle, cleanSummaryText } from './notificationHelpers';

export function showUrgentApprovalToast(
  item: MosNotificationItem,
  isDark: boolean,
  onOpenItem: (target: MosNotificationItem) => void
): void {
  notification.open({
    className: isDark
      ? 'mos-dark-toast rounded-xl border border-neutral-700 bg-neutral-900 text-neutral-100 shadow-2xl'
      : 'mos-light-toast rounded-xl border border-neutral-200 bg-white text-neutral-900 shadow-lg',
    message: (
      <span className="font-semibold text-amber-500 flex items-center gap-1.5 text-sm">
        <Sparkles size={16} /> {cleanNotificationTitle(item.title)}
      </span>
    ),
    description: (
      <div className={`text-xs mt-1 line-clamp-2 ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
        {cleanSummaryText(item.summary)}
      </div>
    ),
    placement: 'topRight',
    duration: 6,
    onClick: () => {
      notification.destroy();
      onOpenItem(item);
    },
    btn: (
      <Button
        type="primary"
        size="small"
        className="bg-amber-600 hover:bg-amber-500 border-none text-xs rounded-md text-white font-medium"
        onClick={() => {
          notification.destroy();
          onOpenItem(item);
        }}
      >
        Mở việc ngay
      </Button>
    ),
  });
}
