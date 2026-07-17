import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../stores/app-store';
import { useThemeStore } from '../hooks/use-theme';
import { FileList } from './FileList';
import type { FileFilterMode } from '../types';

const THEME_ICONS: Record<string, string> = {
  system: '\u25D1', // ◑
  light: '\u2600', // ☀
  dark: '\u263E', // ☾
};

function ThemeToggle() {
  const { mode, cycle } = useThemeStore();
  return (
    <button
      onClick={cycle}
      className="app-no-drag shrink-0 w-6 h-6 flex items-center justify-center text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded transition-colors"
      title={`Theme: ${mode}`}
    >
      {THEME_ICONS[mode]}
    </button>
  );
}

export function Sidebar() {
  const { folderPath, focusPane } = useAppStore();
  const fileCount = useAppStore((s) => s.files.length);
  const branch = useAppStore((s) => s.branch);
  const [width, setWidth] = useState(280);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FileFilterMode>('all');
  const isResizing = useRef(false);
  const filterRef = useRef<HTMLInputElement>(null);

  const toggleChanged = useCallback(
    () => setFilterMode((m) => (m === 'changed' ? 'all' : 'changed')),
    [],
  );
  // Only meaningful when a feature branch is checked out
  const toggleBranch = useCallback(() => {
    if (!useAppStore.getState().branch.onBranch) return;
    setFilterMode((m) => (m === 'branch' ? 'all' : 'branch'));
  }, []);

  // Fall back to 'all' if the branch filter is active but we leave the branch
  useEffect(() => {
    if (!branch.onBranch) {
      setFilterMode((m) => (m === 'branch' ? 'all' : m));
    }
  }, [branch.onBranch]);

  // Restore persisted sidebar width
  useEffect(() => {
    window.api.getPersistedState().then((state) => {
      if (state.sidebarWidth) setWidth(state.sidebarWidth);
    });
  }, []);

  // Register keyboard shortcut callbacks
  useEffect(() => {
    const store = useAppStore.getState();
    store.setFocusFilter(() => filterRef.current?.focus());
    store.setToggleChangedOnly(toggleChanged);
    store.setToggleBranchOnly(toggleBranch);
    return () => {
      store.setFocusFilter(null);
      store.setToggleChangedOnly(null);
      store.setToggleBranchOnly(null);
    };
  }, [toggleChanged, toggleBranch]);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;

    let lastWidth = 0;

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      lastWidth = Math.max(200, Math.min(600, e.clientX));
      setWidth(lastWidth);
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (lastWidth) window.api.saveSidebarWidth(lastWidth);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  return (
    <div
      className="relative flex flex-col border-r border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-800/50 shrink-0"
      style={{ width }}
    >
      {/* Search */}
      {folderPath && (
        <div className="px-3 py-2 flex gap-1.5">
          <button
            onClick={toggleChanged}
            className={`app-no-drag shrink-0 w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
              filterMode === 'changed'
                ? 'bg-amber-500/20 dark:bg-amber-500/25'
                : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50'
            }`}
            title={
              filterMode === 'changed' ? 'Show all files (c)' : 'Show uncommitted changes only (c)'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${filterMode === 'changed' ? 'bg-amber-500' : 'bg-zinc-400 dark:bg-zinc-500'}`}
            />
          </button>
          <button
            onClick={toggleBranch}
            disabled={!branch.onBranch}
            className={`app-no-drag shrink-0 w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
              filterMode === 'branch'
                ? 'bg-blue-500/20 dark:bg-blue-500/25'
                : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50'
            } ${branch.onBranch ? '' : 'opacity-30 cursor-not-allowed'}`}
            title={
              !branch.onBranch
                ? 'Branch changes — check out a branch to enable (b)'
                : filterMode === 'branch'
                  ? 'Show all files (b)'
                  : `Show changes on branch${branch.branchName ? ` "${branch.branchName}"` : ''} since branch point (b)`
            }
          >
            <span
              className={`text-sm leading-none ${filterMode === 'branch' ? 'text-blue-500' : 'text-zinc-400 dark:text-zinc-500'}`}
            >
              {'⎇'}
            </span>
          </button>
          <input
            ref={filterRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter files..."
            className="app-no-drag flex-1 min-w-0 px-2 py-1 text-sm rounded-md bg-zinc-200/70 dark:bg-zinc-700/70 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>
      )}

      {/* Focus indicator */}
      <div
        className={`h-[2px] transition-colors duration-200 ${focusPane === 'files' ? 'bg-blue-500' : 'bg-transparent'}`}
      />

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {folderPath ? (
          <FileList filter={search} filterMode={filterMode} />
        ) : (
          <div className="px-3 py-8 text-center text-sm text-zinc-400">
            Open a folder to get started
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 flex items-center border-t border-zinc-200 dark:border-zinc-700">
        <ThemeToggle />
        {folderPath && (
          <span className="ml-auto text-[10px] text-zinc-400">
            {fileCount.toLocaleString()} files
          </span>
        )}
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={startResize}
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/30 active:bg-blue-500/50 transition-colors"
      />
    </div>
  );
}
