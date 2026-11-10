import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, extname, join, relative } from 'node:path'
import type { MediaItem, MediaKind, MediaLibrary } from '../../shared/types'
import { inside, vfxUrl } from './paths'

const KIND: Record<string, MediaKind> = {
  '.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.webp': 'image', '.gif': 'image', '.svg': 'image',
  '.mp3': 'audio', '.wav': 'audio', '.m4a': 'audio', '.aac': 'audio',
  '.mp4': 'video', '.mov': 'video', '.webm': 'video'
}
export const kindOf = (file: string): MediaKind => KIND[extname(file).toLowerCase()] ?? 'other'

function walk(dir: string, depth = 4): string[] {
  if (!existsSync(dir) || depth < 0) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    if (d.name.startsWith('.') || d.name.startsWith('_')) return []
    const p = join(dir, d.name)
    return d.isDirectory() ? walk(p, depth - 1) : [p]
  })
}

const item = (root: string, abs: string, group: string, note?: string): MediaItem => {
  const rel = relative(root, abs).split('\\').join('/')
  return { name: basename(abs), path: rel, url: vfxUrl(rel), kind: kindOf(abs), group, note }
}

export function mediaLibrary(root: string, project?: string): MediaLibrary {
  const gen = join(root, 'input', 'general')
  const stickerDir = join(gen, 'my different reactions')
  let stickerNames: string[] = []
  try {
    const meta = JSON.parse(readFileSync(join(stickerDir, 'stickers.json'), 'utf8')).stickers as Record<string, unknown>
    stickerNames = Object.keys(meta)
  } catch {
    stickerNames = existsSync(stickerDir) ? readdirSync(stickerDir).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4)) : []
  }
  const sfxDir = join(gen, 'sfx')
  const sfx = walk(sfxDir)
    .filter((p) => kindOf(p) === 'audio')
    .map((p) => {
      const rel = relative(sfxDir, p).split('\\').join('/')
      const own = !rel.includes('/')
      return item(root, p, own ? "Joe's own" : rel.split('/')[0], own ? "Joe's own" : rel.split('/').slice(0, -1).join('/'))
    })
    .sort((a, b) => Number(b.group === "Joe's own") - Number(a.group === "Joe's own") || a.path.localeCompare(b.path))
  return {
    stickers: stickerNames
      .filter((n) => existsSync(join(stickerDir, `${n}.png`)))
      .map((n) => item(root, join(stickerDir, `${n}.png`), 'stickers')),
    sfx,
    backgrounds: walk(join(gen, 'background'), 0).filter((p) => kindOf(p) === 'image').map((p) => item(root, p, 'backgrounds')),
    project: project ? walk(join(root, 'input', project)).filter((p) => kindOf(p) !== 'other').map((p) => item(root, p, project)) : []
  }
}

/** Copy dropped files into input/<project>/media/ (never overwrites: name-2.ext, name-3.ext…). */
export function importFiles(root: string, project: string, files: string[]): MediaItem[] {
  const dest = inside(root, `input/${project}/media`)
  mkdirSync(dest, { recursive: true })
  return files
    .filter((f) => existsSync(f) && statSync(f).isFile() && kindOf(f) !== 'other')
    .map((f) => {
      const ext = extname(f)
      const stem = basename(f, ext).replace(/[^\w.-]+/g, '-')
      let target = join(dest, `${stem}${ext}`)
      for (let n = 2; existsSync(target); n++) target = join(dest, `${stem}-${n}${ext}`)
      copyFileSync(f, target)
      return item(root, target, project)
    })
}
