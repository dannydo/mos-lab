import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  columnIndexToLetter,
  columnLetterToIndex,
  extractGoogleWorkspaceLinksFromText,
  parseGoogleSheetRangeNotation,
  parseGoogleWorkspaceUrl,
} from './google-workspace-link.js';

describe('google-workspace-link utils', () => {
  it('converts column index and letter bidirectionally', () => {
    assert.equal(columnIndexToLetter(0), 'A');
    assert.equal(columnIndexToLetter(3), 'D');
    assert.equal(columnIndexToLetter(25), 'Z');
    assert.equal(columnIndexToLetter(26), 'AA');
    assert.equal(columnLetterToIndex('A'), 0);
    assert.equal(columnLetterToIndex('D'), 3);
    assert.equal(columnLetterToIndex('AA'), 26);
  });

  it('parses Google Sheet URL with gid and #range=D17 (Kho De Tham link)', () => {
    const raw =
      'https://docs.google.com/spreadsheets/d/1_T_X3L12RWMs1LRjAROBKSbQiN-hUCJwCOmtC8uULFQ/edit?gid=516151439#gid=516151439&range=D17';
    const parsed = parseGoogleWorkspaceUrl(raw);
    assert.ok(parsed);
    assert.equal(parsed.kind, 'spreadsheet');
    assert.equal(parsed.fileId, '1_T_X3L12RWMs1LRjAROBKSbQiN-hUCJwCOmtC8uULFQ');
    assert.equal(parsed.gid, '516151439');
    assert.equal(parsed.range, 'D17');
    assert.equal(parsed.shortChipLabel, 'Google Sheet · D17');
    assert.deepEqual(parsed.parsedRange, {
      sheetName: null,
      startCol: 3,
      endCol: 3,
      startRow: 17,
      endRow: 17,
      label: 'D17',
      anchorCell: 'D17',
    });
    assert.match(parsed.embedUrl, /rm=minimal/);
    assert.match(parsed.embedUrl, /gid=516151439/);
  });

  it('parses complex A1 range notations including quoted sheet names', () => {
    const range = parseGoogleSheetRangeNotation('%27NVL%27!B3:F15');
    assert.deepEqual(range, {
      sheetName: 'NVL',
      startCol: 1,
      endCol: 5,
      startRow: 3,
      endRow: 15,
      label: 'B3:F15',
      anchorCell: 'B3',
    });
  });

  it('parses Google Docs URL with tab and heading', () => {
    const raw = 'https://docs.google.com/document/d/1AbCDefGhIJkLmNoPqRsTuVwXyZ0123456/edit?tab=t.0#heading=h.xyz123';
    const parsed = parseGoogleWorkspaceUrl(raw);
    assert.ok(parsed);
    assert.equal(parsed.kind, 'document');
    assert.equal(parsed.fileId, '1AbCDefGhIJkLmNoPqRsTuVwXyZ0123456');
    assert.equal(parsed.tab, 't.0');
    assert.equal(parsed.heading, 'h.xyz123');
    assert.equal(parsed.shortChipLabel, 'Google Docs');
  });

  it('extracts and deduplicates Google Workspace links from chat text and HTML/Markdown', () => {
    const text = [
      '@Danny Do xem giúp em:',
      'https://docs.google.com/spreadsheets/d/1_T_X3L12RWMs1LRjAROBKSbQiN-hUCJwCOmtC8uULFQ/edit?gid=516151439#gid=516151439&range=D17.',
      '[Link lai](https://docs.google.com/spreadsheets/d/1_T_X3L12RWMs1LRjAROBKSbQiN-hUCJwCOmtC8uULFQ/edit?gid=516151439#gid=516151439&range=D17)',
      'Va file quy trinh: https://docs.google.com/document/d/1AbCDefGhIJkLmNoPqRsTuVwXyZ0123456/edit?usp=sharing)',
    ].join('\n');

    const links = extractGoogleWorkspaceLinksFromText(text);
    assert.equal(links.length, 2);
    assert.equal(links[0].kind, 'spreadsheet');
    assert.equal(links[0].range, 'D17');
    assert.equal(links[1].kind, 'document');
    assert.equal(links[1].fileId, '1AbCDefGhIJkLmNoPqRsTuVwXyZ0123456');
  });

  it('rejects non-Google-Workspace URLs safely', () => {
    assert.equal(parseGoogleWorkspaceUrl('https://evil.example.com/spreadsheets/d/1234567890123'), null);
    assert.equal(parseGoogleWorkspaceUrl('not-a-url'), null);
  });
});
