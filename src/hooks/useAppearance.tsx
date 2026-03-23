import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';
type AccentColor = 'blue' | 'purple' | 'green' | 'red' | 'orange';

interface AppearanceContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('whatch_pro_theme') as Theme) || 'dark');
  const [accentColor, setAccentColor] = useState<AccentColor>(() => (localStorage.getItem('whatch_pro_accent') as AccentColor) || 'blue');

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Handle Theme
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    localStorage.setItem('whatch_pro_theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    localStorage.setItem('whatch_pro_accent', accentColor);
    
    const colors = {
      blue: '#2563eb',
      purple: '#9333ea',
      green: '#16a34a',
      red: '#dc2626',
      orange: '#ea580c'
    };
    
    root.style.setProperty('--primary-color', colors[accentColor]);
  }, [accentColor]);

  return (
    <AppearanceContext.Provider value={{ theme, setTheme, accentColor, setAccentColor }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (context === undefined) {
    throw new Error('useAppearance must be used within an AppearanceProvider');
  }
  return context;
}
