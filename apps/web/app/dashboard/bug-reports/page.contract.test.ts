import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');

describe('Inbox assembly boundary', () => {
  it('keeps the route and its cohesive detail units below the unchanged canonical page budget', () => {
    const checker = read('../../../../../scripts/check-ui-contract.ts');
    const limit = checker.match(/const maxPageLines = (\d+);/)?.[1];
    expect(limit, 'Do not waive or raise the repository UI-contract limit.').toBe('900');

    for (const path of ['./page.tsx', './components/BugReportDetailDrawer.tsx', './hooks/useBugReportDetail.ts']) {
      const lines = read(path).split('\n').length;
      expect(
        lines,
        path + ': extract a cohesive presentation/request unit instead of expanding the page.'
      ).toBeLessThanOrEqual(Number(limit));
    }
  });

  it('keeps detail request ownership out of the route composition', () => {
    const page = read('./page.tsx');
    expect(page).toContain('<ResourceListPage<BugReportSummary>');
    expect(page).toContain('<BugReportDetailDrawer');
    expect(page).not.toMatch(/function (?:DetailDrawer|BugReportDetailDrawer)\s*\(/);
    expect(page).not.toContain('setSaving');
    expect(page).not.toContain('hydrateForm');
    expect(read('./components/BugReportDetailDrawer.tsx')).toContain('useBugReportDetail(actions)');
    expect(read('./hooks/useBugReportDetail.ts')).not.toMatch(/apiClient\.|\bfetch\s*\(/);
  });
});
