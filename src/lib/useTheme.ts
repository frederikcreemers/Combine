import { useCallback, useEffect, useMemo, useState } from 'preact/hooks'

export type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'combine-theme'
const DARK_THEME_COLOR = '#030712'
const LIGHT_THEME_COLOR = '#f3f4f6'

function getStoredTheme(): Theme | null {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : null
  } catch {
    return null
  }
}

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR)
}

export function useTheme() {
  const [preference, setPreference] = useState<Theme | null>(getStoredTheme)
  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme)
  const theme = useMemo(() => preference ?? systemTheme, [preference, systemTheme])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light')
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        setPreference(
          event.newValue === 'light' || event.newValue === 'dark'
            ? event.newValue
            : null,
        )
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const toggleTheme = useCallback(() => {
    setPreference((currentPreference) => {
      const currentTheme = currentPreference ?? getSystemTheme()
      const nextTheme: Theme = currentTheme === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
      } catch {}
      applyTheme(nextTheme)
      return nextTheme
    })
  }, [])

  return { theme, toggleTheme }
}
