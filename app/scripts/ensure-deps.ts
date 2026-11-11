// Runs before `npm run dev` / `npm run build`: if package-lock.json changed since the last install
// (e.g. a pulled commit added a dependency), install first instead of failing with "Failed to resolve import".
// Plain Node runs it (type stripping) — no tsx needed, because it must work before node_modules exists.
import { execSync } from 'node:child_process'
import { statSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')

const mtime = (p: string): number => {
  try {
    return statSync(join(root, p)).mtimeMs
  } catch {
    return 0
  }
}

if (mtime('package-lock.json') > mtime('node_modules/.package-lock.json')) {
  console.log('▸ dependencies changed — running npm install…')
  execSync('npm install --no-audit --no-fund', { cwd: root, stdio: 'inherit' })
}
