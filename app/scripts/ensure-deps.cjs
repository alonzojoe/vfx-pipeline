// Runs before `npm run dev` / `npm run build`: if package-lock.json changed since the last install
// (e.g. a pulled commit added a dependency), install first instead of failing with "Failed to resolve import".
const { statSync } = require('node:fs')
const { execSync } = require('node:child_process')
const { join } = require('node:path')

const root = join(__dirname, '..')
const mtime = (p) => {
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
