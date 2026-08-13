import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = join(workspaceRoot, 'apps/web');
const dashboardRoot = join(webRoot, 'app/dashboard');
const maxPageLines = 900;

// These legacy screens are deliberately tracked as migration work. New pages
// must meet the limit; an existing exception may only be removed, never added.
const legacyPageExceptions = new Set([
  'app/dashboard/catalog/page.tsx',
  'app/dashboard/design-system/page.tsx',
  'app/dashboard/loca/page.tsx',
  'app/dashboard/nyc/campaigns/[slug]/page.tsx',
  'app/dashboard/nyc/campaigns/page.tsx',
  'app/dashboard/nyc/page.tsx',
  'app/dashboard/qa-shop/page.tsx',
  'app/dashboard/staff/page.tsx',
]);

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(dir, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

const violations: string[] = [];
const sourceFiles = walk(webRoot).filter((file) => /\.(ts|tsx)$/.test(file) && !file.includes('/.next/'));

for (const file of sourceFiles) {
  const source = readFileSync(file, 'utf8');
  const displayPath = relative(webRoot, file);

  if (/from\s+['"][^'"]*\/lib\/api['"]/.test(source)) {
    violations.push(`${displayPath}: import apiClient from lib/api-client instead of the raw Axios module.`);
  }

  if (file.endsWith('/page.tsx')) {
    const lines = source.split('\n').length;
    if (lines > maxPageLines && !legacyPageExceptions.has(displayPath)) {
      violations.push(`${displayPath}: ${lines} lines exceeds the ${maxPageLines}-line page limit.`);
    }
  }
}

if (violations.length > 0) {
  console.error('UI contract check failed:\n' + violations.map((violation) => `- ${violation}`).join('\n'));
  process.exit(1);
}

console.log(`UI contract check passed (${sourceFiles.length} source files scanned).`);
