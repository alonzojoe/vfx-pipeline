import { BrowserWindow, dialog, ipcMain, nativeTheme, shell } from 'electron'
import { existsSync, watch, type FSWatcher } from 'node:fs'
import { join } from 'node:path'
import type { AppInfo, Overrides, RunKind, ThemeSource } from '../shared/types'
import { importFiles, mediaLibrary } from './services/media'
import { readOverrides, writeOverrides } from './services/overrides'
import { inside } from './services/paths'
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
function watchProject(win: BrowserWindow, name: string): void {
  watchers.forEach((w) => w.close())
  watchers = []
  const root = getRoot()
  if (!root) return
  const ping = (): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => !win.isDestroyed() && win.webContents.send('project:changed', name), 350)
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

export function registerIpc(win: BrowserWindow): void {
  ipcMain.on('theme:initial', (e) => (e.returnValue = themeState())) // sync, read by the preload before first paint
  ipcMain.handle('theme:get', () => themeState())
  ipcMain.handle('theme:set', (_e, source: ThemeSource) => {
    setTheme(source)
    nativeTheme.themeSource = getTheme()
    return themeState()
  })
  // macOS appearance changed (or themeSource did): keep the window background in step and tell the UI
  nativeTheme.on('updated', () => {
    if (win.isDestroyed()) return
    win.setBackgroundColor(windowBackground())
    win.webContents.send('theme:changed', themeState())
  })

  ipcMain.handle('app:info', () => appInfo())
  ipcMain.handle('app:chooseRoot', async () => {
    const r = await dialog.showOpenDialog(win, {
      title: 'Choose your vfx folder',
      message: 'Pick the vfx folder (the one with hyperframes/, scripts/ and input/)',
      properties: ['openDirectory']
    })
    if (!r.canceled && r.filePaths[0] && !setRoot(r.filePaths[0])) {
      await dialog.showMessageBox(win, { type: 'warning', message: 'That folder has no hyperframes/ and scripts/ — pick the vfx folder.' })
    }
    return appInfo()
  })
  ipcMain.handle('projects:list', () => listProjects(need()))
  ipcMain.handle('projects:create', () => createProject(need()))
  ipcMain.handle('projects:get', (_e, name: string) => getProject(need(), name))
  ipcMain.handle('projects:watch', (_e, name: string) => watchProject(win, name))
  ipcMain.handle('projects:setReaction', (_e, name: string, line: number, react: string) => setLineReaction(need(), name, line, react))
  ipcMain.handle('media:list', (_e, project?: string) => mediaLibrary(need(), project))
  ipcMain.handle('media:import', (_e, project: string, files: string[]) => importFiles(need(), project, files))
  ipcMain.handle('overrides:get', (_e, project: string) => readOverrides(need(), project))
  ipcMain.handle('overrides:set', (_e, project: string, o: Overrides) => writeOverrides(need(), project, o))
  ipcMain.handle('run:start', (_e, kind: RunKind, project: string) => startRun(win, need(), kind, project))
  ipcMain.handle('run:stop', (_e, runId: string) => stopRun(runId))
  ipcMain.handle('chat:send', (_e, message: string, project: string | null, fresh: boolean) =>
    sendChat(win, need(), message, project, fresh)
  )
  ipcMain.handle('chat:stop', () => stopChat())
  ipcMain.handle('shell:open', (_e, rel: string) => shell.openPath(inside(need(), rel)))
  ipcMain.handle('shell:reveal', (_e, rel: string) => shell.showItemInFolder(inside(need(), rel)))
}
