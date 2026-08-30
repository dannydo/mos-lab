import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { downloadBugBundle, listApprovedQueue } from './bug-agent.js';

const TOKEN = 'test-agent-token-that-is-longer-than-32-characters';

test('Agent CLI lists approved tickets and materializes deterministic bundle files', async () => {
  const server = createServer((request, response) => {
    assert.equal(request.headers.authorization, `Bearer ${TOKEN}`);
    response.setHeader('Content-Type', 'application/json');
    if (request.url === '/api/agent/bug-reports') {
      response.end(
        JSON.stringify({
          data: [
            {
              id: 7,
              key: 'MOS-BUG-7',
              title: 'Popup không lưu',
              status: 'APPROVED',
              priority: 'P1',
              sourcePath: '/dashboard/customers',
              updatedAt: '2026-08-30T12:00:00.000Z',
            },
          ],
        })
      );
      return;
    }
    if (request.url === '/api/agent/bug-reports/MOS-BUG-7') {
      response.end(
        JSON.stringify({
          data: {
            markdown: '# MOS-BUG-7\n\n- attachment-11-proof.png\n',
            report: {
              id: 7,
              key: 'MOS-BUG-7',
              context: { path: '/dashboard/customers', recentApiFailures: [] },
            },
            attachments: [{ id: 11, fileName: 'proof.png', mimeType: 'image/png', sizeBytes: 8 }],
          },
        })
      );
      return;
    }
    if (request.url === '/api/agent/bug-reports/MOS-BUG-7/attachments/11') {
      response.setHeader('Content-Type', 'image/png');
      response.end(Buffer.from('png-data'));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ message: 'not found' }));
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const destinationRoot = await mkdtemp(join(tmpdir(), 'mos-bug-agent-'));
  process.env.MOS_BUG_AGENT_TOKEN = TOKEN;
  process.env.MOS_BUG_AGENT_API_URL = `http://127.0.0.1:${address.port}/api`;

  try {
    const queue = await listApprovedQueue();
    assert.equal(queue[0].key, 'MOS-BUG-7');
    const destination = await downloadBugBundle('MOS-BUG-7', destinationRoot);
    assert.match(await readFile(join(destination, 'report.md'), 'utf8'), /MOS-BUG-7/);
    assert.equal(JSON.parse(await readFile(join(destination, 'context.json'), 'utf8')).path, '/dashboard/customers');
    assert.equal(await readFile(join(destination, 'attachment-11-proof.png'), 'utf8'), 'png-data');
  } finally {
    server.close();
    await rm(destinationRoot, { recursive: true, force: true });
    delete process.env.MOS_BUG_AGENT_TOKEN;
    delete process.env.MOS_BUG_AGENT_API_URL;
  }
});
