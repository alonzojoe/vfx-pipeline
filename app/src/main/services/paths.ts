import { isAbsolute, relative, resolve } from 'node:path'

/** Resolve a path relative to the vfx root and refuse anything that escapes it. */
export function inside(root: string, rel: string): string {
  const abs = resolve(root, rel)
  const r = relative(root, abs)
  if (r.startsWith('..') || isAbsolute(r)) throw new Error(`Path outside the vfx folder: ${rel}`)
  return abs
}

/** A project folder name (slug): letters, digits, - and _ — never dots or slashes. Throws otherwise. */
export function projectName(name: unknown): string {
  if (typeof name !== 'string' || !/^[a-z0-9][\w-]{0,79}$/i.test(name)) throw new Error(`Bad project name: ${String(name)}`)
  return name
}

/** Folders the app may read through vfx:// — never .env, .git, .claude, scripts or the app itself. */
const SERVED = new Set(['hyperframes', 'input', 'output'])

/** True when a root-relative path is one the preview may load: a served top folder and no hidden segment. */
export function servable(rel: string): boolean {
  const parts = rel.split(/[\\/]+/).filter(Boolean)
  return parts.length > 1 && SERVED.has(parts[0]) && !parts.some((p) => p.startsWith('.'))
}

/** vfx://root/<path> URL for a path relative to the vfx root (each segment encoded). */
export const vfxUrl = (rel: string): string =>
  'vfx://root/' + rel.split('/').map(encodeURIComponent).join('/')
