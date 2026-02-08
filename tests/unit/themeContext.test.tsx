import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

// Mock localStorage
const mockStorage = vi.hoisted(() => {
  const store: Record<string, string> = {};
  return {
    store,
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
    length: 0,
    key: vi.fn(() => null),
  };
});

vi.stubGlobal('localStorage', mockStorage);

// Mock window.matchMedia
const mockMatchMedia = vi.hoisted(() =>
  vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
);

vi.stubGlobal('matchMedia', mockMatchMedia);

// Track classList operations
const classListOps = vi.hoisted(() => ({
  add: vi.fn(),
  remove: vi.fn(),
  contains: vi.fn(() => false),
}));

// Ensure document.documentElement.classList is mocked
beforeEach(() => {
  // jsdom provides document.documentElement, but we need to spy on classList
  if (document.documentElement) {
    vi.spyOn(document.documentElement.classList, 'add').mockImplementation(classListOps.add);
    vi.spyOn(document.documentElement.classList, 'remove').mockImplementation(classListOps.remove);
  }
});

import { ThemeProvider, useTheme } from '@/context/ThemeContext';

// Test consumer component
function ThemeConsumer() {
  const { theme, setTheme, isDark } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="is-dark">{String(isDark)}</span>
      <button onClick={() => setTheme('dark')} data-testid="set-dark">
        Dark
      </button>
      <button onClick={() => setTheme('light')} data-testid="set-light">
        Light
      </button>
      <button onClick={() => setTheme('system')} data-testid="set-system">
        System
      </button>
    </div>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.clearAllMocks();
    classListOps.add.mockClear();
    classListOps.remove.mockClear();
  });

  describe('ThemeProvider', () => {
    it('renders children correctly', () => {
      render(
        <ThemeProvider>
          <div data-testid="child">Hello</div>
        </ThemeProvider>,
      );

      expect(screen.getByTestId('child')).toHaveTextContent('Hello');
    });

    it('defaults to light theme when nothing is stored', () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      expect(screen.getByTestId('theme')).toHaveTextContent('light');
      expect(screen.getByTestId('is-dark')).toHaveTextContent('false');
    });

    it('restores theme from localStorage on mount', () => {
      mockStorage.store['theme_preference'] = 'dark';

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('is-dark')).toHaveTextContent('true');
    });

    it('ignores invalid stored values and defaults to light', () => {
      mockStorage.store['theme_preference'] = 'invalid-value';

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      expect(screen.getByTestId('theme')).toHaveTextContent('light');
    });
  });

  describe('localStorage persistence', () => {
    it('saves theme preference to localStorage when changed', () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      act(() => {
        screen.getByTestId('set-dark').click();
      });

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'theme_preference',
        'dark',
      );
    });

    it('persists each theme change', () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      act(() => {
        screen.getByTestId('set-dark').click();
      });
      expect(mockStorage.store['theme_preference']).toBe('dark');

      act(() => {
        screen.getByTestId('set-light').click();
      });
      expect(mockStorage.store['theme_preference']).toBe('light');

      act(() => {
        screen.getByTestId('set-system').click();
      });
      expect(mockStorage.store['theme_preference']).toBe('system');
    });
  });

  describe('dark class on document.documentElement', () => {
    it('adds dark class when dark theme is set', () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      act(() => {
        screen.getByTestId('set-dark').click();
      });

      expect(classListOps.add).toHaveBeenCalledWith('dark');
    });

    it('removes dark class when light theme is set', () => {
      mockStorage.store['theme_preference'] = 'dark';

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      act(() => {
        screen.getByTestId('set-light').click();
      });

      expect(classListOps.remove).toHaveBeenCalledWith('dark');
    });
  });

  describe('cycle through light/dark/system', () => {
    it('cycles through all three modes correctly', () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      // Default: light
      expect(screen.getByTestId('theme')).toHaveTextContent('light');
      expect(screen.getByTestId('is-dark')).toHaveTextContent('false');

      // Switch to dark
      act(() => {
        screen.getByTestId('set-dark').click();
      });
      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('is-dark')).toHaveTextContent('true');

      // Switch to system
      act(() => {
        screen.getByTestId('set-system').click();
      });
      expect(screen.getByTestId('theme')).toHaveTextContent('system');

      // Switch back to light
      act(() => {
        screen.getByTestId('set-light').click();
      });
      expect(screen.getByTestId('theme')).toHaveTextContent('light');
      expect(screen.getByTestId('is-dark')).toHaveTextContent('false');
    });
  });

  describe('useTheme outside provider', () => {
    it('throws error when used outside ThemeProvider', () => {
      // Suppress console.error for expected error
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<ThemeConsumer />);
      }).toThrow('useTheme must be used within a ThemeProvider');

      spy.mockRestore();
    });
  });
});
