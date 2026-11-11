import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Check, Loader2, Plus, Sparkles, Square, Wrench } from 'lucide-react'
import type { ChatEvent } from '../../../../shared/types'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type Part = { kind: 'text' | 'tool' | 'error'; text: string; name?: string }
type Msg = { role: 'user' | 'claude'; id?: string; parts: Part[]; done?: boolean; cost?: number }

const STARTERS = [
  'Review the open reel against REVIEW.md and list what to fix',
  'Fix what the last review found',
  'Suggest the next 5 topics we haven’t done (check TOPICS.md)'
]

type Build = { renamed?: string; script: boolean; cards: boolean; done: boolean; ok: boolean }
export type VoiceState = 'todo' | 'doing' | 'done' | 'failed'

type Props = {
  project: string | null
  available: boolean
  /** the open reel is a "+ New reel" draft waiting for a script */
  draft: boolean
  /** ElevenLabs voice run for the open reel (the app starts it after the script is in) */
  voice: VoiceState
  /** the app's preview build right after the script is in */
  preview: VoiceState
  onRenamed: (to: string) => void
  /** newReel = this reply was building a "+ New reel"; edited = Claude changed files (→ the app rebuilds) */
  onDone: (ok: boolean, newReel: boolean, edited: boolean) => void
  /** bumps on every "+ New reel" → fresh conversation */
  newKey: number
}

/** New-reel checklist shown while Claude builds it and the app makes the voice. */
function BuildChecklist({ b, voice, preview }: { b: Build; voice: VoiceState; preview: VoiceState }): JSX.Element {
  const steps: [string, boolean, boolean][] = [
    [b.renamed ? `Named ${b.renamed}` : 'Naming the reel from your topic', !!b.renamed, !b.renamed],
    ['Script → lines, pairs, recap, CTA', b.script, !!b.renamed && !b.script],
    ['Cards with your name', b.cards, b.script && !b.cards],
    ['Preview built', preview === 'done', b.done && preview === 'doing'],
    ['Voice — ElevenLabs', voice === 'done', b.done && voice === 'doing'],
    ['Timeline synced to the voice', voice === 'done', false]
  ]
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-surface p-3">
      {steps.map(([label, ok, doing]) => (
        <div key={label} className={cn('flex items-center gap-2 text-sm', ok ? 'text-foreground' : doing ? 'text-foreground' : 'text-muted-foreground')}>
          <span
            className={cn(
              'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full',
              ok ? 'bg-emerald-600 text-white' : doing ? 'bg-primary text-white' : 'bg-secondary'
            )}
          >
            {ok ? <Check className="h-3 w-3" strokeWidth={3} /> : doing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          </span>
          {label}
        </div>
      ))}
      {preview === 'failed' && <div className="text-sm text-red-300">The preview build failed — see the log; ask me to fix it.</div>}
      {voice === 'failed' && <div className="text-sm text-red-300">The voice step failed — see the log, then press Export or ask me to fix it.</div>}
    </div>
  )
}

export function Chat({ project, available, draft, voice, preview, onRenamed, onDone, newKey }: Props): JSX.Element {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [build, setBuild] = useState<Build | null>(null)
  const end = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const edited = useRef(false)
  const buildRef = useRef(build)
  buildRef.current = build
  const cb = useRef({ onRenamed, onDone })
  cb.current = { onRenamed, onDone }

  // a fresh "+ New reel": new conversation, focus the box for the script
  useEffect(() => {
    if (!newKey) return
    setMsgs([])
    setBuild(null)
    window.api.stopChat()
    setBusy(false)
    input.current?.focus()
  }, [newKey])

  useEffect(
    () =>
      window.api.onChat((e: ChatEvent) => {
        if (e.type === 'renamed') {
          setBuild((b) => b && { ...b, renamed: e.to })
          cb.current.onRenamed(e.to)
          return
        }
        if (e.type === 'tool' && /^(Edit|Write|MultiEdit|NotebookEdit)$/.test(e.name)) edited.current = true
        if (e.type === 'tool') {
          const d = e.detail
          setBuild(
            (b) =>
              b && {
                ...b,
                script: b.script || (/Write|Edit/.test(e.name) && d.includes('script.json')),
                cards: b.cards || (/Edit|Write/.test(e.name) && d.includes('build.mjs'))
              }
          )
        }
        if (e.type === 'done') {
          const b = buildRef.current
          cb.current.onDone(e.ok, !!b && !b.done, edited.current)
          edited.current = false
          setBuild((x) => x && { ...x, done: true, ok: e.ok })
        }
        setMsgs((ms) => {
          const last = ms[ms.length - 1]
          const cur: Msg = last?.role === 'claude' && last.id === e.id ? last : { role: 'claude', id: e.id, parts: [] }
          let next: Msg = cur
          if (e.type === 'text') next = { ...cur, parts: [...cur.parts, { kind: 'text', text: e.text }] }
          if (e.type === 'tool') next = { ...cur, parts: [...cur.parts, { kind: 'tool', text: e.detail, name: e.name }] }
          if (e.type === 'error') next = { ...cur, parts: [...cur.parts, { kind: 'error', text: e.text }] }
          if (e.type === 'done') {
            next = { ...cur, done: true, cost: e.cost }
            setBusy(false)
          }
          return cur === last ? [...ms.slice(0, -1), next] : [...ms, next]
        })
      }),
    []
  )
  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [msgs])

  const send = async (fresh = false): Promise<void> => {
    const m = text.trim()
    if (!m || busy) return
    setText('')
    setBusy(true)
    setMsgs((ms) => [...ms, { role: 'user', parts: [{ kind: 'text', text: m }] }])
    if (draft) setBuild({ script: false, cards: false, done: false, ok: false })
    await window.api.chat(m, project, fresh || msgs.length === 0)
  }

  if (!available) {
    return (
      <div className="flex flex-col gap-3 p-4 text-sm leading-relaxed">
        <div className="font-semibold">Connect Claude Code</div>
        <p className="text-muted-foreground">
          Chat runs Claude Code on this Mac inside your vfx folder (your own Claude login — no API key here). Install it once in Terminal:
        </p>
        <pre className="select-text rounded-lg border bg-surface p-3 font-mono text-xs">npm install -g @anthropic-ai/claude-code{'\n'}claude</pre>
        <p className="text-muted-foreground">Sign in when it asks, then reopen vfx Studio.</p>
      </div>
    )
  }

  return (
    <>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 p-3.5">
          {msgs.length === 0 && draft && (
            <div className="flex gap-2">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </span>
              <div className="flex flex-col gap-2 leading-relaxed">
                <div className="font-semibold">Created {project} · paste your script</div>
                <p className="text-foreground">
                  Paste it like you always do (with the [0–3s] parts, or just the lines). I'll name the reel from the topic, keep your words, add the
                  cards with your name, pick stickers and sounds — then the app makes the voice with ElevenLabs and builds the timeline.
                </p>
                <p className="text-xs text-muted-foreground">No script yet? Type a topic, e.g. "revenue vs profit", and I'll write one in your style.</p>
              </div>
            </div>
          )}
          {msgs.length === 0 && !draft && (
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground">
                Talk to Claude Code about <span className="text-foreground">{project ?? 'your reels'}</span>. It follows BRAND.md, REVIEW.md and your
                .claude rules, edits the files and commits like in the terminal.
              </p>
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setText(s)
                    input.current?.focus()
                  }}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-left text-xs text-foreground hover:border-primary/60"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {msgs.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="max-w-[88%] select-text self-end whitespace-pre-wrap rounded-xl rounded-br-sm bg-secondary px-3 py-2 leading-snug">
                {m.parts[0]?.text}
              </div>
            ) : (
              <div key={i} className="flex gap-2">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </span>
                <div className="flex min-w-0 flex-col gap-1.5">
                  {m.parts.map((p, j) =>
                    p.kind === 'tool' ? (
                      <div key={j} className="flex items-center gap-1.5 truncate font-mono text-xs text-muted-foreground">
                        <Wrench className="h-3 w-3 shrink-0" />
                        <span className="text-muted-foreground">{p.name}</span>
                        <span className="truncate">{p.text}</span>
                      </div>
                    ) : (
                      <div key={j} className={cn('select-text whitespace-pre-wrap leading-relaxed', p.kind === 'error' && 'text-red-300')}>
                        {p.text}
                      </div>
                    )
                  )}
                  {!m.done && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin text-primary" /> working…
                    </div>
                  )}
                </div>
              </div>
            )
          )}
          {build && <BuildChecklist b={build} voice={voice} preview={preview} />}
          {busy && msgs[msgs.length - 1]?.role === 'user' && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin text-primary" /> starting Claude Code…
            </div>
          )}
          <div ref={end} />
        </div>
      </ScrollArea>
      <div className="border-t border-subtle p-2.5">
        <div className={cn('rounded-xl border bg-surface p-2', draft && msgs.length === 0 ? 'border-primary ring-2 ring-primary/20' : 'border-input')}>
          <Textarea
            ref={input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            rows={3}
            aria-label="Message Claude Code"
            placeholder={draft ? 'Paste your script here…' : 'Paste a new script, or ask for a change…'}
            className="min-h-0 resize-none border-0 p-1 shadow-none focus-visible:ring-0"
          />
          <div className="mt-1.5 flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMsgs([])
                window.api.stopChat()
                setBusy(false)
              }}
            >
              <Plus />
              New chat
            </Button>
            <span className="truncate text-xs text-muted-foreground">Claude Code · vfx folder</span>
            <div className="flex-1" />
            {busy ? (
              <Button size="icon-sm" variant="secondary" aria-label="Stop" onClick={() => window.api.stopChat().then(() => setBusy(false))}>
                <Square />
              </Button>
            ) : (
              <Button size="icon-sm" aria-label="Send" onClick={() => send()} disabled={!text.trim()}>
                <ArrowUp />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
