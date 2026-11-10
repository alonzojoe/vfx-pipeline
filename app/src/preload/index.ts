import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  AppInfo,
  ChatEvent,
  MediaItem,
  MediaLibrary,
  Overrides,
  ProjectDetail,
  ProjectSummary,
  RunEvent,
  RunKind
} from '../shared/types'

const on = <T>(channel: string, cb: (payload: T) => void): (() => void) => {
  const fn = (_: unknown, payload: T): void => cb(payload)
  ipcRenderer.on(channel, fn)
  return () => ipcRenderer.removeListener(channel, fn)
}

const api = {
  info: (): Promise<AppInfo> => ipcRenderer.invoke('app:info'),
  chooseRoot: (): Promise<AppInfo> => ipcRenderer.invoke('app:chooseRoot'),
  listProjects: (): Promise<ProjectSummary[]> => ipcRenderer.invoke('projects:list'),
  getProject: (name: string): Promise<ProjectDetail> => ipcRenderer.invoke('projects:get', name),
  /** + New reel: creates and returns the draft project name (new-reel, new-reel-2, …) */
  createProject: (): Promise<string> => ipcRenderer.invoke('projects:create'),
  watchProject: (name: string): Promise<void> => ipcRenderer.invoke('projects:watch', name),
  onProjectChanged: (cb: (name: string) => void): (() => void) => on('project:changed', cb),
  setLineReaction: (name: string, line: number, react: string): Promise<void> =>
    ipcRenderer.invoke('projects:setReaction', name, line, react),
  media: (project?: string): Promise<MediaLibrary> => ipcRenderer.invoke('media:list', project),
  importFiles: (project: string, paths: string[]): Promise<MediaItem[]> => ipcRenderer.invoke('media:import', project, paths),
  /** absolute path of a file dropped from Finder */
  pathForFile: (file: File): string => webUtils.getPathForFile(file),
  getOverrides: (project: string): Promise<Overrides> => ipcRenderer.invoke('overrides:get', project),
  setOverrides: (project: string, o: Overrides): Promise<void> => ipcRenderer.invoke('overrides:set', project, o),
  openPath: (rel: string): Promise<string> => ipcRenderer.invoke('shell:open', rel),
  reveal: (rel: string): Promise<void> => ipcRenderer.invoke('shell:reveal', rel),
  run: (kind: RunKind, project: string): Promise<string> => ipcRenderer.invoke('run:start', kind, project),
  stopRun: (runId: string): Promise<void> => ipcRenderer.invoke('run:stop', runId),
  onRun: (cb: (e: RunEvent) => void): (() => void) => on('run:event', cb),
  chat: (message: string, project: string | null, fresh: boolean): Promise<string> =>
    ipcRenderer.invoke('chat:send', message, project, fresh),
  stopChat: (): Promise<void> => ipcRenderer.invoke('chat:stop'),
  onChat: (cb: (e: ChatEvent) => void): (() => void) => on('chat:event', cb)
}

export type VfxApi = typeof api

contextBridge.exposeInMainWorld('electron', electronAPI)
contextBridge.exposeInMainWorld('api', api)
