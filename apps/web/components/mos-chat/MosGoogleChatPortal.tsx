'use client';

import React from 'react';
import { Tooltip, message as antdMessageStatic, notification as notificationStatic, theme } from 'antd';
import { Lock } from 'lucide-react';
import { hexToRgba, isCvRole, type SafeAny } from '@mos-lab/shared';
import { useTheme } from '../../context/ThemeContext';
import { MosChatDesktopMainColumn } from './components/MosChatDesktopMainColumn';
import { MosChatDesktopOverlays } from './components/MosChatDesktopOverlays';
import { MosChatDesktopSidebarPane } from './components/MosChatDesktopSidebarPane';
import { MosChatDesktopThreadAndWorkspace } from './components/MosChatDesktopThreadAndDrawers';
import { MosChatPortalModalStack } from './components/MosChatPortalModalStack';
import { AI_COPILOT_CONV_ID } from './constants/chat-constants';
import { MosChatProvider } from './context/MosChatContext';
import { usePortalStateWiring } from './hooks/usePortalStateWiring';
import { MosChatMobileApp } from './mobile/MosChatMobileApp';
import type { MosChatActiveSubtab } from './types/mos-chat-types';

export { AI_COPILOT_CONV_ID };

export interface MosGoogleChatPortalProps {
  open: boolean;
  standalone?: boolean;
  onOpen?: () => void;
  onClose: () => void;
  onToggle: () => void;
  currentUser?: SafeAny;
  onAccessChange?: (canAccess: boolean) => void;
  onUnreadCountChange?: (unreadCount: number, activeTaskCount: number) => void;
  targetNavigation?: {
    conversationId?: string;
    messageId?: string;
    timestamp?: number;
    openTab?: MosChatActiveSubtab;
    taskId?: string;
    /** Permalink: open this exact AI Copilot (MAI) session. */
    aiSessionId?: string;
  } | null;
}

export const MosGoogleChatPortal: React.FC<MosGoogleChatPortalProps> = ({
  open,
  standalone = false,
  onOpen,
  onClose,
  onToggle,
  currentUser,
  onAccessChange,
  onUnreadCountChange,
  targetNavigation,
}) => {
  const { themeMode, activeThemeDefinition } = useTheme();
  const { token } = theme.useToken();
  const isDark = themeMode === 'dark';
  const [antdMessage, messageContextHolder] = antdMessageStatic.useMessage();
  const [notification, notificationContextHolder] = notificationStatic.useNotification({
    maxCount: 3, // Anti-flooding: max 3 toasts visible simultaneously
  });

  const activeMode =
    activeThemeDefinition.modes[themeMode] ?? activeThemeDefinition.modes[activeThemeDefinition.defaultMode];
  const currentModeColors = activeMode.colors;
  const currentModeSemantic = activeMode.semantic;
  const surfaceBg = currentModeSemantic.surface;
  const surfaceRaised = currentModeSemantic.surfaceRaised;
  const canvasBg = currentModeColors.bgLayout;
  const borderColor = currentModeSemantic.border;
  const borderStrong = currentModeSemantic.borderStrong;
  const accentColor = currentModeSemantic.accent;
  const accentContrast = currentModeSemantic.accentContrast;
  const accentSoftBg = hexToRgba(accentColor, isDark ? 0.16 : 0.12);
  const accentBorder = hexToRgba(accentColor, isDark ? 0.38 : 0.34);

  const portal = usePortalStateWiring({
    open,
    standalone,
    onOpen,
    onClose,
    onToggle,
    currentUser,
    onAccessChange,
    onUnreadCountChange,
    targetNavigation,
    isDark,
    token,
    surfaceBg,
    surfaceRaised,
    borderColor,
    borderStrong,
    accentColor,
    accentContrast,
    antdMessage,
    notification,
  });

  const { layout } = portal;

  if (!portal.aiAccess.canUserAccessChat) {
    if (standalone) {
      const isCv = isCvRole(currentUser?.role);
      return (
        <div className="w-full h-screen bg-[#090d16] flex flex-col items-center justify-center p-6 text-center text-slate-300">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 border border-amber-500/20 shadow-md">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Chưa được cấp quyền truy cập mOS Chat</h2>
          <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
            Tài khoản của bạn ({currentUser?.displayName || currentUser?.username || 'nhân sự'}) hiện chưa được quản trị
            viên mở quyền tham gia mOS Chat nội bộ. Vui lòng liên hệ Admin để được cấp quyền.
          </p>
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.opener) {
                window.close();
              } else if (typeof window !== 'undefined') {
                window.location.href = isCv ? '/dashboard/cv' : '/dashboard';
              }
            }}
            className="px-5 py-2.5 rounded-xl bg-amber-400 text-black font-bold text-sm hover:bg-amber-300 active:scale-95 transition-all cursor-pointer shadow-lg"
          >
            Quay lại mOS Dashboard
          </button>
        </div>
      );
    }
    return null;
  }

  return (
    <>
      {messageContextHolder}
      {notificationContextHolder}
      <input
        ref={portal.attachments.fileInputRef}
        type="file"
        accept="image/*,.heic,.heif,.HEIC,.HEIF,video/*,.mp4,.webm,.mov,.m4v,.MP4,.WEBM,.MOV,.M4V,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,.zip,.rar,.7z"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            const target = portal.attachments.uploadTargetRef.current;
            void portal.attachments.handleProcessImageFiles(e.target.files, 'upload', target.scope, target.convId);
          }
        }}
      />

      {!standalone && (
        <div
          aria-hidden="true"
          data-testid="mos-chat-backdrop"
          onClick={() => {
            if (layout.isResizingTarget || layout.justFinishedResizingRef.current) return;
            onClose?.();
          }}
          className={`fixed inset-0 transition-opacity duration-300 ${
            open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: layout.isMobile ? 1190 : 990,
          }}
        />
      )}

      <section
        aria-label="mOS Google Chat Workspace"
        className="mos-chat-theme-scope"
        style={{
          position: 'fixed',
          top: standalone ? 0 : layout.isMobile ? 0 : 52,
          right: 0,
          bottom: 0,
          left: standalone || layout.isMobile ? 0 : undefined,
          width: standalone
            ? '100vw'
            : layout.isMobile
              ? '100vw'
              : layout.maximized
                ? 'calc(100vw - 224px)'
                : layout.panelWidth,
          maxWidth: standalone ? '100vw' : layout.isMobile ? '100vw' : 'calc(100vw - 56px)',
          background: surfaceBg,
          color: token.colorText,
          borderLeft:
            standalone || layout.isMobile
              ? 'none'
              : `1px solid ${layout.isResizingTarget === 'panel' || layout.hoverResizeHandle === 'panel' ? accentColor : borderStrong}`,
          boxShadow: standalone ? 'none' : 'var(--mos-shadow)',
          display: 'flex',
          zIndex: standalone ? 100 : layout.isMobile ? 1200 : 995,
          transform: standalone || open ? 'translateX(0)' : 'translateX(104%)',
          transition: layout.isResizingTarget
            ? 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
            : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), width 0.2s ease',
        }}
      >
        {!standalone && !layout.isMobile && (
          <Tooltip
            title="Kéo sang trái/phải để thay đổi kích thước khung Chat (Tự động lưu riêng cho bạn · Nhấp đúp để đặt lại mặc định)"
            placement="left"
            mouseEnterDelay={0.5}
          >
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Kéo để thay đổi chiều rộng khung Chat"
              data-no-chat-autofocus="true"
              onMouseEnter={() => layout.setHoverResizeHandle('panel')}
              onMouseLeave={() => layout.setHoverResizeHandle((prev) => (prev === 'panel' ? null : prev))}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (layout.maximized && typeof window !== 'undefined') {
                  const maxAllowed = Math.max(520, window.innerWidth - 56);
                  const nextW = Math.max(520, Math.min(maxAllowed, Math.round(window.innerWidth - e.clientX)));
                  layout.maximizedRef.current = false;
                  layout.panelWidthRef.current = nextW;
                  layout.setMaximized(false);
                  layout.setPanelWidth(nextW);
                  layout.persistPersonalLayout({ maximized: false, panelWidth: nextW });
                }
                layout.setIsResizingTarget('panel');
              }}
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const resetW = typeof window !== 'undefined' && window.innerWidth >= 1920 ? 1080 : 960;
                layout.maximizedRef.current = false;
                layout.panelWidthRef.current = resetW;
                layout.setMaximized(false);
                layout.setPanelWidth(resetW);
                layout.persistPersonalLayout({ maximized: false, panelWidth: resetW });
              }}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: -5,
                width: 10,
                cursor: 'ew-resize',
                zIndex: 35,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                className="rounded-full transition-all"
                style={{
                  width: layout.isResizingTarget === 'panel' || layout.hoverResizeHandle === 'panel' ? 4 : 2,
                  height: layout.isResizingTarget === 'panel' || layout.hoverResizeHandle === 'panel' ? 56 : 36,
                  background:
                    layout.isResizingTarget === 'panel' || layout.hoverResizeHandle === 'panel'
                      ? accentColor
                      : isDark
                        ? 'rgba(148, 163, 184, 0.32)'
                        : 'rgba(100, 116, 139, 0.28)',
                  boxShadow: layout.isResizingTarget === 'panel' ? `0 0 10px ${accentBorder}` : 'none',
                }}
              />
              {layout.isResizingTarget === 'panel' && (
                <div
                  className="px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums shadow-lg pointer-events-none"
                  style={{
                    position: 'absolute',
                    left: -64,
                    background: surfaceRaised,
                    color: accentColor,
                    border: `1px solid ${accentBorder}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {layout.panelWidth}px
                </div>
              )}
            </div>
          </Tooltip>
        )}

        {layout.isMobile ? (
          <div className="w-full h-full flex flex-col relative bg-slate-950">
            <MosChatProvider
              currentUser={currentUser}
              initialConvId={layout.activeConvId}
              onUnreadCountChange={onUnreadCountChange}
            >
              <MosChatMobileApp
                standalone={false}
                onClose={onClose}
                onStartVoiceCall={(cid) => void portal.realtime.voiceCall.startOrJoinVoiceCall(cid)}
              />
            </MosChatProvider>
          </div>
        ) : (
          <>
            <MosChatDesktopSidebarPane
              isDark={isDark}
              token={token}
              surfaceBg={surfaceBg}
              surfaceRaised={surfaceRaised}
              borderColor={borderColor}
              accentColor={accentColor}
              currentUser={currentUser}
              onClose={onClose}
              {...portal}
            />

            <MosChatDesktopMainColumn
              standalone={standalone}
              isDark={isDark}
              token={token}
              antdMessage={antdMessage}
              surfaceBg={surfaceBg}
              surfaceRaised={surfaceRaised}
              canvasBg={canvasBg}
              borderColor={borderColor}
              borderStrong={borderStrong}
              accentSoftBg={accentSoftBg}
              accentBorder={accentBorder}
              currentUser={currentUser}
              onClose={onClose}
              {...portal}
            />

            <MosChatDesktopThreadAndWorkspace
              open={open}
              standalone={standalone}
              isDark={isDark}
              token={token}
              antdMessage={antdMessage}
              surfaceBg={surfaceBg}
              surfaceRaised={surfaceRaised}
              canvasBg={canvasBg}
              borderColor={borderColor}
              borderStrong={borderStrong}
              accentColor={accentColor}
              accentSoftBg={accentSoftBg}
              accentBorder={accentBorder}
              currentUser={currentUser}
              {...portal}
            />
          </>
        )}
      </section>

      <MosChatDesktopOverlays
        isDark={isDark}
        token={token}
        surfaceBg={surfaceBg}
        surfaceRaised={surfaceRaised}
        canvasBg={canvasBg}
        borderColor={borderColor}
        borderStrong={borderStrong}
        accentColor={accentColor}
        accentSoftBg={accentSoftBg}
        accentBorder={accentBorder}
        accentContrast={accentContrast}
        currentUser={currentUser}
        onToggle={onToggle}
        {...portal}
      />

      <MosChatPortalModalStack
        isDark={isDark}
        themeMode={themeMode}
        token={token}
        surfaceBg={surfaceBg}
        surfaceRaised={surfaceRaised}
        canvasBg={canvasBg}
        borderColor={borderColor}
        borderStrong={borderStrong}
        accentColor={accentColor}
        currentUser={currentUser}
        {...portal}
      />
    </>
  );
};

export default MosGoogleChatPortal;
