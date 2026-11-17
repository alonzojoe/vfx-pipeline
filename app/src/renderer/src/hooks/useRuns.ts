import { useCallback, useEffect, useRef, useState } from 'react'
import type { RunKind } from '../../../shared/types'

export type Run = { runId: string; kind: RunKind; project: string; command: string; log: string; code?: number | null; done: boolean }

/** Pipeline runs (make / build / render / review) started from the app, with their live logs. */
export function useRuns(onDone?: (run: Run) => void) {
  const [runs, setRuns] = useState<Run[]>([])
  const done = useRef(onDone)
  done.current = onDone

  // the list lives in a ref too, so events are applied exactly once outside React's state updaters
  // (StrictMode calls updaters twice in dev — onDone used to fire twice: two reviews after one Export)
  const list = useRef<Run[]>([])
  useEffect(() => {
    const commit = (next: Run[]): void => {
      list.current = next
      setRuns(next)
    }
    // renders and builds print hundreds of lines a second: collect them and update the UI at most ~10×/s
    const pending = new Map<string, string>()
    let timer: ReturnType<typeof setTimeout> | null = null
    const withLogs = (rs: Run[]): Run[] => {
      if (!pending.size) return rs
      const out = rs.map((r) => (pending.has(r.runId) ? { ...r, log: (r.log + pending.get(r.runId)).slice(-40000) } : r))
      pending.clear()
      return out
    }
    const flush = (): void => {
      timer = null
      commit(withLogs(list.current))
    }
    const off = window.api.onRun((e) => {
      if (e.type === 'log') {
        pending.set(e.runId, (pending.get(e.runId) ?? '') + e.text)
        timer ??= setTimeout(flush, 100)
        return
      }
      const rs = withLogs(list.current) // never lose the last lines before start/exit
      if (e.type === 'start') {
        commit([...rs.slice(-9), { runId: e.runId, kind: e.kind, project: e.project, command: e.command, log: '', done: false }])
        return
      }
      const run = rs.find((r) => r.runId === e.runId)
      if (!run) return commit(rs)
      const finished = { ...run, code: e.code, done: true }
      commit(rs.map((r) => (r === run ? finished : r)))
      setTimeout(() => done.current?.(finished), 0)
    })
    return () => {
      off()
      if (timer) clearTimeout(timer)
    }
  }, [])

  const active = runs.find((r) => !r.done) ?? null
  const start = useCallback((kind: RunKind, project: string) => window.api.run(kind, project), [])
  const stop = useCallback(() => active && window.api.stopRun(active.runId), [active])
  return { runs, active, last: runs[runs.length - 1] ?? null, start, stop }
}
