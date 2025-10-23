/// <reference types="vite/client" />
import {
  app,
  BrowserWindow,
  dialog,
  WebContentsView,
  protocol,
} from "electron";
import log from "electron-log";
import path from "node:path";
import * as pkg from "../../package.json";
// import { setupAutoUpdater } from './utils/auto-update';
import { isDev } from "./utils/constants";
import { setupMenu } from "./ui/menu";
import { createTray } from "./ui/tray";
import { initCookies } from "./utils/cookie";
import { reloadOnChange } from "./utils/reload";
import { registerClientProtocol } from "./utils/protocol";
import { ConfigManager } from "./utils/config-manager";

// Initialize configuration manager
ConfigManager.getInstance().initialize();

import { createView } from "./ui/view";
import { EkoService } from "./services/eko-service";
import { ServerManager } from "./services/server-manager";
import { MainWindowManager } from "./windows/main-window";
import { taskScheduler } from "./services/task-scheduler";
import { windowContextManager, type WindowContext } from "./services/window-context-manager";
import { cwd } from "node:process";
import { registerAllIpcHandlers } from "./ipc";

Object.assign(console, log.functions);

console.debug("main: import.meta.env:", import.meta.env);
console.log("main: isDev:", isDev);
console.log("NODE_ENV:", global.process.env.NODE_ENV);
console.log("isPackaged:", app.isPackaged);

// Log unhandled errors
process.on("uncaughtException", async (error) => {
  console.log("Uncaught Exception:", error);
});

process.on("unhandledRejection", async (error) => {
  console.log("Unhandled Rejection:", error);
});

(() => {
  const root =
    global.process.env.APP_PATH_ROOT ?? import.meta.env.VITE_APP_PATH_ROOT;

  if (root === undefined) {
    console.log(
      "no given APP_PATH_ROOT or VITE_APP_PATH_ROOT. default path is used."
    );
    return;
  }

  if (!path.isAbsolute(root)) {
    console.log("APP_PATH_ROOT must be absolute path.");
    global.process.exit(1);
  }

  console.log(`APP_PATH_ROOT: ${root}`);

  const subdirName = pkg.name;

  for (const [key, val] of [
    ["appData", ""],
    ["userData", subdirName],
    ["sessionData", subdirName],
  ] as const) {
    app.setPath(key, path.join(root, val));
  }

  app.setAppLogsPath(path.join(root, subdirName, "Logs"));
})();

console.log("appPath:", app.getAppPath());

// Register custom protocol scheme before app ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'client',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      bypassCSP: true
    }
  }
]);

const keys: Parameters<typeof app.getPath>[number][] = [
  "home",
  "appData",
  "userData",
  "sessionData",
  "logs",
  "temp",
];
keys.forEach((key) => console.log(`${key}:`, app.getPath(key)));

// Initialize server manager
const serverManager = new ServerManager();

// Start Next.js server in production environment
if (!isDev) {
  try {
    serverManager.startServer();
    console.log('Next.js server started successfully');
  } catch (error) {
    console.error('Failed to start Next.js server:', error);
  }
}

let mainWindow: BrowserWindow;
let detailView: WebContentsView;
let historyView: WebContentsView | null = null;
let ekoService: EkoService;
let mainWindowManager: MainWindowManager;

/**
 * Initialize main window and all related components
 * Including: detailView, ekoService, windowContext registration
 */
async function initializeMainWindow(): Promise<BrowserWindow> {
  console.log('[Main] Starting main window initialization...');

  // Create main window (includes transition page and service waiting logic)
  mainWindow = await mainWindowManager.createMainWindow();

  mainWindow.contentView.setBounds({
    x: 0,
    y: 0,
    width: mainWindow.getBounds().width,
    height: mainWindow.getBounds().height,
  });

  // Create detail panel area
  detailView = createView(`https://www.google.com`, "view", '1');
  mainWindow.contentView.addChildView(detailView);
  detailView.setBounds({
    x: 818,
    y: 264,
    width: 748,
    height: 560,
  });

  // Set detail view hidden by default
  detailView.setVisible(false);

  detailView.webContents.setWindowOpenHandler(({url}) => {
    detailView.webContents.loadURL(url);
    return {
      action: "deny",
    }
  })

  // Listen for detail view URL changes
  detailView.webContents.on('did-navigate', (_event, url) => {
    console.log('detail view did-navigate:', url);
    mainWindow?.webContents.send('url-changed', url);
  });

  detailView.webContents.on('did-navigate-in-page', (_event, url) => {
    console.log('detail view did-navigate-in-page:', url);
    mainWindow?.webContents.send('url-changed', url);
  });

  // Initialize EkoService
  ekoService = new EkoService(mainWindow, detailView);

  // Register main window to windowContextManager
  const mainWindowContext: WindowContext = {
    window: mainWindow,
    detailView,
    historyView,
    ekoService,
    webContentsId: mainWindow.webContents.id,
    windowType: 'main'
  };
  windowContextManager.registerWindow(mainWindowContext);
  console.log('[Main] Main window registered to WindowContextManager');

  // Listen for window close event (close: triggered before closing, can be prevented)
  // Unified handling for Mac and Windows: check task status, prompt user
  mainWindow.on('close', async (event) => {
    // Check if any task is running
    const hasRunningTask = ekoService.hasRunningTask();

    if (hasRunningTask) {
      // Prevent default close behavior
      event.preventDefault();

      // Show confirmation dialog
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Task Running',
        message: 'A task is currently running. Closing the window will cause the task to fail',
        detail: 'Please choose an action:',
        buttons: process.platform === 'darwin'
          ? ['Cancel', 'Stop Task and Close']
          : ['Cancel', 'Stop Task and Minimize'],
        defaultId: 0,
        cancelId: 0
      });

      if (response === 1) {
        // Stop task
        console.log('[Main] User chose to stop task');

        // Get all task IDs
        const allTaskIds = ekoService['eko']?.getAllTaskId() || [];

        // Abort all tasks
        await ekoService.abortAllTasks();

        // Send abort event (frontend will listen and update IndexedDB)
        allTaskIds.forEach(taskId => {
          mainWindow.webContents.send('task-aborted-by-system', {
            taskId,
            reason: 'User closed window, task terminated',
            timestamp: new Date().toISOString()
          });
        });

        // Delay to ensure message delivery and processing
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (process.platform === 'darwin') {
          // Mac: actually close window
          mainWindow.destroy();
        } else {
          // Windows/Linux: hide window
          mainWindow.hide();
        }
      }
      // response === 0: cancel close, do nothing
    } else {
      // No task running
      if (process.platform !== 'darwin') {
        // Windows/Linux: hide to tray
        event.preventDefault();
        mainWindow.hide();
        console.log('[Main] Main window hidden to tray');
      }
      // Mac: use default behavior (close window but keep app running)
    }
  });

  // Listen for window closed event (closed: triggered after window is closed)
  // Clean up context
  mainWindow.on('closed', () => {
    console.log('[Main] Main window closed, cleaning up context');
    try {
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
        windowContextManager.unregisterWindow(mainWindow.webContents.id);
      }
    } catch (error) {
      console.error('[Main] Failed to clean up main window context:', error);
    }
  });

  console.log('[Main] Main window initialization completed');
  return mainWindow;
}

(async () => {
  await app.whenReady();
  console.log("App is ready");

  // Register global client protocol
  registerClientProtocol(protocol);

  if (isDev) {
    const iconPath = path.join(cwd(), "assets/icons/logo.png");
    console.log("Setting app icon:", iconPath);
    app.dock?.setIcon(iconPath);
  }

  // Load any existing cookies from ElectronStore, set as cookie
  await initCookies();

  // Initialize main window manager
  mainWindowManager = new MainWindowManager(serverManager);

  // Initialize main window and all related components
  mainWindow = await initializeMainWindow();

  // Create system tray
  createTray(mainWindow);
  console.log('[Main] System tray created');

  // Start task scheduler
  taskScheduler.start();
  console.log('[Main] TaskScheduler started');

  // macOS activate event handler
  app.on("activate", async () => {
    // Check if main window exists (regardless of task windows)
    const hasMainWindow = mainWindow && !mainWindow.isDestroyed();

    if (!hasMainWindow) {
      // Create main window if it doesn't exist (even if task windows exist)
      console.log('[Main] App activated, main window does not exist, creating main window');
      mainWindow = await initializeMainWindow();
      setupMenu(mainWindow);
    } else {
      // Main window exists, show and focus
      console.log('[Main] App activated, main window exists, showing and focusing');
      mainWindow.show();
      mainWindow.focus();
    }
  });

  return mainWindow;
})().then((win) => setupMenu(win));

// Don't quit app when all windows are closed, keep running in background (for scheduled tasks)
// User needs to use "Quit" option in tray menu to actually quit the app
app.on("window-all-closed", () => {
  console.log('[Main] All windows closed, app continues running in background');
  // Don't call app.quit(), let app continue running
  // Scheduled tasks will continue executing in background
});

// Register all IPC handlers
registerAllIpcHandlers();

reloadOnChange();
// setupAutoUpdater();
