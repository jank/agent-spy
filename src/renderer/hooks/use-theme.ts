import { create } from 'zustand';

type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  cycle: () => void;
}

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.classList.toggle('light', !isDark);
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const saved = localStorage.getItem('agent-spy-theme') as ThemeMode | null;
  const mode = saved ?? 'system';
  const isDark = resolveIsDark(mode);

  // Apply on load
  applyTheme(isDark);

  // Listen for system changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { mode } = get();
    if (mode === 'system') {
      const newIsDark = resolveIsDark('system');
      applyTheme(newIsDark);
      set({ isDark: newIsDark });
    }
  });

  return {
    mode,
    isDark,
    setMode: (mode) => {
      const isDark = resolveIsDark(mode);
      localStorage.setItem('agent-spy-theme', mode);
      applyTheme(isDark);
      set({ mode, isDark });
    },
    cycle: () => {
      const order: ThemeMode[] = ['system', 'light', 'dark'];
      const current = get().mode;
      const next = order[(order.indexOf(current) + 1) % order.length];
      get().setMode(next);
    },
  };
});

/** Simple hook returning isDark boolean for components like Monaco */
export function useTheme(): boolean {
  return useThemeStore((s) => s.isDark);
}
