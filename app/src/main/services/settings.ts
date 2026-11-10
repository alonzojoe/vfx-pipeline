import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

type Settings = { root?: string }

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

export function setRoot(dir: string): boolean {
  if (!isVfxRoot(dir)) return false
  mkdirSync(dirname(file()), { recursive: true })
  writeFileSync(file(), JSON.stringify({ ...read(), root: dir }, null, 2))
  return true
}
