import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ClipboardCheck, Download, Folder, Plus } from 'lucide-react'
import type { ProjectSummary } from '../../../../shared/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type StageState = 'done' | 'doing' | 'todo'
export type Stages = { script: StageState; voice: StageState; build: StageState; render: StageState }

type Props = {
  project: ProjectSummary | null
  projects: ProjectSummary[]
  stages: Stages
  busy?: string | null
  onProject: (name: string) => void
  onNew: () => void
  onReview: () => void
  onExport: () => void
}

function Stage({ label, state }: { label: string; state: StageState }): JSX.Element {
  return (
    <span
      className={cn(
        'flex items-center gap-1.5 rounded-full px-2 py-0.5',
        state === 'done' && 'bg-emerald-500/15 text-foreground',
        state === 'doing' && 'bg-primary/15 text-foreground',
        state === 'todo' && 'text-muted-foreground'
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          state === 'done' ? 'bg-emerald-400' : state === 'doing' ? 'animate-pulse bg-primary' : 'bg-zinc-600'
        )}
      />
      {label}
    </span>
  )
}

const metaOf = (p: ProjectSummary): string => (p.draft ? 'draft — paste a script' : p.hasFinal ? 'FINAL rendered' : p.hasVoice ? 'voice ready' : 'no voice yet')

/** Reel picker: every reel in hyperframes/, with "+ New reel" on top. */
function ReelPicker({ project, projects, onProject, onNew }: Pick<Props, 'project' | 'projects' | 'onProject' | 'onNew'>): JSX.Element {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent): void => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [open])
  return (
    <div ref={box} className="no-drag relative">
      <button
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 items-center gap-2 rounded-lg border border-input bg-[#1c1c1f] px-2.5 text-sm hover:bg-[#232327]"
      >
        <Folder className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="max-w-[220px] truncate">{project?.name ?? 'No reel'}</span>
        {project?.draft && <span className="rounded-full bg-primary/15 px-2 text-[11px] font-semibold text-primary">NEW</span>}
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>
      {open && (
        <div role="listbox" aria-label="Reels" className="absolute left-0 top-10 z-50 w-[320px] rounded-xl border border-input bg-popover p-1.5 shadow-2xl">
          <button
            onClick={() => {
              setOpen(false)
              onNew()
            }}
            className="flex w-full items-center gap-2.5 rounded-lg bg-primary/10 p-2.5 text-left text-sm font-semibold text-[#ff8a73] hover:bg-primary/20"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white">
              <Plus className="h-4 w-4" />
            </span>
            New reel
          </button>
          <div className="px-2.5 pb-1 pt-2.5 text-xs text-muted-foreground">Your reels</div>
          <div className="max-h-[320px] overflow-auto">
            {projects.map((p) => (
              <button
                key={p.name}
                role="option"
                aria-selected={p.name === project?.name}
                onClick={() => {
                  setOpen(false)
                  onProject(p.name)
                }}
                className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-accent', p.name === project?.name && 'bg-accent')}
              >
                <span className={cn('h-2 w-2 shrink-0 rounded-full', p.hasFinal ? 'bg-emerald-400' : p.draft ? 'bg-primary' : 'bg-zinc-500')} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{p.name}</span>
                  <span className="block text-xs text-muted-foreground">{metaOf(p)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function TitleBar({ project, projects, stages, busy, onProject, onNew, onReview, onExport }: Props): JSX.Element {
  const ready = !!project && !project.draft
  return (
    <header className="titlebar-drag flex h-[52px] shrink-0 items-center gap-3 border-b bg-[#141416] pl-[84px] pr-3">
      <div className="flex items-center gap-2">
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-primary">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
            <polygon points="7 4 20 12 7 20" />
          </svg>
        </span>
        <span className="font-semibold tracking-tight">vfx Studio</span>
      </div>

      <ReelPicker project={project} projects={projects} onProject={onProject} onNew={onNew} />

      <div className="flex-1" />

      <div className="flex items-center gap-1.5 text-xs" aria-label="Pipeline">
        <Stage label="Script" state={stages.script} />
        <Stage label="Voice" state={stages.voice} />
        <Stage label="Build" state={stages.build} />
        <Stage label="Render" state={stages.render} />
      </div>

      <Button variant="outline" className="no-drag" onClick={onReview} disabled={!ready || !!busy}>
        <ClipboardCheck />
        Review
      </Button>
      <Button variant="outline" className="no-drag" onClick={onExport} disabled={!ready || !!busy}>
        <Download />
        {busy === 'render' ? 'Exporting…' : 'Export'}
      </Button>
      <Button className="no-drag font-semibold" onClick={onNew} disabled={!!busy}>
        <Plus />
        New reel
      </Button>
    </header>
  )
}
