'use client';

import React from 'react';
import { Tooltip } from 'antd';
import {
  MIN_GW_DRAWER_WIDTH,
  MOS_CHAT_GW_DRAWER_SESSION_KEY,
  MOS_CHAT_GW_DRAWER_WIDTH_KEY,
  type MosChatGoogleWorkspaceDrawerProps,
  clampGwDrawerWidth,
  getMaxAllowedGwDrawerWidth,
} from './google-workspace-drawer/gwDrawerUtils';
import { useGwDrawerController } from './google-workspace-drawer/useGwDrawerController';
import { GwDrawerHeaderAndToolbar } from './google-workspace-drawer/GwDrawerHeaderAndToolbar';
import { GwDrawerViewport } from './google-workspace-drawer/GwDrawerViewport';
import { GwDrawerSheetTabsBar } from './google-workspace-drawer/GwDrawerFastSheetView';

export {
  MOS_CHAT_GW_DRAWER_WIDTH_KEY,
  MOS_CHAT_GW_DRAWER_SESSION_KEY,
  getMaxAllowedGwDrawerWidth,
  clampGwDrawerWidth,
  type MosChatGoogleWorkspaceDrawerProps,
};

export const MosChatGoogleWorkspaceDrawer: React.FC<MosChatGoogleWorkspaceDrawerProps> = React.memo(
  ({
    isMobile = false,
    isDark,
    activeConversationId,
    portalOpen = true,
    surfaceBg,
    surfaceRaised,
    canvasBg,
    borderColor,
    onEnsureContainerWidth,
    onPostAiReplyToChat,
  }) => {
    const ctrl = useGwDrawerController({
      isMobile,
      activeConversationId,
      portalOpen,
      onEnsureContainerWidth,
    });

    if (!ctrl.open || !ctrl.payload) return null;

    const bgSurface = surfaceBg || (isDark ? '#0f172a' : '#ffffff');
    const bgRaised = surfaceRaised || (isDark ? '#1e293b' : '#f8fafc');
    const bgCanvas = canvasBg || (isDark ? '#020617' : '#f1f5f9');
    const bColor = borderColor || (isDark ? 'rgba(148, 163, 184, 0.22)' : 'rgba(203, 213, 225, 0.9)');
    const docTitle =
      ctrl.data?.title || (ctrl.isSheet ? 'Google Sheets' : ctrl.isCanva ? 'Thiết kế Canva' : 'Google Docs');
    const canonicalHref = ctrl.data?.canonicalUrl || ctrl.parsedUrl?.canonicalUrl || ctrl.payload.url;
    const embedHref = ctrl.data?.embedUrl || ctrl.parsedUrl?.embedUrl || ctrl.payload.url;

    const hasBottomSheetTabs =
      ctrl.readerMode === 'fast' && ctrl.isSheet && Boolean(ctrl.data?.tabs && ctrl.data.tabs.length > 0);
    const mobileHorizontalSafeClass = isMobile
      ? 'pl-[max(env(safe-area-inset-left,0px),12px)] pr-[max(env(safe-area-inset-right,0px),12px)]'
      : 'px-3';

    const containerClass = isMobile
      ? 'fixed inset-0 z-[1700] flex flex-col w-full h-[100dvh]'
      : 'flex flex-col shrink-0 h-full relative';

    const containerStyle: React.CSSProperties = isMobile
      ? { background: bgSurface, color: isDark ? '#f8fafc' : '#0f172a' }
      : {
          width: ctrl.drawerWidth,
          minWidth: MIN_GW_DRAWER_WIDTH,
          maxWidth: 'calc(100% - 240px)',
          background: bgSurface,
          borderLeft: `1px solid ${ctrl.isResizing || ctrl.hoverResizeHandle ? '#d4a84b' : bColor}`,
          color: isDark ? '#f8fafc' : '#0f172a',
          transition: ctrl.isResizing ? 'none' : 'width 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        };

    return (
      <aside
        data-testid="google-workspace-split-drawer"
        aria-label={ctrl.isCanva ? 'Trình đọc thiết kế Canva' : 'Trình đọc tài liệu Google Workspace'}
        className={containerClass}
        style={containerStyle}
      >
        {!isMobile && (
          <div className="sr-only" aria-live="polite">
            {ctrl.liveAnnouncement}
          </div>
        )}

        {/* LEFT EDGE DRAG-TO-RESIZE HANDLE */}
        {!isMobile && (
          <Tooltip title="Kéo sang trái/phải để đổi độ rộng (hỗ trợ mũi tên Trái/Phải · Nhấp đúp để đặt lại 680px)">
            <div
              data-testid="gw-reader-resize-handle"
              data-no-chat-autofocus="true"
              role="separator"
              tabIndex={0}
              aria-orientation="vertical"
              aria-valuenow={ctrl.drawerWidth}
              aria-valuemin={MIN_GW_DRAWER_WIDTH}
              aria-valuemax={ctrl.maxDrawerWidth}
              aria-label="Thay đổi độ rộng khung đọc tài liệu bằng kéo thả hoặc phím mũi tên trái phải"
              onMouseDown={(e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                ctrl.dragOriginRef.current = {
                  startX: e.clientX,
                  startWidth: ctrl.drawerWidthRef.current,
                };
                ctrl.setIsResizing(true);
              }}
              onPointerDown={(e) => {
                if (e.pointerType === 'mouse' || e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                ctrl.activePointerIdRef.current = e.pointerId;
                ctrl.dragOriginRef.current = {
                  startX: e.clientX,
                  startWidth: ctrl.drawerWidthRef.current,
                };
                ctrl.setIsResizing(true);
              }}
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                ctrl.handleResetDefaultWidth();
              }}
              onKeyDown={ctrl.handleHandleKeyDown}
              onMouseEnter={() => ctrl.setHoverResizeHandle(true)}
              onMouseLeave={() => ctrl.setHoverResizeHandle(false)}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: -5,
                width: 10,
                cursor: 'col-resize',
                touchAction: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                zIndex: 35,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                className="rounded-full transition-all"
                style={{
                  width: ctrl.isResizing || ctrl.hoverResizeHandle ? 3.5 : 1.5,
                  height: ctrl.isResizing || ctrl.hoverResizeHandle ? 72 : 40,
                  background:
                    ctrl.isResizing || ctrl.hoverResizeHandle
                      ? '#d4a84b'
                      : isDark
                        ? 'rgba(148, 163, 184, 0.35)'
                        : 'rgba(100, 116, 139, 0.3)',
                  boxShadow: ctrl.isResizing ? '0 0 10px rgba(212, 168, 75, 0.65)' : 'none',
                }}
              />
              {ctrl.isResizing && (
                <div
                  data-testid="gw-reader-width-badge"
                  className="px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums shadow-lg pointer-events-none"
                  style={{
                    position: 'absolute',
                    right: 14,
                    background: '#111827',
                    color: '#d4a84b',
                    border: '1px solid rgba(212, 168, 75, 0.45)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {ctrl.drawerWidth}px
                </div>
              )}
            </div>
          </Tooltip>
        )}

        <GwDrawerHeaderAndToolbar
          isMobile={isMobile}
          isDark={isDark}
          isSheet={ctrl.isSheet}
          isCanva={ctrl.isCanva}
          docTitle={docTitle}
          data={ctrl.data}
          payload={ctrl.payload}
          readerMode={ctrl.readerMode}
          effectiveRangeLabel={ctrl.effectiveRangeLabel}
          canonicalHref={canonicalHref}
          expandedWidth={ctrl.expandedWidth}
          searchQuery={ctrl.searchQuery}
          loading={ctrl.loading}
          aiBarOpen={ctrl.aiBarOpen}
          aiPrompt={ctrl.aiPrompt}
          aiLoading={ctrl.aiLoading}
          aiError={ctrl.aiError}
          aiAnswer={ctrl.aiAnswer}
          selectedCell={ctrl.selectedCell}
          bgSurface={bgSurface}
          bgRaised={bgRaised}
          bgCanvas={bgCanvas}
          bColor={bColor}
          mobileHorizontalSafeClass={mobileHorizontalSafeClass}
          onSetReaderMode={ctrl.setReaderMode}
          onToggleExpandWidth={ctrl.handleToggleExpandWidth}
          onCloseDrawer={ctrl.handleCloseDrawer}
          onChangeSearchQuery={ctrl.setSearchQuery}
          onScrollToTargetRange={ctrl.scrollToTargetRange}
          onReload={() => void ctrl.reload(true)}
          onToggleAiBar={() => ctrl.setAiBarOpen((v) => !v)}
          onChangeAiPrompt={ctrl.setAiPrompt}
          onRunAiQuestion={(q) => void ctrl.runAiQuestion(q, ctrl.payload, docTitle)}
          onCopyText={(t, lbl) => void ctrl.handleCopyText(t, lbl)}
          onPostAiReplyToChat={onPostAiReplyToChat}
        />

        <GwDrawerViewport
          isMobile={isMobile}
          isDark={isDark}
          isResizing={ctrl.isResizing}
          readerMode={ctrl.readerMode}
          isSheet={ctrl.isSheet}
          isCanva={ctrl.isCanva}
          hasBottomSheetTabs={hasBottomSheetTabs}
          docTitle={docTitle}
          canonicalHref={canonicalHref}
          embedHref={embedHref}
          loading={ctrl.loading}
          error={ctrl.error}
          data={ctrl.data}
          sheetGrid={ctrl.sheetGrid}
          searchQuery={ctrl.searchQuery}
          effectiveRange={ctrl.effectiveRange}
          selectedCell={ctrl.selectedCell}
          copiedBotEmail={ctrl.copiedBotEmail}
          bgSurface={bgSurface}
          bgRaised={bgRaised}
          bColor={bColor}
          mobileHorizontalSafeClass={mobileHorizontalSafeClass}
          docBodyRef={ctrl.docBodyRef}
          gridScrollRef={ctrl.gridScrollRef}
          targetCellRef={ctrl.targetCellRef}
          onReload={() => void ctrl.reload(true)}
          onSetReaderMode={ctrl.setReaderMode}
          onCopyBotEmail={(email) => void ctrl.handleCopyBotEmail(email)}
          onSelectCell={ctrl.setSelectedCell}
        />

        {hasBottomSheetTabs && ctrl.data?.tabs && (
          <GwDrawerSheetTabsBar
            isMobile={isMobile}
            isDark={isDark}
            tabs={ctrl.data.tabs}
            activeTabGid={ctrl.data.activeTab?.gid}
            selectedGid={ctrl.selectedGid}
            bgRaised={bgRaised}
            bColor={bColor}
            onSelectTab={(gid) => {
              ctrl.setSelectedGid(gid);
              ctrl.setSelectedCell(null);
              ctrl.gridScrollRef.current?.scrollTo?.({ top: 0, left: 0 });
              ctrl.docBodyRef.current?.scrollTo?.({ top: 0, left: 0 });
            }}
          />
        )}
      </aside>
    );
  }
);

MosChatGoogleWorkspaceDrawer.displayName = 'MosChatGoogleWorkspaceDrawer';
