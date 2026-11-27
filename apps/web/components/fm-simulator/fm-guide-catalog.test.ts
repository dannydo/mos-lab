import { describe, expect, it } from 'vitest';
import { PILLAR_SPECS } from './fm-simulator.constants';
import { FM_GUIDE_CATALOG } from './fm-guide-content-pillars';

describe('FM_GUIDE_CATALOG coverage & structure', () => {
  it('covers every pillar spec with a dedicated pillar guide', () => {
    for (const pillar of PILLAR_SPECS) {
      const guide = FM_GUIDE_CATALOG[`pillar-${pillar.key}`];
      expect(guide, `Missing guide for pillar-${pillar.key}`).toBeDefined();
      expect(guide.title.length).toBeGreaterThan(0);
    }
  });

  it('has complete explanation, worked example, and Wings philosophy for every entry', () => {
    const entries = Object.values(FM_GUIDE_CATALOG);
    expect(entries.length).toBeGreaterThanOrEqual(25);
    for (const entry of entries) {
      expect(entry.badge.length).toBeGreaterThan(0);
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.summary.length).toBeGreaterThan(0);
      expect(entry.howItWorks.length).toBeGreaterThan(0);
      expect(entry.example.lines.length).toBeGreaterThan(0);
      expect(entry.example.result.length).toBeGreaterThan(0);
      expect(entry.philosophy.length).toBeGreaterThan(0);
    }
  });
});
