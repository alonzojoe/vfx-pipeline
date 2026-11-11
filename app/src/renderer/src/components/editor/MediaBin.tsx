import { useMemo, useRef, useState } from 'react'
import { FileAudio, FileImage, FileVideo, Pause, Play, Plus, Search, Upload } from 'lucide-react'
import type { MediaItem, MediaLibrary } from '../../../../shared/types'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MEDIA_MIME } from '@/lib/time'
import { cn } from '@/lib/utils'

type Props = {
  project: string | null
  media: MediaLibrary | null
  onImported: () => void
  onNew: () => void
}

const drag = (item: MediaItem) => (e: React.DragEvent) => {
  e.dataTransfer.setData(MEDIA_MIME, JSON.stringify(item))
  e.dataTransfer.effectAllowed = 'copy'
}

function Thumb({ item }: { item: MediaItem }): JSX.Element {
  return (
    <div
      draggable
      onDragStart={drag(item)}
      title={`${item.name} — drag onto the timeline`}
      className="group flex cursor-grab flex-col items-center gap-1 rounded-lg border border-border bg-surface-2 p-1.5 hover:border-primary/60 active:cursor-grabbing"
    >
      <img src={item.url} alt={item.name} loading="lazy" draggable={false} className="h-[62px] w-full object-contain" />
      <span className="max-w-full truncate text-xs text-muted-foreground">{item.name.replace(/\.\w+$/, '')}</span>
    </div>
  )
}

function SoundRow({ item, playing, onPlay }: { item: MediaItem; playing: boolean; onPlay: () => void }): JSX.Element {
  return (
    <div
      draggable
      onDragStart={drag(item)}
      className="flex cursor-grab items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1.5 hover:border-primary/60"
    >
      <button
        aria-label={`${playing ? 'Stop' : 'Play'} ${item.name}`}
        onClick={onPlay}
        className="no-drag flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground hover:bg-primary"
      >
        {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate">{item.name}</div>
        <div className="truncate text-xs text-muted-foreground">{item.note}</div>
      </div>
    </div>
  )
}

const icon = (k: MediaItem['kind']): JSX.Element =>
  k === 'audio' ? <FileAudio className="h-3.5 w-3.5" /> : k === 'video' ? <FileVideo className="h-3.5 w-3.5" /> : <FileImage className="h-3.5 w-3.5" />

export function MediaBin({ project, media, onImported, onNew }: Props): JSX.Element {
  const [query, setQuery] = useState('')
  const [over, setOver] = useState(false)
  const [playing, setPlaying] = useState<string | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)

  const chill = media?.stickers.find((s) => s.name === 'chill.png')?.url
  const sfx = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = media?.sfx ?? []
    return (q ? list.filter((s) => s.path.toLowerCase().includes(q)) : list).slice(0, 200)
  }, [media, query])

  const play = (item: MediaItem): void => {
    audio.current?.pause()
    if (playing === item.path) return setPlaying(null)
    const a = new Audio(item.url)
    a.onended = () => setPlaying(null)
    a.play()
    audio.current = a
    setPlaying(item.path)
  }

  const onDrop = async (e: React.DragEvent): Promise<void> => {
    e.preventDefault()
    setOver(false)
    if (!project) return
    const paths = Array.from(e.dataTransfer.files).map((f) => window.api.pathForFile(f)).filter(Boolean)
    if (paths.length) {
      await window.api.importFiles(project, paths)
      onImported()
    }
  }

  return (
    <aside aria-label="Media" className="flex w-[280px] shrink-0 flex-col border-r bg-panel">
      <button
        onClick={onNew}
        className="relative mx-2.5 mt-2.5 flex min-h-[92px] items-center gap-2 overflow-hidden rounded-xl border border-primary bg-gradient-to-br from-[#ff4d2e] to-[#c7321a] p-3 text-left text-white shadow-lg hover:brightness-110"
      >
        <span className="relative z-10 flex flex-1 flex-col gap-1">
          <span className="flex items-center gap-1.5 text-base font-bold">
            <Plus className="h-4 w-4" strokeWidth={3} />
            New reel
          </span>
          <span className="text-xs leading-snug opacity-95">Paste a script — I'll build the cards, voice and timeline.</span>
        </span>
        {chill && <img src={chill} alt="" className="-my-3 -mr-2 h-[84px] w-[84px] object-contain" draggable={false} />}
      </button>
      <div
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault()
            setOver(true)
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          'm-2.5 flex flex-col items-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-input bg-titlebar p-3.5 text-center transition-colors',
          over && 'border-primary bg-primary/10'
        )}
      >
        <Upload className="h-5 w-5 text-primary" />
        <div className="font-semibold">Drop files here</div>
        <div className="text-xs leading-snug text-muted-foreground">
          Images, video, audio → saved to input/{project ?? '…'}/media. Drag onto the timeline to place them.
        </div>
      </div>

      <Tabs defaultValue="stickers" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-2.5 grid grid-cols-4">
          <TabsTrigger value="stickers">Stickers</TabsTrigger>
          <TabsTrigger value="sfx">SFX</TabsTrigger>
          <TabsTrigger value="bg">BG</TabsTrigger>
          <TabsTrigger value="project">Project</TabsTrigger>
        </TabsList>

        <TabsContent value="stickers" className="min-h-0 flex-1">
          <ScrollArea className="h-full px-2.5 pb-2.5">
            <div className="grid grid-cols-3 gap-2">
              {media?.stickers.map((s) => <Thumb key={s.path} item={s} />)}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="sfx" className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="relative mx-2.5">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${media?.sfx.length ?? 0} sounds…`} className="pl-8" />
          </div>
          <ScrollArea className="min-h-0 flex-1 px-2.5 pb-2.5">
            <div className="flex flex-col gap-1">
              {sfx.map((s) => (
                <SoundRow key={s.path} item={s} playing={playing === s.path} onPlay={() => play(s)} />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="bg" className="min-h-0 flex-1">
          <ScrollArea className="h-full px-2.5 pb-2.5">
            <div className="grid grid-cols-2 gap-2">
              {media?.backgrounds.map((b) => (
                <div key={b.path} className="overflow-hidden rounded-lg border border-border">
                  <img src={b.url} alt={b.name} className="h-28 w-full object-cover" />
                  <div className="truncate px-2 py-1 text-xs text-muted-foreground">{b.name}</div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs leading-snug text-muted-foreground">
              Picked automatically per reel — never the same as the previous one (BRAND.md).
            </p>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="project" className="min-h-0 flex-1">
          <ScrollArea className="h-full px-2.5 pb-2.5">
            {media?.project.length ? (
              <div className="flex flex-col gap-1">
                {media.project.map((f) =>
                  f.kind === 'audio' ? (
                    <SoundRow key={f.path} item={{ ...f, note: f.path.split('/').slice(2, -1).join('/') }} playing={playing === f.path} onPlay={() => play(f)} />
                  ) : (
                    <div
                      key={f.path}
                      draggable
                      onDragStart={drag(f)}
                      className="flex cursor-grab items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1.5 hover:border-primary/60"
                    >
                      {f.kind === 'image' ? <img src={f.url} alt="" className="h-8 w-8 rounded object-cover" /> : icon(f.kind)}
                      <span className="truncate">{f.name}</span>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="px-1 text-xs text-muted-foreground">No files in input/{project} yet. Drop some above.</p>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </aside>
  )
}
