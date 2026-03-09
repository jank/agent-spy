import { describe, it, expect } from 'vitest';
import { getViewerType, isBinaryFile, getLanguageFromPath } from '../../../renderer/lib/file-types';

describe('getViewerType', () => {
  it('returns markdown for .md files', () => {
    expect(getViewerType('README.md')).toBe('markdown');
  });

  it('returns markdown for .mdx files', () => {
    expect(getViewerType('docs/page.mdx')).toBe('markdown');
  });

  it('returns markdown for .markdown files', () => {
    expect(getViewerType('notes.markdown')).toBe('markdown');
  });

  it('returns image for common image formats', () => {
    for (const ext of ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'svg']) {
      expect(getViewerType(`photo.${ext}`)).toBe('image');
    }
  });

  it('returns pdf for .pdf files', () => {
    expect(getViewerType('doc.pdf')).toBe('pdf');
  });

  it('returns code for source files', () => {
    for (const ext of ['ts', 'tsx', 'js', 'jsx', 'json', 'css', 'py', 'rs', 'go']) {
      expect(getViewerType(`file.${ext}`)).toBe('code');
    }
  });

  it('returns code for files without extension', () => {
    expect(getViewerType('Makefile')).toBe('code');
  });

  it('returns code for Dockerfile', () => {
    expect(getViewerType('Dockerfile')).toBe('code');
  });

  it('is case insensitive for extensions', () => {
    expect(getViewerType('image.PNG')).toBe('image');
    expect(getViewerType('README.MD')).toBe('markdown');
  });

  it('handles nested paths', () => {
    expect(getViewerType('src/components/App.tsx')).toBe('code');
    expect(getViewerType('docs/guide.md')).toBe('markdown');
  });
});

describe('isBinaryFile', () => {
  it('returns true for images', () => {
    expect(isBinaryFile('photo.png')).toBe(true);
    expect(isBinaryFile('icon.ico')).toBe(true);
  });

  it('returns true for PDFs', () => {
    expect(isBinaryFile('doc.pdf')).toBe(true);
  });

  it('returns false for text files', () => {
    expect(isBinaryFile('app.ts')).toBe(false);
    expect(isBinaryFile('README.md')).toBe(false);
    expect(isBinaryFile('styles.css')).toBe(false);
  });
});

describe('getLanguageFromPath', () => {
  it('maps TypeScript extensions', () => {
    expect(getLanguageFromPath('file.ts')).toBe('typescript');
    expect(getLanguageFromPath('file.tsx')).toBe('typescriptreact');
  });

  it('maps JavaScript extensions', () => {
    expect(getLanguageFromPath('file.js')).toBe('javascript');
    expect(getLanguageFromPath('file.jsx')).toBe('javascriptreact');
  });

  it('maps common languages', () => {
    expect(getLanguageFromPath('file.py')).toBe('python');
    expect(getLanguageFromPath('file.rs')).toBe('rust');
    expect(getLanguageFromPath('file.go')).toBe('go');
    expect(getLanguageFromPath('file.java')).toBe('java');
    expect(getLanguageFromPath('file.rb')).toBe('ruby');
    expect(getLanguageFromPath('file.swift')).toBe('swift');
  });

  it('maps web languages', () => {
    expect(getLanguageFromPath('file.html')).toBe('html');
    expect(getLanguageFromPath('file.css')).toBe('css');
    expect(getLanguageFromPath('file.scss')).toBe('scss');
    expect(getLanguageFromPath('file.json')).toBe('json');
  });

  it('maps config/data formats', () => {
    expect(getLanguageFromPath('file.yaml')).toBe('yaml');
    expect(getLanguageFromPath('file.yml')).toBe('yaml');
    expect(getLanguageFromPath('file.xml')).toBe('xml');
    expect(getLanguageFromPath('file.sql')).toBe('sql');
    expect(getLanguageFromPath('file.toml')).toBe('ini');
  });

  it('maps shell scripts', () => {
    expect(getLanguageFromPath('file.sh')).toBe('shell');
    expect(getLanguageFromPath('file.bash')).toBe('shell');
    expect(getLanguageFromPath('file.zsh')).toBe('shell');
  });

  it('returns plaintext for unknown extensions', () => {
    expect(getLanguageFromPath('file.xyz')).toBe('plaintext');
    expect(getLanguageFromPath('file.unknown')).toBe('plaintext');
  });

  it('returns plaintext for files without extension', () => {
    expect(getLanguageFromPath('Makefile')).toBe('plaintext');
  });

  it('maps Dockerfile correctly', () => {
    expect(getLanguageFromPath('Dockerfile')).toBe('dockerfile');
  });

  it('handles paths with directories', () => {
    expect(getLanguageFromPath('src/utils/helper.ts')).toBe('typescript');
  });
});
