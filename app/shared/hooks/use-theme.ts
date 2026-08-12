import { useCallback, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'devspace-theme'

function getInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  localStorage.setItem(STORAGE_KEY, theme)
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  // Persist only on an explicit choice. Writing on mount would pin a theme that
  // was merely inferred from prefers-color-scheme, making later OS changes moot.
  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    applyTheme(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      return next
    })
  }, [])

  return { theme, setTheme, toggleTheme }
}
