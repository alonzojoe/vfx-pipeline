import { app, BrowserWindow, nativeTheme, shell } from 'electron'
import { join } from 'node:path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { followMacAppearance } from './dockIcon'
import { registerIpc } from './ipc'
import { handleVfxProtocol, registerVfxScheme } from './services/protocol'
import { getRoot, getTheme } from './services/settings'
import { windowBackground } from './services/theme'

registerVfxScheme()

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    title: 'vfx Studio',
    backgroundColor: windowBackground(),
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true
    }
  })
  win.on('ready-to-show', () => win.show())
  // links open in the browser (https only); the window itself never navigates away from the app
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e, url) => {
    if (url !== win.webContents.getURL()) e.preventDefault()
  })
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else win.loadFile(join(__dirname, '../renderer/index.html'))
  return win
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.knowledgebyjoe.vfxstudio')
  app.on('browser-window-created', (_, w) => optimizer.watchWindowShortcuts(w))
  // apply the saved theme BEFORE the window exists: CSS (prefers-color-scheme) is right from the first frame
  nativeTheme.themeSource = getTheme()
  handleVfxProtocol(getRoot)
  followMacAppearance()
  let win: BrowserWindow | null = createWindow()
  registerIpc(() => win) // once — handlers always talk to the current window
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) win = createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
