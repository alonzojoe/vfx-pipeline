import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { VoiceFx } from '../../shared/types'

/** The voice enhancer presets scripts/voice-fx.mjs knows (keep in sync with PRESETS there). */
export const VOICE_FX: VoiceFx[] = ['warm', 'clear', 'off']
const DEFAULT: VoiceFx = 'warm'
const brandFile = (root: string): string => join(root, 'input/general/brand/brand.json')

/** The channel's voice preset (brand.json "voiceFx") — the same file the CLI pipeline reads, so both agree. */
export function getVoiceFx(root: string): VoiceFx {
  try {
    const v = (JSON.parse(readFileSync(brandFile(root), 'utf8')) as { voiceFx?: string }).voiceFx
    return VOICE_FX.includes(v as VoiceFx) ? (v as VoiceFx) : DEFAULT
  } catch {
    return DEFAULT
  }
}

/** Saves the preset into brand.json, editing only that one line so the rest of the file stays as written. */
export function setVoiceFx(root: string, fx: VoiceFx): VoiceFx {
  const f = brandFile(root)
  if (!VOICE_FX.includes(fx) || !existsSync(f)) return getVoiceFx(root)
  const text = readFileSync(f, 'utf8')
  const next = /"voiceFx"\s*:\s*"[^"]*"/.test(text)
    ? text.replace(/"voiceFx"\s*:\s*"[^"]*"/, `"voiceFx": "${fx}"`)
    : text.replace(/\{\s*\n/, (m) => `${m} "voiceFx": "${fx}",\n`)
  JSON.parse(next) // never write a broken brand.json
  writeFileSync(f, next)
  return getVoiceFx(root)
}
