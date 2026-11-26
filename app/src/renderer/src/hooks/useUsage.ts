import { useCallback, useEffect, useState } from 'react'
import type { Usage } from '../../../shared/types'

type Which = 'eleven' | 'claude'
const STALE_MS = 15 * 60_000

/**
 * ElevenLabs credits + Claude plan limits for the title bar. Shows the last saved readings at once, then asks
 * ElevenLabs (free) and — when the Claude reading is older than 15 minutes — Claude Code. Chat runs update the
 * Claude bar by themselves.
 */
export function useUsage() {
  const [usage, setUsage] = useState<Usage>({ eleven: null, claude: null })
  const [busy, setBusy] = useState<Record<Which, boolean>>({ eleven: false, claude: false })

  const refresh = useCallback(async (which: Which): Promise<void> => {
    setBusy((b) => ({ ...b, [which]: true }))
    try {
      setUsage(await window.api.refreshUsage(which))
    } catch {
      // keep the last reading
    } finally {
      setBusy((b) => ({ ...b, [which]: false }))
    }
  }, [])

  useEffect(() => {
    const off = window.api.onUsage(setUsage)
    window.api
      .getUsage()
      .then((u) => {
        setUsage(u)
        void refresh('eleven')
        if (!u.claude || Date.now() - u.claude.at > STALE_MS) void refresh('claude')
      })
      .catch(() => {})
    return off
  }, [refresh])

  return { usage, busy, refresh }
}
