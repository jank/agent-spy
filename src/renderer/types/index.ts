export interface WatchedFile {
  absolutePath: string;
  relativePath: string;
  modifiedMs: number;
  isGitChanged: boolean;
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

export type ViewerType = 'code' | 'markdown';

export interface ElectronAPI {
  openFolder: () => Promise<OpenFolderResult | null>;
  getFileContent: (path: string) => Promise<string>;
  getGitDiff: (path: string) => Promise<FileDiffResult | null>;
  toggleStar: (path: string) => Promise<string[]>;
  getStarred: () => Promise<string[]>;
  onFilesChanged: (cb: (files: WatchedFile[]) => void) => () => void;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
