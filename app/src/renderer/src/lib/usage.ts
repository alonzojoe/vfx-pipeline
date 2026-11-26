import type { ClaudeUsage, ElevenUsage, UsageWindow } from '../../../shared/types'

export type Tone = 'ok' | 'low' | 'out'
/** A meter the title bar draws: what's LEFT (0–100) and the words for its tooltip. */
export type Meter = { leftPct: number | null; tone: Tone; lines: string[] }

/** Green while plenty is left, amber under 25%, red under 10%. */
export const toneOf = (leftPct: number): Tone => (leftPct < 10 ? 'out' : leftPct < 25 ? 'low' : 'ok')

/** A 30–40 s reel's script is ~470–610 characters (1 credit each on multilingual v2). */
const REEL_CHARS = 600

const n = (v: number): string => Math.round(v).toLocaleString('en-US')

/** "resets in 40 min" / "resets in 3 h 10 min" soon, "resets Mon 9:00 AM" this week, "resets Dec 3" later. */
export function resetText(unix: number | null, now = Date.now()): string {
  if (!unix) return ''
  const d = new Date(unix * 1000)
  const mins = Math.max(1, Math.round((d.getTime() - now) / 60_000))
  if (mins < 60) return `resets in ${mins} min`
  if (mins < 12 * 60) return `resets in ${Math.floor(mins / 60)} h${mins % 60 ? ` ${mins % 60} min` : ''}`
  if (mins < 6 * 24 * 60)
    return `resets ${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  return `resets ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

export function elevenMeter(u: ElevenUsage | null, now = Date.now()): Meter {
  if (!u) return { leftPct: null, tone: 'ok', lines: ['ElevenLabs credits', 'No reading yet'] }
  if (!u.ok) return { leftPct: null, tone: 'ok', lines: ['ElevenLabs credits', u.reason] }
  const left = Math.max(0, u.limit - u.used)
  const leftPct = (left / u.limit) * 100
  return {
    leftPct,
    tone: toneOf(leftPct),
    lines: [
      `ElevenLabs credits${u.tier ? ` · ${u.tier.replace(/_/g, ' ')} plan` : ''}`,
      `${n(left)} of ${n(u.limit)} left (${Math.round(leftPct)}%)`,
      [resetText(u.resetsAt, now), `≈ ${Math.floor(left / REEL_CHARS)} reels of voice`].filter(Boolean).join(' · ')
    ]
  }
}

const windowLine = (label: string, w: UsageWindow | null, now: number): string | null =>
  w ? `${label}: ${Math.round(100 - w.usedPct)}% left${w.resetsAt ? ` · ${resetText(w.resetsAt, now)}` : ''}` : null

/** The bar shows whichever window is closer to running out (that's the one that stops a chat). */
export function claudeMeter(u: ClaudeUsage | null, now = Date.now()): Meter {
  const head = 'Claude plan limits'
  if (!u || (!u.session && !u.week)) return { leftPct: null, tone: 'ok', lines: [head, 'No reading yet — needs a Claude Pro/Max login'] }
  const tight = Math.max(u.session?.usedPct ?? 0, u.week?.usedPct ?? 0)
  const leftPct = 100 - tight
  return {
    leftPct,
    tone: toneOf(leftPct),
    lines: [head, windowLine('5-hour session', u.session, now), windowLine('This week', u.week, now)].filter((l): l is string => !!l)
  }
}
