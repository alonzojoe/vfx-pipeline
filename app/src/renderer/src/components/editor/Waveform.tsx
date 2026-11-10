import { useEffect, useRef } from 'react'
import { peaksOf } from '@/lib/waveform'

type Props = { src: string; from: number; duration: number; width: number; height: number; color?: string }

/** Draws the slice [from, from+duration] of an audio file's waveform. */
export function Waveform({ src, from, duration, width, height, color = '#4ade80' }: Props): JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let alive = true
    peaksOf(src).then((p) => {
      const c = ref.current
      if (!alive || !p || !c) return
      const dpr = window.devicePixelRatio || 1
      c.width = Math.max(1, Math.floor(width * dpr))
      c.height = Math.floor(height * dpr)
      const g = c.getContext('2d')!
      g.clearRect(0, 0, c.width, c.height)
      g.fillStyle = color
      const bars = Math.max(1, Math.floor(width / 3))
      for (let i = 0; i < bars; i++) {
        const a = Math.floor((from + (i / bars) * duration) * p.rate)
        const b = Math.max(a + 1, Math.floor((from + ((i + 1) / bars) * duration) * p.rate))
        let m = 0
        for (let k = a; k < b && k < p.peaks.length; k++) m = Math.max(m, p.peaks[k])
        const h = Math.max(1, Math.min(1, m * 1.4) * c.height * 0.9)
        g.fillRect(i * 3 * dpr, (c.height - h) / 2, 2 * dpr, h)
      }
    })
    return () => {
      alive = false
    }
  }, [src, from, duration, width, height, color])
  return <canvas ref={ref} aria-hidden="true" style={{ width, height }} className="pointer-events-none opacity-90" />
}
