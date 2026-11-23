'use client';

import React, { useMemo } from 'react';
import { extractGoogleWorkspaceLinksFromText, hasSupportedWorkspaceLinkInText } from '@mos-lab/shared';
import { WorkspaceCardHeader } from './mos-chat-google-workspace-card/WorkspaceCardHeader';
import { WorkspaceCardStatusBanners } from './mos-chat-google-workspace-card/WorkspaceCardStatusBanners';
import { WorkspaceRichPreview } from './mos-chat-google-workspace-card/WorkspaceRichPreview';
import { WorkspaceSheetPreview } from './mos-chat-google-workspace-card/WorkspaceSheetPreview';
import { useGoogleWorkspaceCardState } from './mos-chat-google-workspace-card/useGoogleWorkspaceCardState';
import type {
  MosChatGoogleWorkspaceCardListProps,
  MosChatGoogleWorkspaceCardProps,
} from './mos-chat-google-workspace-card/workspaceCardTypes';

export type { MosChatGoogleWorkspaceCardProps, MosChatGoogleWorkspaceCardListProps };

export const MosChatGoogleWorkspaceCard: React.FC<MosChatGoogleWorkspaceCardProps> = React.memo(
  ({ link, conversationId, messageId, isDark, compact = false }) => {
    const {
      selectedGid,
      setSelectedGid,
      copiedBotEmail,
      showInlineEmbed,
      data,
      loading,
      error,
      reload,
      isSheet,
      isCanva,
      effectiveRange,
      effectiveRangeLabel,
      displayTitle,
      accessStatus,
      themeClasses,
      previewGrid,
      handleCopyBotEmail,
      handleOpenReader,
      handleAskAi,
      handleToggleInlineEmbed,
    } = useGoogleWorkspaceCardState({
      link,
      conversationId,
      messageId,
      isDark,
      compact,
    });

    const canonicalUrl = data?.canonicalUrl || link.canonicalUrl;
    const isReadableStatus = accessStatus === 'PUBLIC_LINK' || accessStatus === 'SERVICE_ACCOUNT';
    const canRenderSheetPreview = Boolean(data && isSheet && isReadableStatus);
    const canRenderCanvaPreview = Boolean(data && isCanva && accessStatus === 'PUBLIC_LINK');
    const canRenderDocsPreview = Boolean(data && !isSheet && !isCanva && isReadableStatus);

    return (
      <div
        data-testid="google-workspace-preview-card"
        data-google-workspace-kind={link.kind}
        onClick={(e) => e.stopPropagation()}
        className={`mt-2 rounded-xl overflow-hidden shadow-sm transition-colors text-left select-text max-w-full border ${themeClasses.cardContainerClass}`}
      >
        <WorkspaceCardHeader
          isDark={isDark}
          isSheet={isSheet}
          isCanva={isCanva}
          displayTitle={displayTitle}
          canonicalUrl={canonicalUrl}
          accessStatus={accessStatus}
          effectiveRangeLabel={effectiveRangeLabel}
          data={data}
          themeClasses={themeClasses}
          onOpenReader={() => handleOpenReader()}
          onAskAi={handleAskAi}
        />

        <div className="p-2.5 space-y-2">
          <WorkspaceCardStatusBanners
            isDark={isDark}
            isCanva={isCanva}
            loading={loading}
            error={error}
            data={data}
            accessStatus={accessStatus}
            canonicalUrl={canonicalUrl}
            copiedBotEmail={copiedBotEmail}
            onReload={() => void reload(true)}
            onCopyBotEmail={(email) => void handleCopyBotEmail(email)}
          />

          {canRenderSheetPreview && (
            <WorkspaceSheetPreview
              isDark={isDark}
              tabs={data?.tabs}
              activeTabGid={data?.activeTab?.gid}
              selectedGid={selectedGid}
              previewGrid={previewGrid}
              effectiveRange={effectiveRange}
              onSelectGid={setSelectedGid}
            />
          )}

          {(canRenderCanvaPreview || canRenderDocsPreview) && data && (
            <WorkspaceRichPreview
              isDark={isDark}
              isCanva={isCanva}
              displayTitle={displayTitle}
              embedUrl={data.embedUrl}
              embedWidth={data.embedWidth}
              embedHeight={data.embedHeight}
              headings={data.headings}
              excerpt={data.excerpt}
              headingChipClass={themeClasses.headingChipClass}
              showInlineEmbed={showInlineEmbed}
              onToggleInlineEmbed={handleToggleInlineEmbed}
              onOpenFastReader={() => handleOpenReader('fast')}
            />
          )}
        </div>
      </div>
    );
  }
);

MosChatGoogleWorkspaceCard.displayName = 'MosChatGoogleWorkspaceCard';

export const MosChatGoogleWorkspaceCardList: React.FC<MosChatGoogleWorkspaceCardListProps> = React.memo(
  ({ text, conversationId, messageId, isDark, isMe, compact }) => {
    const links = useMemo(() => {
      if (!hasSupportedWorkspaceLinkInText(text)) return [];
      return extractGoogleWorkspaceLinksFromText(text).slice(0, 3);
    }, [text]);

    if (links.length === 0) return null;

    return (
      <div className="space-y-1.5 w-full">
        {links.map((link) => (
          <MosChatGoogleWorkspaceCard
            key={link.cacheKey}
            link={link}
            conversationId={conversationId}
            messageId={messageId}
            isDark={isDark}
            isMe={isMe}
            compact={compact}
          />
        ))}
      </div>
    );
  }
);

MosChatGoogleWorkspaceCardList.displayName = 'MosChatGoogleWorkspaceCardList';
