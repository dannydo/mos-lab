import React from 'react';
import { Button, Space } from 'antd';
import { PhoneOutlined, RollbackOutlined, CloseOutlined } from '@ant-design/icons';
import { useOmiCall } from '../../../context/OmiCallContext';

interface WrapupPanelProps {
  isDark: boolean;
  textColor: string;
  descColor: string;
  borderColor: string;
  subBg: string;
  formatDuration: (secs: number) => string;
}

export const WrapupPanel: React.FC<WrapupPanelProps> = ({
  isDark,
  textColor,
  descColor,
  borderColor,
  subBg,
  formatDuration,
}) => {
  const {
    currentCall,
    callDuration,
    openCallLogModal,
    setCallState,
    setCurrentCall,
    setResolvedLog,
    isCallLogModalOpen,
  } = useOmiCall();

  const handleReopen = () => {
    if (currentCall) {
      openCallLogModal({
        legacyUserId: currentCall.legacyUserId || 0,
        customerName: currentCall.name,
        planId: currentCall.planId || null,
      });
    }
  };

  const handleDismiss = () => {
    setCallState('idle');
    setCurrentCall(null);
    setResolvedLog(null);
  };

  return (
    <div className="p-5 space-y-4 text-center">
      <div className="flex flex-col items-center justify-center space-y-2">
        <div className="h-10 w-10 rounded-full flex items-center justify-center bg-zinc-500/10 text-zinc-500">
          <PhoneOutlined className="text-lg rotate-135" />
        </div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Cuộc gọi kết thúc</h4>
        <p className="text-xs font-semibold" style={{ color: textColor }}>
          Thời lượng đàm thoại: <span className="font-mono">{formatDuration(callDuration)}</span>
        </p>
      </div>

      <div
        className="p-3.5 rounded-lg border text-[11px] text-zinc-400 text-left space-y-1.5"
        style={{ background: subBg, borderColor }}
      >
        <p className="font-semibold" style={{ color: textColor }}>
          Khách hàng: {currentCall?.name || 'Khách hàng'}
        </p>
        <p>Vui lòng hoàn thành ghi nhận lịch sử cuộc gọi trong bảng hiển thị trên màn hình chính của bạn.</p>
      </div>

      <Space direction="vertical" className="w-full pt-2">
        {!isCallLogModalOpen && (
          <Button
            type="primary"
            icon={<RollbackOutlined />}
            onClick={handleReopen}
            className="w-full text-xs"
            style={{ background: '#D4A84B', borderColor: '#D4A84B', color: 'black', fontWeight: 'bold' }}
          >
            Mở lại bảng ghi nhận
          </Button>
        )}
        <Button icon={<CloseOutlined />} onClick={handleDismiss} className="w-full text-xs" danger type="text">
          Đóng cuộc gọi
        </Button>
      </Space>
    </div>
  );
};

export default WrapupPanel;
