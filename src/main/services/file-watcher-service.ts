import { watch, type FSWatcher } from 'chokidar';
import ignore, { type Ignore } from 'ignore';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface WatchedFile {
  absolutePath: string;
  relativePath: string;
  modifiedMs: number;
  isGitChanged: boolean;
}

export class FileWatcherService {
  private watcher: FSWatcher | null = null;
  private ig: Ignore;
  private files = new Map<string, WatchedFile>();
  private callback: ((files: WatchedFile[]) => void) | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private gitChangedFiles = new Set<string>();

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

  setGitChangedFiles(changed: Set<string>): void {
    this.gitChangedFiles = changed;
    // Update existing files with git status
    for (const [absPath, file] of this.files) {
      file.isGitChanged = this.gitChangedFiles.has(file.relativePath);
      this.files.set(absPath, file);
    }
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
  }

  private trackFile(absolutePath: string): void {
    const relativePath = path.relative(this.rootPath, absolutePath);
    try {
      const stat = fs.statSync(absolutePath);
      if (stat.isDirectory()) return;

      this.files.set(absolutePath, {
        absolutePath,
        relativePath,
        modifiedMs: stat.mtimeMs,
        isGitChanged: this.gitChangedFiles.has(relativePath),
      });
    } catch {
      return;
    }
    this.emitDebounced();
  }

  private removeFile(absolutePath: string): void {
    this.files.delete(absolutePath);
    this.emitDebounced();
  }

  private emitDebounced(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.callback?.(this.getSortedFiles());
    }, 300);
  }

  private getSortedFiles(): WatchedFile[] {
    return Array.from(this.files.values())
      .sort((a, b) => b.modifiedMs - a.modifiedMs);
  }

  onChange(cb: (files: WatchedFile[]) => void): void {
    this.callback = cb;
  }

  getInitialFiles(): Promise<WatchedFile[]> {
    return new Promise((resolve) => {
      this.watcher?.on('ready', () => resolve(this.getSortedFiles()));
    });
  }

  close(): void {
    this.watcher?.close();
    this.files.clear();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }
}
