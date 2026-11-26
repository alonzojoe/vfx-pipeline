import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ElevenUsage } from '../../shared/types'

/**
 * The ElevenLabs key from the vfx folder's .env (the same file scripts/voice.sh uses). Main process only: it is
 * used for one HTTPS request and never logged, returned over IPC or written anywhere.
 */
export function elevenKey(root: string): string | null {
  let text = ''
  try {
    text = readFileSync(join(root, '.env'), 'utf8')
  } catch {
    return process.env.ELEVENLABS_API_KEY || null
  }
  return envValue(text, 'ELEVENLABS_API_KEY') || process.env.ELEVENLABS_API_KEY || null
}

/** KEY=value from a .env file (`export`, quotes and trailing comments allowed). */
export function envValue(text: string, key: string): string | null {
  for (const raw of text.split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][\w]*)\s*=\s*(.*)$/.exec(raw)
    if (!m || m[1] !== key) continue
    let v = m[2].trim()
    const quoted = /^(['"])(.*)\1/.exec(v)
    v = quoted ? quoted[2] : v.replace(/\s+#.*$/, '')
    return v || null
  }
  return null
}

/** The part of GET /v1/user/subscription the app reads. */
type Subscription = { character_count?: number; character_limit?: number; next_character_count_reset_unix?: number; tier?: string }

export function elevenFromSubscription(s: Subscription, at = Date.now()): ElevenUsage {
  if (typeof s.character_count !== 'number' || typeof s.character_limit !== 'number' || s.character_limit <= 0)
    return { ok: false, reason: 'ElevenLabs sent no credit numbers', at }
  return {
    ok: true,
    used: s.character_count,
    limit: s.character_limit,
    resetsAt: typeof s.next_character_count_reset_unix === 'number' ? s.next_character_count_reset_unix : null,
    tier: s.tier ?? '',
    at
  }
}

/** Credits used / left this cycle, straight from ElevenLabs (free: no credits are spent reading them). */
export async function elevenUsage(root: string): Promise<ElevenUsage> {
  const at = Date.now()
  const key = elevenKey(root)
  if (!key) return { ok: false, reason: 'No ELEVENLABS_API_KEY in .env', at }
  try {
    const r = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: { 'xi-api-key': key },
      signal: AbortSignal.timeout(10_000)
    })
    if (r.status === 401) return { ok: false, reason: 'The key can’t read usage — give it “User: Read” access on elevenlabs.io', at }
    if (!r.ok) return { ok: false, reason: `ElevenLabs answered ${r.status}`, at }
    return elevenFromSubscription((await r.json()) as Subscription, at)
  } catch {
    return { ok: false, reason: 'Offline — couldn’t reach ElevenLabs', at }
  }
}
