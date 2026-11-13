import { protocol } from 'electron'
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { extname } from 'node:path'
import { Readable } from 'node:stream'
import { inside, servable } from './paths'
import { byteRange } from './range'
import { PREVIEW_BRIDGE } from './previewBridge'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.md': 'text/markdown; charset=utf-8'
}

/** Must run before app 'ready'. */
export function registerVfxScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'vfx', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } }
  ])
}

/** Pages allowed to fetch vfx:// (the app's own renderer and the preview iframe) — never `*`. */
function allowOrigin(origin: string | null): string | null {
  if (!origin) return null
  const dev = process.env['ELECTRON_RENDERER_URL']
  const ok = origin === 'vfx://root' || origin === 'file://' || origin === 'null' || (!!dev && origin === new URL(dev).origin)
  return ok ? origin : null
}

/**
 * vfx://root/<path> serves the reel folders (hyperframes/, input/, output/) read-only, with Range support so
 * audio/video can seek. Hidden files (.env, .git…) and everything else in the vfx folder are refused.
 * HyperFrames compositions (hyperframes/<p>/index.html) get a tiny bridge script so the app can seek them.
 */
export function handleVfxProtocol(getRoot: () => string | null): void {
  protocol.handle('vfx', (req) => {
    const root = getRoot()
    if (!root) return new Response('vfx folder not set', { status: 404 })
    let abs: string
    try {
      const rel = decodeURIComponent(new URL(req.url).pathname).replace(/^\/+/, '')
      if (!servable(rel)) throw new Error('not served')
      abs = inside(root, rel)
    } catch {
      return new Response('forbidden', { status: 403 })
    }
    if (!existsSync(abs) || !statSync(abs).isFile()) return new Response('not found', { status: 404 })
    const type = MIME[extname(abs).toLowerCase()] ?? 'application/octet-stream'
    const origin = allowOrigin(req.headers.get('origin'))
    const headers: Record<string, string> = { 'Content-Type': type, 'Cache-Control': 'no-cache', Vary: 'Origin' }
    if (origin) headers['Access-Control-Allow-Origin'] = origin

    if (/\/hyperframes\/[^/]+\/index\.html$/.test(abs.replace(/\\/g, '/'))) {
      const html = readFileSync(abs, 'utf8').replace('</body>', `<script>${PREVIEW_BRIDGE}</script></body>`)
      return new Response(html, { headers })
    }

    const size = statSync(abs).size
    const range = byteRange(req.headers.get('range'), size)
    if (range === 'invalid') return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${size}` } })
    if (range) {
      const { start, end } = range
      const body = Readable.toWeb(createReadStream(abs, { start, end })) as unknown as ReadableStream
      return new Response(body, {
        status: 206,
        headers: { ...headers, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) }
      })
    }
    const body = Readable.toWeb(createReadStream(abs)) as unknown as ReadableStream
    return new Response(body, { headers: { ...headers, 'Accept-Ranges': 'bytes', 'Content-Length': String(size) } })
  })
}
