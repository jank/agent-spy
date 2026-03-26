import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../stores/app-store';
import { isBinaryFile } from '../lib/file-types';
import type { WatchedFile } from '../types';

const ROW_HEIGHT = 32;
const OVERSCAN = 10;

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

const FileRow = memo(function FileRow({
  file,
  flashing,
  isSelected,
  isStarred,
  onToggleStar,
}: {
  file: WatchedFile;
  flashing: boolean;
  isSelected: boolean;
  isStarred: boolean;
  onToggleStar: (path: string) => void;
}) {
  const [flashKey, setFlashKey] = useState(0);

  useEffect(() => {
    if (flashing) {
      setFlashKey((k) => k + 1);
    }
  }, [flashing, file.modifiedMs]);

  const handleClick = () => {
    selectFileByObject(file);
  };

  const handleToggleStar = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleStar(file.absolutePath);
  };

  return (
    <div
      onClick={handleClick}
      className={`app-no-drag flex items-center gap-2 px-3 cursor-pointer text-sm transition-colors ${
        isSelected
          ? 'bg-blue-500/15 dark:bg-blue-500/20'
          : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30'
      }`}
      style={{ height: ROW_HEIGHT }}
    >
      {/* Flash overlay */}
      {flashing && (
        <div key={flashKey} className="absolute inset-0 file-flash pointer-events-none" />
      )}

      {/* Git change indicator */}
      {(file.isGitChanged || file.isNew) && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
      )}
      {!file.isGitChanged && !file.isNew && <span className="w-1.5 shrink-0" />}

      {/* File name */}
      <span className="flex-1 truncate" title={file.relativePath}>
        {file.relativePath}
      </span>

      {/* Time */}
      <span className="text-[10px] text-zinc-400 shrink-0">{timeAgo(file.modifiedMs)}</span>

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
});

function selectFileByObject(file: WatchedFile) {
  const { viewMode, isGitRepo } = useAppStore.getState();
  useAppStore.getState().selectFile(file);

  if (viewMode === 'diff' && isGitRepo && !isBinaryFile(file.relativePath)) {
    window.api.getGitDiff(file.absolutePath).then((data) => {
      useAppStore.getState().setDiffData(data);
    });
  } else if (isBinaryFile(file.relativePath)) {
    window.api.getFileDataUrl(file.absolutePath).then((dataUrl) => {
      useAppStore.getState().setFileContent(dataUrl);
    });
  } else {
    window.api.getFileContent(file.absolutePath).then((content) => {
      useAppStore.getState().setFileContent(content);
    });
  }
}

/** Height of the "Starred" section header */
const HEADER_HEIGHT = 24;
/** Height of the separator line between starred and other */
const SEPARATOR_HEIGHT = 12;

export function FileList({ filter, changedOnly }: { filter: string; changedOnly: boolean }) {
  const files = useAppStore((s) => s.files);
  const starred = useAppStore((s) => s.starred);
  const selectedPath = useAppStore((s) => s.selectedFile?.absolutePath ?? null);
  const [flashSet, setFlashSet] = useState<Set<string>>(new Set());
  const prevModifiedRef = useRef<Map<string, number>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);

  // O(1) starred lookup
  const starredSet = useMemo(() => new Set(starred), [starred]);

  const lowerFilter = filter.toLowerCase();

  // Filter and split into starred/other — O(n) with Set lookups
  const { starredFiles, otherFiles } = useMemo(() => {
    const t0 = performance.now();
    let filtered = lowerFilter
      ? files.filter((f) => f.relativePath.toLowerCase().includes(lowerFilter))
      : files;
    if (changedOnly) {
      filtered = filtered.filter((f) => f.isGitChanged || f.isNew);
    }
    const starred: WatchedFile[] = [];
    const other: WatchedFile[] = [];
    for (const f of filtered) {
      if (starredSet.has(f.absolutePath)) {
        starred.push(f);
      } else {
        other.push(f);
      }
    }
    const elapsed = performance.now() - t0;
    if (elapsed > 5) {
      console.warn(
        `[perf] FileList filter: ${files.length} → ${starred.length + other.length} in ${elapsed.toFixed(1)}ms`,
      );
    }
    return { starredFiles: starred, otherFiles: other };
  }, [files, starredSet, lowerFilter, changedOnly]);

  // Build flat item list for virtualization
  const items = useMemo(() => {
    const result: Array<
      | { type: 'header'; key: string }
      | { type: 'file'; key: string; file: WatchedFile }
      | { type: 'separator'; key: string }
    > = [];
    if (starredFiles.length > 0) {
      result.push({ type: 'header', key: '__starred-header' });
      for (const f of starredFiles) {
        result.push({ type: 'file', key: f.absolutePath, file: f });
      }
      result.push({ type: 'separator', key: '__separator' });
    }
    for (const f of otherFiles) {
      result.push({ type: 'file', key: f.absolutePath, file: f });
    }
    return result;
  }, [starredFiles, otherFiles]);

  // Compute item offsets for variable-height rows
  const { offsets, totalHeight } = useMemo(() => {
    const offs: number[] = new Array(items.length);
    let y = 0;
    for (let i = 0; i < items.length; i++) {
      offs[i] = y;
      const item = items[i];
      if (item.type === 'header') y += HEADER_HEIGHT;
      else if (item.type === 'separator') y += SEPARATOR_HEIGHT;
      else y += ROW_HEIGHT;
    }
    return { offsets: offs, totalHeight: y };
  }, [items]);

  // Ordered list for keyboard navigation
  const orderedFilesRef = useRef<WatchedFile[]>([]);
  orderedFilesRef.current = useMemo(
    () => [...starredFiles, ...otherFiles],
    [starredFiles, otherFiles],
  );

  // Register file navigation callbacks once
  useEffect(() => {
    const selectNext = () => {
      const ordered = orderedFilesRef.current;
      if (ordered.length === 0) return;
      const selected = useAppStore.getState().selectedFile;
      const idx = selected
        ? ordered.findIndex((f) => f.absolutePath === selected.absolutePath)
        : -1;
      const next = ordered[Math.min(idx + 1, ordered.length - 1)];
      selectFileByObject(next);
    };
    const selectPrev = () => {
      const ordered = orderedFilesRef.current;
      if (ordered.length === 0) return;
      const selected = useAppStore.getState().selectedFile;
      const idx = selected
        ? ordered.findIndex((f) => f.absolutePath === selected.absolutePath)
        : ordered.length;
      const prev = ordered[Math.max(idx - 1, 0)];
      selectFileByObject(prev);
    };
    useAppStore.getState().setSelectNextFile(selectNext);
    useAppStore.getState().setSelectPrevFile(selectPrev);
    return () => {
      useAppStore.getState().setSelectNextFile(null);
      useAppStore.getState().setSelectPrevFile(null);
    };
  }, []);

  // Track scroll position from the parent scroll container
  useEffect(() => {
    const container = containerRef.current?.parentElement;
    if (!container) return;

    const onScroll = () => setScrollTop(container.scrollTop);
    container.addEventListener('scroll', onScroll, { passive: true });

    // Measure viewport
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportHeight(entry.contentRect.height);
      }
    });
    ro.observe(container);

    return () => {
      container.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, []);

  // Flash detection — only track changed timestamps, skip FLIP for large lists
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
      const flashTimeout = setTimeout(() => setFlashSet(new Set()), 5000);
      return () => clearTimeout(flashTimeout);
    }
  }, [files]);

  const handleToggleStar = useCallback(async (filePath: string) => {
    const updated = await window.api.toggleStar(filePath);
    useAppStore.getState().setStarred(updated);
  }, []);

  if (items.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-sm text-zinc-400">
        {lowerFilter ? 'No matching files' : 'No files found'}
      </div>
    );
  }

  // Virtualization: find visible range using binary search on offsets
  let startIdx = 0;
  let lo = 0,
    hi = offsets.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (offsets[mid] < scrollTop) {
      startIdx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  startIdx = Math.max(0, startIdx - OVERSCAN);

  const endY = scrollTop + viewportHeight;
  let endIdx = startIdx;
  for (let i = startIdx; i < items.length; i++) {
    if (offsets[i] > endY + OVERSCAN * ROW_HEIGHT) break;
    endIdx = i;
  }
  endIdx = Math.min(items.length - 1, endIdx + OVERSCAN);

  const visibleItems = items.slice(startIdx, endIdx + 1);
  const offsetTop = startIdx < offsets.length ? offsets[startIdx] : 0;

  return (
    <div ref={containerRef} style={{ height: totalHeight, position: 'relative' }}>
      <div style={{ position: 'absolute', top: offsetTop, left: 0, right: 0 }}>
        {visibleItems.map((item) => {
          if (item.type === 'header') {
            return (
              <div
                key={item.key}
                className="px-3 text-[10px] font-medium text-zinc-400 uppercase tracking-wider flex items-center"
                style={{ height: HEADER_HEIGHT }}
              >
                Starred
              </div>
            );
          }
          if (item.type === 'separator') {
            return (
              <div
                key={item.key}
                className="mx-3 flex items-center"
                style={{ height: SEPARATOR_HEIGHT }}
              >
                <div className="w-full border-t border-zinc-200 dark:border-zinc-700" />
              </div>
            );
          }
          const file = item.file;
          return (
            <div key={item.key} className="relative">
              <FileRow
                file={file}
                flashing={flashSet.has(file.absolutePath)}
                isSelected={selectedPath === file.absolutePath}
                isStarred={starredSet.has(file.absolutePath)}
                onToggleStar={handleToggleStar}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
