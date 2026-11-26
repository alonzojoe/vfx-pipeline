import { app } from 'electron'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import type { Usage } from '../../shared/types'
import { loginShell } from './shell'
import { claudeFromEvent, elevenUsage, fresh, type RateLimitEvent } from './usage'

/** Last readings, kept in userData/usage.json so the bars show something the moment the app opens. */
const file = (): string => join(app.getPath('userData'), 'usage.json')
let state: Usage | null = null
const listeners = new Set<(u: Usage) => void>()

function load(): Usage {
  if (state) return state
  try {
    state = JSON.parse(readFileSync(file(), 'utf8')) as Usage
  } catch {
    state = { eleven: null, claude: null }
  }
  return state
}

/** Current usage, with windows past their reset shown as fresh. */
export function getUsage(): Usage {
  const u = load()
  const c = u.claude
  return { eleven: u.eleven, claude: c && { ...c, session: fresh(c.session), week: fresh(c.week) } }
}

function save(patch: Partial<Usage>): Usage {
  state = { ...load(), ...patch }
  try {
    mkdirSync(dirname(file()), { recursive: true })
    writeFileSync(file(), JSON.stringify(state, null, 2))
  } catch {
    // not fatal: the bars still update for this session
  }
  const u = getUsage()
  listeners.forEach((fn) => fn(u))
  return u
}

export const onUsage = (fn: (u: Usage) => void): (() => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Ask ElevenLabs for this cycle's credits (no credits are spent). */
export async function refreshEleven(root: string): Promise<Usage> {
  return save({ eleven: await elevenUsage(root) })
}

/** Feed every stream-json line of a Claude Code run through here: rate_limit_event lines update the Claude bar. */
export function noteClaudeLine(m: { type?: string }): void {
  if (m.type !== 'rate_limit_event') return
  const c = claudeFromEvent(m as RateLimitEvent, load().claude)
  if (c) save({ claude: c })
}

let pinging: Promise<Usage> | null = null
/**
 * Fresh Claude limits without waiting for a chat: one tiny Haiku turn ("ok") with no tools, no project files and no
 * saved session — about two seconds, a sliver of the 5-hour window. Claude Code prints the plan's rate_limit_event.
 */
export function pingClaude(): Promise<Usage> {
  if (pinging) return pinging
  pinging = new Promise<Usage>((resolve) => {
    const p = loginShell(
      "claude -p ok --model haiku --tools '' --no-session-persistence --disable-slash-commands --strict-mcp-config --setting-sources '' --output-format stream-json --verbose",
      { cwd: tmpdir() }
    )
    let buf = ''
    p.stdout?.on('data', (b: Buffer) => {
      buf += b.toString()
      let i: number
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i)
        buf = buf.slice(i + 1)
        try {
          noteClaudeLine(JSON.parse(line) as { type?: string })
        } catch {
          // not JSON
        }
      }
    })
    const done = (): void => {
      pinging = null
      resolve(getUsage())
    }
    const t = setTimeout(() => p.kill('SIGTERM'), 30_000)
    p.on('exit', () => (clearTimeout(t), done()))
    p.on('error', () => (clearTimeout(t), done()))
  })
  return pinging
}
