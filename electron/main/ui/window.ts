import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { isDev } from '../utils/constants';
import { store } from '../utils/store';

export function createWindow(rendererURL: string) {
  console.log('Creating window with URL:', rendererURL);

  const bounds = store.get('bounds');
  console.log('restored bounds:', bounds);

  const preloadPath = isDev ? path.join(app.getAppPath(), '..', 'preload', 'index.cjs') : path.join(app.getAppPath(),'dist', 'electron', 'preload', 'index.cjs');

  console.log('preload path:', preloadPath);
  const win = new BrowserWindow({
    ...{
      width: 1600,
      height: 900,
      // ...bounds,
      useContentSize: true,
    },
    frame: process.platform !== 'darwin',
    titleBarStyle: process.platform === 'darwin' ? 'hidden' : 'default',
    resizable: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: false,
      webSecurity: true, // Allow access to media devices like microphone
      zoomFactor: 1.0,
    },
  });
  console.log('Window created, loading URL...');
  win.loadURL(rendererURL).catch((err) => {
    console.log('Failed to load URL:', err);
  });

  win.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
    console.log('Failed to load:', errorCode, errorDescription);
  });

  win.webContents.on('did-finish-load', () => {
    console.log('Window finished loading');
  });

  const boundsListener = () => {
    const bounds = win.getBounds();
    store.set('bounds', bounds);
  };
  win.on('moved', boundsListener);
  win.on('resized', boundsListener);

  return win;
}
