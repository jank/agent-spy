import { describe, it, expect } from 'vitest';
import { computeChangedLines, computeDetailedChanges } from '../../../renderer/lib/diff-utils';

describe('computeChangedLines', () => {
  it('returns empty array for identical texts', () => {
    expect(computeChangedLines('hello', 'hello')).toEqual([]);
  });

  it('returns empty array for both empty strings', () => {
    expect(computeChangedLines('', '')).toEqual([]);
  });

  it('detects all lines as changed when old is empty', () => {
    const result = computeChangedLines('', 'line1\nline2\nline3');
    expect(result).toEqual([1, 2, 3]);
  });

  it('returns empty when new text is empty (all deleted)', () => {
    // new text has one line (the empty string), which is changed vs old
    const result = computeChangedLines('line1\nline2', '');
    expect(result).toEqual([1]);
  });

  it('detects a single changed line in the middle', () => {
    const old = 'a\nb\nc';
    const now = 'a\nB\nc';
    const result = computeChangedLines(old, now);
    expect(result).toEqual([2]);
  });

  it('detects added lines at the end', () => {
    const old = 'a\nb';
    const now = 'a\nb\nc\nd';
    const result = computeChangedLines(old, now);
    expect(result).toEqual([3, 4]);
  });

  it('detects added lines at the beginning', () => {
    const old = 'b\nc';
    const now = 'a\nb\nc';
    const result = computeChangedLines(old, now);
    expect(result).toEqual([1]);
  });

  it('detects multiple scattered changes', () => {
    const old = 'a\nb\nc\nd\ne';
    const now = 'a\nX\nc\nY\ne';
    const result = computeChangedLines(old, now);
    expect(result).toEqual([2, 4]);
  });

  it('handles complete replacement', () => {
    const old = 'a\nb\nc';
    const now = 'x\ny\nz';
    const result = computeChangedLines(old, now);
    expect(result).toEqual([1, 2, 3]);
  });

  it('returns empty array for files exceeding 5000 lines', () => {
    const big = Array(5001).fill('line').join('\n');
    expect(computeChangedLines(big, big + '\nextra')).toEqual([]);
  });

  it('handles single line change', () => {
    const result = computeChangedLines('old', 'new');
    expect(result).toEqual([1]);
  });
});

describe('computeDetailedChanges', () => {
  it('returns empty array for identical texts', () => {
    expect(computeDetailedChanges('hello', 'hello')).toEqual([]);
  });

  it('returns empty array for both empty strings', () => {
    expect(computeDetailedChanges('', '')).toEqual([]);
  });

  it('detects pure additions', () => {
    const result = computeDetailedChanges('a\nc', 'a\nb\nc');
    expect(result).toEqual([{ line: 2, type: 'added' }]);
  });

  it('detects pure deletions', () => {
    const result = computeDetailedChanges('a\nb\nc', 'a\nc');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('deleted');
    expect(result[0].deletedText).toEqual(['b']);
  });

  it('detects modifications (replaced lines)', () => {
    const result = computeDetailedChanges('a\nb\nc', 'a\nB\nc');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ line: 2, type: 'modified' });
  });

  it('detects mixed additions and deletions', () => {
    const old = 'a\nb\nc';
    const now = 'a\nx\ny\nc';
    // b -> x (modified), y is added
    const result = computeDetailedChanges(old, now);
    const types = result.map((r) => r.type);
    expect(types).toContain('modified');
    expect(types).toContain('added');
  });

  it('handles adding lines to empty text', () => {
    // '' splits into [''], so old has 1 line; 'a\nb' has 2 lines
    // The empty line -> 'a' is a modification, 'b' is an addition
    const result = computeDetailedChanges('', 'a\nb');
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('modified');
    expect(result[1].type).toBe('added');
  });

  it('handles deleting all content', () => {
    const result = computeDetailedChanges('a\nb', '');
    // The empty string is one "line" that differs from old
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns empty array for files exceeding 5000 lines', () => {
    const big = Array(5001).fill('line').join('\n');
    expect(computeDetailedChanges(big, big + '\nextra')).toEqual([]);
  });

  it('detects multiple deletions at once', () => {
    const result = computeDetailedChanges('a\nb\nc\nd', 'a\nd');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('deleted');
    expect(result[0].deletedText).toEqual(['b', 'c']);
  });

  it('modification with excess deletes', () => {
    // 3 old lines replaced by 1 new line: 1 modified + 2 deleted
    const result = computeDetailedChanges('a\nx\ny\nz\nb', 'a\nW\nb');
    const modified = result.filter((r) => r.type === 'modified');
    const deleted = result.filter((r) => r.type === 'deleted');
    expect(modified.length).toBe(1);
    expect(deleted.length).toBe(1);
    expect(deleted[0].deletedText).toHaveLength(2);
  });
});
