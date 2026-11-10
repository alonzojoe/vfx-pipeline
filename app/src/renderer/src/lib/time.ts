/** 17.2 → "00:17.20" */
export const fmt = (t: number): string => {
  const s = Math.max(0, t)
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${(s - m * 60).toFixed(2).padStart(5, '0')}`
}

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/** Media dragged from the bin onto the timeline */
export const MEDIA_MIME = 'application/x-vfx-media'
