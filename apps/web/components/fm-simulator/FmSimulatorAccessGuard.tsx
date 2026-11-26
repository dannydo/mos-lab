'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { canAccessFmSimulator } from '@mos-lab/shared';
import { useDashboardAuthAndGuard } from '../layout/useDashboardAuthAndGuard';

export function FmSimulatorAccessGuard({
  guardPathname,
  children,
}: {
  readonly guardPathname: string;
  readonly children: React.ReactNode;
}) {
  const { user, loading } = useDashboardAuthAndGuard(guardPathname);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-neutral-100 dark:bg-black">
        <div className="text-xs font-medium text-neutral-400">Đang kiểm tra quyền...</div>
      </div>
    );
  }

  if (!canAccessFmSimulator(user?.role, user?.teamCodes)) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-neutral-100 px-6 text-center dark:bg-black">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-xs dark:bg-neutral-900">
          <Lock className="h-5 w-5 text-neutral-500" />
        </span>
        <h1 className="text-base font-semibold text-neutral-900 dark:text-white">Không có quyền truy cập</h1>
        <p className="max-w-xs text-xs text-neutral-500 dark:text-neutral-400">
          Chỉ dành cho CC, CVL, CVLL, FM &amp; Admin.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
