import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyIdeProductionRelease } from './inbox-ide-release.service.js';
import { makeReleaseManifest } from './inbox-release-manifest.js';

test('real Git content/parent/ancestry and fixed web marker are required, not a caller release claim', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'mos-ide-evidence-test-'));
  const cwd = process.cwd();
  const marker = process.env.DEPLOY_COMMIT;
  const exec = promisify(execFile);
  const git = async (...args: string[]) =>
    (
      await exec('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', ...args], { cwd: directory })
    ).stdout.trim();
  try {
    await git('init');
    await writeFile(join(directory, 'sample.txt'), 'before\n');
    await git('add', 'sample.txt');
    await git('commit', '-m', 'base');
    const baseCommit = await git('rev-parse', 'HEAD');
    await writeFile(join(directory, 'sample.txt'), 'after\n');
    const patch = await git('diff', '--binary', '--no-ext-diff', '--no-renames', 'HEAD');
    const manifest = makeReleaseManifest({
      reportId: 29,
      jobId: 'test-job',
      sourceVersion: 'v1:s',
      planVersion: 'v1:p',
      baseCommit,
      patchHash: createHash('sha256').update(patch).digest('hex'),
      changedFiles: ['apps/api/src/example.ts'],
      tests: [{ command: 'test', status: 'PASSED' }],
    })!;
    await git('add', 'sample.txt');
    await git('commit', '-m', 'reviewed');
    const commit = await git('rev-parse', 'HEAD');
    process.chdir(directory);
    process.env.DEPLOY_COMMIT = commit;
    assert.deepEqual(await verifyIdeProductionRelease(manifest, commit), { apiRelease: commit, webRelease: null });
    await assert.rejects(verifyIdeProductionRelease({ ...manifest, patchHash: '0'.repeat(64) }, commit), {
      code: 'IDE_PATCH_MISMATCH',
    });
    await assert.rejects(verifyIdeProductionRelease({ ...manifest, baseCommit: commit }, commit), {
      code: 'IDE_PATCH_MISMATCH',
    });
    process.env.DEPLOY_COMMIT = baseCommit;
    await assert.rejects(verifyIdeProductionRelease(manifest, commit), { code: 'IDE_RELEASE_UNVERIFIED' });
    process.env.DEPLOY_COMMIT = '';
    await assert.rejects(verifyIdeProductionRelease(manifest, commit), { code: 'IDE_RELEASE_MARKER_MISSING' });
    process.env.DEPLOY_COMMIT = commit;
    const fetch = t.mock.method(globalThis, 'fetch', async (url: unknown) => {
      assert.equal(url, 'https://lab.masteros.app/api/release-version');
      return { ok: true, json: async () => ({ commitSha: commit }) } as never;
    });
    assert.equal(
      (await verifyIdeProductionRelease({ ...manifest, changedFiles: ['apps/web/app/page.tsx'] }, commit)).webRelease,
      commit
    );
    fetch.mock.mockImplementation(async () => ({ ok: true, json: async () => ({ commitSha: baseCommit }) }) as never);
    await assert.rejects(verifyIdeProductionRelease({ ...manifest, changedFiles: ['apps/web/app/page.tsx'] }, commit), {
      code: 'IDE_RELEASE_UNVERIFIED',
    });
  } finally {
    process.chdir(cwd);
    if (marker === undefined) delete process.env.DEPLOY_COMMIT;
    else process.env.DEPLOY_COMMIT = marker;
    await rm(directory, { recursive: true, force: true });
  }
});

test('allows a non-overlapping control-plane hotfix between the reviewed base and one-file candidate commit', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mos-ide-intervening-hotfix-test-'));
  const cwd = process.cwd();
  const marker = process.env.DEPLOY_COMMIT;
  const exec = promisify(execFile);
  const git = async (...args: string[]) =>
    (
      await exec('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', ...args], { cwd: directory })
    ).stdout.trim();
  try {
    await git('init');
    await writeFile(join(directory, 'candidate.txt'), 'before\n');
    await git('add', 'candidate.txt');
    await git('commit', '-m', 'base');
    const baseCommit = await git('rev-parse', 'HEAD');
    await writeFile(join(directory, 'bridge.txt'), 'bridge hotfix\n');
    await git('add', 'bridge.txt');
    await git('commit', '-m', 'bridge hotfix');
    await writeFile(join(directory, 'candidate.txt'), 'after\n');
    const patch = await git('diff', '--binary', '--no-ext-diff', '--no-renames', 'HEAD');
    const manifest = makeReleaseManifest({
      reportId: 30,
      jobId: 'test-job',
      sourceVersion: 'v1:s',
      planVersion: 'v1:p',
      baseCommit,
      patchHash: createHash('sha256').update(patch).digest('hex'),
      changedFiles: ['candidate.txt'],
      tests: [{ command: 'test', status: 'PASSED' }],
    })!;
    await git('add', 'candidate.txt');
    await git('commit', '-m', 'reviewed candidate');
    const commit = await git('rev-parse', 'HEAD');
    process.chdir(directory);
    process.env.DEPLOY_COMMIT = commit;
    assert.deepEqual(await verifyIdeProductionRelease(manifest, commit), { apiRelease: commit, webRelease: null });
    await writeFile(join(directory, 'candidate.txt'), 'overlap\n');
    await git('add', 'candidate.txt');
    await git('commit', '-m', 'overlapping hotfix');
    await writeFile(join(directory, 'candidate.txt'), 'candidate again\n');
    const overlappingCommit = await git('rev-parse', 'HEAD');
    await assert.rejects(verifyIdeProductionRelease(manifest, overlappingCommit), { code: 'IDE_PATCH_MISMATCH' });
  } finally {
    process.chdir(cwd);
    if (marker === undefined) delete process.env.DEPLOY_COMMIT;
    else process.env.DEPLOY_COMMIT = marker;
    await rm(directory, { recursive: true, force: true });
  }
});
