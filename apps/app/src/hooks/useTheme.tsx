import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('pitwall-theme');
      if (stored === 'light' || stored === 'dark') return stored;
    }
    return 'dark'; // Default to dark mode (fighter jet grey)
  });

  useEffect(() => {
    localStorage.setItem('pitwall-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback for components outside provider - read from localStorage
    const stored = typeof window !== 'undefined' ? localStorage.getItem('pitwall-theme') : null;
    const theme: ThemeMode = stored === 'light' ? 'light' : 'dark';
    return {
      theme,
      setTheme: () => {},
      toggleTheme: () => {},
      isDark: theme === 'dark',
    };
  }
  return context;
}
