export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeColors {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  surfaceSecondary: string;
  text: string;
  textMuted: string;
  textInverse: string;
  border: string;
  borderLight: string;
  shadow: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export const themes: Record<ResolvedTheme, ThemeColors> = {
  light: {
    primary: '#F29F67',
    accent: '#F29F67',
    background: '#ffffff',
    surface: '#f8fafc',
    surfaceSecondary: '#f1f5f9',
    text: '#1a202c',
    textMuted: '#718096',
    textInverse: '#ffffff',
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    shadow: 'rgba(0, 0, 0, 0.1)',
    success: '#F29F67',
    warning: '#ffa726',
    error: '#ff6b6b',
    info: '#F29F67',
  },
  dark: {
    primary: '#F29F67',
    accent: '#F29F67',
    background: '#0a0a0a',
    surface: '#1a1a1a',
    surfaceSecondary: '#2a2a2a',
    text: '#ffffff',
    textMuted: '#888888',
    textInverse: '#000000',
    border: 'rgba(255, 255, 255, 0.1)',
    borderLight: 'rgba(255, 255, 255, 0.05)',
    shadow: 'rgba(0, 0, 0, 0.3)',
    success: '#F29F67',
    warning: '#ffa726',
    error: '#ff6b6b',
    info: '#F29F67',
  },
};

export const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const getStoredTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem('spark-theme') as Theme;
  return stored || 'light';
};

export const setStoredTheme = (theme: Theme): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('spark-theme', theme);
};

export const resolveTheme = (theme: Theme): ResolvedTheme => {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
};

export const applyTheme = (resolvedTheme: ResolvedTheme): void => {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  const colors = themes[resolvedTheme];
  
  // Set CSS custom properties
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });
  
  // Set theme attribute for CSS selectors
  root.setAttribute('data-theme', resolvedTheme);
  
  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', colors.background);
  }
};
