import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BUG_REPORT_Z_INDEX } from './bug-report.js';

describe('Bug Report Z-Index Hierarchy Specification (MOS-BUG-204)', () => {
  it('defines strictly increasing stacking context levels', () => {
    assert.ok(
      BUG_REPORT_Z_INDEX.SURFACE_MODAL > BUG_REPORT_Z_INDEX.LAUNCHER,
      'SURFACE_MODAL must be above LAUNCHER'
    );
    assert.ok(
      BUG_REPORT_Z_INDEX.WORKFLOW_MODAL > BUG_REPORT_Z_INDEX.SURFACE_MODAL,
      'WORKFLOW_MODAL must be above SURFACE_MODAL'
    );
    assert.ok(
      BUG_REPORT_Z_INDEX.REJECTION_MODAL > BUG_REPORT_Z_INDEX.WORKFLOW_MODAL,
      'REJECTION_MODAL must be above WORKFLOW_MODAL'
    );
    assert.ok(
      BUG_REPORT_Z_INDEX.PREVIEW > BUG_REPORT_Z_INDEX.REJECTION_MODAL,
      'PREVIEW must be above REJECTION_MODAL so image lightbox is never obscured'
    );
  });

  it('guarantees PREVIEW zIndex is at least 12200 to clear any modal/drawer overlay', () => {
    assert.equal(BUG_REPORT_Z_INDEX.LAUNCHER, 12000);
    assert.equal(BUG_REPORT_Z_INDEX.SURFACE_MODAL, 12010);
    assert.equal(BUG_REPORT_Z_INDEX.WORKFLOW_MODAL, 12040);
    assert.equal(BUG_REPORT_Z_INDEX.REJECTION_MODAL, 12050);
    assert.equal(BUG_REPORT_Z_INDEX.PREVIEW, 12200);
  });
});
