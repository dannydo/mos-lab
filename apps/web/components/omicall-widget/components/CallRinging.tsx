import React from 'react';
import { Button } from 'antd';
import { PhoneOutlined, CloseOutlined } from '@ant-design/icons';

interface CallRingingProps {
  currentCall: SafeAny;
  isSimulated: boolean;
  descColor: string;
  hangUp: () => void;
  children?: React.ReactNode;
}

export const CallRinging: React.FC<CallRingingProps> = ({ currentCall, isSimulated, descColor, hangUp, children }) => {
  return (
    <div className="p-6 text-center space-y-5 relative overflow-hidden h-full flex flex-col justify-between">
      <div className="h-14 w-14 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400 animate-bounce">
        <PhoneOutlined className="text-2xl" />
      </div>
      <div>
        {isSimulated ? (
          <p className="text-xs uppercase tracking-widest font-semibold text-amber-500">
            MÔ PHỎNG: Tự kết nối sau 2s...
          </p>
        ) : (
          <p className="text-xs uppercase tracking-widest font-semibold text-amber-500">Đang đổ chuông...</p>
        )}
        <h4 className="text-base font-bold mt-1">{currentCall?.name}</h4>
        <p className="text-xs font-mono" style={{ color: descColor }}>
          {currentCall?.phone}
        </p>
      </div>
      {children}
      <div className="flex justify-center">
        <Button
          danger
          type="primary"
          shape="round"
          icon={<CloseOutlined />}
          onClick={hangUp}
          className="px-6 font-semibold"
        >
          Hủy gọi
        </Button>
      </div>
    </div>
  );
};
export default CallRinging;
