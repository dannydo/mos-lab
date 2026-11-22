import { extractGoogleWorkspaceLinksFromText, type MosChatGoogleWorkspacePreviewResponse } from '@mos-lab/shared';
import type { GoogleWorkspaceActorContext } from './gw-auth-cache.js';

export type PreviewWorkspaceLinkFn = (params: {
  url: string;
  gid?: string;
  range?: string;
  viewer?: GoogleWorkspaceActorContext | null;
  sender?: GoogleWorkspaceActorContext | null;
  refresh?: boolean;
}) => Promise<MosChatGoogleWorkspacePreviewResponse>;

export function formatSheetRowsCompact(rows: string[][], startRow1Based = 1, maxRows = 25, maxCols = 10): string {
  if (!rows || rows.length === 0) return '(Không có dữ liệu)';
  const lines: string[] = [];
  const slice = rows.slice(0, maxRows);
  for (let i = 0; i < slice.length; i++) {
    const rNum = startRow1Based + i;
    const cells = (slice[i] || []).slice(0, maxCols).map((c) =>
      String(c ?? '')
        .replace(/\s+/g, ' ')
        .trim()
    );
    if (cells.some((c) => c.length > 0)) {
      lines.push(`Row ${rNum}: | ${cells.join(' | ')} |`);
    }
  }
  return lines.length > 0 ? lines.join('\n') : '(Tab trống)';
}

/**
 * Builds live Google Workspace context for @AI / @MAI prompts in mOS Chat.
 * Covers all tabs of multi-tab spreadsheets (e.g., NVL + Mi) and Google Docs text.
 */
export async function buildAiWorkspaceContextForText(
  params: {
    text?: string | null;
    viewer?: GoogleWorkspaceActorContext | null;
    sender?: GoogleWorkspaceActorContext | null;
    maxLinks?: number;
  },
  previewLinkFn: PreviewWorkspaceLinkFn
): Promise<string> {
  const links = extractGoogleWorkspaceLinksFromText(params.text).slice(0, params.maxLinks ?? 2);
  if (links.length === 0) return '';

  const chunks: string[] = [];
  for (const link of links) {
    try {
      const preview = await Promise.race([
        previewLinkFn({
          url: link.rawUrl,
          viewer: params.viewer,
          sender: params.sender,
        }),
        new Promise<null>((resolveTimer) => setTimeout(() => resolveTimer(null), 6500)),
      ]);

      if (!preview) continue;
      if (!preview.success) {
        chunks.push(
          `- [${preview.kind.toUpperCase()}] "${preview.title}" (${preview.canonicalUrl}): Trạng thái ${preview.accessStatus} — ${preview.statusMessage || 'Chưa mở quyền đọc.'}`
        );
        continue;
      }

      if (preview.kind === 'spreadsheet') {
        const tabNames = (preview.tabs || []).map((t) => `${t.title} (gid=${t.gid})`).join(', ');
        const activeTitle = preview.activeTab?.title || 'Tab chính';
        const rangeNote = preview.requestedRange ? ` · Vùng đang trỏ: ${preview.requestedRange}` : '';
        let block = `### 📊 Google Sheet: ${preview.title}\n- URL: ${preview.canonicalUrl}\n- Các tab: ${tabNames || activeTitle}\n- Tab đang mở: ${activeTitle}${rangeNote}\n`;

        if (preview.activeTab?.rows?.length) {
          block += `**Dữ liệu tab "${activeTitle}" (tối đa 25 dòng đầu):**\n${formatSheetRowsCompact(
            preview.activeTab.rows,
            1,
            25,
            10
          )}\n`;
        }

        if (preview.activeTab?.snippetRows?.length && preview.parsedRange && preview.parsedRange.startRow > 20) {
          const snippetLines = preview.activeTab.snippetRows.map(
            (sr) => `Row ${sr.rowNumber}: | ${sr.cells.map((c) => c.replace(/\s+/g, ' ').trim()).join(' | ')} |`
          );
          block += `**Vùng quanh ${preview.requestedRange}:**\n${snippetLines.join('\n')}\n`;
        }

        // Also summarize up to 3 sibling tabs (e.g., both NVL and Mi)
        const siblingTabs = (preview.tabs || []).filter((t) => t.gid !== preview.activeTab?.gid).slice(0, 3);
        if (siblingTabs.length > 0) {
          const siblingResults = await Promise.all(
            siblingTabs.map((t) =>
              previewLinkFn({
                url: link.rawUrl,
                gid: t.gid,
                viewer: params.viewer,
                sender: params.sender,
              }).catch(() => null)
            )
          );
          for (const sib of siblingResults) {
            if (sib?.success && sib.activeTab?.rows?.length) {
              block += `**Tab "${sib.activeTab.title}" (15 dòng đầu):**\n${formatSheetRowsCompact(
                sib.activeTab.rows,
                1,
                15,
                10
              )}\n`;
            }
          }
        }

        chunks.push(block.trim());
      } else if (preview.kind === 'canva') {
        const headings = (preview.headings || []).map((h) => `${'#'.repeat(h.level)} ${h.text}`).slice(0, 12);
        let block = `### 🎨 Thiết kế Canva${preview.designType ? ` (${preview.designType})` : ''}: ${preview.title}\n- URL: ${preview.canonicalUrl}\n`;
        if (preview.authorName) {
          block += `- Tác giả: ${preview.authorName}\n`;
        }
        if (headings.length > 0) {
          block += `- Đầu mục chính: ${headings.join(' | ')}\n`;
        }
        if (preview.plainText) {
          block += `**Nội dung trích xuất từ thiết kế:**\n${preview.plainText.slice(0, 2200)}\n`;
        }
        chunks.push(block.trim());
      } else {
        const headings = (preview.headings || []).map((h) => `${'#'.repeat(h.level)} ${h.text}`).slice(0, 12);
        let block = `### 📄 Google Docs: ${preview.title}\n- URL: ${preview.canonicalUrl}\n`;
        if (headings.length > 0) {
          block += `- Mục lục: ${headings.join(' | ')}\n`;
        }
        if (preview.plainText) {
          block += `**Nội dung trích xuất:**\n${preview.plainText.slice(0, 2200)}\n`;
        }
        chunks.push(block.trim());
      }
    } catch {
      // non-blocking
    }
  }

  if (chunks.length === 0) return '';
  return `[Dữ liệu trực tiếp từ Google Workspace đính kèm]\n${chunks.join('\n\n')}`.slice(0, 6000);
}

/**
 * Builds compact Markdown snapshot embedded into mOS Mission tickets when clicking 🚀.
 */
export async function buildMissionWorkspaceSnapshotMarkdown(
  params: {
    text?: string | null;
    viewer?: GoogleWorkspaceActorContext | null;
    sender?: GoogleWorkspaceActorContext | null;
  },
  previewLinkFn: PreviewWorkspaceLinkFn
): Promise<string> {
  const links = extractGoogleWorkspaceLinksFromText(params.text).slice(0, 2);
  if (links.length === 0) return '';

  const parts: string[] = [];
  for (const link of links) {
    try {
      const preview = await Promise.race([
        previewLinkFn({
          url: link.rawUrl,
          viewer: params.viewer,
          sender: params.sender,
        }),
        new Promise<null>((resolveTimer) => setTimeout(() => resolveTimer(null), 6000)),
      ]);
      if (!preview) continue;
      if (!preview.success) {
        parts.push(
          `- **${preview.title}** (${preview.canonicalUrl}) — Trạng thái: \`${preview.accessStatus}\` (${preview.statusMessage || 'Cần chia sẻ cho ' + preview.serviceAccountEmail})`
        );
        continue;
      }

      if (preview.kind === 'spreadsheet') {
        const tabsList = (preview.tabs || []).map((t) => `\`${t.title}\``).join(', ');
        const active = preview.activeTab;
        let section = `**📊 ${preview.title}** ([Mở Sheet](${preview.canonicalUrl}))\n- **Các tab:** ${tabsList || 'Sheet1'}`;
        if (active) {
          section += `\n- **Tab đang trỏ:** \`${active.title}\`${preview.requestedRange ? ` · Ô/Vùng: \`${preview.requestedRange}\`` : ''}`;
          const headerRow =
            active.rows?.[0]
              ?.slice(0, 8)
              .map((c) => c.trim())
              .filter(Boolean) || [];
          if (headerRow.length > 0) {
            section += `\n- **Cột đầu bảng:** ${headerRow.join(' | ')}`;
          }
          if (active.snippetRows?.length) {
            const sample = active.snippetRows
              .slice(0, 5)
              .map((r) => `  - Dòng ${r.rowNumber}: ${r.cells.map((c) => c.trim() || '—').join(' | ')}`)
              .join('\n');
            section += `\n- **Dữ liệu mẫu quanh vùng trỏ:**\n${sample}`;
          }
        }
        // Include header preview of sibling tabs (e.g. NVL + Mi)
        const siblings = (preview.tabs || []).filter((t) => t.gid !== active?.gid).slice(0, 2);
        if (siblings.length > 0) {
          const sibRes = await Promise.all(
            siblings.map((t) =>
              previewLinkFn({
                url: link.rawUrl,
                gid: t.gid,
                viewer: params.viewer,
                sender: params.sender,
              }).catch(() => null)
            )
          );
          for (const sib of sibRes) {
            if (sib?.success && sib.activeTab?.rows?.length) {
              const sibPreviewRows = sib.activeTab.rows
                .slice(0, 4)
                .map(
                  (r, i) =>
                    `  - Dòng ${i + 1}: ${r
                      .slice(0, 6)
                      .map((c) => c.trim() || '—')
                      .join(' | ')}`
                )
                .join('\n');
              section += `\n- **Tab \`${sib.activeTab.title}\`:**\n${sibPreviewRows}`;
            }
          }
        }
        parts.push(section);
      } else if (preview.kind === 'canva') {
        parts.push(
          `**🎨 ${preview.title}** ([Mở Canva](${preview.canonicalUrl}))\n- **Trích đoạn thiết kế:** ${preview.excerpt || preview.plainText?.slice(0, 300) || '(Xem trực tiếp trong khung nhúng)'}`
        );
      } else {
        parts.push(
          `**📄 ${preview.title}** ([Mở Docs](${preview.canonicalUrl}))\n- **Trích đoạn:** ${preview.excerpt || preview.plainText?.slice(0, 300) || '(Trống)'}`
        );
      }
    } catch {
      // non-blocking
    }
  }

  if (parts.length === 0) return '';
  return `### 📊 Dữ liệu Google Workspace đính kèm\n${parts.join('\n\n')}`.slice(0, 2800);
}
