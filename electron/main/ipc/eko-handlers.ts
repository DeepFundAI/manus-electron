import { ipcMain } from "electron";
import { windowContextManager } from "../services/window-context-manager";

/**
 * Register all Eko service related IPC handlers
 * All handlers support window isolation through windowContextManager
 */
export function registerEkoHandlers() {
  // Run new task
  ipcMain.handle('eko:run', async (event, message: string) => {
    const context = windowContextManager.getContext(event.sender.id);
    if (!context || !context.ekoService) {
      throw new Error('EkoService not found for this window');
    }
    return await context.ekoService.run(message);
  });

  // Modify existing task
  ipcMain.handle('eko:modify', async (event, taskId: string, message: string) => {
    try {
      console.log('IPC eko:modify received:', taskId, message);
      const context = windowContextManager.getContext(event.sender.id);
      if (!context || !context.ekoService) {
        throw new Error('EkoService not found for this window');
      }
      return await context.ekoService.modify(taskId, message);
    } catch (error: any) {
      console.error('IPC eko:modify error:', error);
      throw error;
    }
  });

  // Execute task
  ipcMain.handle('eko:execute', async (event, taskId: string) => {
    try {
      console.log('IPC eko:execute received:', taskId);
      const context = windowContextManager.getContext(event.sender.id);
      if (!context || !context.ekoService) {
        throw new Error('EkoService not found for this window');
      }
      return await context.ekoService.execute(taskId);
    } catch (error: any) {
      console.error('IPC eko:execute error:', error);
      throw error;
    }
  });

  // Get task status
  ipcMain.handle('eko:getTaskStatus', async (event, taskId: string) => {
    try {
      console.log('IPC eko:getTaskStatus received:', taskId);
      const context = windowContextManager.getContext(event.sender.id);
      if (!context || !context.ekoService) {
        throw new Error('EkoService not found for this window');
      }
      return await context.ekoService.getTaskStatus(taskId);
    } catch (error: any) {
      console.error('IPC eko:getTaskStatus error:', error);
      throw error;
    }
  });

  // Cancel task
  ipcMain.handle('eko:cancel-task', async (event, taskId: string) => {
    try {
      console.log('IPC eko:cancel-task received:', taskId);
      const context = windowContextManager.getContext(event.sender.id);
      if (!context || !context.ekoService) {
        throw new Error('EkoService not found for this window');
      }
      const result = await context.ekoService.cancleTask(taskId);
      return { success: true, result };
    } catch (error: any) {
      console.error('IPC eko:cancel-task error:', error);
      throw error;
    }
  });

  console.log('[IPC] Eko service handlers registered');
}
