'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// Function to determine if dark mode should be active based on time
const shouldBeDarkMode = () => {
  const now = new Date();
  const hour = now.getHours();
  // Dark mode from 8 PM (20:00) to 6 AM (06:00)
  return hour >= 20 || hour < 6;
};

// Function to get initial theme from localStorage or time
const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';

  const savedTheme = localStorage.getItem('theme');

  if (savedTheme) {
    if (savedTheme === 'auto') {
      return shouldBeDarkMode() ? 'dark' : 'light';
    }
    return savedTheme; // 'dark' or 'light'
  }

  // No saved preference: use time-based auto mode
  localStorage.setItem('theme', 'auto');
  return shouldBeDarkMode() ? 'dark' : 'light';
};

// Function to apply theme to document
const applyTheme = (currentTheme) => {
  if (typeof window !== 'undefined') {
    const html = document.documentElement;
    if (currentTheme === 'dark') {
      html.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      html.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }
};

export const ThemeProvider = ({ children }) => {
  // Initialize theme immediately on client to prevent flash
  const [theme, setTheme] = useState(() => {
    const initialTheme = getInitialTheme();
    applyTheme(initialTheme);
    return initialTheme;
  });

  // Toggle between light and dark manually
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme); // Save manual preference
  }, [theme]);

  // Watch for time changes (check every minute)
  useEffect(() => {
    const interval = setInterval(() => {
      const savedTheme = localStorage.getItem('theme');

      // Only auto-switch if in 'auto' mode (not manually set)
      if (savedTheme === 'auto' || !savedTheme) {
        const isDark = shouldBeDarkMode();
        const newTheme = isDark ? 'dark' : 'light';
        setTheme(newTheme);
        applyTheme(newTheme);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
