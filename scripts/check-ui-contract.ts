import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UI_CATALOG_ITEMS } from '../apps/web/components/design-system/catalog.manifest.ts';
import { LEGACY_UI_EXCEPTIONS } from './ui-legacy-exceptions.ts';

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = join(workspaceRoot, 'apps/web');
const dashboardRoot = join(webRoot, 'app/dashboard');
const maxPageLines = 900;
const uiIndexPath = join(webRoot, 'components/ui/index.ts');
const forbiddenProductImports = new Set(['Table', 'Modal', 'Drawer', 'Tag', 'Statistic', 'Spin', 'Empty', 'Result']);

// These legacy screens are deliberately tracked as migration work. New pages
// must meet the limit; an existing exception may only be removed, never added.
const legacyPageExceptions = new Set([
  'app/dashboard/catalog/page.tsx',
  'app/dashboard/design-system/page.tsx',
  'app/dashboard/fal/page.tsx',
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

function getImportedNames(source: string, moduleName: string): string[] {
  const escapedModuleName = moduleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const importPattern = new RegExp(
    `import\\s*(?:type\\s*)?\\{([\\s\\S]*?)\\}\\s*from\\s*['\"]${escapedModuleName}['\"]`,
    'g'
  );
  const names = new Set<string>();

  for (const match of source.matchAll(importPattern)) {
    for (const specifier of match[1].split(',')) {
      const imported = specifier
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)[0]
        ?.trim();
      if (imported) names.add(imported);
    }
  }

  return [...names];
}

function getRawUiImportCounts(source: string) {
  const antdImports = getImportedNames(source, 'antd').filter((name) => forbiddenProductImports.has(name));
  const antIconImports = /from\s+['"]@ant-design\/icons['"]/.test(source) ? 1 : 0;
  return {
    antdImports,
    antIconImports,
  };
}

function getBaselineRef(): string | null {
  const configured = process.env.UI_CONTRACT_BASE_REF;
  const candidates = [
    configured,
    process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : undefined,
    'origin/main',
    'HEAD',
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    try {
      execFileSync('git', ['rev-parse', '--verify', candidate], { cwd: workspaceRoot, stdio: 'ignore' });
      return candidate;
    } catch {
      // Try the next available local or CI base reference.
    }
  }

  return null;
}

function getChangedWebFiles(baseRef: string): Set<string> {
  try {
    const changedOutput = execFileSync('git', ['diff', '--name-only', '--diff-filter=AM', baseRef, '--', 'apps/web'], {
      cwd: workspaceRoot,
      encoding: 'utf8',
    });
    const untrackedOutput = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', 'apps/web'], {
      cwd: workspaceRoot,
      encoding: 'utf8',
    });
    return new Set(
      `${changedOutput}\n${untrackedOutput}`
        .split('\n')
        .filter(Boolean)
        .map((file) => relative(webRoot, join(workspaceRoot, file)))
    );
  } catch {
    return new Set();
  }
}

function getSourceAtRef(baseRef: string, displayPath: string): string {
  try {
    return execFileSync('git', ['show', `${baseRef}:apps/web/${displayPath}`], {
      cwd: workspaceRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return '';
  }
}

const uiIndexSource = readFileSync(uiIndexPath, 'utf8');
for (const item of UI_CATALOG_ITEMS) {
  if (!existsSync(join(workspaceRoot, item.filePath))) {
    violations.push(`UI catalog entry ${item.id} references a missing file: ${item.filePath}.`);
  }
  if (!new RegExp(`\\b${item.exportName}\\b`).test(uiIndexSource)) {
    violations.push(`UI catalog entry ${item.id} references a non-public export: ${item.exportName}.`);
  }
}

const baselineRef = getBaselineRef();
const changedWebFiles = baselineRef ? getChangedWebFiles(baselineRef) : new Set<string>();
const legacyExceptions = new Map(LEGACY_UI_EXCEPTIONS.map((item) => [item.path, item]));

for (const exception of LEGACY_UI_EXCEPTIONS) {
  if (new Date(`${exception.sunset}T23:59:59Z`).getTime() < Date.now()) {
    violations.push(`UI legacy exception expired: ${exception.path} (${exception.sunset}).`);
  }
}

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

  const isProductSource =
    displayPath.startsWith('app/dashboard/') &&
    !displayPath.startsWith('app/dashboard/design-system/') &&
    !displayPath.includes('/__tests__/');
  if (!isProductSource || !baselineRef || !changedWebFiles.has(displayPath)) continue;

  const previous = getRawUiImportCounts(getSourceAtRef(baselineRef, displayPath));
  const current = getRawUiImportCounts(source);
  const exception = legacyExceptions.get(displayPath);
  const increasedAntdImports = current.antdImports.filter(
    (name) => !previous.antdImports.includes(name) && !exception?.allowedAntdImports?.includes(name)
  );
  if (increasedAntdImports.length > 0) {
    violations.push(
      `${displayPath}: adds raw Ant Design UI imports (${increasedAntdImports.join(', ')}). Use an Assembly Kit primitive or migrate an existing exception instead.`
    );
  }
  if (current.antIconImports > previous.antIconImports && !exception?.allowAntIcons) {
    violations.push(
      `${displayPath}: adds a direct @ant-design/icons import. Use AppIcon with a Lucide symbol instead.`
    );
  }
}

if (violations.length > 0) {
  console.error('UI contract check failed:\n' + violations.map((violation) => `- ${violation}`).join('\n'));
  process.exit(1);
}

console.log(
  `UI contract check passed (${sourceFiles.length} source files scanned${baselineRef ? `; UI drift compared to ${baselineRef}` : ''}).`
);
