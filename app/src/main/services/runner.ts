import type { BrowserWindow } from 'electron'
import type { ChildProcess } from 'node:child_process'
import type { RunEvent, RunKind } from '../../shared/types'
import { loginShell, q } from './shell'

const COMMANDS: Record<RunKind, (p: string) => string> = {
  make: (p) => `./hyperframes/${q(p)}/make.sh`, // voice (if missing/changed) → build → render
  build: (p) => `node hyperframes/${q(p)}/build.mjs`,
  render: (p) => `./scripts/render.sh ${q(p)} hf`,
  review: (p) => `./scripts/review.sh ${q(p)}`
}

const runs = new Map<string, ChildProcess>()
let n = 0

/** Run one of the pipeline scripts in the vfx folder and stream its output to the window. */
export function startRun(win: BrowserWindow, root: string, kind: RunKind, project: string): string {
  if (!/^[\w.-]+$/.test(project)) throw new Error(`Bad project name: ${project}`)
  const runId = `${kind}-${++n}`
  const command = COMMANDS[kind](project)
  const send = (e: RunEvent): void => {
    if (!win.isDestroyed()) win.webContents.send('run:event', e)
  }
  send({ runId, type: 'start', kind, project, command })
  const child = loginShell(command, { cwd: root })
  runs.set(runId, child)
  const out = (b: Buffer): void => send({ runId, type: 'log', text: b.toString() })
  child.stdout?.on('data', out)
  child.stderr?.on('data', out)
  child.on('error', (e) => send({ runId, type: 'log', text: `\n${e.message}\n` }))
  child.on('exit', (code) => {
    runs.delete(runId)
    send({ runId, type: 'exit', code })
  })
  return runId
}

export function stopRun(runId: string): void {
  runs.get(runId)?.kill('SIGTERM')
}
