import { useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useChangedLines } from '../hooks/use-changed-lines';
import type { WatchedFile } from '../types';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

interface Props {
  content: string;
  file: WatchedFile;
}

function createHighlightPlugin(changedLineSet: Set<number>): Plugin {
  return () => (tree) => {
    if (changedLineSet.size === 0) return;
    visit(tree, 'element', (node: any) => {
      const pos = node.position;
      if (!pos) return;
      for (let line = pos.start.line; line <= pos.end.line; line++) {
        if (changedLineSet.has(line)) {
          const existing = node.properties?.className ?? [];
          node.properties = node.properties ?? {};
          node.properties.className = [...existing, 'changed-line-highlight'];
          return;
        }
      }
    });
  };
}

const markdownComponents: Components = {
  pre({ children, ...props }) {
    return (
      <pre className="!text-zinc-900 dark:!text-zinc-100" {...props}>
        {children}
      </pre>
    );
  },
  code({ className, children, ...props }) {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded text-sm" {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className={`${className} block overflow-x-auto`} {...props}>
        {children}
      </code>
    );
  },
};

export function MarkdownViewer({ content, file }: Props) {
  const changedLines = useChangedLines(file, content);

  const changedLineSet = useMemo(() => new Set(changedLines), [changedLines]);
  const highlightPlugin = useMemo(() => createHighlightPlugin(changedLineSet), [changedLineSet]);

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-zinc-900">
      <div className="prose dark:prose-invert max-w-none p-6 text-zinc-900 dark:text-zinc-100 prose-headings:text-zinc-900 dark:prose-headings:text-zinc-100 prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100 prose-th:text-zinc-900 dark:prose-th:text-zinc-100 prose-td:text-zinc-700 dark:prose-td:text-zinc-300">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, highlightPlugin]}
          components={markdownComponents}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
