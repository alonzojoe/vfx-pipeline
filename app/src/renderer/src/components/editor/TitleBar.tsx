import { ClipboardCheck, Folder, GitBranch, Sparkles, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type Status = { voice: boolean; build: boolean; render: boolean }

type Props = {
  project?: string
  projects: string[]
  branch?: string
  status: Status
  busy?: string | null
  onProject: (name: string) => void
  onReview: () => void
  onMake: () => void
}

function Dot({ on, label }: { on: boolean; label: string }): JSX.Element {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('h-1.5 w-1.5 rounded-full', on ? 'bg-emerald-400' : 'bg-zinc-600')} />
      {label}
    </span>
  )
}

export function TitleBar({ project, projects, branch, status, busy, onProject, onReview, onMake }: Props): JSX.Element {
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

      <label className="no-drag relative flex h-[30px] items-center gap-2 rounded-lg border border-input bg-[#1c1c1f] pl-2.5 pr-2">
        <Folder className="h-3.5 w-3.5 text-muted-foreground" />
        <select
          aria-label="Project"
          value={project ?? ''}
          onChange={(e) => onProject(e.target.value)}
          className="appearance-none bg-transparent pr-5 text-sm outline-none"
        >
          {projects.length === 0 && <option value="">No projects</option>}
          {projects.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 h-3 w-3 text-muted-foreground" />
      </label>

      {branch && (
        <span className="flex h-6 items-center gap-1.5 rounded-full border border-input bg-[#18181b] px-2.5 font-mono text-xs text-muted-foreground">
          <GitBranch className="h-3 w-3" />
          {branch}
        </span>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Dot on={status.voice} label="Voice" />
        <Dot on={status.build} label="Build" />
        <Dot on={status.render} label="Render" />
      </div>

      <Button variant="outline" className="no-drag" onClick={onReview} disabled={!project || !!busy}>
        <ClipboardCheck />
        Review
      </Button>
      <Button className="no-drag font-semibold" onClick={onMake} disabled={!project || !!busy}>
        <Sparkles />
        {busy === 'make' ? 'Making…' : 'Make reel'}
      </Button>
    </header>
  )
}
