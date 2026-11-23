'use client';

import { Button } from 'antd';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MonitorUp, QrCode, Wifi, WifiOff } from 'lucide-react';
import type { AcademyWorkshopDetail } from '@mos-lab/shared';
import { AppIcon, IconText, StatusTag } from '~/components/ui';
import AcademyWorkshopSharedQrButton from '~/app/dashboard/academy-leads/components/AcademyWorkshopSharedQrButton';

export interface LiveControlHeaderActionsProps {
  detail: AcademyWorkshopDetail;
  showJoinQrOnDisplay: boolean;
  connected: boolean;
  busy: boolean;
  onToggleLeaderboardQr: () => Promise<void> | void;
}

export function LiveControlHeaderActions({
  detail,
  showJoinQrOnDisplay,
  connected,
  busy,
  onToggleLeaderboardQr,
}: LiveControlHeaderActionsProps) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={() => router.push(`/dashboard/academy-leads/workshops/${detail.slug}`)}>
        <IconText icon={<AppIcon icon={ArrowLeft} />}>Workspace</IconText>
      </Button>
      <Button onClick={() => router.push(`/dashboard/academy-leads/workshops/${detail.slug}?tab=agenda`)}>
        Quản lý agenda
      </Button>
      <AcademyWorkshopSharedQrButton workshopName={detail.name} joinUrl={detail.sharedJoinUrl} label="QR học viên" />
      <Button
        type={showJoinQrOnDisplay ? 'primary' : 'default'}
        loading={busy}
        onClick={() => void onToggleLeaderboardQr()}
      >
        <IconText icon={<AppIcon icon={QrCode} />}>
          {showJoinQrOnDisplay ? 'Ẩn QR trên BXH' : 'Hiện QR trên BXH'}
        </IconText>
      </Button>
      <Button onClick={() => window.open(`/academy/workshops/display/${detail.displayCode}`, '_blank')}>
        <IconText icon={<AppIcon icon={MonitorUp} />}>Leaderboard</IconText>
      </Button>
      <StatusTag
        className="!h-8 !px-3 min-w-[135px] justify-center tabular-nums"
        status={connected ? 'success' : 'orange'}
        label={
          <IconText gap={4} icon={<AppIcon icon={connected ? Wifi : WifiOff} />} textClassName="leading-none">
            {connected ? 'Live' : 'Fallback REST'}
          </IconText>
        }
      />
    </div>
  );
}
