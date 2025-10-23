import { ipcMain } from "electron";
import { windowContextManager } from "../services/window-context-manager";

/**
 * Register all view control related IPC handlers
 * Handles screenshot, visibility control, and URL operations
 * All handlers support window isolation through windowContextManager
 */
export function registerViewHandlers() {
  // Get main view screenshot
  ipcMain.handle('get-main-view-screenshot', async (event) => {
    const context = windowContextManager.getContext(event.sender.id);
    if (!context || !context.detailView) {
      throw new Error('DetailView not found for this window');
    }

    const image = await context.detailView.webContents.capturePage();
    return {
      imageBase64: image.toDataURL(),
      imageType: "image/jpeg",
    };
  });

  // Set detail view visibility
  ipcMain.handle('set-detail-view-visible', async (event, visible: boolean) => {
    try {
      console.log('IPC set-detail-view-visible received:', visible);
      const context = windowContextManager.getContext(event.sender.id);
      if (!context || !context.detailView) {
        throw new Error('DetailView not found for this window');
      }

      context.detailView.setVisible(visible);

      return { success: true, visible };
    } catch (error: any) {
      console.error('IPC set-detail-view-visible error:', error);
      throw error;
    }
  });

  // Get current URL from detail view
  ipcMain.handle('get-current-url', async (event) => {
    try {
      console.log('IPC get-current-url received');
      const context = windowContextManager.getContext(event.sender.id);
      if (!context || !context.detailView) {
        return '';
      }
      return context.detailView.webContents.getURL();
    } catch (error: any) {
      console.error('IPC get-current-url error:', error);
      return '';
    }
  });

  console.log('[IPC] View control handlers registered');
}
