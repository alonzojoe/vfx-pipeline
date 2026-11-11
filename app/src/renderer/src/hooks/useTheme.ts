import { useCallback, useEffect, useState } from 'react'
import type { ThemeSource, ThemeState } from '../../../shared/types'

/**
 * The saved appearance (System / Light / Dark). The main process applies it with nativeTheme before the window opens
 * and saves it in settings.json; CSS follows via prefers-color-scheme, so this hook only drives the switch.
 */
export function useTheme() {
  const [theme, setState] = useState<ThemeState | null>(null)
  useEffect(() => {
    window.api.getTheme().then(setState)
    return window.api.onThemeChanged(setState)
  }, [])
  const setTheme = useCallback((source: ThemeSource) => {
    window.api.setTheme(source).then(setState)
  }, [])
  return { theme, setTheme }
}
