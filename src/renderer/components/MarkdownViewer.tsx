import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface Props {
  content: string;
}

export function MarkdownViewer({ content }: Props) {
  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-zinc-900">
      <div className="prose dark:prose-invert max-w-none p-6 text-zinc-900 dark:text-zinc-100 prose-headings:text-zinc-900 dark:prose-headings:text-zinc-100 prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100 prose-th:text-zinc-900 dark:prose-th:text-zinc-100 prose-td:text-zinc-700 dark:prose-td:text-zinc-300">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
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
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
