import type {
  MosChatGoogleSheetActiveTabData,
  MosChatGoogleSheetTabSummary,
  MosChatGoogleWorkspaceAccessStatus,
  MosChatGoogleWorkspacePreviewResponse,
  ParsedGoogleWorkspaceLink,
} from '@mos-lab/shared';
import { getFetch, getServiceAccountAccessToken, isGoogleLoginHtml, REQUEST_TIMEOUT_MS } from './gw-auth-cache.js';
import {
  buildSheetSnippet,
  parseCsvRows,
  parseGoogleDocHtmlToStructured,
  parseTabsFromPublicSheetHtml,
  stripTags,
} from './gw-parsers.js';

export async function checkPublicLinkAndDrivePermissions(
  fileId: string,
  kind: 'spreadsheet' | 'document',
  saToken: string | null,
  gid?: string | null
): Promise<{
  isPublicLink: boolean;
  driveTitle?: string;
  modifiedTime?: string | null;
  saAccessible: boolean;
  notFoundBoth: boolean;
}> {
  const fetchImpl = getFetch();
  let isPublicLink = false;
  let driveTitle: string | undefined;
  let modifiedTime: string | null | undefined;
  let saAccessible = false;
  let driveStatus = 0;

  // 1. Check Drive v3 metadata if SA token exists (detects 'anyone' permission + exact title)
  if (saToken) {
    try {
      const driveRes = await fetchImpl(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
          fileId
        )}?fields=id,name,mimeType,modifiedTime,permissions(type,role)&supportsAllDrives=true`,
        {
          headers: { Authorization: `Bearer ${saToken}` },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        }
      );
      driveStatus = driveRes.status;
      if (driveRes.ok) {
        saAccessible = true;
        const meta = (await driveRes.json()) as {
          name?: string;
          modifiedTime?: string;
          permissions?: Array<{ type?: string; role?: string }>;
        };
        if (meta.name) driveTitle = meta.name;
        if (meta.modifiedTime) modifiedTime = meta.modifiedTime;
        if (Array.isArray(meta.permissions) && meta.permissions.some((p) => p.type === 'anyone')) {
          isPublicLink = true;
        }
      }
    } catch {
      // non-blocking
    }
  }

  // 2. Unauthenticated public probe (works even when SA doesn't have direct permission or SA is absent)
  let pubStatus = 0;
  if (!isPublicLink) {
    try {
      const probeUrl =
        kind === 'spreadsheet'
          ? `https://docs.google.com/spreadsheets/d/${encodeURIComponent(fileId)}/gviz/tq?tqx=out:csv${
              gid ? `&gid=${encodeURIComponent(gid)}` : ''
            }`
          : `https://docs.google.com/document/d/${encodeURIComponent(fileId)}/export?format=html`;
      const pubRes = await fetchImpl(probeUrl, {
        redirect: 'manual',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      pubStatus = pubRes.status;
      if (pubRes.ok) {
        const ct = (pubRes.headers.get('content-type') || '').toLowerCase();
        if (kind === 'spreadsheet' && !ct.includes('text/html')) {
          isPublicLink = true;
        } else if (kind === 'document') {
          const sample = await pubRes.text();
          if (!isGoogleLoginHtml(sample)) {
            isPublicLink = true;
          }
        }
      }
    } catch {
      // private or unreachable
    }
  }

  return {
    isPublicLink,
    driveTitle,
    modifiedTime: modifiedTime ?? null,
    saAccessible,
    notFoundBoth: driveStatus === 404 && pubStatus === 404 && !saAccessible && !isPublicLink,
  };
}

export async function fetchSpreadsheetPreview(
  parsed: ParsedGoogleWorkspaceLink,
  serviceAccountEmail: string
): Promise<{ isPublicLink: boolean; response: MosChatGoogleWorkspacePreviewResponse }> {
  const fetchImpl = getFetch();
  const nowIso = new Date().toISOString();
  const saAuth = await getServiceAccountAccessToken();
  const probe = await checkPublicLinkAndDrivePermissions(
    parsed.fileId,
    'spreadsheet',
    saAuth?.token || null,
    parsed.gid
  );

  // Path A: Service Account can read Sheets API v4 (covers both PUBLIC_LINK shared or SA-shared files)
  if (saAuth?.token && probe.saAccessible) {
    try {
      const metaRes = await fetchImpl(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
          parsed.fileId
        )}?fields=properties.title,sheets(properties(sheetId,title,gridProperties))`,
        {
          headers: { Authorization: `Bearer ${saAuth.token}` },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        }
      );

      if (metaRes.ok) {
        const meta = (await metaRes.json()) as {
          properties?: { title?: string };
          sheets?: Array<{
            properties?: {
              sheetId?: number;
              title?: string;
              gridProperties?: { rowCount?: number; columnCount?: number };
            };
          }>;
        };

        const tabs: MosChatGoogleSheetTabSummary[] = (meta.sheets || [])
          .filter((s) => s.properties && typeof s.properties.sheetId === 'number' && s.properties.title)
          .map((s) => ({
            sheetId: Number(s.properties!.sheetId),
            gid: String(s.properties!.sheetId),
            title: String(s.properties!.title),
            rowCount: s.properties!.gridProperties?.rowCount,
            columnCount: s.properties!.gridProperties?.columnCount,
          }));

        const targetTab =
          (parsed.gid ? tabs.find((t) => t.gid === parsed.gid) : undefined) ||
          (parsed.parsedRange?.sheetName
            ? tabs.find((t) => t.title.toLowerCase() === parsed.parsedRange!.sheetName!.toLowerCase())
            : undefined) ||
          tabs[0];

        let rows: string[][] = [];
        if (targetTab) {
          const safeSheetName = `'${targetTab.title.replace(/'/g, "''")}'!A1:AZ300`;
          const valRes = await fetchImpl(
            `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
              parsed.fileId
            )}/values/${encodeURIComponent(safeSheetName)}?valueRenderOption=FORMATTED_VALUE`,
            {
              headers: { Authorization: `Bearer ${saAuth.token}` },
              signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            }
          );
          if (valRes.ok) {
            const valJson = (await valRes.json()) as { values?: unknown[][] };
            rows = (valJson.values || []).map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? '')) : []));
          }
        }

        const totalRows = Math.max(rows.length, targetTab?.rowCount || 0);
        const maxRowCols = rows.reduce((acc, r) => Math.max(acc, r.length), 0);
        const totalCols = Math.max(maxRowCols, targetTab?.columnCount || 0);
        const snippet = buildSheetSnippet(rows, parsed.parsedRange);

        const activeTab: MosChatGoogleSheetActiveTabData | null = targetTab
          ? {
              gid: targetTab.gid,
              title: targetTab.title,
              totalRows,
              totalCols,
              rows,
              truncated: totalRows > 300 || totalCols > 52,
              snippetRowStart: snippet.snippetRowStart,
              snippetRows: snippet.snippetRows,
              snippetColStart: snippet.snippetColStart,
              snippetColHeaders: snippet.snippetColHeaders,
            }
          : null;

        const accessStatus: MosChatGoogleWorkspaceAccessStatus = probe.isPublicLink ? 'PUBLIC_LINK' : 'SERVICE_ACCOUNT';

        return {
          isPublicLink: probe.isPublicLink,
          response: {
            success: true,
            kind: 'spreadsheet',
            fileId: parsed.fileId,
            canonicalUrl: parsed.canonicalUrl,
            embedUrl: parsed.embedUrl,
            title: meta.properties?.title || probe.driveTitle || 'Google Sheets',
            accessStatus,
            serviceAccountEmail,
            modifiedTime: probe.modifiedTime ?? null,
            requestedGid: parsed.gid,
            requestedRange: parsed.range,
            parsedRange: parsed.parsedRange,
            tabs,
            activeTab,
            fetchedAt: nowIso,
          },
        };
      }
    } catch {
      // fall through to public CSV reader if applicable
    }
  }

  // Path B: Public Link fallback (Anyone with the link, no SA needed)
  if (probe.isPublicLink) {
    try {
      let tabs: MosChatGoogleSheetTabSummary[] = [];
      let title = probe.driveTitle || 'Google Sheets';

      const htmlRes = await fetchImpl(
        `https://docs.google.com/spreadsheets/d/${encodeURIComponent(parsed.fileId)}/htmlview`,
        {
          redirect: 'manual',
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        }
      );
      if (htmlRes.ok) {
        const html = await htmlRes.text();
        if (!isGoogleLoginHtml(html)) {
          const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          if (titleMatch?.[1]) {
            const cleaned = stripTags(titleMatch[1])
              .replace(/\s*-\s*Google\s+(?:Sheets|Trang tính)\s*$/i, '')
              .trim();
            if (cleaned) title = cleaned;
          }
          tabs = parseTabsFromPublicSheetHtml(html);
        }
      }

      const targetTab =
        (parsed.gid ? tabs.find((t) => t.gid === parsed.gid) : undefined) ||
        (parsed.parsedRange?.sheetName
          ? tabs.find((t) => t.title.toLowerCase() === parsed.parsedRange!.sheetName!.toLowerCase())
          : undefined) ||
        tabs[0] ||
        (parsed.gid
          ? { sheetId: Number(parsed.gid) || 0, gid: parsed.gid, title: 'Trang tính' }
          : { sheetId: 0, gid: '0', title: 'Sheet1' });

      if (tabs.length === 0) {
        tabs = [targetTab];
      }

      const csvRes = await fetchImpl(
        `https://docs.google.com/spreadsheets/d/${encodeURIComponent(parsed.fileId)}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(
          targetTab.gid
        )}`,
        {
          redirect: 'manual',
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        }
      );

      let rows: string[][] = [];
      if (csvRes.ok) {
        const csvText = await csvRes.text();
        rows = parseCsvRows(csvText, 300, 52);
      }

      const maxCols = rows.reduce((acc, r) => Math.max(acc, r.length), 0);
      const snippet = buildSheetSnippet(rows, parsed.parsedRange);

      return {
        isPublicLink: true,
        response: {
          success: true,
          kind: 'spreadsheet',
          fileId: parsed.fileId,
          canonicalUrl: parsed.canonicalUrl,
          embedUrl: parsed.embedUrl,
          title,
          accessStatus: 'PUBLIC_LINK',
          serviceAccountEmail,
          modifiedTime: probe.modifiedTime ?? null,
          requestedGid: parsed.gid,
          requestedRange: parsed.range,
          parsedRange: parsed.parsedRange,
          tabs,
          activeTab: {
            gid: targetTab.gid,
            title: targetTab.title,
            totalRows: rows.length,
            totalCols: maxCols,
            rows,
            truncated: rows.length >= 300 || maxCols >= 52,
            snippetRowStart: snippet.snippetRowStart,
            snippetRows: snippet.snippetRows,
            snippetColStart: snippet.snippetColStart,
            snippetColHeaders: snippet.snippetColHeaders,
          },
          fetchedAt: nowIso,
        },
      };
    } catch {
      // fall through to NEEDS_SHARE / ERROR
    }
  }

  return {
    isPublicLink: false,
    response: {
      success: false,
      kind: 'spreadsheet',
      fileId: parsed.fileId,
      canonicalUrl: parsed.canonicalUrl,
      embedUrl: parsed.embedUrl,
      title: probe.driveTitle || 'Google Sheet (Chưa cấp quyền)',
      accessStatus: 'NEEDS_SHARE',
      serviceAccountEmail,
      statusMessage:
        'Google Sheet đang khóa riêng tư hoặc chưa chia sẻ cho mOS Bot. Hãy chia sẻ quyền Xem cho email bot bên dưới hoặc bật "Bất kỳ ai có liên kết".',
      requestedGid: parsed.gid,
      requestedRange: parsed.range,
      parsedRange: parsed.parsedRange,
      fetchedAt: nowIso,
    },
  };
}

export async function fetchDocumentPreview(
  parsed: ParsedGoogleWorkspaceLink,
  serviceAccountEmail: string
): Promise<{ isPublicLink: boolean; response: MosChatGoogleWorkspacePreviewResponse }> {
  const fetchImpl = getFetch();
  const nowIso = new Date().toISOString();
  const saAuth = await getServiceAccountAccessToken();
  const probe = await checkPublicLinkAndDrivePermissions(parsed.fileId, 'document', saAuth?.token || null);

  let htmlContent: string | null = null;
  let accessStatus: MosChatGoogleWorkspaceAccessStatus = 'NEEDS_SHARE';

  // IMPORTANT: Never call docs.googleapis.com/v1 (disabled on wings-lashes project).
  // Always read Google Docs via Drive API v3 export (SA) or public export?format=html.
  if (saAuth?.token && probe.saAccessible) {
    try {
      const exportRes = await fetchImpl(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
          parsed.fileId
        )}/export?mimeType=text/html&supportsAllDrives=true`,
        {
          headers: { Authorization: `Bearer ${saAuth.token}` },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        }
      );
      if (exportRes.ok) {
        htmlContent = await exportRes.text();
        accessStatus = probe.isPublicLink ? 'PUBLIC_LINK' : 'SERVICE_ACCOUNT';
      }
    } catch {
      // fallback to public export if public
    }
  }

  if (!htmlContent && probe.isPublicLink) {
    try {
      const pubRes = await fetchImpl(
        `https://docs.google.com/document/d/${encodeURIComponent(parsed.fileId)}/export?format=html`,
        {
          redirect: 'manual',
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        }
      );
      if (pubRes.ok) {
        const text = await pubRes.text();
        if (!isGoogleLoginHtml(text)) {
          htmlContent = text;
          accessStatus = 'PUBLIC_LINK';
        }
      }
    } catch {
      // fall through
    }
  }

  if (htmlContent) {
    const parsedDoc = parseGoogleDocHtmlToStructured(htmlContent);
    const title = probe.driveTitle || parsedDoc.docTitleFromHtml || 'Google Docs';
    return {
      isPublicLink: probe.isPublicLink,
      response: {
        success: true,
        kind: 'document',
        fileId: parsed.fileId,
        canonicalUrl: parsed.canonicalUrl,
        embedUrl: parsed.embedUrl,
        title,
        accessStatus,
        serviceAccountEmail,
        modifiedTime: probe.modifiedTime ?? null,
        headings: parsedDoc.headings,
        sections: parsedDoc.sections,
        excerpt: parsedDoc.excerpt,
        plainText: parsedDoc.plainText,
        fetchedAt: nowIso,
      },
    };
  }

  return {
    isPublicLink: false,
    response: {
      success: false,
      kind: 'document',
      fileId: parsed.fileId,
      canonicalUrl: parsed.canonicalUrl,
      embedUrl: parsed.embedUrl,
      title: probe.driveTitle || 'Google Docs (Chưa cấp quyền)',
      accessStatus: 'NEEDS_SHARE',
      serviceAccountEmail,
      statusMessage:
        'Google Docs đang khóa riêng tư hoặc chưa chia sẻ cho mOS Bot. Hãy chia sẻ quyền Xem cho email bot bên dưới hoặc bật "Bất kỳ ai có liên kết".',
      fetchedAt: nowIso,
    },
  };
}
