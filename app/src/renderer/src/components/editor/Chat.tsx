import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Loader2, Plus, Sparkles, Square, Wrench } from 'lucide-react'
import type { ChatEvent } from '../../../../shared/types'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type Part = { kind: 'text' | 'tool' | 'error'; text: string; name?: string }
type Msg = { role: 'user' | 'claude'; id?: string; parts: Part[]; done?: boolean; cost?: number }

const STARTERS = [
  'Make a new reel from this script: ',
  'Review the open reel against REVIEW.md and list what to fix',
  'Fix what the last review found',
  'Suggest the next 5 topics we haven’t done (check TOPICS.md)'
]

export function Chat({ project, available }: { project: string | null; available: boolean }): JSX.Element {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)

  useEffect(
    () =>
      window.api.onChat((e: ChatEvent) => {
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
    await window.api.chat(m, project, fresh || msgs.length === 0)
  }

  if (!available) {
    return (
      <div className="flex flex-col gap-3 p-4 text-[13px] leading-relaxed">
        <div className="font-semibold">Connect Claude Code</div>
        <p className="text-muted-foreground">
          Chat runs Claude Code on this Mac inside your vfx folder (your own Claude login — no API key here). Install it once in Terminal:
        </p>
        <pre className="select-text rounded-lg border bg-[#17171a] p-3 font-mono text-xs">npm install -g @anthropic-ai/claude-code{'\n'}claude</pre>
        <p className="text-muted-foreground">Sign in when it asks, then reopen vfx Studio.</p>
      </div>
    )
  }

  return (
    <>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 p-3.5">
          {msgs.length === 0 && (
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
                  className="rounded-lg border border-[#2a2a2e] bg-[#17171a] px-3 py-2 text-left text-xs text-zinc-300 hover:border-primary/60"
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
                      <div key={j} className="flex items-center gap-1.5 truncate font-mono text-[11px] text-muted-foreground">
                        <Wrench className="h-3 w-3 shrink-0" />
                        <span className="text-zinc-400">{p.name}</span>
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
          {busy && msgs[msgs.length - 1]?.role === 'user' && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin text-primary" /> starting Claude Code…
            </div>
          )}
          <div ref={end} />
        </div>
      </ScrollArea>
      <div className="border-t border-[#1f1f23] p-2.5">
        <div className="rounded-xl border border-input bg-[#17171a] p-2">
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
            placeholder="Paste a new script, or ask for a change…"
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
            <span className="truncate text-[11px] text-muted-foreground">Claude Code · vfx folder</span>
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
