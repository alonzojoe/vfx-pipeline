import { FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { MediaBin } from '@/components/editor/MediaBin'
import { TitleBar } from '@/components/editor/TitleBar'
import { useVfx } from '@/hooks/useVfx'

export default function App(): JSX.Element {
  const vfx = useVfx()
  const { info, project } = vfx

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
          <main className="flex min-w-0 flex-1 flex-col bg-background" aria-label="Preview" />
          <aside className="w-[340px] shrink-0 border-l bg-panel" aria-label="Chat and inspector" />
        </div>
        <section className="h-[300px] shrink-0 border-t bg-panel" aria-label="Timeline" />
      </div>
    </TooltipProvider>
  )
}
