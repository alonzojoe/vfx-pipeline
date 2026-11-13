// Runs before electron-builder (`npm run dist:mac`): compiles build/AppIcon.icon (Icon Composer: default, dark,
// clear and tinted styles) into build/mac-resources/Assets.car, which electron-builder copies into Contents/Resources.
// macOS 26+ reads it through CFBundleIconName and shows the style the user picked in System Settings → Appearance →
// Icon & widget style (Light/Dark mode alone doesn't change it). Older macOS keeps the classic build/icon.png (.icns).
// Needs Xcode 26 (actool) — without it the build still works with the classic icon.
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const root = join(import.meta.dirname, '..')
const out = join(root, 'build', 'mac-resources')
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

if (process.platform !== 'darwin') {
  console.log('• icon: not on macOS — skipping Assets.car (classic icon only)')
  process.exit(0)
}
try {
  execFileSync(
    'xcrun',
    [
      'actool', join(root, 'build', 'AppIcon.icon'),
      '--compile', out,
      '--app-icon', 'AppIcon',
      '--include-all-app-icons',
      '--platform', 'macosx',
      '--target-device', 'mac',
      '--minimum-deployment-target', '26.0',
      '--output-partial-info-plist', join(tmpdir(), 'vfx-icon-partial.plist'),
      '--output-format', 'human-readable-text',
      '--errors', '--warnings'
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  )
  console.log('✓ icon: Assets.car built (Icon & widget style on macOS 26+)')
} catch (e) {
  const err = e as { stdout?: Buffer; stderr?: Buffer; message: string }
  const why = (err.stderr?.toString() || err.stdout?.toString() || err.message).trim().split('\n').slice(-3).join(' ')
  console.log(`• icon: no Assets.car (needs Xcode 26 for actool) — classic icon only. ${why}`)
  rmSync(out, { recursive: true, force: true })
  mkdirSync(out, { recursive: true })
}
