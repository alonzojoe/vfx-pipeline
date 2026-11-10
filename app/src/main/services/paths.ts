import { isAbsolute, relative, resolve } from 'node:path'

/** Resolve a path relative to the vfx root and refuse anything that escapes it. */
export function inside(root: string, rel: string): string {
  const abs = resolve(root, rel)
  const r = relative(root, abs)
  if (r.startsWith('..') || isAbsolute(r)) throw new Error(`Path outside the vfx folder: ${rel}`)
  return abs
}

/** vfx://root/<path> URL for a path relative to the vfx root (each segment encoded). */
export const vfxUrl = (rel: string): string =>
  'vfx://root/' + rel.split('/').map(encodeURIComponent).join('/')
