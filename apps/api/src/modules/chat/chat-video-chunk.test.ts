import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  abortChunkedVideoUpload,
  clearActiveVideoUploadSessionsForTests,
  completeChunkedVideoUpload,
  countActiveVideoUploadsForUser,
  initChunkedVideoUpload,
  saveVideoUploadChunk,
} from './chat-video-chunk.service.js';
import { cleanupStaleChatMediaTempFiles } from './chat-video-processor.service.js';

describe('mOS Chat 100MB Chunked Video Upload & Temp GC', () => {
  let tempRoot: string;

  beforeEach(async () => {
    clearActiveVideoUploadSessionsForTests();
    tempRoot = await mkdtemp(join(tmpdir(), 'mos-chat-video-chunk-test-'));
  });

  afterEach(async () => {
    clearActiveVideoUploadSessionsForTests();
    await rm(tempRoot, { recursive: true, force: true });
  });

  it('assembles multi-chunk video upload cleanly on disk and removes temp .chunks folder', async () => {
    const header = Buffer.concat([Buffer.from([0x00, 0x00, 0x00, 0x18]), Buffer.from('ftypmp42', 'ascii')]);
    const chunk0 = Buffer.concat([header, Buffer.alloc(1024, 0x11)]);
    const chunk1 = Buffer.alloc(1024, 0x22);
    const fullBuffer = Buffer.concat([chunk0, chunk1]);

    const init = await initChunkedVideoUpload(
      101,
      {
        fileName: 'clip_100mb_ready.mp4',
        mimeType: 'video/mp4',
        totalSizeBytes: fullBuffer.length,
        totalChunks: 2,
      },
      tempRoot
    );

    assert.equal(init.success, true);
    assert.ok(init.uploadId);

    const res0 = await saveVideoUploadChunk({
      userId: 101,
      uploadId: init.uploadId,
      chunkIndex: 0,
      stream: Readable.from([chunk0]),
      customRootDir: tempRoot,
    });
    assert.equal(res0.uploadedChunks, 1);

    const res1 = await saveVideoUploadChunk({
      userId: 101,
      uploadId: init.uploadId,
      chunkIndex: 1,
      stream: Readable.from([chunk1]),
      customRootDir: tempRoot,
    });
    assert.equal(res1.uploadedChunks, 2);

    const attachment = await completeChunkedVideoUpload({
      userId: 101,
      uploadId: init.uploadId,
      body: { durationSec: 12, width: 1080, height: 1920 },
      customRootDir: tempRoot,
    });

    assert.equal(attachment.isVideo, true);
    assert.equal(attachment.fileExt, 'mp4');
    assert.equal(attachment.sizeBytes, fullBuffer.length);
    assert.match(attachment.url, /^\/api\/chat\/media\/[a-f0-9-]{36}\.mp4$/);

    const savedFileName = attachment.url.split('/').pop()!;
    const diskBytes = await readFile(join(tempRoot, savedFileName));
    assert.deepEqual(diskBytes, fullBuffer);

    await assert.rejects(() => stat(join(tempRoot, '.chunks', init.uploadId)));
    assert.equal(countActiveVideoUploadsForUser('101', tempRoot), 0);
  });

  it('rejects init payloads exceeding 100MB', async () => {
    await assert.rejects(
      () =>
        initChunkedVideoUpload(
          202,
          {
            fileName: 'too_big.mp4',
            mimeType: 'video/mp4',
            totalSizeBytes: 101 * 1024 * 1024,
            totalChunks: 21,
          },
          tempRoot
        ),
      {
        name: 'Error',
        message: 'Video quá lớn (tối đa 100MB).',
      }
    );
  });

  it('enforces max 2 concurrent video uploads per user and frees slot on abort', async () => {
    const s1 = await initChunkedVideoUpload(
      303,
      { fileName: 'v1.mov', mimeType: 'video/quicktime', totalSizeBytes: 5000, totalChunks: 1 },
      tempRoot
    );
    const s2 = await initChunkedVideoUpload(
      303,
      { fileName: 'v2.m4v', mimeType: 'video/x-m4v', totalSizeBytes: 5000, totalChunks: 1 },
      tempRoot
    );

    await assert.rejects(
      () =>
        initChunkedVideoUpload(
          303,
          { fileName: 'v3.mp4', mimeType: 'video/mp4', totalSizeBytes: 5000, totalChunks: 1 },
          tempRoot
        ),
      /tối đa 2 video cùng lúc/i
    );

    await abortChunkedVideoUpload(303, s1.uploadId, tempRoot);
    assert.equal(countActiveVideoUploadsForUser('303', tempRoot), 1);

    const s3 = await initChunkedVideoUpload(
      303,
      { fileName: 'v3.mp4', mimeType: 'video/mp4', totalSizeBytes: 5000, totalChunks: 1 },
      tempRoot
    );
    assert.ok(s3.uploadId);

    await abortChunkedVideoUpload(303, s2.uploadId, tempRoot);
    await abortChunkedVideoUpload(303, s3.uploadId, tempRoot);
  });

  it('cleans up stale .chunks (>24h) and orphan .opt.mp4 (>6h) while preserving fresh entries', async () => {
    const staleChunkDir = join(tempRoot, '.chunks', 'stale-session');
    const freshChunkDir = join(tempRoot, '.chunks', 'fresh-session');
    await mkdir(staleChunkDir, { recursive: true });
    await mkdir(freshChunkDir, { recursive: true });

    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
    await utimes(staleChunkDir, oldDate, oldDate);

    const staleOpt = join(tempRoot, 'abc.opt.mp4');
    const freshOpt = join(tempRoot, 'def.opt.mp4');
    await writeFile(staleOpt, 'old');
    await writeFile(freshOpt, 'new');
    const sevenHoursAgo = new Date(Date.now() - 7 * 60 * 60 * 1000);
    await utimes(staleOpt, sevenHoursAgo, sevenHoursAgo);

    const gc = await cleanupStaleChatMediaTempFiles(tempRoot);
    assert.equal(gc.removedChunkDirs, 1);
    assert.equal(gc.removedTempFiles, 1);

    await assert.rejects(() => stat(staleChunkDir));
    await stat(freshChunkDir);
    await assert.rejects(() => stat(staleOpt));
    await stat(freshOpt);
  });
});
