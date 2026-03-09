import type { ViewerType } from '../types';

const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx', '.markdown']);
const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.bmp',
  '.ico',
  '.svg',
]);
const PDF_EXTENSIONS = new Set(['.pdf']);

const MONACO_LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescriptreact',
  '.js': 'javascript',
  '.jsx': 'javascriptreact',
  '.json': 'json',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.py': 'python',
  '.rs': 'rust',
  '.go': 'go',
  '.java': 'java',
  '.kt': 'kotlin',
  '.swift': 'swift',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.rb': 'ruby',
  '.php': 'php',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'ini',
  '.xml': 'xml',
  '.svg': 'xml',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.sql': 'sql',
  '.graphql': 'graphql',
  '.gql': 'graphql',
  '.dockerfile': 'dockerfile',
  '.r': 'r',
  '.lua': 'lua',
  '.dart': 'dart',
  '.vue': 'html',
  '.tf': 'hcl',
  '.ini': 'ini',
  '.conf': 'ini',
  '.env': 'ini',
};

function getExtension(filePath: string): string {
  const basename = filePath.split('/').pop() || '';
  // Handle dotfiles like .gitignore, Dockerfile, etc.
  if (basename.toLowerCase() === 'dockerfile') return '.dockerfile';
  const dotIndex = basename.lastIndexOf('.');
  if (dotIndex === -1) return '';
  return basename.slice(dotIndex).toLowerCase();
}

export function getViewerType(relativePath: string): ViewerType {
  const ext = getExtension(relativePath);
  if (MARKDOWN_EXTENSIONS.has(ext)) return 'markdown';
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (PDF_EXTENSIONS.has(ext)) return 'pdf';
  return 'code';
}

export function isBinaryFile(relativePath: string): boolean {
  const type = getViewerType(relativePath);
  return type === 'image' || type === 'pdf' || type === 'binary';
}

export function getLanguageFromPath(relativePath: string): string {
  const ext = getExtension(relativePath);
  return MONACO_LANGUAGE_MAP[ext] ?? 'plaintext';
}
