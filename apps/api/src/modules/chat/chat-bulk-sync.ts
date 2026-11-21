/**
 * Background "bulk" lane for full relational re-sync (every conversation, message and thread reply).
 *
 * A full sync issues thousands of sequential upserts. Running it on the shared write chain made every
 * chat write (messages, thread replies, @MAI mentions) wait behind it, so the API hung whenever a linked
 * mOS Mission kept updating (2026-11-21 incident). This lane:
 *  - never blocks user-facing writes,
 *  - coalesces bursts into at most one run in flight plus one pending run,
 *  - re-reads the latest state inside `run()` on every iteration (never a stale snapshot).
 */
export function createCoalescedBulkSync(run: () => Promise<void>, onError: (err: unknown) => void): () => void {
  let running = false;
  let requested = false;
  return () => {
    requested = true;
    if (running) return;
    running = true;
    void (async () => {
      try {
        while (requested) {
          requested = false;
          await run();
        }
      } catch (err) {
        onError(err);
      } finally {
        running = false;
      }
    })();
  };
}
