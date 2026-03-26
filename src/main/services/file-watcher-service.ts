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
    // Update existing files with git status
    for (const [absPath, file] of this.files) {
      file.isGitChanged = this.gitChangedFiles.has(file.relativePath);
      file.isNew = this.gitNewFiles.has(file.relativePath);
      this.files.set(absPath, file);
    }
  }

  onRefreshGitStatus(cb: () => Promise<{ changed: Set<string>; newFiles: Set<string> }>): void {
    this.refreshGitStatus = cb;
  }

  startWatching(): void {
    this.watcher = watch(this.rootPath, {
      ignored: (filePath: string) => {
        const rel = path.relative(this.rootPath, filePath);
        if (!rel || rel === '.') return false;
        return this.ig.ignores(rel);
      },
      persistent: true,
      ignoreInitial: false,
    });

    this.watcher.on('add', (fp) => this.trackFile(fp));
    this.watcher.on('change', (fp) => this.trackFile(fp));
    this.watcher.on('unlink', (fp) => this.removeFile(fp));
    this.watcher.on('ready', () => {
      this.isReady = true;
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
    // Only emit changes after the initial scan is complete
    if (this.isReady) {
      this.emitDebounced();
    }
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
    return Array.from(this.files.values()).sort((a, b) => b.modifiedMs - a.modifiedMs);
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
  }
}
