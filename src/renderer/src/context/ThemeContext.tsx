import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  activeTheme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = 'craftdock_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTheme, setActiveTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    } catch (e) {
      // ignore localStorage errors
    }
    return 'dark'; // Default to dark glassmorphism
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(activeTheme);
    root.setAttribute('data-theme', activeTheme);
    (window as any).api?.setTitleBarTheme?.(activeTheme);
  }, [activeTheme]);

  const setTheme = useCallback((nextTheme: Theme) => {
    setActiveTheme(nextTheme);
    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch (e) {
      // ignore
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(activeTheme === 'dark' ? 'light' : 'dark');
  }, [activeTheme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme: 'dark', activeTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
