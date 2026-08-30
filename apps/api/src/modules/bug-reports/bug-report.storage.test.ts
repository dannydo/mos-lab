import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { BugReportStorage } from './bug-report.storage.js';

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

test('private storage validates image magic bytes and blocks traversal', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mos-bug-storage-'));
  process.env.BUG_REPORT_MEDIA_DIR = root;
  try {
    const saved = await BugReportStorage.save(9, {
      fileName: 'proof.png',
      mimeType: 'image/png',
      sizeBytes: ONE_PIXEL_PNG.length,
      dataBase64: ONE_PIXEL_PNG.toString('base64'),
    });
    assert.match(saved.storagePath, /^9\/[a-f0-9-]+\.png$/);
    assert.deepEqual(await BugReportStorage.read(saved.storagePath), ONE_PIXEL_PNG);
    await assert.rejects(() => BugReportStorage.read('../../etc/passwd'), /Đường dẫn ảnh không hợp lệ/);
    await assert.rejects(
      () =>
        BugReportStorage.save(9, {
          fileName: 'fake.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: ONE_PIXEL_PNG.length,
          dataBase64: ONE_PIXEL_PNG.toString('base64'),
        }),
      /không khớp định dạng/
    );
  } finally {
    delete process.env.BUG_REPORT_MEDIA_DIR;
    await rm(root, { recursive: true, force: true });
  }
});
