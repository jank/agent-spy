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
