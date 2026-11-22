import { Notification, shell, type BrowserWindow } from 'electron'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { RunKind } from '../../shared/types'

/** The finished video in output/<project>/ (…-final_edit.mp4 / …-final-edit.mp4 / old …-FINAL.mp4), if any. */
function finalVideo(root: string, project: string): string | null {
  const dir = join(root, 'output', project)
  if (!existsSync(dir)) return null
  const f = readdirSync(dir).find((n) => /-(final[_-]edit|FINAL)\.mp4$/.test(n))
  return f ? join(dir, f) : null
}

/**
 * A normal macOS notification when a long run ends — the voice + preview of a reel is ready to watch, or an export is
 * done (click it → the video in Finder). Quick runs (a rebuild after a timeline edit, the review) stay silent.
 */
export function notifyRunEnd(win: BrowserWindow, root: string, kind: RunKind, project: string, code: number | null): void {
  if (!Notification.isSupported()) return
  const ok = code === 0
  let title: string
  let body: string
  let onClick = (): void => {
    if (win.isDestroyed()) return
    win.show()
    win.focus()
  }
  if (kind === 'voice') {
    title = ok ? 'Reel ready to watch' : 'Voice failed'
    body = ok ? `${project}: voice and preview are ready — press play.` : `${project}: the ElevenLabs voice could not be made. Open the app for the log.`
  } else if (kind === 'render' || kind === 'make') {
    const video = ok ? finalVideo(root, project) : null
    title = ok ? 'Export finished' : 'Export failed'
    body = ok ? `${project} is exported in full HD and ready to post.` : `${project}: the export stopped. Open the app for the log.`
    if (video) onClick = (): void => shell.showItemInFolder(video)
  } else return
  const n = new Notification({ title, body })
  n.on('click', onClick)
  n.show()
}
