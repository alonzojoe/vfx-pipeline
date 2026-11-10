import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ProjectDetail, ProjectSummary } from '../../shared/types'
import { inside, vfxUrl } from './paths'
import { parseComposition } from './timeline'

type Script = { title?: string; lines?: { text: string; react?: string; cta?: boolean }[] }

const readJson = <T>(p: string, fallback: T): T => {
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as T
  } catch {
    return fallback
  }
}

const finalOf = (root: string, name: string): string | null => {
  const dir = join(root, 'output', name)
  if (!existsSync(dir)) return null
  const mp4 = readdirSync(dir).filter((f) => f.endsWith('.mp4'))
  const pick = mp4.find((f) => f === `${name}-FINAL.mp4`) ?? mp4[0]
  return pick ? `output/${name}/${pick}` : null
}

export function listProjects(root: string): ProjectSummary[] {
  const hf = join(root, 'hyperframes')
  return readdirSync(hf, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && existsSync(join(hf, d.name, 'script.json')))
    .map((d) => summary(root, d.name))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

function summary(root: string, name: string): ProjectSummary {
  const dir = inside(root, `hyperframes/${name}`)
  const script = readJson<Script>(join(dir, 'script.json'), {})
  return {
    name,
    title: script.title ?? name,
    hasVoice: existsSync(join(root, 'input', name, 'voice', 'script.mp3')),
    hasBuild: existsSync(join(dir, 'index.html')),
    hasFinal: !!finalOf(root, name),
    updatedAt: statSync(join(dir, 'script.json')).mtimeMs
  }
}

/** cta type logged for this project in TOPICS.md ("… · cta: like |") */
function ctaOf(root: string, name: string): string | null {
  try {
    const row = readFileSync(join(root, 'TOPICS.md'), 'utf8')
      .split('\n')
      .find((r) => r.includes(`| ${name} |`))
    return row?.match(/cta:\s*(\w+)/)?.[1] ?? null
  } catch {
    return null
  }
}

export function getProject(root: string, name: string): ProjectDetail {
  const dir = inside(root, `hyperframes/${name}`)
  const html = existsSync(join(dir, 'index.html')) ? readFileSync(join(dir, 'index.html'), 'utf8') : ''
  const parsed = parseComposition(html)
  // composition paths are relative to hyperframes/<p>/ (assets → input/<p>, general → input/general)
  const toRoot = (src: string): string =>
    src.startsWith('assets/') ? `input/${name}/${src.slice(7)}` : src.startsWith('general/') ? `input/${src}` : `hyperframes/${name}/${src}`
  for (const c of parsed.clips) if (c.src) c.src = toRoot(c.src)
  const script = readJson<Script>(join(dir, 'script.json'), {})
  const final = finalOf(root, name)
  const voice = `input/${name}/voice/script.mp3`
  return {
    ...summary(root, name),
    duration: parsed.duration,
    background: parsed.background,
    cta: ctaOf(root, name),
    clips: parsed.clips,
    compositionUrl: vfxUrl(`hyperframes/${name}/index.html`),
    finalUrl: final ? vfxUrl(final) : null,
    voiceUrl: existsSync(join(root, voice)) ? vfxUrl(voice) : null,
    lines: (script.lines ?? []).map((l) => ({ text: l.text, react: l.react }))
  }
}

/** Change the reaction sticker of one script line (script.json is the source of truth). */
export function setLineReaction(root: string, name: string, line: number, react: string): void {
  const file = inside(root, `hyperframes/${name}/script.json`)
  const script = JSON.parse(readFileSync(file, "utf8")) as Script
  if (!script.lines?.[line]) throw new Error(`No line ${line + 1} in ${name}`)
  script.lines[line].react = react
  writeFileSync(file, JSON.stringify(script, null, 2) + '\n')
}

export function gitBranch(root: string): string | null {
  try {
    const head = readFileSync(join(root, '.git', 'HEAD'), 'utf8').trim()
    return head.startsWith('ref: refs/heads/') ? head.slice(16) : head.slice(0, 7)
  } catch {
    return null
  }
}
