import { vfxUrlOf } from './vfx'

/** Peak data for an audio file: max |sample| per 10 ms, cached per file. */
const cache = new Map<string, Promise<{ peaks: Float32Array; rate: number } | null>>()
const RATE = 100

export function peaksOf(src: string): Promise<{ peaks: Float32Array; rate: number } | null> {
  let p = cache.get(src)
  if (!p) {
    p = fetch(vfxUrlOf(src))
      .then((r) => r.arrayBuffer())
      .then((b) => new OfflineAudioContext(1, 1, 44100).decodeAudioData(b))
      .then((buf) => {
        const data = buf.getChannelData(0)
        const step = Math.max(1, Math.floor(buf.sampleRate / RATE))
        const peaks = new Float32Array(Math.ceil(data.length / step))
        for (let i = 0; i < peaks.length; i++) {
          let m = 0
          for (let j = i * step, end = Math.min(data.length, j + step); j < end; j++) m = Math.max(m, Math.abs(data[j]))
          peaks[i] = m
        }
        return { peaks, rate: RATE }
      })
      .catch(() => null)
    cache.set(src, p)
  }
  return p
}

export const forgetPeaks = (): void => cache.clear()
