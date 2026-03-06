import { useAppStore } from '../stores/app-store';
import { getViewerType } from '../lib/file-types';
import { CodeViewer } from './CodeViewer';
import { DiffViewer } from './DiffViewer';
import { MarkdownViewer } from './MarkdownViewer';
import { ImageViewer } from './ImageViewer';
import { PdfViewer } from './PdfViewer';

export function FileViewer() {
  const { selectedFile, viewMode, fileContent, diffData } = useAppStore();

  if (!selectedFile) return null;

  // Diff mode
  if (viewMode === 'diff' && diffData) {
    return <DiffViewer file={selectedFile} diffData={diffData} />;
  }

  if (fileContent === null) return null;

  // Content mode - choose viewer by file type
  const viewerType = getViewerType(selectedFile.relativePath);

  switch (viewerType) {
    case 'markdown':
      return <MarkdownViewer content={fileContent} />;
    case 'image':
      return <ImageViewer dataUrl={fileContent} fileName={selectedFile.relativePath} />;
    case 'pdf':
      return <PdfViewer dataUrl={fileContent} />;
    case 'code':
    default:
      return <CodeViewer file={selectedFile} content={fileContent} />;
  }
}
