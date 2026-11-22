'use client';

import React from 'react';
import { Button } from 'antd';
import { RefreshCw, Settings, X } from 'lucide-react';
import TelesalesAvatar from '../TelesalesAvatar';
import type { TelesalesBackThemeMode } from './telesalesBackFaceTypes';

export interface TelesalesBackHeaderProps {
  themeMode: TelesalesBackThemeMode;
  activeMember: SafeAny;
  isAdmin: boolean;
  onFlipToDonut: () => void;
  onOpenConfig: () => void;
  onClose: () => void;
}

export const TelesalesBackHeader: React.FC<TelesalesBackHeaderProps> = ({
  themeMode,
  activeMember,
  isAdmin,
  onFlipToDonut,
  onOpenConfig,
  onClose,
}) => {
  const isDark = themeMode === 'dark';

  return (
    <div
      className={`telesales-dashboard-header flex items-center justify-between p-4 border-b transition-colors ${
        isDark ? 'border-white/5 bg-white/[0.01]' : 'border-slate-100 bg-slate-50/40'
      }`}
    >
      <div className="flex items-center gap-3">
        <TelesalesAvatar member={activeMember} size="lg" className="shadow-lg shadow-black/10" />
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`font-bold text-base md:text-lg tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}
            >
              {activeMember?.name}
            </span>
            <span className="inline-flex items-center justify-center leading-none text-[10px] px-2.5 py-1 rounded-full bg-gold/15 text-gold font-bold border border-gold/20">
              Telesales
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
          </div>
          <div className={`text-[10px] flex items-center gap-1 mt-0.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            <span>Đang hoạt động</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="text"
          icon={<RefreshCw className="w-4 h-4 text-gold" />}
          onClick={onFlipToDonut}
          className="hover:bg-gold/10 flex items-center justify-center w-8 h-8 rounded-lg"
          title="Xoay lật sang biểu đồ Donut"
          aria-label="Xoay lật sang biểu đồ Donut"
        />
        {isAdmin && (
          <Button
            type="text"
            icon={<Settings className="w-4 h-4 text-gold" />}
            onClick={onOpenConfig}
            className="hover:bg-gold/10 flex items-center justify-center w-8 h-8 rounded-lg"
            title="Cấu hình Target & Nhân sự"
            aria-label="Cấu hình Target & Nhân sự"
          />
        )}
        <Button
          type="text"
          icon={
            <X
              className={`w-4 h-4 ${isDark ? 'text-gray-400 hover:text-red-500' : 'text-slate-500 hover:text-red-500'}`}
            />
          }
          aria-label="Đóng bảng điều khiển Telesales"
          onClick={onClose}
          className="hover:bg-red-500/10 flex items-center justify-center w-8 h-8 rounded-lg"
        />
      </div>
    </div>
  );
};
