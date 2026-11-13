/**
 * HTTP Range header → inclusive byte span for a file of `size` bytes.
 * null = no/unsupported header (send the whole file); 'invalid' = 416.
 */
export function byteRange(header: string | null, size: number): { start: number; end: number } | 'invalid' | null {
  if (!header) return null
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!m || (!m[1] && !m[2])) return 'invalid'
  let start: number
  let end: number
  if (!m[1]) {
    // suffix: the last N bytes
    start = Math.max(0, size - Number(m[2]))
    end = size - 1
  } else {
    start = Number(m[1])
    end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1
  }
  if (size === 0 || start >= size || start > end) return 'invalid'
  return { start, end }
}
