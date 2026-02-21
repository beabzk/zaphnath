import type { AppModule } from "../AppModule.js";
import { ModuleContext } from "../ModuleContext.js";
import { BrowserWindow, Menu, type MenuItemConstructorOptions } from "electron";
import type { AppInitConfig } from "../AppInitConfig.js";
import path from "node:path";

class WindowManager implements AppModule {
  readonly #preload: { path: string };
  readonly #renderer: { path: string } | URL;
  readonly #openDevTools;

  constructor({
    initConfig,
    openDevTools = false,
  }: {
    initConfig: AppInitConfig;
    openDevTools?: boolean;
  }) {
    this.#preload = initConfig.preload;
    this.#renderer = initConfig.renderer;
    this.#openDevTools = openDevTools;
  }

  async enable({ app }: ModuleContext): Promise<void> {
    await app.whenReady();
    this.configureApplicationMenu();
    await this.restoreOrCreateWindow(true);
    app.on("second-instance", () => this.restoreOrCreateWindow(true));
    app.on("activate", () => this.restoreOrCreateWindow(true));
  }

  configureApplicationMenu(): void {
    const isMac = process.platform === "darwin";
    const template: MenuItemConstructorOptions[] = [];

    if (isMac) {
      template.push({
        label: "Zaphnath",
        submenu: [
          { role: "about" },
          { type: "separator" },
          { role: "services" },
          { type: "separator" },
          { role: "hide" },
          { role: "hideOthers" },
          { role: "unhide" },
          { type: "separator" },
          { role: "quit" },
        ],
      });
    } else {
      template.push({
        label: "File",
        submenu: [{ role: "quit" }],
      });
    }

    template.push({
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    });

    template.push({
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    });

    if (isMac) {
      template.push({
        role: "window",
        submenu: [{ role: "minimize" }, { role: "zoom" }, { role: "front" }],
      });
    }

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }

  async createWindow(): Promise<BrowserWindow> {
    const isMac = process.platform === "darwin";
    const browserWindow = new BrowserWindow({
      show: false, // Use the 'ready-to-show' event to show the instantiated BrowserWindow.
      width: 1200, // Optimal width for Bible reading with sidebar
      height: 800, // Good height for reading content
      minWidth: 800, // Minimum width to ensure usability
      minHeight: 600, // Minimum height for proper layout
      titleBarStyle: isMac ? "hiddenInset" : "default",
      autoHideMenuBar: !isMac,
      // Use app icon on Windows/Linux (macOS uses .icns from bundle metadata).
      icon:
        isMac ? undefined : path.resolve(process.cwd(), "buildResources", "icon.png"),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false, // Sandbox disabled for database and file system access
        webviewTag: false, // The webview tag is not recommended. Consider alternatives like an iframe or Electron's BrowserView. @see https://www.electronjs.org/docs/latest/api/webview-tag#warning
        preload: this.#preload.path,
        spellcheck: true, // Enable spellcheck for notes and search
        enableWebSQL: false, // Disable WebSQL for security
      },
    });

    if (this.#renderer instanceof URL) {
      await browserWindow.loadURL(this.#renderer.href);
    } else {
      await browserWindow.loadFile(this.#renderer.path);
    }

    if (!isMac) {
      browserWindow.setMenuBarVisibility(false);
    }

    // Bible reading optimizations
    browserWindow.once("ready-to-show", () => {
      browserWindow.show();

      // Focus the window for immediate use
      if (browserWindow.isMinimized()) {
        browserWindow.restore();
      }
      browserWindow.focus();
    });

    // Handle window state for better reading experience
    browserWindow.on("enter-full-screen", () => {
      // Could send IPC to renderer to adjust layout for full-screen reading
    });

    browserWindow.on("leave-full-screen", () => {
      // Could send IPC to renderer to restore normal layout
    });

    // Prevent navigation away from the app for security
    browserWindow.webContents.on("will-navigate", (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);

      // Only allow navigation to the same origin or file protocol
      if (
        parsedUrl.origin !== this.#renderer.toString() &&
        parsedUrl.protocol !== "file:"
      ) {
        event.preventDefault();
      }
    });

    return browserWindow;
  }

  async restoreOrCreateWindow(show = false) {
    let window = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());

    if (window === undefined) {
      window = await this.createWindow();
    }

    if (!show) {
      return window;
    }

    if (window.isMinimized()) {
      window.restore();
    }

    window?.show();

    if (this.#openDevTools) {
      window?.webContents.openDevTools();
    }

    window.focus();

    return window;
  }
}

export function createWindowManagerModule(
  ...args: ConstructorParameters<typeof WindowManager>
) {
  return new WindowManager(...args);
}
