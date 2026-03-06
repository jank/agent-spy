import { create } from 'zustand';
import type { WatchedFile, OpenFolderResult, FileDiffResult, ViewMode } from '../types';

interface AppState {
  folderPath: string | null;
  isGitRepo: boolean;
  files: WatchedFile[];
  starred: string[];
  selectedFile: WatchedFile | null;
  viewMode: ViewMode;
  fileContent: string | null;
  diffData: FileDiffResult | null;
  isLoading: boolean;
  changedLines: number[];
  scrollToLine: number | null;

  setFolder: (result: OpenFolderResult) => void;
  setFiles: (files: WatchedFile[]) => void;
  setStarred: (starred: string[]) => void;
  selectFile: (file: WatchedFile) => void;
  setViewMode: (mode: ViewMode) => void;
  setFileContent: (content: string | null) => void;
  setDiffData: (data: FileDiffResult | null) => void;
  setLoading: (loading: boolean) => void;
  setChangedLines: (lines: number[]) => void;
  setScrollToLine: (line: number | null) => void;

  // Imperative callbacks registered by components
  goToNextChange: (() => void) | null;
  goToPrevChange: (() => void) | null;
  focusFilter: (() => void) | null;
  toggleChangedOnly: (() => void) | null;
  setGoToNextChange: (cb: (() => void) | null) => void;
  setGoToPrevChange: (cb: (() => void) | null) => void;
  setFocusFilter: (cb: (() => void) | null) => void;
  setToggleChangedOnly: (cb: (() => void) | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
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

  setFolder: (result) =>
    set({
      folderPath: result.folderPath,
      files: result.files,
      starred: result.starred,
      isGitRepo: result.isGitRepo,
      selectedFile: null,
      fileContent: null,
      diffData: null,
    }),
  setFiles: (files) => set({ files }),
  setStarred: (starred) => set({ starred }),
  selectFile: (file) =>
    set({
      selectedFile: file,
      fileContent: null,
      diffData: null,
      viewMode: 'content',
      isLoading: true,
      changedLines: [],
      scrollToLine: null,
    }),
  setViewMode: (viewMode) => set({ viewMode }),
  setFileContent: (fileContent) => set({ fileContent, isLoading: false }),
  setDiffData: (diffData) => set({ diffData, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  setChangedLines: (changedLines) => set({ changedLines }),
  setScrollToLine: (scrollToLine) => set({ scrollToLine }),

  goToNextChange: null,
  goToPrevChange: null,
  focusFilter: null,
  toggleChangedOnly: null,
  setGoToNextChange: (cb) => set({ goToNextChange: cb }),
  setGoToPrevChange: (cb) => set({ goToPrevChange: cb }),
  setFocusFilter: (cb) => set({ focusFilter: cb }),
  setToggleChangedOnly: (cb) => set({ toggleChangedOnly: cb }),
}));
