import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import type { Overrides } from '../../shared/types'
import { inside } from './paths'

const empty = (): Overrides => ({ moves: {}, added: [] })

export function readOverrides(root: string, project: string): Overrides {
  const file = inside(root, `hyperframes/${project}/overrides.json`)
  if (!existsSync(file)) return empty()
  try {
    return { ...empty(), ...JSON.parse(readFileSync(file, 'utf8')) }
  } catch {
    return empty()
  }
}

export function writeOverrides(root: string, project: string, o: Overrides): void {
  const clean: Overrides = {
    moves: Object.fromEntries(Object.entries(o.moves).filter(([, v]) => Math.abs(v) > 0.001).map(([k, v]) => [k, Math.round(v * 1000) / 1000])),
    added: o.added
  }
  writeFileSync(inside(root, `hyperframes/${project}/overrides.json`), JSON.stringify(clean, null, 2) + '\n')
}
