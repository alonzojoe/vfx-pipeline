import { useEffect, useMemo, useRef, useState } from 'react'
import { Magnet, Minus, Plus, Trash2 } from 'lucide-react'
import { TRACK_ORDER, type Clip, type MediaItem, type ProjectDetail, type TrackKind } from '../../../../shared/types'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Waveform } from './Waveform'
import { clamp, MEDIA_MIME } from '@/lib/time'
import { vfxUrlOf } from '@/lib/vfx'
import { cn } from '@/lib/utils'

const TRACK: Record<TrackKind, { name: string; h: number; bg: string; dot: string }> = {
  captions: { name: 'Captions', h: 32, bg: 'bg-track-captions', dot: '#a1a1aa' },
  cards: { name: 'Cards', h: 32, bg: 'bg-track-cards', dot: '#2f6bff' },
  avatar: { name: 'Avatar', h: 44, bg: 'bg-track-avatar', dot: '#ff4d2e' },
  fx: { name: 'FX', h: 28, bg: 'bg-track-fx', dot: '#f59e0b' },
  media: { name: 'Media', h: 40, bg: 'bg-track-media', dot: '#22d3ee' },
  voice: { name: 'Voice', h: 40, bg: 'bg-track-voice', dot: '#16a34a' },
  sfx: { name: 'SFX', h: 28, bg: 'bg-track-sfx', dot: '#8b5cf6' },
  background: { name: 'Background', h: 28, bg: 'bg-track-bg', dot: '#71717a' }
}
const MOVABLE = new Set<TrackKind>(['captions', 'cards', 'avatar', 'fx', 'media', 'sfx'])
const MAX_ROWS: Record<TrackKind, number> = { captions: 1, cards: 2, avatar: 1, fx: 2, media: 3, voice: 1, sfx: 2, background: 1 }
const HEADER = 160
const RULER = 24

type Props = {
  project: ProjectDetail | null
  time: number
  playing: boolean
  selectedId: string | null
  onSeek: (t: number) => void
  onSelect: (id: string | null) => void
  /** move a clip to a new start time (saved to overrides.json) */
  onMove?: (clip: Clip, start: number) => void
  /** media dragged from the bin and dropped at time t */
  onDropMedia?: (item: MediaItem, t: number) => void
  onDelete?: (clip: Clip) => void
}

export function Timeline({ project, time, playing, selectedId, onSeek, onSelect, onMove, onDropMedia, onDelete }: Props): JSX.Element {
  const [pps, setPps] = useState(48) // pixels per second
  const [snap, setSnap] = useState(true)
  const [drag, setDrag] = useState<{ id: string; dx: number } | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const duration = project?.duration ?? 0
  const width = Math.max(600, duration * pps + 80)

  const tracks = useMemo(() => {
    const by = new Map<TrackKind, Clip[]>()
    project?.clips.forEach((c) => by.set(c.track, [...(by.get(c.track) ?? []), c]))
    // overlapping clips in one track get their own sub-row (cards of a pair, layered sounds…)
    return TRACK_ORDER.filter((k) => k === 'media' || by.has(k)).map((k) => {
      const ends: number[] = []
      const clips = (by.get(k) ?? [])
        .slice()
        .sort((a, b) => a.start - b.start)
        .map((c) => {
          let row = ends.findIndex((e) => e <= c.start + 1e-3)
          if (row < 0) row = ends.push(0) - 1
          ends[row] = c.start + c.duration
          return { ...c, row }
        })
      return { kind: k, clips, rows: Math.max(1, Math.min(ends.length, MAX_ROWS[k])) }
    })
  }, [project])

  /** word starts (caption chunks) + clip starts to snap to */
  const snapPoints = useMemo(
    () => [...new Set((project?.clips ?? []).filter((c) => c.track === 'captions' || c.track === 'voice').flatMap((c) => [c.start, c.start + c.duration]))],
    [project]
  )
  const snapTo = (t: number): number => {
    if (!snap) return t
    let best = t
    let d = 8 / pps
    for (const p of snapPoints) if (Math.abs(p - t) < d) (d = Math.abs(p - t)), (best = p)
    return best
  }

  const timeAt = (clientX: number): number => {
    const el = scroller.current!
    const x = clientX - el.getBoundingClientRect().left + el.scrollLeft - HEADER
    return clamp(x / pps, 0, duration)
  }

  // keep the playhead in view while playing
  useEffect(() => {
    const el = scroller.current
    if (!el || !playing) return
    const x = HEADER + time * pps
    if (x > el.scrollLeft + el.clientWidth - 80 || x < el.scrollLeft + HEADER) el.scrollLeft = x - HEADER - 40
  }, [time, playing, pps])

  const scrub = (e: React.PointerEvent): void => {
    if (e.button !== 0) return
    onSeek(timeAt(e.clientX))
    const move = (ev: PointerEvent): void => onSeek(timeAt(ev.clientX))
    const up = (): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const startMove = (e: React.PointerEvent, c: Clip): void => {
    e.stopPropagation()
    if (e.button !== 0) return
    onSelect(c.id)
    if (!onMove || !MOVABLE.has(c.track)) return
    const x0 = e.clientX
    let dx = 0
    const move = (ev: PointerEvent): void => {
      dx = ev.clientX - x0
      setDrag({ id: c.id, dx })
    }
    const up = (): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setDrag(null)
      if (Math.abs(dx) > 2) onMove(c, Math.max(0, snapTo(c.start + dx / pps)))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const ticks = useMemo(() => {
    const step = pps >= 90 ? 0.5 : pps >= 40 ? 1 : pps >= 20 ? 2 : 5
    const out: number[] = []
    for (let s = 0; s <= duration + 0.001; s += step) out.push(Math.round(s * 100) / 100)
    return { step, out }
  }, [pps, duration])

  const selected = project?.clips.find((c) => c.id === selectedId)

  return (
    <section aria-label="Timeline" className="flex h-[300px] shrink-0 flex-col border-t bg-panel">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-[#1f1f23] px-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Delete added clip"
              disabled={!selected?.added || !onDelete}
              onClick={() => selected && onDelete?.(selected)}
            >
              <Trash2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete clip you added (⌫)</TooltipContent>
        </Tooltip>
        <span className="mx-1 h-4 w-px bg-border" />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Magnet className="h-3.5 w-3.5" />
          Snap to words
          <Switch checked={snap} onCheckedChange={setSnap} aria-label="Snap to words" />
        </label>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">Zoom</span>
        <Button variant="ghost" size="icon-sm" aria-label="Zoom out" onClick={() => setPps((p) => clamp(p / 1.25, 8, 240))}>
          <Minus />
        </Button>
        <Slider aria-label="Zoom" className="w-28" min={8} max={240} step={1} value={[pps]} onValueChange={([v]) => setPps(v)} />
        <Button variant="ghost" size="icon-sm" aria-label="Zoom in" onClick={() => setPps((p) => clamp(p * 1.25, 8, 240))}>
          <Plus />
        </Button>
      </div>

      <div ref={scroller} className="relative min-h-0 flex-1 overflow-auto">
        <div className="relative" style={{ width: width + HEADER }}>
          {/* ruler */}
          <div className="sticky top-0 z-20 flex border-b border-[#1f1f23] bg-panel" style={{ height: RULER }}>
            <div className="sticky left-0 z-10 shrink-0 border-r border-[#1f1f23] bg-panel" style={{ width: HEADER }} />
            <div className="relative cursor-col-resize" style={{ width }} onPointerDown={scrub}>
              {ticks.out.map((s) => (
                <span
                  key={s}
                  className="absolute top-0 h-full border-l border-zinc-800 pl-1 font-mono text-[11px] leading-6 text-zinc-400"
                  style={{ left: s * pps }}
                >
                  {Number.isInteger(s) ? `${s}s` : ''}
                </span>
              ))}
            </div>
          </div>

          {/* tracks */}
          {tracks.map(({ kind, clips, rows }) => {
            const T = TRACK[kind]
            const rowH = rows > 1 ? Math.max(22, T.h - 6) : T.h
            return (
              <div key={kind} className="flex border-t border-[#1a1a1d]" style={{ height: rowH * rows }}>
                <div
                  className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-[#1f1f23] bg-panel px-3 font-medium text-zinc-300"
                  style={{ width: HEADER }}
                >
                  <span className="h-2 w-2 rounded-sm" style={{ background: T.dot }} />
                  {T.name}
                </div>
                <div
                  className={cn('relative', kind === 'media' && 'bg-[repeating-linear-gradient(90deg,transparent,transparent_23px,#16161a_23px,#16161a_24px)]')}
                  style={{ width }}
                  onPointerDown={scrub}
                  onDragOver={(e) => {
                    if (onDropMedia && e.dataTransfer.types.includes(MEDIA_MIME)) e.preventDefault()
                  }}
                  onDrop={(e) => {
                    const raw = e.dataTransfer.getData(MEDIA_MIME)
                    if (!raw || !onDropMedia) return
                    e.preventDefault()
                    onDropMedia(JSON.parse(raw) as MediaItem, snapTo(timeAt(e.clientX)))
                  }}
                >
                  {clips.map((c) => {
                    const left = c.start * pps + (drag?.id === c.id ? drag.dx : 0)
                    const w = Math.max(3, c.duration * pps)
                    return (
                      <div
                        key={c.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`${T.name}: ${c.label || c.id} at ${c.start.toFixed(2)}s`}
                        title={`${c.label || c.id} · ${c.start.toFixed(2)}s → ${(c.start + c.duration).toFixed(2)}s`}
                        onPointerDown={(e) => startMove(e, c)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onSelect(c.id)
                          if ((e.key === 'Backspace' || e.key === 'Delete') && c.added) onDelete?.(c)
                        }}
                        className={cn(
                          'absolute flex items-center gap-1 overflow-hidden whitespace-nowrap rounded-md border px-1.5 text-xs font-medium text-zinc-50',
                          T.bg,
                          selectedId === c.id ? 'border-primary ring-1 ring-primary' : 'border-white/5 hover:border-white/25',
                          MOVABLE.has(c.track) && onMove ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                          drag?.id === c.id && 'z-10 opacity-90 shadow-lg'
                        )}
                        style={{ left, width: w, top: Math.min(c.row, rows - 1) * rowH + 4, height: rowH - 8 }}
                      >
                        {c.track === 'avatar' && c.src && w > 34 && (
                          <img src={vfxUrlOf(c.src)} alt="" draggable={false} className="h-[30px] w-[30px] shrink-0 object-contain" style={{ maxHeight: rowH - 10 }} />
                        )}
                        {c.track === 'media' && c.src && /\.(png|jpe?g|webp|gif|svg)$/i.test(c.src) && (
                          <img src={vfxUrlOf(c.src)} alt="" draggable={false} className="h-[28px] w-[28px] shrink-0 rounded object-cover" />
                        )}
                        {c.track === 'voice' && c.src ? (
                          <Waveform src={c.src} from={c.mediaStart ?? 0} duration={c.duration} width={Math.max(1, w - 6)} height={rowH - 12} />
                        ) : (
                          w > 24 && <span className="truncate">{c.label}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {project?.draft && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center text-sm text-muted-foreground" style={{ top: RULER, left: HEADER }}>
              The timeline fills in as the reel is built — captions, cards, stickers, voice, sounds
            </div>
          )}

          {/* playhead */}
          <div
            className="pointer-events-none absolute bottom-0 top-0 z-30 w-0.5 bg-primary"
            style={{ left: HEADER + time * pps - 1 }}
            aria-hidden="true"
          >
            <span className="absolute -left-[6px] top-0 h-3 w-3.5 rounded-b-md rounded-t-sm bg-primary" />
          </div>
        </div>
      </div>
    </section>
  )
}
