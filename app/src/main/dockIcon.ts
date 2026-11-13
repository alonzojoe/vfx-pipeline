import { app, nativeImage, nativeTheme, systemPreferences } from 'electron'
import { existsSync } from 'node:fs'
import { release } from 'node:os'
import { join } from 'node:path'
import lightIcon from '../../build/icon.png?asset'
import darkIcon from '../../build/icon-dark.png?asset'

/** macOS itself is dark (not the app's own Light/Dark override) — the Dock follows the Mac. */
const macIsDark = (): boolean => systemPreferences.getUserDefault('AppleInterfaceStyle', 'string') === 'Dark'

/**
 * The Dock icon follows macOS light/dark live.
 * macOS 26+ with the compiled Icon Composer icon (Assets.car, see scripts/build-icon.ts) does this by itself —
 * including the tinted and clear styles — so we leave it alone there. Everywhere else (macOS 11–15, `npm run dev`,
 * a build made without Xcode 26) we swap the Dock image when the appearance changes.
 */
export function followMacAppearance(): void {
  if (process.platform !== 'darwin' || !app.dock) return
  const tahoe = Number(release().split('.')[0]) >= 25 // Darwin 25 = macOS 26
  if (tahoe && app.isPackaged && existsSync(join(process.resourcesPath, 'Assets.car'))) return

  const images = { light: nativeImage.createFromPath(lightIcon), dark: nativeImage.createFromPath(darkIcon) }
  let shown: 'light' | 'dark' | null = null
  const apply = (): void => {
    const want = macIsDark() ? 'dark' : 'light'
    if (want === shown) return
    shown = want
    app.dock?.setIcon(images[want])
  }
  apply()
  // the system notification fires even when the app forces Light/Dark; nativeTheme covers "System" mode
  systemPreferences.subscribeNotification('AppleInterfaceThemeChangedNotification', apply)
  nativeTheme.on('updated', apply)
}
