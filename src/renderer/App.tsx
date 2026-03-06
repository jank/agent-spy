import { useEffect } from 'react';
import { useAppStore } from './stores/app-store';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import { TitleBar } from './components/TitleBar';
import { isBinaryFile } from './lib/file-types';
import type { WatchedFile } from './types';

export default function App() {
  // Restore last folder on startup
  useEffect(() => {
    window.api.getPersistedState().then((state) => {
      if (state.lastFolderPath) {
        window.api.openFolderByPath(state.lastFolderPath).then((result) => {
          if (result) {
            useAppStore.getState().setFolder(result);
          }
        });
      }
    });
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip when typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const store = useAppStore.getState();
      switch (e.key) {
        case 'j':
          e.preventDefault();
          store.goToNextChange?.();
          break;
        case 'k':
          e.preventDefault();
          store.goToPrevChange?.();
          break;
        case '/':
          e.preventDefault();
          store.focusFilter?.();
          break;
        case 'c':
          e.preventDefault();
          store.toggleChangedOnly?.();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const unsubscribe = window.api.onFilesChanged((files: WatchedFile[]) => {
      const store = useAppStore.getState();
      store.setFiles(files);

      // Reload content if the currently viewed file was modified
      const selected = store.selectedFile;
      if (selected) {
        const updated = files.find((f) => f.absolutePath === selected.absolutePath);
        if (updated && updated.modifiedMs !== selected.modifiedMs) {
          useAppStore.setState({ selectedFile: updated });
          if (store.viewMode === 'diff') {
            window.api.getGitDiff(updated.absolutePath).then((data) => {
              useAppStore.getState().setDiffData(data);
            });
          } else if (isBinaryFile(updated.relativePath)) {
            window.api.getFileDataUrl(updated.absolutePath).then((dataUrl) => {
              useAppStore.getState().setFileContent(dataUrl);
            });
          } else {
            window.api.getFileContent(updated.absolutePath).then((content) => {
              useAppStore.getState().setFileContent(content);
            });
          }
        }
      }
    });
    return unsubscribe;
  }, []);

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
      <TitleBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <MainContent />
      </div>
    </div>
  );
}
