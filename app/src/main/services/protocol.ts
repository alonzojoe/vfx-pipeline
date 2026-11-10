import { protocol } from 'electron'
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { extname } from 'node:path'
import { Readable } from 'node:stream'
import { inside } from './paths'
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

/**
 * vfx://root/<path> serves files from the vfx folder (read-only), with Range support so audio/video can seek.
 * HyperFrames compositions (hyperframes/<p>/index.html) get a tiny bridge script so the app can seek them.
 */
export function handleVfxProtocol(getRoot: () => string | null): void {
  protocol.handle('vfx', (req) => {
    const root = getRoot()
    if (!root) return new Response('vfx folder not set', { status: 404 })
    let abs: string
    try {
      abs = inside(root, decodeURIComponent(new URL(req.url).pathname).replace(/^\/+/, ''))
    } catch {
      return new Response('forbidden', { status: 403 })
    }
    if (!existsSync(abs) || !statSync(abs).isFile()) return new Response('not found', { status: 404 })
    const type = MIME[extname(abs).toLowerCase()] ?? 'application/octet-stream'
    const headers = { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache' }

    if (/\/hyperframes\/[^/]+\/index\.html$/.test(abs.replace(/\\/g, '/'))) {
      const html = readFileSync(abs, 'utf8').replace('</body>', `<script>${PREVIEW_BRIDGE}</script></body>`)
      return new Response(html, { headers })
    }

    const size = statSync(abs).size
    const range = req.headers.get('range')
    const m = range && /bytes=(\d*)-(\d*)/.exec(range)
    if (m) {
      const start = m[1] ? Number(m[1]) : size - Number(m[2])
      const end = m[1] && m[2] ? Number(m[2]) : size - 1
      if (start >= size || end >= size || start > end) {
        return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
      }
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
