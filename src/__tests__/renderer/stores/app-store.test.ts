import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../../renderer/stores/app-store';
import type { WatchedFile, OpenFolderResult } from '../../../renderer/types';

const mockFile: WatchedFile = {
  absolutePath: '/project/src/app.ts',
  relativePath: 'src/app.ts',
  modifiedMs: Date.now(),
  isGitChanged: false,
  generation: 1,
};

const mockFolderResult: OpenFolderResult = {
  folderPath: '/project',
  files: [mockFile],
  starred: ['/project/src/app.ts'],
  isGitRepo: true,
};

beforeEach(() => {
  // Reset store to initial state
  useAppStore.setState({
    folderPath: null,
    isGitRepo: false,
    files: [],
    starred: [],
    selectedFile: null,
    viewMode: 'content',
    fileContent: null,
    diffData: null,
    isLoading: false,
    changedLines: [],
    scrollToLine: null,
    showHelp: false,
    focusPane: 'files',
    scrollView: null,
    goToNextChange: null,
    goToPrevChange: null,
    selectNextFile: null,
    selectPrevFile: null,
    focusFilter: null,
    toggleChangedOnly: null,
  });
});

describe('app-store', () => {
  describe('initial state', () => {
    it('has correct defaults', () => {
      const state = useAppStore.getState();
      expect(state.folderPath).toBeNull();
      expect(state.isGitRepo).toBe(false);
      expect(state.files).toEqual([]);
      expect(state.starred).toEqual([]);
      expect(state.selectedFile).toBeNull();
      expect(state.viewMode).toBe('content');
      expect(state.fileContent).toBeNull();
      expect(state.diffData).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.showHelp).toBe(false);
      expect(state.focusPane).toBe('files');
    });
  });

  describe('setFolder', () => {
    it('sets folder data from OpenFolderResult', () => {
      useAppStore.getState().setFolder(mockFolderResult);
      const state = useAppStore.getState();
      expect(state.folderPath).toBe('/project');
      expect(state.files).toEqual([mockFile]);
      expect(state.starred).toEqual(['/project/src/app.ts']);
      expect(state.isGitRepo).toBe(true);
    });

    it('clears selected file and content when folder changes', () => {
      useAppStore.setState({
        selectedFile: mockFile,
        fileContent: 'old',
        diffData: { original: '', modified: '', isNew: false },
      });
      useAppStore.getState().setFolder(mockFolderResult);
      const state = useAppStore.getState();
      expect(state.selectedFile).toBeNull();
      expect(state.fileContent).toBeNull();
      expect(state.diffData).toBeNull();
    });
  });

  describe('selectFile', () => {
    it('sets the selected file and resets view state', () => {
      useAppStore.setState({
        fileContent: 'old content',
        viewMode: 'diff',
        isLoading: false,
        changedLines: [1, 2],
      });
      useAppStore.getState().selectFile(mockFile);
      const state = useAppStore.getState();
      expect(state.selectedFile).toBe(mockFile);
      expect(state.fileContent).toBeNull();
      expect(state.diffData).toBeNull();
      expect(state.viewMode).toBe('content');
      expect(state.isLoading).toBe(true);
      expect(state.changedLines).toEqual([]);
      expect(state.scrollToLine).toBeNull();
    });
  });

  describe('setFileContent', () => {
    it('sets content and clears loading', () => {
      useAppStore.setState({ isLoading: true });
      useAppStore.getState().setFileContent('file content here');
      const state = useAppStore.getState();
      expect(state.fileContent).toBe('file content here');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('setDiffData', () => {
    it('sets diff data and clears loading', () => {
      useAppStore.setState({ isLoading: true });
      const diff = { original: 'old', modified: 'new', isNew: false };
      useAppStore.getState().setDiffData(diff);
      const state = useAppStore.getState();
      expect(state.diffData).toBe(diff);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('setViewMode', () => {
    it('switches view mode', () => {
      useAppStore.getState().setViewMode('diff');
      expect(useAppStore.getState().viewMode).toBe('diff');
      useAppStore.getState().setViewMode('content');
      expect(useAppStore.getState().viewMode).toBe('content');
    });
  });

  describe('showHelp', () => {
    it('toggles help dialog', () => {
      useAppStore.getState().setShowHelp(true);
      expect(useAppStore.getState().showHelp).toBe(true);
      useAppStore.getState().setShowHelp(false);
      expect(useAppStore.getState().showHelp).toBe(false);
    });
  });

  describe('focusPane', () => {
    it('switches focus pane', () => {
      useAppStore.getState().setFocusPane('view');
      expect(useAppStore.getState().focusPane).toBe('view');
      useAppStore.getState().setFocusPane('files');
      expect(useAppStore.getState().focusPane).toBe('files');
    });
  });

  describe('callback registration', () => {
    it('registers and clears scrollView callback', () => {
      const cb = (_delta: number) => {};
      useAppStore.getState().setScrollView(cb);
      expect(useAppStore.getState().scrollView).toBe(cb);
      useAppStore.getState().setScrollView(null);
      expect(useAppStore.getState().scrollView).toBeNull();
    });

    it('registers and clears navigation callbacks', () => {
      const next = () => {};
      const prev = () => {};
      useAppStore.getState().setGoToNextChange(next);
      useAppStore.getState().setGoToPrevChange(prev);
      expect(useAppStore.getState().goToNextChange).toBe(next);
      expect(useAppStore.getState().goToPrevChange).toBe(prev);
    });
  });

  describe('setFiles', () => {
    it('updates the file list', () => {
      const files = [
        mockFile,
        { ...mockFile, absolutePath: '/project/b.ts', relativePath: 'b.ts' },
      ];
      useAppStore.getState().setFiles(files);
      expect(useAppStore.getState().files).toHaveLength(2);
    });
  });

  describe('setStarred', () => {
    it('updates starred list', () => {
      useAppStore.getState().setStarred(['/a', '/b']);
      expect(useAppStore.getState().starred).toEqual(['/a', '/b']);
    });
  });
});
