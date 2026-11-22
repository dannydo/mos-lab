import { existsSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_SOURCE_LINES = 650;
export const MAX_AGENTS_MD_BYTES = 15_000;
export const MAX_DOT_AGENTS_MD_BYTES = 1_500;

const SCAN_ROOTS = ['apps/web', 'apps/api/src', 'packages/shared/src'];
const IGNORED_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.turbo', 'generated', '__tests__']);

export interface CodeHealthBaseline {
  version: 1;
  maxSourceLines: number;
  maxAgentsMdBytes: number;
  maxDotAgentsMdBytes: number;
  files: Record<string, number>;
}

export interface CodeHealthResult {
  ok: boolean;
  scannedFiles: number;
  agentsMdBytes: number;
  dotAgentsMdBytes: number;
  baselineCount: number;
  shrunkBelowCap: string[];
  violations: string[];
}

function shouldSkipDir(dirName: string): boolean {
  return dirName.startsWith('.next') || dirName.startsWith('.venv-') || IGNORED_DIRS.has(dirName);
}

function isProductionSourceFile(relPath: string): boolean {
  if (relPath.endsWith('.d.ts')) return false;
  if (!/\.(ts|tsx)$/.test(relPath)) return false;
  if (/\.(test|spec)\.(ts|tsx)$/.test(relPath)) return false;
  return true;
}

function walkFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!shouldSkipDir(entry.name)) {
        results.push(...walkFiles(entryPath));
      }
    } else if (entry.isFile()) {
      results.push(entryPath);
    }
  }
  return results;
}

function toPosixPath(pathValue: string): string {
  return sep === '/' ? pathValue : pathValue.split(sep).join('/');
}

function countLines(filePath: string): number {
  return readFileSync(filePath, 'utf8').split('\n').length;
}

export function evaluateCodeHealth(options?: { rootDir?: string; updateBaseline?: boolean }): CodeHealthResult {
  const rootDir = options?.rootDir ?? join(dirname(fileURLToPath(import.meta.url)), '..');
  const updateBaseline = options?.updateBaseline ?? false;
  const baselinePath = join(rootDir, 'scripts/code-health-baseline.json');

  const violations: string[] = [];
  const agentsMdPath = join(rootDir, 'AGENTS.md');
  const dotAgentsMdPath = join(rootDir, '.agents/AGENTS.md');

  const agentsMdBytes = existsSync(agentsMdPath) ? statSync(agentsMdPath).size : -1;
  const dotAgentsMdBytes = existsSync(dotAgentsMdPath) ? statSync(dotAgentsMdPath).size : -1;

  if (agentsMdBytes < 0) {
    violations.push('AGENTS.md is missing.');
  } else if (agentsMdBytes > MAX_AGENTS_MD_BYTES) {
    violations.push(
      `AGENTS.md is ${agentsMdBytes} bytes, exceeding the ${MAX_AGENTS_MD_BYTES}-byte cap. Move detailed rules to docs/rules/ or a scoped AGENTS.md.`
    );
  }

  if (dotAgentsMdBytes < 0) {
    violations.push('.agents/AGENTS.md is missing.');
  } else if (dotAgentsMdBytes > MAX_DOT_AGENTS_MD_BYTES) {
    violations.push(
      `.agents/AGENTS.md is ${dotAgentsMdBytes} bytes, exceeding the ${MAX_DOT_AGENTS_MD_BYTES}-byte redirect cap. Keep rules in AGENTS.md and docs/rules/.`
    );
  }

  const lineCounts = new Map<string, number>();
  for (const scanRoot of SCAN_ROOTS) {
    const absRoot = join(rootDir, scanRoot);
    for (const filePath of walkFiles(absRoot)) {
      const relPath = toPosixPath(relative(rootDir, filePath));
      if (!isProductionSourceFile(relPath)) continue;
      lineCounts.set(relPath, countLines(filePath));
    }
  }

  if (updateBaseline) {
    const sortedEntries = [...lineCounts.entries()]
      .filter(([, lines]) => lines > MAX_SOURCE_LINES)
      .sort(([a], [b]) => a.localeCompare(b));

    const baseline: CodeHealthBaseline = {
      version: 1,
      maxSourceLines: MAX_SOURCE_LINES,
      maxAgentsMdBytes: MAX_AGENTS_MD_BYTES,
      maxDotAgentsMdBytes: MAX_DOT_AGENTS_MD_BYTES,
      files: Object.fromEntries(sortedEntries),
    };
    writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');

    return {
      ok: violations.length === 0,
      scannedFiles: lineCounts.size,
      agentsMdBytes,
      dotAgentsMdBytes,
      baselineCount: sortedEntries.length,
      shrunkBelowCap: [],
      violations,
    };
  }

  if (!existsSync(baselinePath)) {
    violations.push('scripts/code-health-baseline.json is missing. Run with --update-baseline to initialize.');
    return {
      ok: false,
      scannedFiles: lineCounts.size,
      agentsMdBytes,
      dotAgentsMdBytes,
      baselineCount: 0,
      shrunkBelowCap: [],
      violations,
    };
  }

  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8')) as CodeHealthBaseline;
  const baselineFiles = baseline.files ?? {};
  const shrunkBelowCap: string[] = [];

  for (const [relPath, lines] of [...lineCounts.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const allowedMax = baselineFiles[relPath];
    if (lines > MAX_SOURCE_LINES) {
      if (allowedMax === undefined) {
        violations.push(
          `${relPath}: ${lines} lines exceeds the ${MAX_SOURCE_LINES}-line cap for new/compliant modules. Split into focused modules.`
        );
      } else if (lines > allowedMax) {
        violations.push(
          `${relPath}: grew from baseline ${allowedMax} lines to ${lines} lines (ratchet prohibits growing monoliths).`
        );
      }
    }
  }

  for (const [relPath] of Object.entries(baselineFiles)) {
    const currentLines = lineCounts.get(relPath);
    if (currentLines === undefined || currentLines <= MAX_SOURCE_LINES) {
      shrunkBelowCap.push(relPath);
    }
  }

  return {
    ok: violations.length === 0,
    scannedFiles: lineCounts.size,
    agentsMdBytes,
    dotAgentsMdBytes,
    baselineCount: Object.keys(baselineFiles).length,
    shrunkBelowCap,
    violations,
  };
}

function isDirectCliExecution(): boolean {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isDirectCliExecution()) {
  const args = process.argv.slice(2);
  const updateBaseline = args.includes('--update-baseline');
  const rootFlagIndex = args.indexOf('--root');
  const rootDir = rootFlagIndex >= 0 && args[rootFlagIndex + 1] ? args[rootFlagIndex + 1] : undefined;

  const result = evaluateCodeHealth({ rootDir, updateBaseline });

  if (updateBaseline) {
    console.log(
      `Updated code-health baseline: ${result.baselineCount} files > ${MAX_SOURCE_LINES} lines (${result.scannedFiles} source files scanned).`
    );
  }

  if (result.shrunkBelowCap.length > 0) {
    console.log(
      `Tip: ${result.shrunkBelowCap.length} baseline file(s) are now <= ${MAX_SOURCE_LINES} lines — run --update-baseline to lock in gains: ${result.shrunkBelowCap.slice(0, 5).join(', ')}`
    );
  }

  if (!result.ok) {
    console.error('Code health check failed:\n' + result.violations.map((v) => `- ${v}`).join('\n'));
    process.exit(1);
  }

  console.log(
    `Code health check passed (${result.scannedFiles} files <= ${MAX_SOURCE_LINES} lines or within ${result.baselineCount} baseline caps; AGENTS.md=${result.agentsMdBytes}B, .agents/AGENTS.md=${result.dotAgentsMdBytes}B).`
  );
}
