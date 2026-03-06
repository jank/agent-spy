import { useAppStore } from '../stores/app-store';
import type { WatchedFile } from '../types';

function timeAgo(ms: number): string {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function FileRow({ file }: { file: WatchedFile }) {
  const { selectedFile, starred } = useAppStore();
  const isSelected = selectedFile?.absolutePath === file.absolutePath;
  const isStarred = starred.includes(file.absolutePath);

  const handleClick = () => {
    useAppStore.getState().selectFile(file);
    window.api.getFileContent(file.absolutePath).then((content) => {
      useAppStore.getState().setFileContent(content);
    });
  };

  const handleToggleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = await window.api.toggleStar(file.absolutePath);
    useAppStore.getState().setStarred(updated);
  };

  return (
    <div
      onClick={handleClick}
      className={`app-no-drag flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm transition-colors ${
        isSelected
          ? 'bg-blue-500/15 dark:bg-blue-500/20'
          : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30'
      }`}
    >
      {/* Git change indicator */}
      {file.isGitChanged && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
      )}
      {!file.isGitChanged && <span className="w-1.5 shrink-0" />}

      {/* File name */}
      <span className="flex-1 truncate" title={file.relativePath}>
        {file.relativePath}
      </span>

      {/* Time */}
      <span className="text-[10px] text-zinc-400 shrink-0">
        {timeAgo(file.modifiedMs)}
      </span>

      {/* Star button */}
      <button
        onClick={handleToggleStar}
        className="shrink-0 text-xs hover:scale-110 transition-transform"
        title={isStarred ? 'Unstar' : 'Star'}
      >
        {isStarred ? '\u2605' : '\u2606'}
      </button>
    </div>
  );
}

export function FileList() {
  const { files, starred } = useAppStore();

  const starredFiles = files.filter((f) => starred.includes(f.absolutePath));
  const otherFiles = files.filter((f) => !starred.includes(f.absolutePath));

  if (files.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-sm text-zinc-400">
        No files found
      </div>
    );
  }

  return (
    <div>
      {starredFiles.length > 0 && (
        <>
          <div className="px-3 py-1 text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
            Starred
          </div>
          {starredFiles.map((file) => (
            <FileRow key={file.absolutePath} file={file} />
          ))}
          <div className="mx-3 my-1 border-t border-zinc-200 dark:border-zinc-700" />
        </>
      )}
      {otherFiles.map((file) => (
        <FileRow key={file.absolutePath} file={file} />
      ))}
    </div>
  );
}
