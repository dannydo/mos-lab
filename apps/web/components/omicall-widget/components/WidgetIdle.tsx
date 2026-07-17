import React from 'react';
import { PhoneOutlined } from '@ant-design/icons';

interface WidgetIdleProps {
  isSimulated: boolean;
  sipConfig: SafeAny;
  descColor: string;
  subBg: string;
  children?: React.ReactNode; // For AudioDeviceControls
}

export const WidgetIdle: React.FC<WidgetIdleProps> = ({ isSimulated, sipConfig, descColor, subBg, children }) => {
  return (
    <div className="p-6 text-center space-y-4">
      <div
        className="h-14 w-14 rounded-full flex items-center justify-center mx-auto text-emerald-500"
        style={{ background: subBg }}
      >
        <PhoneOutlined className="text-2xl" />
      </div>
      <div>
        <h4 className="text-sm font-bold">Tổng đài đang hoạt động</h4>
        {isSimulated ? (
          <p className="text-xs mt-1 text-amber-500 font-semibold">
            ⚠️ Chế độ mô phỏng. Cấu hình máy lẻ{' '}
            <a href="/dashboard/omicall" className="text-blue-500 underline hover:text-blue-600">
              tại đây
            </a>
            .
          </p>
        ) : (
          <p className="text-xs mt-1" style={{ color: descColor }}>
            Extension: <span className="font-bold text-amber-500">{sipConfig?.sipUser}</span> (Sẵn sàng nghe gọi)
          </p>
        )}
      </div>
      {children}
    </div>
  );
};
export default WidgetIdle;
