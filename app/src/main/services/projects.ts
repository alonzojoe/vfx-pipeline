import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ProjectDetail, ProjectSummary } from '../../shared/types'
import { inside, vfxUrl } from './paths'
import { parseComposition } from './timeline'

type Script = { title?: string; lines?: { text: string; react?: string; cta?: boolean }[]; [k: string]: unknown }

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
    draft: !script.lines?.length,
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

/**
 * "+ New reel": create and open a draft reel named new-reel (new-reel-2, … if taken), ready for dropped files and a
 * pasted script. It copies build.mjs + make.sh (+ voice/sfx settings) from the newest finished reel; Claude renames
 * it from the topic and writes the lines (scripts/rename-project.sh).
 */
export function createProject(root: string, base = 'new-reel'): string {
  let name = base
  for (let n = 2; ['hyperframes', 'input', 'output'].some((d) => existsSync(join(root, d, name))); n++) name = `${base}-${n}`
  const tpl = listProjects(root).find((p) => !p.draft && existsSync(join(root, 'hyperframes', p.name, 'build.mjs')))
  const dir = join(root, 'hyperframes', name)
  mkdirSync(dir, { recursive: true })
  mkdirSync(join(root, 'input', name, 'media'), { recursive: true })
  mkdirSync(join(root, 'output', name), { recursive: true })
  symlinkSync(`../../input/${name}`, join(dir, 'assets'))
  symlinkSync('../../input/general', join(dir, 'general'))
  symlinkSync('../vendor', join(dir, 'vendor'))
  for (const f of ['meta.json', 'hyperframes.json']) {
    const t = join(root, 'hyperframes', '_template', f)
    if (existsSync(t)) writeFileSync(join(dir, f), readFileSync(t, 'utf8').replace(/__PROJECT__/g, name))
  }
  let script: Script = { title: 'New reel', lines: [] }
  if (tpl) {
    const src = join(root, 'hyperframes', tpl.name)
    for (const f of ['build.mjs', 'make.sh']) if (existsSync(join(src, f))) copyFileSync(join(src, f), join(dir, f))
    const t = readJson<Script>(join(src, 'script.json'), {})
    // keep the voice, sound mix and timing settings; Claude writes the rest
    script = { ...t, title: 'New reel', background: 'auto', pairs: {}, lines: [] }
  }
  writeFileSync(join(dir, 'script.json'), JSON.stringify(script, null, 2) + '\n')
  return name
}

/** After a build: put the background + CTA the build picked into the reel's TOPICS.md row (new reels log "auto"). */
export function logTopicPick(root: string, name: string, buildLog: string): void {
  const m = /bg:\s*([^\s]+)\s+cta:\s*(\w+)/.exec(buildLog)
  const file = join(root, 'TOPICS.md')
  if (!m || !existsSync(file)) return
  const lines = readFileSync(file, 'utf8').split('\n')
  const i = lines.findIndex((l) => l.includes(`| ${name} |`) && /bg:\s*auto|cta:\s*auto/.test(l))
  if (i < 0) return
  lines[i] = lines[i].replace(/bg:\s*auto/, `bg: ${m[1]}`).replace(/cta:\s*auto/, `cta: ${m[2]}`)
  writeFileSync(file, lines.join('\n'))
}
