import { loginShell, q } from './shell'
import type { Originality } from '../../shared/types'

/**
 * Runs scripts/originality.mjs <project> --json (YouTube's repetitive / mass-produced content rules) in the user's
 * login shell — the same node the pipeline uses. Exit 1 only means "a rule fails"; the JSON is still printed.
 */
export function checkOriginality(root: string, project: string): Promise<Originality | null> {
  return new Promise((resolve) => {
    const p = loginShell(`node scripts/originality.mjs ${q(project)} --json`, { cwd: root })
    let out = ''
    p.stdout?.on('data', (b: Buffer) => (out += b.toString()))
    p.on('error', () => resolve(null))
    p.on('close', () => {
      try {
        resolve(JSON.parse(out) as Originality)
      } catch {
        resolve(null) // no script yet, or not a two-comparison reel
      }
    })
  })
}
