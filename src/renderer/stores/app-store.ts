import { create } from 'zustand';
import type { WatchedFile, OpenFolderResult, FileDiffResult, ViewMode, BranchInfo } from '../types';

const DEFAULT_BRANCH_INFO: BranchInfo = { onBranch: false, branchName: null };

interface AppState {
  folderPath: string | null;
  isGitRepo: boolean;
  branch: BranchInfo;
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
  setBranch: (branch: BranchInfo) => void;
  setFiles: (files: WatchedFile[]) => void;
  setStarred: (starred: string[]) => void;
  selectFile: (file: WatchedFile) => void;
  setViewMode: (mode: ViewMode) => void;
  setFileContent: (content: string | null) => void;
  setDiffData: (data: FileDiffResult | null) => void;
  setLoading: (loading: boolean) => void;
  setChangedLines: (lines: number[]) => void;
  setScrollToLine: (line: number | null) => void;
  showHelp: boolean;
  setShowHelp: (show: boolean) => void;

  focusPane: 'files' | 'view';
  setFocusPane: (pane: 'files' | 'view') => void;

  // Imperative callbacks registered by components
  goToNextChange: (() => void) | null;
  goToPrevChange: (() => void) | null;
  selectNextFile: (() => void) | null;
  selectPrevFile: (() => void) | null;
  focusFilter: (() => void) | null;
  toggleChangedOnly: (() => void) | null;
  toggleBranchOnly: (() => void) | null;
  scrollView: ((delta: number) => void) | null;
  setScrollView: (cb: ((delta: number) => void) | null) => void;
  setGoToNextChange: (cb: (() => void) | null) => void;
  setGoToPrevChange: (cb: (() => void) | null) => void;
  setSelectNextFile: (cb: (() => void) | null) => void;
  setSelectPrevFile: (cb: (() => void) | null) => void;
  setFocusFilter: (cb: (() => void) | null) => void;
  setToggleChangedOnly: (cb: (() => void) | null) => void;
  setToggleBranchOnly: (cb: (() => void) | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  folderPath: null,
  isGitRepo: false,
  branch: DEFAULT_BRANCH_INFO,
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
      branch: result.branch ?? DEFAULT_BRANCH_INFO,
      selectedFile: null,
      fileContent: null,
      diffData: null,
    }),
  setBranch: (branch) => set({ branch }),
  setFiles: (files) => set({ files }),
  setStarred: (starred) => set({ starred }),
  selectFile: (file) =>
    set({
      selectedFile: file,
      fileContent: null,
      diffData: null,
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
  showHelp: false,
  setShowHelp: (showHelp) => set({ showHelp }),

  focusPane: 'files' as const,
  setFocusPane: (focusPane) => set({ focusPane }),

  scrollView: null,
  setScrollView: (cb) => set({ scrollView: cb }),
  goToNextChange: null,
  goToPrevChange: null,
  selectNextFile: null,
  selectPrevFile: null,
  focusFilter: null,
  toggleChangedOnly: null,
  toggleBranchOnly: null,
  setGoToNextChange: (cb) => set({ goToNextChange: cb }),
  setGoToPrevChange: (cb) => set({ goToPrevChange: cb }),
  setSelectNextFile: (cb) => set({ selectNextFile: cb }),
  setSelectPrevFile: (cb) => set({ selectPrevFile: cb }),
  setFocusFilter: (cb) => set({ focusFilter: cb }),
  setToggleChangedOnly: (cb) => set({ toggleChangedOnly: cb }),
  setToggleBranchOnly: (cb) => set({ toggleBranchOnly: cb }),
}));
