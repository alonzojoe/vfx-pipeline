import type { Clip, TrackKind } from '../../shared/types'

const attrsOf = (tag: string): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const m of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) out[m[1]] = m[2]
  return out
}
const unescape = (s: string): string =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
const fileName = (src: string): string => decodeURIComponent(src.split('/').pop() ?? src).replace(/\.\w+$/, '')
const title = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

export type ParsedComposition = { duration: number; clips: Clip[]; background: string | null }

/** Read the clips of a generated HyperFrames index.html (build.mjs output) into timeline tracks. */
export function parseComposition(html: string): ParsedComposition {
  let duration = 0
  let background: string | null = null
  const clips: Clip[] = []
  const tagRe = /<(div|img|svg|audio|video)\b([^>]*)>/g
  for (const m of html.matchAll(tagRe)) {
    const a = attrsOf(m[2])
    if (a['data-composition-id']) {
      duration = Number(a['data-duration']) || 0
      continue
    }
    const id = a.id
    if (!id || a['data-start'] === undefined) continue
    const start = Number(a['data-start'])
    const dur = Number(a['data-duration'] ?? 0)
    const base = { id, start, duration: dur }
    const push = (track: TrackKind, label: string, extra: Partial<Clip> = {}): void => {
      clips.push({ ...base, track, label, ...extra })
    }
    let k: RegExpExecArray | null
    if (id === 'channel-badge') continue
    if (id === 'bg-paper') {
      background = decodeURIComponent((a.src ?? '').split('/').pop() ?? '') || null
      push('background', background ?? 'background', { src: decodeURIComponent(a.src ?? '') })
    } else if (id.startsWith('cap-')) {
      const end = html.indexOf('<', (m.index ?? 0) + m[0].length)
      push('captions', unescape(html.slice((m.index ?? 0) + m[0].length, end)).trim())
    } else if ((k = /^card-(.+)$/.exec(id))) {
      push('cards', title(k[1]))
    } else if ((k = /^recap-(\d+)$/.exec(id))) {
      push('cards', `Recap ${k[1]}`)
    } else if ((k = /^react-(\d+)$/.exec(id))) {
      push('avatar', fileName(a.src ?? ''), { src: decodeURIComponent(a.src ?? ''), line: Number(k[1]) - 1 })
    } else if (id.startsWith('arrow-')) {
      push('fx', '↗ arrow')
    } else if (/^q-/.test(id)) {
      push('fx', '?')
    } else if (id.startsWith('spark-')) {
      push('fx', '✦')
    } else if (id.startsWith('voice-')) {
      push('voice', 'voice', {
        src: decodeURIComponent(a.src ?? ''),
        mediaStart: Number(a['data-media-start'] ?? 0),
        volume: Number(a['data-volume'] ?? 1)
      })
    } else if ((k = /^sfx-\d+-(.+?)(-l\d+)?$/.exec(id))) {
      push('sfx', k[2] ? `${k[1]} layer` : k[1], {
        src: decodeURIComponent(a.src ?? ''),
        mediaStart: Number(a['data-media-start'] ?? 0),
        volume: Number(a['data-volume'] ?? 1)
      })
    } else if (id.startsWith('media-')) {
      const src = decodeURIComponent(a.src ?? '')
      push('media', fileName(src), {
        src,
        added: true,
        mediaStart: Number(a['data-media-start'] ?? 0),
        volume: a['data-volume'] ? Number(a['data-volume']) : undefined
      })
    } else {
      push('fx', id)
    }
  }
  // captions → the line they belong to = the last avatar change at or before them
  const reacts = clips.filter((c) => c.track === 'avatar').sort((x, y) => x.start - y.start)
  for (const c of clips) {
    if (c.track !== 'captions') continue
    const r = [...reacts].reverse().find((x) => x.start <= c.start + 1e-3)
    if (r) c.line = r.line
  }
  if (!duration) duration = clips.reduce((t, c) => Math.max(t, c.start + c.duration), 0)
  return { duration, clips, background }
}
