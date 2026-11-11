import { nativeTheme } from 'electron'
import type { ThemeState } from '../../shared/types'
import { getTheme } from './settings'

/** Window background matching the theme, so nothing flashes before the UI paints. */
export const windowBackground = (): string => (nativeTheme.shouldUseDarkColors ? '#0b0b0d' : '#ffffff')

export const themeState = (): ThemeState => ({ source: getTheme(), dark: nativeTheme.shouldUseDarkColors })
