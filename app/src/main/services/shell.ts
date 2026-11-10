import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process'

/**
 * Run a command through the user's login shell so a Finder-launched app still sees Homebrew/nvm PATHs
 * (node, npx, ffmpeg, claude). Args are single-quoted for the shell.
 */
export const q = (s: string): string => `'${s.replace(/'/g, `'\\''`)}'`

export function loginShell(cmd: string, opts: SpawnOptions = {}): ChildProcess {
  const sh = process.env.SHELL || '/bin/zsh'
  return spawn(sh, ['-l', '-c', cmd], { ...opts, env: { ...process.env, FORCE_COLOR: '0', ...opts.env } })
}

let claudeCache: boolean | null = null
export function hasClaude(): Promise<boolean> {
  if (claudeCache !== null) return Promise.resolve(claudeCache)
  return new Promise((res) => {
    const p = loginShell('command -v claude >/dev/null 2>&1')
    p.on('exit', (code) => res((claudeCache = code === 0)))
    p.on('error', () => res((claudeCache = false)))
  })
}
