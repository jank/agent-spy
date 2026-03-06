import { DiffEditor } from '@monaco-editor/react';
import { getLanguageFromPath } from '../lib/file-types';
import { useTheme } from '../hooks/use-theme';
import type { WatchedFile, FileDiffResult } from '../types';

interface Props {
  file: WatchedFile;
  diffData: FileDiffResult;
}

export function DiffViewer({ file, diffData }: Props) {
  const isDark = useTheme();

  return (
    <DiffEditor
      original={diffData.original}
      modified={diffData.modified}
      language={getLanguageFromPath(file.relativePath)}
      theme={isDark ? 'vs-dark' : 'vs'}
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
