import { describe, expect, it } from 'vitest';
import { createAcademyWorkshopIdempotencyKey } from './academy-workshop-live';

describe('createAcademyWorkshopIdempotencyKey', () => {
  it('uses randomUUID when the browser secure context provides it', () => {
    expect(createAcademyWorkshopIdempotencyKey({ randomUUID: () => 'secure-context-uuid' })).toBe(
      'secure-context-uuid'
    );
  });

  it('falls back to getRandomValues on HTTP LAN Safari where randomUUID is unavailable', () => {
    const key = createAcademyWorkshopIdempotencyKey({
      getRandomValues: (bytes) => {
        bytes.fill(15);
        return bytes;
      },
    });

    expect(key).toMatch(/^workshop-[a-z0-9]+-(0f){16}$/);
  });
});
