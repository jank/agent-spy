import { contextBridge, ipcRenderer } from 'electron';

const IPC = {
  OPEN_FOLDER: 'agent-spy:open-folder',
  OPEN_FOLDER_BY_PATH: 'agent-spy:open-folder-by-path',
  GET_FILE_CONTENT: 'agent-spy:get-file-content',
  GET_FILE_DATA_URL: 'agent-spy:get-file-data-url',
  GET_GIT_DIFF: 'agent-spy:get-git-diff',
  TOGGLE_STAR: 'agent-spy:toggle-star',
  GET_STARRED: 'agent-spy:get-starred',
  FILES_CHANGED: 'agent-spy:files-changed',
  GET_PERSISTED_STATE: 'agent-spy:get-persisted-state',
  SAVE_SIDEBAR_WIDTH: 'agent-spy:save-sidebar-width',
} as const;

contextBridge.exposeInMainWorld('api', {
  openFolder: () => ipcRenderer.invoke(IPC.OPEN_FOLDER),
  openFolderByPath: (path: string) => ipcRenderer.invoke(IPC.OPEN_FOLDER_BY_PATH, path),
  getFileContent: (path: string) => ipcRenderer.invoke(IPC.GET_FILE_CONTENT, path),
  getFileDataUrl: (path: string) => ipcRenderer.invoke(IPC.GET_FILE_DATA_URL, path),
  getGitDiff: (path: string) => ipcRenderer.invoke(IPC.GET_GIT_DIFF, path),
  toggleStar: (path: string) => ipcRenderer.invoke(IPC.TOGGLE_STAR, path),
  getStarred: () => ipcRenderer.invoke(IPC.GET_STARRED),
  getPersistedState: () => ipcRenderer.invoke(IPC.GET_PERSISTED_STATE),
  saveSidebarWidth: (width: number) => ipcRenderer.invoke(IPC.SAVE_SIDEBAR_WIDTH, width),
  onFilesChanged: (cb: (...args: unknown[]) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => cb(...args);
    ipcRenderer.on(IPC.FILES_CHANGED, handler);
    return () => {
      ipcRenderer.removeListener(IPC.FILES_CHANGED, handler);
    };
  },
});
