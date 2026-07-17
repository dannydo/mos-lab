import React from 'react';
import { SyncOutlined } from '@ant-design/icons';

interface TabMutedProps {
  descColor: string;
  subBg: string;
}

export const TabMuted: React.FC<TabMutedProps> = ({ descColor, subBg }) => {
  return (
    <div className="p-6 text-center space-y-4">
      <div
        className="h-14 w-14 rounded-full flex items-center justify-center mx-auto text-amber-500"
        style={{ background: subBg }}
      >
        <SyncOutlined spin className="text-2xl" />
      </div>
      <div>
        <h4 className="text-sm font-bold">Cuộc gọi đang diễn ra ở tab khác</h4>
        <p className="text-xs mt-1" style={{ color: descColor }}>
          Hệ thống đã khóa các thao tác gọi điện ở tab này để tránh xung đột.
        </p>
      </div>
    </div>
  );
};
export default TabMuted;
