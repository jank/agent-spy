import { contextBridge, ipcRenderer } from 'electron';

const IPC = {
  OPEN_FOLDER: 'agent-spy:open-folder',
  GET_FILE_CONTENT: 'agent-spy:get-file-content',
  GET_GIT_DIFF: 'agent-spy:get-git-diff',
  TOGGLE_STAR: 'agent-spy:toggle-star',
  GET_STARRED: 'agent-spy:get-starred',
  FILES_CHANGED: 'agent-spy:files-changed',
} as const;

contextBridge.exposeInMainWorld('api', {
  openFolder: () => ipcRenderer.invoke(IPC.OPEN_FOLDER),
  getFileContent: (path: string) => ipcRenderer.invoke(IPC.GET_FILE_CONTENT, path),
  getGitDiff: (path: string) => ipcRenderer.invoke(IPC.GET_GIT_DIFF, path),
  toggleStar: (path: string) => ipcRenderer.invoke(IPC.TOGGLE_STAR, path),
  getStarred: () => ipcRenderer.invoke(IPC.GET_STARRED),
  onFilesChanged: (cb: (...args: unknown[]) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => cb(...args);
    ipcRenderer.on(IPC.FILES_CHANGED, handler);
    return () => {
      ipcRenderer.removeListener(IPC.FILES_CHANGED, handler);
    };
  },
});
