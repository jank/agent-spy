import { useEffect, useMemo, useRef } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useDetailedChanges } from '../hooks/use-detailed-changes';
import { useAppStore } from '../stores/app-store';
import type { WatchedFile } from '../types';
import type { LineChange } from '../lib/diff-utils';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

interface Props {
  content: string;
  file: WatchedFile;
}

const CLASS_MAP = {
  added: 'changed-line-added',
  modified: 'changed-line-modified',
  deleted: 'changed-line-deleted',
} as const;

function createHighlightPlugin(
  lineTypeMap: Map<number, 'added' | 'modified'>,
  deletionAfterLines: Set<number>,
): Plugin {
  return () => (tree) => {
    if (lineTypeMap.size === 0 && deletionAfterLines.size === 0) return;
    visit(tree, 'element', (node: any) => {
      const pos = node.position;
      if (!pos) return;

      // Check if any line in this element's range has a change
      for (let line = pos.start.line; line <= pos.end.line; line++) {
        const changeType = lineTypeMap.get(line);
        if (changeType) {
          const existing = node.properties?.className ?? [];
          node.properties = node.properties ?? {};
          node.properties.className = [...existing, CLASS_MAP[changeType]];
          node.properties['data-changed-line'] = String(line);
          return;
        }
      }

      // Mark elements that precede a deletion (for positioning deletion markers)
      if (deletionAfterLines.has(pos.end.line)) {
        node.properties = node.properties ?? {};
        node.properties['data-deletion-after'] = String(pos.end.line);
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

/** Renders a deletion marker block showing removed lines */
function DeletionMarker({ lines }: { lines: string[] }) {
  return (
    <div className="changed-line-deleted-block" data-changed-line="deletion">
      <div className="text-[11px] font-medium text-red-500 dark:text-red-400 mb-1 select-none">
        Deleted:
      </div>
      {lines.map((line, i) => (
        <div key={i} className="text-sm text-red-600/70 dark:text-red-400/70 line-through font-mono whitespace-pre-wrap">
          {line || '\u00A0'}
        </div>
      ))}
    </div>
  );
}

export function MarkdownViewer({ content, file }: Props) {
  const changes = useDetailedChanges(file, content);
  const scrollToLine = useAppStore((s) => s.scrollToLine);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build lookup maps from changes
  const { lineTypeMap, deletionAfterLines, deletionsByLine } = useMemo(() => {
    const ltm = new Map<number, 'added' | 'modified'>();
    const dal = new Set<number>();
    const dbl = new Map<number, string[][]>();

    for (const ch of changes) {
      if (ch.type === 'added' || ch.type === 'modified') {
        ltm.set(ch.line, ch.type);
      } else if (ch.type === 'deleted' && ch.deletedText) {
        dal.add(ch.line);
        const existing = dbl.get(ch.line) ?? [];
        existing.push(ch.deletedText);
        dbl.set(ch.line, existing);
      }
    }
    return { lineTypeMap: ltm, deletionAfterLines: dal, deletionsByLine: dbl };
  }, [changes]);

  const highlightPlugin = useMemo(
    () => createHighlightPlugin(lineTypeMap, deletionAfterLines),
    [lineTypeMap, deletionAfterLines],
  );

  // Scroll to target changed line
  useEffect(() => {
    if (scrollToLine === null || !containerRef.current) return;

    const elements = containerRef.current.querySelectorAll<HTMLElement>('[data-changed-line]');
    let target: HTMLElement | null = null;
    let bestDist = Infinity;

    elements.forEach((el) => {
      const val = el.dataset.changedLine!;
      if (val === 'deletion') return; // handle below
      const line = parseInt(val, 10);
      const dist = Math.abs(line - scrollToLine);
      if (dist < bestDist) {
        bestDist = dist;
        target = el;
      }
    });

    // Also check deletion markers
    containerRef.current.querySelectorAll<HTMLElement>('[data-deletion-after]').forEach((el) => {
      const line = parseInt(el.dataset.deletionAfter!, 10);
      const dist = Math.abs(line - scrollToLine);
      if (dist < bestDist) {
        bestDist = dist;
        target = el;
      }
    });

    if (target) {
      (target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    useAppStore.getState().setScrollToLine(null);
  }, [scrollToLine]);

  // Render markdown, then inject deletion markers into the DOM
  useEffect(() => {
    if (!containerRef.current || deletionsByLine.size === 0) return;

    // Remove previously injected deletion markers
    containerRef.current.querySelectorAll('.changed-line-deleted-block').forEach((el) => el.remove());

    // For each deletion position, find the element with data-deletion-after and insert after it
    for (const [line, textGroups] of deletionsByLine) {
      const anchor = containerRef.current.querySelector<HTMLElement>(`[data-deletion-after="${line}"]`);
      if (!anchor) continue;

      for (const texts of textGroups) {
        const marker = document.createElement('div');
        marker.className = 'changed-line-deleted-block';
        marker.setAttribute('data-changed-line', 'deletion');

        const label = document.createElement('div');
        label.className = 'text-[11px] font-medium text-red-500 dark:text-red-400 mb-1 select-none';
        label.textContent = 'Deleted:';
        marker.appendChild(label);

        for (const textLine of texts) {
          const lineEl = document.createElement('div');
          lineEl.className = 'text-sm text-red-600/70 dark:text-red-400/70 line-through font-mono whitespace-pre-wrap';
          lineEl.textContent = textLine || '\u00A0';
          marker.appendChild(lineEl);
        }

        anchor.insertAdjacentElement('afterend', marker);
      }
    }
  }, [deletionsByLine, content]);

  // For deletions at the very top (line 0), render them before the markdown
  const topDeletions = deletionsByLine.get(0);

  return (
    <div ref={containerRef} data-scroll-view className="h-full overflow-y-auto bg-white dark:bg-zinc-900">
      <div className="prose dark:prose-invert max-w-none p-6 text-zinc-900 dark:text-zinc-100 prose-headings:text-zinc-900 dark:prose-headings:text-zinc-100 prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100 prose-th:text-zinc-900 dark:prose-th:text-zinc-100 prose-td:text-zinc-700 dark:prose-td:text-zinc-300">
        {topDeletions && topDeletions.map((texts, i) => (
          <DeletionMarker key={i} lines={texts} />
        ))}
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
