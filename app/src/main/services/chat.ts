import type { BrowserWindow } from 'electron'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ChildProcess } from 'node:child_process'
import type { ChatEvent } from '../../shared/types'
import { loginShell, q } from './shell'

/** A reel made with "+ New reel" has a script.json with no lines yet. */
function isDraft(root: string, project: string): boolean {
  try {
    return !JSON.parse(readFileSync(join(root, 'hyperframes', project, 'script.json'), 'utf8')).lines?.length
  } catch {
    return false
  }
}

/** What Claude Code does with a pasted script in a new reel (spec 0003). The app makes the voice afterwards. */
const newReelPrompt = (p: string, content: string): string => `[vfx Studio — NEW REEL. The draft project is hyperframes/${p}: the app just created it with build.mjs, make.sh and a script.json that has the voice + sound settings but no lines.]
Joe pasted the content below. Do this in order, without asking questions:
1. Pick a short kebab-case name from the topic (2–4 words, e.g. revenue-vs-profit) and FIRST run: ./scripts/rename-project.sh ${p} <name>
   Use the exact name it prints ("renamed ${p} → <name>") from then on.
2. Write hyperframes/<name>/script.json in the format of the newest finished reel's script.json, following BRAND.md §2 and .claude/agents/script-writer.md: keep Joe's words verbatim (only split them into lines), hook first, pairs/cards with show/focus, actions on spoken words, his recap as a 2×2 recap, CTA line {"text":"auto","cta":true} unless his script already ends with a CTA, a title, pauses only on big beats. If he gave a topic instead of a script, write a ~30s script in BRAND.md style.
3. Update the CARDS map in hyperframes/<name>/build.mjs for this topic — Joe's name in every mock UI, numbers that add up.
4. Add the TOPICS.md row for <name> (today's date, topic, format, hook, voice) with \`bg: auto · cta: auto\` in the Background column — the app fills both in after it builds.
Write and change files only with your Edit/Write tools — never through node/python/shell scripts. The only command you may run is the rename script (and ls).
Do NOT build, generate the voice or render: right after you finish, the app builds the preview, then makes the ElevenLabs voice. Do not commit. Finish with two short lines: what you built and anything Joe should check.

Joe's content:
${content}`

/**
 * Commands the chat may run without a prompt (headless Claude Code can't ask). Passed on the command line because
 * .claude/settings.json allow rules are ignored until the folder has been trusted in an interactive session.
 */
const ALLOWED = [
  'Bash(./scripts/rename-project.sh:*)',
  'Bash(./scripts/review.sh:*)',
  'Bash(npx hyperframes:*)',
  'Bash(ls:*)',
  'Bash(git status:*)',
  'Bash(git diff:*)',
  'Bash(git log:*)',
  'Bash(git add:*)',
  'Bash(git commit:*)'
]

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
  const prompt = !project
    ? message
    : isDraft(root, project)
      ? newReelPrompt(project, message)
      : `[vfx Studio — open project: ${project} (hyperframes/${project}). Joe is asking for a revision. Change script.json / build.mjs / overrides.json with your Edit/Write tools only. Don't build, voice or render: when you finish, the app rebuilds by itself and regenerates the ElevenLabs voice only if the spoken words changed — say so in one line if your change alters the words (it costs voice credits). Don't commit.]\n\n${message}`
  const args = [
    'claude -p',
    q(prompt),
    '--output-format stream-json --verbose',
    '--permission-mode acceptEdits',
    `--allowedTools ${ALLOWED.map(q).join(' ')}`,
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
      } else if (m.type === 'user') {
        // tool output: follow a new reel's auto-rename
        for (const part of m.message?.content ?? []) {
          const text = typeof part.content === 'string' ? part.content : (part.content ?? []).map((c: { text?: string }) => c.text ?? '').join('')
          const r = /renamed ([\w.-]+) → ([\w.-]+)/.exec(text ?? '')
          if (part.type === 'tool_result' && r) send({ id, type: 'renamed', from: r[1], to: r[2] })
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
