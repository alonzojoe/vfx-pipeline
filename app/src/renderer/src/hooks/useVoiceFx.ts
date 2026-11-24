import { useCallback, useEffect, useState } from 'react'
import type { VoiceFx } from '../../../shared/types'

/** The channel's voice preset (brand.json "voiceFx") — Warm unless Joe picks another. */
export function useVoiceFx() {
  const [voiceFx, setState] = useState<VoiceFx>('warm')
  useEffect(() => {
    window.api.getVoiceFx().then(setState).catch(() => {})
  }, [])
  const setVoiceFx = useCallback(async (fx: VoiceFx): Promise<VoiceFx> => {
    const saved = await window.api.setVoiceFx(fx)
    setState(saved)
    return saved
  }, [])
  return { voiceFx, setVoiceFx }
}
