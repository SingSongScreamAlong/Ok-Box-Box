// Type definitions for Electron
declare module 'electron' {
  import { EventEmitter } from 'events';

  // Main process classes
  export class App extends EventEmitter {
    getVersion(): string;
    getPath(name: string): string;
    quit(): void;
    whenReady(): Promise<void>;
    on(event: string, listener: Function): this;
  }

  export class BrowserWindow extends EventEmitter {
    constructor(options?: BrowserWindowConstructorOptions);
    loadFile(filePath: string): void;
    webContents: WebContents;
    show(): void;
    hide(): void;
    isVisible(): boolean;
    maximize(): void;
    close(): void;
    on(event: string, listener: Function): this;
    static getAllWindows(): BrowserWindow[];
  }

  export interface BrowserWindowConstructorOptions {
    width?: number;
    height?: number;
    show?: boolean;
    icon?: string;
    webPreferences?: WebPreferences;
    title?: string;
    frame?: boolean;
    autoHideMenuBar?: boolean;
    backgroundColor?: string;
  }

  export interface WebPreferences {
    nodeIntegration?: boolean;
    contextIsolation?: boolean;
    preload?: string;
  }

  export class WebContents extends EventEmitter {
    send(channel: string, ...args: any[]): void;
  }

  export class Tray extends EventEmitter {
    constructor(image: string);
    setToolTip(tooltip: string): void;
    setContextMenu(menu: Menu): void;
    on(event: string, listener: Function): this;
  }

  export class Menu {
    static buildFromTemplate(template: MenuItemConstructorOptions[]): Menu;
  }

  export interface MenuItemConstructorOptions {
    label?: string;
    click?: Function;
    type?: string;
    enabled?: boolean;
    submenu?: MenuItemConstructorOptions[];
    role?: string;
    accelerator?: string;
  }

  export class IpcMain extends EventEmitter {
    on(channel: string, listener: (event: IpcMainEvent, ...args: any[]) => void): this;
    handle(channel: string, handler: (event: IpcMainEvent, ...args: any[]) => Promise<any> | any): void;
  }

  export interface IpcMainEvent {
    reply(channel: string, ...args: any[]): void;
  }

  export interface Event {
    preventDefault(): void;
  }

  export interface IpcRenderer extends EventEmitter {
    send(channel: string, ...args: any[]): void;
    on(channel: string, listener: (event: Event, ...args: any[]) => void): this;
    once(channel: string, listener: (event: Event, ...args: any[]) => void): this;
    removeListener(channel: string, listener: Function): this;
    invoke(channel: string, ...args: any[]): Promise<any>;
  }

  export interface ContextBridge {
    exposeInMainWorld(apiKey: string, api: Record<string, any>): void;
  }

  // Exported variables
  export const app: App;
  export const BrowserWindow: typeof BrowserWindow;
  export const ipcMain: IpcMain;
  export const ipcRenderer: IpcRenderer;
  export const contextBridge: ContextBridge;
  export const Tray: typeof Tray;
  export const Menu: typeof Menu;
  export const nativeImage: any;
  export const shell: any;
}
