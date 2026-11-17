import { FolderOpen } from 'lucide-react'
import type { Clip } from '../../shared/types'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { MediaBin } from '@/components/editor/MediaBin'
import { TitleBar, type Stages } from '@/components/editor/TitleBar'
import { useVfx } from '@/hooks/useVfx'
import { usePlayback } from '@/hooks/usePlayback'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { useFps } from '@/hooks/useFps'
import { Preview } from '@/components/editor/Preview'
import { useEffect, useRef, useState } from 'react'
import { Timeline } from '@/components/editor/Timeline'
import { RunConsole } from '@/components/editor/RunConsole'
import { useRuns } from '@/hooks/useRuns'
import { useEdits } from '@/hooks/useEdits'
import { RightPanel } from '@/components/editor/RightPanel'
import { Inspector } from '@/components/editor/Inspector'
import { Chat, type VoiceState } from '@/components/editor/Chat'
import { useStable } from '@/hooks/useStable'

export default function App(): JSX.Element {
  const vfx = useVfx()
  const { info, project } = vfx
  const pb = usePlayback(project?.duration ?? 0)
  useAudioEngine(project, pb.clock, pb.playing, pb.seekId)
  const { fps, setFps } = useFps()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // switching reels: stop and go back to the start — the old position (and the voice scheduled from it) belongs to
  // the other reel, and may even be past this one's end
  const pbRef = useRef(pb)
  pbRef.current = pb
  useEffect(() => {
    pbRef.current.stop()
    pbRef.current.setTime(0)
    setSelectedId(null)
  }, [vfx.current])
  // new reel: after the chat writes the script → preview build → ElevenLabs voice (no terminal)
  const pendingVoice = useRef<string | null>(null)
  // a timeline edit made while another run was busy: build it as soon as that run ends
  const pendingBuild = useRef<string | null>(null)
  const runs = useRuns((run) => {
    vfx.reload()
    vfx.loadProjects()
    // Export = render, then the review runs by itself
    if (run.kind === 'render' && run.code === 0) return void runs.start('review', run.project)
    if (run.kind === 'build' && run.project === pendingVoice.current) {
      pendingVoice.current = null
      if (run.code === 0) return void runs.start('voice', run.project)
    }
    if (pendingBuild.current) {
      const p = pendingBuild.current
      pendingBuild.current = null
      runs.start('build', p)
    }
  })
  // opening a reel whose preview is out of date (e.g. the voice was re-made but never built in) → build it once
  const checked = useRef(new Set<string>())
  useEffect(() => {
    if (!project || checked.current.has(project.name)) return
    checked.current.add(project.name)
    if (project.stale && !project.draft && !runs.active) runs.start('build', project.name)
  }, [project, runs])
  const rebuild = (): void => {
    if (!vfx.current) return
    if (runs.active) pendingBuild.current = vfx.current
    else runs.start('build', vfx.current)
  }
  const edits = useEdits(project, vfx.patch, rebuild)
  // stable callbacks for the memo()'d panels — they re-render only when what they show changes
  const move = useStable(edits.move)
  const update = useStable(edits.update)
  const remove = useStable(edits.remove)
  const dropMedia = useStable(edits.dropMedia)
  const [tab, setTab] = useState('chat')
  const selected = project?.clips.find((c) => c.id === selectedId) ?? null
  const select = useStable((id: string | null): void => {
    setSelectedId(id)
    if (id) setTab('inspector')
  })
  const summary = vfx.projects.find((p) => p.name === vfx.current) ?? null
  const active = runs.active?.project === vfx.current ? runs.active?.kind : undefined
  const stages: Stages = {
    script: summary?.draft ? 'todo' : summary ? 'done' : 'todo',
    voice: active === 'voice' || active === 'make' ? 'doing' : project?.hasVoice ? 'done' : 'todo',
    build: active === 'build' ? 'doing' : project?.hasBuild && !summary?.draft ? 'done' : 'todo',
    render: active === 'render' ? 'doing' : project?.hasFinal ? 'done' : 'todo'
  }

  /** + New reel: create new-reel (new-reel-2…), open it and focus the chat for the script */
  const [newKey, setNewKey] = useState(0)
  const newReel = useStable(async (): Promise<void> => {
    const name = await window.api.createProject()
    await vfx.loadProjects()
    vfx.setCurrent(name)
    setSelectedId(null)
    pb.setTime(0)
    setTab('chat')
    setNewKey((k) => k + 1)
  })

  // the chat renames the new reel from its topic → follow it
  const currentRef = useRef(vfx.current)
  currentRef.current = vfx.current
  const onRenamed = useStable(async (to: string): Promise<void> => {
    currentRef.current = to
    await vfx.loadProjects()
    vfx.setCurrent(to)
  })
  // when the script is in and there's no voice yet, make it with ElevenLabs (make.sh --no-render) — no terminal
  const onChatDone = useStable(async (ok: boolean, newReel: boolean, edited: boolean): Promise<void> => {
    const name = currentRef.current
    await vfx.loadProjects()
    if (!ok || !name) return
    // a revision on an existing reel: make.sh --no-render rebuilds, and re-makes the voice only if the words changed
    if (!newReel) {
      if (edited && !runs.active) {
        const p = await window.api.getProject(name)
        if (p.lines.length) runs.start(p.hasVoice ? 'voice' : 'build', name)
      }
      return
    }
    const p = await window.api.getProject(name)
    if (!p.lines.length || runs.active) return
    pendingVoice.current = p.hasVoice ? null : name
    runs.start('build', name)
  })
  const stateOf = (kind: 'voice' | 'build', done: boolean): VoiceState => {
    const r = [...runs.runs].reverse().find((x) => x.kind === kind && x.project === vfx.current)
    return r && !r.done ? 'doing' : r?.done && r.code !== 0 ? 'failed' : r?.done || done ? 'done' : 'todo'
  }
  const voice = stateOf('voice', !!project?.hasVoice)
  const preview = stateOf('build', false)

  const setReaction = useStable(async (line: number, sticker: string): Promise<void> => {
    if (!vfx.current) return
    await window.api.setLineReaction(vfx.current, line, sticker)
    rebuild()
  })
  const onReview = useStable(() => vfx.current && runs.start('review', vfx.current))
  const onExport = useStable(() => vfx.current && runs.start('render', vfx.current))
  const onDeleteClip = useStable((c: Clip) => {
    remove(c)
    setSelectedId(null)
  })
  const openReview = useStable(() => vfx.current && window.api.reveal(`output/${vfx.current}/review`))
  // the finished video's name varies (…-final_edit.mp4 / …-final-edit.mp4), so ask the project which one exists
  const showVideo = useStable(async (p: string) => {
    const { finalUrl } = await window.api.getProject(p)
    window.api.reveal(finalUrl ? decodeURIComponent(finalUrl.replace('vfx://root/', '')) : `output/${p}`)
  })

  // space = play/pause, ←/→ = 1 frame (⇧ = 1 second), unless typing
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable]')) return
      if (e.code === 'Space') {
        e.preventDefault()
        pb.toggle()
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault()
        pb.setTime(e.key === 'Home' ? 0 : (project?.duration ?? 0))
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        pb.setTime(pb.clock.get() + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 1 : 1 / fps))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pb, project?.duration, fps])

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
          project={summary}
          projects={vfx.projects}
          stages={stages}
          busy={runs.active?.kind ?? null}
          onProject={vfx.setCurrent}
          onNew={newReel}
          onReview={onReview}
          onExport={onExport}
          fps={fps}
          onFps={setFps}
        />
        <div className="flex min-h-0 flex-1">
          <MediaBin project={vfx.current} media={vfx.media} onImported={vfx.reload} onNew={newReel} />
          <Preview project={project} clock={pb.clock} playing={pb.playing} onTime={pb.setTime} onToggle={pb.toggle} fps={fps} />
          <RightPanel
            tab={tab}
            onTab={setTab}
            chat={
              <Chat
                project={vfx.current}
                available={!!info?.claudeAvailable}
                draft={!!summary?.draft}
                voice={voice}
                preview={preview}
                onRenamed={onRenamed}
                onDone={onChatDone}
                newKey={newKey}
              />
            }
            inspector={
              <Inspector
                project={project}
                media={vfx.media}
                clip={selected}
                onMove={move}
                onUpdate={update}
                onDelete={onDeleteClip}
                onReaction={setReaction}
              />
            }
          />
        </div>
        <Timeline
          project={project}
          clock={pb.clock}
          selectedId={selectedId}
          onSeek={pb.setTime}
          onSelect={select}
          onMove={move}
          onDropMedia={dropMedia}
          onDelete={remove}
        />
        <RunConsole
          run={runs.last}
          onStop={runs.stop}
          onOpenReview={openReview}
          onShowVideo={showVideo}
        />
      </div>
    </TooltipProvider>
  )
}
