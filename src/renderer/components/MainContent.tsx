import { useEffect } from 'react';
import { useAppStore } from '../stores/app-store';
import { FileViewer } from './FileViewer';
import { EmptyState } from './EmptyState';

export function MainContent() {
  const { selectedFile, viewMode, isGitRepo, isLoading } = useAppStore();

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
        <span className="text-sm font-medium truncate flex-1">
          {selectedFile.relativePath}
        </span>

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
