'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { AppIcon, SectionCard } from '~/components/ui';

export function LocaAccessDeniedCard() {
  return (
    <SectionCard className="mt-6 text-center">
      <div className="flex flex-col items-center justify-center gap-3 py-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
          <AppIcon icon={ShieldAlert} size={28} />
        </div>
        <h2 className="m-0 text-xl font-bold text-[var(--mos-text)]">403 - Không Có Quyền Truy Cập</h2>
        <p className="m-0 text-sm text-[var(--mos-text-secondary)]">
          Chiến dịch LoCa chỉ dành cho các nhóm vận hành được cấp quyền.
        </p>
      </div>
    </SectionCard>
  );
}
