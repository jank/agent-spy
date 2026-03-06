import Editor from '@monaco-editor/react';
import { getLanguageFromPath } from '../lib/file-types';
import { useTheme } from '../hooks/use-theme';
import type { WatchedFile } from '../types';

interface Props {
  file: WatchedFile;
  content: string;
}

export function CodeViewer({ file, content }: Props) {
  const isDark = useTheme();

  return (
    <Editor
      value={content}
      language={getLanguageFromPath(file.relativePath)}
      theme={isDark ? 'vs-dark' : 'vs'}
      options={{
        readOnly: true,
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        padding: { top: 12 },
        renderLineHighlight: 'none',
      }}
    />
  );
}
