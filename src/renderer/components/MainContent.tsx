import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../stores/app-store';
import { FileViewer } from './FileViewer';
import { EmptyState } from './EmptyState';

function ChangeNavigation() {
  const changedLines = useAppStore((s) => s.changedLines);
  const indexRef = useRef(0);

  // Compute hunks from changed lines
  const hunks = useMemo(() => {
    if (changedLines.length === 0) return [];
    const h: number[] = [changedLines[0]];
    for (let i = 1; i < changedLines.length; i++) {
      if (changedLines[i] > changedLines[i - 1] + 1) {
        h.push(changedLines[i]);
      }
    }
    return h;
  }, [changedLines]);

  // Reset index when hunks change
  useMemo(() => {
    indexRef.current = 0;
  }, [hunks]);

  const goNext = useCallback(() => {
    if (hunks.length === 0) return;
    indexRef.current = (indexRef.current + 1) % hunks.length;
    useAppStore.getState().setScrollToLine(hunks[indexRef.current]);
  }, [hunks]);

  const goPrev = useCallback(() => {
    if (hunks.length === 0) return;
    indexRef.current = (indexRef.current - 1 + hunks.length) % hunks.length;
    useAppStore.getState().setScrollToLine(hunks[indexRef.current]);
  }, [hunks]);

  // Register callbacks on the store for keyboard shortcuts
  useEffect(() => {
    useAppStore.getState().setGoToNextChange(goNext);
    useAppStore.getState().setGoToPrevChange(goPrev);
    return () => {
      useAppStore.getState().setGoToNextChange(null);
      useAppStore.getState().setGoToPrevChange(null);
    };
  }, [goNext, goPrev]);

  if (hunks.length === 0) return null;

  return (
    <div className="flex items-center gap-1 app-no-drag">
      <span className="text-xs text-zinc-500 mr-1">
        {hunks.length} {hunks.length === 1 ? 'change' : 'changes'}
      </span>
      <button
        onClick={goPrev}
        className="px-1.5 py-0.5 text-xs rounded hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 text-zinc-500"
        title="Previous change (k)"
      >
        ▲
      </button>
      <button
        onClick={goNext}
        className="px-1.5 py-0.5 text-xs rounded hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 text-zinc-500"
        title="Next change (j)"
      >
        ▼
      </button>
    </div>
  );
}

export function MainContent() {
  const { selectedFile, viewMode, isGitRepo, isLoading, focusPane } = useAppStore();

  const handleViewModeChange = (mode: 'content' | 'diff') => {
    useAppStore.getState().setViewMode(mode);
    if (mode === 'diff' && selectedFile) {
      useAppStore.getState().setLoading(true);
      window.api.getGitDiff(selectedFile.absolutePath).then((data) => {
        useAppStore.getState().setDiffData(data);
      });
    }
  };

  if (!selectedFile) {
    return (
      <div className="flex-1">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
        <span className="text-sm font-medium truncate flex-1">{selectedFile.relativePath}</span>

        {isGitRepo && selectedFile.isGitChanged && <ChangeNavigation />}

        {isGitRepo && (
          <div className="flex gap-1 app-no-drag">
            <button
              onClick={() => handleViewModeChange('content')}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'content'
                  ? 'bg-zinc-200 dark:bg-zinc-700 font-medium'
                  : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 text-zinc-500'
              }`}
            >
              Content
            </button>
            <button
              onClick={() => handleViewModeChange('diff')}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'diff'
                  ? 'bg-zinc-200 dark:bg-zinc-700 font-medium'
                  : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 text-zinc-500'
              }`}
            >
              Diff
            </button>
          </div>
        )}
      </div>

      {/* Focus indicator */}
      <div
        className={`h-[2px] transition-colors duration-200 ${focusPane === 'view' ? 'bg-blue-500' : 'bg-transparent'}`}
      />

      {/* File content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
            Loading...
          </div>
        ) : (
          <FileViewer />
        )}
      </div>
    </div>
  );
}
