import { useAppStore } from '../stores/app-store';
import iconUrl from '../../../agent-spy.png';

function Shortcut({ keys, description }: { keys: string; description: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-zinc-600 dark:text-zinc-300">{description}</span>
      <kbd className="ml-4 shrink-0 px-2 py-0.5 text-xs font-mono bg-zinc-100 dark:bg-zinc-700 rounded-md border border-zinc-300 dark:border-zinc-600 shadow-sm">
        {keys}
      </kbd>
    </div>
  );
}

function Feature({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-2.5">
      <span className="text-base leading-5 shrink-0">{emoji}</span>
      <div>
        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{title}</span>
        <span className="text-sm text-zinc-500 dark:text-zinc-400"> — {description}</span>
      </div>
    </div>
  );
}

export function HelpDialog() {
  const showHelp = useAppStore((s) => s.showHelp);

  if (!showHelp) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => useAppStore.getState().setShowHelp(false)}
    >
      <div
        className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden border border-zinc-200 dark:border-zinc-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with icon */}
        <div className="bg-gradient-to-br from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 px-6 pt-6 pb-5 flex items-center gap-4">
          <img src={iconUrl} alt="Agent Spy" className="w-16 h-16 rounded-xl shadow-lg" />
          <div>
            <h2 className="text-xl font-bold">Agent Spy</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              Your AI agent watchdog
            </p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Description */}
          <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Agent Spy lets you monitor and verify file changes made by AI agents in real time. It
            watches your project folder, highlights exactly what changed, and shows diffs against
            the last committed version. Stay in control of your codebase while AI agents work
            alongside you.
          </p>

          {/* Features */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-2.5">
              Features
            </h3>
            <div className="space-y-2">
              <Feature
                emoji="👁️"
                title="Live file watching"
                description="see changes the moment they happen"
              />
              <Feature
                emoji="🟡"
                title="Git change indicators"
                description="yellow markers show which files differ from the last commit"
              />
              <Feature
                emoji="✨"
                title="Inline highlighting"
                description="changed lines are highlighted in code and markdown"
              />
              <Feature
                emoji="🔀"
                title="Side-by-side diff"
                description="compare current file against the committed version"
              />
              <Feature
                emoji="⬆️⬇️"
                title="Change navigation"
                description="step through changes one by one"
              />
              <Feature
                emoji="🔍"
                title="Changed files filter"
                description="focus on only the files that were modified"
              />
              <Feature
                emoji="⭐"
                title="Star files"
                description="pin important files to the top of the list"
              />
            </div>
          </div>

          {/* Shortcuts */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-2.5">
              Keyboard shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              <Shortcut keys="h" description="Focus file list" />
              <Shortcut keys="l" description="Focus file view" />
              <Shortcut keys="j" description="Next file / change" />
              <Shortcut keys="k" description="Previous file / change" />
              <Shortcut keys="s" description="Toggle star (file list)" />
              <Shortcut keys="d" description="Toggle diff / content" />
              <Shortcut keys="/" description="Focus filter" />
              <Shortcut keys="c" description="Toggle changed filter" />
              <Shortcut keys="↑ ↓" description="Scroll view" />
              <Shortcut keys="?" description="Toggle help" />
              <Shortcut keys="Esc" description="Close dialog" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/30 flex justify-end">
          <button
            onClick={() => useAppStore.getState().setShowHelp(false)}
            className="px-4 py-1.5 text-sm font-medium rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-800 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors shadow-sm"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
