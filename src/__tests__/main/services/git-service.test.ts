import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock simple-git before importing GitService
vi.mock('simple-git', () => {
  const mockGit = {
    revparse: vi.fn(),
    status: vi.fn(),
    show: vi.fn(),
    raw: vi.fn(),
  };
  return { default: () => mockGit, __mockGit: mockGit };
});

// Mock node:fs
vi.mock('node:fs', () => ({
  promises: {
    readFile: vi.fn(),
  },
}));

import { GitService } from '../../../main/services/git-service';
import { __mockGit as mockGit } from 'simple-git';
import { promises as fsp } from 'node:fs';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GitService', () => {
  const service = new GitService('/project');

  describe('isGitRepo', () => {
    it('returns true when git dir exists', async () => {
      (mockGit.revparse as any).mockResolvedValue('.git');
      expect(await service.isGitRepo()).toBe(true);
    });

    it('returns false when git dir check fails', async () => {
      (mockGit.revparse as any).mockRejectedValue(new Error('not a repo'));
      expect(await service.isGitRepo()).toBe(false);
    });
  });

  describe('getChangedFiles', () => {
    it('collects modified, created, not_added, and renamed files', async () => {
      (mockGit.status as any).mockResolvedValue({
        modified: ['a.ts'],
        created: ['b.ts'],
        not_added: ['c.ts'],
        renamed: [{ from: 'old.ts', to: 'd.ts' }],
      });
      const result = await service.getChangedFiles();
      expect(result.changed).toEqual(new Set(['a.ts', 'b.ts', 'c.ts', 'd.ts']));
    });

    it('marks created and not_added files as new', async () => {
      (mockGit.status as any).mockResolvedValue({
        modified: ['a.ts'],
        created: ['b.ts'],
        not_added: ['c.ts'],
        renamed: [{ from: 'old.ts', to: 'd.ts' }],
      });
      const result = await service.getChangedFiles();
      expect(result.newFiles).toEqual(new Set(['b.ts', 'c.ts']));
    });

    it('returns empty sets on error', async () => {
      (mockGit.status as any).mockRejectedValue(new Error('fail'));
      const result = await service.getChangedFiles();
      expect(result.changed).toEqual(new Set());
      expect(result.newFiles).toEqual(new Set());
    });

    it('deduplicates files that appear in multiple categories', async () => {
      (mockGit.status as any).mockResolvedValue({
        modified: ['a.ts'],
        created: ['a.ts'],
        not_added: [],
        renamed: [],
      });
      const result = await service.getChangedFiles();
      expect(result.changed.size).toBe(1);
    });
  });

  describe('getBranchChangedFiles', () => {
    it('returns files committed since the branch point', async () => {
      (mockGit.revparse as any).mockResolvedValue('feature/x');
      (mockGit.raw as any).mockImplementation(async (args: string[]) => {
        if (args[0] === 'symbolic-ref') return 'refs/remotes/origin/main\n';
        if (args[0] === 'merge-base') return 'abc123\n';
        if (args[0] === 'diff') return 'src/a.ts\nsrc/b.ts\n';
        return '';
      });
      const result = await service.getBranchChangedFiles();
      expect(result.onBranch).toBe(true);
      expect(result.branchName).toBe('feature/x');
      expect(result.files).toEqual(new Set(['src/a.ts', 'src/b.ts']));
      expect(mockGit.raw).toHaveBeenCalledWith(['merge-base', 'origin/main', 'HEAD']);
      expect(mockGit.raw).toHaveBeenCalledWith(['diff', '--name-only', 'abc123', 'HEAD']);
    });

    it('returns onBranch false in detached HEAD', async () => {
      (mockGit.revparse as any).mockResolvedValue('HEAD');
      const result = await service.getBranchChangedFiles();
      expect(result.onBranch).toBe(false);
      expect(result.files.size).toBe(0);
    });

    it('falls back to a local base branch when origin/HEAD is absent', async () => {
      (mockGit.revparse as any).mockImplementation(async (args: string[]) => {
        if (args[0] === '--abbrev-ref') return 'feature/x';
        if (args[0] === '--verify' && args[1] === 'main') return 'sha';
        throw new Error('no such ref');
      });
      (mockGit.raw as any).mockImplementation(async (args: string[]) => {
        if (args[0] === 'symbolic-ref') throw new Error('no origin/HEAD');
        if (args[0] === 'merge-base') return 'base\n';
        if (args[0] === 'diff') return 'x.ts\n';
        return '';
      });
      const result = await service.getBranchChangedFiles();
      expect(result.onBranch).toBe(true);
      expect(result.files).toEqual(new Set(['x.ts']));
      expect(mockGit.raw).toHaveBeenCalledWith(['merge-base', 'main', 'HEAD']);
    });

    it('returns onBranch false when on the default branch', async () => {
      (mockGit.revparse as any).mockImplementation(async (args: string[]) => {
        if (args[0] === '--abbrev-ref') return 'main';
        throw new Error('no such ref');
      });
      (mockGit.raw as any).mockImplementation(async (args: string[]) => {
        if (args[0] === 'symbolic-ref') return 'refs/remotes/origin/main\n';
        return '';
      });
      const result = await service.getBranchChangedFiles();
      expect(result.onBranch).toBe(false);
      expect(result.branchName).toBe('main');
      expect(result.files.size).toBe(0);
    });

    it('returns empty on error', async () => {
      (mockGit.revparse as any).mockRejectedValue(new Error('fail'));
      const result = await service.getBranchChangedFiles();
      expect(result.onBranch).toBe(false);
      expect(result.files.size).toBe(0);
    });
  });

  describe('getFullStatus', () => {
    it('combines working-tree changes with branch-point changes', async () => {
      (mockGit.status as any).mockResolvedValue({
        modified: ['a.ts'],
        created: [],
        not_added: [],
        renamed: [],
      });
      (mockGit.revparse as any).mockResolvedValue('feature/x');
      (mockGit.raw as any).mockImplementation(async (args: string[]) => {
        if (args[0] === 'symbolic-ref') return 'refs/remotes/origin/main\n';
        if (args[0] === 'merge-base') return 'abc123\n';
        if (args[0] === 'diff') return 'b.ts\n';
        return '';
      });
      const result = await service.getFullStatus();
      expect(result.changed).toEqual(new Set(['a.ts']));
      expect(result.branchChanged).toEqual(new Set(['b.ts']));
      expect(result.onBranch).toBe(true);
      expect(result.branchName).toBe('feature/x');
    });
  });

  describe('getCommittedContent', () => {
    it('returns content from HEAD', async () => {
      (mockGit.show as any).mockResolvedValue('committed content');
      const result = await service.getCommittedContent('/project/src/app.ts');
      expect(mockGit.show).toHaveBeenCalledWith(['HEAD:src/app.ts']);
      expect(result).toBe('committed content');
    });

    it('returns null for new files', async () => {
      (mockGit.show as any).mockRejectedValue(new Error('not found'));
      const result = await service.getCommittedContent('/project/new-file.ts');
      expect(result).toBeNull();
    });
  });

  describe('getFileDiff', () => {
    it('returns diff with original and modified content', async () => {
      (fsp.readFile as any).mockResolvedValue('modified content');
      (mockGit.show as any).mockResolvedValue('original content');
      const result = await service.getFileDiff('/project/src/app.ts');
      expect(result).toEqual({
        original: 'original content',
        modified: 'modified content',
        isNew: false,
      });
    });

    it('marks file as new when no committed version exists', async () => {
      (fsp.readFile as any).mockResolvedValue('new file content');
      (mockGit.show as any).mockRejectedValue(new Error('not found'));
      const result = await service.getFileDiff('/project/new-file.ts');
      expect(result).toEqual({
        original: '',
        modified: 'new file content',
        isNew: true,
      });
    });
  });
});
