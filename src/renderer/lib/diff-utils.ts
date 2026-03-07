/**
 * Computes which line numbers in `newText` are changed or added
 * compared to `oldText` using LCS (Longest Common Subsequence).
 * Returns 1-indexed line numbers.
 *
 * Uses O(n) space via 2-row optimization for the LCS length,
 * then reconstructs which new lines are unchanged via a second pass.
 */
export function computeChangedLines(oldText: string, newText: string): number[] {
  if (oldText === newText) return [];

  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  const m = oldLines.length;
  const n = newLines.length;

  // Skip diff for very large files
  if (m > 5000 || n > 5000) return [];

  // Build a map of old lines -> list of indices for faster matching
  const oldLineMap = new Map<string, number[]>();
  for (let i = 0; i < m; i++) {
    const line = oldLines[i];
    const indices = oldLineMap.get(line);
    if (indices) {
      indices.push(i);
    } else {
      oldLineMap.set(line, [i]);
    }
  }

  // Standard LCS with full DP table (needed for backtracking)
  // For files under 5000 lines, this is at most 25M entries (~200MB)
  // which is acceptable for occasional computation
  const dp: Uint16Array[] = new Array(m + 1);
  for (let i = 0; i <= m; i++) {
    dp[i] = new Uint16Array(n + 1);
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find which new lines are in the LCS
  const unchangedNewLines = new Set<number>();
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (oldLines[i - 1] === newLines[j - 1]) {
      unchangedNewLines.add(j);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  const changed: number[] = [];
  for (let line = 1; line <= n; line++) {
    if (!unchangedNewLines.has(line)) {
      changed.push(line);
    }
  }

  return changed;
}

export type LineChangeType = 'added' | 'modified' | 'deleted';

export interface LineChange {
  /** 1-indexed line number in the new text (for added/modified), or the line AFTER which the deletion occurred */
  line: number;
  type: LineChangeType;
  /** For deletions: the deleted text lines */
  deletedText?: string[];
}

/**
 * Computes a detailed diff between old and new text, returning
 * added, modified, and deleted line info. Uses the same LCS approach
 * but walks both old and new to classify changes.
 */
export function computeDetailedChanges(oldText: string, newText: string): LineChange[] {
  if (oldText === newText) return [];

  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  const m = oldLines.length;
  const n = newLines.length;

  if (m > 5000 || n > 5000) return [];

  // Build LCS DP table
  const dp: Uint16Array[] = new Array(m + 1);
  for (let i = 0; i <= m; i++) {
    dp[i] = new Uint16Array(n + 1);
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Walk the DP table to produce an edit script
  // Collect edits in reverse, then reverse at the end
  const edits: Array<{ type: 'keep' | 'delete' | 'insert'; oldIdx?: number; newIdx?: number }> = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      edits.push({ type: 'keep', oldIdx: i, newIdx: j });
      i--; j--;
    } else if (i > 0 && (j === 0 || dp[i - 1][j] >= dp[i][j - 1])) {
      edits.push({ type: 'delete', oldIdx: i });
      i--;
    } else {
      edits.push({ type: 'insert', newIdx: j });
      j--;
    }
  }
  edits.reverse();

  // Convert edit script to LineChange array
  const changes: LineChange[] = [];
  let ei = 0;
  while (ei < edits.length) {
    const edit = edits[ei];

    if (edit.type === 'keep') {
      ei++;
      continue;
    }

    // Collect consecutive delete/insert runs
    const deleteStart = ei;
    const deletedLines: string[] = [];
    const insertedNewLines: number[] = [];

    while (ei < edits.length && edits[ei].type !== 'keep') {
      if (edits[ei].type === 'delete') {
        deletedLines.push(oldLines[edits[ei].oldIdx! - 1]);
      } else {
        insertedNewLines.push(edits[ei].newIdx!);
      }
      ei++;
    }

    if (deletedLines.length > 0 && insertedNewLines.length > 0) {
      // Lines were modified: pair them up
      const paired = Math.min(deletedLines.length, insertedNewLines.length);
      for (let k = 0; k < paired; k++) {
        changes.push({ line: insertedNewLines[k], type: 'modified' });
      }
      // Excess inserts are additions
      for (let k = paired; k < insertedNewLines.length; k++) {
        changes.push({ line: insertedNewLines[k], type: 'added' });
      }
      // Excess deletes
      if (deletedLines.length > paired) {
        const afterLine = insertedNewLines.length > 0
          ? insertedNewLines[insertedNewLines.length - 1]
          : (deleteStart > 0 && edits[deleteStart - 1].newIdx ? edits[deleteStart - 1].newIdx! : 0);
        changes.push({
          line: afterLine,
          type: 'deleted',
          deletedText: deletedLines.slice(paired),
        });
      }
    } else if (deletedLines.length > 0) {
      // Pure deletion — find the new-text line after which these were deleted
      const afterLine = deleteStart > 0 && edits[deleteStart - 1].newIdx
        ? edits[deleteStart - 1].newIdx!
        : 0;
      changes.push({
        line: afterLine,
        type: 'deleted',
        deletedText: deletedLines,
      });
    } else {
      // Pure insertions
      for (const nl of insertedNewLines) {
        changes.push({ line: nl, type: 'added' });
      }
    }
  }

  return changes;
}
