import type { BrowserWindow } from 'electron'
import type { ChildProcess } from 'node:child_process'
import type { ChatEvent } from '../../shared/types'
import { loginShell, q } from './shell'

let child: ChildProcess | null = null
let sessionId: string | null = null
let n = 0

const brief = (input: Record<string, unknown> = {}): string => {
  const v = input.file_path ?? input.command ?? input.pattern ?? input.path ?? input.url ?? input.description
  return typeof v === 'string' ? v.split('\n')[0].slice(0, 140) : JSON.stringify(input).slice(0, 140)
}

/**
 * Chat = Claude Code running headless in the vfx folder (`claude -p … --output-format stream-json`), so it reads
 * CLAUDE.md, BRAND.md, .claude/rules, agents and skills and edits the project like it does in the terminal.
 * Uses Joe's own Claude Code login — no API key in the app. Follow-ups resume the same session.
 */
export function sendChat(win: BrowserWindow, root: string, message: string, project: string | null, fresh: boolean): string {
  stopChat()
  if (fresh) sessionId = null
  const id = `chat-${++n}`
  const send = (e: ChatEvent): void => {
    if (!win.isDestroyed()) win.webContents.send('chat:event', e)
  }
  const prompt = project ? `[vfx Studio — open project: ${project} (hyperframes/${project})]\n\n${message}` : message
  const args = [
    'claude -p',
    q(prompt),
    '--output-format stream-json --verbose',
    '--permission-mode acceptEdits',
    sessionId ? `--resume ${q(sessionId)}` : ''
  ].join(' ')
  const proc = loginShell(args, { cwd: root })
  child = proc
  let buf = ''
  let errText = ''
  proc.stdout?.on('data', (b: Buffer) => {
    buf += b.toString()
    let i: number
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim()
      buf = buf.slice(i + 1)
      if (!line) continue
      let m: Record<string, any>
      try {
        m = JSON.parse(line)
      } catch {
        continue
      }
      if (m.session_id) sessionId = m.session_id
      if (m.type === 'assistant') {
        for (const part of m.message?.content ?? []) {
          if (part.type === 'text' && part.text?.trim()) send({ id, type: 'text', text: part.text })
          if (part.type === 'tool_use') send({ id, type: 'tool', name: part.name, detail: brief(part.input) })
        }
      } else if (m.type === 'result') {
        if (m.is_error) send({ id, type: 'error', text: String(m.result ?? m.subtype ?? 'Claude Code stopped') })
        send({ id, type: 'done', ok: !m.is_error, cost: m.total_cost_usd })
      }
    }
  })
  proc.stderr?.on('data', (b: Buffer) => (errText += b.toString()))
  proc.on('exit', (code) => {
    if (child === proc) child = null
    if (code && code !== 0 && code !== 143) {
      send({ id, type: 'error', text: errText.trim().slice(-800) || `claude exited with code ${code}` })
      send({ id, type: 'done', ok: false })
    }
  })
  return id
}

export function stopChat(): void {
  child?.kill('SIGTERM')
  child = null
}
