export interface WatchedFile {
  absolutePath: string;
  relativePath: string;
  modifiedMs: number;
  isGitChanged: boolean;
  generation: number;
}

export interface OpenFolderResult {
  folderPath: string;
  files: WatchedFile[];
  starred: string[];
  isGitRepo: boolean;
}

export interface FileDiffResult {
  original: string;
  modified: string;
  isNew: boolean;
}

export type ViewMode = 'content' | 'diff';

export type ViewerType = 'code' | 'markdown' | 'image' | 'pdf' | 'binary';

export interface PersistedState {
  windowBounds?: { x: number; y: number; width: number; height: number };
  sidebarWidth?: number;
  lastFolderPath?: string;
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
  hasUpdate: boolean;
}

export interface ElectronAPI {
  openFolder: () => Promise<OpenFolderResult | null>;
  openFolderByPath: (path: string) => Promise<OpenFolderResult | null>;
  getFileContent: (path: string) => Promise<string>;
  getFileDataUrl: (path: string) => Promise<string>;
  getGitCommitted: (path: string) => Promise<string | null>;
  getGitDiff: (path: string) => Promise<FileDiffResult | null>;
  toggleStar: (path: string) => Promise<string[]>;
  getStarred: () => Promise<string[]>;
  getPersistedState: () => Promise<PersistedState>;
  saveSidebarWidth: (width: number) => Promise<void>;
  checkForUpdate: () => Promise<UpdateInfo | null>;
  openReleaseUrl: (url: string) => Promise<void>;
  onFilesChanged: (cb: (files: WatchedFile[]) => void) => () => void;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
