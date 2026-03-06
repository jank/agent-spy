import { useCallback, useRef, useState } from 'react';
import { useAppStore } from '../stores/app-store';
import { useThemeStore } from '../hooks/use-theme';
import { FileList } from './FileList';

const THEME_ICONS: Record<string, string> = {
  system: '\u25D1', // ◑
  light: '\u2600',  // ☀
  dark: '\u263E',   // ☾
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
  const { folderPath } = useAppStore();
  const [width, setWidth] = useState(280);
  const isResizing = useRef(false);

  const handleOpenFolder = async () => {
    const result = await window.api.openFolder();
    if (result) {
      useAppStore.getState().setFolder(result);
    }
  };

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.max(200, Math.min(600, e.clientX));
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  return (
    <div
      className="relative h-screen flex flex-col border-r border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-800/50 shrink-0"
      style={{ width }}
    >
      {/* Top area - below traffic lights */}
      <div className="pt-[52px] px-3 pb-2">
        <button
          onClick={handleOpenFolder}
          className="app-no-drag w-full px-3 py-1.5 text-sm bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 rounded-md transition-colors"
        >
          Open Folder...
        </button>
      </div>

      {/* Title */}
      {folderPath && (
        <div className="px-3 pb-2 text-[11px] text-zinc-500 dark:text-zinc-400 truncate" title={folderPath}>
          Spying on {folderPath}
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {folderPath ? (
          <FileList />
        ) : (
          <div className="px-3 py-8 text-center text-sm text-zinc-400">
            Open a folder to get started
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 flex items-center border-t border-zinc-200 dark:border-zinc-700">
        <ThemeToggle />
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={startResize}
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/30 active:bg-blue-500/50 transition-colors"
      />
    </div>
  );
}
