import { app } from 'electron'
import type { ThemeSource } from '../../shared/types'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

type Settings = { root?: string; theme?: ThemeSource }

const file = (): string => join(app.getPath('userData'), 'settings.json')

function read(): Settings {
  try {
    return JSON.parse(readFileSync(file(), 'utf8'))
  } catch {
    return {}
  }
}

export const isVfxRoot = (dir: string): boolean => existsSync(join(dir, 'hyperframes')) && existsSync(join(dir, 'scripts'))

/** The vfx workspace: saved choice → the repo this app lives in (dev) → ~/Desktop/vfx. */
export function getRoot(): string | null {
  const saved = read().root
  const candidates = [saved, resolve(app.getAppPath(), '..'), join(homedir(), 'Desktop', 'vfx')]
  return candidates.find((c): c is string => !!c && isVfxRoot(c)) ?? null
}

function write(patch: Settings): void {
  mkdirSync(dirname(file()), { recursive: true })
  writeFileSync(file(), JSON.stringify({ ...read(), ...patch }, null, 2))
}

export function setRoot(dir: string): boolean {
  if (!isVfxRoot(dir)) return false
  write({ root: dir })
  return true
}

const THEMES: ThemeSource[] = ['system', 'light', 'dark']

/** Saved appearance (default: follow macOS). */
export const getTheme = (): ThemeSource => {
  const t = read().theme
  return t && THEMES.includes(t) ? t : 'system'
}

export function setTheme(theme: ThemeSource): void {
  if (THEMES.includes(theme)) write({ theme })
}
