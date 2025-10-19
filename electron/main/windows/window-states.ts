/**
 * Window state enumeration
 */

export enum WindowState {
  LOADING = 'loading',
  READY = 'ready',
  ERROR = 'error'
}

export interface WindowStateInfo {
  state: WindowState;
  message?: string;
  timestamp: number;
}