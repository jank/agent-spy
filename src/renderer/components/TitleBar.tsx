import { useAppStore } from '../stores/app-store';

export function TitleBar() {
  const { folderPath } = useAppStore();

  const handleOpenFolder = async () => {
    const result = await window.api.openFolder();
    if (result) {
      useAppStore.getState().setFolder(result);
    }
  };

  const folderName = folderPath?.split('/').pop();

  return (
    <div className="h-[52px] shrink-0 flex items-center px-3 app-drag-region border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-800/50">
      {/* Spacer for traffic lights */}
      <div className="w-[60px] shrink-0" />

      <span className="text-sm font-semibold shrink-0">Agent Spy</span>

      {folderPath ? (
        <div className="flex items-center gap-1.5 min-w-0 ml-2">
          <span className="text-sm text-zinc-400 shrink-0">&mdash;</span>
          <span className="text-sm font-medium truncate shrink-0">{folderName}</span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{folderPath}</span>
          <button
            onClick={handleOpenFolder}
            className="app-no-drag shrink-0 w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 rounded transition-colors ml-1"
            title="Change folder"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M3.75 3A1.75 1.75 0 002 4.75v3.26a3.235 3.235 0 011.75-.51h12.5c.644 0 1.245.188 1.75.51V6.75A1.75 1.75 0 0016.25 5h-4.836a.25.25 0 01-.177-.073L9.823 3.513A1.75 1.75 0 008.586 3H3.75zM3.75 9A1.75 1.75 0 002 10.75v4.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0018 15.25v-4.5A1.75 1.75 0 0016.25 9H3.75z" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          onClick={handleOpenFolder}
          className="app-no-drag ml-3 px-3 py-1 text-sm bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 rounded-md transition-colors"
        >
          Open Folder...
        </button>
      )}
    </div>
  );
}
