// Types shared by the main process, the preload bridge and the renderer.

export type TrackKind = 'captions' | 'cards' | 'avatar' | 'fx' | 'media' | 'voice' | 'sfx' | 'background'

export const TRACK_ORDER: TrackKind[] = ['captions', 'cards', 'avatar', 'fx', 'media', 'voice', 'sfx', 'background']

export type Clip = {
  id: string
  track: TrackKind
  start: number
  duration: number
  label: string
  /** path relative to the vfx root (image/audio source), when the clip has one */
  src?: string
  /** audio only */
  mediaStart?: number
  volume?: number
  /** true when the clip was added from the media bin (lives in overrides.json) */
  added?: boolean
  /** added image/video position on the 1080×1920 frame */
  box?: { x: number; y: number; w: number; h: number }
  /** line index in script.json (captions/avatar), when known */
  line?: number
}

export type ProjectSummary = {
  name: string
  title: string
  hasVoice: boolean
  hasBuild: boolean
  hasFinal: boolean
  /** a reel made with "+ New reel" that has no script lines yet */
  draft: boolean
  updatedAt: number
}

export type ProjectDetail = ProjectSummary & {
  duration: number
  background: string | null
  cta: string | null
  clips: Clip[]
  /** vfx:// URL of the HyperFrames composition */
  compositionUrl: string
  /** vfx:// URL of the rendered FINAL mp4, if any */
  finalUrl: string | null
  /** vfx:// URL of the voice take, if any */
  voiceUrl: string | null
  lines: { text: string; react?: string }[]
}

export type MediaKind = 'image' | 'audio' | 'video' | 'other'

export type MediaItem = {
  name: string
  /** path relative to the vfx root */
  path: string
  url: string
  kind: MediaKind
  group: string
  note?: string
}

export type MediaLibrary = {
  stickers: MediaItem[]
  sfx: MediaItem[]
  backgrounds: MediaItem[]
  project: MediaItem[]
}

/** hyperframes/<project>/overrides.json — timeline edits made in the app, applied by build.mjs */
export type Overrides = {
  moves: Record<string, number>
  added: AddedClip[]
}

export type AddedClip = {
  id: string
  kind: 'image' | 'video' | 'audio'
  src: string
  start: number
  duration: number
  volume?: number
  /** image/video box in reel pixels (1080×1920) */
  x?: number
  y?: number
  w?: number
  h?: number
}

export type RunKind = 'make' | 'voice' | 'review' | 'build' | 'render'

export type RunEvent =
  | { runId: string; type: 'start'; kind: RunKind; project: string; command: string }
  | { runId: string; type: 'log'; text: string }
  | { runId: string; type: 'exit'; code: number | null }

export type ChatEvent =
  | { id: string; type: 'text'; text: string }
  | { id: string; type: 'tool'; name: string; detail: string }
  | { id: string; type: 'error'; text: string }
  | { id: string; type: 'done'; ok: boolean; cost?: number }
  /** a new reel was renamed from its topic (scripts/rename-project.sh printed "renamed a → b") */
  | { id: string; type: 'renamed'; from: string; to: string }

export type AppInfo = {
  root: string | null
  branch: string | null
  claudeAvailable: boolean
}
