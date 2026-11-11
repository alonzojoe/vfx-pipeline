import { useCallback, useEffect, useRef, useState } from 'react'
import { clamp } from '@/lib/time'

/** Playhead clock: time in seconds, play/pause, driven by requestAnimationFrame. */
export function usePlayback(duration: number) {
  const [time, setTimeState] = useState(0)
  const [playing, setPlaying] = useState(false)
  /** bumps on every jump (buttons, keys, scrubbing) — not on normal playback — so audio can re-sync */
  const [seekId, setSeekId] = useState(0)
  const raf = useRef(0)
  const last = useRef(0)

  const setTime = useCallback(
    (t: number) => {
      setTimeState(clamp(t, 0, duration || 0))
      setSeekId((n) => n + 1)
    },
    [duration]
  )

  useEffect(() => {
    if (!playing) return
    last.current = performance.now()
    const tick = (now: number): void => {
      const dt = (now - last.current) / 1000
      last.current = now
      setTimeState((t) => {
        const next = t + dt
        if (next >= duration) {
          setPlaying(false)
          return duration
        }
        return next
      })
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [playing, duration])

  const toggle = useCallback(() => {
    setPlaying((p) => {
      if (!p) setTimeState((t) => (t >= duration - 0.05 ? 0 : t))
      return !p
    })
  }, [duration])

  return { time, setTime, playing, setPlaying, toggle, seekId }
}
