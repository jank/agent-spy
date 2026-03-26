import { watch, type FSWatcher } from 'chokidar';
import ignore, { type Ignore } from 'ignore';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface WatchedFile {
  absolutePath: string;
  relativePath: string;
  modifiedMs: number;
  isGitChanged: boolean;
  isNew: boolean;
  /** Monotonically increasing counter — bumped on every file change event */
  generation: number;
}

export class FileWatcherService {
  private watcher: FSWatcher | null = null;
  private gitWatcher: FSWatcher | null = null;
  private ig: Ignore;
  private files = new Map<string, WatchedFile>();
  private callback: ((files: WatchedFile[]) => void) | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private gitDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private gitChangedFiles = new Set<string>();
  private gitNewFiles = new Set<string>();
  private refreshGitStatus:
    | (() => Promise<{ changed: Set<string>; newFiles: Set<string> }>)
    | null = null;
  private isReady = false;
  private closed = false;
  private initialScanTimer: ReturnType<typeof setTimeout> | null = null;
  private lastIncrementalEmit = 0;

  /** How often to emit incremental updates during initial scan (ms) */
  private static readonly INCREMENTAL_INTERVAL = 200;

  constructor(private rootPath: string) {
    this.ig = ignore();
    this.loadGitignore();
  }

  private loadGitignore(): void {
    const gitignorePath = path.join(this.rootPath, '.gitignore');
    try {
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      this.ig.add(content);
    } catch {
      // no .gitignore
    }
    this.ig.add('.git');
    this.ig.add('node_modules');
  }

  setGitChangedFiles(changed: Set<string>, newFiles: Set<string>): void {
    this.gitChangedFiles = changed;
    this.gitNewFiles = newFiles;
    // Update existing files with git status — iterate Map values directly
    for (const file of this.files.values()) {
      file.isGitChanged = changed.has(file.relativePath);
      file.isNew = newFiles.has(file.relativePath);
    }
  }

  onRefreshGitStatus(cb: () => Promise<{ changed: Set<string>; newFiles: Set<string> }>): void {
    this.refreshGitStatus = cb;
  }

  startWatching(): void {
    const t0 = performance.now();
    const ignoreFn = (filePath: string) => {
      const rel = path.relative(this.rootPath, filePath);
      if (!rel || rel === '.') return false;
      return this.ig.ignores(rel);
    };

    this.watcher = watch(this.rootPath, {
      ignored: ignoreFn,
      persistent: true,
      ignoreInitial: false,
      // Use polling to avoid EMFILE on large projects — native fs.watch
      // opens one fd per file and easily exhausts the OS limit.
      usePolling: true,
      interval: 500,
      binaryInterval: 1000,
    });

    this.watcher.on('add', (fp) => this.trackFile(fp));
    this.watcher.on('change', (fp) => this.trackFile(fp));
    this.watcher.on('unlink', (fp) => this.removeFile(fp));
    this.watcher.on('error', (err) => {
      console.warn('[watcher] error:', (err as NodeJS.ErrnoException).code ?? err);
    });
    this.watcher.on('ready', () => {
      this.isReady = true;
      if (this.initialScanTimer) {
        clearTimeout(this.initialScanTimer);
        this.initialScanTimer = null;
      }
      console.warn(
        `[perf] watcher ready: ${this.files.size} files in ${(performance.now() - t0).toFixed(0)}ms`,
      );
    });
  }

  private trackFile(absolutePath: string): void {
    const relativePath = path.relative(this.rootPath, absolutePath);
    try {
      const stat = fs.statSync(absolutePath);
      if (stat.isDirectory()) return;

      const existing = this.files.get(absolutePath);
      this.files.set(absolutePath, {
        absolutePath,
        relativePath,
        modifiedMs: stat.mtimeMs,
        isGitChanged: this.gitChangedFiles.has(relativePath),
        isNew: this.gitNewFiles.has(relativePath),
        generation: (existing?.generation ?? 0) + 1,
      });
    } catch {
      return;
    }

    if (this.isReady) {
      // Normal post-scan change — debounced emit with git refresh
      this.emitDebounced();
    } else {
      // During initial scan — emit incremental batches so UI isn't blank
      this.emitIncremental();
    }
  }

  /** Emit partial file lists during initial scan so the UI populates progressively */
  private emitIncremental(): void {
    const now = performance.now();
    if (now - this.lastIncrementalEmit < FileWatcherService.INCREMENTAL_INTERVAL) {
      // Schedule one trailing emit to catch the last batch
      if (!this.initialScanTimer) {
        this.initialScanTimer = setTimeout(() => {
          this.initialScanTimer = null;
          if (!this.isReady && !this.closed) {
            this.lastIncrementalEmit = performance.now();
            this.callback?.(this.getSortedFiles());
          }
        }, FileWatcherService.INCREMENTAL_INTERVAL);
      }
      return;
    }
    this.lastIncrementalEmit = now;
    this.callback?.(this.getSortedFiles());
  }

  private removeFile(absolutePath: string): void {
    this.files.delete(absolutePath);
    if (this.isReady) {
      this.emitDebounced();
    }
  }

  private emitDebounced(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(async () => {
      if (this.closed) return;
      if (this.refreshGitStatus) {
        const { changed, newFiles } = await this.refreshGitStatus();
        if (this.closed) return;
        this.setGitChangedFiles(changed, newFiles);
      }
      this.callback?.(this.getSortedFiles());
    }, 300);
  }

  private getSortedFiles(): WatchedFile[] {
    const t0 = performance.now();
    const result = Array.from(this.files.values()).sort((a, b) => b.modifiedMs - a.modifiedMs);
    const elapsed = performance.now() - t0;
    if (elapsed > 10) {
      console.warn(`[perf] getSortedFiles: ${result.length} files in ${elapsed.toFixed(1)}ms`);
    }
    return result;
  }

  onChange(cb: (files: WatchedFile[]) => void): void {
    this.callback = cb;
  }

  /** Watch .git internals for commits, checkouts, rebases, etc. */
  startGitWatching(): void {
    const gitDir = path.join(this.rootPath, '.git');
    // Watch the git index and refs — these change on commit, checkout, rebase, merge, etc.
    this.gitWatcher = watch([path.join(gitDir, 'index'), path.join(gitDir, 'refs')], {
      persistent: true,
      ignoreInitial: true,
      depth: 5,
    });

    const onGitChange = () => {
      if (!this.isReady || this.closed) return;
      if (this.gitDebounceTimer) clearTimeout(this.gitDebounceTimer);
      this.gitDebounceTimer = setTimeout(async () => {
        if (this.closed) return;
        if (this.refreshGitStatus) {
          const { changed, newFiles } = await this.refreshGitStatus();
          if (this.closed) return;
          this.setGitChangedFiles(changed, newFiles);
        }
        this.callback?.(this.getSortedFiles());
      }, 500);
    };

    this.gitWatcher.on('add', onGitChange);
    this.gitWatcher.on('change', onGitChange);
    this.gitWatcher.on('unlink', onGitChange);
  }

  getInitialFiles(): Promise<WatchedFile[]> {
    if (this.isReady) {
      return Promise.resolve(this.getSortedFiles());
    }
    return new Promise((resolve) => {
      this.watcher?.on('ready', () => resolve(this.getSortedFiles()));
    });
  }

  close(): void {
    this.closed = true;
    this.callback = null;
    this.watcher?.close();
    this.gitWatcher?.close();
    this.files.clear();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.gitDebounceTimer) clearTimeout(this.gitDebounceTimer);
    if (this.initialScanTimer) clearTimeout(this.initialScanTimer);
  }
}
