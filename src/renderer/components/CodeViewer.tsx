import { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { getLanguageFromPath } from '../lib/file-types';
import { useChangedLines } from '../hooks/use-changed-lines';
import { useTheme } from '../hooks/use-theme';
import type { WatchedFile } from '../types';

interface Props {
  file: WatchedFile;
  content: string;
}

export function CodeViewer({ file, content }: Props) {
  const isDark = useTheme();
  const changedLines = useChangedLines(file, content);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  // Apply gutter decorations
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    if (changedLines.length === 0) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
      return;
    }

    const decorations = changedLines.map((line) => ({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        linesDecorationsClassName: 'changed-line-gutter',
      },
    }));

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);
  }, [changedLines]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    decorationsRef.current = [];
  };

  return (
    <Editor
      value={content}
      language={getLanguageFromPath(file.relativePath)}
      theme={isDark ? 'vs-dark' : 'vs'}
      onMount={handleMount}
      options={{
        readOnly: true,
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        padding: { top: 12 },
        renderLineHighlight: 'none',
        glyphMargin: true,
      }}
    />
  );
}
