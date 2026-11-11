import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { FastForward, Pause, Play, Rewind, SkipBack, SkipForward } from 'lucide-react'
import type { ProjectDetail } from '../../../../shared/types'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { fmt } from '@/lib/time'
import { cn } from '@/lib/utils'

const W = 1080
const H = 1920

type Props = {
  project: ProjectDetail | null
  time: number
  playing: boolean
  onTime: (t: number) => void
  onToggle: () => void
}

/** The reel itself: the HyperFrames composition in an iframe, seeked frame-accurately to the playhead. */
export function Preview({ project, time, playing, onTime, onToggle }: Props): JSX.Element {
  const box = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const [scale, setScale] = useState(0.25)
  const [ready, setReady] = useState(false)
  const [safe, setSafe] = useState(true)
  const [final, setFinal] = useState(false)
  const [nonce, setNonce] = useState(0)

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      setScale(Math.max(0.05, Math.min((width - 32) / W, (height - 32) / H)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // reload the composition whenever the project is rebuilt
  useEffect(() => {
    setReady(false)
    setNonce((n) => n + 1)
  }, [project?.compositionUrl, project?.duration, project?.clips.length])

  useEffect(() => {
    const onMsg = (e: MessageEvent): void => {
      if (e.data?.type === 'vfx:ready' && e.source === frame.current?.contentWindow) setReady(true)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  useEffect(() => {
    if (ready && !final) frame.current?.contentWindow?.postMessage({ type: 'vfx:seek', t: time }, '*')
  }, [time, ready, final])

  // Final mp4 mode follows the same clock
  useEffect(() => {
    const v = video.current
    if (!final || !v) return
    if (playing && v.paused) v.play().catch(() => {})
    if (!playing && !v.paused) v.pause()
    if (Math.abs(v.currentTime - time) > (playing ? 0.25 : 0.01)) v.currentTime = time
  }, [final, playing, time])

  const w = W * scale
  const h = H * scale

  return (
    <main aria-label="Preview" className="flex min-w-0 flex-1 flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center gap-3 border-b border-subtle px-3.5 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Preview</span>
        <span>1080 × 1920 · 30 fps</span>
        <div className="flex-1" />
        {project?.finalUrl && (
          <label className="flex items-center gap-2">
            <Switch checked={final} onCheckedChange={setFinal} aria-label="Show the rendered FINAL video" />
            Rendered
          </label>
        )}
        <label className="flex items-center gap-2">
          <Switch checked={safe} onCheckedChange={setSafe} aria-label="Show safe zones" />
          Safe zones
        </label>
      </div>

      <div ref={box} className="relative flex min-h-0 flex-1 items-center justify-center">
        {project?.draft ? (
          <div
            className="flex flex-col items-center justify-center gap-5 rounded-xl border-2 border-dashed border-input p-6 text-center"
            style={{ width: w, height: h }}
          >
            <div className="text-[15px] font-semibold">Your reel appears here</div>
            <ol className="flex flex-col gap-3 text-left text-sm text-foreground">
              {['Paste your script in the chat', 'I build the cards + ElevenLabs voice', 'Tweak on the timeline, export'].map((t, i) => (
                <li key={t} className="flex items-center gap-2.5">
                  <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold', i === 0 ? 'bg-primary text-white' : 'bg-secondary')}>
                    {i + 1}
                  </span>
                  {t}
                </li>
              ))}
            </ol>
          </div>
        ) : project ? (
          <div className="relative overflow-hidden rounded-xl shadow-[0_0_0_1px_hsl(var(--border)),0_30px_60px_rgba(0,0,0,.35)]" style={{ width: w, height: h }}>
            {final && project.finalUrl ? (
              <video ref={video} src={project.finalUrl} className="h-full w-full" playsInline />
            ) : (
              <iframe
                key={nonce}
                ref={frame}
                title="Reel preview"
                src={`${project.compositionUrl}?v=${nonce}`}
                className={cn('pointer-events-none absolute left-0 top-0 origin-top-left border-0 bg-white', !ready && 'opacity-0')}
                style={{ width: W, height: H, transform: `scale(${scale})` }}
              />
            )}
            {safe && (
              <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                {/* platform UI zones from REVIEW.md: top 200px, bottom 350px, right 120px between y 1000–1700 */}
                <div className="absolute inset-x-0 top-0 border-b border-dashed border-primary bg-primary/15" style={{ height: 200 * scale }} />
                <div className="absolute inset-x-0 bottom-0 border-t border-dashed border-primary bg-primary/15" style={{ height: 350 * scale }} />
                <div className="absolute right-0 border-l border-dashed border-primary bg-primary/15" style={{ top: 1000 * scale, height: 700 * scale, width: 120 * scale }} />
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">No project yet — paste a script in the chat to make one.</p>
        )}
      </div>

      <div className="flex h-[50px] shrink-0 items-center justify-center gap-3 border-t border-subtle">
        <Button variant="ghost" size="icon" aria-label="Go to start" title="Start (Home)" onClick={() => onTime(0)} disabled={!project}>
          <SkipBack />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Back 1 second" title="Back 1s (⇧←)" onClick={() => onTime(time - 1)} disabled={!project}>
          <Rewind />
        </Button>
        <button
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={onToggle}
          disabled={!project}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-foreground text-background hover:opacity-90 disabled:opacity-40"
        >
          {playing ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />}
        </button>
        <Button variant="ghost" size="icon" aria-label="Forward 1 second" title="Forward 1s (⇧→)" onClick={() => onTime(time + 1)} disabled={!project}>
          <FastForward />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Go to end" title="End (End)" onClick={() => onTime(project?.duration ?? 0)} disabled={!project}>
          <SkipForward />
        </Button>
        <span className="tabular font-mono text-xs text-foreground">
          {fmt(time)} <span className="text-muted-foreground">/ {fmt(project?.duration ?? 0)}</span>
        </span>
      </div>
    </main>
  )
}
