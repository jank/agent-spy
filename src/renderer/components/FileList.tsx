import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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

function FileRow({
  file,
  flashing,
}: {
  file: WatchedFile;
  flashing: boolean;
}) {
  const { selectedFile, starred } = useAppStore();
  const isSelected = selectedFile?.absolutePath === file.absolutePath;
  const isStarred = starred.includes(file.absolutePath);
  const rowRef = useRef<HTMLDivElement>(null);
  const [flashKey, setFlashKey] = useState(0);

  // Trigger flash animation by bumping key
  useEffect(() => {
    if (flashing) {
      setFlashKey((k) => k + 1);
    }
  }, [flashing, file.modifiedMs]);

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
      ref={rowRef}
      onClick={handleClick}
      className={`app-no-drag flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm transition-colors ${
        isSelected
          ? 'bg-blue-500/15 dark:bg-blue-500/20'
          : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30'
      }`}
    >
      {/* Flash overlay */}
      {flashing && (
        <div
          key={flashKey}
          className="absolute inset-0 file-flash pointer-events-none"
        />
      )}

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

/**
 * Animated file list using FLIP technique for smooth reordering.
 */
export function FileList() {
  const { files, starred } = useAppStore();
  const [flashSet, setFlashSet] = useState<Set<string>>(new Set());
  const prevModifiedRef = useRef<Map<string, number>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const positionsRef = useRef<Map<string, number>>(new Map());

  const starredFiles = files.filter((f) => starred.includes(f.absolutePath));
  const otherFiles = files.filter((f) => !starred.includes(f.absolutePath));

  // Before DOM update: capture current positions
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const positions = new Map<string, number>();
    const rows = containerRef.current.querySelectorAll<HTMLElement>('[data-file-path]');
    rows.forEach((row) => {
      const path = row.dataset.filePath!;
      positions.set(path, row.getBoundingClientRect().top);
    });
    positionsRef.current = positions;
  });

  // After DOM update: detect changes, flash, and animate position
  useEffect(() => {
    const prev = prevModifiedRef.current;
    const newFlash = new Set<string>();

    for (const file of files) {
      const prevMs = prev.get(file.absolutePath);
      if (prevMs !== undefined && prevMs !== file.modifiedMs) {
        newFlash.add(file.absolutePath);
      }
    }

    // Update stored timestamps
    const next = new Map<string, number>();
    for (const file of files) {
      next.set(file.absolutePath, file.modifiedMs);
    }
    prevModifiedRef.current = next;

    if (newFlash.size > 0) {
      setFlashSet(newFlash);

      // FLIP: animate rows from old position to new position
      if (containerRef.current) {
        const rows = containerRef.current.querySelectorAll<HTMLElement>('[data-file-path]');
        rows.forEach((row) => {
          const path = row.dataset.filePath!;
          const oldTop = positionsRef.current.get(path);
          if (oldTop !== undefined) {
            const newTop = row.getBoundingClientRect().top;
            const delta = oldTop - newTop;
            if (Math.abs(delta) > 1) {
              row.style.transform = `translateY(${delta}px)`;
              row.style.transition = 'none';
              // Force reflow
              row.offsetHeight;
              row.style.transform = '';
              row.style.transition = 'transform 300ms ease-out';
            }
          }
        });
      }

      // Clear flash after animation
      const timeout = setTimeout(() => setFlashSet(new Set()), 1500);
      return () => clearTimeout(timeout);
    }
  }, [files]);

  if (files.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-sm text-zinc-400">
        No files found
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      {starredFiles.length > 0 && (
        <>
          <div className="px-3 py-1 text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
            Starred
          </div>
          {starredFiles.map((file) => (
            <div key={file.absolutePath} data-file-path={file.absolutePath} className="relative">
              <FileRow file={file} flashing={flashSet.has(file.absolutePath)} />
            </div>
          ))}
          <div className="mx-3 my-1 border-t border-zinc-200 dark:border-zinc-700" />
        </>
      )}
      {otherFiles.map((file) => (
        <div key={file.absolutePath} data-file-path={file.absolutePath} className="relative">
          <FileRow file={file} flashing={flashSet.has(file.absolutePath)} />
        </div>
      ))}
    </div>
  );
}
