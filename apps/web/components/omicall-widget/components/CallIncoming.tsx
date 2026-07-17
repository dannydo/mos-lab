import React from 'react';
import { Button } from 'antd';
import { PhoneOutlined, CloseOutlined } from '@ant-design/icons';

interface CallIncomingProps {
  currentCall: SafeAny;
  descColor: string;
  answerCall: () => void;
  rejectCall: () => void;
  children?: React.ReactNode;
}

export const CallIncoming: React.FC<CallIncomingProps> = ({
  currentCall,
  descColor,
  answerCall,
  rejectCall,
  children,
}) => {
  return (
    <div className="p-6 text-center space-y-5">
      <div className="h-14 w-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500 animate-bounce">
        <PhoneOutlined className="text-2xl" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest font-semibold text-amber-500">Cuộc gọi đến...</p>
        <h4 className="text-base font-bold mt-1">{currentCall?.name}</h4>
        <p className="text-xs font-mono" style={{ color: descColor }}>
          {currentCall?.phone}
        </p>
      </div>
      {children}
      <div className="flex justify-center gap-4">
        <Button
          type="primary"
          shape="round"
          onClick={answerCall}
          style={{ background: '#10b981', borderColor: '#10b981', color: 'white' }}
          className="px-6 font-semibold"
        >
          Nghe máy
        </Button>
        <Button
          danger
          type="primary"
          shape="round"
          icon={<CloseOutlined />}
          onClick={rejectCall}
          className="px-6 font-semibold"
        >
          Từ chối
        </Button>
      </div>
    </div>
  );
};
export default CallIncoming;
