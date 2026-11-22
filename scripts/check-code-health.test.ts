import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  evaluateCodeHealth,
  MAX_AGENTS_MD_BYTES,
  MAX_DOT_AGENTS_MD_BYTES,
  MAX_SOURCE_LINES,
} from './check-code-health.ts';

function setupFixture(): string {
  const dir = mkdtempSync(join(tmpdir(), 'mos-code-health-'));
  mkdirSync(join(dir, '.agents'), { recursive: true });
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  mkdirSync(join(dir, 'apps/web/components'), { recursive: true });
  mkdirSync(join(dir, 'apps/api/src/modules'), { recursive: true });
  mkdirSync(join(dir, 'packages/shared/src'), { recursive: true });

  writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS\n', 'utf8');
  writeFileSync(join(dir, '.agents/AGENTS.md'), '# Redirect\n', 'utf8');
  writeFileSync(join(dir, 'apps/web/components/Small.tsx'), 'export const x = 1;\n', 'utf8');
  return dir;
}

describe('check-code-health', () => {
  it('passes on the real repository baseline', () => {
    const result = evaluateCodeHealth();
    assert.equal(result.ok, true, result.violations.join('\n'));
    assert.ok(result.agentsMdBytes <= MAX_AGENTS_MD_BYTES);
    assert.ok(result.dotAgentsMdBytes <= MAX_DOT_AGENTS_MD_BYTES);
  });

  it('fails when AGENTS.md exceeds byte cap or a new source file exceeds 650 lines', () => {
    const dir = setupFixture();
    try {
      evaluateCodeHealth({ rootDir: dir, updateBaseline: true });
      assert.equal(evaluateCodeHealth({ rootDir: dir }).ok, true);

      writeFileSync(join(dir, 'AGENTS.md'), 'a'.repeat(MAX_AGENTS_MD_BYTES + 10), 'utf8');
      const agentsFail = evaluateCodeHealth({ rootDir: dir });
      assert.equal(agentsFail.ok, false);
      assert.match(agentsFail.violations[0] ?? '', /AGENTS\.md/);

      writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS\n', 'utf8');
      writeFileSync(
        join(dir, 'apps/api/src/modules/TooBig.ts'),
        Array.from({ length: MAX_SOURCE_LINES + 5 }, (_, i) => `export const v${i} = ${i};`).join('\n'),
        'utf8'
      );
      const locFail = evaluateCodeHealth({ rootDir: dir });
      assert.equal(locFail.ok, false);
      assert.match(locFail.violations[0] ?? '', /TooBig\.ts/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('ratchets existing baseline files without allowing growth', () => {
    const dir = setupFixture();
    try {
      const legacyPath = join(dir, 'apps/web/components/Legacy.tsx');
      writeFileSync(
        legacyPath,
        Array.from({ length: MAX_SOURCE_LINES + 20 }, (_, i) => `const a${i} = ${i};`).join('\n'),
        'utf8'
      );
      evaluateCodeHealth({ rootDir: dir, updateBaseline: true });
      assert.equal(evaluateCodeHealth({ rootDir: dir }).ok, true);

      writeFileSync(
        legacyPath,
        Array.from({ length: MAX_SOURCE_LINES + 21 }, (_, i) => `const a${i} = ${i};`).join('\n'),
        'utf8'
      );
      const growthFail = evaluateCodeHealth({ rootDir: dir });
      assert.equal(growthFail.ok, false);
      assert.match(growthFail.violations[0] ?? '', /grew from baseline/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
