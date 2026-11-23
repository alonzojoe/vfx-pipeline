// Runs before `npm run dev` (macOS only): `npm run dev` starts the app inside Electron's own bundle,
// node_modules/electron/dist/Electron.app. macOS names an app after its bundle FOLDER in ⌘-Tab, Finder and Activity
// Monitor, and after Info.plist in the menu bar / Dock — so both have to say the app's productName:
//   1. rename the bundle to "<productName>.app" and point electron's path.txt at it (that's how `electron` and
//      electron-vite find the binary)
//   2. set CFBundleName / CFBundleDisplayName in its Info.plist
//   3. swap Electron's icon for ours (build/icon.png → the bundle's .icns, plus build/mac-resources/Assets.car for the
//      macOS 26 Icon & widget style when `npm run icon` has built it) — notifications, Finder and ⌘-Tab read the
//      bundle's icon, not the Dock icon the app sets at runtime
//   4. re-sign it ad hoc (Apple Silicon needs a valid signature) and register it with LaunchServices so the new name
//      and icon show right away.
// The built app (npm run dist:mac) is already named by electron-builder. npm install re-creates Electron.app, so this
// runs every time (a no-op once everything is right).
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const LSREGISTER = '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister'

if (process.platform === 'darwin') {
  const root = join(import.meta.dirname, '..')
  const name = (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { productName: string }).productName
  const electron = join(root, 'node_modules/electron')
  const dist = join(electron, 'dist')
  const stock = join(dist, 'Electron.app')
  const bundle = join(dist, `${name}.app`)
  const pathTxt = join(electron, 'path.txt')
  const exec = `${name}.app/Contents/MacOS/Electron`
  let changed = false

  // 1. bundle folder name (a fresh npm install brings back Electron.app → it replaces the old renamed copy)
  if (existsSync(stock)) {
    rmSync(bundle, { recursive: true, force: true })
    renameSync(stock, bundle)
    changed = true
  }
  if (existsSync(bundle) && (!existsSync(pathTxt) || readFileSync(pathTxt, 'utf8').trim() !== exec)) {
    writeFileSync(pathTxt, exec)
    changed = true
  }

  // 2. Info.plist name
  const plist = join(bundle, 'Contents/Info.plist')
  const read = (key: string): string => {
    try {
      return execFileSync('/usr/libexec/PlistBuddy', ['-c', `Print :${key}`, plist], { encoding: 'utf8' }).trim()
    } catch {
      return ''
    }
  }
  if (existsSync(plist)) {
    if (read('CFBundleName') !== name || read('CFBundleDisplayName') !== name) {
      for (const key of ['CFBundleName', 'CFBundleDisplayName']) execFileSync('plutil', ['-replace', key, '-string', name, plist])
      changed = true
    }
  }

  // 3. icon: our build/icon.png (and the Icon Composer Assets.car, if built) instead of Electron's atom
  const png = join(root, 'build/icon.png')
  const car = join(root, 'build/mac-resources/Assets.car')
  const res = join(bundle, 'Contents/Resources')
  const stamp = join(res, '.vfx-icon')
  const version = [png, car].map((f) => (existsSync(f) ? `${statSync(f).size}:${statSync(f).mtimeMs}` : '-')).join('|')
  if (existsSync(plist) && existsSync(png) && (!existsSync(stamp) || readFileSync(stamp, 'utf8') !== version)) {
    try {
      const icns = join(res, read('CFBundleIconFile') || 'electron.icns')
      const set = join(tmpdir(), 'vfx-dev-icon.iconset')
      rmSync(set, { recursive: true, force: true })
      mkdirSync(set)
      for (const px of [16, 32, 128, 256, 512]) {
        execFileSync('sips', ['-z', `${px}`, `${px}`, png, '--out', join(set, `icon_${px}x${px}.png`)], { stdio: 'ignore' })
        execFileSync('sips', ['-z', `${px * 2}`, `${px * 2}`, png, '--out', join(set, `icon_${px}x${px}@2x.png`)], { stdio: 'ignore' })
      }
      execFileSync('iconutil', ['-c', 'icns', set, '-o', icns])
      rmSync(set, { recursive: true, force: true })
      if (existsSync(car)) {
        copyFileSync(car, join(res, 'Assets.car'))
        execFileSync('plutil', ['-replace', 'CFBundleIconName', '-string', 'AppIcon', plist])
      }
      writeFileSync(stamp, version)
      changed = true
    } catch (e) {
      console.log(`• could not set the dev app icon (${(e as Error).message.split('\n')[0]}) — notifications keep Electron's icon`)
    }
  }

  if (changed && existsSync(bundle)) {
    // Info.plist is part of the code signature: re-sign the dev copy locally (ad hoc) so Apple Silicon still runs it
    try {
      execFileSync('codesign', ['--force', '--deep', '--sign', '-', bundle], { stdio: 'ignore' })
    } catch {
      console.log("• could not re-sign the dev app — if it won't start, run: npm rebuild electron")
    }
    try {
      execFileSync(LSREGISTER, ['-f', bundle], { stdio: 'ignore' })
    } catch {
      // not fatal: macOS picks the name up on its own after a moment
    }
    execFileSync('touch', [bundle]) // Finder / Notification Center notice the new icon
    console.log(`▸ dev app named "${name}" with its own icon (menu bar, Dock, ⌘-Tab, notifications)`)
  }
}
