import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import type { AddedClip, Overrides } from '../../shared/types'
import { inside, servable } from './paths'

const empty = (): Overrides => ({ moves: {}, added: [] })
const r3 = (n: number): number => Math.round(n * 1000) / 1000
const ID = /^[a-z][\w-]{0,63}$/i
const KINDS: AddedClip['kind'][] = ['image', 'video', 'audio']
const num = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max

/** Only well-formed values reach overrides.json — build.mjs pastes them into the reel's HTML and GSAP code. */
export function cleanOverrides(o: Overrides): Overrides {
  const moves = Object.fromEntries(
    Object.entries(o?.moves ?? {})
      .filter(([k, v]) => ID.test(k) && num(v, -600, 600) && Math.abs(v) > 0.001)
      .map(([k, v]) => [k, r3(v)])
  )
  const added = (Array.isArray(o?.added) ? o.added : []).flatMap((a): AddedClip[] => {
    if (!a || !ID.test(a.id) || !KINDS.includes(a.kind) || typeof a.src !== 'string' || !servable(a.src)) return []
    if (!num(a.start, 0, 3600) || !num(a.duration, 0.05, 3600)) return []
    const c: AddedClip = { id: a.id, kind: a.kind, src: a.src, start: r3(a.start), duration: r3(a.duration) }
    if (num(a.volume, 0, 4)) c.volume = a.volume
    for (const k of ['x', 'y', 'w', 'h'] as const) if (num(a[k], -4000, 4000)) c[k] = Math.round(a[k] as number)
    return [c]
  })
  return { moves, added }
}

export function readOverrides(root: string, project: string): Overrides {
  const file = inside(root, `hyperframes/${project}/overrides.json`)
  if (!existsSync(file)) return empty()
  try {
    return cleanOverrides(JSON.parse(readFileSync(file, 'utf8')))
  } catch {
    return empty()
  }
}

export function writeOverrides(root: string, project: string, o: Overrides): void {
  writeFileSync(inside(root, `hyperframes/${project}/overrides.json`), JSON.stringify(cleanOverrides(o), null, 2) + '\n')
}
