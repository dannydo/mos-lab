import React from 'react';
import { Button, Avatar, Segmented } from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  PhoneOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';

interface CallConfirmingProps {
  currentCall: SafeAny;
  isRegistered: boolean;
  isSimulated: boolean;
  setIsSimulated?: (simulated: boolean) => void;
  isDark: boolean;
  textColor: string;
  descColor: string;
  subBg: string;
  borderColor: string;
  executeCall: () => void;
  cancelConfirm: () => void;
}

export const CallConfirming: React.FC<CallConfirmingProps> = ({
  currentCall,
  isRegistered,
  isSimulated,
  setIsSimulated,
  isDark,
  textColor,
  descColor,
  subBg,
  borderColor,
  executeCall,
  cancelConfirm,
}) => {
  return (
    <div className="p-6 text-center space-y-4">
      <div className="flex justify-center relative">
        <div className="relative">
          <Avatar
            src={currentCall?.avatar || undefined}
            size={72}
            icon={!currentCall?.avatar ? <UserOutlined /> : undefined}
            style={{
              backgroundColor: '#D4A84B',
              color: 'black',
              boxShadow: '0 8px 24px rgba(212, 168, 75, 0.25)',
              border: `2px solid ${isDark ? '#27272a' : '#e4e4e7'}`,
            }}
            className="transition-all duration-300 hover:scale-[1.05]"
          />
          <span
            className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 ${isDark ? 'border-zinc-900' : 'border-white'} ${isRegistered || isSimulated ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}
          />
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest font-bold font-sans" style={{ color: descColor }}>
          Xác nhận cuộc gọi đi
        </p>
        <h4 className="text-lg font-extrabold mt-1" style={{ color: textColor }}>
          {currentCall?.name}
        </h4>
        <p className="text-sm font-semibold font-mono mt-0.5" style={{ color: descColor }}>
          {currentCall?.phone}
        </p>
      </div>

      {/* Mode Selector */}
      {setIsSimulated && (
        <div className="flex flex-col items-center gap-1">
          <div className="text-[11px] font-medium" style={{ color: descColor }}>
            Chế độ cuộc gọi:
          </div>
          <Segmented
            size="small"
            options={[
              {
                label: (
                  <div className="flex items-center gap-1 text-xs px-1">
                    <PhoneOutlined />
                    <span>SIP Thực tế</span>
                  </div>
                ),
                value: 'real',
              },
              {
                label: (
                  <div className="flex items-center gap-1 text-xs px-1">
                    <ExperimentOutlined />
                    <span>Mô phỏng (Test)</span>
                  </div>
                ),
                value: 'simulated',
              },
            ]}
            value={isSimulated ? 'simulated' : 'real'}
            onChange={(val) => setIsSimulated(val === 'simulated')}
          />
        </div>
      )}

      {/* Connection Status */}
      <div
        className="text-xs flex items-center justify-center gap-2 py-1 px-4 rounded-full mx-auto w-fit"
        style={{ background: subBg }}
      >
        {isRegistered || isSimulated ? (
          <>
            <CheckCircleOutlined className="text-emerald-500" />
            <span className="font-semibold text-emerald-500">
              {isSimulated ? 'Chế độ Mô phỏng (Sẵn sàng)' : 'Tổng đài SIP đã kết nối'}
            </span>
          </>
        ) : (
          <>
            <LoadingOutlined className="text-amber-500" />
            <span className="font-semibold text-amber-500">Đang kết nối tổng đài...</span>
          </>
        )}
      </div>

      <div className="flex justify-center gap-3 pt-1">
        <Button
          type="primary"
          shape="round"
          onClick={executeCall}
          disabled={!isRegistered && !isSimulated}
          loading={!isRegistered && !isSimulated}
          style={{
            background: isRegistered || isSimulated ? '#10b981' : undefined,
            borderColor: isRegistered || isSimulated ? '#10b981' : undefined,
            color: 'white',
          }}
          className="px-8 font-bold shadow-lg shadow-emerald-500/10 hover:scale-[1.02] active:scale-95 transition-all duration-300"
        >
          Gọi ngay
        </Button>
        <Button
          shape="round"
          onClick={cancelConfirm}
          className="px-6 font-bold hover:scale-[1.02] active:scale-95 transition-all duration-300"
          style={{
            background: isDark ? '#27272a' : '#f4f4f5',
            borderColor: borderColor,
            color: textColor,
          }}
        >
          Hủy
        </Button>
      </div>
    </div>
  );
};
export default CallConfirming;
