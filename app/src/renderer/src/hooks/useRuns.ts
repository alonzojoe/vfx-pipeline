import { useCallback, useEffect, useState } from 'react'
import type { RunKind } from '../../../shared/types'

export type Run = { runId: string; kind: RunKind; project: string; command: string; log: string; code?: number | null; done: boolean }

/** Pipeline runs (make / build / render / review) started from the app, with their live logs. */
export function useRuns(onDone?: (run: Run) => void) {
  const [runs, setRuns] = useState<Run[]>([])

  useEffect(
    () =>
      window.api.onRun((e) => {
        setRuns((rs) => {
          if (e.type === 'start') return [...rs.slice(-9), { runId: e.runId, kind: e.kind, project: e.project, command: e.command, log: '', done: false }]
          return rs.map((r) => {
            if (r.runId !== e.runId) return r
            if (e.type === 'log') return { ...r, log: (r.log + e.text).slice(-60000) }
            const done = { ...r, code: e.code, done: true }
            setTimeout(() => onDone?.(done), 0)
            return done
          })
        })
      }),
    [onDone]
  )

  const active = runs.find((r) => !r.done) ?? null
  const start = useCallback((kind: RunKind, project: string) => window.api.run(kind, project), [])
  const stop = useCallback(() => active && window.api.stopRun(active.runId), [active])
  return { runs, active, last: runs[runs.length - 1] ?? null, start, stop }
}
