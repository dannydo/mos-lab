'use client';

import { Avatar } from 'antd';
import type { AcademyWorkshopGameLeaderboardEntry } from '@mos-lab/shared';
import { workshopInitials } from '~/lib/academy-workshop-live';

export interface LiveControlLeaderboardProps {
  entries: AcademyWorkshopGameLeaderboardEntry[];
}

export function LiveControlLeaderboard({ entries }: LiveControlLeaderboardProps) {
  return (
    <div>
      <div className="mb-2 font-semibold">BXH hiện tại</div>
      <div className="space-y-2">
        {entries.slice(0, 8).map((entry) => (
          <div key={entry.participantId} className="flex items-center gap-3 rounded-xl border border-inherit px-3 py-2">
            <strong className="w-8 text-center tabular-nums">#{entry.rank}</strong>
            <Avatar
              className="shrink-0 !bg-[var(--mos-accent-soft)] font-semibold !text-[var(--mos-accent)]"
              size={32}
              src={entry.avatarUrl || undefined}
            >
              {workshopInitials(entry.name)}
            </Avatar>
            <span className="flex-1 truncate">{entry.name}</span>
            <strong className="tabular-nums">{entry.score.toLocaleString('vi-VN')}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
