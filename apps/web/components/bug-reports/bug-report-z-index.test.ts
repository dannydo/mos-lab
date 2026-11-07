import { describe, expect, it } from 'vitest';
import { BUG_REPORT_Z_INDEX } from '@mos-lab/shared';

describe('Bug Report Z-Index Hierarchy Specification (MOS-BUG-204)', () => {
  it('ensures preview lightbox is above all bug report surfaces and rejection modals', () => {
    expect(BUG_REPORT_Z_INDEX.PREVIEW).toBeGreaterThan(BUG_REPORT_Z_INDEX.REJECTION_MODAL);
    expect(BUG_REPORT_Z_INDEX.REJECTION_MODAL).toBeGreaterThan(BUG_REPORT_Z_INDEX.WORKFLOW_MODAL);
    expect(BUG_REPORT_Z_INDEX.WORKFLOW_MODAL).toBeGreaterThan(BUG_REPORT_Z_INDEX.SURFACE_MODAL);
    expect(BUG_REPORT_Z_INDEX.SURFACE_MODAL).toBeGreaterThan(BUG_REPORT_Z_INDEX.LAUNCHER);
  });

  it('guarantees PREVIEW z-index is set to 12200 to clear any modal overlay', () => {
    expect(BUG_REPORT_Z_INDEX.PREVIEW).toBe(12200);
    expect(BUG_REPORT_Z_INDEX.REJECTION_MODAL).toBe(12050);
    expect(BUG_REPORT_Z_INDEX.WORKFLOW_MODAL).toBe(12040);
    expect(BUG_REPORT_Z_INDEX.SURFACE_MODAL).toBe(12010);
    expect(BUG_REPORT_Z_INDEX.LAUNCHER).toBe(12000);
  });
});
