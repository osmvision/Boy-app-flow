import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  askGemini: (prompt: string): Promise<string> => ipcRenderer.invoke('ask-gemini', prompt),
  // NOUVELLES FONCTIONS
  saveTasks: (tasks: any) => ipcRenderer.invoke('save-data', tasks),
  loadTasks: () => ipcRenderer.invoke('load-data')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) { console.error(error) }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}