'use client';

import React from 'react';
import { Switch, theme } from 'antd';
import { MessageSquareWarning } from 'lucide-react';
import { useResponsiveTier } from '../../hooks/useResponsiveTier';
import { AppIcon } from '../ui';
import { useBugReportLauncherPreferences } from './useBugReportLauncherPreferences';

export default function BugReportProfileControl() {
  const { token } = theme.useToken();
  const responsiveTier = useResponsiveTier();
  const { preferences, ready, setVisible } = useBugReportLauncherPreferences();

  return (
    <section
      className={`${responsiveTier === 'mobile' ? 'w-52' : 'w-72'} space-y-3 px-3 py-3`}
      aria-label="Tùy chọn phản hồi mOS"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-start gap-3">
        <span
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: token.colorWarningBg, color: token.colorWarningText }}
        >
          <AppIcon icon={MessageSquareWarning} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">Phản hồi mOS</div>
          <div className="mt-1 text-xs leading-4" style={{ color: token.colorTextSecondary }}>
            Kéo icon đến vị trí thuận tiện; mOS sẽ nhớ sau khi tải lại.
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5"
        style={{ borderColor: token.colorBorderSecondary, background: token.colorFillAlter }}
      >
        <div className="min-w-0">
          <div className="text-sm font-medium">Hiển thị icon phản hồi</div>
          <div className="mt-0.5 text-xs leading-4" style={{ color: token.colorTextSecondary }}>
            Có thể bật lại bất cứ lúc nào từ menu này.
          </div>
        </div>
        <Switch
          checked={ready && preferences.visible}
          disabled={!ready}
          aria-label="Hiển thị icon phản hồi mOS"
          onChange={setVisible}
        />
      </div>
    </section>
  );
}
