import { useCallback, useLayoutEffect, useRef } from 'react'

/**
 * A function whose identity never changes but always calls the latest version — lets App pass callbacks to
 * memo()'d panels without re-rendering them every time App renders.
 */
export function useStable<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn)
  useLayoutEffect(() => {
    ref.current = fn
  })
  return useCallback((...args: A) => ref.current(...args), [])
}
