import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { clamp } from '@/lib/time'

/** The playhead time, outside React state: reading it never re-renders; subscribe with useTime(). */
export type Clock = { get: () => number; subscribe: (onChange: () => void) => () => void }

/**
 * Playhead clock: play/pause, driven by requestAnimationFrame.
 * The time lives in a tiny store (not React state) so playback doesn't re-render the whole app 60×/s — only the
 * parts that show it (playhead, time readout, preview seek) subscribe with useTime(clock).
 */
export function usePlayback(duration: number) {
  const now = useRef(0)
  const subs = useRef(new Set<() => void>())
  const durationRef = useRef(duration)
  durationRef.current = duration
  const [playing, setPlaying] = useState(false)
  /** bumps on every jump (buttons, keys, scrubbing) — not on normal playback — so audio can re-sync */
  const [seekId, setSeekId] = useState(0)
  const raf = useRef(0)

  const clock = useMemo<Clock>(
    () => ({
      get: () => now.current,
      subscribe: (fn) => {
        subs.current.add(fn)
        return () => subs.current.delete(fn)
      }
    }),
    []
  )
  const write = (t: number): void => {
    if (t === now.current) return
    now.current = t
    subs.current.forEach((fn) => fn())
  }

  const setTime = useCallback((t: number) => {
    write(clamp(t, 0, durationRef.current || 0))
    setSeekId((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!playing) return
    let last = performance.now()
    const tick = (ts: number): void => {
      const next = now.current + (ts - last) / 1000
      last = ts
      if (next >= duration) {
        write(duration)
        setPlaying(false)
        return
      }
      write(next)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [playing, duration])

  /** pause right now — no frame sneaks in before React re-renders (switching reels, then rewinding to 0) */
  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current)
    setPlaying(false)
  }, [])

  const toggle = useCallback(() => {
    setPlaying((p) => {
      if (!p && now.current >= durationRef.current - 0.05) write(0) // play again from the start
      return !p
    })
  }, [])

  return { clock, setTime, playing, setPlaying, stop, toggle, seekId }
}

/** Subscribe to the playhead (re-renders the caller on every frame while playing — keep callers small). */
export const useTime = (clock: Clock): number => useSyncExternalStore(clock.subscribe, clock.get)
