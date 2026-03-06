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

  setFolder: (result: OpenFolderResult) => void;
  setFiles: (files: WatchedFile[]) => void;
  setStarred: (starred: string[]) => void;
  selectFile: (file: WatchedFile) => void;
  setViewMode: (mode: ViewMode) => void;
  setFileContent: (content: string | null) => void;
  setDiffData: (data: FileDiffResult | null) => void;
  setLoading: (loading: boolean) => void;
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
    }),
  setViewMode: (viewMode) => set({ viewMode }),
  setFileContent: (fileContent) => set({ fileContent, isLoading: false }),
  setDiffData: (diffData) => set({ diffData, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
