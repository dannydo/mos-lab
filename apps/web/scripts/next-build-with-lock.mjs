import { mkdir, open, readFile, rm, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';

const distDir = process.env.NEXT_DIST_DIR || '.next';
// Next clears `distDir` at the start of a production build, so the lock must
// live outside it. Otherwise the first build can erase its own lock and let a
// second build enter the same output directory.
const lockPath = join(process.cwd(), '.mos-next-build-locks', `${Buffer.from(distDir).toString('base64url')}.lock`);
const retryDelayMs = 250;
const maximumWaitMs = 10 * 60 * 1000;

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function existingLockIsStale() {
  try {
    const value = JSON.parse(await readFile(lockPath, 'utf8'));
    if (!Number.isInteger(value.pid) || value.pid <= 0) return false;

    try {
      process.kill(value.pid, 0);
      return false;
    } catch (error) {
      return error?.code !== 'EPERM';
    }
  } catch {
    // `open(..., 'wx')` creates the file before its owner writes the JSON
    // payload. Treat that tiny window as locked; otherwise a second build can
    // remove a valid lock and enter Next concurrently.
    try {
      const metadata = await stat(lockPath);
      return Date.now() - metadata.mtimeMs > 60 * 1000;
    } catch {
      return false;
    }
  }
}

async function acquireBuildLock() {
  await mkdir(dirname(lockPath), { recursive: true });
  const deadline = Date.now() + maximumWaitMs;

  while (true) {
    try {
      const handle = await open(lockPath, 'wx');
      await handle.writeFile(`${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`);
      return handle;
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;

      if (await existingLockIsStale()) {
        await rm(lockPath, { force: true });
        continue;
      }

      if (Date.now() >= deadline) {
        throw new Error(`Timed out waiting for the private Next build directory: ${distDir}`);
      }

      await sleep(retryDelayMs);
    }
  }
}

function runNextBuild() {
  return new Promise((resolve, reject) => {
    const executable = process.platform === 'win32' ? 'next.cmd' : 'next';
    const child = spawn(executable, ['build'], { env: process.env, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`next build exited with ${signal ? `signal ${signal}` : `code ${code ?? 'unknown'}`}`));
    });
  });
}

const lock = await acquireBuildLock();
try {
  await runNextBuild();
} finally {
  await lock.close();
  await rm(lockPath, { force: true });
}
