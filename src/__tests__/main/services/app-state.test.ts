import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

import * as fs from 'node:fs';

// app-state uses `app.getPath` at module scope, so we need the electron mock
// (handled by vitest.config alias)
import { loadState, saveState, getState } from '../../../main/services/app-state';

beforeEach(() => {
  vi.clearAllMocks();
  // Reset module-level state by loading empty
  (fs.readFileSync as any).mockImplementation(() => { throw new Error('ENOENT'); });
  loadState();
});

describe('app-state', () => {
  describe('loadState', () => {
    it('returns empty object when file does not exist', () => {
      (fs.readFileSync as any).mockImplementation(() => { throw new Error('ENOENT'); });
      const result = loadState();
      expect(result).toEqual({});
    });

    it('returns empty object for corrupted JSON', () => {
      (fs.readFileSync as any).mockReturnValue('not json');
      const result = loadState();
      expect(result).toEqual({});
    });

    it('returns parsed state from file', () => {
      const data = { windowBounds: { x: 0, y: 0, width: 1200, height: 800 }, sidebarWidth: 300 };
      (fs.readFileSync as any).mockReturnValue(JSON.stringify(data));
      const result = loadState();
      expect(result).toEqual(data);
    });
  });

  describe('getState', () => {
    it('returns the last loaded state', () => {
      const data = { lastFolderPath: '/project' };
      (fs.readFileSync as any).mockReturnValue(JSON.stringify(data));
      loadState();
      expect(getState()).toEqual(data);
    });
  });

  describe('saveState', () => {
    it('merges partial state and writes to file', () => {
      (fs.readFileSync as any).mockReturnValue(JSON.stringify({ sidebarWidth: 300 }));
      loadState();

      saveState({ lastFolderPath: '/project' });

      expect(fs.writeFileSync).toHaveBeenCalled();
      const writtenJson = (fs.writeFileSync as any).mock.calls[0][1];
      const written = JSON.parse(writtenJson);
      expect(written.sidebarWidth).toBe(300);
      expect(written.lastFolderPath).toBe('/project');
    });

    it('overwrites existing keys', () => {
      (fs.readFileSync as any).mockReturnValue(JSON.stringify({ sidebarWidth: 300 }));
      loadState();
      saveState({ sidebarWidth: 400 });

      const writtenJson = (fs.writeFileSync as any).mock.calls[0][1];
      expect(JSON.parse(writtenJson).sidebarWidth).toBe(400);
    });

    it('does not throw on write error', () => {
      (fs.writeFileSync as any).mockImplementation(() => { throw new Error('EPERM'); });
      expect(() => saveState({ sidebarWidth: 300 })).not.toThrow();
    });
  });
});
