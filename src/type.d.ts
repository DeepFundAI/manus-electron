declare global {
  interface Window {
    api: {
      sendToMainViewExecuteCode: (func: string, args: any[]) => Promise<any>
      navigateTo: (url: string) => Promise<{ url: string; title: string }>
      getMainViewSize: () => Promise<{ width: number; height: number }>
      getMainViewScreenshot: () => Promise<{ imageBase64: string; imageType: "image/jpeg" | "image/png" }>
      getMainViewUrlAndTitle: () => Promise<{ url: string; title: string }>
      getHiddenWindowSourceId: () => Promise<string>
      showViewWindow: () => Promise<void>
      hideViewWindow: () => Promise<void>
      sendVoiceTextToChat: (text: string) => Promise<void>
      onVoiceTextReceived: (callback: (text: string) => void) => void
      sendTTSSubtitle: (text: string, isStart: boolean) => Promise<boolean>
      onTTSSubtitleReceived: (callback: (text: string, isStart: boolean) => void) => void
      removeAllListeners: (channel: string) => void,
      getMainViewWindowNumber: () => Promise<number>
      captureWindow: (winNo: number, scale?: number) => Promise<{ width: number; height: number; stride: number; data: Buffer; error?: string }>
      captureWindowSync: (winNo: number, scale?: number) => { width: number; height: number; stride: number; data: Buffer; error?: string }
      requestCapturePermission: () => Promise<boolean>
      ekoRun: (prompt: string) => Promise<any>
      ekoModify: (taskId: string, prompt: string) => Promise<any>
      ekoExecute: (taskId: string) => Promise<any>
      onEkoStreamMessage: (callback: (message: any) => void) => void
      ekoGetTaskStatus: (taskId: string) => Promise<any>
      ekoCancelTask: (taskId: string) => Promise<any>
    }
    // PDF.js type declarations
    pdfjsLib?: {
      GlobalWorkerOptions: {
        workerSrc: string;
      };
      getDocument: (params: any) => {
        promise: Promise<{
          numPages: number;
          getPage: (pageNum: number) => Promise<{
            getTextContent: () => Promise<{
              items: Array<{ str: string; [key: string]: any }>;
            }>;
          }>;
        }>;
      };
    };
  }
}

export {} 