#!/usr/bin/env node
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Patterns that warrant auto-refreshing the monorepo architecture graph
const ARCHITECTURAL_PATTERNS = [
  /^apps\/api\/src\/routes\//,
  /^apps\/api\/src\/plugins\//,
  /^apps\/api\/src\/services\//,
  /^apps\/api\/prisma\//,
  /^prisma\//,
  /^packages\/shared\/src\//,
  /^apps\/web\/app\/dashboard\//,
  /^scripts\/generate-graph\.ts$/,
];

function getChangedFiles(stagedOnly = false) {
  try {
    const staged = execSync('git diff --cached --name-only', { encoding: 'utf-8', cwd: rootDir })
      .trim()
      .split('\n')
      .filter(Boolean);

    if (stagedOnly) return staged;

    const unstaged = execSync('git diff --name-only', { encoding: 'utf-8', cwd: rootDir })
      .trim()
      .split('\n')
      .filter(Boolean);

    return Array.from(new Set([...staged, ...unstaged]));
  } catch (err) {
    console.warn('[auto-refresh-graph] Warning: Failed to query git status:', err.message);
    return [];
  }
}

function hasArchitecturalChanges(files) {
  return files.some((file) => ARCHITECTURAL_PATTERNS.some((pattern) => pattern.test(file)));
}

async function main() {
  const isForce = process.argv.includes('--force');
  const isStagedOnly = process.argv.includes('--staged');

  const files = getChangedFiles(isStagedOnly);

  if (!isForce && !hasArchitecturalChanges(files)) {
    // Fast exit if no architectural file changed
    return;
  }

  console.log('🔄 [auto-refresh-graph] Architectural changes detected. Auto-refreshing Knowledge Graph...');
  try {
    execSync('pnpm exec tsx scripts/generate-graph.ts', { stdio: 'inherit', cwd: rootDir });

    // If git has staged files, stage the generated public graph artifacts so they are committed together
    const staged = execSync('git diff --cached --name-only', { encoding: 'utf-8', cwd: rootDir })
      .trim()
      .split('\n')
      .filter(Boolean);

    if (staged.length > 0) {
      execSync('git add apps/web/public/graph.html apps/web/public/graph.json', { cwd: rootDir });
      console.log('📦 [auto-refresh-graph] Staged updated apps/web/public/graph.* artifacts for commit.');
    }
  } catch (err) {
    console.error('⚠️ [auto-refresh-graph] Graph regeneration encountered an error:', err.message);
    // Non-fatal so it does not block emergency commits if graph generation errors
  }
}

main();
