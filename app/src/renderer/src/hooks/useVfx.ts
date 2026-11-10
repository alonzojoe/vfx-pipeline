import { useCallback, useEffect, useState } from 'react'
import type { AppInfo, MediaLibrary, ProjectDetail, ProjectSummary } from '../../../shared/types'

/** App-wide data from the main process: vfx folder, projects, the open project and its media. */
export function useVfx() {
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [current, setCurrent] = useState<string | null>(null)
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [media, setMedia] = useState<MediaLibrary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    const list = await window.api.listProjects()
    setProjects(list)
    setCurrent((c) => (c && list.some((p) => p.name === c) ? c : (list[0]?.name ?? null)))
  }, [])

  const reload = useCallback(async () => {
    if (!current) return setProject(null)
    try {
      const [p, m] = await Promise.all([window.api.getProject(current), window.api.media(current)])
      setProject(p)
      setMedia(m)
      setError(null)
    } catch (e) {
      setError(String((e as Error).message ?? e))
    }
  }, [current])

  useEffect(() => {
    window.api.info().then((i) => {
      setInfo(i)
      if (i.root) loadProjects().catch((e) => setError(String(e)))
    })
  }, [loadProjects])

  useEffect(() => {
    reload()
    if (current) window.api.watchProject(current)
  }, [current, reload])

  useEffect(() => window.api.onProjectChanged((name) => name === current && reload()), [current, reload])

  const chooseRoot = useCallback(async () => {
    const i = await window.api.chooseRoot()
    setInfo(i)
    if (i.root) await loadProjects()
  }, [loadProjects])

  return { info, projects, current, setCurrent, project, media, error, reload, loadProjects, chooseRoot, setMedia }
}
