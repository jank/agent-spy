import { useEffect, useRef, useState } from 'react';
import { computeDetailedChanges, type LineChange } from '../lib/diff-utils';
import { useAppStore } from '../stores/app-store';
import type { WatchedFile } from '../types';

/**
 * Like useChangedLines but returns detailed change info (added/modified/deleted)
 * for richer rendering in the markdown viewer.
 * Also updates the store's changedLines for navigation.
 */
export function useDetailedChanges(file: WatchedFile, content: string): LineChange[] {
  const isGitRepo = useAppStore((s) => s.isGitRepo);
  const [changes, setChanges] = useState<LineChange[]>([]);
  const committedRef = useRef<{ path: string; content: string | null }>({ path: '', content: null });

  const updateChanges = (c: LineChange[]) => {
    setChanges(c);
    const lines = c.filter((ch) => ch.type !== 'deleted').map((ch) => ch.line);
    // Include deletion positions for navigation
    const deletionLines = c.filter((ch) => ch.type === 'deleted').map((ch) => ch.line);
    const allLines = [...new Set([...lines, ...deletionLines])].sort((a, b) => a - b);
    useAppStore.getState().setChangedLines(allLines);
    if (allLines.length > 0) {
      useAppStore.getState().setScrollToLine(allLines[0]);
    }
  };

  useEffect(() => {
    if (!isGitRepo || !file.isGitChanged) {
      committedRef.current = { path: file.absolutePath, content: null };
      updateChanges([]);
      return;
    }

    let cancelled = false;
    window.api.getGitCommitted(file.absolutePath).then((committed) => {
      if (cancelled) return;
      committedRef.current = { path: file.absolutePath, content: committed };
      if (committed !== null) {
        updateChanges(computeDetailedChanges(committed, content));
      } else {
        updateChanges([]);
      }
    });
    return () => { cancelled = true; };
  }, [file.absolutePath, file.isGitChanged, isGitRepo]);

  useEffect(() => {
    const cached = committedRef.current;
    if (cached.path !== file.absolutePath || cached.content === null) return;
    updateChanges(computeDetailedChanges(cached.content, content));
  }, [content, file.absolutePath]);

  return changes;
}
