/**
 * System tray manager
 * Responsible for creating and managing system tray icon and menu
 */

import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron';
import path from 'node:path';
import { isDev } from '../utils/constants';
import { taskScheduler } from '../services/task-scheduler';

let tray: Tray | null = null;
let updateInterval: NodeJS.Timeout | null = null;

/**
 * Create system tray
 * @param mainWindow Main window instance
 */
export function createTray(mainWindow: BrowserWindow): Tray {
  // Get tray icon path
  const iconPath = getTrayIconPath();
  console.log('[Tray] Tray icon path:', iconPath);

  // Create tray icon
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  // Set tray tooltip text
  tray.setToolTip('DeepFundAI Browser');

  // Create tray menu
  updateTrayMenu(mainWindow);

  // Tray icon click event (Windows/Linux: single click shows window, Mac: no action, use right-click menu)
  tray.on('click', () => {
    if (process.platform !== 'darwin') {
      showMainWindow(mainWindow);
    }
  });

  // Start periodic tray menu updates (update every 5 seconds)
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  updateInterval = setInterval(() => {
    updateTrayMenu(mainWindow);
  }, 5000);

  console.log('[Tray] System tray created successfully');
  return tray;
}

/**
 * Update tray menu
 * @param mainWindow Main window instance
 */
export function updateTrayMenu(mainWindow: BrowserWindow): void {
  if (!tray) return;

  // Get task scheduler status
  const schedulerStatus = getSchedulerStatus();

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'DeepFundAI Browser',
      enabled: false,
    },
    {
      type: 'separator',
    },
    {
      label: 'Show Main Window',
      click: () => showMainWindow(mainWindow),
    },
    {
      type: 'separator',
    },
    {
      label: `Scheduler Status: ${schedulerStatus.isRunning ? 'Running' : 'Stopped'}`,
      enabled: false,
    },
    {
      label: `Scheduled: ${schedulerStatus.scheduledCount}`,
      enabled: false,
    },
    {
      label: `Running: ${schedulerStatus.runningCount}`,
      enabled: false,
    },
    {
      type: 'separator',
    },
    {
      label: 'Quit Application',
      click: () => quitApplication(),
    },
  ]);

  tray.setContextMenu(contextMenu);
}

/**
 * Show main window
 * @param mainWindow Main window instance
 */
function showMainWindow(mainWindow: BrowserWindow): void {
  if (mainWindow.isDestroyed()) {
    console.warn('[Tray] Main window destroyed, cannot show');
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();

  console.log('[Tray] Main window shown');
}

/**
 * Quit application
 */
function quitApplication(): void {
  console.log('[Tray] Preparing to quit application...');

  // Stop task scheduler
  try {
    taskScheduler.stop();
    console.log('[Tray] Task scheduler stopped');
  } catch (error) {
    console.error('[Tray] Failed to stop task scheduler:', error);
  }

  // Destroy tray
  if (tray) {
    tray.destroy();
    tray = null;
    console.log('[Tray] Tray destroyed');
  }

  // Quit application
  app.quit();
}

/**
 * Get task scheduler status
 */
function getSchedulerStatus(): {
  isRunning: boolean;
  runningCount: number;
  queueLength: number;
  scheduledCount: number;
} {
  try {
    // Read real-time status directly from taskScheduler
    return taskScheduler.getStatus();
  } catch (error) {
    console.error('[Tray] Failed to get scheduler status:', error);
    // Return default values on error
    return {
      isRunning: false,
      runningCount: 0,
      queueLength: 0,
      scheduledCount: 0,
    };
  }
}

/**
 * Get tray icon path
 */
function getTrayIconPath(): string {
  if (isDev) {
    // Development environment: use icon from project root
    return path.join(process.cwd(), 'assets/icons/icon.png');
  } else {
    // Production environment: use packaged icon
    if (process.platform === 'win32') {
      return path.join(process.resourcesPath, 'assets/icons/icon.ico');
    } else if (process.platform === 'darwin') {
      return path.join(process.resourcesPath, 'assets/icons/icon.icns');
    } else {
      return path.join(process.resourcesPath, 'assets/icons/icon.png');
    }
  }
}

/**
 * Destroy tray
 */
export function destroyTray(): void {
  // Clear periodic updates
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }

  if (tray) {
    tray.destroy();
    tray = null;
    console.log('[Tray] Tray destroyed');
  }
}

/**
 * Get tray instance
 */
export function getTray(): Tray | null {
  return tray;
}
