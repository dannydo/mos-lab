import { describe, expect, it } from 'vitest';
import { FALLBACK_SERVICES } from './constants';

describe('Lash Lift Booking Service Integration', () => {
  it('includes LASH LIFT (Uốn mi) in FALLBACK_SERVICES with standard 990.000 VND and 60 minutes', () => {
    const lashLift = FALLBACK_SERVICES.find(
      (s) => s.name.toLowerCase().includes('lash lift') || s.name.toLowerCase().includes('uốn mi')
    );

    expect(lashLift).toBeDefined();
    expect(lashLift?.name).toBe('LASH LIFT (Uốn mi)');
    expect(lashLift?.price).toBe(990000);
    expect(lashLift?.duration).toBe(60);
  });
});
