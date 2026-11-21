/** render.sh prints "progress: 45% Rendering frames" (scripts/render-progress.mjs) — the bar reads the last one */
const PROGRESS = /^progress: (\d+)% (.+)$/gm

/** The latest progress line, and the log without the progress lines (the bar already shows them). */
export function readLog(log: string): { pct: number | null; stage: string; text: string } {
  let pct: number | null = null
  let stage = ''
  for (const m of log.matchAll(PROGRESS)) {
    pct = Number(m[1])
    stage = m[2]
  }
  return { pct, stage, text: log.replace(PROGRESS, '').replace(/\n{2,}/g, '\n').trim() }
}
