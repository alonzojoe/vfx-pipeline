import { FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { MediaBin } from '@/components/editor/MediaBin'
import { TitleBar } from '@/components/editor/TitleBar'
import { useVfx } from '@/hooks/useVfx'
import { usePlayback } from '@/hooks/usePlayback'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { Preview } from '@/components/editor/Preview'
import { useEffect } from 'react'

export default function App(): JSX.Element {
  const vfx = useVfx()
  const { info, project } = vfx
  const pb = usePlayback(project?.duration ?? 0)
  useAudioEngine(project, pb.time, pb.playing)

  // space = play/pause, ←/→ = 1 frame (⇧ = 1 second), unless typing
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable]')) return
      if (e.code === 'Space') {
        e.preventDefault()
        pb.toggle()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        pb.setTime(pb.time + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 1 : 1 / 30))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pb])

  if (info && !info.root) {
    return (
      <div className="titlebar-drag flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="text-lg font-semibold">Where is your vfx folder?</div>
        <p className="max-w-sm text-muted-foreground">Pick the folder with hyperframes/, scripts/ and input/ (usually ~/Desktop/vfx).</p>
        <Button className="no-drag" onClick={vfx.chooseRoot}>
          <FolderOpen />
          Choose folder
        </Button>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full flex-col">
        <TitleBar
          project={vfx.current ?? undefined}
          projects={vfx.projects.map((p) => p.name)}
          branch={info?.branch ?? undefined}
          status={{ voice: !!project?.hasVoice, build: !!project?.hasBuild, render: !!project?.hasFinal }}
          onProject={vfx.setCurrent}
          onReview={() => {}}
          onMake={() => {}}
        />
        <div className="flex min-h-0 flex-1">
          <MediaBin project={vfx.current} media={vfx.media} onImported={vfx.reload} />
          <Preview project={project} time={pb.time} playing={pb.playing} onTime={pb.setTime} onToggle={pb.toggle} />
          <aside className="w-[340px] shrink-0 border-l bg-panel" aria-label="Chat and inspector" />
        </div>
        <section className="h-[300px] shrink-0 border-t bg-panel" aria-label="Timeline" />
      </div>
    </TooltipProvider>
  )
}
