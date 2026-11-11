import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, Square, XCircle } from 'lucide-react'
import type { Run } from '@/hooks/useRuns'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const LABEL: Record<Run['kind'], string> = { make: 'Make reel', voice: 'Voice + rebuild', build: 'Rebuild', render: 'Export', review: 'Review' }

/** Floating log panel for the running / last pipeline command. */
export function RunConsole({
  run,
  onStop,
  onOpenReview,
  onShowVideo
}: {
  run: Run | null
  onStop: () => void
  onOpenReview: () => void
  /** reveal output/<p>/<p>-FINAL.mp4 in Finder */
  onShowVideo: (project: string) => void
}): JSX.Element | null {
  const [open, setOpen] = useState(true)
  const [hidden, setHidden] = useState(false)
  const pre = useRef<HTMLPreElement>(null)

  useEffect(() => {
    setHidden(false)
    setOpen(true)
  }, [run?.runId])
  useEffect(() => {
    if (pre.current) pre.current.scrollTop = pre.current.scrollHeight
  }, [run?.log])

  if (!run || hidden) return null
  const ok = run.done && run.code === 0
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
        <span className="truncate font-mono text-xs text-muted-foreground">{run.command}</span>
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
        <Button variant="ghost" size="icon-sm" aria-label={open ? 'Collapse log' : 'Expand log'} onClick={() => setOpen((o) => !o)}>
          {open ? <ChevronDown /> : <ChevronUp />}
        </Button>
        {run.done && (
          <Button variant="ghost" size="sm" onClick={() => setHidden(true)}>
            Close
          </Button>
        )}
      </div>
      {open && (
        <pre ref={pre} className={cn('max-h-[260px] overflow-auto whitespace-pre-wrap p-3 font-mono text-xs leading-relaxed text-foreground')}>
          {run.log || 'Starting…'}
        </pre>
      )}
    </div>
  )
}
