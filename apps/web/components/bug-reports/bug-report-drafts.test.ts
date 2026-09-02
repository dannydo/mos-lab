import { describe, expect, it } from 'vitest';
import { carryRequestDraft, createRequestDrafts, emptyRequestDraft, updateRequestDraft } from './bug-report-drafts';

describe('bug report form drafts', () => {
  it('keeps descriptions and uploaded images isolated by request type', () => {
    const bugImage = { name: 'bug.png', size: 1024 } as File;
    const featureImage = { name: 'feature.png', size: 2048 } as File;
    const initial = createRequestDrafts();

    const withBugDraft = updateRequestDraft(initial, 'bug', {
      description: 'Nút Lưu không hoạt động',
      files: [bugImage],
    });
    const withBothDrafts = updateRequestDraft(withBugDraft, 'feature', {
      description: 'Cần thêm bộ lọc theo đội',
      files: [featureImage],
    });

    expect(withBothDrafts.bug).toMatchObject({
      description: 'Nút Lưu không hoạt động',
      files: [bugImage],
    });
    expect(withBothDrafts.feature).toMatchObject({
      description: 'Cần thêm bộ lọc theo đội',
      files: [featureImage],
    });
  });

  it('resets only the submitted draft', () => {
    const featureImage = { name: 'feature.png', size: 2048 } as File;
    const withFeatureDraft = updateRequestDraft(createRequestDrafts(), 'feature', {
      description: 'Cần thêm chức năng mới',
      files: [featureImage],
    });
    const afterBugReset = updateRequestDraft(withFeatureDraft, 'bug', emptyRequestDraft());

    expect(afterBugReset.bug).toEqual(emptyRequestDraft());
    expect(afterBugReset.feature.files).toEqual([featureImage]);
    expect(afterBugReset.feature.description).toBe('Cần thêm chức năng mới');
  });

  it('carries an unfinished intake and attachments across a manual type correction', () => {
    const image = { name: 'evidence.png', size: 1024 } as File;
    const bugDraft = updateRequestDraft(createRequestDrafts(), 'bug', {
      description: 'Nút lưu không hoạt động',
      files: [image],
    });

    expect(carryRequestDraft(bugDraft, 'bug', 'feature').feature).toMatchObject({
      description: 'Nút lưu không hoạt động',
      files: [image],
    });
  });
});
