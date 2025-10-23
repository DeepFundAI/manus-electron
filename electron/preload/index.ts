import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // App information
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  // Window controls
  onNewTab: (callback: () => void) => ipcRenderer.on('new-tab', callback),
  onCloseTab: (callback: () => void) => ipcRenderer.on('close-tab', callback),
  onNavigateBack: (callback: () => void) => ipcRenderer.on('navigate-back', callback),
  onNavigateForward: (callback: () => void) => ipcRenderer.on('navigate-forward', callback),
  onReloadPage: (callback: () => void) => ipcRenderer.on('reload-page', callback),
  onShowAbout: (callback: () => void) => ipcRenderer.on('show-about', callback),

  // Remove listeners
  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),

  getHiddenWindowSourceId: () => ipcRenderer.invoke('get-hidden-window-source-id'),
  
  // Voice text transmission related APIs
  sendVoiceTextToChat: (text: string) => ipcRenderer.invoke('send-voice-text-to-chat', text),
  onVoiceTextReceived: (callback: (text: string) => void) => ipcRenderer.on('voice-text-received', (_, text) => callback(text)),
  
  // TTS subtitle related APIs
  sendTTSSubtitle: (text: string, isStart: boolean) => ipcRenderer.invoke('send-tts-subtitle', text, isStart),
  onTTSSubtitleReceived: (callback: (text: string, isStart: boolean) => void) => 
    ipcRenderer.on('tts-subtitle-received', (_, text, isStart) => callback(text, isStart)),
  
  // View window controls
  showViewWindow: () => ipcRenderer.invoke('show-view-window'),
  
  // EkoService related APIs
  ekoRun: (message: string) => ipcRenderer.invoke('eko:run', message),
  ekoModify: (taskId: string, message: string) => ipcRenderer.invoke('eko:modify', taskId, message),
  ekoExecute: (taskId: string) => ipcRenderer.invoke('eko:execute', taskId),
  ekoGetTaskStatus: (taskId: string) => ipcRenderer.invoke('eko:getTaskStatus', taskId),
  ekoCancelTask: (taskId: string) => ipcRenderer.invoke('eko:cancel-task', taskId),
  onEkoStreamMessage: (callback: (message: any) => void) => ipcRenderer.on('eko-stream-message', (_, message) => callback(message)),

  // Model configuration APIs
  getUserModelConfigs: () => ipcRenderer.invoke('config:get-user-configs'),
  saveUserModelConfigs: (configs: any) => ipcRenderer.invoke('config:save-user-configs', configs),
  getModelConfig: (provider: 'deepseek' | 'qwen' | 'google' | 'anthropic' | 'openrouter') => ipcRenderer.invoke('config:get-model-config', provider),
  getApiKeySource: (provider: 'deepseek' | 'qwen' | 'google' | 'anthropic' | 'openrouter') => ipcRenderer.invoke('config:get-api-key-source', provider),
  getSelectedProvider: () => ipcRenderer.invoke('config:get-selected-provider'),
  setSelectedProvider: (provider: 'deepseek' | 'qwen' | 'google' | 'anthropic' | 'openrouter') => ipcRenderer.invoke('config:set-selected-provider', provider),

  // Detail view control APIs
  setDetailViewVisible: (visible: boolean) => ipcRenderer.invoke('set-detail-view-visible', visible),
  // URL retrieval and monitoring APIs
  getCurrentUrl: () => ipcRenderer.invoke('get-current-url'),
  onUrlChange: (callback: (url: string) => void) => {
    ipcRenderer.on('url-changed', (event, url) => callback(url));
  },
  // Screenshot related APIs
  getMainViewScreenshot: () => ipcRenderer.invoke('get-main-view-screenshot'),
  // History view management APIs
  showHistoryView: (screenshot: string) => ipcRenderer.invoke('show-history-view', screenshot),
  hideHistoryView: () => ipcRenderer.invoke('hide-history-view'),

  // Generic invoke method (for scheduler and other new features)
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),

  // Scheduled task execution completion listener
  onTaskExecutionComplete: (callback: (event: any) => void) =>
    ipcRenderer.on('task-execution-complete', (_, event) => callback(event)),

  // Open history panel listener
  onOpenHistoryPanel: (callback: (event: any) => void) =>
    ipcRenderer.on('open-history-panel', (_, event) => callback(event)),

  // Task aborted by system listener
  onTaskAbortedBySystem: (callback: (event: any) => void) =>
    ipcRenderer.on('task-aborted-by-system', (_, event) => callback(event)),

}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
} 
