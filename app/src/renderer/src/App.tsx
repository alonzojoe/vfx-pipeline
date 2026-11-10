import { FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { MediaBin } from '@/components/editor/MediaBin'
import { TitleBar } from '@/components/editor/TitleBar'
import { useVfx } from '@/hooks/useVfx'
import { usePlayback } from '@/hooks/usePlayback'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { Preview } from '@/components/editor/Preview'
import { useEffect, useState } from 'react'
import { Timeline } from '@/components/editor/Timeline'
import { RunConsole } from '@/components/editor/RunConsole'
import { useRuns } from '@/hooks/useRuns'
import { useEdits } from '@/hooks/useEdits'
import { RightPanel } from '@/components/editor/RightPanel'
import { Inspector } from '@/components/editor/Inspector'
import { Chat } from '@/components/editor/Chat'

export default function App(): JSX.Element {
  const vfx = useVfx()
  const { info, project } = vfx
  const pb = usePlayback(project?.duration ?? 0)
  useAudioEngine(project, pb.time, pb.playing)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const runs = useRuns(vfx.reload)
  const rebuild = (): void => {
    if (vfx.current && !runs.active) runs.start('build', vfx.current)
  }
  const edits = useEdits(project, vfx.patch, rebuild)
  const [tab, setTab] = useState('chat')
  const selected = project?.clips.find((c) => c.id === selectedId) ?? null
  const select = (id: string | null): void => {
    setSelectedId(id)
    if (id) setTab('inspector')
  }
  const setReaction = async (line: number, sticker: string): Promise<void> => {
    if (!vfx.current) return
    await window.api.setLineReaction(vfx.current, line, sticker)
    rebuild()
  }

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
      <div className="relative flex h-full flex-col">
        <TitleBar
          project={vfx.current ?? undefined}
          projects={vfx.projects.map((p) => p.name)}
          status={{ voice: !!project?.hasVoice, build: !!project?.hasBuild, render: !!project?.hasFinal }}
          onProject={vfx.setCurrent}
          busy={runs.active?.kind ?? null}
          onReview={() => vfx.current && runs.start('review', vfx.current)}
          onMake={() => vfx.current && runs.start('make', vfx.current)}
        />
        <div className="flex min-h-0 flex-1">
          <MediaBin project={vfx.current} media={vfx.media} onImported={vfx.reload} />
          <Preview project={project} time={pb.time} playing={pb.playing} onTime={pb.setTime} onToggle={pb.toggle} />
          <RightPanel
            tab={tab}
            onTab={setTab}
            chat={<Chat project={vfx.current} available={!!info?.claudeAvailable} />}
            inspector={
              <Inspector
                project={project}
                media={vfx.media}
                clip={selected}
                onMove={edits.move}
                onUpdate={edits.update}
                onDelete={(c) => {
                  edits.remove(c)
                  setSelectedId(null)
                }}
                onReaction={setReaction}
              />
            }
          />
        </div>
        <Timeline
          project={project}
          time={pb.time}
          playing={pb.playing}
          selectedId={selectedId}
          onSeek={pb.setTime}
          onSelect={select}
          onMove={edits.move}
          onDropMedia={edits.dropMedia}
          onDelete={edits.remove}
        />
        <RunConsole run={runs.last} onStop={runs.stop} onOpenReview={() => vfx.current && window.api.reveal(`output/${vfx.current}/review`)} />
      </div>
    </TooltipProvider>
  )
}
