import { useEffect } from 'react';
import { useAppStore } from './stores/app-store';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import type { WatchedFile } from './types';

export default function App() {
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
    <div className="flex h-screen bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
      {/* Drag region for titlebar */}
      <div className="fixed top-0 left-0 right-0 h-[52px] app-drag-region z-50" />
      <Sidebar />
      <MainContent />
    </div>
  );
}
