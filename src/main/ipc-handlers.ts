import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as fs from 'node:fs';
import { GitService } from './services/git-service';
import { FileWatcherService } from './services/file-watcher-service';
import { StarredStore } from './services/starred-store';

const IPC = {
  OPEN_FOLDER: 'agent-spy:open-folder',
  GET_FILE_CONTENT: 'agent-spy:get-file-content',
  GET_GIT_DIFF: 'agent-spy:get-git-diff',
  TOGGLE_STAR: 'agent-spy:toggle-star',
  GET_STARRED: 'agent-spy:get-starred',
  FILES_CHANGED: 'agent-spy:files-changed',
} as const;

let gitService: GitService | null = null;
let watcherService: FileWatcherService | null = null;
let starredStore: StarredStore | null = null;

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.OPEN_FOLDER, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (result.canceled || !result.filePaths[0]) return null;

    const folderPath = result.filePaths[0];

    // Tear down previous services
    watcherService?.close();

    gitService = new GitService(folderPath);
    watcherService = new FileWatcherService(folderPath);
    starredStore = new StarredStore(folderPath);

    const isGitRepo = await gitService.isGitRepo();

    // Get git changed files for status indicators
    if (isGitRepo) {
      const changedFiles = await gitService.getChangedFiles();
      watcherService.setGitChangedFiles(changedFiles);
    }

    // Start watching
    watcherService.startWatching();

    // Push changes to renderer
    watcherService.onChange((files) => {
      const win = BrowserWindow.getAllWindows()[0];
      if (win) {
        win.webContents.send(IPC.FILES_CHANGED, files);
      }
    });

    const files = await watcherService.getInitialFiles();
    const starred = starredStore.getStarred();
    return { folderPath, files, starred, isGitRepo };
  });

  ipcMain.handle(IPC.GET_FILE_CONTENT, async (_e, filePath: string) => {
    return fs.promises.readFile(filePath, 'utf-8');
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
}
