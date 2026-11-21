import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCoalescedBulkSync } from './chat-bulk-sync.js';

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('createCoalescedBulkSync', () => {
  it('returns immediately and does not block the caller', async () => {
    let finished = false;
    const trigger = createCoalescedBulkSync(
      async () => {
        await new Promise((r) => setTimeout(r, 30));
        finished = true;
      },
      () => undefined
    );
    trigger();
    assert.equal(finished, false);
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(finished, true);
  });

  it('coalesces a burst of requests into one in-flight run plus one pending run', async () => {
    let runs = 0;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const trigger = createCoalescedBulkSync(
      async () => {
        runs += 1;
        if (runs === 1) await gate;
      },
      () => undefined
    );
    for (let i = 0; i < 25; i += 1) trigger();
    await tick();
    assert.equal(runs, 1);
    release();
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(runs, 2);
  });

  it('keeps working after a failed run and reports the error', async () => {
    const errors: unknown[] = [];
    let runs = 0;
    const trigger = createCoalescedBulkSync(
      async () => {
        runs += 1;
        if (runs === 1) throw new Error('boom');
      },
      (err) => errors.push(err)
    );
    trigger();
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(errors.length, 1);
    trigger();
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(runs, 2);
  });
});
