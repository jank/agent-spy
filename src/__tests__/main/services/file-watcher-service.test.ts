import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WatchedFile } from '../../../main/services/file-watcher-service';

// Mock chokidar
const mockWatcher = {
  on: vi.fn().mockReturnThis(),
  close: vi.fn(),
};
vi.mock('chokidar', () => ({
  watch: vi.fn(() => mockWatcher),
}));

// Mock node:fs
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  statSync: vi.fn(),
}));

// Mock ignore
const mockIgnoreInstance = {
  add: vi.fn().mockReturnThis(),
  ignores: vi.fn().mockReturnValue(false),
};
vi.mock('ignore', () => ({
  default: () => mockIgnoreInstance,
}));

import { FileWatcherService } from '../../../main/services/file-watcher-service';
import * as fs from 'node:fs';

beforeEach(() => {
  vi.clearAllMocks();
  (fs.readFileSync as any).mockImplementation(() => { throw new Error('ENOENT'); });
});

describe('FileWatcherService', () => {
  describe('constructor', () => {
    it('loads .gitignore and adds default ignores', () => {
      (fs.readFileSync as any).mockReturnValue('dist\nbuild');
      const _service = new FileWatcherService('/project');
      expect(mockIgnoreInstance.add).toHaveBeenCalledWith('dist\nbuild');
      expect(mockIgnoreInstance.add).toHaveBeenCalledWith('.git');
      expect(mockIgnoreInstance.add).toHaveBeenCalledWith('node_modules');
    });

    it('handles missing .gitignore gracefully', () => {
      (fs.readFileSync as any).mockImplementation(() => { throw new Error('ENOENT'); });
      expect(() => new FileWatcherService('/project')).not.toThrow();
      // .git and node_modules should still be added
      expect(mockIgnoreInstance.add).toHaveBeenCalledWith('.git');
      expect(mockIgnoreInstance.add).toHaveBeenCalledWith('node_modules');
    });
  });

  describe('setGitChangedFiles', () => {
    it('updates isGitChanged on tracked files', () => {
      (fs.readFileSync as any).mockImplementation(() => { throw new Error('ENOENT'); });
      const service = new FileWatcherService('/project');

      // Manually add a file to the internal map via reflection
      const filesMap = (service as any).files as Map<string, WatchedFile>;
      filesMap.set('/project/a.ts', {
        absolutePath: '/project/a.ts',
        relativePath: 'a.ts',
        modifiedMs: 1000,
        isGitChanged: false,
        generation: 1,
      });

      service.setGitChangedFiles(new Set(['a.ts']));
      expect(filesMap.get('/project/a.ts')!.isGitChanged).toBe(true);
    });

    it('clears isGitChanged when file is no longer changed', () => {
      (fs.readFileSync as any).mockImplementation(() => { throw new Error('ENOENT'); });
      const service = new FileWatcherService('/project');
      const filesMap = (service as any).files as Map<string, WatchedFile>;
      filesMap.set('/project/a.ts', {
        absolutePath: '/project/a.ts',
        relativePath: 'a.ts',
        modifiedMs: 1000,
        isGitChanged: true,
        generation: 1,
      });

      service.setGitChangedFiles(new Set());
      expect(filesMap.get('/project/a.ts')!.isGitChanged).toBe(false);
    });
  });

  describe('close', () => {
    it('cleans up watchers and state', () => {
      (fs.readFileSync as any).mockImplementation(() => { throw new Error('ENOENT'); });
      const service = new FileWatcherService('/project');
      service.startWatching();
      service.close();

      expect(mockWatcher.close).toHaveBeenCalled();
      expect((service as any).closed).toBe(true);
      expect((service as any).files.size).toBe(0);
      expect((service as any).callback).toBeNull();
    });
  });

  describe('onChange', () => {
    it('registers a callback', () => {
      (fs.readFileSync as any).mockImplementation(() => { throw new Error('ENOENT'); });
      const service = new FileWatcherService('/project');
      const cb = vi.fn();
      service.onChange(cb);
      expect((service as any).callback).toBe(cb);
    });
  });

  describe('getSortedFiles (via reflection)', () => {
    it('sorts files by modifiedMs descending', () => {
      (fs.readFileSync as any).mockImplementation(() => { throw new Error('ENOENT'); });
      const service = new FileWatcherService('/project');
      const filesMap = (service as any).files as Map<string, WatchedFile>;

      filesMap.set('/project/old.ts', {
        absolutePath: '/project/old.ts',
        relativePath: 'old.ts',
        modifiedMs: 1000,
        isGitChanged: false,
        generation: 1,
      });
      filesMap.set('/project/new.ts', {
        absolutePath: '/project/new.ts',
        relativePath: 'new.ts',
        modifiedMs: 2000,
        isGitChanged: false,
        generation: 1,
      });

      const sorted = (service as any).getSortedFiles();
      expect(sorted[0].relativePath).toBe('new.ts');
      expect(sorted[1].relativePath).toBe('old.ts');
    });
  });
});
