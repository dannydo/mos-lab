import {
  parseGoogleWorkspaceUrl,
  type MosChatGoogleWorkspacePreviewResponse,
  type ParsedGoogleWorkspaceLink,
} from '@mos-lab/shared';
import { CANVA_ALLOWED_HOSTS, CANVA_BROWSER_UA, getFetch, REQUEST_TIMEOUT_MS } from './gw-auth-cache.js';
import { decodeBasicHtmlEntities, parseCanvaEmbedHtmlToStructured } from './gw-parsers.js';

export function isAllowedCanvaUrl(candidateUrl: string): boolean {
  try {
    const u = new URL(candidateUrl);
    return u.protocol === 'https:' && CANVA_ALLOWED_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export async function resolveCanvaShortlinkSafely(rawUrl: string): Promise<string> {
  const fetchImpl = getFetch();
  let current = rawUrl;
  for (let hop = 0; hop < 4; hop++) {
    if (!isAllowedCanvaUrl(current)) {
      break;
    }
    const parsedHop = parseGoogleWorkspaceUrl(current);
    if (parsedHop?.kind === 'canva' && !parsedHop.fileId.startsWith('canva-link-')) {
      return current;
    }
    try {
      const res = await fetchImpl(current, {
        redirect: 'manual',
        headers: { 'User-Agent': CANVA_BROWSER_UA },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) break;
        const nextUrl = new URL(loc, current).toString();
        if (!isAllowedCanvaUrl(nextUrl)) {
          break;
        }
        current = nextUrl;
        continue;
      }
      break;
    } catch {
      break;
    }
  }
  return current;
}

export async function fetchCanvaPreview(
  parsed: ParsedGoogleWorkspaceLink,
  serviceAccountEmail: string
): Promise<{ isPublicLink: boolean; response: MosChatGoogleWorkspacePreviewResponse }> {
  const nowIso = new Date().toISOString();
  const fetchImpl = getFetch();

  let effectiveParsed = parsed;
  if (parsed.fileId.startsWith('canva-link-')) {
    const resolvedUrl = await resolveCanvaShortlinkSafely(parsed.rawUrl);
    const reparsed = parseGoogleWorkspaceUrl(resolvedUrl);
    if (reparsed?.kind === 'canva' && !reparsed.fileId.startsWith('canva-link-')) {
      effectiveParsed = reparsed;
    } else {
      return {
        isPublicLink: false,
        response: {
          success: false,
          kind: 'canva',
          fileId: parsed.fileId,
          canonicalUrl: parsed.canonicalUrl,
          embedUrl: parsed.embedUrl,
          title: 'Thiết kế Canva (Không thể mở liên kết)',
          accessStatus: 'NEEDS_SHARE',
          serviceAccountEmail,
          statusMessage:
            'Không thể phân giải liên kết Canva hoặc thiết kế đang đặt chế độ riêng tư. Hãy mở liên kết trên Canva và bật quyền "Bất kỳ ai có liên kết đều có thể xem".',
          fetchedAt: nowIso,
        },
      };
    }
  }

  const [oembedSettled, embedSettled] = await Promise.allSettled([
    fetchImpl(`https://www.canva.com/_oembed?url=${encodeURIComponent(effectiveParsed.canonicalUrl)}`, {
      headers: { 'User-Agent': CANVA_BROWSER_UA },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }),
    fetchImpl(effectiveParsed.embedUrl, {
      headers: { 'User-Agent': CANVA_BROWSER_UA },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }),
  ]);

  let oembed: {
    title?: string;
    author_name?: string;
    width?: number;
    height?: number;
    html?: string;
  } | null = null;
  if (oembedSettled.status === 'fulfilled' && oembedSettled.value.ok) {
    try {
      const candidate = (await oembedSettled.value.json()) as {
        title?: unknown;
        author_name?: unknown;
        width?: unknown;
        height?: unknown;
        html?: unknown;
      };
      if (candidate && typeof candidate === 'object') {
        oembed = {
          title: typeof candidate.title === 'string' ? candidate.title : undefined,
          author_name: typeof candidate.author_name === 'string' ? candidate.author_name : undefined,
          width: typeof candidate.width === 'number' ? candidate.width : undefined,
          height: typeof candidate.height === 'number' ? candidate.height : undefined,
          html: typeof candidate.html === 'string' ? candidate.html : undefined,
        };
      }
    } catch {
      oembed = null;
    }
  }

  let embedHtml = '';
  if (embedSettled.status === 'fulfilled' && embedSettled.value.ok) {
    try {
      embedHtml = await embedSettled.value.text();
    } catch {
      embedHtml = '';
    }
  }

  const parsedEmbed = embedHtml
    ? parseCanvaEmbedHtmlToStructured(embedHtml)
    : { headings: [], sections: [], excerpt: '', plainText: '' };

  let safeIframeSrc: string | null = null;
  if (oembed?.html) {
    const srcMatch = oembed.html.match(/src=["']([^"']+)["']/i);
    if (srcMatch?.[1]) {
      const decodedSrc = decodeBasicHtmlEntities(srcMatch[1]);
      if (/^https:\/\/(?:www\.)?canva\.com\/design\//i.test(decodedSrc)) {
        safeIframeSrc = decodedSrc;
      }
    }
  }

  const isReadablePublic = Boolean(oembed || (embedHtml && parsedEmbed.title));
  if (!isReadablePublic) {
    return {
      isPublicLink: false,
      response: {
        success: false,
        kind: 'canva',
        fileId: effectiveParsed.fileId,
        canonicalUrl: effectiveParsed.canonicalUrl,
        embedUrl: effectiveParsed.embedUrl,
        title: 'Thiết kế Canva (Chưa mở quyền xem)',
        accessStatus: 'NEEDS_SHARE',
        serviceAccountEmail,
        statusMessage:
          'Thiết kế Canva đang để chế độ riêng tư. Hãy mở thiết kế trên Canva → bấm Chia sẻ (Share) → đổi quyền truy cập thành "Bất kỳ ai có liên kết đều có thể xem", sau đó bấm Thử tải lại.',
        fetchedAt: nowIso,
      },
    };
  }

  return {
    isPublicLink: true,
    response: {
      success: true,
      kind: 'canva',
      fileId: effectiveParsed.fileId,
      canonicalUrl: effectiveParsed.canonicalUrl,
      embedUrl: safeIframeSrc || effectiveParsed.embedUrl,
      title: oembed?.title || parsedEmbed.title || 'Thiết kế Canva',
      authorName: oembed?.author_name || parsedEmbed.authorName || null,
      designType: parsedEmbed.designType || null,
      embedWidth: oembed?.width || 1920,
      embedHeight: oembed?.height || 1080,
      accessStatus: 'PUBLIC_LINK',
      serviceAccountEmail,
      headings: parsedEmbed.headings,
      sections: parsedEmbed.sections,
      excerpt: parsedEmbed.excerpt || null,
      plainText: parsedEmbed.plainText || null,
      fetchedAt: nowIso,
    },
  };
}
