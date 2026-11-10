import { ElectronAPI } from '@electron-toolkit/preload'
import type { VfxApi } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: VfxApi
  }
}
