import { useEffect, useState } from 'react'
import { MousePointerClick, Trash2 } from 'lucide-react'
import type { AddedClip, Clip, MediaLibrary, ProjectDetail } from '../../../../shared/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { fmt } from '@/lib/time'
import { vfxUrlOf } from '@/lib/vfx'
import { cn } from '@/lib/utils'

type Props = {
  project: ProjectDetail | null
  media: MediaLibrary | null
  clip: Clip | null
  onMove: (clip: Clip, start: number) => void
  onUpdate: (clip: Clip, changes: Partial<AddedClip>) => void
  onDelete: (clip: Clip) => void
  onReaction: (line: number, sticker: string) => void
}

const TRACK_NAME: Record<Clip['track'], string> = {
  captions: 'Caption', cards: 'Card', avatar: 'Avatar', fx: 'Effect', media: 'Media', voice: 'Voice', sfx: 'Sound effect', background: 'Background'
}
const FIXED = new Set<Clip['track']>(['voice', 'background'])

function Num({ label, value, step = 0.01, disabled, onCommit }: { label: string; value: number; step?: number; disabled?: boolean; onCommit: (v: number) => void }): JSX.Element {
  const [v, setV] = useState(String(value))
  useEffect(() => setV(String(Math.round(value * 1000) / 1000)), [value])
  const commit = (): void => {
    const n = Number(v)
    if (Number.isFinite(n) && n !== value) onCommit(n)
  }
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <Input
        type="number"
        step={step}
        value={v}
        disabled={disabled}
        onChange={(e) => setV(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        className="tabular font-mono"
      />
    </label>
  )
}

export function Inspector({ project, media, clip, onMove, onUpdate, onDelete, onReaction }: Props): JSX.Element {
  if (!project) return <p className="p-4 text-muted-foreground">No project open.</p>
  if (!clip) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MousePointerClick className="h-4 w-4" />
          Select a clip on the timeline to edit it.
        </div>
        <dl className="grid grid-cols-[90px_1fr] gap-y-2 text-sm">
          <dt className="text-muted-foreground">Reel</dt>
          <dd>{project.title}</dd>
          <dt className="text-muted-foreground">Length</dt>
          <dd className="tabular font-mono">{fmt(project.duration)}</dd>
          <dt className="text-muted-foreground">Lines</dt>
          <dd>{project.lines.length}</dd>
          <dt className="text-muted-foreground">Background</dt>
          <dd>{project.background ?? '—'}</dd>
          <dt className="text-muted-foreground">CTA</dt>
          <dd>{project.cta ?? '—'}</dd>
        </dl>
      </div>
    )
  }
  const line = clip.line != null ? project.lines[clip.line] : null
  const isImage = clip.src && /\.(png|jpe?g|webp|gif|svg)$/i.test(clip.src)
  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          {isImage ? (
            <img src={vfxUrlOf(clip.src!)} alt="" className="h-[52px] w-[52px] rounded-lg bg-surface-2 object-contain" />
          ) : (
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-lg bg-surface-2 text-xs text-muted-foreground">
              {TRACK_NAME[clip.track]}
            </span>
          )}
          <div className="min-w-0">
            <div className="truncate font-semibold">
              {TRACK_NAME[clip.track]} · {clip.label || clip.id}
            </div>
            {line && <div className="truncate text-xs text-muted-foreground">Line {clip.line! + 1} · “{line.text}”</div>}
            <div className="font-mono text-xs text-foreground0">{clip.id}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Num label="Start (s)" value={clip.start} disabled={FIXED.has(clip.track)} onCommit={(v) => onMove(clip, Math.max(0, v))} />
          <Num
            label="Duration (s)"
            value={clip.duration}
            disabled={!clip.added}
            onCommit={(v) => onUpdate(clip, { duration: Math.max(0.1, v) })}
          />
        </div>

        {clip.added && clip.track === 'media' && !/\.(mp3|wav|m4a|aac)$/i.test(clip.src ?? '') && (
          <div className="grid grid-cols-2 gap-2.5">
            <p className="col-span-2 text-xs text-muted-foreground">Position on the 1080 × 1920 frame (px)</p>
            <AddedBox clip={clip} onUpdate={onUpdate} />
          </div>
        )}

        {clip.added && /\.(mp3|wav|m4a|aac)$/i.test(clip.src ?? '') && (
          <label className="flex flex-col gap-2 text-xs text-muted-foreground">
            Volume {Math.round((clip.volume ?? 0.8) * 100)}%
            <Slider min={0} max={1} step={0.01} value={[clip.volume ?? 0.8]} onValueCommit={([v]) => onUpdate(clip, { volume: v })} />
          </label>
        )}

        {clip.track === 'avatar' && clip.line != null && media && (
          <div className="flex flex-col gap-2">
            <div className="text-xs text-muted-foreground">Reaction for this line</div>
            <div className="grid grid-cols-4 gap-1.5">
              {media.stickers.map((s) => {
                const name = s.name.replace(/\.png$/, '')
                return (
                  <button
                    key={s.path}
                    title={name}
                    aria-label={`Use ${name}`}
                    onClick={() => onReaction(clip.line!, name)}
                    className={cn(
                      'rounded-md border border-transparent bg-surface-2 p-1 hover:border-primary/60',
                      name === clip.label && 'border-primary'
                    )}
                  >
                    <img src={s.url} alt="" loading="lazy" className="h-12 w-full object-contain" />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {clip.track === 'captions' && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            To change the words, ask in Chat — the voice has to be regenerated for new text.
          </p>
        )}

        {clip.added && (
          <Button variant="outline" onClick={() => onDelete(clip)} className="text-red-300 hover:text-red-200">
            <Trash2 />
            Remove from reel
          </Button>
        )}
      </div>
    </ScrollArea>
  )
}

function AddedBox({ clip, onUpdate }: { clip: Clip; onUpdate: Props['onUpdate'] }): JSX.Element {
  const [box, setBox] = useState(clip.box ?? { x: 140, y: 520, w: 800, h: 800 })
  useEffect(() => setBox(clip.box ?? { x: 140, y: 520, w: 800, h: 800 }), [clip.id, clip.box])
  const set = (k: keyof typeof box) => (v: number) => {
    const next = { ...box, [k]: v }
    setBox(next)
    onUpdate(clip, next)
  }
  return (
    <>
      <Num label="X" step={10} value={box.x} onCommit={set('x')} />
      <Num label="Y" step={10} value={box.y} onCommit={set('y')} />
      <Num label="Width" step={10} value={box.w} onCommit={set('w')} />
      <Num label="Height" step={10} value={box.h} onCommit={set('h')} />
    </>
  )
}
