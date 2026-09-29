import { describe, expect, it } from 'vitest';
import {
  createAcademyWorkshopIdempotencyKey,
  formatAgendaTime,
  formatAgendaExecutionText,
} from './academy-workshop-live';

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

describe('formatAgendaTime', () => {
  it('formats dates into Hhmm format correctly', () => {
    // Note: Use a fixed local date
    const d1 = new Date(2026, 8, 29, 9, 45, 0);
    const d2 = new Date(2026, 8, 29, 10, 25, 0);
    const d3 = new Date(2026, 8, 29, 9, 5, 0);
    expect(formatAgendaTime(d1)).toBe('9h45');
    expect(formatAgendaTime(d2)).toBe('10h25');
    expect(formatAgendaTime(d3)).toBe('9h05');
  });

  it('handles null or invalid input gracefully', () => {
    expect(formatAgendaTime(null)).toBe('');
    expect(formatAgendaTime(undefined)).toBe('');
    expect(formatAgendaTime('invalid-date')).toBe('');
  });
});

describe('formatAgendaExecutionText', () => {
  it('formats completed item execution time as requested in MOS-FEAT-65', () => {
    const startedAt = new Date(2026, 8, 29, 9, 45, 0).toISOString();
    const completedAt = new Date(2026, 8, 29, 10, 25, 0).toISOString();

    const text = formatAgendaExecutionText({
      status: 'COMPLETED',
      startedAt,
      completedAt,
      actualDurationSeconds: 2400, // 40 minutes
    });

    expect(text).toBe('đã hoàn thành và thời gian thực tế diễn ra từ 9h45 đến 10h25 trong 40 phút');
  });

  it('supports capitalized version at the beginning of a sentence', () => {
    const startedAt = new Date(2026, 8, 29, 9, 45, 0).toISOString();
    const completedAt = new Date(2026, 8, 29, 10, 25, 0).toISOString();

    const text = formatAgendaExecutionText(
      {
        status: 'COMPLETED',
        startedAt,
        completedAt,
        actualDurationSeconds: 2400,
      },
      true
    );

    expect(text).toBe('Đã hoàn thành và thời gian thực tế diễn ra từ 9h45 đến 10h25 trong 40 phút');
  });

  it('calculates duration from timestamps when actualDurationSeconds is missing', () => {
    const startedAt = new Date(2026, 8, 29, 9, 45, 0).toISOString();
    const completedAt = new Date(2026, 8, 29, 10, 25, 0).toISOString();

    const text = formatAgendaExecutionText({
      status: 'COMPLETED',
      startedAt,
      completedAt,
    });

    expect(text).toBe('đã hoàn thành và thời gian thực tế diễn ra từ 9h45 đến 10h25 trong 40 phút');
  });

  it('returns null if item is not COMPLETED or missing timestamps', () => {
    expect(formatAgendaExecutionText({ status: 'RUNNING', startedAt: new Date().toISOString() })).toBeNull();
    expect(formatAgendaExecutionText({ status: 'PENDING' })).toBeNull();
    expect(formatAgendaExecutionText({ status: 'COMPLETED', startedAt: null, completedAt: null })).toBeNull();
  });
});
