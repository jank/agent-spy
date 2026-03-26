import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as fs from 'node:fs';
import { GitService } from './services/git-service';
import { FileWatcherService } from './services/file-watcher-service';
import { StarredStore } from './services/starred-store';
import { getState, saveState } from './services/app-state';
import { checkForUpdate, openReleaseUrl } from './services/update-checker';

import * as path from 'node:path';

const IPC = {
  OPEN_FOLDER: 'agent-spy:open-folder',
  OPEN_FOLDER_BY_PATH: 'agent-spy:open-folder-by-path',
  GET_FILE_CONTENT: 'agent-spy:get-file-content',
  GET_FILE_DATA_URL: 'agent-spy:get-file-data-url',
  GET_GIT_COMMITTED: 'agent-spy:get-git-committed',
  GET_GIT_DIFF: 'agent-spy:get-git-diff',
  TOGGLE_STAR: 'agent-spy:toggle-star',
  GET_STARRED: 'agent-spy:get-starred',
  FILES_CHANGED: 'agent-spy:files-changed',
  GET_PERSISTED_STATE: 'agent-spy:get-persisted-state',
  SAVE_SIDEBAR_WIDTH: 'agent-spy:save-sidebar-width',
  CHECK_FOR_UPDATE: 'agent-spy:check-for-update',
  OPEN_RELEASE_URL: 'agent-spy:open-release-url',
} as const;

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
};

let gitService: GitService | null = null;
let watcherService: FileWatcherService | null = null;
let starredStore: StarredStore | null = null;

async function openFolder(folderPath: string) {
  // Tear down previous services
  watcherService?.close();

  gitService = new GitService(folderPath);
  watcherService = new FileWatcherService(folderPath);
  starredStore = new StarredStore(folderPath);

  const isGitRepo = await gitService.isGitRepo();

  if (isGitRepo) {
    const { changed, newFiles } = await gitService.getChangedFiles();
    watcherService.setGitChangedFiles(changed, newFiles);
    watcherService.onRefreshGitStatus(() => gitService!.getChangedFiles());
    watcherService.startGitWatching();
  }

  watcherService.startWatching();

  watcherService.onChange((files) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send(IPC.FILES_CHANGED, files);
    }
  });

  const files = await watcherService.getInitialFiles();
  const starred = starredStore.getStarred();

  saveState({ lastFolderPath: folderPath });

  return { folderPath, files, starred, isGitRepo };
}

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.OPEN_FOLDER, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return openFolder(result.filePaths[0]);
  });

  ipcMain.handle(IPC.OPEN_FOLDER_BY_PATH, async (_e, folderPath: string) => {
    try {
      const stat = await fs.promises.stat(folderPath);
      if (!stat.isDirectory()) return null;
    } catch {
      return null;
    }
    return openFolder(folderPath);
  });

  ipcMain.handle(IPC.GET_FILE_CONTENT, async (_e, filePath: string) => {
    return fs.promises.readFile(filePath, 'utf-8');
  });

  ipcMain.handle(IPC.GET_FILE_DATA_URL, async (_e, filePath: string) => {
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] ?? 'application/octet-stream';
    const buffer = await fs.promises.readFile(filePath);
    return `data:${mime};base64,${buffer.toString('base64')}`;
  });

  ipcMain.handle(IPC.GET_GIT_COMMITTED, async (_e, filePath: string) => {
    if (!gitService) return null;
    return gitService.getCommittedContent(filePath);
  });

  ipcMain.handle(IPC.GET_GIT_DIFF, async (_e, filePath: string) => {
    if (!gitService) return null;
    return gitService.getFileDiff(filePath);
  });

  ipcMain.handle(IPC.TOGGLE_STAR, async (_e, filePath: string) => {
    if (!starredStore) return [];
    return starredStore.toggle(filePath);
  });

  ipcMain.handle(IPC.GET_STARRED, async () => {
    return starredStore?.getStarred() ?? [];
  });

  ipcMain.handle(IPC.GET_PERSISTED_STATE, () => {
    return getState();
  });

  ipcMain.handle(IPC.SAVE_SIDEBAR_WIDTH, (_e, width: number) => {
    saveState({ sidebarWidth: width });
  });

  ipcMain.handle(IPC.CHECK_FOR_UPDATE, async () => {
    try {
      return await checkForUpdate();
    } catch {
      return null;
    }
  });

  ipcMain.handle(IPC.OPEN_RELEASE_URL, (_e, url: string) => {
    openReleaseUrl(url);
  });
}
