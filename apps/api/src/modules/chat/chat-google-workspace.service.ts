import { parseGoogleWorkspaceUrl, type MosChatGoogleWorkspacePreviewResponse } from '@mos-lab/shared';
import {
  applyRoleSecurityGate,
  CACHE_TTL_MS,
  clearPreviewCache,
  DEFAULT_GOOGLE_WORKSPACE_SA_EMAIL,
  getCachedPreviewEntry,
  getGoogleWorkspaceServiceAccountEmail,
  isPrivilegedWorkspaceActor,
  normalizeRoleKey,
  setCacheEntry,
  setGoogleWorkspaceTestOverrides,
  type GoogleWorkspaceActorContext,
} from './google-workspace/gw-auth-cache.js';
import { fetchCanvaPreview } from './google-workspace/gw-canva.fetcher.js';
import {
  buildAiWorkspaceContextForText,
  buildMissionWorkspaceSnapshotMarkdown,
} from './google-workspace/gw-context.helper.js';
import { fetchDocumentPreview, fetchSpreadsheetPreview } from './google-workspace/gw-google.fetcher.js';
import {
  buildSheetSnippet,
  decodeBasicHtmlEntities,
  parseCanvaEmbedHtmlToStructured,
  parseCsvRows,
  parseGoogleDocHtmlToStructured,
} from './google-workspace/gw-parsers.js';

export {
  buildSheetSnippet,
  decodeBasicHtmlEntities,
  DEFAULT_GOOGLE_WORKSPACE_SA_EMAIL,
  getGoogleWorkspaceServiceAccountEmail,
  isPrivilegedWorkspaceActor,
  normalizeRoleKey,
  parseCanvaEmbedHtmlToStructured,
  parseCsvRows,
  parseGoogleDocHtmlToStructured,
  setGoogleWorkspaceTestOverrides,
  type GoogleWorkspaceActorContext,
};

export class ChatGoogleWorkspaceService {
  static clearCache(): void {
    clearPreviewCache();
  }

  static async previewLink(params: {
    url: string;
    gid?: string;
    range?: string;
    viewer?: GoogleWorkspaceActorContext | null;
    sender?: GoogleWorkspaceActorContext | null;
    refresh?: boolean;
  }): Promise<MosChatGoogleWorkspacePreviewResponse> {
    const parsedBase = parseGoogleWorkspaceUrl(params.url);
    if (!parsedBase) {
      throw new Error('Đường dẫn Google Sheets, Google Docs hoặc Canva không hợp lệ.');
    }

    const effectiveUrl =
      params.gid || params.range
        ? (() => {
            if (parsedBase.kind === 'spreadsheet') {
              const gid = params.gid ?? parsedBase.gid;
              const range = params.range ?? parsedBase.range;
              const q = gid ? `?gid=${encodeURIComponent(gid)}` : '';
              const hashes = [
                gid ? `gid=${encodeURIComponent(gid)}` : '',
                range ? `range=${encodeURIComponent(range)}` : '',
              ].filter(Boolean);
              return `https://docs.google.com/spreadsheets/d/${parsedBase.fileId}/edit${q}${hashes.length ? `#${hashes.join('&')}` : ''}`;
            }
            return parsedBase.canonicalUrl;
          })()
        : parsedBase.rawUrl;

    const parsed = parseGoogleWorkspaceUrl(effectiveUrl) || parsedBase;
    const serviceAccountEmail = getGoogleWorkspaceServiceAccountEmail();
    const cacheKey = `${parsed.kind}:${parsed.fileId}:${parsed.gid || ''}:${parsed.range || ''}`;

    if (!params.refresh) {
      const cached = getCachedPreviewEntry(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        const gated = applyRoleSecurityGate(cached, params.viewer, params.sender);
        return { ...gated, cached: true };
      }
    }

    const fetched =
      parsed.kind === 'spreadsheet'
        ? await fetchSpreadsheetPreview(parsed, serviceAccountEmail)
        : parsed.kind === 'canva'
          ? await fetchCanvaPreview(parsed, serviceAccountEmail)
          : await fetchDocumentPreview(parsed, serviceAccountEmail);

    if (fetched.response.accessStatus === 'PUBLIC_LINK' || fetched.response.accessStatus === 'SERVICE_ACCOUNT') {
      setCacheEntry(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        isPublicLink: fetched.isPublicLink,
        response: fetched.response,
      });
    }

    return applyRoleSecurityGate(fetched, params.viewer, params.sender);
  }

  /**
   * Builds live Google Workspace context for @AI / @MAI prompts in mOS Chat.
   * Covers all tabs of multi-tab spreadsheets (e.g., NVL + Mi) and Google Docs text.
   */
  static async buildAiContextForText(params: {
    text?: string | null;
    viewer?: GoogleWorkspaceActorContext | null;
    sender?: GoogleWorkspaceActorContext | null;
    maxLinks?: number;
  }): Promise<string> {
    return buildAiWorkspaceContextForText(params, (linkParams) => ChatGoogleWorkspaceService.previewLink(linkParams));
  }

  /**
   * Builds compact Markdown snapshot embedded into mOS Mission tickets when clicking 🚀.
   */
  static async buildMissionSnapshotMarkdown(params: {
    text?: string | null;
    viewer?: GoogleWorkspaceActorContext | null;
    sender?: GoogleWorkspaceActorContext | null;
  }): Promise<string> {
    return buildMissionWorkspaceSnapshotMarkdown(params, (linkParams) =>
      ChatGoogleWorkspaceService.previewLink(linkParams)
    );
  }
}
