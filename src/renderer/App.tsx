import { useEffect } from 'react';
import { useAppStore } from './stores/app-store';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import { TitleBar } from './components/TitleBar';
import { HelpDialog } from './components/HelpDialog';
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
      const store = useAppStore.getState();

      // Escape closes help dialog from anywhere
      if (e.key === 'Escape' && store.showHelp) {
        e.preventDefault();
        store.setShowHelp(false);
        return;
      }

      // Let native shortcuts (Cmd/Ctrl+key) pass through to the system
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Skip other shortcuts when typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      switch (e.key) {
        case 'd':
          e.preventDefault();
          if (store.selectedFile && store.isGitRepo) {
            const newMode = store.viewMode === 'diff' ? 'content' : 'diff';
            useAppStore.getState().setViewMode(newMode);
            if (newMode === 'diff') {
              useAppStore.getState().setLoading(true);
              window.api.getGitDiff(store.selectedFile.absolutePath).then((data) => {
                useAppStore.getState().setDiffData(data);
              });
            } else if (!store.fileContent) {
              useAppStore.getState().setLoading(true);
              if (isBinaryFile(store.selectedFile.relativePath)) {
                window.api.getFileDataUrl(store.selectedFile.absolutePath).then((dataUrl) => {
                  useAppStore.getState().setFileContent(dataUrl);
                });
              } else {
                window.api.getFileContent(store.selectedFile.absolutePath).then((content) => {
                  useAppStore.getState().setFileContent(content);
                });
              }
            }
          }
          break;
        case 's':
          e.preventDefault();
          if (store.focusPane === 'files' && store.selectedFile) {
            window.api.toggleStar(store.selectedFile.absolutePath).then((updated) => {
              useAppStore.getState().setStarred(updated);
            });
          }
          break;
        case 'j':
          e.preventDefault();
          if (store.focusPane === 'files') {
            store.selectNextFile?.();
          } else {
            store.goToNextChange?.();
          }
          break;
        case 'k':
          e.preventDefault();
          if (store.focusPane === 'files') {
            store.selectPrevFile?.();
          } else {
            store.goToPrevChange?.();
          }
          break;
        case 'h':
          e.preventDefault();
          store.setFocusPane('files');
          break;
        case 'l':
          e.preventDefault();
          store.setFocusPane('view');
          break;
        case '/':
          e.preventDefault();
          store.focusFilter?.();
          break;
        case 'c':
          e.preventDefault();
          store.toggleChangedOnly?.();
          break;
        case 'ArrowDown':
        case 'ArrowUp': {
          const delta = e.key === 'ArrowDown' ? 80 : -80;
          // Try Monaco scroll callback first, fall back to DOM scroll
          if (store.scrollView) {
            e.preventDefault();
            store.scrollView(delta);
          } else {
            const scrollContainer = document.querySelector('[data-scroll-view]');
            if (scrollContainer) {
              e.preventDefault();
              scrollContainer.scrollBy({ top: delta });
            }
          }
          break;
        }
        case '?':
          e.preventDefault();
          store.setShowHelp(!store.showHelp);
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

      // Update the selected file if it changed
      const selected = store.selectedFile;
      if (selected) {
        const updated = files.find((f) => f.absolutePath === selected.absolutePath);
        if (updated) {
          const contentChanged = updated.generation !== selected.generation;
          const gitStatusChanged = updated.isGitChanged !== selected.isGitChanged;

          if (contentChanged || gitStatusChanged) {
            useAppStore.setState({ selectedFile: updated });
          }

          if (contentChanged) {
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
      <HelpDialog />
    </div>
  );
}
