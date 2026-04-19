export const theme = {
  font: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",

  color: {
    text: 'var(--color-text)',
    textSecondary: 'var(--color-text-secondary)',
    textMuted: 'var(--color-text-muted)',
    border: 'var(--color-border)',
    borderStrong: 'var(--color-border-strong)',
    surface: 'var(--color-surface)',
    surfaceSolid: 'var(--color-surface-solid)',
    surfaceHover: 'var(--color-surface-hover)',
    surfaceSunken: 'var(--color-surface-sunken)',
    accent: 'var(--color-accent)',
    accentHover: 'var(--color-accent-hover)',
    accentSoft: 'var(--color-accent-soft)',
    success: '#10b981',
    danger: '#ef4444',
    dangerSoft: 'var(--color-danger-soft)',
    warning: '#f59e0b',
    teamA: '#ef4444',
    teamB: '#3b82f6',
  },

  shadow: {
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
    panel: 'var(--shadow-panel)',
  },

  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 18,
  },

  transition: 'all 180ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const panelSurface = {
  background: theme.color.surface,
  backdropFilter: 'saturate(180%) blur(16px)',
  WebkitBackdropFilter: 'saturate(180%) blur(16px)',
  border: `1px solid ${theme.color.border}`,
  boxShadow: theme.shadow.panel,
} as const;

// ── Theme mode ─────────────────────────────────────────────
export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'v-tactics-theme-mode-v2';

export const getInitialThemeMode = (): ThemeMode => {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* ignore */ }
  return 'light';
};

export const applyThemeMode = (mode: ThemeMode) => {
  document.documentElement.setAttribute('data-theme', mode);
  try { localStorage.setItem(THEME_STORAGE_KEY, mode); } catch { /* ignore */ }
};
