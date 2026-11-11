import { useEffect, useRef } from 'react'
import type { Clip, ProjectDetail } from '../../../shared/types'
import { vfxUrlOf } from '@/lib/vfx'

const AUDIBLE = new Set(['voice', 'sfx', 'media'])

/**
 * Plays the reel's sound while previewing: every voice / SFX / added-audio clip is scheduled with Web Audio
 * at its timeline position (with its media offset and volume), exactly like the render mixes them.
 * Re-scheduled on play and on every jump, so the voice always follows the playhead.
 */
export function useAudioEngine(project: ProjectDetail | null, time: number, playing: boolean, seekId: number): void {
  const ctx = useRef<AudioContext | null>(null)
  const buffers = useRef(new Map<string, Promise<AudioBuffer | null>>())
  const live = useRef<AudioScheduledSourceNode[]>([])
  const timeRef = useRef(time)
  timeRef.current = time

  const load = (src: string): Promise<AudioBuffer | null> => {
    if (!ctx.current) ctx.current = new AudioContext()
    let p = buffers.current.get(src)
    if (!p) {
      p = fetch(vfxUrlOf(src))
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
        .then((b) => ctx.current!.decodeAudioData(b))
        .catch(() => null)
      buffers.current.set(src, p)
    }
    return p
  }

  // preload sounds when a project opens / changes
  useEffect(() => {
    buffers.current.clear()
    project?.clips.filter((c) => c.src && AUDIBLE.has(c.track) && /\.(mp3|wav|m4a|aac)$/i.test(c.src)).forEach((c) => load(c.src!))
  }, [project])

  useEffect(() => {
    const stop = (): void => {
      live.current.forEach((n) => {
        try {
          n.stop()
        } catch {
          /* already stopped */
        }
      })
      live.current = []
    }
    if (!playing || !project) return stop
    if (!ctx.current) ctx.current = new AudioContext()
    const ac = ctx.current
    ac.resume()
    let cancelled = false
    const from = timeRef.current
    const t0 = ac.currentTime + 0.05
    const clips: Clip[] = project.clips.filter(
      (c) => c.src && AUDIBLE.has(c.track) && /\.(mp3|wav|m4a|aac)$/i.test(c.src) && c.start + c.duration > from
    )
    clips.forEach(async (c) => {
      const buf = await load(c.src!)
      if (!buf || cancelled) return
      const skip = Math.max(0, from - c.start)
      const offset = (c.mediaStart ?? 0) + skip
      const dur = Math.min(c.duration - skip, buf.duration - offset)
      if (dur <= 0) return
      const src = ac.createBufferSource()
      src.buffer = buf
      const gain = ac.createGain()
      gain.gain.value = c.volume ?? 1
      src.connect(gain).connect(ac.destination)
      src.start(t0 + Math.max(0, c.start - from), offset, dur)
      live.current.push(src)
    })
    return () => {
      cancelled = true
      stop()
    }
    // a jump while playing (start/end/±1s buttons, keys, scrubbing) stops the old sounds and re-schedules from there
  }, [playing, project, seekId])
}
