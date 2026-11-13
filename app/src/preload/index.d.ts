import type { VfxApi } from './index'

declare global {
  interface Window {
    api: VfxApi
  }
}
