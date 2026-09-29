import { describe, it, expect, vi } from 'vitest';
import { pilotApi } from './pilot.api';
import { api } from './base';

vi.mock('./base', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('pilotApi.pilot.aiAnalyzeLash', () => {
  it('calls POST /pilot/sessions/:id/ai-analyze with correct payload', async () => {
    const mockResponse = {
      data: {
        aiAssessment: {
          lashProfile: {
            summary: 'Mi khỏe tự nhiên',
            estimatedThickness: '0.08mm - 0.10mm (Sợi vừa)',
          },
          suitability: 'PASS',
          suitabilityScore: 90,
          riskAttention: 'Không có rủi ro đáng kể',
          recommendation: {
            action: 'Tiến hành uốn',
            solution1DurationMinutes: 10,
            solution2DurationMinutes: 8,
            recommendedRodSize: 'M',
          },
          analyzedAt: new Date().toISOString(),
          method: 'MACRO_15X',
        },
        session: { id: 101, status: 'IN_ASSESSMENT' },
      },
    };

    (api.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

    const payload = {
      photoUrl: 'https://example.com/macro.jpg',
      criteriaSnapshot: [{ criterionId: 1, name: 'Độ dài', passed: true }],
      technicianNotes: 'Mi nguyên bản',
      captureMethod: 'MACRO_15X' as const,
    };

    const res = await pilotApi.pilot.aiAnalyzeLash(101, payload);

    expect(api.post).toHaveBeenCalledWith('/pilot/sessions/101/ai-analyze', payload);
    expect(res.aiAssessment.suitability).toBe('PASS');
    expect(res.aiAssessment.suitabilityScore).toBe(90);
  });
});
