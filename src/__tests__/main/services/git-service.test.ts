import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock simple-git before importing GitService
vi.mock('simple-git', () => {
  const mockGit = {
    revparse: vi.fn(),
    status: vi.fn(),
    show: vi.fn(),
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
