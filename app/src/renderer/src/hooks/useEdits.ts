import { useCallback } from 'react'
import type { AddedClip, Clip, MediaItem, ProjectDetail } from '../../../shared/types'
import { vfxUrlOf } from '@/lib/vfx'

const r3 = (n: number): number => Math.round(n * 1000) / 1000

/** Length of an audio/video file in seconds (falls back to 3s). */
function mediaLength(item: MediaItem): Promise<number> {
  if (item.kind === 'image') return Promise.resolve(3)
  return new Promise((res) => {
    const el = document.createElement(item.kind === 'video' ? 'video' : 'audio')
    const done = (v: number): void => res(Number.isFinite(v) && v > 0 ? v : 3)
    el.preload = 'metadata'
    el.onloadedmetadata = () => done(el.duration)
    el.onerror = () => done(3)
    setTimeout(() => done(3), 3000)
    el.src = vfxUrlOf(item.path)
  })
}

/**
 * Timeline edits → hyperframes/<p>/overrides.json, then a rebuild (build.mjs applies them via scripts/overrides.mjs).
 * The open project is patched immediately so the UI doesn't wait for the build.
 */
export function useEdits(
  project: ProjectDetail | null,
  patch: (fn: (p: ProjectDetail) => ProjectDetail) => void,
  rebuild: () => void
) {
  const name = project?.name

  const move = useCallback(
    async (clip: Clip, start: number) => {
      if (!name || !project) return
      const o = await window.api.getOverrides(name)
      const d = r3(start - clip.start)
      if (!d) return
      // an avatar change carries its pointing arrow along
      const ids = [clip.id]
      const n = /^react-(\d+)$/.exec(clip.id)?.[1]
      if (n && project.clips.some((c) => c.id === `arrow-${n}`)) ids.push(`arrow-${n}`)
      if (clip.added) o.added = o.added.map((a) => (a.id === clip.id ? { ...a, start: r3(start) } : a))
      else ids.forEach((id) => (o.moves[id] = r3((o.moves[id] ?? 0) + d)))
      await window.api.setOverrides(name, o)
      patch((p) => ({ ...p, clips: p.clips.map((c) => (ids.includes(c.id) ? { ...c, start: r3(c.start + d) } : c)) }))
      rebuild()
    },
    [name, project, patch, rebuild]
  )

  const dropMedia = useCallback(
    async (item: MediaItem, t: number) => {
      if (!name || !project || item.kind === 'other') return
      const o = await window.api.getOverrides(name)
      const next = 1 + Math.max(0, ...o.added.map((a) => Number(/^media-(\d+)$/.exec(a.id)?.[1] ?? 0)))
      const len = await mediaLength(item)
      const added: AddedClip = {
        id: `media-${next}`,
        kind: item.kind,
        src: item.path,
        start: r3(t),
        duration: r3(Math.min(len, Math.max(0.5, project.duration - t))),
        ...(item.kind === 'audio' ? { volume: 0.8 } : {})
      }
      o.added.push(added)
      await window.api.setOverrides(name, o)
      patch((p) => ({
        ...p,
        clips: [...p.clips, { id: added.id, track: 'media', start: added.start, duration: added.duration, label: item.name, src: item.path, added: true, volume: added.volume }]
      }))
      rebuild()
    },
    [name, project, patch, rebuild]
  )

  const update = useCallback(
    async (clip: Clip, changes: Partial<AddedClip>) => {
      if (!name || !clip.added) return
      const o = await window.api.getOverrides(name)
      o.added = o.added.map((a) => (a.id === clip.id ? { ...a, ...changes } : a))
      await window.api.setOverrides(name, o)
      patch((p) => ({ ...p, clips: p.clips.map((c) => (c.id === clip.id ? { ...c, ...changes } : c)) }))
      rebuild()
    },
    [name, patch, rebuild]
  )

  const remove = useCallback(
    async (clip: Clip) => {
      if (!name || !clip.added) return
      const o = await window.api.getOverrides(name)
      o.added = o.added.filter((a) => a.id !== clip.id)
      await window.api.setOverrides(name, o)
      patch((p) => ({ ...p, clips: p.clips.filter((c) => c.id !== clip.id) }))
      rebuild()
    },
    [name, patch, rebuild]
  )

  return { move, dropMedia, update, remove }
}
