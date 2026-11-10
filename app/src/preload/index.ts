import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {}

contextBridge.exposeInMainWorld('electron', electronAPI)
contextBridge.exposeInMainWorld('api', api)
