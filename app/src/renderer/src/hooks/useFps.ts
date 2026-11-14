import { useCallback, useEffect, useState } from 'react'
import type { Fps } from '../../../shared/types'

/** The export frame rate (30 / 60) — saved by the main process, used by Export / Make and the preview's frame step. */
export function useFps() {
  const [fps, setState] = useState<Fps>(30)
  useEffect(() => {
    window.api.getFps().then(setState)
  }, [])
  const setFps = useCallback((f: Fps) => {
    window.api.setFps(f).then(setState)
  }, [])
  return { fps, setFps }
}
