import { useEffect, useRef, useState } from 'react';
import { computeChangedLines } from '../lib/diff-utils';
import { useAppStore } from '../stores/app-store';
import type { WatchedFile } from '../types';

/**
 * Fetches the last committed version of a file and computes
 * which lines in the current content have changed.
 * Caches the committed content per file path to avoid redundant IPC calls.
 */
export function useChangedLines(file: WatchedFile, content: string): number[] {
  const isGitRepo = useAppStore((s) => s.isGitRepo);
  const [changedLines, setChangedLines] = useState<number[]>([]);
  const committedRef = useRef<{ path: string; content: string | null }>({
    path: '',
    content: null,
  });

  const updateLines = (lines: number[]) => {
    setChangedLines(lines);
    useAppStore.getState().setChangedLines(lines);
    if (lines.length > 0) {
      useAppStore.getState().setScrollToLine(lines[0]);
    }
  };

  // Fetch committed content only when file path or git-changed status changes
  useEffect(() => {
    if (!isGitRepo || !file.isGitChanged) {
      committedRef.current = { path: file.absolutePath, content: null };
      updateLines([]);
      return;
    }

    let cancelled = false;
    window.api.getGitCommitted(file.absolutePath).then((committed) => {
      if (cancelled) return;
      committedRef.current = { path: file.absolutePath, content: committed };
      if (committed !== null) {
        updateLines(computeChangedLines(committed, content));
      } else {
        updateLines([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [file.absolutePath, file.isGitChanged, isGitRepo]);

  // Recompute diff when content changes (using cached committed content)
  useEffect(() => {
    const cached = committedRef.current;
    if (cached.path !== file.absolutePath || cached.content === null) return;
    updateLines(computeChangedLines(cached.content, content));
  }, [content, file.absolutePath]);

  return changedLines;
}
