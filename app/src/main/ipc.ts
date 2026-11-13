import { BrowserWindow, dialog, ipcMain, nativeTheme, shell } from 'electron'
import { existsSync, watch, type FSWatcher } from 'node:fs'
import { join } from 'node:path'
import type { AppInfo, Overrides, RunKind, ThemeSource } from '../shared/types'
import { importFiles, mediaLibrary } from './services/media'
import { readOverrides, writeOverrides } from './services/overrides'
import { inside, projectName } from './services/paths'
import { createProject, getProject, gitBranch, listProjects, setLineReaction } from './services/projects'
import { getRoot, getTheme, setRoot, setTheme } from './services/settings'
import { themeState, windowBackground } from './services/theme'
import { hasClaude } from './services/shell'
import { startRun, stopRun } from './services/runner'
import { sendChat, stopChat } from './services/chat'

const need = (): string => {
  const r = getRoot()
  if (!r) throw new Error('Choose your vfx folder first')
  return r
}

let watchers: FSWatcher[] = []
let timer: NodeJS.Timeout | null = null

/** Tell the renderer when a project's files change (build, render, chat edits) so the editor reloads. */
function watchProject(win: () => BrowserWindow | null, name: string): void {
  watchers.forEach((w) => w.close())
  watchers = []
  const root = getRoot()
  if (!root) return
  const ping = (): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      const w = win()
      if (w && !w.isDestroyed()) w.webContents.send('project:changed', name)
    }, 350)
  }
  for (const rel of [`hyperframes/${name}`, `output/${name}`, `input/${name}`, `input/${name}/voice`]) {
    const dir = join(root, rel)
    if (existsSync(dir)) watchers.push(watch(dir, ping))
  }
}

export async function appInfo(): Promise<AppInfo> {
  const root = getRoot()
  return { root, branch: root ? gitBranch(root) : null, claudeAvailable: await hasClaude() }
}

/** Folders the renderer may reveal in Finder (renders, reviews, project folders). */
const revealable = (rel: string): string => {
  if (!/^(output|hyperframes)\//.test(rel) || rel.split('/').some((p) => p.startsWith('.'))) throw new Error(`Can't reveal ${rel}`)
  return inside(need(), rel)
}

const RUN_KINDS: RunKind[] = ['make', 'voice', 'build', 'render', 'review']
const THEMES: ThemeSource[] = ['system', 'light', 'dark']

/**
 * Register every IPC handler ONCE. Handlers act on the current main window (macOS keeps the app alive after the
 * window closes; clicking the dock icon makes a new window — registering again would throw and crash).
 * Every value from the renderer is checked here: project names, run kinds, paths.
 */
export function registerIpc(win: () => BrowserWindow | null): void {
  const must = (): BrowserWindow => {
    const w = win()
    if (!w || w.isDestroyed()) throw new Error('No window')
    return w
  }
  ipcMain.on('theme:initial', (e) => (e.returnValue = themeState())) // sync, read by the preload before first paint
  ipcMain.handle('theme:get', () => themeState())
  ipcMain.handle('theme:set', (_e, source: ThemeSource) => {
    if (!THEMES.includes(source)) throw new Error(`Bad theme: ${String(source)}`)
    setTheme(source)
    nativeTheme.themeSource = getTheme()
    return themeState()
  })
  // macOS appearance changed (or themeSource did): keep the window background in step and tell the UI
  nativeTheme.on('updated', () => {
    const w = win()
    if (!w || w.isDestroyed()) return
    w.setBackgroundColor(windowBackground())
    w.webContents.send('theme:changed', themeState())
  })

  ipcMain.handle('app:info', () => appInfo())
  ipcMain.handle('app:chooseRoot', async () => {
    const w = must()
    const r = await dialog.showOpenDialog(w, {
      title: 'Choose your vfx folder',
      message: 'Pick the vfx folder (the one with hyperframes/, scripts/ and input/)',
      properties: ['openDirectory']
    })
    if (!r.canceled && r.filePaths[0] && !setRoot(r.filePaths[0])) {
      await dialog.showMessageBox(w, { type: 'warning', message: 'That folder has no hyperframes/ and scripts/ — pick the vfx folder.' })
    }
    return appInfo()
  })
  ipcMain.handle('projects:list', () => listProjects(need()))
  ipcMain.handle('projects:create', () => createProject(need()))
  ipcMain.handle('projects:get', (_e, name: string) => getProject(need(), projectName(name)))
  ipcMain.handle('projects:watch', (_e, name: string) => watchProject(win, projectName(name)))
  ipcMain.handle('projects:setReaction', (_e, name: string, line: number, react: string) => {
    if (!Number.isInteger(line) || line < 0 || typeof react !== 'string' || !/^[\w -]{1,60}$/.test(react)) throw new Error('Bad reaction')
    return setLineReaction(need(), projectName(name), line, react)
  })
  ipcMain.handle('media:list', (_e, project?: string) => mediaLibrary(need(), project == null ? undefined : projectName(project)))
  ipcMain.handle('media:import', (_e, project: string, files: string[]) => {
    if (!Array.isArray(files) || !files.every((f) => typeof f === 'string')) throw new Error('Bad file list')
    return importFiles(need(), projectName(project), files)
  })
  ipcMain.handle('overrides:get', (_e, project: string) => readOverrides(need(), projectName(project)))
  ipcMain.handle('overrides:set', (_e, project: string, o: Overrides) => writeOverrides(need(), projectName(project), o))
  ipcMain.handle('run:start', (_e, kind: RunKind, project: string) => {
    if (!RUN_KINDS.includes(kind)) throw new Error(`Bad run: ${String(kind)}`)
    return startRun(must(), need(), kind, projectName(project))
  })
  ipcMain.handle('run:stop', (_e, runId: string) => stopRun(String(runId)))
  ipcMain.handle('chat:send', (_e, message: string, project: string | null, fresh: boolean) =>
    sendChat(must(), need(), String(message), project == null ? null : projectName(project), !!fresh)
  )
  ipcMain.handle('chat:stop', () => stopChat())
  ipcMain.handle('shell:reveal', (_e, rel: string) => shell.showItemInFolder(revealable(String(rel))))
}
