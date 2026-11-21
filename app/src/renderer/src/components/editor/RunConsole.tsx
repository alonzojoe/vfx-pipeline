import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, Square, XCircle } from 'lucide-react'
import type { Run } from '@/hooks/useRuns'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { readLog } from '@/lib/runLog'

const LABEL: Record<Run['kind'], string> = { make: 'Make reel', voice: 'Voice + rebuild', build: 'Rebuild', render: 'Export', review: 'Review' }

/** Floating status panel for the running / last pipeline command: a progress bar, the log only on demand. */
export function RunConsole({
  run,
  onStop,
  onOpenReview,
  onShowVideo
}: {
  run: Run | null
  onStop: () => void
  onOpenReview: () => void
  /** reveal the finished video (output/<p>/<p>-final_edit.mp4 or -final-edit.mp4) in Finder */
  onShowVideo: (project: string) => void
}): JSX.Element | null {
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const pre = useRef<HTMLPreElement>(null)
  const { pct, stage, text } = useMemo(() => readLog(run?.log ?? ''), [run?.log])
  const failed = !!run?.done && run.code !== 0

  useEffect(() => {
    setHidden(false)
    setOpen(false)
  }, [run?.runId])
  // a failed run opens its log — that's when the details matter
  useEffect(() => {
    if (failed) setOpen(true)
  }, [failed])
  useEffect(() => {
    if (pre.current) pre.current.scrollTop = pre.current.scrollHeight
  }, [text, open])

  if (!run || hidden) return null
  const ok = run.done && run.code === 0
  const lastLine = text.split('\n').filter(Boolean).pop() ?? ''
  const status = run.done ? (ok ? 'Done' : 'Failed') : stage || lastLine || 'Starting…'
  return (
    <div className="absolute bottom-[312px] right-[352px] z-40 w-[520px] overflow-hidden rounded-xl border bg-popover shadow-2xl">
      <div className="flex h-10 items-center gap-2 border-b px-3">
        {!run.done ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : ok ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        ) : (
          <XCircle className="h-4 w-4 text-red-400" />
        )}
        <span className="font-semibold">{LABEL[run.kind]}</span>
        <span className="truncate text-xs text-muted-foreground" title={run.command}>
          {status}
          {!run.done && pct !== null && ` · ${pct}%`}
        </span>
        <div className="flex-1" />
        {!run.done && (
          <Button variant="outline" size="sm" onClick={onStop}>
            <Square />
            Stop
          </Button>
        )}
        {run.done && ok && (run.kind === 'review' || run.kind === 'render' || run.kind === 'make') && (
          <Button size="sm" onClick={() => onShowVideo(run.project)}>
            Show in Finder
          </Button>
        )}
        {run.done && run.kind === 'review' && ok && (
          <Button size="sm" variant="outline" onClick={onOpenReview}>
            Open report
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" aria-label={open ? 'Hide details' : 'Show details'} title={open ? 'Hide details' : 'Show details'} onClick={() => setOpen((o) => !o)}>
          {open ? <ChevronDown /> : <ChevronUp />}
        </Button>
        {run.done && (
          <Button variant="ghost" size="sm" onClick={() => setHidden(true)}>
            Close
          </Button>
        )}
      </div>
      {pct !== null && !run.done && (
        <div className="h-1 bg-secondary" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={stage}>
          <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      )}
      {open && (
        <pre ref={pre} className={cn('max-h-[260px] overflow-auto whitespace-pre-wrap p-3 font-mono text-xs leading-relaxed text-foreground')}>
          {text || 'Starting…'}
        </pre>
      )}
    </div>
  )
}
