import React from 'react';
import { PhoneOutlined, PoweroffOutlined, PlayCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useOmiCall } from '../../../context/OmiCallContext';
import { playRingtone } from '../../../context/omicall/useAudioManager';
import { triggerIncomingNotification } from '../../../context/omicall/incomingNotification';

interface WidgetIdleProps {
  isSimulated: boolean;
  sipConfig: SafeAny;
  descColor: string;
  subBg: string;
  children?: React.ReactNode; // For AudioDeviceControls
  lastRegisterEvent?: SafeAny;
}

export const WidgetIdle: React.FC<WidgetIdleProps> = ({
  isSimulated,
  sipConfig,
  descColor,
  subBg,
  children,
  lastRegisterEvent,
}) => {
  const { setOmicallReady, setCallState, setCurrentCall } = useOmiCall();

  const handleSimulateIncoming = () => {
    setCallState('incoming');
    const mockPhone = '0901234567';
    setCurrentCall({
      phone: mockPhone,
      name: 'Khách hàng giả lập (Danny Do)',
      direction: 'inbound',
      callUuid: 'simulated-inbound-' + Date.now(),
      sdkUid: 'simulated-inbound-uid',
    });
    playRingtone();
    triggerIncomingNotification(mockPhone);
  };

  return (
    <div className="p-6 text-center space-y-5 flex flex-col justify-between h-full relative overflow-hidden">
      <div className="space-y-4">
        {/* Radar concentric animation */}
        <div className="relative flex items-center justify-center h-20 w-20 mx-auto my-1">
          <span
            className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping"
            style={{ animationDuration: '3s' }}
          />
          <span
            className="absolute inset-2 rounded-full bg-emerald-500/10 animate-pulse"
            style={{ animationDuration: '2s' }}
          />
          <div
            className="h-14 w-14 rounded-full flex items-center justify-center relative z-10 border shadow-[0_4px_16px_rgba(16,185,129,0.25)] transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(20, 184, 166, 0.15))',
              borderColor: 'rgba(16, 185, 129, 0.3)',
            }}
          >
            <PhoneOutlined className="text-2xl text-emerald-500 animate-bounce" style={{ animationDuration: '2.5s' }} />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-extrabold tracking-tight">Tổng đài đang hoạt động</h4>

          {isSimulated ? (
            <div className="flex items-start gap-2.5 p-3 rounded-xl border text-left bg-amber-500/10 dark:bg-amber-500/5 border-amber-500/20 shadow-sm mt-3">
              <InfoCircleOutlined className="text-amber-500 mt-0.5 text-sm" />
              <div className="text-xs">
                <span className="font-bold text-amber-500">Chế độ mô phỏng</span>
                {sipConfig?.sipUser ? (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-normal">
                    Lỗi kết nối. Đang mô phỏng cho máy lẻ{' '}
                    <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">{sipConfig.sipUser}</span>.
                    Vui lòng{' '}
                    <button
                      onClick={() => window.location.reload()}
                      className="text-blue-500 hover:underline font-semibold bg-transparent border-none p-0 cursor-pointer"
                    >
                      reload
                    </button>{' '}
                    để kết nối lại.
                    {lastRegisterEvent && (
                      <span className="block mt-1.5 font-mono text-[9px] text-red-500/80 bg-red-500/5 border border-red-500/10 p-1 rounded">
                        Chi tiết: {lastRegisterEvent.status || 'unknown'}
                        {lastRegisterEvent.message ? ` (${lastRegisterEvent.message})` : ''}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-normal">
                    Chưa cấu hình máy lẻ. Bạn có thể thiết lập{' '}
                    <a
                      href="/dashboard/omicall"
                      className="text-blue-500 hover:text-blue-600 underline font-semibold transition-colors"
                    >
                      tại đây
                    </a>
                    .
                    {lastRegisterEvent && (
                      <span className="block mt-1.5 font-mono text-[9px] text-red-500/80 bg-red-500/5 border border-red-500/10 p-1 rounded">
                        Chi tiết: {lastRegisterEvent.status || 'unknown'}
                        {lastRegisterEvent.message ? ` (${lastRegisterEvent.message})` : ''}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10 mt-3">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[11px] font-medium" style={{ color: descColor }}>
                Sẵn sàng: <span className="font-bold text-emerald-500 font-mono">{sipConfig?.sipUser}</span>
              </p>
            </div>
          )}
        </div>

        {isSimulated && (
          <div className="pt-1">
            <Button
              type="primary"
              block
              icon={<PlayCircleOutlined className="animate-pulse" />}
              onClick={handleSimulateIncoming}
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                borderColor: 'transparent',
                color: 'white',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
              }}
              className="hover:scale-[1.02] hover:shadow-orange-500/30 transition-all duration-300 ease-in-out border-0 rounded-xl h-9 flex items-center justify-center"
            >
              Giả lập cuộc gọi đến
            </Button>
          </div>
        )}
      </div>

      <div className="pt-2 flex flex-col items-center gap-4">
        <Button
          danger
          type="text"
          size="small"
          icon={<PoweroffOutlined />}
          onClick={() => setOmicallReady(false)}
          className="px-4 py-1.5 h-auto text-[11px] font-bold border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-500 text-red-500/80 rounded-full transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-1.5"
        >
          Tắt nhận cuộc gọi
        </Button>
        {children}
      </div>
    </div>
  );
};
export default WidgetIdle;
