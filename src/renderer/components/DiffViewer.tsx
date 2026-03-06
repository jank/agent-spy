import { useRef, useEffect } from 'react';
import { DiffEditor, type DiffOnMount } from '@monaco-editor/react';
import { getLanguageFromPath } from '../lib/file-types';
import { useTheme } from '../hooks/use-theme';
import { useAppStore } from '../stores/app-store';
import type { WatchedFile, FileDiffResult } from '../types';

interface Props {
  file: WatchedFile;
  diffData: FileDiffResult;
}

export function DiffViewer({ file, diffData }: Props) {
  const isDark = useTheme();
  const scrollToLine = useAppStore((s) => s.scrollToLine);
  const diffEditorRef = useRef<any>(null);

  const handleMount: DiffOnMount = (editor) => {
    diffEditorRef.current = editor;

    // Auto-scroll to first diff after a short delay for the diff to compute
    setTimeout(() => {
      const changes = editor.getLineChanges();
      if (changes && changes.length > 0) {
        const firstLine = changes[0].modifiedStartLineNumber;
        editor.getModifiedEditor().revealLineInCenter(firstLine);
      }
    }, 100);
  };

  // Navigate to specific change via scrollToLine
  useEffect(() => {
    const editor = diffEditorRef.current;
    if (!editor || scrollToLine === null) return;

    editor.getModifiedEditor().revealLineInCenter(scrollToLine);
    useAppStore.getState().setScrollToLine(null);
  }, [scrollToLine]);

  return (
    <DiffEditor
      original={diffData.original}
      modified={diffData.modified}
      language={getLanguageFromPath(file.relativePath)}
      theme={isDark ? 'vs-dark' : 'vs'}
      onMount={handleMount}
      options={{
        readOnly: true,
        renderSideBySide: true,
        minimap: { enabled: false },
        fontSize: 13,
        scrollBeyondLastLine: false,
        padding: { top: 12 },
        renderLineHighlight: 'none',
      }}
    />
  );
}
