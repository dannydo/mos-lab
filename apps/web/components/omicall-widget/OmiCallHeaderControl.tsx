'use client';

import React from 'react';
import { Button, Switch, theme } from 'antd';
import { PhoneCall, Radio } from 'lucide-react';
import { useOmiCall } from '../../context/OmiCallContext';
import { useResponsiveTier } from '../../hooks/useResponsiveTier';
import { AppIcon } from '../ui';

function getCallStatus({
  isRegistered,
  omicallReady,
  callState,
}: Pick<ReturnType<typeof useOmiCall>, 'isRegistered' | 'omicallReady' | 'callState'>) {
  if (callState === 'connected') return 'Đang trong cuộc gọi';
  if (callState === 'incoming') return 'Có cuộc gọi đến';
  if (callState === 'ringing') return 'Đang đổ chuông';
  if (callState === 'confirming') return 'Sẵn sàng gọi ra';
  if (isRegistered) return 'Sẵn sàng nhận cuộc gọi';
  if (omicallReady) return 'Đang kết nối tổng đài';
  return 'Chưa bật nhận cuộc gọi';
}

/**
 * A compact OmiCall section for the user-profile menu. It deliberately owns
 * only presentation and user preference; SIP state stays in OmiCallProvider.
 */
export default function OmiCallProfileControl() {
  const { token } = theme.useToken();
  const responsiveTier = useResponsiveTier();
  const isMobileTier = responsiveTier === 'mobile';
  const {
    isRegistered,
    callState,
    omicallReady,
    setOmicallReady,
    floatingLauncherVisible,
    setFloatingLauncherVisible,
  } = useOmiCall();

  const status = getCallStatus({ isRegistered, omicallReady, callState });
  const statusColor =
    callState === 'incoming' || callState === 'ringing' || callState === 'connected'
      ? token.colorError
      : isRegistered
        ? token.colorSuccess
        : token.colorWarning;

  return (
    <section
      className={`${isMobileTier ? 'w-52' : 'w-72'} space-y-4 px-3 py-3`}
      aria-label="Tùy chọn cuộc gọi OmiCall"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-start gap-3">
        <span
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: token.colorPrimaryBg, color: token.colorPrimary }}
        >
          <AppIcon icon={PhoneCall} />
        </span>
        <div className="min-w-0">
          <div className="font-semibold">Cuộc gọi OmiCall</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs leading-4" style={{ color: token.colorTextSecondary }}>
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: statusColor }} />
            <span>{status}</span>
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5"
        style={{ borderColor: token.colorBorderSecondary, background: token.colorFillAlter }}
      >
        <div className="min-w-0">
          <div className="text-sm font-medium">Hiển thị nút gọi nổi</div>
          <div className="mt-0.5 text-xs leading-4" style={{ color: token.colorTextSecondary }}>
            Ẩn để góc màn hình gọn hơn; luôn bật lại được từ đây.
          </div>
        </div>
        <Switch
          checked={floatingLauncherVisible}
          aria-label="Hiển thị nút gọi nổi OmiCall"
          onChange={setFloatingLauncherVisible}
        />
      </div>

      <Button
        block
        type={omicallReady ? 'default' : 'primary'}
        danger={omicallReady}
        icon={<AppIcon icon={Radio} />}
        onClick={() => setOmicallReady(!omicallReady)}
      >
        {omicallReady ? 'Tắt nhận cuộc gọi' : 'Bật nhận cuộc gọi'}
      </Button>
    </section>
  );
}
