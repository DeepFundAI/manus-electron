import { ipcMain, WebContentsView } from "electron";
import { windowContextManager } from "../services/window-context-manager";
import { taskWindowManager } from "../services/task-window-manager";

/**
 * Register all history related IPC handlers
 * Handles history view display and task history window management
 * All handlers support window isolation through windowContextManager
 */
export function registerHistoryHandlers() {
  // Show history view with screenshot
  ipcMain.handle('show-history-view', async (event, screenshot: string) => {
    try {
      console.log('IPC show-history-view received');
      const context = windowContextManager.getContext(event.sender.id);
      if (!context) {
        throw new Error('Window context not found');
      }

      // Create history view
      if (context.historyView) {
        context.window.contentView.removeChildView(context.historyView);
      }

      context.historyView = new WebContentsView();

      // Load screenshot content
      const htmlContent = `
        <html>
          <head>
            <style>
              body { margin: 0; padding: 0; background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; }
              img { max-width: 100%; max-height: 100%; object-fit: contain; }
            </style>
          </head>
          <body>
            <img src="${screenshot}" alt="Historical screenshot" />
          </body>
        </html>
      `;

      await context.historyView.webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

      // Set history view position (overlay detail panel position)
      context.window.contentView.addChildView(context.historyView);
      context.historyView.setBounds({
        x: 818,
        y: 264,
        width: 748,
        height: 560,
      });

      return { success: true };
    } catch (error: any) {
      console.error('IPC show-history-view error:', error);
      throw error;
    }
  });

  // Hide history view
  ipcMain.handle('hide-history-view', async (event) => {
    try {
      console.log('IPC hide-history-view received');
      const context = windowContextManager.getContext(event.sender.id);
      if (context && context.historyView) {
        context.window.contentView.removeChildView(context.historyView);
        context.historyView = null;
      }
      return { success: true };
    } catch (error: any) {
      console.error('IPC hide-history-view error:', error);
      throw error;
    }
  });

  // Open task history window
  ipcMain.handle('open-task-history', async (_event, taskId: string) => {
    try {
      console.log('[IPC] open-task-history received:', taskId);

      // Check if task window already exists
      let taskWindow = taskWindowManager.getTaskWindow(taskId);

      if (taskWindow) {
        // Window exists, activate it
        console.log('[IPC] Task window exists, activating window');
        taskWindow.window.show();
        taskWindow.window.focus();
      } else {
        // Window doesn't exist, create new window
        console.log('[IPC] Task window does not exist, creating new window');

        // Generate new executionId (for creating window, won't execute task immediately)
        const executionId = `view_history_${Date.now()}`;

        // Create task window
        taskWindow = await taskWindowManager.createTaskWindow(taskId, executionId);
      }

      // Wait for window content to load, then send open history panel event
      setTimeout(() => {
        taskWindow!.window.webContents.send('open-history-panel', { taskId });
        console.log('[IPC] Sent open-history-panel event to task window');
      }, 1000); // Delay 1 second to ensure page is loaded

      return { success: true };
    } catch (error: any) {
      console.error('[IPC] open-task-history error:', error);
      throw error;
    }
  });

  console.log('[IPC] History handlers registered');
}
