// Runs before `npm run dev` (macOS only): `npm run dev` starts the app inside Electron's own bundle, whose Info.plist
// says "Electron" — that's the bold name macOS shows next to the Apple menu (and in the Dock tooltip / ⌘-Tab).
// Rename that dev bundle to the app's productName. The built app (npm run dist:mac) is already named by electron-builder.
// npm install re-creates the bundle, so this runs every time (it's a no-op once the name is right).
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, utimesSync } from 'node:fs'
import { join } from 'node:path'

if (process.platform === 'darwin') {
  const root = join(import.meta.dirname, '..')
  const name = (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { productName: string }).productName
  const bundle = join(root, 'node_modules/electron/dist/Electron.app')
  const plist = join(bundle, 'Contents/Info.plist')
  if (existsSync(plist)) {
    const read = (key: string): string => {
      try {
        return execFileSync('/usr/libexec/PlistBuddy', ['-c', `Print :${key}`, plist], { encoding: 'utf8' }).trim()
      } catch {
        return ''
      }
    }
    if (read('CFBundleName') !== name || read('CFBundleDisplayName') !== name) {
      for (const key of ['CFBundleName', 'CFBundleDisplayName']) execFileSync('plutil', ['-replace', key, '-string', name, plist])
      // Info.plist is part of the code signature: re-sign the dev copy locally (ad hoc) so Apple Silicon still runs it
      try {
        execFileSync('codesign', ['--force', '--deep', '--sign', '-', bundle], { stdio: 'ignore' })
      } catch {
        console.log('• could not re-sign the dev Electron.app — if it won\'t start, run: npm rebuild electron')
      }
      const now = new Date()
      utimesSync(bundle, now, now) // nudge LaunchServices to re-read the bundle
      console.log(`▸ dev app named "${name}" (menu bar, Dock, ⌘-Tab)`)
    }
  }
}
