import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

import { StarredStore } from '../../../main/services/starred-store';
import * as fs from 'node:fs';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('StarredStore', () => {
  describe('constructor / load', () => {
    it('loads existing starred files from disk', () => {
      (fs.readFileSync as any).mockReturnValue(JSON.stringify(['/a.ts', '/b.ts']));
      const store = new StarredStore('/project');
      expect(store.getStarred()).toEqual(['/a.ts', '/b.ts']);
    });

    it('starts empty when file does not exist', () => {
      (fs.readFileSync as any).mockImplementation(() => { throw new Error('ENOENT'); });
      const store = new StarredStore('/project');
      expect(store.getStarred()).toEqual([]);
    });

    it('starts empty when file contains invalid JSON', () => {
      (fs.readFileSync as any).mockReturnValue('not json');
      const store = new StarredStore('/project');
      expect(store.getStarred()).toEqual([]);
    });
  });

  describe('toggle', () => {
    it('adds a file when not starred', () => {
      (fs.readFileSync as any).mockImplementation(() => { throw new Error('ENOENT'); });
      const store = new StarredStore('/project');
      const result = store.toggle('/file.ts');
      expect(result).toEqual(['/file.ts']);
    });

    it('removes a file when already starred', () => {
      (fs.readFileSync as any).mockReturnValue(JSON.stringify(['/file.ts']));
      const store = new StarredStore('/project');
      const result = store.toggle('/file.ts');
      expect(result).toEqual([]);
    });

    it('saves to disk after toggling', () => {
      (fs.readFileSync as any).mockImplementation(() => { throw new Error('ENOENT'); });
      const store = new StarredStore('/project');
      store.toggle('/file.ts');
      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('.agent-spy'), { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('starred.json'),
        expect.any(String),
      );
    });

    it('persists correct JSON content', () => {
      (fs.readFileSync as any).mockImplementation(() => { throw new Error('ENOENT'); });
      const store = new StarredStore('/project');
      store.toggle('/a.ts');
      store.toggle('/b.ts');
      const writtenJson = (fs.writeFileSync as any).mock.calls.at(-1)[1];
      expect(JSON.parse(writtenJson)).toEqual(['/a.ts', '/b.ts']);
    });
  });

  describe('getStarred', () => {
    it('returns a copy (not the internal set)', () => {
      (fs.readFileSync as any).mockReturnValue(JSON.stringify(['/a.ts']));
      const store = new StarredStore('/project');
      const result1 = store.getStarred();
      const result2 = store.getStarred();
      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2); // different array instances
    });
  });
});
