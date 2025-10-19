import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getAppVersion: () => Promise<string>
      getPlatform: () => Promise<string>
      onNewTab: (callback: () => void) => void
      onCloseTab: (callback: () => void) => void
      onNavigateBack: (callback: () => void) => void
      onNavigateForward: (callback: () => void) => void
      onReloadPage: (callback: () => void) => void
      onShowAbout: (callback: () => void) => void
      removeAllListeners: (channel: string) => void
      navigateTo: (url: string) => Promise<void>
      sendToMainViewExecuteCode: (func: string, args: any[]) => Promise<any>
      getMainViewSize: () => Promise<{ width: number; height: number }>
      getMainViewUrlAndTitle: () => Promise<{ url: string; title: string }>
      getMainViewScreenshot: () => Promise<{ imageBase64: string; imageType: "image/jpeg" | "image/png" }>
      getHiddenWindowSourceId: () => Promise<string>
      
      // Voice and TTS related APIs
      sendVoiceTextToChat: (text: string) => Promise<boolean>
      onVoiceTextReceived: (callback: (text: string) => void) => void
      sendTTSSubtitle: (text: string, isStart: boolean) => Promise<boolean>
      onTTSSubtitleReceived: (callback: (text: string, isStart: boolean) => void) => void
      
      // EkoService related APIs
      ekoRun: (message: string) => Promise<any>
      ekoModify: (taskId: string, message: string) => Promise<{ success: boolean }>
      ekoExecute: (taskId: string) => Promise<any>
      ekoGetTaskStatus: (taskId: string) => Promise<any>
      ekoCancelTask: (taskId: string) => Promise<{ success: boolean; result: any }>
      onEkoStreamMessage: (callback: (message: any) => void) => void
      
      // File update related APIs (for view preload)
      onFileUpdated: (callback: (status: string, content: string) => void) => void

      // Generic invoke method
      invoke: (channel: string, ...args: any[]) => Promise<any>

      // Scheduled task execution completion listener
      onTaskExecutionComplete: (callback: (event: any) => void) => void

      // Open history panel listener
      onOpenHistoryPanel: (callback: (event: any) => void) => void

      // Task aborted by system listener
      onTaskAbortedBySystem: (callback: (event: any) => void) => void
    }
    process?: {
      type: string
      platform: string
      versions: any
    }
  }
} 